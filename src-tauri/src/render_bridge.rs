//! Tauri IPC bridge for the GPU render engine and hit-testing.
//!
//! Binary IPC — raw RGBA bytes with 32-byte header (no base64).
//! Phase 2: render_frame_bin (binary) and export_render commands.
//! Phase 3: hit_test, hit_test_all, marquee_select commands.

use std::sync::Mutex;
use std::time::Instant;

use serde::{Deserialize, Serialize};
use tauri::ipc::Response;
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

/// Render frame response with timing metadata + base64 RGBA pixels.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderFrameResponse {
    pub width: u32,
    pub height: u32,
    pub render_time_us: u32,
    pub node_count: u32,
    pub prepare_us: u32,
    pub readback_us: u32,
    pub encode_us: u32,
    pub pixels: String,
}

/// Render the current document. Returns JSON with timing metadata + base64 RGBA pixels.
#[tauri::command]
pub fn render_frame(
    doc_state: State<AppDocumentState>,
    render_state: State<AppRenderState>,
    viewport: ViewportParams,
    selection: SelectionParams,
) -> Result<RenderFrameResponse, String> {
    let t0 = Instant::now();

    let doc = doc_state
        .document
        .lock()
        .map_err(|e| format!("Document lock poisoned: {e}"))?;

    let mut engine_lock = render_state
        .engine
        .lock()
        .map_err(|e| format!("Render engine lock poisoned: {e}"))?;

    let engine = AppRenderState::ensure_engine(&mut engine_lock)?;

    // Clamp to at least 1x1 to avoid zero-size GPU textures
    let vp_width = viewport.width.max(1);
    let vp_height = viewport.height.max(1);

    let vp = Viewport {
        width: vp_width,
        height: vp_height,
        zoom: viewport.zoom,
        scroll_x: viewport.scroll_x,
        scroll_y: viewport.scroll_y,
    };

    let sel = SelectionInfo {
        selected_ids: selection.selected_ids,
    };

    let node_count = doc.nodes.len() as u32;

    // --- Full pipeline: prepare → effects → build → render → readback ---
    let t_prepare = Instant::now();
    engine.prepare_resources(&doc).map_err(|e| {
        eprintln!("[render_bridge] prepare_resources failed: {e}");
        format!("Prepare failed: {e}")
    })?;

    // Pre-render layers with effects (GPU compute shaders)
    engine.pre_render_effects(&doc).map_err(|e| {
        eprintln!("[render_bridge] pre_render_effects failed: {e}");
        format!("Effects failed: {e}")
    })?;
    let prepare_us = t_prepare.elapsed().as_micros() as u32;

    let t_build = Instant::now();
    engine.build_scene(&doc, &vp, &sel).map_err(|e| {
        eprintln!("[render_bridge] build_scene failed: {e}");
        format!("Build scene failed: {e}")
    })?;
    engine.render().map_err(|e| {
        eprintln!("[render_bridge] render failed: {e}");
        format!("Render failed: {e}")
    })?;
    let render_us = t_build.elapsed().as_micros() as u32;

    let t_readback = Instant::now();
    let pixels = engine.readback().map_err(|e| {
        eprintln!("[render_bridge] readback failed: {e}");
        format!("Readback failed: {e}")
    })?;
    let readback_us = t_readback.elapsed().as_micros() as u32;

    let t_encode = Instant::now();
    use base64::Engine as _;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&pixels);
    let encode_us = t_encode.elapsed().as_micros() as u32;

    let total_ms = t0.elapsed().as_secs_f64() * 1000.0;
    eprintln!(
        "[GPU] prepare: {:.1}ms, render: {:.1}ms, readback: {:.1}ms, encode: {:.1}ms, total: {total_ms:.1}ms, {}x{}, {} nodes",
        prepare_us as f64 / 1000.0,
        render_us as f64 / 1000.0,
        readback_us as f64 / 1000.0,
        encode_us as f64 / 1000.0,
        vp_width,
        vp_height,
        node_count,
    );

    Ok(RenderFrameResponse {
        width: vp_width,
        height: vp_height,
        render_time_us: render_us,
        node_count,
        prepare_us,
        readback_us,
        encode_us,
        pixels: b64,
    })
}

// ---------------------------------------------------------------------------
// Binary IPC render command — 32-byte header + raw RGBA pixels
// ---------------------------------------------------------------------------

/// Binary header layout (32 bytes, little-endian u32):
///   [0..4]   width
///   [4..8]   height
///   [8..12]  render_time_us
///   [12..16] node_count
///   [16..20] prepare_us
///   [20..24] readback_us
///   [24..28] status (0 = success, 1 = error)
///   [28..32] reserved
const BIN_HEADER_SIZE: usize = 32;

/// Render the current document via binary IPC.
/// Returns a raw byte buffer: 32-byte header + RGBA pixel data.
/// No base64 encoding — pixels go straight over IPC.
#[tauri::command]
pub fn render_frame_bin(
    doc_state: State<AppDocumentState>,
    render_state: State<AppRenderState>,
    viewport: ViewportParams,
    selection: SelectionParams,
) -> Response {
    match render_frame_bin_inner(&doc_state, &render_state, viewport, selection) {
        Ok(data) => Response::new(data),
        Err(e) => {
            eprintln!("[render_bridge] render_frame_bin error: {e}");
            // Return 32-byte error header with status=1
            let mut header = vec![0u8; BIN_HEADER_SIZE];
            header[24..28].copy_from_slice(&1u32.to_le_bytes());
            Response::new(header)
        }
    }
}

