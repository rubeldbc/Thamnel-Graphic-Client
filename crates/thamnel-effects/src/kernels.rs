//! Shader registry — provides WGSL source strings for each effect pass.
//!
//! The render engine calls `get_shader_source()` to get the WGSL code,
//! then creates wgpu compute pipelines from it.

use crate::EffectPassKind;

/// Returns the WGSL shader source for the given effect pass.
pub fn get_shader_source(kind: EffectPassKind) -> &'static str {
    match kind {
        EffectPassKind::ColorAdjust => include_str!("shaders/color_adjust.wgsl"),
        EffectPassKind::GaussianBlurH | EffectPassKind::GaussianBlurV => {
            include_str!("shaders/blur.wgsl")
        }
        EffectPassKind::Sharpen => include_str!("shaders/sharpen.wgsl"),
        EffectPassKind::Vignette => include_str!("shaders/vignette.wgsl"),
        EffectPassKind::Pixelate => include_str!("shaders/pixelate.wgsl"),
        EffectPassKind::Noise => include_str!("shaders/noise.wgsl"),
        EffectPassKind::Posterize => include_str!("shaders/posterize.wgsl"),
        EffectPassKind::ColorToggle => include_str!("shaders/color_toggle.wgsl"),
        EffectPassKind::ColorTint => include_str!("shaders/color_tint.wgsl"),
        EffectPassKind::DropShadow => include_str!("shaders/shadow.wgsl"),
        EffectPassKind::OuterGlow => include_str!("shaders/glow.wgsl"),
        EffectPassKind::CutStroke => include_str!("shaders/stroke.wgsl"),
        EffectPassKind::SmoothStroke => include_str!("shaders/smooth_stroke.wgsl"),
        EffectPassKind::RimLight => include_str!("shaders/rim_light.wgsl"),
        EffectPassKind::SplitToning => include_str!("shaders/split_tone.wgsl"),
        EffectPassKind::BlendOverlay => {
            // Blend overlay requires a second texture (the overlay image).
            // For now, return a passthrough shader. Full implementation in Phase A.2.
            include_str!("shaders/color_toggle.wgsl")
        }
    }
}

/// Returns the uniform buffer size in bytes for the given effect pass.
///
/// Must match the `Params` struct size in each WGSL shader.
/// All structs are padded to 16-byte alignment for GPU uniforms.
pub fn get_uniform_size(kind: EffectPassKind) -> u64 {
    match kind {
        EffectPassKind::ColorAdjust => 48,   // 10 f32 = 40, padded to 48
        EffectPassKind::GaussianBlurH | EffectPassKind::GaussianBlurV => 32, // 5 f32 = 20, padded to 32
        EffectPassKind::Sharpen => 16,       // 3 f32 = 12, padded to 16
        EffectPassKind::Vignette => 16,      // 1 f32 = 4, padded to 16
        EffectPassKind::Pixelate => 16,      // 3 f32 = 12, padded to 16
        EffectPassKind::Noise => 16,         // 4 f32 = 16
        EffectPassKind::Posterize => 16,     // 1 f32 = 4, padded to 16
        EffectPassKind::ColorToggle => 16,   // 4 f32 = 16
        EffectPassKind::ColorTint => 16,     // 4 f32 = 16
        EffectPassKind::DropShadow => 32,    // 7 f32 = 28, padded to 32
        EffectPassKind::OuterGlow => 32,     // 5 f32 = 20, padded to 32
        EffectPassKind::CutStroke => 32,     // 6 f32 = 24, padded to 32
        EffectPassKind::SmoothStroke => 32,  // 7 f32 = 28, padded to 32
        EffectPassKind::RimLight => 32,      // 8 f32 = 32
        EffectPassKind::SplitToning => 32,   // 8 f32 = 32
        EffectPassKind::BlendOverlay => 16,  // placeholder
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_shaders_load() {
        let kinds = [
            EffectPassKind::ColorAdjust,
            EffectPassKind::GaussianBlurH,
            EffectPassKind::GaussianBlurV,
            EffectPassKind::Sharpen,
            EffectPassKind::Vignette,
            EffectPassKind::Pixelate,
            EffectPassKind::Noise,
            EffectPassKind::Posterize,
            EffectPassKind::ColorToggle,
            EffectPassKind::ColorTint,
            EffectPassKind::DropShadow,
            EffectPassKind::OuterGlow,
            EffectPassKind::CutStroke,
            EffectPassKind::SmoothStroke,
            EffectPassKind::RimLight,
            EffectPassKind::SplitToning,
        ];

        for kind in &kinds {
            let src = get_shader_source(*kind);
            assert!(!src.is_empty(), "Shader for {:?} is empty", kind);
            assert!(
                src.contains("@compute"),
                "Shader for {:?} missing @compute entry point",
                kind
            );
        }
    }

    #[test]
    fn uniform_sizes_are_16_aligned() {
        let kinds = [
            EffectPassKind::ColorAdjust,
            EffectPassKind::GaussianBlurH,
            EffectPassKind::Sharpen,
            EffectPassKind::Vignette,
            EffectPassKind::Pixelate,
            EffectPassKind::Noise,
            EffectPassKind::Posterize,
            EffectPassKind::ColorToggle,
            EffectPassKind::ColorTint,
            EffectPassKind::DropShadow,
            EffectPassKind::OuterGlow,
            EffectPassKind::CutStroke,
            EffectPassKind::SmoothStroke,
            EffectPassKind::RimLight,
            EffectPassKind::SplitToning,
        ];

        for kind in &kinds {
            let size = get_uniform_size(*kind);
            assert!(
                size % 16 == 0,
                "Uniform size for {:?} is {} (not 16-byte aligned)",
                kind,
                size
            );
        }
    }
}
