//! Toggle-based color effects.
//!
//! Covers: grayscale, sepia, invert.
//! These are combined into a single GPU pass for efficiency.

use thamnel_core::effects::EffectStack;

/// GPU-ready uniform for combined color toggle pass.
#[derive(Debug, Clone, Copy)]
#[repr(C)]
pub struct ColorToggleParams {
    /// 1.0 = apply grayscale, 0.0 = skip.
    pub grayscale: f32,
    /// 1.0 = apply sepia, 0.0 = skip.
    pub sepia: f32,
    /// 1.0 = apply invert, 0.0 = skip.
    pub invert: f32,
    pub _pad: f32,
}

/// Check if any toggle effect is active.
pub fn has_active_toggles(effects: &EffectStack) -> bool {
    effects.grayscale || effects.sepia || effects.invert
}

/// Extract toggle params from effect stack.
pub fn extract_toggles(effects: &EffectStack) -> ColorToggleParams {
    ColorToggleParams {
        grayscale: if effects.grayscale { 1.0 } else { 0.0 },
        sepia: if effects.sepia { 1.0 } else { 0.0 },
        invert: if effects.invert { 1.0 } else { 0.0 },
        _pad: 0.0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn no_toggles_by_default() {
        let effects = EffectStack::default();
        assert!(!has_active_toggles(&effects));
    }

    #[test]
    fn detects_grayscale() {
        let mut effects = EffectStack::default();
        effects.grayscale = true;
        assert!(has_active_toggles(&effects));
        let params = extract_toggles(&effects);
        assert_eq!(params.grayscale, 1.0);
        assert_eq!(params.sepia, 0.0);
    }
}
