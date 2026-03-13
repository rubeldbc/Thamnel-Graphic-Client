// Color toggles: grayscale, sepia, invert — combined in one pass.

struct Params {
    grayscale: f32,
    sepia: f32,
    invert: f32,
    _pad: f32,
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

    var c = textureLoad(input_tex, vec2<i32>(gid.xy), 0);
    var rgb = c.rgb;

    // Grayscale
    if params.grayscale > 0.5 {
        let gray = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
        rgb = vec3(gray);
    }

    // Sepia
    if params.sepia > 0.5 {
        let gray = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
        rgb = vec3(
            min(gray * 1.2 + 0.1, 1.0),
            gray * 1.0,
            max(gray * 0.8 - 0.05, 0.0),
        );
    }

    // Invert
    if params.invert > 0.5 {
        rgb = vec3(1.0) - rgb;
    }

    textureStore(output_tex, vec2<i32>(gid.xy), vec4(rgb, c.a));
}
