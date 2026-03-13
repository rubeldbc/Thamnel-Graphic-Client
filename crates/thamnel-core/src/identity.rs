//! Triple identity model for nodes.
//!
//! Every node has three levels of identity:
//! - `id`: Immutable UUID, never changes after creation.
//! - `binding_key`: Stable logical key for animation preset matching.
//! - `display_name`: User-facing name shown in the layer panel.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Triple identity for a node in the document.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeIdentity {
    /// Immutable internal UUID. Never changes after creation.
    pub id: Uuid,
    /// Stable logical key for animation preset matching.
    /// Optional at creation, required for render/export template mode.
    pub binding_key: Option<String>,
    /// User-facing name shown in the layer panel. Can be renamed freely.
    pub display_name: String,
}

impl NodeIdentity {
    /// Create a new identity with a generated UUID and the given display name.
    pub fn new(display_name: &str) -> Self {
        Self {
            id: Uuid::new_v4(),
            binding_key: None,
            display_name: display_name.to_string(),
        }
    }

    /// Create a new identity with a specific UUID (for deserialization/migration).
    pub fn with_id(id: Uuid, display_name: &str) -> Self {
        Self {
            id,
            binding_key: None,
            display_name: display_name.to_string(),
        }
    }
}

/// Check that a binding key is unique within a set of existing keys.
/// Returns an error string if the key is already taken.
pub fn validate_binding_key_unique(
    key: &str,
    existing_keys: &[Option<String>],
) -> Result<(), String> {
    for existing_key in existing_keys.iter().flatten() {
        if existing_key == key {
            return Err(format!("Binding key '{}' is already in use", key));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_identity_has_uuid() {
        let id = NodeIdentity::new("Test Layer");
        assert_eq!(id.display_name, "Test Layer");
        assert!(id.binding_key.is_none());
        // UUID should not be nil
        assert_ne!(id.id, Uuid::nil());
    }

    #[test]
    fn serde_roundtrip() {
        let id = NodeIdentity {
            id: Uuid::new_v4(),
            binding_key: Some("headline_text".to_string()),
            display_name: "Main Headline".to_string(),
        };
        let json = serde_json::to_string(&id).unwrap();
        let back: NodeIdentity = serde_json::from_str(&json).unwrap();
        assert_eq!(id, back);
    }

    #[test]
    fn serde_camel_case_field_names() {
        let id = NodeIdentity::new("test");
        let json = serde_json::to_string(&id).unwrap();
        assert!(json.contains("bindingKey"));
        assert!(json.contains("displayName"));
        assert!(!json.contains("binding_key"));
        assert!(!json.contains("display_name"));
    }

    #[test]
    fn binding_key_uniqueness() {
        let existing = vec![
            Some("headline".to_string()),
            None,
            Some("subtitle".to_string()),
        ];
        assert!(validate_binding_key_unique("logo", &existing).is_ok());
        assert!(validate_binding_key_unique("headline", &existing).is_err());
    }
}
