//! Node types — the building blocks of a Thamnel document.
//!
//! Each node has a `NodeBase` with common properties (identity, transform, effects, etc.)
//! and a `NodeKind` discriminant for type-specific data (image, text, shape, group).

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::blend::BlendMode;
use crate::effects::{ColorAdjustments, EffectStack};
use crate::geometry::Size;
use crate::identity::NodeIdentity;
use crate::shape::ShapeProperties;
use crate::text::TextProperties;
use crate::transform::Transform;

/// Common properties shared by all node types.
///
/// Maps from the flat `LayerModel` fields that are common across all layer types.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeBase {
    pub identity: NodeIdentity,
    pub transform: Transform,
    pub size: Size,
    /// 0.0 to 1.0.
    pub opacity: f64,
    pub visible: bool,
    pub locked: bool,
    pub super_locked: bool,
    pub blend_mode: BlendMode,
    pub flip_horizontal: bool,
    pub flip_vertical: bool,
    pub padding: f64,
    pub effects: EffectStack,
    pub color_adjustments: ColorAdjustments,
    pub crop_top: f64,
    pub crop_bottom: f64,
    pub crop_left: f64,
    pub crop_right: f64,
    /// UUID of the parent group, or None if at root level.
    pub parent_group_id: Option<Uuid>,
    /// Nesting depth in the layer hierarchy.
    pub depth: u32,
    /// Whether this node acts as a canvas background.
    pub is_background: bool,
    /// Incremented each time the node's visual content changes,
    /// used to invalidate cached renders.
    pub render_version: u32,
}

impl Default for NodeBase {
    fn default() -> Self {
        Self {
            identity: NodeIdentity::new("New Layer"),
            transform: Transform::default(),
            size: Size::default(),
            opacity: 1.0,
            visible: true,
            locked: false,
            super_locked: false,
            blend_mode: BlendMode::Normal,
            flip_horizontal: false,
            flip_vertical: false,
            padding: 0.0,
            effects: EffectStack::default(),
            color_adjustments: ColorAdjustments::default(),
            crop_top: 0.0,
            crop_bottom: 0.0,
            crop_left: 0.0,
            crop_right: 0.0,
            parent_group_id: None,
            depth: 0,
            is_background: false,
            render_version: 0,
        }
    }
}

impl NodeBase {
    /// Get the node's UUID.
    pub fn id(&self) -> Uuid {
        self.identity.id
    }

    /// Get the node's display name.
    pub fn display_name(&self) -> &str {
        &self.identity.display_name
    }
}

/// Image-specific properties.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageData {
    /// Base64-encoded image data, or None if not yet loaded.
    pub image_data: Option<String>,
    /// Base64-encoded thumbnail for the layer panel.
    pub thumbnail_data: Option<String>,
    /// Blur mask pixel data (soft eraser / blur brush).
    pub blur_mask_data: Option<Vec<u8>>,
    /// Radius for the blur brush effect.
    pub blur_radius: f64,
    /// Whether this image receives video frames.
    pub is_frame_receiver: bool,
    /// Whether this is a live date/time overlay.
    pub is_live_date_time: bool,
}

impl Default for ImageData {
    fn default() -> Self {
        Self {
            image_data: None,
            thumbnail_data: None,
            blur_mask_data: None,
            blur_radius: 15.0,
            is_frame_receiver: false,
            is_live_date_time: false,
        }
    }
}

/// Group-specific properties.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupData {
    /// IDs of child nodes in this group, in z-order.
    pub child_ids: Vec<Uuid>,
    /// Optional color tag for visual distinction in the layer panel.
    pub group_color: Option<String>,
    /// Whether the group is expanded in the layer panel.
    pub is_expanded: bool,
}

/// Type-specific data for a node.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum NodeKind {
    Image(ImageData),
    Text(TextProperties),
    Shape(ShapeProperties),
    Group(GroupData),
}

/// A node in the document tree.
///
/// Combines common properties (`NodeBase`) with type-specific data (`NodeKind`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Node {
    pub base: NodeBase,
    pub kind: NodeKind,
}

impl Node {
    /// Create a new image node with default properties.
    pub fn new_image(name: &str) -> Self {
        Self {
            base: NodeBase {
                identity: NodeIdentity::new(name),
                ..Default::default()
            },
            kind: NodeKind::Image(ImageData::default()),
        }
    }

    /// Create a new text node with default properties.
    pub fn new_text(name: &str) -> Self {
        Self {
            base: NodeBase {
                identity: NodeIdentity::new(name),
                ..Default::default()
            },
            kind: NodeKind::Text(TextProperties::default()),
        }
    }

    /// Create a new shape node with default properties.
    pub fn new_shape(name: &str) -> Self {
        Self {
            base: NodeBase {
                identity: NodeIdentity::new(name),
                ..Default::default()
            },
            kind: NodeKind::Shape(ShapeProperties::default()),
        }
    }

    /// Create a new group node with default properties.
    pub fn new_group(name: &str) -> Self {
        Self {
            base: NodeBase {
                identity: NodeIdentity::new(name),
                ..Default::default()
            },
            kind: NodeKind::Group(GroupData::default()),
        }
    }

    /// Get the node's UUID.
    pub fn id(&self) -> Uuid {
        self.base.id()
    }

    /// Get the node's display name.
    pub fn display_name(&self) -> &str {
        self.base.display_name()
    }

    /// Check if this node is an image.
    pub fn is_image(&self) -> bool {
        matches!(self.kind, NodeKind::Image(_))
    }

    /// Check if this node is a text node.
    pub fn is_text(&self) -> bool {
        matches!(self.kind, NodeKind::Text(_))
    }

