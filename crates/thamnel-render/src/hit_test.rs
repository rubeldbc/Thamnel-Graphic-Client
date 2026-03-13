//! Shape-precise hit-testing using kurbo paths.
//!
//! Combines `thamnel-core::hit_test` basic geometry tests with kurbo path
//! winding number checks for shape-precise clicking.

use kurbo::{ParamCurveNearest, Point, Shape};
use uuid::Uuid;

use thamnel_core::hit_test::{canvas_to_local, is_node_selectable, point_in_node, rotated_aabb};
use thamnel_core::node::{Node, NodeKind};
use thamnel_core::shape::ShapeType;
use thamnel_core::Document;

use crate::shape_render::build_shape_path;

/// Shape-precise hit test: checks if a canvas-space point is inside a node,
/// using the actual shape path for shape nodes (not just the bounding box).
pub fn point_in_node_precise(px: f64, py: f64, node: &Node) -> bool {
    // First do a fast bounding-box check
    if !point_in_node(px, py, node) {
        return false;
    }

    // For shape nodes, do precise path testing
    if let NodeKind::Shape(shape_props) = &node.kind {
        let (local_x, local_y) = canvas_to_local(
            px,
            py,
            &node.base.transform,
            &node.base.size,
        );

        let w = node.base.size.width;
        let h = node.base.size.height;

        let is_line = matches!(
            shape_props.shape_type,
            ShapeType::Line | ShapeType::DiagonalLine
        );

        let path = build_shape_path(
            shape_props.shape_type,
            w,
            h,
            shape_props.polygon_sides,
            shape_props.star_inner_ratio,
            &shape_props.points,
        );

        if is_line {
            // For lines, check proximity to stroke (6px hit zone)
            let segments = path.segments();
            let test_point = Point::new(local_x, local_y);
            let hit_distance = 6.0;
            for segment in segments {
                let nearest = segment.nearest(test_point, 0.1);
                if nearest.distance_sq < hit_distance * hit_distance {
                    return true;
                }
            }
            return false;
        }

        // For filled shapes, use winding number (non-zero = inside)
        let winding = path.winding(Point::new(local_x, local_y));
        return winding != 0;
    }

    // For image and text nodes, the bounding-box test is sufficient
    true
}

/// Find the topmost selectable node at a canvas-space point.
///
/// Returns the node's UUID, or None if nothing was hit.
/// Iterates from top (last in array) to bottom for proper z-order.
pub fn hit_test_point(doc: &Document, px: f64, py: f64) -> Option<Uuid> {
    for node in doc.nodes.iter().rev() {
        if !is_node_selectable(node, &doc.nodes) {
            continue;
        }
        if point_in_node_precise(px, py, node) {
            return Some(node.id());
        }
    }
    None
}

/// Find ALL selectable nodes at a canvas-space point, ordered top-to-bottom.
pub fn hit_test_all(doc: &Document, px: f64, py: f64) -> Vec<Uuid> {
    let mut results = Vec::new();
    for node in doc.nodes.iter().rev() {
        if !is_node_selectable(node, &doc.nodes) {
            continue;
        }
        if point_in_node_precise(px, py, node) {
            results.push(node.id());
        }
    }
    results
}

/// Find all selectable nodes whose AABB intersects a marquee rectangle.
///
/// The marquee rectangle is in canvas coordinates.
pub fn select_by_marquee(
    doc: &Document,
    mx: f64,
    my: f64,
    mw: f64,
    mh: f64,
) -> Vec<Uuid> {
    let marquee_right = mx + mw;
    let marquee_bottom = my + mh;

    let mut results = Vec::new();
    for node in &doc.nodes {
        if !is_node_selectable(node, &doc.nodes) {
            continue;
        }

        let aabb = rotated_aabb(node);
        let node_right = aabb.origin.x + aabb.size.width;
        let node_bottom = aabb.origin.y + aabb.size.height;

        // Check AABB overlap
        if aabb.origin.x < marquee_right
            && node_right > mx
            && aabb.origin.y < marquee_bottom
            && node_bottom > my
        {
            results.push(node.id());
        }
    }
    results
}

#[cfg(test)]
mod tests {
    use super::*;
    use thamnel_core::geometry::{Point as TPoint, Size};
    use thamnel_core::shape::ShapeType;

