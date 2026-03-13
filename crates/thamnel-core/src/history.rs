//! Undo/redo history using the command pattern.
//!
//! Stores inverse commands instead of full document snapshots,
//! keeping memory usage proportional to the number of changes, not document size.

use crate::commands::{CommandError, DocumentCommand};
use crate::document::Document;

/// Maximum number of undo steps kept in history.
/// Matches the current TypeScript `MAX_UNDO = 50`.
const MAX_UNDO: usize = 50;

/// Command-based undo/redo history.
///
/// Each entry in the undo stack is an inverse command that, when executed,
/// reverts the corresponding change. The redo stack stores the forward commands.
pub struct History {
    undo_stack: Vec<DocumentCommand>,
    redo_stack: Vec<DocumentCommand>,
    max_undo: usize,
}

impl Default for History {
    fn default() -> Self {
        Self::new()
    }
}

impl History {
    /// Create a new empty history with the default undo limit.
    pub fn new() -> Self {
        Self {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
            max_undo: MAX_UNDO,
        }
    }

    /// Create a history with a custom undo limit.
    pub fn with_limit(max_undo: usize) -> Self {
        Self {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
            max_undo,
        }
    }

    /// Execute a command and push its inverse onto the undo stack.
    ///
    /// Clears the redo stack (new action invalidates any redo history).
    pub fn execute(
        &mut self,
        doc: &mut Document,
        command: DocumentCommand,
    ) -> Result<(), CommandError> {
        let inverse = command.execute(doc)?;
        self.undo_stack.push(inverse);

        // Trim if over limit
        if self.undo_stack.len() > self.max_undo {
            self.undo_stack.remove(0);
        }

        // New action clears redo
        self.redo_stack.clear();

        Ok(())
    }

    /// Undo the most recent change.
    ///
    /// Pops the last inverse command from the undo stack, executes it,
    /// and pushes the resulting re-do command onto the redo stack.
    pub fn undo(&mut self, doc: &mut Document) -> Result<bool, CommandError> {
        if let Some(inverse) = self.undo_stack.pop() {
            let redo_cmd = inverse.execute(doc)?;
            self.redo_stack.push(redo_cmd);
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Redo the most recently undone change.
    ///
    /// Pops the last command from the redo stack, executes it,
    /// and pushes the resulting inverse back onto the undo stack.
    pub fn redo(&mut self, doc: &mut Document) -> Result<bool, CommandError> {
        if let Some(redo_cmd) = self.redo_stack.pop() {
            let inverse = redo_cmd.execute(doc)?;
            self.undo_stack.push(inverse);
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Check if undo is available.
    pub fn can_undo(&self) -> bool {
        !self.undo_stack.is_empty()
    }

    /// Check if redo is available.
    pub fn can_redo(&self) -> bool {
        !self.redo_stack.is_empty()
    }

    /// Number of undo steps available.
    pub fn undo_count(&self) -> usize {
        self.undo_stack.len()
    }

    /// Number of redo steps available.
    pub fn redo_count(&self) -> usize {
        self.redo_stack.len()
    }

    /// Clear all history (undo and redo).
    pub fn clear(&mut self) {
        self.undo_stack.clear();
        self.redo_stack.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::PropertyValue;
    use crate::node::Node;

    #[test]
    fn execute_and_undo() {
        let mut doc = Document::default();
        let mut history = History::new();

        let node = Node::new_image("Test");
        let id = node.id();

        let cmd = DocumentCommand::AddNode {
            node: Box::new(node),
            index: 0,
        };
        history.execute(&mut doc, cmd).unwrap();
        assert_eq!(doc.node_count(), 1);
        assert!(history.can_undo());
        assert!(!history.can_redo());

        // Undo
        history.undo(&mut doc).unwrap();
        assert_eq!(doc.node_count(), 0);
        assert!(!history.can_undo());
        assert!(history.can_redo());

        // Redo
        history.redo(&mut doc).unwrap();
        assert_eq!(doc.node_count(), 1);
        assert!(doc.find_node(id).is_some());
    }

    #[test]
    fn new_action_clears_redo() {
        let mut doc = Document::default();
        let mut history = History::new();

        let n1 = Node::new_image("A");
        let n2 = Node::new_image("B");

        history
            .execute(
                &mut doc,
                DocumentCommand::AddNode {
                    node: Box::new(n1),
                    index: 0,
                },
            )
            .unwrap();

        // Undo then do something new
        history.undo(&mut doc).unwrap();
        assert!(history.can_redo());

        history
            .execute(
                &mut doc,
                DocumentCommand::AddNode {
                    node: Box::new(n2),
                    index: 0,
                },
            )
            .unwrap();
        // Redo should be cleared
        assert!(!history.can_redo());
    }

    #[test]
    fn max_undo_limit() {
        let mut doc = Document::default();
        let mut history = History::with_limit(3);

        for i in 0..5 {
            let node = Node::new_image(&format!("Node {}", i));
            history
                .execute(
                    &mut doc,
                    DocumentCommand::AddNode {
                        node: Box::new(node),
                        index: i,
                    },
                )
                .unwrap();
        }

        assert_eq!(doc.node_count(), 5);
        assert_eq!(history.undo_count(), 3); // Only last 3 kept
    }

    #[test]
    fn multiple_undo_redo_cycles() {
        let mut doc = Document::default();
        let mut history = History::new();

        let node = Node::new_image("Img");
        let id = node.id();
        doc.add_node(node);

        // Change opacity to 0.5
        history
            .execute(
                &mut doc,
                DocumentCommand::SetProperty {
                    id,
                    field: "opacity".to_string(),
                    old_value: PropertyValue::F64(1.0),
                    new_value: PropertyValue::F64(0.5),
                },
            )
            .unwrap();
        assert_eq!(doc.find_node(id).unwrap().base.opacity, 0.5);

        // Change opacity to 0.2
        history
            .execute(
                &mut doc,
                DocumentCommand::SetProperty {
                    id,
                    field: "opacity".to_string(),
                    old_value: PropertyValue::F64(0.5),
                    new_value: PropertyValue::F64(0.2),
                },
            )
            .unwrap();
        assert_eq!(doc.find_node(id).unwrap().base.opacity, 0.2);

        // Undo twice
        history.undo(&mut doc).unwrap();
        assert_eq!(doc.find_node(id).unwrap().base.opacity, 0.5);
        history.undo(&mut doc).unwrap();
        assert_eq!(doc.find_node(id).unwrap().base.opacity, 1.0);

        // Redo once
        history.redo(&mut doc).unwrap();
        assert_eq!(doc.find_node(id).unwrap().base.opacity, 0.5);
    }

    #[test]
    fn undo_empty_returns_false() {
        let mut doc = Document::default();
        let mut history = History::new();
        let result = history.undo(&mut doc).unwrap();
        assert!(!result);
    }

    #[test]
    fn redo_empty_returns_false() {
        let mut doc = Document::default();
        let mut history = History::new();
        let result = history.redo(&mut doc).unwrap();
        assert!(!result);
    }

    #[test]
    fn clear_history() {
        let mut doc = Document::default();
        let mut history = History::new();

        history
            .execute(
                &mut doc,
                DocumentCommand::AddNode {
                    node: Box::new(Node::new_image("X")),
                    index: 0,
                },
            )
            .unwrap();

        assert!(history.can_undo());
        history.clear();
        assert!(!history.can_undo());
        assert!(!history.can_redo());
    }
}