fn render_frame_bin_inner(
    doc_state: &State<AppDocumentState>,
    render_state: &State<AppRenderState>,
    viewport: ViewportParams,
    selection: SelectionParams,
) -> Result<Vec<u8>, String> {
    let t0 = Instant::now();

    let doc = doc_state
        .document
        .lock()
        .map_err(|e| format!("Document lock poisoned: {e}"))?;

    let mut engine_lock = render_state
        .engine
        .lock()
        .map_err(|e| format!("Render engine lock poisoned: {e}"))?;

    let engine = AppRenderState::ensure_engine(&mut engine_lock)?;

    let vp_width = viewport.width.max(1);
    let vp_height = viewport.height.max(1);

    let vp = Viewport {
        width: vp_width,
        height: vp_height,
        zoom: viewport.zoom,
        scroll_x: viewport.scroll_x,
        scroll_y: viewport.scroll_y,
    };

    let sel = SelectionInfo {
        selected_ids: selection.selected_ids,
    };

    let node_count = doc.nodes.len() as u32;

    // --- Full pipeline: prepare → effects → build → render → readback ---
    let t_prepare = Instant::now();
    engine.prepare_resources(&doc).map_err(|e| {
        eprintln!("[render_bridge] prepare_resources failed: {e}");
        format!("Prepare failed: {e}")
    })?;

    // Pre-render layers with effects (GPU compute shaders)
    engine.pre_render_effects(&doc).map_err(|e| {
        eprintln!("[render_bridge] pre_render_effects failed: {e}");
        format!("Effects failed: {e}")
    })?;
    let prepare_us = t_prepare.elapsed().as_micros() as u32;

    let t_build = Instant::now();
    engine.build_scene(&doc, &vp, &sel).map_err(|e| {
        eprintln!("[render_bridge] build_scene failed: {e}");
        format!("Build scene failed: {e}")
    })?;
    engine.render().map_err(|e| {
        eprintln!("[render_bridge] render failed: {e}");
        format!("Render failed: {e}")
    })?;
    let render_us = t_build.elapsed().as_micros() as u32;

    let t_readback = Instant::now();
    let pixels = engine.readback().map_err(|e| {
        eprintln!("[render_bridge] readback failed: {e}");
        format!("Readback failed: {e}")
    })?;
    let readback_us = t_readback.elapsed().as_micros() as u32;

    let total_ms = t0.elapsed().as_secs_f64() * 1000.0;
    eprintln!(
        "[GPU-BIN] prepare: {:.1}ms, render: {:.1}ms, readback: {:.1}ms, total: {total_ms:.1}ms, {}x{}, {} nodes, {} bytes",
        prepare_us as f64 / 1000.0,
        render_us as f64 / 1000.0,
        readback_us as f64 / 1000.0,
        vp_width,
        vp_height,
        node_count,
        pixels.len(),
    );

    // Build response: 32-byte header + raw RGBA pixels
    let mut buf = Vec::with_capacity(BIN_HEADER_SIZE + pixels.len());
    buf.extend_from_slice(&vp_width.to_le_bytes());
    buf.extend_from_slice(&vp_height.to_le_bytes());
    buf.extend_from_slice(&render_us.to_le_bytes());
    buf.extend_from_slice(&node_count.to_le_bytes());
    buf.extend_from_slice(&prepare_us.to_le_bytes());
    buf.extend_from_slice(&readback_us.to_le_bytes());
    buf.extend_from_slice(&0u32.to_le_bytes()); // status = 0 (success)
    buf.extend_from_slice(&0u32.to_le_bytes()); // reserved
    buf.extend_from_slice(&pixels);

    Ok(buf)
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

// ---------------------------------------------------------------------------
// Phase 3: Hit-testing IPC commands
// ---------------------------------------------------------------------------

/// Hit-test at a canvas-space point. Returns the UUID of the topmost hit node.
#[tauri::command]
pub fn hit_test(
    doc_state: State<AppDocumentState>,
    x: f64,
    y: f64,
) -> Option<String> {
    let doc = doc_state.document.lock().ok()?;
    thamnel_render::hit_test::hit_test_point(&doc, x, y).map(|id| id.to_string())
}

/// Hit-test at a canvas-space point. Returns UUIDs of ALL hit nodes (top-to-bottom).
#[tauri::command]
pub fn hit_test_all(
    doc_state: State<AppDocumentState>,
    x: f64,
    y: f64,
) -> Vec<String> {
    let doc = match doc_state.document.lock() {
        Ok(d) => d,
        Err(_) => return Vec::new(),
    };
    thamnel_render::hit_test::hit_test_all(&doc, x, y)
        .into_iter()
        .map(|id| id.to_string())
        .collect()
}

/// Marquee-select: find all nodes whose AABB intersects the given rectangle.
#[tauri::command]
pub fn marquee_select(
    doc_state: State<AppDocumentState>,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
) -> Vec<String> {
    let doc = match doc_state.document.lock() {
        Ok(d) => d,
        Err(_) => return Vec::new(),
    };
    thamnel_render::hit_test::select_by_marquee(&doc, x, y, w, h)
        .into_iter()
        .map(|id| id.to_string())
        .collect()
}
