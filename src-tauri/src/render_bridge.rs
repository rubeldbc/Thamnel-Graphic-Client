//! Tauri IPC bridge for the GPU render engine.
//!
//! Phase 2: exposes render_frame and export_to_image commands to the frontend.

use std::sync::Mutex;

use serde::Deserialize;
use tauri::State;

use thamnel_render::backend::{SelectionInfo, Viewport};
use thamnel_render::export::{self, ExportFormat};
use thamnel_render::{RenderBackend, RenderEngine};

use crate::document_bridge::AppDocumentState;

/// Managed state holding the GPU render engine.
pub struct AppRenderState {
    pub engine: Mutex<Option<RenderEngine>>,
}

impl Default for AppRenderState {
    fn default() -> Self {
        Self {
            engine: Mutex::new(None),
        }
    }
}

impl AppRenderState {
    /// Lazily initialise the render engine on first use.
    fn ensure_engine(engine_lock: &mut Option<RenderEngine>) -> Result<&mut RenderEngine, String> {
        if engine_lock.is_none() {
            let eng = RenderEngine::new_blocking()
                .map_err(|e| format!("Failed to initialise GPU render engine: {e}"))?;
            *engine_lock = Some(eng);
        }
        Ok(engine_lock.as_mut().unwrap())
    }
}

/// Viewport parameters sent from the frontend.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewportParams {
    pub width: u32,
    pub height: u32,
    pub zoom: f64,
    pub scroll_x: f64,
    pub scroll_y: f64,
}

/// Selection parameters sent from the frontend.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectionParams {
    pub selected_ids: Vec<String>,
}

/// Render the current document and return RGBA pixel data as base64.
#[tauri::command]
pub fn render_frame(
    doc_state: State<AppDocumentState>,
    render_state: State<AppRenderState>,
    viewport: ViewportParams,
    selection: SelectionParams,
) -> Result<String, String> {
    let doc = doc_state
        .document
        .lock()
        .map_err(|e| format!("Document lock poisoned: {e}"))?;

    let mut engine_lock = render_state
        .engine
        .lock()
        .map_err(|e| format!("Render engine lock poisoned: {e}"))?;

    let engine = AppRenderState::ensure_engine(&mut engine_lock)?;

    let vp = Viewport {
        width: viewport.width,
        height: viewport.height,
        zoom: viewport.zoom,
        scroll_x: viewport.scroll_x,
        scroll_y: viewport.scroll_y,
    };

    let sel = SelectionInfo {
        selected_ids: selection.selected_ids,
    };

    let pixels = engine
        .render_frame(&doc, &vp, &sel)
        .map_err(|e| format!("Render failed: {e}"))?;

    // Encode as base64 for transport over IPC
    use base64::Engine as _;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&pixels);
    Ok(b64)
}

/// Export the current document to an image file (PNG or JPEG).
#[tauri::command]
pub fn export_render(
    doc_state: State<AppDocumentState>,
    render_state: State<AppRenderState>,
    width: u32,
    height: u32,
    format: String,
) -> Result<Vec<u8>, String> {
    let doc = doc_state
        .document
        .lock()
        .map_err(|e| format!("Document lock poisoned: {e}"))?;

    let mut engine_lock = render_state
        .engine
        .lock()
        .map_err(|e| format!("Render engine lock poisoned: {e}"))?;

    let engine = AppRenderState::ensure_engine(&mut engine_lock)?;

    let fmt = match format.to_lowercase().as_str() {
        "jpeg" | "jpg" => ExportFormat::Jpeg,
        _ => ExportFormat::Png,
    };

    export::export_document(engine, &doc, width, height, fmt)
        .map_err(|e| format!("Export failed: {e}"))
}
