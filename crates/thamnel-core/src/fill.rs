//! Fill definitions for shapes and text — solid colors, gradients, and image fills.

use serde::{Deserialize, Serialize};

/// Type of fill applied to a shape or text element.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FillType {
    #[default]
    Solid,
    LinearGradient,
    RadialGradient,
    SweepGradient,
    Image,
}

/// How an image fill is stretched within its container.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ImageStretchMode {
    Tile,
    Stretch,
    Fit,
    #[default]
    Fill,
}

/// A single color stop in a gradient.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GradientStop {
    /// CSS color string (e.g. "#ff0000", "rgba(...)").
    pub color: String,
    /// Position along the gradient, 0.0 to 1.0.
    pub position: f64,
}

/// Complete fill definition for shapes and text.
///
/// Mirrors the current TypeScript `FillDefinition` interface.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FillDefinition {
    /// The fill type selector.
    #[serde(rename = "type")]
    pub fill_type: FillType,
    /// Solid fill color (CSS color string).
    pub solid_color: String,
    /// Gradient color stops.
    pub gradient_stops: Vec<GradientStop>,
    /// Gradient angle in degrees (for linear gradients).
    pub gradient_angle: f64,
    /// Gradient center X, normalized 0..1 (for radial/sweep gradients).
    pub gradient_center_x: f64,
    /// Gradient center Y, normalized 0..1.
    pub gradient_center_y: f64,
    /// Gradient radius, normalized 0..1 (for radial gradients).
    pub gradient_radius: f64,
    /// Path to an image file (for image fills).
    pub image_path: Option<String>,
    /// How the image fill is stretched.
    pub image_stretch: ImageStretchMode,
    /// Global alpha for the fill, 0.0 to 1.0.
    pub global_alpha: f64,
}

impl Default for FillDefinition {
    fn default() -> Self {
        Self {
            fill_type: FillType::Solid,
            solid_color: "#000000".to_string(),
            gradient_stops: vec![
                GradientStop {
                    color: "#000000".to_string(),
                    position: 0.0,
                },
                GradientStop {
                    color: "#ffffff".to_string(),
                    position: 1.0,
                },
            ],
            gradient_angle: 0.0,
            gradient_center_x: 0.5,
            gradient_center_y: 0.5,
            gradient_radius: 0.5,
            image_path: None,
            image_stretch: ImageStretchMode::Fill,
            global_alpha: 1.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fill_type_serde() {
        let ft = FillType::LinearGradient;
        let json = serde_json::to_string(&ft).unwrap();
        assert_eq!(json, "\"linearGradient\"");
        let back: FillType = serde_json::from_str(&json).unwrap();
        assert_eq!(ft, back);
    }

    #[test]
    fn fill_definition_serde_roundtrip() {
        let fill = FillDefinition::default();
        let json = serde_json::to_string(&fill).unwrap();
        let back: FillDefinition = serde_json::from_str(&json).unwrap();
        assert_eq!(fill, back);
    }

    #[test]
    fn fill_definition_type_field_name() {
        let fill = FillDefinition::default();
        let json = serde_json::to_string(&fill).unwrap();
        // The field should be "type" not "fillType" in JSON
        assert!(json.contains("\"type\":\"solid\""));
    }

    #[test]
    fn gradient_stop_serde() {
        let stop = GradientStop {
            color: "#ff6600".to_string(),
            position: 0.5,
        };
        let json = serde_json::to_string(&stop).unwrap();
        let back: GradientStop = serde_json::from_str(&json).unwrap();
        assert_eq!(stop, back);
    }
}
