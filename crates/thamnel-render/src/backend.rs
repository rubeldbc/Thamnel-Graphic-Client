//! Render backend trait — pipeline-oriented abstraction over Vello/wgpu.

use thamnel_core::Document;

/// Viewport configuration for rendering.
#[derive(Debug, Clone)]
pub struct Viewport {
    /// Pixel width of the render target.
    pub width: u32,
    /// Pixel height of the render target.
    pub height: u32,
    /// Zoom factor (1.0 = 100%).
    pub zoom: f64,
    /// Horizontal scroll offset in canvas coordinates.
    pub scroll_x: f64,
    /// Vertical scroll offset in canvas coordinates.
    pub scroll_y: f64,
}

impl Default for Viewport {
    fn default() -> Self {
        Self {
            width: 1920,
            height: 1080,
            zoom: 1.0,
            scroll_x: 0.0,
            scroll_y: 0.0,
        }
    }
}

/// Selected node IDs for gizmo rendering.
#[derive(Debug, Clone, Default)]
pub struct SelectionInfo {
    /// IDs of currently selected nodes.
    pub selected_ids: Vec<String>,
}

/// Pipeline-oriented render backend trait.
pub trait RenderBackend {
    /// Prepare GPU resources (textures, buffers) for the document.
    fn prepare_resources(&mut self, doc: &Document) -> Result<(), RenderError>;

    /// Build a Vello scene from the document and viewport.
    fn build_scene(
        &mut self,
        doc: &Document,
        viewport: &Viewport,
        selection: &SelectionInfo,
    ) -> Result<(), RenderError>;

    /// Render the built scene to the internal render target.
    fn render(&mut self) -> Result<(), RenderError>;

    /// Read back rendered pixels as RGBA u8 data.
    fn readback(&self) -> Result<Vec<u8>, RenderError>;

    /// Combined render pipeline: prepare → build scene → render → readback.
    fn render_frame(
        &mut self,
        doc: &Document,
        viewport: &Viewport,
        selection: &SelectionInfo,
    ) -> Result<Vec<u8>, RenderError> {
        self.prepare_resources(doc)?;
        self.build_scene(doc, viewport, selection)?;
        self.render()?;
        self.readback()
    }
}

/// Render error type.
#[derive(Debug, thiserror::Error)]
pub enum RenderError {
    #[error("wgpu device error: {0}")]
    Device(String),

    #[error("wgpu surface error: {0}")]
    Surface(String),

    #[error("Vello rendering error: {0}")]
    Vello(String),

    #[error("Image decode error: {0}")]
    ImageDecode(String),

    #[error("Text layout error: {0}")]
    TextLayout(String),

    #[error("Readback error: {0}")]
    Readback(String),
}
