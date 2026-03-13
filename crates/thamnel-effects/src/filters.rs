//! Filter effect parameters.
//!
//! Covers: gaussian blur, sharpen, vignette, pixelate, noise, posterize.

/// GPU-ready uniform for gaussian blur (separable two-pass).
///
/// Used for both horizontal (GaussianBlurH) and vertical (GaussianBlurV) passes.
#[derive(Debug, Clone, Copy)]
#[repr(C)]
pub struct GaussianBlurParams {
    /// Blur radius in pixels.
    pub radius: f32,
    /// Source texture width.
    pub tex_width: f32,
    /// Source texture height.
    pub tex_height: f32,
}

/// GPU-ready uniform for unsharp-mask sharpening.
#[derive(Debug, Clone, Copy)]
#[repr(C)]
pub struct SharpenParams {
    /// Sharpen amount (0.0 = none, 1.0 = full).
    pub amount: f32,
    /// Source texture width.
    pub tex_width: f32,
    /// Source texture height.
    pub tex_height: f32,
}

/// GPU-ready uniform for vignette effect.
#[derive(Debug, Clone, Copy)]
#[repr(C)]
pub struct VignetteParams {
    /// Vignette intensity (0.0 = none, 1.0+ = heavy).
    pub intensity: f32,
}

/// GPU-ready uniform for pixelation.
#[derive(Debug, Clone, Copy)]
#[repr(C)]
pub struct PixelateParams {
    /// Pixel block size.
    pub block_size: f32,
    /// Source texture width.
    pub tex_width: f32,
    /// Source texture height.
    pub tex_height: f32,
}

/// GPU-ready uniform for noise.
#[derive(Debug, Clone, Copy)]
#[repr(C)]
pub struct NoiseParams {
    /// Noise amount (1..100).
    pub amount: f32,
}

/// GPU-ready uniform for posterize.
#[derive(Debug, Clone, Copy)]
#[repr(C)]
pub struct PosterizeParams {
    /// Number of color levels (2..16).
    pub levels: f32,
}