    fn make_shape_node(
        x: f64,
        y: f64,
        w: f64,
        h: f64,
        shape_type: ShapeType,
    ) -> Node {
        let mut node = Node::new_shape("Test Shape");
        node.base.transform.position = TPoint { x, y };
        node.base.size = Size {
            width: w,
            height: h,
        };
        if let NodeKind::Shape(ref mut props) = node.kind {
            props.shape_type = shape_type;
        }
        node
    }

    #[test]
    fn ellipse_precise_hit_inside() {
        let node = make_shape_node(0.0, 0.0, 100.0, 100.0, ShapeType::Ellipse);
        // Center of the ellipse — definitely inside
        assert!(point_in_node_precise(50.0, 50.0, &node));
    }

    #[test]
    fn ellipse_precise_hit_corner_outside() {
        let node = make_shape_node(0.0, 0.0, 100.0, 100.0, ShapeType::Ellipse);
        // Corner of bounding box — outside the ellipse
        assert!(!point_in_node_precise(5.0, 5.0, &node));
    }

    #[test]
    fn rectangle_hit_at_center() {
        let node = make_shape_node(0.0, 0.0, 100.0, 100.0, ShapeType::Rectangle);
        assert!(point_in_node_precise(50.0, 50.0, &node));
    }

    #[test]
    fn star_precise_hit_in_spike() {
        let node = make_shape_node(0.0, 0.0, 100.0, 100.0, ShapeType::Star);
        // Center of star — definitely inside
        assert!(point_in_node_precise(50.0, 50.0, &node));
    }

    #[test]
    fn hit_test_point_topmost() {
        let mut doc = Document::new(1920.0, 1080.0);
        // Bottom node at (100, 100, 200x200)
        let bottom = make_shape_node(100.0, 100.0, 200.0, 200.0, ShapeType::Rectangle);
        let bottom_id = bottom.id();
        // Top node at (150, 150, 200x200) — overlaps
        let top = make_shape_node(150.0, 150.0, 200.0, 200.0, ShapeType::Rectangle);
        let top_id = top.id();

        doc.nodes.push(bottom);
        doc.nodes.push(top);

        // Hit at (200, 200) — both overlap, top should win
        let result = hit_test_point(&doc, 200.0, 200.0);
        assert_eq!(result, Some(top_id));

        // Hit at (110, 110) — only bottom
        let result = hit_test_point(&doc, 110.0, 110.0);
        assert_eq!(result, Some(bottom_id));
    }

    #[test]
    fn hit_test_all_returns_multiple() {
        let mut doc = Document::new(1920.0, 1080.0);
        let n1 = make_shape_node(100.0, 100.0, 200.0, 200.0, ShapeType::Rectangle);
        let n2 = make_shape_node(150.0, 150.0, 200.0, 200.0, ShapeType::Rectangle);
        let id1 = n1.id();
        let id2 = n2.id();
        doc.nodes.push(n1);
        doc.nodes.push(n2);

        let results = hit_test_all(&doc, 200.0, 200.0);
        assert_eq!(results.len(), 2);
        assert_eq!(results[0], id2); // top first
        assert_eq!(results[1], id1); // bottom second
    }

    #[test]
    fn marquee_selection() {
        let mut doc = Document::new(1920.0, 1080.0);
        let inside = make_shape_node(100.0, 100.0, 50.0, 50.0, ShapeType::Rectangle);
        let outside = make_shape_node(500.0, 500.0, 50.0, 50.0, ShapeType::Rectangle);
        let inside_id = inside.id();
        doc.nodes.push(inside);
        doc.nodes.push(outside);

        let results = select_by_marquee(&doc, 50.0, 50.0, 200.0, 200.0);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0], inside_id);
    }

    #[test]
    fn group_nodes_not_selectable() {
        let mut doc = Document::new(1920.0, 1080.0);
        let mut group = Node::new_group("Group");
        group.base.transform.position = TPoint { x: 0.0, y: 0.0 };
        group.base.size = Size {
            width: 200.0,
            height: 200.0,
        };
        doc.nodes.push(group);

        let result = hit_test_point(&doc, 100.0, 100.0);
        assert!(result.is_none());
    }
}
