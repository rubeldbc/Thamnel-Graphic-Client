//! Document model — the root container for a Thamnel project.
//!
//! Maps from the current TypeScript `ProjectModel` / `ProjectMetadata` interfaces.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::geometry::Size;
use crate::node::Node;

/// Metadata about a document (author, timestamps, etc.).
///
/// Maps from the current TypeScript `ProjectMetadata` interface.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentMetadata {
    pub name: String,
    pub author: String,
    pub created_at: String,
    pub modified_at: String,
    pub description: String,
}

impl Default for DocumentMetadata {
    fn default() -> Self {
        Self {
            name: "Untitled Project".to_string(),
            author: String::new(),
            created_at: String::new(),
            modified_at: String::new(),
            description: String::new(),
        }
    }
}

/// The root document containing all nodes and project settings.
///
/// Maps from the current TypeScript `ProjectModel` interface.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    /// Unique project identifier.
    pub id: Uuid,
    /// Format version string for migration compatibility.
    pub version: String,
    /// Canvas dimensions.
    pub canvas_size: Size,
    /// Canvas background color (CSS color string).
    pub background_color: String,
    /// All nodes in the document, in z-order (bottom to top).
    pub nodes: Vec<Node>,
    /// Paths to video files associated with this project.
    pub video_paths: Vec<String>,
    /// Arbitrary string timestamps (e.g. frame timecodes).
    pub timestamps: Vec<(String, String)>,
    /// Project metadata.
    pub metadata: DocumentMetadata,
}

impl Default for Document {
    fn default() -> Self {
        Self {
            id: Uuid::new_v4(),
            version: "1.0.0".to_string(),
            canvas_size: Size::new(1920.0, 1080.0),
            background_color: "#000000".to_string(),
            nodes: Vec::new(),
            video_paths: Vec::new(),
            timestamps: Vec::new(),
            metadata: DocumentMetadata::default(),
        }
    }
}

impl Document {
    /// Create a new empty document with the given canvas dimensions.
    pub fn new(width: f64, height: f64) -> Self {
        Self {
            canvas_size: Size::new(width, height),
            ..Default::default()
        }
    }

    /// Find a node by its UUID.
    pub fn find_node(&self, id: Uuid) -> Option<&Node> {
        self.nodes.iter().find(|n| n.id() == id)
    }

    /// Find a node by its UUID (mutable).
    pub fn find_node_mut(&mut self, id: Uuid) -> Option<&mut Node> {
        self.nodes.iter_mut().find(|n| n.id() == id)
    }

    /// Add a node to the end of the node list (top of z-order).
    pub fn add_node(&mut self, node: Node) {
        self.nodes.push(node);
    }

    /// Remove a node by its UUID. Returns the removed node if found.
    pub fn remove_node(&mut self, id: Uuid) -> Option<Node> {
        let pos = self.nodes.iter().position(|n| n.id() == id)?;
        Some(self.nodes.remove(pos))
    }

    /// Get the index of a node in the node list.
    pub fn node_index(&self, id: Uuid) -> Option<usize> {
        self.nodes.iter().position(|n| n.id() == id)
    }

    /// Move a node to a new position in the z-order.
    pub fn reorder_node(&mut self, id: Uuid, new_index: usize) -> bool {
        if let Some(old_index) = self.node_index(id) {
            let node = self.nodes.remove(old_index);
            let clamped = new_index.min(self.nodes.len());
            self.nodes.insert(clamped, node);
            true
        } else {
            false
        }
    }

    /// Get all root-level nodes (nodes with no parent group).
    pub fn root_nodes(&self) -> Vec<&Node> {
        self.nodes
            .iter()
            .filter(|n| n.base.parent_group_id.is_none())
            .collect()
    }

    /// Get all children of a group node.
    pub fn children_of(&self, group_id: Uuid) -> Vec<&Node> {
        self.nodes
            .iter()
            .filter(|n| n.base.parent_group_id == Some(group_id))
            .collect()
    }

    /// Total number of nodes in the document.
    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_document() {
        let doc = Document::default();
        assert_eq!(doc.canvas_size.width, 1920.0);
        assert_eq!(doc.canvas_size.height, 1080.0);
        assert_eq!(doc.background_color, "#000000");
        assert!(doc.nodes.is_empty());
        assert_eq!(doc.version, "1.0.0");
    }

    #[test]
    fn new_with_dimensions() {
        let doc = Document::new(800.0, 600.0);
        assert_eq!(doc.canvas_size.width, 800.0);
        assert_eq!(doc.canvas_size.height, 600.0);
    }

    #[test]
    fn add_and_find_node() {
        let mut doc = Document::default();
        let node = Node::new_image("Test Image");
        let id = node.id();
        doc.add_node(node);

        assert_eq!(doc.node_count(), 1);
        let found = doc.find_node(id).unwrap();
        assert_eq!(found.display_name(), "Test Image");
    }

    #[test]
    fn remove_node() {
        let mut doc = Document::default();
        let node = Node::new_shape("Shape 01");
        let id = node.id();
        doc.add_node(node);
        assert_eq!(doc.node_count(), 1);

        let removed = doc.remove_node(id).unwrap();
        assert_eq!(removed.display_name(), "Shape 01");
        assert_eq!(doc.node_count(), 0);
    }

    #[test]
    fn reorder_nodes() {
        let mut doc = Document::default();
        let n1 = Node::new_image("Image A");
        let n2 = Node::new_shape("Shape B");
        let n3 = Node::new_text("Text C");
        let id1 = n1.id();
        let id3 = n3.id();
        doc.add_node(n1);
        doc.add_node(n2);
        doc.add_node(n3);

        // Move "Text C" (index 2) to index 0
        assert!(doc.reorder_node(id3, 0));
        assert_eq!(doc.nodes[0].display_name(), "Text C");
        assert_eq!(doc.nodes[1].display_name(), "Image A");
        assert_eq!(doc.node_index(id1), Some(1));
    }

    #[test]
    fn root_nodes_and_children() {
        let mut doc = Document::default();
        let group = Node::new_group("Group 01");
        let group_id = group.id();
        doc.add_node(group);

        let mut child = Node::new_image("Child Image");
        child.base.parent_group_id = Some(group_id);
        doc.add_node(child);

        let mut root = Node::new_shape("Root Shape");
        root.base.parent_group_id = None;
        doc.add_node(root);

        assert_eq!(doc.root_nodes().len(), 2); // group + root shape
        assert_eq!(doc.children_of(group_id).len(), 1);
    }

    #[test]
    fn document_serde_roundtrip() {
        let mut doc = Document::new(1280.0, 720.0);
        doc.metadata.name = "Test Project".to_string();
        doc.add_node(Node::new_image("BG"));
        doc.add_node(Node::new_text("Title"));

        let json = serde_json::to_string(&doc).unwrap();
        let back: Document = serde_json::from_str(&json).unwrap();

        assert_eq!(doc.canvas_size, back.canvas_size);
        assert_eq!(doc.metadata.name, back.metadata.name);
        assert_eq!(doc.node_count(), back.node_count());
    }

    #[test]
    fn metadata_defaults() {
        let meta = DocumentMetadata::default();
        assert_eq!(meta.name, "Untitled Project");
        assert!(meta.author.is_empty());
    }
}