    /// Check if this node is a shape.
    pub fn is_shape(&self) -> bool {
        matches!(self.kind, NodeKind::Shape(_))
    }

    /// Check if this node is a group.
    pub fn is_group(&self) -> bool {
        matches!(self.kind, NodeKind::Group(_))
    }

    /// Get image data if this is an image node.
    pub fn image_data(&self) -> Option<&ImageData> {
        match &self.kind {
            NodeKind::Image(data) => Some(data),
            _ => None,
        }
    }

    /// Get text properties if this is a text node.
    pub fn text_properties(&self) -> Option<&TextProperties> {
        match &self.kind {
            NodeKind::Text(props) => Some(props),
            _ => None,
        }
    }

    /// Get shape properties if this is a shape node.
    pub fn shape_properties(&self) -> Option<&ShapeProperties> {
        match &self.kind {
            NodeKind::Shape(props) => Some(props),
            _ => None,
        }
    }

    /// Get group data if this is a group node.
    pub fn group_data(&self) -> Option<&GroupData> {
        match &self.kind {
            NodeKind::Group(data) => Some(data),
            _ => None,
        }
    }

    /// Get mutable group data if this is a group node.
    pub fn group_data_mut(&mut self) -> Option<&mut GroupData> {
        match &mut self.kind {
            NodeKind::Group(data) => Some(data),
            _ => None,
        }
    }
}

/// Walk the parent chain; returns true only if every ancestor (and the node
/// itself) has `visible == true`.
pub fn get_effective_visibility(node: &Node, all_nodes: &[Node]) -> bool {
    if !node.base.visible {
        return false;
    }
    match node.base.parent_group_id {
        None => true,
        Some(parent_id) => {
            match all_nodes.iter().find(|n| n.id() == parent_id) {
                Some(parent) => get_effective_visibility(parent, all_nodes),
                None => true,
            }
        }
    }
}

/// Returns true if the node itself OR any ancestor is locked.
pub fn get_effective_lock(node: &Node, all_nodes: &[Node]) -> bool {
    if node.base.locked {
        return true;
    }
    match node.base.parent_group_id {
        None => false,
        Some(parent_id) => {
            match all_nodes.iter().find(|n| n.id() == parent_id) {
                Some(parent) => get_effective_lock(parent, all_nodes),
                None => false,
            }
        }
    }
}

/// Multiply opacity down the parent chain to get the effective rendered opacity.
pub fn get_effective_opacity(node: &Node, all_nodes: &[Node]) -> f64 {
    match node.base.parent_group_id {
        None => node.base.opacity,
        Some(parent_id) => {
            match all_nodes.iter().find(|n| n.id() == parent_id) {
                Some(parent) => node.base.opacity * get_effective_opacity(parent, all_nodes),
                None => node.base.opacity,
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_image_node() {
        let node = Node::new_image("Photo 01");
        assert!(node.is_image());
        assert!(!node.is_text());
        assert_eq!(node.display_name(), "Photo 01");
        assert!(node.image_data().is_some());
    }

    #[test]
    fn new_text_node() {
        let node = Node::new_text("Headline");
        assert!(node.is_text());
        assert!(node.text_properties().is_some());
    }

    #[test]
    fn new_shape_node() {
        let node = Node::new_shape("Rectangle 01");
        assert!(node.is_shape());
        assert!(node.shape_properties().is_some());
    }

    #[test]
    fn new_group_node() {
        let node = Node::new_group("Group 01");
        assert!(node.is_group());
        let data = node.group_data().unwrap();
        assert!(data.child_ids.is_empty());
    }

    #[test]
    fn node_serde_roundtrip() {
        let node = Node::new_image("Test Image");
        let json = serde_json::to_string(&node).unwrap();
        let back: Node = serde_json::from_str(&json).unwrap();
        assert_eq!(node.base.identity.display_name, back.base.identity.display_name);
        assert!(back.is_image());
    }

    #[test]
    fn node_base_defaults() {
        let base = NodeBase::default();
        assert_eq!(base.opacity, 1.0);
        assert!(base.visible);
        assert!(!base.locked);
        assert!(!base.super_locked);
        assert_eq!(base.blend_mode, BlendMode::Normal);
        assert!(!base.flip_horizontal);
        assert!(!base.flip_vertical);
        assert!(base.parent_group_id.is_none());
    }

    #[test]
    fn effective_visibility_respects_parents() {
        let mut parent = Node::new_group("Parent");
        let parent_id = parent.id();

        let mut child = Node::new_image("Child");
        child.base.parent_group_id = Some(parent_id);

        // Both visible → effective visible
        let nodes = vec![parent.clone(), child.clone()];
        assert!(get_effective_visibility(&nodes[1], &nodes));

        // Parent hidden → effective hidden
        parent.base.visible = false;
        let nodes = vec![parent, child];
        assert!(!get_effective_visibility(&nodes[1], &nodes));
    }

    #[test]
    fn effective_lock_propagates() {
        let mut parent = Node::new_group("Parent");
        let parent_id = parent.id();
        parent.base.locked = true;

        let mut child = Node::new_image("Child");
        child.base.parent_group_id = Some(parent_id);

        let nodes = vec![parent, child];
        assert!(get_effective_lock(&nodes[1], &nodes));
    }

    #[test]
    fn effective_opacity_multiplies() {
        let mut parent = Node::new_group("Parent");
        let parent_id = parent.id();
        parent.base.opacity = 0.5;

        let mut child = Node::new_image("Child");
        child.base.parent_group_id = Some(parent_id);
        child.base.opacity = 0.8;

        let nodes = vec![parent, child];
        let effective = get_effective_opacity(&nodes[1], &nodes);
        assert!((effective - 0.4).abs() < 1e-10);
    }
}
