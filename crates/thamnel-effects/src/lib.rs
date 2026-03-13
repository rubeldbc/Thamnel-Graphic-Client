//! `thamnel-effects` — Effect definitions and WGSL shader kernels.
//!
//! This crate owns:
//! - Effect parameter models (re-exported from thamnel-core for convenience)
//! - WGSL shader source code for GPU effect execution
//! - Shader registry for looking up shaders by effect type
//!
//! This crate does NOT own:
//! - Render pass scheduling (that's thamnel-render)
//! - Effect execution ordering (that's thamnel-render's render graph)

pub mod color;
pub mod filters;
pub mod shadows;
pub mod strokes;
pub mod cinematic;
pub mod toggles;
pub mod kernels;

// Re-export core effect types for convenience.
pub use thamnel_core::effects::{EffectStack, ColorAdjustments, has_active_effects};
pub use thamnel_core::blend::BlendMode;

/// Identifies which GPU effect pass to run.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum EffectPassKind {
    // Color adjustments (single pass)
    ColorAdjust,
    // Filters
    GaussianBlurH,
    GaussianBlurV,
    Sharpen,
    Vignette,
    Pixelate,
    Noise,
    Posterize,
    // Toggles (grayscale, sepia, invert — combined in one pass)
    ColorToggle,
    // Color tint
    ColorTint,
    // Shadows / glow
    DropShadow,
    OuterGlow,
    // Strokes
    CutStroke,
    SmoothStroke,
    // Cinematic
    RimLight,
    SplitToning,
    // Overlay
    BlendOverlay,
}

/// Uniform data for a single effect pass, sent to the GPU.
///
/// Each variant carries the parameters the corresponding WGSL shader expects.
#[derive(Debug, Clone)]
pub enum EffectUniforms {
    ColorAdjust(color::ColorAdjustParams),
    GaussianBlur(filters::GaussianBlurParams),
    Sharpen(filters::SharpenParams),
    Vignette(filters::VignetteParams),
    Pixelate(filters::PixelateParams),
    Noise(filters::NoiseParams),
    Posterize(filters::PosterizeParams),
    ColorToggle(toggles::ColorToggleParams),
    ColorTint(color::ColorTintParams),
    DropShadow(shadows::DropShadowParams),
    OuterGlow(shadows::OuterGlowParams),
    CutStroke(strokes::CutStrokeParams),
    SmoothStroke(strokes::SmoothStrokeParams),
    RimLight(cinematic::RimLightParams),
    SplitToning(cinematic::SplitToningParams),
}

