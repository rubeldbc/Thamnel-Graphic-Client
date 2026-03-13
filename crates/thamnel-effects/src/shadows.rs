//! Shadow and glow effect parameters.
//!
//! Covers: drop shadow, outer glow.

/// GPU-ready uniform for drop shadow.
#[derive(Debug, Clone, Copy)]
#[repr(C)]
pub struct DropShadowParams {
    pub color_r: f32,
    pub color_g: f32,
    pub color_b: f32,
    /// X offset in pixels.
    pub offset_x: f32,
    /// Y offset in pixels.
    pub offset_y: f32,
    /// Blur radius in pixels.
    pub blur_radius: f32,
    /// Shadow opacity (0..1).
    pub opacity: f32,
}

/// GPU-ready uniform for outer glow.
#[derive(Debug, Clone, Copy)]
#[repr(C)]
pub struct OuterGlowParams {
    pub color_r: f32,
    pub color_g: f32,
    pub color_b: f32,
    /// Glow radius in pixels.
    pub radius: f32,
    /// Glow intensity (0..100 mapped from UI).
    pub intensity: f32,
}
