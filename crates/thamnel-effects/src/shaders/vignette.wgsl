// Vignette: radial darkening toward edges.

struct Params {
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

    // Normalized coordinates (-1..1)
    let uv = (vec2<f32>(gid.xy) / vec2<f32>(dims)) * 2.0 - 1.0;
    let dist = length(uv);

    // Smooth falloff from center to edges
    let vignette = 1.0 - smoothstep(0.3, 1.2, dist) * params.intensity;

    let result = vec4(c.rgb * vignette, c.a);
    textureStore(output_tex, vec2<i32>(gid.xy), result);
}
