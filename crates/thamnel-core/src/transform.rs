//! Animation-ready transform model.
//!
//! Uses anchor/position/scale/rotation/skew instead of flat x/y/width/height
//! to support future keyframe animation without migration.

use serde::{Deserialize, Serialize};

use crate::geometry::Point;

/// Animation-ready transform for a node.
///
/// Today these are static values. Tomorrow they become keyframeable channels.
/// Using this model from day one prevents migration hell when animation is added.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Transform {
    /// Anchor point, normalized 0..1 within the node's own bounds.
    pub anchor: Point,
    /// World-space position of the node.
    pub position: Point,
    /// Scale factors (1.0 = 100%).
    pub scale: Point,
    /// Rotation in degrees.
    pub rotation: f64,
    /// Skew in degrees (x, y).
    pub skew: Point,
}

impl Default for Transform {
    fn default() -> Self {
        Self {
            anchor: Point::new(0.5, 0.5),
            position: Point::zero(),
            scale: Point::new(1.0, 1.0),
            rotation: 0.0,
            skew: Point::zero(),
        }
    }
}

impl Transform {
    /// Create a transform positioned at (x, y) with default anchor, scale, rotation, skew.
    pub fn at(x: f64, y: f64) -> Self {
        Self {
            position: Point::new(x, y),
            ..Default::default()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_transform() {
        let t = Transform::default();
        assert_eq!(t.anchor, Point::new(0.5, 0.5));
        assert_eq!(t.position, Point::zero());
        assert_eq!(t.scale, Point::new(1.0, 1.0));
        assert_eq!(t.rotation, 0.0);
        assert_eq!(t.skew, Point::zero());
    }

    #[test]
    fn serde_roundtrip() {
        let t = Transform {
            anchor: Point::new(0.3, 0.7),
            position: Point::new(100.0, 200.0),
            scale: Point::new(1.5, 0.8),
            rotation: 45.0,
            skew: Point::new(5.0, -3.0),
        };
        let json = serde_json::to_string(&t).unwrap();
        let back: Transform = serde_json::from_str(&json).unwrap();
        assert_eq!(t, back);
    }

    #[test]
    fn transform_at_helper() {
        let t = Transform::at(50.0, 75.0);
        assert_eq!(t.position, Point::new(50.0, 75.0));
        assert_eq!(t.rotation, 0.0);
    }
}
