//! Conversions between thamnel-core geometry types and kurbo types.

use kurbo::{Affine, Point, Rect, Size, Vec2};
use thamnel_core::geometry;
use thamnel_core::transform::Transform;

/// Convert thamnel Point to kurbo Point.
pub fn to_kurbo_point(p: &geometry::Point) -> Point {
    Point::new(p.x, p.y)
}

/// Convert thamnel Size to kurbo Size.
pub fn to_kurbo_size(s: &geometry::Size) -> Size {
    Size::new(s.width, s.height)
}

/// Convert thamnel Rect to kurbo Rect.
pub fn to_kurbo_rect(r: &geometry::Rect) -> Rect {
    Rect::new(r.origin.x, r.origin.y, r.origin.x + r.size.width, r.origin.y + r.size.height)
}

/// Build a kurbo Affine transform from a thamnel Transform and size.
///
/// Applies: translate to position → translate to anchor → rotate → scale → skew → translate back.
pub fn to_kurbo_affine(transform: &Transform, size: &geometry::Size) -> Affine {
    let pos = &transform.position;
    let anchor = &transform.anchor;
    let scale = &transform.scale;
    let rotation = transform.rotation;

    // Anchor point in local coordinates
    let ax = anchor.x * size.width;
    let ay = anchor.y * size.height;

    // Build transform: translate(pos) * translate(anchor) * rotate * scale * translate(-anchor)
    let translate_pos = Affine::translate(Vec2::new(pos.x, pos.y));
    let translate_anchor = Affine::translate(Vec2::new(ax, ay));
    let translate_anchor_neg = Affine::translate(Vec2::new(-ax, -ay));
    let rotate = Affine::rotate(rotation.to_radians());
    let scale_affine = Affine::scale_non_uniform(scale.x, scale.y);

    translate_pos * translate_anchor * rotate * scale_affine * translate_anchor_neg
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn point_conversion() {
        let p = geometry::Point { x: 10.0, y: 20.0 };
        let kp = to_kurbo_point(&p);
        assert_eq!(kp.x, 10.0);
        assert_eq!(kp.y, 20.0);
    }

    #[test]
    fn size_conversion() {
        let s = geometry::Size {
            width: 100.0,
            height: 50.0,
        };
        let ks = to_kurbo_size(&s);
        assert_eq!(ks.width, 100.0);
        assert_eq!(ks.height, 50.0);
    }

    #[test]
    fn identity_affine() {
        let t = Transform::default();
        let s = geometry::Size {
            width: 100.0,
            height: 100.0,
        };
        let affine = to_kurbo_affine(&t, &s);
        // Default transform should be identity (position 0,0, scale 1,1, rotation 0)
        let p = affine * Point::new(50.0, 50.0);
        assert!((p.x - 50.0).abs() < 1e-10);
        assert!((p.y - 50.0).abs() < 1e-10);
    }
}
