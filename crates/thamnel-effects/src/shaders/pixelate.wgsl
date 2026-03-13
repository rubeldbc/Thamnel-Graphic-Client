// Pixelation: snaps pixel coordinates to a grid.

struct Params {
    block_size: f32,
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

    let block = max(params.block_size, 1.0);

    // Snap to grid
    let block_x = u32(floor(f32(gid.x) / block) * block + block * 0.5);
    let block_y = u32(floor(f32(gid.y) / block) * block + block * 0.5);

    let sample_pos = clamp(vec2<i32>(i32(block_x), i32(block_y)), vec2(0), vec2<i32>(dims) - 1);
    let c = textureLoad(input_tex, sample_pos, 0);

    textureStore(output_tex, vec2<i32>(gid.xy), c);
}
