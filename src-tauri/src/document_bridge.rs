//! Tauri IPC bridge — exposes Rust document operations to the React frontend.
//!
//! Phase 0: minimal bridge that proves the Rust model works end-to-end via IPC.
//! Phase 1 will extend this to handle all document mutations.

use std::sync::Mutex;

use tauri::State;
use thamnel_core::{Document, DocumentCommand, History};

/// Shared application state managed by Tauri.
pub struct AppDocumentState {
    pub document: Mutex<Document>,
    pub history: Mutex<History>,
}

impl Default for AppDocumentState {
    fn default() -> Self {
        Self {
            document: Mutex::new(Document::default()),
            history: Mutex::new(History::new()),
        }
    }
}

/// Get the current document state as JSON.
#[tauri::command]
pub fn get_document(state: State<AppDocumentState>) -> Result<Document, String> {
    let doc = state
        .document
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;
    Ok(doc.clone())
}

/// Replace the entire document (used when loading from .rbl file).
#[tauri::command]
pub fn set_document(state: State<AppDocumentState>, document: Document) -> Result<(), String> {
    eprintln!("[document_bridge] set_document called with {} nodes", document.nodes.len());
    let mut doc = state
        .document
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;
    let mut hist = state
        .history
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;
    *doc = document;
    hist.clear();
    Ok(())
}

/// Apply a command to the document and return the updated document.
#[tauri::command]
pub fn apply_command(
    state: State<AppDocumentState>,
    cmd: DocumentCommand,
) -> Result<Document, String> {
    let mut doc = state
        .document
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;
    let mut hist = state
        .history
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;
    hist.execute(&mut doc, cmd)
        .map_err(|e| format!("Command failed: {}", e))?;
    Ok(doc.clone())
}

/// Undo the most recent document change.
#[tauri::command]
pub fn undo_document(state: State<AppDocumentState>) -> Result<Document, String> {
    let mut doc = state
        .document
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;
    let mut hist = state
        .history
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;
    hist.undo(&mut doc)
        .map_err(|e| format!("Undo failed: {}", e))?;
    Ok(doc.clone())
}

/// Redo the most recently undone change.
#[tauri::command]
pub fn redo_document(state: State<AppDocumentState>) -> Result<Document, String> {
    let mut doc = state
        .document
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;
    let mut hist = state
        .history
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;
    hist.redo(&mut doc)
        .map_err(|e| format!("Redo failed: {}", e))?;
    Ok(doc.clone())
}

/// Check if undo/redo are available.
#[tauri::command]
pub fn get_history_state(state: State<AppDocumentState>) -> Result<HistoryInfo, String> {
    let hist = state
        .history
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;
    Ok(HistoryInfo {
        can_undo: hist.can_undo(),
        can_redo: hist.can_redo(),
        undo_count: hist.undo_count(),
        redo_count: hist.redo_count(),
    })
}

/// Minimal info about undo/redo state.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryInfo {
    pub can_undo: bool,
    pub can_redo: bool,
    pub undo_count: usize,
    pub redo_count: usize,
}

/// Load a legacy .rbl file (old ProjectModel JSON) and convert it to the new Document format.
///
/// This reads the old flat JSON structure and converts it to the new
/// Node-based document model. The conversion is lossy-safe: all existing
/// fields are mapped, unknown fields are ignored.
#[tauri::command]
pub fn load_legacy_rbl(path: String) -> Result<Document, String> {
    let json_str =
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    let legacy: serde_json::Value =
        serde_json::from_str(&json_str).map_err(|e| format!("Invalid JSON: {}", e))?;
    convert_legacy_project(&legacy)
}

/// Convert a legacy ProjectModel JSON value to a Document.
fn convert_legacy_project(project: &serde_json::Value) -> Result<Document, String> {
    use thamnel_core::*;

    let canvas_width = project["canvasWidth"].as_f64().unwrap_or(1920.0);
    let canvas_height = project["canvasHeight"].as_f64().unwrap_or(1080.0);
    let background_color = project["backgroundColor"]
        .as_str()
        .unwrap_or("#000000")
        .to_string();

    let mut doc = Document::new(canvas_width, canvas_height);
    doc.background_color = background_color;
    doc.version = project["version"]
        .as_str()
        .unwrap_or("1.0.0")
        .to_string();

    // Metadata
    if let Some(meta) = project.get("metadata") {
        doc.metadata.name = meta["name"]
            .as_str()
            .unwrap_or("Untitled Project")
            .to_string();
        doc.metadata.author = meta["author"].as_str().unwrap_or("").to_string();
        doc.metadata.created_at = meta["createdAt"].as_str().unwrap_or("").to_string();
        doc.metadata.modified_at = meta["modifiedAt"].as_str().unwrap_or("").to_string();
        doc.metadata.description = meta["description"].as_str().unwrap_or("").to_string();
    }

    // Video paths
    if let Some(vp) = project.get("videoPaths").and_then(|v| v.as_array()) {
        doc.video_paths = vp
            .iter()
            .filter_map(|v| v.as_str().map(String::from))
            .collect();
    }

    // Convert layers to nodes
    if let Some(layers) = project.get("layers").and_then(|v| v.as_array()) {
        for layer in layers {
            match convert_legacy_layer(layer) {
                Ok(node) => doc.nodes.push(node),
                Err(e) => {
                    eprintln!("Warning: skipping layer during migration: {}", e);
                }
            }
        }
    }

    Ok(doc)
}

