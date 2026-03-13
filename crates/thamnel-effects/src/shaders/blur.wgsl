// Gaussian blur — separable two-pass (horizontal then vertical).
//
// Pass 1: GaussianBlurH — blurs along X axis.
// Pass 2: GaussianBlurV — blurs along Y axis.
// The direction is selected by the `direction` uniform: (1,0) or (0,1).

struct Params {
    radius: f32,
    tex_width: f32,
    tex_height: f32,
    direction_x: f32,
    direction_y: f32,
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

    var color_sum = vec4(0.0);
    var weight_sum = 0.0;

    let dir = vec2<i32>(i32(params.direction_x), i32(params.direction_y));

    for (var i = -r; i <= r; i++) {
        let sample_pos = vec2<i32>(gid.xy) + dir * i;

        // Clamp to texture bounds
        let clamped = clamp(sample_pos, vec2(0), vec2<i32>(dims) - vec2(1));
        let sample = textureLoad(input_tex, clamped, 0);

        let w = exp(-f32(i * i) / sigma2);
        color_sum += sample * w;
        weight_sum += w;
    }

    let result = color_sum / weight_sum;
    textureStore(output_tex, vec2<i32>(gid.xy), result);
}
