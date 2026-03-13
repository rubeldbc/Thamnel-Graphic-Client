//! Text property definitions — data model only, no rendering.
//!
//! Rendering is handled by cosmic-text in thamnel-render.

use serde::{Deserialize, Serialize};

use crate::fill::FillDefinition;

/// Text alignment options.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TextAlignment {
    #[default]
    Left,
    Center,
    Right,
    Justify,
}

/// Text transform options.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TextTransform {
    #[default]
    None,
    Uppercase,
    Lowercase,
    Capitalize,
}

/// A styled run within text — per-character style overrides.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StyledRun {
    pub start_index: usize,
    pub length: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub font_weight: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub font_style: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub underline: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub strikethrough: Option<bool>,
}

/// Properties specific to text nodes.
///
/// Mirrors every field from the current TypeScript `TextProperties` interface.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextProperties {
    pub text: String,
    pub font_family: String,
    pub font_size: f64,
    /// Font weight, 100–900.
    pub font_weight: u32,
    pub font_style: String,
    pub color: String,
    pub stroke_color: String,
    pub stroke_width: f64,
    pub letter_spacing: f64,
    pub line_height: f64,
    pub alignment: TextAlignment,
    pub underline: bool,
    pub strikethrough: bool,
    pub has_background: bool,
    pub background_color: String,
    pub background_opacity: f64,
    pub background_padding: f64,
    pub background_corner_radius: f64,
    pub width_squeeze: f64,
    pub height_squeeze: f64,
    pub transform: TextTransform,
    pub fill: FillDefinition,
    pub shadow_offset_x: f64,
    pub shadow_offset_y: f64,
    pub shadow_blur: f64,
    pub shadow_color: String,
    pub runs: Vec<StyledRun>,
}

impl Default for TextProperties {
    fn default() -> Self {
        Self {
            text: String::new(),
            font_family: "Arial".to_string(),
            font_size: 24.0,
            font_weight: 400,
            font_style: "normal".to_string(),
            color: "#ffffff".to_string(),
            stroke_color: "#000000".to_string(),
            stroke_width: 0.0,
            letter_spacing: 0.0,
            line_height: 1.2,
            alignment: TextAlignment::Left,
            underline: false,
            strikethrough: false,
            has_background: false,
            background_color: "#000000".to_string(),
            background_opacity: 0.5,
            background_padding: 4.0,
            background_corner_radius: 0.0,
            width_squeeze: 1.0,
            height_squeeze: 1.0,
            transform: TextTransform::None,
            fill: FillDefinition {
                solid_color: "#ffffff".to_string(),
                ..FillDefinition::default()
            },
            shadow_offset_x: 0.0,
            shadow_offset_y: 0.0,
            shadow_blur: 0.0,
            shadow_color: "rgba(0,0,0,0.5)".to_string(),
            runs: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_text_properties_roundtrip() {
        let tp = TextProperties::default();
        let json = serde_json::to_string(&tp).unwrap();
        let back: TextProperties = serde_json::from_str(&json).unwrap();
        assert_eq!(tp, back);
    }

    #[test]
    fn text_alignment_serde() {
        let a = TextAlignment::Center;
        let json = serde_json::to_string(&a).unwrap();
        assert_eq!(json, "\"center\"");
    }

    #[test]
    fn styled_run_omits_none_fields() {
        let run = StyledRun {
            start_index: 0,
            length: 5,
            font_weight: Some(700),
            font_style: None,
            color: None,
            underline: None,
            strikethrough: None,
        };
        let json = serde_json::to_string(&run).unwrap();
        assert!(json.contains("fontWeight"));
        assert!(!json.contains("fontStyle"));
        assert!(!json.contains("underline"));
    }

    #[test]
    fn text_with_styled_runs() {
        let mut tp = TextProperties::default();
        tp.text = "Hello World".to_string();
        tp.runs = vec![
            StyledRun {
                start_index: 0,
                length: 5,
                font_weight: Some(700),
                font_style: None,
                color: Some("#ff0000".to_string()),
                underline: None,
                strikethrough: None,
            },
        ];
        let json = serde_json::to_string(&tp).unwrap();
        let back: TextProperties = serde_json::from_str(&json).unwrap();
        assert_eq!(tp, back);
        assert_eq!(back.runs.len(), 1);
    }
}
