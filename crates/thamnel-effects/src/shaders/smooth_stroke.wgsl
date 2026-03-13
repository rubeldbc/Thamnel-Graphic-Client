// Smooth stroke: anti-aliased outline with opacity control.
// Uses distance-based falloff for smooth edges.

struct Params {
    color_r: f32,
    color_g: f32,
    color_b: f32,
    width: f32,
    opacity: f32,
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

    // If pixel is already opaque, keep it
    if orig.a > 0.5 {
        textureStore(output_tex, vec2<i32>(gid.xy), orig);
        return;
    }

    // Find nearest opaque pixel distance
    let r = i32(ceil(params.width + 1.0));
    var min_dist = f32(r + 1);

    for (var dy = -r; dy <= r; dy++) {
        for (var dx = -r; dx <= r; dx++) {
            let sp = clamp(vec2<i32>(gid.xy) + vec2(dx, dy), vec2(0), vec2<i32>(dims) - 1);
            let s = textureLoad(input_tex, sp, 0);
            if s.a > 0.5 {
                let dist = sqrt(f32(dx * dx + dy * dy));
                min_dist = min(min_dist, dist);
            }
        }
    }

    if min_dist <= params.width {
        // Smooth falloff at the edge
        let falloff = smoothstep(params.width, params.width * 0.5, min_dist);
        let stroke_alpha = falloff * params.opacity;
        let stroke_color = vec3(params.color_r, params.color_g, params.color_b);
        textureStore(output_tex, vec2<i32>(gid.xy), vec4(stroke_color * stroke_alpha, stroke_alpha));
    } else {
        textureStore(output_tex, vec2<i32>(gid.xy), orig);
    }
}
