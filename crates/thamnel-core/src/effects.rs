//! Effect stack and color adjustment definitions.
//!
//! These are declarative parameter models — they describe WHAT to apply.
//! The render engine (thamnel-render) decides HOW and WHEN to execute them.

use serde::{Deserialize, Serialize};

use crate::blend::BlendMode;

/// Declarative effect stack — all effect parameters for a single node.
///
/// Mirrors every field from the current TypeScript `LayerEffect` interface.
/// Each effect has an enabled flag so effects can be toggled without losing values.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EffectStack {
    // -- Brightness --
    pub brightness: f64,
    pub brightness_enabled: bool,

    // -- Contrast --
    pub contrast: f64,
    pub contrast_enabled: bool,

    // -- Saturation --
    pub saturation: f64,
    pub saturation_enabled: bool,

    // -- Hue --
    pub hue: f64,
    pub hue_enabled: bool,

    // -- Simple toggles --
    pub grayscale: bool,
    pub sepia: bool,
    pub invert: bool,

    // -- Sharpen --
    pub sharpen: f64,
    pub sharpen_enabled: bool,

    // -- Vignette --
    pub vignette: f64,
    pub vignette_enabled: bool,

    // -- Pixelate --
    pub pixelate: f64,
    pub pixelate_enabled: bool,

    // -- Color tint --
    pub color_tint_color: String,
    pub color_tint_intensity: f64,
    pub color_tint_enabled: bool,

    // -- Noise --
    pub noise: f64,
    pub noise_enabled: bool,

    // -- Posterize --
    pub posterize: f64,
    pub posterize_enabled: bool,

    // -- Gaussian blur --
    pub gaussian_blur: f64,
    pub gaussian_blur_enabled: bool,

    // -- Drop shadow --
    pub drop_shadow_color: String,
    pub drop_shadow_offset_x: f64,
    pub drop_shadow_offset_y: f64,
    pub drop_shadow_blur: f64,
    pub drop_shadow_opacity: f64,
    pub drop_shadow_enabled: bool,

    // -- Outer glow --
    pub outer_glow_color: String,
    pub outer_glow_radius: f64,
    pub outer_glow_intensity: f64,
    pub outer_glow_enabled: bool,

    // -- Cut stroke --
    pub cut_stroke_color: String,
    pub cut_stroke_width: f64,
    pub cut_stroke_enabled: bool,

    // -- Rim light --
    pub rim_light_color: String,
    pub rim_light_angle: f64,
    pub rim_light_intensity: f64,
    pub rim_light_width: f64,
    pub rim_light_enabled: bool,

    // -- Split toning --
    pub split_toning_highlight_color: String,
    pub split_toning_shadow_color: String,
    pub split_toning_balance: f64,
    pub split_toning_enabled: bool,

    // -- Smooth stroke --
    pub smooth_stroke_width: f64,
    pub smooth_stroke_color: String,
    pub smooth_stroke_opacity: f64,
    pub smooth_stroke_enabled: bool,

    // -- Blend overlay --
    pub blend_overlay_image: Option<String>,
    pub blend_overlay_opacity: f64,
    pub blend_overlay_mode: BlendMode,
    pub blend_overlay_enabled: bool,
}

