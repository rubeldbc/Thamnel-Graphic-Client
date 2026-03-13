// Outer glow: blurred alpha halo around content, composited behind.
// Similar to drop shadow but with zero offset.

struct Params {
    color_r: f32,
    color_g: f32,
    color_b: f32,
    radius: f32,
    intensity: f32,
}

@group(0) @binding(0) var input_tex: texture_2d<f32>;
@group(0) @binding(1) var output_tex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let dims = textureDimensions(input_tex);
    if gid.x >= dims.x || gid.y >= dims.y {
        return;
    }

    let r = i32(ceil(params.radius));
    let sigma = max(params.radius / 3.0, 0.5);
    let sigma2 = 2.0 * sigma * sigma;

    var alpha_sum = 0.0;
    var weight_sum = 0.0;

    for (var dy = -r; dy <= r; dy++) {
        for (var dx = -r; dx <= r; dx++) {
            let sp = clamp(vec2<i32>(gid.xy) + vec2(dx, dy), vec2(0), vec2<i32>(dims) - 1);
            let s = textureLoad(input_tex, sp, 0);
            let w = exp(-f32(dx * dx + dy * dy) / sigma2);
            alpha_sum += s.a * w;
            weight_sum += w;
        }
    }

    let glow_alpha = (alpha_sum / weight_sum) * (params.intensity / 100.0);
    let glow_color = vec3(params.color_r, params.color_g, params.color_b);

    // Composite: glow behind original
    let orig = textureLoad(input_tex, vec2<i32>(gid.xy), 0);
    let glow = vec4(glow_color * glow_alpha, glow_alpha);

    let out_a = orig.a + glow.a * (1.0 - orig.a);
    var out_rgb = vec3(0.0);
    if out_a > 0.001 {
        out_rgb = (orig.rgb * orig.a + glow.rgb * (1.0 - orig.a)) / out_a;
    }

    textureStore(output_tex, vec2<i32>(gid.xy), vec4(out_rgb * out_a, out_a));
}