/// Convert a single legacy LayerModel JSON value to a Node.
fn convert_legacy_layer(layer: &serde_json::Value) -> Result<thamnel_core::Node, String> {
    use thamnel_core::*;
    use uuid::Uuid;

    // Parse identity
    let id_str = layer["id"].as_str().unwrap_or("");
    let id = Uuid::try_parse(id_str).unwrap_or_else(|_| Uuid::new_v4());
    let display_name = layer["name"].as_str().unwrap_or("Layer").to_string();

    let identity = NodeIdentity {
        id,
        binding_key: layer
            .get("bindingKey")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .map(String::from),
        display_name,
    };

    // Parse transform from flat fields
    let x = layer["x"].as_f64().unwrap_or(0.0);
    let y = layer["y"].as_f64().unwrap_or(0.0);
    let width = layer["width"].as_f64().unwrap_or(100.0);
    let height = layer["height"].as_f64().unwrap_or(100.0);
    let rotation = layer["rotation"].as_f64().unwrap_or(0.0);
    let anchor_x = layer["anchorX"].as_f64().unwrap_or(0.5);
    let anchor_y = layer["anchorY"].as_f64().unwrap_or(0.5);

    let transform = Transform {
        anchor: Point::new(anchor_x, anchor_y),
        position: Point::new(x, y),
        scale: Point::new(1.0, 1.0),
        rotation,
        skew: Point::zero(),
    };

    let size = geometry::Size::new(width, height);

    // Parse common base fields
    let opacity = layer["opacity"].as_f64().unwrap_or(1.0);
    let visible = layer["visible"].as_bool().unwrap_or(true);
    let locked = layer["locked"].as_bool().unwrap_or(false);
    let super_locked = layer["superLocked"].as_bool().unwrap_or(false);
    let flip_horizontal = layer["flipHorizontal"].as_bool().unwrap_or(false);
    let flip_vertical = layer["flipVertical"].as_bool().unwrap_or(false);
    let padding = layer["padding"].as_f64().unwrap_or(0.0);
    let is_background = layer["isBackground"].as_bool().unwrap_or(false);
    let depth = layer["depth"].as_u64().unwrap_or(0) as u32;
    let render_version = layer["renderVersion"].as_u64().unwrap_or(0) as u32;

    // Parse blend mode
    let blend_mode_str = layer["blendMode"].as_str().unwrap_or("normal");
    let blend_mode: BlendMode =
        serde_json::from_value(serde_json::Value::String(blend_mode_str.to_string()))
            .unwrap_or_default();

    // Parse parent group
    let parent_group_id = layer
        .get("parentGroupId")
        .and_then(|v| v.as_str())
        .and_then(|s| Uuid::try_parse(s).ok());

    // Parse effects and color adjustments — use serde for the complex objects
    let effects: EffectStack = layer
        .get("effects")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    let color_adjustments: ColorAdjustments = layer
        .get("colorAdjustments")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    let base = node::NodeBase {
        identity,
        transform,
        size,
        opacity,
        visible,
        locked,
        super_locked,
        blend_mode,
        flip_horizontal,
        flip_vertical,
        padding,
        effects,
        color_adjustments,
        crop_top: layer["cropTop"].as_f64().unwrap_or(0.0),
        crop_bottom: layer["cropBottom"].as_f64().unwrap_or(0.0),
        crop_left: layer["cropLeft"].as_f64().unwrap_or(0.0),
        crop_right: layer["cropRight"].as_f64().unwrap_or(0.0),
        parent_group_id,
        depth,
        is_background,
        render_version,
    };

    // Determine node type and create appropriate kind
    let layer_type = layer["type"].as_str().unwrap_or("image");

    let kind = match layer_type {
        "text" => {
            let text_props: TextProperties = layer
                .get("textProperties")
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or_default();
            node::NodeKind::Text(text_props)
        }
        "shape" => {
            let shape_props: ShapeProperties = layer
                .get("shapeProperties")
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or_default();
            node::NodeKind::Shape(shape_props)
        }
        "group" => {
            let child_ids: Vec<Uuid> = layer
                .get("childIds")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().and_then(|s| Uuid::try_parse(s).ok()))
                        .collect()
                })
                .unwrap_or_default();

            let group_color = layer
                .get("groupColor")
                .and_then(|v| v.as_str())
                .map(String::from);

            let is_expanded = layer["isExpanded"].as_bool().unwrap_or(false);

            node::NodeKind::Group(node::GroupData {
                child_ids,
                group_color,
                is_expanded,
            })
        }
        _ => {
            // Default to image
            let image_data = layer
                .get("imageData")
                .and_then(|v| v.as_str())
                .map(String::from);
            let thumbnail_data = layer
                .get("thumbnailData")
                .and_then(|v| v.as_str())
                .map(String::from);
            let blur_radius = layer["blurRadius"].as_f64().unwrap_or(15.0);
            let is_frame_receiver = layer["isFrameReceiver"].as_bool().unwrap_or(false);
            let is_live_date_time = layer["isLiveDateTime"].as_bool().unwrap_or(false);

            node::NodeKind::Image(node::ImageData {
                image_data,
                thumbnail_data,
                blur_mask_data: None, // Uint8Array cannot be preserved in plain JSON
                blur_radius,
                is_frame_receiver,
                is_live_date_time,
            })
        }
    };

    Ok(Node { base, kind })
}
