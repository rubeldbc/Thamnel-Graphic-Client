//! Command-based document mutations with undo/redo support.
//!
//! Every mutation to the document is expressed as a `DocumentCommand`.
//! Each command knows how to execute itself AND produce its inverse,
//! enabling command-based undo/redo instead of full-document snapshots.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::blend::BlendMode;
use crate::document::Document;
use crate::node::Node;

/// A single, reversible mutation to the document.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "cmd", rename_all = "camelCase")]
pub enum DocumentCommand {
    /// Add a node at a specific index in the node list.
    AddNode {
        node: Box<Node>,
        index: usize,
    },

    /// Remove a node by its UUID.
    RemoveNode {
        id: Uuid,
    },

    /// Move a node to a new z-order position.
    ReorderNode {
        id: Uuid,
        old_index: usize,
        new_index: usize,
    },

    /// Set a scalar property on a node.
    SetProperty {
        id: Uuid,
        field: String,
        old_value: PropertyValue,
        new_value: PropertyValue,
    },

    /// Replace an entire node (used for complex multi-field updates).
    ReplaceNode {
        old_node: Box<Node>,
        new_node: Box<Node>,
    },

    /// Set the parent group of a node (move into/out of a group).
    SetParentGroup {
        id: Uuid,
        old_parent: Option<Uuid>,
        new_parent: Option<Uuid>,
    },

    /// Batch multiple commands into one undoable operation.
    Batch {
        commands: Vec<DocumentCommand>,
    },
}

/// A typed property value for scalar property changes.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum PropertyValue {
    F64(f64),
    U32(u32),
    Bool(bool),
    String(String),
    OptionalString(Option<String>),
    BlendMode(BlendMode),
}

/// Result of executing a command.
pub type CommandResult = Result<DocumentCommand, CommandError>;

/// Errors that can occur when executing a command.
#[derive(Debug, Clone, thiserror::Error)]
pub enum CommandError {
    #[error("Node not found: {0}")]
    NodeNotFound(Uuid),

    #[error("Invalid index: {index} (max: {max})")]
    InvalidIndex { index: usize, max: usize },

    #[error("Unknown property field: {0}")]
    UnknownField(String),
}

impl DocumentCommand {
    /// Execute this command on the document and return the inverse command.
    ///
    /// The inverse command, when executed, will undo the effect of this command.
    pub fn execute(&self, doc: &mut Document) -> CommandResult {
        match self {
            DocumentCommand::AddNode { node, index } => {
                let clamped = (*index).min(doc.nodes.len());
                doc.nodes.insert(clamped, *node.clone());
                Ok(DocumentCommand::RemoveNode { id: node.id() })
            }

            DocumentCommand::RemoveNode { id } => {
                let index = doc
                    .node_index(*id)
                    .ok_or(CommandError::NodeNotFound(*id))?;
                let node = doc.nodes.remove(index);
                Ok(DocumentCommand::AddNode { node: Box::new(node), index })
            }

            DocumentCommand::ReorderNode {
                id,
                old_index: _,
                new_index,
            } => {
                let old_index = doc
                    .node_index(*id)
                    .ok_or(CommandError::NodeNotFound(*id))?;
                let node = doc.nodes.remove(old_index);
                let clamped = (*new_index).min(doc.nodes.len());
                doc.nodes.insert(clamped, node);
                Ok(DocumentCommand::ReorderNode {
                    id: *id,
                    old_index: clamped,
                    new_index: old_index,
                })
            }

            DocumentCommand::SetProperty {
                id,
                field,
                old_value,
                new_value,
            } => {
                let node = doc
                    .find_node_mut(*id)
                    .ok_or(CommandError::NodeNotFound(*id))?;

                apply_property(&mut node.base, field, new_value)?;

                Ok(DocumentCommand::SetProperty {
                    id: *id,
                    field: field.clone(),
                    old_value: new_value.clone(),
                    new_value: old_value.clone(),
                })
            }

            DocumentCommand::ReplaceNode { old_node, new_node } => {
                let id = old_node.id();
                let index = doc
                    .node_index(id)
                    .ok_or(CommandError::NodeNotFound(id))?;
                let current = doc.nodes[index].clone();
                doc.nodes[index] = *new_node.clone();
                Ok(DocumentCommand::ReplaceNode {
                    old_node: new_node.clone(),
                    new_node: Box::new(current),
                })
            }

            DocumentCommand::SetParentGroup {
                id,
                old_parent: _,
                new_parent,
            } => {
                let node = doc
                    .find_node_mut(*id)
                    .ok_or(CommandError::NodeNotFound(*id))?;
                let actual_old = node.base.parent_group_id;
                node.base.parent_group_id = *new_parent;
                Ok(DocumentCommand::SetParentGroup {
                    id: *id,
                    old_parent: *new_parent,
                    new_parent: actual_old,
                })
            }

            DocumentCommand::Batch { commands } => {
                let mut inverses = Vec::with_capacity(commands.len());
                for cmd in commands {
                    let inverse = cmd.execute(doc)?;
                    inverses.push(inverse);
                }
                // Reverse the order so undo applies in the correct sequence
                inverses.reverse();
                Ok(DocumentCommand::Batch {
                    commands: inverses,
                })
            }
        }
    }
}

