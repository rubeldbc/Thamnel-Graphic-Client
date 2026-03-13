//! Basic geometry hit-testing for nodes.
//!
//! Provides point-in-rotated-rectangle tests, axis-aligned bounding boxes,
//! and selectability checks. Shape-precise testing lives in `thamnel-render`.

use crate::geometry::{Rect, Size};
use crate::node::{get_effective_visibility, Node, NodeKind};
use crate::transform::Transform;

/// Test if a canvas-space point is inside a node's rotated bounding rectangle,
/// accounting for crop boundaries and anchor-based rotation.
pub fn point_in_node(px: f64, py: f64, node: &Node) -> bool {
    let base = &node.base;
    if !base.visible {
        return false;
    }

    let t = &base.transform;
    let size = &base.size;
    let ax = t.anchor.x * size.width;
    let ay = t.anchor.y * size.height;
    let rotation_rad = t.rotation.to_radians();

    // Translate point relative to the node's position
    let dx = px - t.position.x;
    let dy = py - t.position.y;

    // Inverse rotate around the anchor point
    let cos_r = rotation_rad.cos();
    let sin_r = rotation_rad.sin();
    let rx = dx - ax;
    let ry = dy - ay;
    let local_x = rx * cos_r + ry * sin_r + ax;
    let local_y = -rx * sin_r + ry * cos_r + ay;

    // Apply crop boundaries
    let left = base.crop_left;
    let top = base.crop_top;
    let right = size.width - base.crop_right;
    let bottom = size.height - base.crop_bottom;

    local_x >= left && local_x <= right && local_y >= top && local_y <= bottom
}

/// Compute the axis-aligned bounding box of a rotated node.
pub fn rotated_aabb(node: &Node) -> Rect {
    let base = &node.base;
    let t = &base.transform;
    let size = &base.size;

    if t.rotation == 0.0 {
        return Rect {
            origin: crate::geometry::Point {
                x: t.position.x,
                y: t.position.y,
            },
            size: *size,
        };
    }

    let ax = t.anchor.x * size.width;
    let ay = t.anchor.y * size.height;
    let rotation_rad = t.rotation.to_radians();
    let cos_r = rotation_rad.cos();
    let sin_r = rotation_rad.sin();

    // Four corners in local coordinates
    let corners = [
        (0.0, 0.0),
        (size.width, 0.0),
        (size.width, size.height),
        (0.0, size.height),
    ];

    let mut min_x = f64::INFINITY;
    let mut min_y = f64::INFINITY;
    let mut max_x = f64::NEG_INFINITY;
    let mut max_y = f64::NEG_INFINITY;

    for (cx, cy) in corners {
        let rx = cx - ax;
        let ry = cy - ay;
        let world_x = t.position.x + rx * cos_r - ry * sin_r + ax;
        let world_y = t.position.y + rx * sin_r + ry * cos_r + ay;
        min_x = min_x.min(world_x);
        min_y = min_y.min(world_y);
        max_x = max_x.max(world_x);
        max_y = max_y.max(world_y);
    }

    Rect {
        origin: crate::geometry::Point {
            x: min_x,
            y: min_y,
        },
        size: Size {
            width: max_x - min_x,
            height: max_y - min_y,
        },
    }
}

/// Check if a node can be selected (visible, not superLocked, not a group).
pub fn is_node_selectable(node: &Node, all_nodes: &[Node]) -> bool {
    // Groups cannot be directly selected
    if matches!(node.kind, NodeKind::Group(_)) {
        return false;
    }
    // SuperLocked nodes cannot be selected
    if node.base.super_locked {
        return false;
    }
    // Must be effectively visible (parent chain)
    get_effective_visibility(node, all_nodes)
}

