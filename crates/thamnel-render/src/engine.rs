//! wgpu device/queue setup and Vello renderer management.

use std::collections::HashMap;
use std::sync::Arc;

use vello::{AaConfig, RenderParams, Renderer, RendererOptions, Scene};
use wgpu::{
    Device, DeviceDescriptor, Instance, InstanceDescriptor, PollType, Queue, Texture,
    TextureDescriptor, TextureDimension, TextureFormat, TextureUsages,
};

use thamnel_core::Document;

use crate::backend::{RenderBackend, RenderError, SelectionInfo, Viewport};
use crate::compositor;
use crate::text_render::TextEngine;

/// The main render engine that owns wgpu device/queue and Vello renderer.
pub struct RenderEngine {
    device: Arc<Device>,
    queue: Arc<Queue>,
    renderer: Renderer,
    scene: Scene,
    /// Current render target texture (recreated on viewport resize).
    target_texture: Option<Texture>,
    target_width: u32,
    target_height: u32,
    /// Reusable readback buffer (recreated on viewport resize).
    readback_buffer: Option<wgpu::Buffer>,
    readback_buffer_size: u64,
    /// Decoded image cache: layer ID → decoded RGBA pixels + dimensions.
    image_cache: HashMap<String, DecodedImage>,
    /// Text layout engine.
    text_engine: TextEngine,
}

/// Decoded image data stored in cache.
pub struct DecodedImage {
    pub rgba: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

impl RenderEngine {
    /// Create a new render engine with a wgpu device and Vello renderer.
    pub async fn new() -> Result<Self, RenderError> {
        let instance = Instance::new(&InstanceDescriptor::default());

        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                force_fallback_adapter: false,
                compatible_surface: None,
            })
            .await
            .map_err(|e| RenderError::Device(e.to_string()))?;

        let (device, queue) = adapter
            .request_device(&DeviceDescriptor::default())
            .await
            .map_err(|e| RenderError::Device(e.to_string()))?;

        let device = Arc::new(device);
        let queue = Arc::new(queue);

        let renderer = Renderer::new(
            &device,
            RendererOptions {
                use_cpu: false,
                antialiasing_support: vello::AaSupport::all(),
                num_init_threads: None,
                pipeline_cache: None,
            },
        )
        .map_err(|e| RenderError::Vello(e.to_string()))?;

        let text_engine = TextEngine::new();

        Ok(Self {
            device,
            queue,
            renderer,
            scene: Scene::new(),
            target_texture: None,
            target_width: 0,
            target_height: 0,
            readback_buffer: None,
            readback_buffer_size: 0,
            image_cache: HashMap::new(),
            text_engine,
        })
    }

    /// Create synchronously using pollster to block on the async constructor.
    pub fn new_blocking() -> Result<Self, RenderError> {
        pollster::block_on(Self::new())
    }

    /// Ensure the render target texture matches the viewport dimensions.
    fn ensure_target(&mut self, width: u32, height: u32) {
        if self.target_width == width && self.target_height == height && self.target_texture.is_some()
        {
            return;
        }

        let texture = self.device.create_texture(&TextureDescriptor {
            label: Some("thamnel_render_target"),
            size: wgpu::Extent3d {
                width: width.max(1),
                height: height.max(1),
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: TextureDimension::D2,
            format: TextureFormat::Rgba8Unorm,
            usage: TextureUsages::STORAGE_BINDING
                | TextureUsages::COPY_SRC
                | TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        });

        self.target_texture = Some(texture);
        self.target_width = width;
        self.target_height = height;
    }

    /// Get a reference to the text engine for external use.
    pub fn text_engine_mut(&mut self) -> &mut TextEngine {
        &mut self.text_engine
    }

    /// Ensure the readback buffer is large enough for the current target.
    fn ensure_readback_buffer(&mut self) {
        let width = self.target_width;
        let height = self.target_height;
        let bytes_per_row = (width * 4 + 255) & !255;
        let required = (bytes_per_row * height) as u64;

        if self.readback_buffer_size >= required && self.readback_buffer.is_some() {
            return;
        }

        self.readback_buffer = Some(self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("readback_buffer"),
            size: required,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        }));
        self.readback_buffer_size = required;
    }

    /// Fallback readback with a temporary buffer (when cached buffer is wrong size).
    fn readback_fallback(
        &self,
        texture: &Texture,
        width: u32,
        height: u32,
        bytes_per_row: u32,
    ) -> Result<Vec<u8>, crate::backend::RenderError> {
        let buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("readback_buffer_tmp"),
            size: (bytes_per_row * height) as u64,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("readback_encoder"),
            });

        encoder.copy_texture_to_buffer(
            texture.as_image_copy(),
            wgpu::TexelCopyBufferInfo {
                buffer: &buffer,
                layout: wgpu::TexelCopyBufferLayout {
                    offset: 0,
                    bytes_per_row: Some(bytes_per_row),
                    rows_per_image: Some(height),
                },
            },
            wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
        );

        self.queue.submit(Some(encoder.finish()));

        let buffer_slice = buffer.slice(..);
        let (tx, rx) = std::sync::mpsc::channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            let _ = tx.send(result);
        });
        let _ = self.device.poll(PollType::wait_indefinitely());
        rx.recv()
            .map_err(|e| crate::backend::RenderError::Readback(e.to_string()))?
            .map_err(|e| crate::backend::RenderError::Readback(e.to_string()))?;

        let data = buffer_slice.get_mapped_range();
        let mut pixels = Vec::with_capacity((width * height * 4) as usize);
        for row in 0..height {
            let start = (row * bytes_per_row) as usize;
            let end = start + (width * 4) as usize;
            pixels.extend_from_slice(&data[start..end]);
        }

        Ok(pixels)
    }
}

