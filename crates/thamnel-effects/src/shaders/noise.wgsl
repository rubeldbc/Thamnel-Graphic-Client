// Noise: adds random pixel offsets.

struct Params {
    amount: f32,
    // We use gid as seed since we have no frame counter.
    _pad1: f32,
    _pad2: f32,
    _pad3: f32,
}

@group(0) @binding(0) var input_tex: texture_2d<f32>;
@group(0) @binding(1) var output_tex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> params: Params;

// Simple hash function for pseudo-random noise
fn hash(p: vec2<f32>) -> f32 {
    var p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let dims = textureDimensions(input_tex);
    if gid.x >= dims.x || gid.y >= dims.y {
        return;
    }

    let c = textureLoad(input_tex, vec2<i32>(gid.xy), 0);

    if c.a < 0.001 {
        textureStore(output_tex, vec2<i32>(gid.xy), c);
        return;
    }

    let noise_strength = params.amount / 100.0;
    let n = (hash(vec2<f32>(gid.xy)) - 0.5) * 2.0 * noise_strength;

    let result = clamp(c.rgb + vec3(n), vec3(0.0), vec3(1.0));
    textureStore(output_tex, vec2<i32>(gid.xy), vec4(result, c.a));
}
