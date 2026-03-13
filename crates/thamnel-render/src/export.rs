//! Image export — render a Document to PNG/JPEG bytes at arbitrary resolution.
//!
//! Used by the Tauri export command to produce final output files.

use crate::backend::{RenderError, SelectionInfo, Viewport};
use crate::RenderBackend;
use thamnel_core::Document;

/// Export format for rendered images.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExportFormat {
    Png,
    Jpeg,
}

/// Export a document to image bytes at the given dimensions.
///
/// Renders with zoom=1, no scroll, no selection gizmos.
pub fn export_document(
    engine: &mut dyn RenderBackend,
    doc: &Document,
    width: u32,
    height: u32,
    format: ExportFormat,
) -> Result<Vec<u8>, RenderError> {
    let viewport = Viewport {
        width,
        height,
        zoom: width as f64 / doc.canvas_size.width,
        scroll_x: 0.0,
        scroll_y: 0.0,
    };

    let selection = SelectionInfo::default();
    let rgba = engine.render_frame(doc, &viewport, &selection)?;

    encode_image(&rgba, width, height, format)
}

/// Encode RGBA pixel data to the specified image format.
fn encode_image(
    rgba: &[u8],
    width: u32,
    height: u32,
    format: ExportFormat,
) -> Result<Vec<u8>, RenderError> {
    let mut buf = Vec::new();

    match format {
        ExportFormat::Png => {
            let encoder = image::codecs::png::PngEncoder::new(&mut buf);
            image::ImageEncoder::write_image(
                encoder,
                rgba,
                width,
                height,
                image::ExtendedColorType::Rgba8,
            )
            .map_err(|e| RenderError::ImageDecode(e.to_string()))?;
        }
        ExportFormat::Jpeg => {
            // Convert RGBA to RGB for JPEG
            let rgb: Vec<u8> = rgba
                .chunks_exact(4)
                .flat_map(|pixel| [pixel[0], pixel[1], pixel[2]])
                .collect();
            let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, 95);
            image::ImageEncoder::write_image(
                encoder,
                &rgb,
                width,
                height,
                image::ExtendedColorType::Rgb8,
            )
            .map_err(|e| RenderError::ImageDecode(e.to_string()))?;
        }
    }

    Ok(buf)
}
