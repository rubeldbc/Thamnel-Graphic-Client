//! Own geometry types for the Thamnel document model.
//!
//! These are schema-stable types owned by Thamnel — NOT kurbo types.
//! Kurbo conversions happen at the render layer only.

use serde::{Deserialize, Serialize};

/// A 2D point.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

impl Point {
    /// Create a new point at the given coordinates.
    pub fn new(x: f64, y: f64) -> Self {
        Self { x, y }
    }

    /// The origin point (0, 0).
    pub fn zero() -> Self {
        Self { x: 0.0, y: 0.0 }
    }
}

impl Default for Point {
    fn default() -> Self {
        Self::zero()
    }
}

/// A 2D size with width and height.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Size {
    pub width: f64,
    pub height: f64,
}

impl Size {
    /// Create a new size.
    pub fn new(width: f64, height: f64) -> Self {
        Self { width, height }
    }
}

impl Default for Size {
    fn default() -> Self {
        Self {
            width: 100.0,
            height: 100.0,
        }
    }
}

/// An axis-aligned rectangle defined by origin point and size.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Rect {
    pub origin: Point,
    pub size: Size,
}

impl Rect {
    /// Create a rectangle from position and dimensions.
    pub fn new(x: f64, y: f64, width: f64, height: f64) -> Self {
        Self {
            origin: Point::new(x, y),
            size: Size::new(width, height),
        }
    }
}

/// A single path drawing command.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum PathCommand {
    /// Move to a point without drawing.
    MoveTo(Point),
    /// Draw a straight line to a point.
    LineTo(Point),
    /// Draw a cubic bezier curve.
    CurveTo {
        ctrl1: Point,
        ctrl2: Point,
        to: Point,
    },
    /// Close the current sub-path.
    Close,
}

/// A bezier path composed of drawing commands.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BezierPath {
    pub commands: Vec<PathCommand>,
}

impl BezierPath {
    /// Create an empty path.
    pub fn new() -> Self {
        Self {
            commands: Vec::new(),
        }
    }
}

impl Default for BezierPath {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn point_serde_roundtrip() {
        let pt = Point::new(1.5, -2.3);
        let json = serde_json::to_string(&pt).unwrap();
        let back: Point = serde_json::from_str(&json).unwrap();
        assert_eq!(pt, back);
    }

    #[test]
    fn size_serde_roundtrip() {
        let sz = Size::new(1920.0, 1080.0);
        let json = serde_json::to_string(&sz).unwrap();
        let back: Size = serde_json::from_str(&json).unwrap();
        assert_eq!(sz, back);
    }

    #[test]
    fn rect_serde_roundtrip() {
        let r = Rect::new(10.0, 20.0, 300.0, 200.0);
        let json = serde_json::to_string(&r).unwrap();
        let back: Rect = serde_json::from_str(&json).unwrap();
        assert_eq!(r, back);
    }

    #[test]
    fn path_command_serde_roundtrip() {
        let path = BezierPath {
            commands: vec![
                PathCommand::MoveTo(Point::new(0.0, 0.0)),
                PathCommand::LineTo(Point::new(100.0, 0.0)),
                PathCommand::CurveTo {
                    ctrl1: Point::new(100.0, 50.0),
                    ctrl2: Point::new(50.0, 100.0),
                    to: Point::new(0.0, 100.0),
                },
                PathCommand::Close,
            ],
        };
        let json = serde_json::to_string(&path).unwrap();
        let back: BezierPath = serde_json::from_str(&json).unwrap();
        assert_eq!(path, back);
    }

    #[test]
    fn point_default_is_zero() {
        let pt = Point::default();
        assert_eq!(pt.x, 0.0);
        assert_eq!(pt.y, 0.0);
    }
}
