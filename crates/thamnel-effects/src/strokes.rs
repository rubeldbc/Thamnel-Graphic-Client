//! Stroke/outline effect parameters.
//!
//! Covers: cut stroke (hard outline), smooth stroke (anti-aliased outline).

/// GPU-ready uniform for cut stroke (hard outline around alpha).
#[derive(Debug, Clone, Copy)]
#[repr(C)]
pub struct CutStrokeParams {
    pub color_r: f32,
    pub color_g: f32,
    pub color_b: f32,
    /// Stroke width in pixels.
    pub width: f32,
    /// Source texture width.
    pub tex_width: f32,
    /// Source texture height.
    pub tex_height: f32,
}

/// GPU-ready uniform for smooth stroke (anti-aliased/blurred outline).
#[derive(Debug, Clone, Copy)]
#[repr(C)]
pub struct SmoothStrokeParams {
    pub color_r: f32,
    pub color_g: f32,
    pub color_b: f32,
    /// Stroke width in pixels.
    pub width: f32,
    /// Stroke opacity (0..1).
    pub opacity: f32,
    /// Source texture width.
    pub tex_width: f32,
    /// Source texture height.
    pub tex_height: f32,
}
