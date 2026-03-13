// Split toning: applies different color tints to highlights vs shadows.

struct Params {
    highlight_r: f32,
    highlight_g: f32,
    highlight_b: f32,
    shadow_r: f32,
    shadow_g: f32,
    shadow_b: f32,
    balance: f32,
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

    let c = textureLoad(input_tex, vec2<i32>(gid.xy), 0);

    if c.a < 0.001 {
        textureStore(output_tex, vec2<i32>(gid.xy), c);
        return;
    }

    let luminance = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));

    // Balance shifts the midpoint (-100..+100 mapped to 0..1)
    let midpoint = 0.5 + params.balance / 200.0;

    let highlight_mask = smoothstep(midpoint - 0.1, midpoint + 0.1, luminance);
    let shadow_mask = 1.0 - highlight_mask;

    let highlight_tint = vec3(params.highlight_r, params.highlight_g, params.highlight_b);
    let shadow_tint = vec3(params.shadow_r, params.shadow_g, params.shadow_b);

    // Soft light blend for tinting
    let tinted = c.rgb
        + (highlight_tint - 0.5) * highlight_mask * 0.3
        + (shadow_tint - 0.5) * shadow_mask * 0.3;

    let result = clamp(tinted, vec3(0.0), vec3(1.0));
    textureStore(output_tex, vec2<i32>(gid.xy), vec4(result, c.a));
}