/// Transform a canvas-space point into a node's local coordinate space.
///
/// This is useful for shape-precise hit testing where you need the point
/// in the shape's own coordinate system.
pub fn canvas_to_local(px: f64, py: f64, transform: &Transform, size: &Size) -> (f64, f64) {
    let ax = transform.anchor.x * size.width;
    let ay = transform.anchor.y * size.height;
    let rotation_rad = transform.rotation.to_radians();

    let dx = px - transform.position.x;
    let dy = py - transform.position.y;

    let cos_r = rotation_rad.cos();
    let sin_r = rotation_rad.sin();
    let rx = dx - ax;
    let ry = dy - ay;
    let local_x = rx * cos_r + ry * sin_r + ax;
    let local_y = -rx * sin_r + ry * cos_r + ay;

    (local_x, local_y)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::geometry::Point;

    fn make_rect_node(x: f64, y: f64, w: f64, h: f64, rotation: f64) -> Node {
        let mut node = Node::new_image("Test");
        node.base.transform.position = Point { x, y };
        node.base.size = Size {
            width: w,
            height: h,
        };
        node.base.transform.rotation = rotation;
        node
    }

    #[test]
    fn point_inside_unrotated_rect() {
        let node = make_rect_node(100.0, 100.0, 200.0, 100.0, 0.0);
        assert!(point_in_node(150.0, 150.0, &node));
        assert!(point_in_node(100.0, 100.0, &node)); // top-left corner
        assert!(point_in_node(300.0, 200.0, &node)); // bottom-right corner
    }

    #[test]
    fn point_outside_unrotated_rect() {
        let node = make_rect_node(100.0, 100.0, 200.0, 100.0, 0.0);
        assert!(!point_in_node(50.0, 50.0, &node));
        assert!(!point_in_node(350.0, 250.0, &node));
    }

    #[test]
    fn point_with_rotation() {
        // 45-degree rotation: a point that's outside the original rect
        // but inside the rotated rect should register as inside
        let node = make_rect_node(100.0, 100.0, 200.0, 100.0, 45.0);
        // Center point should always be inside regardless of rotation
        let cx = 100.0 + 100.0; // position.x + width/2
        let cy = 100.0 + 50.0; // position.y + height/2
        assert!(point_in_node(cx, cy, &node));
    }

    #[test]
    fn point_respects_crop() {
        let mut node = make_rect_node(100.0, 100.0, 200.0, 100.0, 0.0);
        node.base.crop_left = 50.0;
        node.base.crop_top = 20.0;
        // Point in cropped area should not register
        assert!(!point_in_node(120.0, 110.0, &node));
        // Point in visible area should register
        assert!(point_in_node(200.0, 150.0, &node));
    }

    #[test]
    fn invisible_node_not_hit() {
        let mut node = make_rect_node(100.0, 100.0, 200.0, 100.0, 0.0);
        node.base.visible = false;
        assert!(!point_in_node(150.0, 150.0, &node));
    }

    #[test]
    fn aabb_unrotated() {
        let node = make_rect_node(100.0, 100.0, 200.0, 100.0, 0.0);
        let aabb = rotated_aabb(&node);
        assert!((aabb.origin.x - 100.0).abs() < 1e-10);
        assert!((aabb.origin.y - 100.0).abs() < 1e-10);
        assert!((aabb.size.width - 200.0).abs() < 1e-10);
        assert!((aabb.size.height - 100.0).abs() < 1e-10);
    }

    #[test]
    fn aabb_rotated_expands() {
        let node = make_rect_node(0.0, 0.0, 100.0, 100.0, 45.0);
        let aabb = rotated_aabb(&node);
        // 45-degree rotation of a 100x100 square expands to ~141x141
        assert!(aabb.size.width > 140.0);
        assert!(aabb.size.height > 140.0);
    }

    #[test]
    fn selectability_checks() {
        let image = Node::new_image("Image");
        let group = Node::new_group("Group");
        let mut locked = Node::new_image("Locked");
        locked.base.super_locked = true;
        let mut hidden = Node::new_image("Hidden");
        hidden.base.visible = false;

        let nodes = vec![image.clone(), group.clone(), locked.clone(), hidden.clone()];

        assert!(is_node_selectable(&nodes[0], &nodes)); // image: selectable
        assert!(!is_node_selectable(&nodes[1], &nodes)); // group: not selectable
        assert!(!is_node_selectable(&nodes[2], &nodes)); // superLocked: not selectable
        assert!(!is_node_selectable(&nodes[3], &nodes)); // hidden: not selectable
    }
}
