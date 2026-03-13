//! Cinematic effect parameters.
//!
//! Covers: rim light, split toning.

/// GPU-ready uniform for rim light (directional edge highlight).
#[derive(Debug, Clone, Copy)]
#[repr(C)]
pub struct RimLightParams {
    pub color_r: f32,
    pub color_g: f32,
    pub color_b: f32,
    /// Light direction angle in degrees.
    pub angle: f32,
    /// Light intensity (0..100 mapped from UI).
    pub intensity: f32,
    /// Light width in pixels.
    pub width: f32,
    /// Source texture width.
    pub tex_width: f32,
    /// Source texture height.
    pub tex_height: f32,
}

/// GPU-ready uniform for split toning (highlight/shadow color grading).
#[derive(Debug, Clone, Copy)]
#[repr(C)]
pub struct SplitToningParams {
    pub highlight_r: f32,
    pub highlight_g: f32,
    pub highlight_b: f32,
    pub shadow_r: f32,
    pub shadow_g: f32,
    pub shadow_b: f32,
    /// Balance between highlights and shadows (-100..+100 mapped to -1..+1).
    pub balance: f32,
}