impl RenderBackend for RenderEngine {
    fn prepare_resources(&mut self, doc: &Document) -> Result<(), RenderError> {
        // Pre-decode images that aren't in cache
        for node in &doc.nodes {
            if let thamnel_core::node::NodeKind::Image(ref img_data) = node.kind {
                let id = node.base.identity.id.to_string();
                if self.image_cache.contains_key(&id) {
                    continue;
                }
                if let Some(ref data_url) = img_data.image_data {
                    if let Some(decoded) = decode_data_url_image(data_url) {
                        self.image_cache.insert(id, decoded);
                    }
                }
            }
        }
        Ok(())
    }

    fn build_scene(
        &mut self,
        doc: &Document,
        viewport: &Viewport,
        selection: &SelectionInfo,
    ) -> Result<(), RenderError> {
        self.scene.reset();
        compositor::build_document_scene(
            &mut self.scene,
            doc,
            viewport,
            selection,
            &self.image_cache,
            &mut self.text_engine,
        );
        Ok(())
    }

    fn render(&mut self) -> Result<(), RenderError> {
        self.ensure_target(self.target_width.max(1), self.target_height.max(1));

        let texture = self
            .target_texture
            .as_ref()
            .ok_or_else(|| RenderError::Vello("No render target".into()))?;

        let view = texture.create_view(&wgpu::TextureViewDescriptor::default());

        self.renderer
            .render_to_texture(
                &self.device,
                &self.queue,
                &self.scene,
                &view,
                &RenderParams {
                    base_color: vello::peniko::Color::from_rgba8(0, 0, 0, 255),
                    width: self.target_width,
                    height: self.target_height,
                    antialiasing_method: AaConfig::Area,
                },
            )
            .map_err(|e| RenderError::Vello(format!("{e:?}")))?;

        Ok(())
    }

    fn readback(&self) -> Result<Vec<u8>, RenderError> {
        let texture = self
            .target_texture
            .as_ref()
            .ok_or_else(|| RenderError::Readback("No render target".into()))?;

        let width = self.target_width;
        let height = self.target_height;
        let bytes_per_row = (width * 4 + 255) & !255; // Align to 256 bytes
        let required_size = (bytes_per_row * height) as u64;

        // Reuse the readback buffer if it's large enough
        let buffer = self
            .readback_buffer
            .as_ref()
            .filter(|_| self.readback_buffer_size >= required_size)
            .ok_or_else(|| RenderError::Readback("Readback buffer needs resize".into()));

        let buffer = match buffer {
            Ok(b) => b,
            Err(_) => {
                // Will be resized in render_frame's ensure_readback_buffer
                // Fallback: create a temporary buffer
                return self.readback_fallback(texture, width, height, bytes_per_row);
            }
        };

        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("readback_encoder"),
            });

        encoder.copy_texture_to_buffer(
            texture.as_image_copy(),
            wgpu::TexelCopyBufferInfo {
                buffer,
                layout: wgpu::TexelCopyBufferLayout {
                    offset: 0,
                    bytes_per_row: Some(bytes_per_row),
                    rows_per_image: Some(height),
                },
            },
            wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
        );

        self.queue.submit(Some(encoder.finish()));

        let buffer_slice = buffer.slice(..required_size);
        let (tx, rx) = std::sync::mpsc::channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            let _ = tx.send(result);
        });
        let _ = self.device.poll(PollType::wait_indefinitely());
        rx.recv()
            .map_err(|e| RenderError::Readback(e.to_string()))?
            .map_err(|e| RenderError::Readback(e.to_string()))?;

        let data = buffer_slice.get_mapped_range();
        let mut pixels = Vec::with_capacity((width * height * 4) as usize);
        for row in 0..height {
            let start = (row * bytes_per_row) as usize;
            let end = start + (width * 4) as usize;
            pixels.extend_from_slice(&data[start..end]);
        }

        Ok(pixels)
    }

    fn render_frame(
        &mut self,
        doc: &Document,
        viewport: &Viewport,
        selection: &SelectionInfo,
    ) -> Result<Vec<u8>, RenderError> {
        self.ensure_target(viewport.width, viewport.height);
        self.ensure_readback_buffer();
        self.prepare_resources(doc)?;
        self.build_scene(doc, viewport, selection)?;
        self.render()?;
        self.readback()
    }
}

/// Decode a base64 data URL (e.g., `data:image/png;base64,iVBOR...`) into RGBA pixels.
fn decode_data_url_image(data_url: &str) -> Option<DecodedImage> {
    let base64_data = data_url.split(',').nth(1)?;
    let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, base64_data)
        .ok()?;

    let img = image::load_from_memory(&bytes).ok()?;
    let rgba = img.to_rgba8();
    let (w, h) = rgba.dimensions();

    Some(DecodedImage {
        rgba: rgba.into_raw(),
        width: w,
        height: h,
    })
}
