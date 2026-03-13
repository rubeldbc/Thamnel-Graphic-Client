// Color adjustment shader: brightness, contrast, saturation, hue rotation,
// temperature, tint, exposure, highlights, shadows.
//
// All adjustments in a single pass for efficiency.

struct Params {
    brightness: f32,
    contrast: f32,
    saturation: f32,
    hue_rotation: f32,
    temperature: f32,
    tint: f32,
    exposure: f32,
    highlights: f32,
    shadows: f32,
    _pad: f32,
}

@group(0) @binding(0) var input_tex: texture_2d<f32>;
@group(0) @binding(1) var output_tex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> params: Params;

fn rgb_to_hsl(c: vec3<f32>) -> vec3<f32> {
    let mx = max(max(c.r, c.g), c.b);
    let mn = min(min(c.r, c.g), c.b);
    let l = (mx + mn) * 0.5;
    if mx == mn {
        return vec3(0.0, 0.0, l);
    }
    let d = mx - mn;
    let s = select(d / (mx + mn), d / (2.0 - mx - mn), l > 0.5);
    var h: f32;
    if mx == c.r {
        h = (c.g - c.b) / d + select(0.0, 6.0, c.g < c.b);
    } else if mx == c.g {
        h = (c.b - c.r) / d + 2.0;
    } else {
        h = (c.r - c.g) / d + 4.0;
    }
    h /= 6.0;
    return vec3(h, s, l);
}

fn hue2rgb(p: f32, q: f32, t_in: f32) -> f32 {
    var t = t_in;
    if t < 0.0 { t += 1.0; }
    if t > 1.0 { t -= 1.0; }
    if t < 1.0 / 6.0 { return p + (q - p) * 6.0 * t; }
    if t < 1.0 / 2.0 { return q; }
    if t < 2.0 / 3.0 { return p + (q - p) * (2.0 / 3.0 - t) * 6.0; }
    return p;
}

fn hsl_to_rgb(hsl: vec3<f32>) -> vec3<f32> {
    if hsl.y == 0.0 {
        return vec3(hsl.z, hsl.z, hsl.z);
    }
    let q = select(hsl.z + hsl.y - hsl.z * hsl.y, hsl.z * (1.0 + hsl.y), hsl.z < 0.5);
    let p = 2.0 * hsl.z - q;
    return vec3(
        hue2rgb(p, q, hsl.x + 1.0 / 3.0),
        hue2rgb(p, q, hsl.x),
        hue2rgb(p, q, hsl.x - 1.0 / 3.0),
    );
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let dims = textureDimensions(input_tex);
    if gid.x >= dims.x || gid.y >= dims.y {
        return;
    }

    var c = textureLoad(input_tex, vec2<i32>(gid.xy), 0);
    let alpha = c.a;

    // Skip fully transparent pixels
    if alpha < 0.001 {
        textureStore(output_tex, vec2<i32>(gid.xy), c);
        return;
    }

    var rgb = c.rgb;

    // Unpremultiply if needed
    if alpha < 1.0 {
        rgb /= alpha;
    }

    // 1. Exposure
    rgb *= params.exposure;

    // 2. Brightness
    rgb *= params.brightness;

    // 3. Contrast (around midpoint 0.5)
    rgb = (rgb - 0.5) * params.contrast + 0.5;

    // 4. Temperature (warm = more red/yellow, cool = more blue)
    rgb.r += params.temperature * 0.1;
    rgb.b -= params.temperature * 0.1;

    // 5. Tint (green-magenta axis)
    rgb.g += params.tint * 0.1;

    // 6. Highlights & shadows
    let luminance = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    let highlight_mask = smoothstep(0.3, 0.7, luminance);
    let shadow_mask = 1.0 - highlight_mask;
    rgb += params.highlights * highlight_mask * 0.2;
    rgb += params.shadows * shadow_mask * 0.2;

    // 7. Saturation
    let gray = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    rgb = mix(vec3(gray), rgb, params.saturation);

    // 8. Hue rotation
    if abs(params.hue_rotation) > 0.001 {
        let hsl = rgb_to_hsl(clamp(rgb, vec3(0.0), vec3(1.0)));
        var new_h = hsl.x + params.hue_rotation / (2.0 * 3.14159265);
        if new_h < 0.0 { new_h += 1.0; }
        if new_h > 1.0 { new_h -= 1.0; }
        rgb = hsl_to_rgb(vec3(new_h, hsl.y, hsl.z));
    }

    // Clamp and re-premultiply
    rgb = clamp(rgb, vec3(0.0), vec3(1.0));
    if alpha < 1.0 {
        rgb *= alpha;
    }

    textureStore(output_tex, vec2<i32>(gid.xy), vec4(rgb, alpha));
}
