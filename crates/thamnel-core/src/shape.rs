//! Shape type definitions and shape-specific properties.
//!
//! All 27 shape types from the current editor are represented here.

use serde::{Deserialize, Serialize};

use crate::fill::{FillDefinition, FillType};
use crate::geometry::Point;

/// Shape type identifier — all 28 shapes from the current editor.
///
/// Matches the TypeScript `ShapeType` union exactly.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ShapeType {
    Line,
    DiagonalLine,
    #[default]
    Rectangle,
    RoundedRectangle,
    Snip,
    Ellipse,
    Triangle,
    RightTriangle,
    Diamond,
    Parallelogram,
    Trapezoid,
    Pentagon,
    Hexagon,
    Octagon,
    Cross,
    Heart,
    Star,
    Star6,
    Ring,
    Arrow,
    ArrowLeft,
    ArrowUp,
    ArrowDown,
    DoubleArrow,
    ChevronRight,
    ChevronLeft,
    Polygon,
    Custom,
}

/// Transparency mask type for shapes.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TransparencyMaskType {
    #[default]
    None,
    Linear,
    Radial,
}

/// Properties specific to shape nodes.
///
/// Mirrors every field from the current TypeScript `ShapeProperties` interface.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShapeProperties {
    pub shape_type: ShapeType,
    pub fill_color: String,
    pub fill_type: FillType,
    pub fill: Option<FillDefinition>,
    pub border_color: String,
    pub border_width: f64,
    pub corner_radius: f64,
    pub image_fill_path: Option<String>,
    pub image_fill_stretch: String,
    pub mask_mode: bool,
    pub path_data: Option<String>,
    /// Points for polyline/polygon shapes (local coordinates relative to layer top-left).
    pub points: Vec<Point>,
    pub is_closed: bool,
    pub opacity: f64,
    pub is_image_filled: bool,
    pub image_fill_data: Option<String>,
    pub image_fill_offset_x: f64,
    pub image_fill_offset_y: f64,
    pub image_fill_scale_x: f64,
    pub image_fill_scale_y: f64,
    pub image_fill_rotation: f64,
    pub image_fill_crop_top: f64,
    pub image_fill_crop_bottom: f64,
    pub image_fill_crop_left: f64,
    pub image_fill_crop_right: f64,
    pub mask_type: TransparencyMaskType,
    pub mask_angle: f64,
    pub mask_top: f64,
    pub mask_bottom: f64,
    pub mask_left: f64,
    pub mask_right: f64,
    pub mask_center_x: f64,
    pub mask_center_y: f64,
    /// Number of sides for polygon shapes (3 = triangle, 5 = pentagon, etc.).
    pub polygon_sides: u32,
    /// Star inner radius ratio (0..1). `innerR = outerR * star_inner_ratio`.
    pub star_inner_ratio: f64,
}

impl Default for ShapeProperties {
    fn default() -> Self {
        Self {
            shape_type: ShapeType::Rectangle,
            fill_color: "#3b82f6".to_string(),
            fill_type: FillType::Solid,
            fill: None,
            border_color: "#000000".to_string(),
            border_width: 0.0,
            corner_radius: 0.0,
            image_fill_path: None,
            image_fill_stretch: "fill".to_string(),
            mask_mode: false,
            path_data: None,
            points: Vec::new(),
            is_closed: true,
            opacity: 1.0,
            is_image_filled: false,
            image_fill_data: None,
            image_fill_offset_x: 0.0,
            image_fill_offset_y: 0.0,
            image_fill_scale_x: 1.0,
            image_fill_scale_y: 1.0,
            image_fill_rotation: 0.0,
            image_fill_crop_top: 0.0,
            image_fill_crop_bottom: 0.0,
            image_fill_crop_left: 0.0,
            image_fill_crop_right: 0.0,
            mask_type: TransparencyMaskType::None,
            mask_angle: 0.0,
            mask_top: 0.0,
            mask_bottom: 0.0,
            mask_left: 0.0,
            mask_right: 0.0,
            mask_center_x: 0.5,
            mask_center_y: 0.5,
            polygon_sides: 4,
            star_inner_ratio: 0.5,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_shape_properties_roundtrip() {
        let sp = ShapeProperties::default();
        let json = serde_json::to_string(&sp).unwrap();
        let back: ShapeProperties = serde_json::from_str(&json).unwrap();
        assert_eq!(sp, back);
    }

    #[test]
    fn shape_type_serde() {
        let st = ShapeType::RoundedRectangle;
        let json = serde_json::to_string(&st).unwrap();
        assert_eq!(json, "\"roundedRectangle\"");
        let back: ShapeType = serde_json::from_str(&json).unwrap();
        assert_eq!(st, back);
    }

    #[test]
    fn all_28_shape_types_serialize() {
        let types = [
            ShapeType::Line, ShapeType::DiagonalLine,
            ShapeType::Rectangle, ShapeType::RoundedRectangle, ShapeType::Snip,
            ShapeType::Ellipse, ShapeType::Triangle, ShapeType::RightTriangle,
            ShapeType::Diamond, ShapeType::Parallelogram, ShapeType::Trapezoid,
            ShapeType::Pentagon, ShapeType::Hexagon, ShapeType::Octagon,
            ShapeType::Cross, ShapeType::Heart, ShapeType::Star, ShapeType::Star6,
            ShapeType::Ring, ShapeType::Arrow, ShapeType::ArrowLeft,
            ShapeType::ArrowUp, ShapeType::ArrowDown, ShapeType::DoubleArrow,
            ShapeType::ChevronRight, ShapeType::ChevronLeft,
            ShapeType::Polygon, ShapeType::Custom,
        ];
        assert_eq!(types.len(), 28);
        for st in &types {
            let json = serde_json::to_string(st).unwrap();
            let back: ShapeType = serde_json::from_str(&json).unwrap();
            assert_eq!(*st, back);
        }
    }

    #[test]
    fn shape_with_polyline_points() {
        let mut sp = ShapeProperties::default();
        sp.shape_type = ShapeType::Line;
        sp.points = vec![
            Point::new(0.0, 0.0),
            Point::new(50.0, 30.0),
            Point::new(100.0, 0.0),
        ];
        let json = serde_json::to_string(&sp).unwrap();
        let back: ShapeProperties = serde_json::from_str(&json).unwrap();
        assert_eq!(sp, back);
        assert_eq!(back.points.len(), 3);
    }
}
