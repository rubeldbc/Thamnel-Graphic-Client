// Unsharp mask sharpening.
// Uses a 3x3 convolution kernel weighted by `amount`.

struct Params {
    amount: f32,
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

    let center = textureLoad(input_tex, vec2<i32>(gid.xy), 0);

    // Sample 4 neighbors
    let left  = textureLoad(input_tex, clamp(vec2<i32>(gid.xy) + vec2(-1, 0), vec2(0), vec2<i32>(dims) - 1), 0);
    let right = textureLoad(input_tex, clamp(vec2<i32>(gid.xy) + vec2(1, 0),  vec2(0), vec2<i32>(dims) - 1), 0);
    let up    = textureLoad(input_tex, clamp(vec2<i32>(gid.xy) + vec2(0, -1), vec2(0), vec2<i32>(dims) - 1), 0);
    let down  = textureLoad(input_tex, clamp(vec2<i32>(gid.xy) + vec2(0, 1),  vec2(0), vec2<i32>(dims) - 1), 0);

    // Laplacian: center * 5 - neighbors
    let sharpened = center * (1.0 + 4.0 * params.amount) - (left + right + up + down) * params.amount;

    let result = clamp(sharpened, vec4(0.0), vec4(1.0));
    textureStore(output_tex, vec2<i32>(gid.xy), vec4(result.rgb, center.a));
}
