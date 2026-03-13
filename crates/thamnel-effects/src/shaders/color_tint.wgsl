// Color tint: multiply-blend a color overlay with adjustable intensity.

struct Params {
    tint_r: f32,
    tint_g: f32,
    tint_b: f32,
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

    let c = textureLoad(input_tex, vec2<i32>(gid.xy), 0);
    let tint = vec3(params.tint_r, params.tint_g, params.tint_b);

    // Multiply blend with intensity control
    let tinted = c.rgb * mix(vec3(1.0), tint, params.intensity);
    let result = clamp(tinted, vec3(0.0), vec3(1.0));

    textureStore(output_tex, vec2<i32>(gid.xy), vec4(result, c.a));
}
