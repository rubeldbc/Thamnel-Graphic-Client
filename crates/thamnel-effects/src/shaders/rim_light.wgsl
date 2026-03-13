// Rim light: directional edge highlight using alpha gradient detection.

struct Params {
    color_r: f32,
    color_g: f32,
    color_b: f32,
    angle: f32,
    intensity: f32,
    width: f32,
    tex_width: f32,
    tex_height: f32,
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

    let orig = textureLoad(input_tex, vec2<i32>(gid.xy), 0);

    if orig.a < 0.01 {
        textureStore(output_tex, vec2<i32>(gid.xy), orig);
        return;
    }

    // Light direction from angle
    let rad = params.angle * 3.14159265 / 180.0;
    let light_dir = vec2(cos(rad), sin(rad));

    // Compute alpha gradient to detect edges
    let r = i32(max(params.width, 1.0));
    var edge_strength = 0.0;

    for (var i = 1; i <= r; i++) {
        let offset = vec2<i32>(i32(light_dir.x * f32(i)), i32(light_dir.y * f32(i)));
        let sp = clamp(vec2<i32>(gid.xy) + offset, vec2(0), vec2<i32>(dims) - 1);
        let s = textureLoad(input_tex, sp, 0);
        // Edge = where alpha drops off in the light direction
        let alpha_diff = orig.a - s.a;
        edge_strength = max(edge_strength, alpha_diff);
    }

    // Apply rim light color additively on detected edges
    let rim = edge_strength * (params.intensity / 100.0);
    let rim_color = vec3(params.color_r, params.color_g, params.color_b) * rim;

    let result = clamp(orig.rgb + rim_color * orig.a, vec3(0.0), vec3(1.0));
    textureStore(output_tex, vec2<i32>(gid.xy), vec4(result, orig.a));
}
