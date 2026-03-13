//! Color adjustment effect parameters.
//!
//! Covers: brightness, contrast, saturation, hue, temperature, tint,
//! exposure, highlights, shadows, and color tint overlay.

use thamnel_core::effects::{ColorAdjustments, EffectStack};

/// GPU-ready uniform for the combined color adjustment pass.
///
/// All values are normalized to the ranges the WGSL shader expects.
#[derive(Debug, Clone, Copy)]
#[repr(C)]
pub struct ColorAdjustParams {
    /// Brightness: 0.0 = black, 1.0 = unchanged, 2.0 = double bright.
    pub brightness: f32,
    /// Contrast: 0.0 = gray, 1.0 = unchanged, 2.0 = max contrast.
    pub contrast: f32,
    /// Saturation: 0.0 = grayscale, 1.0 = unchanged, 2.0 = oversaturated.
    pub saturation: f32,
    /// Hue rotation in radians.
    pub hue_rotation: f32,
    /// Temperature shift (-1.0 cool .. +1.0 warm).
    pub temperature: f32,
    /// Tint shift (-1.0 green .. +1.0 magenta).
    pub tint: f32,
    /// Exposure multiplier (0.0 .. 2.0, 1.0 = unchanged).
    pub exposure: f32,
    /// Highlights adjustment (-1.0 .. +1.0).
    pub highlights: f32,
    /// Shadows adjustment (-1.0 .. +1.0).
    pub shadows: f32,
    pub _pad: f32,
}

/// GPU-ready uniform for color tint overlay.
#[derive(Debug, Clone, Copy)]
#[repr(C)]
pub struct ColorTintParams {
    pub tint_r: f32,
    pub tint_g: f32,
    pub tint_b: f32,
    pub intensity: f32,
}

/// Check if any color adjustment is active.
pub fn has_active_color_adjust(effects: &EffectStack, adj: &ColorAdjustments) -> bool {
    (effects.brightness_enabled && effects.brightness != 0.0)
        || (effects.contrast_enabled && effects.contrast != 0.0)
        || (effects.saturation_enabled && effects.saturation != 0.0)
        || (effects.hue_enabled && effects.hue != 0.0)
        || adj.temperature != 0.0
        || adj.tint != 0.0
        || adj.exposure != 0.0
        || adj.highlights != 0.0
        || adj.shadows != 0.0
}

/// Extract GPU-ready color adjustment params from the effect stack.
pub fn extract_color_adjust(effects: &EffectStack, adj: &ColorAdjustments) -> ColorAdjustParams {
    // Map from UI range (-100..+100) to shader range (0..2, centered at 1)
    let brightness = if effects.brightness_enabled {
        1.0 + (effects.brightness as f32 / 100.0)
    } else {
        1.0
    };
    let contrast = if effects.contrast_enabled {
        1.0 + (effects.contrast as f32 / 100.0)
    } else {
        1.0
    };
    let saturation = if effects.saturation_enabled {
        1.0 + (effects.saturation as f32 / 100.0)
    } else {
        1.0
    };
    let hue_rotation = if effects.hue_enabled {
        (effects.hue as f32).to_radians()
    } else {
        0.0
    };

    // Color adjustments: map from -100..+100 to -1..+1
    let temperature = adj.temperature as f32 / 100.0;
    let tint = adj.tint as f32 / 100.0;
    let exposure = 1.0 + (adj.exposure as f32); // exposure is already -1..+1
    let highlights = adj.highlights as f32 / 100.0;
    let shadows = adj.shadows as f32 / 100.0;

    ColorAdjustParams {
        brightness,
        contrast,
        saturation,
        hue_rotation,
        temperature,
        tint,
        exposure,
        highlights,
        shadows,
        _pad: 0.0,
    }
}

/// Parse a CSS hex color (#RRGGBB or #RGB) into (r, g, b) floats in 0..1 range.
pub fn parse_hex_color(hex: &str) -> (f32, f32, f32) {
    let hex = hex.trim_start_matches('#');
    match hex.len() {
        6 => {
            let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(0) as f32 / 255.0;
            let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(0) as f32 / 255.0;
            let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(0) as f32 / 255.0;
            (r, g, b)
        }
        3 => {
            let r = u8::from_str_radix(&hex[0..1], 16).unwrap_or(0) as f32 / 15.0;
            let g = u8::from_str_radix(&hex[1..2], 16).unwrap_or(0) as f32 / 15.0;
            let b = u8::from_str_radix(&hex[2..3], 16).unwrap_or(0) as f32 / 15.0;
            (r, g, b)
        }
        _ => (0.0, 0.0, 0.0),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_hex_6_digit() {
        let (r, g, b) = parse_hex_color("#ff8800");
        assert!((r - 1.0).abs() < 0.01);
        assert!((g - 0.533).abs() < 0.01);
        assert!((b - 0.0).abs() < 0.01);
    }

    #[test]
    fn parse_hex_3_digit() {
        let (r, g, b) = parse_hex_color("#f80");
        assert!((r - 1.0).abs() < 0.01);
        assert!((g - 0.533).abs() < 0.01);
        assert!((b - 0.0).abs() < 0.01);
    }

    #[test]
    fn default_no_active_color() {
        let effects = EffectStack::default();
        let adj = ColorAdjustments::default();
        assert!(!has_active_color_adjust(&effects, &adj));
    }

    #[test]
    fn brightness_maps_correctly() {
        let mut effects = EffectStack::default();
        effects.brightness = 50.0;
        effects.brightness_enabled = true;
        let adj = ColorAdjustments::default();
        let params = extract_color_adjust(&effects, &adj);
        assert!((params.brightness - 1.5).abs() < 0.001);
    }
}
