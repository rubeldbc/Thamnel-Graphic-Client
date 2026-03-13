// Drop shadow: renders a colored, blurred, offset copy of the alpha channel
// behind the original image.
//
// This shader generates the shadow layer. The compositor composites it
// behind the original content.

struct Params {
    color_r: f32,
    color_g: f32,
    color_b: f32,
    offset_x: f32,
    offset_y: f32,
    blur_radius: f32,
    opacity: f32,
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

    // Sample alpha at offset position with blur
    let offset = vec2<i32>(i32(params.offset_x), i32(params.offset_y));
    let sample_pos = vec2<i32>(gid.xy) - offset;

    let r = i32(ceil(params.blur_radius));
    let sigma = max(params.blur_radius / 3.0, 0.5);
    let sigma2 = 2.0 * sigma * sigma;

    var alpha_sum = 0.0;
    var weight_sum = 0.0;

    // Skip blur if radius is very small
    if r <= 0 {
        let clamped = clamp(sample_pos, vec2(0), vec2<i32>(dims) - 1);
        let orig = textureLoad(input_tex, clamped, 0);
        alpha_sum = orig.a;
        weight_sum = 1.0;
    } else {
        for (var dy = -r; dy <= r; dy++) {
            for (var dx = -r; dx <= r; dx++) {
                let sp = clamp(sample_pos + vec2(dx, dy), vec2(0), vec2<i32>(dims) - 1);
                let s = textureLoad(input_tex, sp, 0);
                let w = exp(-f32(dx * dx + dy * dy) / sigma2);
                alpha_sum += s.a * w;
                weight_sum += w;
            }
        }
    }

    let shadow_alpha = (alpha_sum / weight_sum) * params.opacity;
    let shadow_color = vec3(params.color_r, params.color_g, params.color_b);

    // Composite: shadow behind original
    let orig = textureLoad(input_tex, vec2<i32>(gid.xy), 0);
    let shadow = vec4(shadow_color * shadow_alpha, shadow_alpha);

    // Standard alpha-over: original over shadow
    let out_a = orig.a + shadow.a * (1.0 - orig.a);
    var out_rgb = vec3(0.0);
    if out_a > 0.001 {
        out_rgb = (orig.rgb * orig.a + shadow.rgb * (1.0 - orig.a)) / out_a;
    }

    textureStore(output_tex, vec2<i32>(gid.xy), vec4(out_rgb * out_a, out_a));
}
