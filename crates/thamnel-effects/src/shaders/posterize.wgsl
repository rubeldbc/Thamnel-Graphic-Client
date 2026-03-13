// Posterize: reduces color levels.

struct Params {
    levels: f32,
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
    let levels = max(params.levels, 2.0);

    let posterized = floor(c.rgb * levels) / (levels - 1.0);
    textureStore(output_tex, vec2<i32>(gid.xy), vec4(posterized, c.a));
}