/// Apply a named property value to a NodeBase.
fn apply_property(
    base: &mut crate::node::NodeBase,
    field: &str,
    value: &PropertyValue,
) -> Result<(), CommandError> {
    match field {
        "opacity" => {
            if let PropertyValue::F64(v) = value {
                base.opacity = *v;
            }
        }
        "visible" => {
            if let PropertyValue::Bool(v) = value {
                base.visible = *v;
            }
        }
        "locked" => {
            if let PropertyValue::Bool(v) = value {
                base.locked = *v;
            }
        }
        "superLocked" => {
            if let PropertyValue::Bool(v) = value {
                base.super_locked = *v;
            }
        }
        "blendMode" => {
            if let PropertyValue::BlendMode(v) = value {
                base.blend_mode = *v;
            }
        }
        "flipHorizontal" => {
            if let PropertyValue::Bool(v) = value {
                base.flip_horizontal = *v;
            }
        }
        "flipVertical" => {
            if let PropertyValue::Bool(v) = value {
                base.flip_vertical = *v;
            }
        }
        "displayName" => {
            if let PropertyValue::String(v) = value {
                base.identity.display_name = v.clone();
            }
        }
        "isBackground" => {
            if let PropertyValue::Bool(v) = value {
                base.is_background = *v;
            }
        }
        "depth" => {
            if let PropertyValue::U32(v) = value {
                base.depth = *v;
            }
        }
        "padding" => {
            if let PropertyValue::F64(v) = value {
                base.padding = *v;
            }
        }
        _ => return Err(CommandError::UnknownField(field.to_string())),
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_and_undo() {
        let mut doc = Document::default();
        let node = Node::new_image("Test");
        let id = node.id();

        let cmd = DocumentCommand::AddNode {
            node: Box::new(node),
            index: 0,
        };
        let inverse = cmd.execute(&mut doc).unwrap();
        assert_eq!(doc.node_count(), 1);
        assert!(doc.find_node(id).is_some());

        // Undo
        inverse.execute(&mut doc).unwrap();
        assert_eq!(doc.node_count(), 0);
    }

    #[test]
    fn remove_and_undo() {
        let mut doc = Document::default();
        let node = Node::new_shape("Shape");
        let id = node.id();
        doc.add_node(node);

        let cmd = DocumentCommand::RemoveNode { id };
        let inverse = cmd.execute(&mut doc).unwrap();
        assert_eq!(doc.node_count(), 0);

        // Undo
        inverse.execute(&mut doc).unwrap();
        assert_eq!(doc.node_count(), 1);
        assert_eq!(doc.find_node(id).unwrap().display_name(), "Shape");
    }

    #[test]
    fn set_property_and_undo() {
        let mut doc = Document::default();
        let node = Node::new_image("Img");
        let id = node.id();
        doc.add_node(node);

        let cmd = DocumentCommand::SetProperty {
            id,
            field: "opacity".to_string(),
            old_value: PropertyValue::F64(1.0),
            new_value: PropertyValue::F64(0.5),
        };
        let inverse = cmd.execute(&mut doc).unwrap();
        assert_eq!(doc.find_node(id).unwrap().base.opacity, 0.5);

        // Undo
        inverse.execute(&mut doc).unwrap();
        assert_eq!(doc.find_node(id).unwrap().base.opacity, 1.0);
    }

    #[test]
    fn reorder_and_undo() {
        let mut doc = Document::default();
        let a = Node::new_image("A");
        let b = Node::new_image("B");
        let c = Node::new_image("C");
        let id_c = c.id();
        doc.add_node(a);
        doc.add_node(b);
        doc.add_node(c);

        // Move C from index 2 to index 0
        let cmd = DocumentCommand::ReorderNode {
            id: id_c,
            old_index: 2,
            new_index: 0,
        };
        let inverse = cmd.execute(&mut doc).unwrap();
        assert_eq!(doc.nodes[0].display_name(), "C");

        // Undo
        inverse.execute(&mut doc).unwrap();
        assert_eq!(doc.nodes[2].display_name(), "C");
    }

    #[test]
    fn batch_command() {
        let mut doc = Document::default();
        let n1 = Node::new_image("Img1");
        let n2 = Node::new_shape("Shape1");

        let cmd = DocumentCommand::Batch {
            commands: vec![
                DocumentCommand::AddNode {
                    node: Box::new(n1),
                    index: 0,
                },
                DocumentCommand::AddNode {
                    node: Box::new(n2),
                    index: 1,
                },
            ],
        };
        let inverse = cmd.execute(&mut doc).unwrap();
        assert_eq!(doc.node_count(), 2);

        // Undo batch
        inverse.execute(&mut doc).unwrap();
        assert_eq!(doc.node_count(), 0);
    }

    #[test]
    fn remove_nonexistent_node_errors() {
        let mut doc = Document::default();
        let cmd = DocumentCommand::RemoveNode {
            id: Uuid::new_v4(),
        };
        assert!(cmd.execute(&mut doc).is_err());
    }

    #[test]
    fn set_unknown_field_errors() {
        let mut doc = Document::default();
        let node = Node::new_image("X");
        let id = node.id();
        doc.add_node(node);

        let cmd = DocumentCommand::SetProperty {
            id,
            field: "nonexistent_field".to_string(),
            old_value: PropertyValue::F64(0.0),
            new_value: PropertyValue::F64(1.0),
        };
        assert!(cmd.execute(&mut doc).is_err());
    }

    #[test]
    fn replace_node_and_undo() {
        let mut doc = Document::default();
        let original = Node::new_image("Original");
        let id = original.id();
        doc.add_node(original.clone());

        let mut replacement = original.clone();
        replacement.base.opacity = 0.3;
        replacement.base.visible = false;

        let cmd = DocumentCommand::ReplaceNode {
            old_node: Box::new(original),
            new_node: Box::new(replacement),
        };
        let inverse = cmd.execute(&mut doc).unwrap();
        assert_eq!(doc.find_node(id).unwrap().base.opacity, 0.3);
        assert!(!doc.find_node(id).unwrap().base.visible);

        // Undo
        inverse.execute(&mut doc).unwrap();
        assert_eq!(doc.find_node(id).unwrap().base.opacity, 1.0);
        assert!(doc.find_node(id).unwrap().base.visible);
    }
}
