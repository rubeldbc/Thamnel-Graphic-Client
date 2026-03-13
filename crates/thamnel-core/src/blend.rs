//! Blend mode definitions matching the 17 modes from the current editor.

use serde::{Deserialize, Serialize};

/// Blend mode for layer compositing.
///
/// All 17 modes match the current TypeScript `BlendMode` union exactly.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum BlendMode {
    #[default]
    Normal,
    Multiply,
    Darken,
    ColorBurn,
    Screen,
    Lighten,
    ColorDodge,
    LinearDodge,
    Overlay,
    SoftLight,
    HardLight,
    Difference,
    Exclusion,
    Hue,
    Saturation,
    Color,
    Luminosity,
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_is_normal() {
        assert_eq!(BlendMode::default(), BlendMode::Normal);
    }

    #[test]
    fn serde_roundtrip() {
        let mode = BlendMode::ColorDodge;
        let json = serde_json::to_string(&mode).unwrap();
        assert_eq!(json, "\"colorDodge\"");
        let back: BlendMode = serde_json::from_str(&json).unwrap();
        assert_eq!(mode, back);
    }

    #[test]
    fn linear_dodge_serde() {
        let mode = BlendMode::LinearDodge;
        let json = serde_json::to_string(&mode).unwrap();
        assert_eq!(json, "\"linearDodge\"");
        let back: BlendMode = serde_json::from_str(&json).unwrap();
        assert_eq!(mode, back);
    }

    #[test]
    fn all_modes_serialize() {
        let modes = [
            BlendMode::Normal,
            BlendMode::Multiply,
            BlendMode::Darken,
            BlendMode::ColorBurn,
            BlendMode::Screen,
            BlendMode::Lighten,
            BlendMode::ColorDodge,
            BlendMode::LinearDodge,
            BlendMode::Overlay,
            BlendMode::SoftLight,
            BlendMode::HardLight,
            BlendMode::Difference,
            BlendMode::Exclusion,
            BlendMode::Hue,
            BlendMode::Saturation,
            BlendMode::Color,
            BlendMode::Luminosity,
        ];
        assert_eq!(modes.len(), 17);
        for mode in &modes {
            let json = serde_json::to_string(mode).unwrap();
            let back: BlendMode = serde_json::from_str(&json).unwrap();
            assert_eq!(*mode, back);
        }
    }
}