impl Default for EffectStack {
    fn default() -> Self {
        Self {
            brightness: 0.0,
            brightness_enabled: false,
            contrast: 0.0,
            contrast_enabled: false,
            saturation: 0.0,
            saturation_enabled: false,
            hue: 0.0,
            hue_enabled: false,
            grayscale: false,
            sepia: false,
            invert: false,
            sharpen: 0.0,
            sharpen_enabled: false,
            vignette: 0.0,
            vignette_enabled: false,
            pixelate: 0.0,
            pixelate_enabled: false,
            color_tint_color: "#ff8800".to_string(),
            color_tint_intensity: 0.0,
            color_tint_enabled: false,
            noise: 0.0,
            noise_enabled: false,
            posterize: 0.0,
            posterize_enabled: false,
            gaussian_blur: 0.0,
            gaussian_blur_enabled: false,
            drop_shadow_color: "#000000".to_string(),
            drop_shadow_offset_x: 0.0,
            drop_shadow_offset_y: 0.0,
            drop_shadow_blur: 0.0,
            drop_shadow_opacity: 0.0,
            drop_shadow_enabled: false,
            outer_glow_color: "#ffffff".to_string(),
            outer_glow_radius: 0.0,
            outer_glow_intensity: 0.0,
            outer_glow_enabled: false,
            cut_stroke_color: "#000000".to_string(),
            cut_stroke_width: 0.0,
            cut_stroke_enabled: false,
            rim_light_color: "#ffffff".to_string(),
            rim_light_angle: 0.0,
            rim_light_intensity: 0.0,
            rim_light_width: 0.0,
            rim_light_enabled: false,
            split_toning_highlight_color: "#ffcc00".to_string(),
            split_toning_shadow_color: "#0044ff".to_string(),
            split_toning_balance: 0.0,
            split_toning_enabled: false,
            smooth_stroke_width: 0.0,
            smooth_stroke_color: "#000000".to_string(),
            smooth_stroke_opacity: 0.0,
            smooth_stroke_enabled: false,
            blend_overlay_image: None,
            blend_overlay_opacity: 0.0,
            blend_overlay_mode: BlendMode::Normal,
            blend_overlay_enabled: false,
        }
    }
}

/// Color adjustment parameters applied to a node.
///
/// Mirrors the current TypeScript `ColorAdjustments` interface.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColorAdjustments {
    pub temperature: f64,
    pub tint: f64,
    pub exposure: f64,
    pub highlights: f64,
    pub shadows: f64,
}

impl Default for ColorAdjustments {
    fn default() -> Self {
        Self {
            temperature: 0.0,
            tint: 0.0,
            exposure: 0.0,
            highlights: 0.0,
            shadows: 0.0,
        }
    }
}

/// Check if any effect in the stack is actively enabled with a non-zero value.
pub fn has_active_effects(effects: &EffectStack) -> bool {
    (effects.brightness_enabled && effects.brightness != 0.0)
        || (effects.contrast_enabled && effects.contrast != 0.0)
        || (effects.saturation_enabled && effects.saturation != 0.0)
        || (effects.hue_enabled && effects.hue != 0.0)
        || effects.grayscale
        || effects.sepia
        || effects.invert
        || (effects.sharpen_enabled && effects.sharpen != 0.0)
        || (effects.vignette_enabled && effects.vignette != 0.0)
        || (effects.pixelate_enabled && effects.pixelate > 0.0)
        || (effects.color_tint_enabled && effects.color_tint_intensity > 0.0)
        || (effects.noise_enabled && effects.noise > 0.0)
        || (effects.posterize_enabled && effects.posterize > 0.0)
        || (effects.gaussian_blur_enabled && effects.gaussian_blur > 0.0)
        || effects.drop_shadow_enabled
        || effects.outer_glow_enabled
        || effects.cut_stroke_enabled
        || effects.rim_light_enabled
        || effects.split_toning_enabled
        || effects.smooth_stroke_enabled
        || effects.blend_overlay_enabled
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_effects_roundtrip() {
        let effects = EffectStack::default();
        let json = serde_json::to_string(&effects).unwrap();
        let back: EffectStack = serde_json::from_str(&json).unwrap();
        assert_eq!(effects, back);
    }

    #[test]
    fn default_color_adjustments_roundtrip() {
        let ca = ColorAdjustments::default();
        let json = serde_json::to_string(&ca).unwrap();
        let back: ColorAdjustments = serde_json::from_str(&json).unwrap();
        assert_eq!(ca, back);
    }

    #[test]
    fn camel_case_field_names() {
        let effects = EffectStack::default();
        let json = serde_json::to_string(&effects).unwrap();
        assert!(json.contains("gaussianBlur"));
        assert!(json.contains("dropShadowColor"));
        assert!(json.contains("colorTintEnabled"));
        assert!(!json.contains("gaussian_blur"));
    }

    #[test]
    fn no_active_effects_by_default() {
        assert!(!has_active_effects(&EffectStack::default()));
    }

    #[test]
    fn detects_active_blur() {
        let mut effects = EffectStack::default();
        effects.gaussian_blur = 5.0;
        effects.gaussian_blur_enabled = true;
        assert!(has_active_effects(&effects));
    }
}