/// Build an ordered list of effect passes from an EffectStack.
///
/// The render engine iterates this list and executes each pass in order.
/// The ordering matches the TypeScript effectsEngine.ts application order.
pub fn build_effect_passes(
    effects: &EffectStack,
    color_adj: &ColorAdjustments,
    texture_width: u32,
    texture_height: u32,
) -> Vec<(EffectPassKind, EffectUniforms)> {
    let mut passes = Vec::new();

    // 1. Color adjustments (brightness, contrast, saturation, hue + temperature/exposure/etc.)
    if color::has_active_color_adjust(effects, color_adj) {
        passes.push((
            EffectPassKind::ColorAdjust,
            EffectUniforms::ColorAdjust(color::extract_color_adjust(effects, color_adj)),
        ));
    }

    // 2. Color toggles (grayscale, sepia, invert)
    if toggles::has_active_toggles(effects) {
        passes.push((
            EffectPassKind::ColorToggle,
            EffectUniforms::ColorToggle(toggles::extract_toggles(effects)),
        ));
    }

    // 3. Gaussian blur (two-pass separable)
    if effects.gaussian_blur_enabled && effects.gaussian_blur > 0.0 {
        let params = filters::GaussianBlurParams {
            radius: effects.gaussian_blur as f32,
            tex_width: texture_width as f32,
            tex_height: texture_height as f32,
        };
        passes.push((EffectPassKind::GaussianBlurH, EffectUniforms::GaussianBlur(params.clone())));
        passes.push((EffectPassKind::GaussianBlurV, EffectUniforms::GaussianBlur(params)));
    }

    // 4. Sharpen
    if effects.sharpen_enabled && effects.sharpen > 0.0 {
        passes.push((
            EffectPassKind::Sharpen,
            EffectUniforms::Sharpen(filters::SharpenParams {
                amount: effects.sharpen as f32,
                tex_width: texture_width as f32,
                tex_height: texture_height as f32,
            }),
        ));
    }

    // 5. Vignette
    if effects.vignette_enabled && effects.vignette > 0.0 {
        passes.push((
            EffectPassKind::Vignette,
            EffectUniforms::Vignette(filters::VignetteParams {
                intensity: effects.vignette as f32,
            }),
        ));
    }

    // 6. Pixelate
    if effects.pixelate_enabled && effects.pixelate > 0.0 {
        passes.push((
            EffectPassKind::Pixelate,
            EffectUniforms::Pixelate(filters::PixelateParams {
                block_size: effects.pixelate as f32,
                tex_width: texture_width as f32,
                tex_height: texture_height as f32,
            }),
        ));
    }

    // 7. Color tint
    if effects.color_tint_enabled && effects.color_tint_intensity > 0.0 {
        let (r, g, b) = color::parse_hex_color(&effects.color_tint_color);
        passes.push((
            EffectPassKind::ColorTint,
            EffectUniforms::ColorTint(color::ColorTintParams {
                tint_r: r,
                tint_g: g,
                tint_b: b,
                intensity: effects.color_tint_intensity as f32,
            }),
        ));
    }

    // 8. Noise
    if effects.noise_enabled && effects.noise > 0.0 {
        passes.push((
            EffectPassKind::Noise,
            EffectUniforms::Noise(filters::NoiseParams {
                amount: effects.noise as f32,
            }),
        ));
    }

    // 9. Posterize
    if effects.posterize_enabled && effects.posterize > 0.0 {
        passes.push((
            EffectPassKind::Posterize,
            EffectUniforms::Posterize(filters::PosterizeParams {
                levels: effects.posterize as f32,
            }),
        ));
    }

    // 10. Rim light
    if effects.rim_light_enabled {
        let (r, g, b) = color::parse_hex_color(&effects.rim_light_color);
        passes.push((
            EffectPassKind::RimLight,
            EffectUniforms::RimLight(cinematic::RimLightParams {
                color_r: r,
                color_g: g,
                color_b: b,
                angle: effects.rim_light_angle as f32,
                intensity: effects.rim_light_intensity as f32,
                width: effects.rim_light_width as f32,
                tex_width: texture_width as f32,
                tex_height: texture_height as f32,
            }),
        ));
    }

    // 11. Split toning
    if effects.split_toning_enabled {
        let (hr, hg, hb) = color::parse_hex_color(&effects.split_toning_highlight_color);
        let (sr, sg, sb) = color::parse_hex_color(&effects.split_toning_shadow_color);
        passes.push((
            EffectPassKind::SplitToning,
            EffectUniforms::SplitToning(cinematic::SplitToningParams {
                highlight_r: hr,
                highlight_g: hg,
                highlight_b: hb,
                shadow_r: sr,
                shadow_g: sg,
                shadow_b: sb,
                balance: effects.split_toning_balance as f32,
            }),
        ));
    }

    // 12. Drop shadow (applied via compositor-level compositing, but params built here)
    if effects.drop_shadow_enabled {
        let (r, g, b) = color::parse_hex_color(&effects.drop_shadow_color);
        passes.push((
            EffectPassKind::DropShadow,
            EffectUniforms::DropShadow(shadows::DropShadowParams {
                color_r: r,
                color_g: g,
                color_b: b,
                offset_x: effects.drop_shadow_offset_x as f32,
                offset_y: effects.drop_shadow_offset_y as f32,
                blur_radius: effects.drop_shadow_blur as f32,
                opacity: effects.drop_shadow_opacity as f32,
            }),
        ));
    }

    // 13. Outer glow
    if effects.outer_glow_enabled {
        let (r, g, b) = color::parse_hex_color(&effects.outer_glow_color);
        passes.push((
            EffectPassKind::OuterGlow,
            EffectUniforms::OuterGlow(shadows::OuterGlowParams {
                color_r: r,
                color_g: g,
                color_b: b,
                radius: effects.outer_glow_radius as f32,
                intensity: effects.outer_glow_intensity as f32,
            }),
        ));
    }

    // 14. Cut stroke
    if effects.cut_stroke_enabled {
        let (r, g, b) = color::parse_hex_color(&effects.cut_stroke_color);
        passes.push((
            EffectPassKind::CutStroke,
            EffectUniforms::CutStroke(strokes::CutStrokeParams {
                color_r: r,
                color_g: g,
                color_b: b,
                width: effects.cut_stroke_width as f32,
                tex_width: texture_width as f32,
                tex_height: texture_height as f32,
            }),
        ));
    }

    // 15. Smooth stroke
    if effects.smooth_stroke_enabled {
        let (r, g, b) = color::parse_hex_color(&effects.smooth_stroke_color);
        passes.push((
            EffectPassKind::SmoothStroke,
            EffectUniforms::SmoothStroke(strokes::SmoothStrokeParams {
                color_r: r,
                color_g: g,
                color_b: b,
                width: effects.smooth_stroke_width as f32,
                opacity: effects.smooth_stroke_opacity as f32,
                tex_width: texture_width as f32,
                tex_height: texture_height as f32,
            }),
        ));
    }

    passes
}
