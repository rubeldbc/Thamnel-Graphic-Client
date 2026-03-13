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
use crate::effect_pipeline::EffectPipeline;
use crate::text_render::TextEngine;

/// The main render engine that owns wgpu device/queue and Vello renderer.
pub struct RenderEngine {
    device: Arc<Device>,
    queue: Arc<Queue>,
    renderer: Renderer,
    scene: Scene,
    /// Current render target texture (recreated on viewport resize).
    target_texture: Option<Texture>,
    /// Requested render dimensions (set by build_scene, used by render/readback).
    target_width: u32,
    target_height: u32,
    /// Actual dimensions of the allocated target texture (may differ from target_width/height
    /// between build_scene and render calls — e.g., after export at different resolution).
    tex_actual_width: u32,
    tex_actual_height: u32,
    /// Reusable readback buffer (recreated on viewport resize).
    readback_buffer: Option<wgpu::Buffer>,
    readback_buffer_size: u64,
    /// Decoded image cache: layer ID → decoded RGBA pixels + dimensions.
    image_cache: HashMap<String, DecodedImage>,
    /// Text layout engine.
    text_engine: TextEngine,
    /// GPU effect pipeline for per-layer compute shader effects.
    effect_pipeline: EffectPipeline,
    /// Pre-rendered layers with effects applied (layer ID → processed pixels).
    processed_layers: HashMap<String, DecodedImage>,
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
        let effect_pipeline = EffectPipeline::new(&device);

        Ok(Self {
            device,
            queue,
            renderer,
            scene: Scene::new(),
            target_texture: None,
            target_width: 0,
            target_height: 0,
            tex_actual_width: 0,
            tex_actual_height: 0,
            readback_buffer: None,
            readback_buffer_size: 0,
            image_cache: HashMap::new(),
            text_engine,
            effect_pipeline,
            processed_layers: HashMap::new(),
        })
    }

    /// Create synchronously using pollster to block on the async constructor.
    pub fn new_blocking() -> Result<Self, RenderError> {
        pollster::block_on(Self::new())
    }

    /// Ensure the render target texture matches the requested dimensions.
    ///
    /// Compares against the ACTUAL texture dimensions (not target_width/height
    /// which may have been updated by build_scene before render is called).
    fn ensure_target(&mut self, width: u32, height: u32) {
        if self.tex_actual_width == width && self.tex_actual_height == height && self.target_texture.is_some()
        {
            return;
        }

        let w = width.max(1);
        let h = height.max(1);

        let texture = self.device.create_texture(&TextureDescriptor {
            label: Some("thamnel_render_target"),
            size: wgpu::Extent3d {
                width: w,
                height: h,
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
        self.tex_actual_width = w;
        self.tex_actual_height = h;
    }

    /// Get a reference to the text engine for external use.
    pub fn text_engine_mut(&mut self) -> &mut TextEngine {
        &mut self.text_engine
    }

    /// Pre-render layers that have active effects.
    ///
    /// For each layer with effects:
    /// 1. Build a Vello scene with just that layer (transparent background)
    /// 2. Render it to an offscreen texture
    /// 3. Apply GPU effect chain via compute shaders
    /// 4. Store processed pixels for the compositor to use as an image
    pub fn pre_render_effects(&mut self, doc: &Document) -> Result<(), RenderError> {
        self.processed_layers.clear();

        for node in &doc.nodes {
            if !node.base.visible {
                continue;
            }

            let has_effects = thamnel_core::effects::has_active_effects(&node.base.effects);
            let has_color_adj = {
                let ca = &node.base.color_adjustments;
                ca.temperature != 0.0
                    || ca.tint != 0.0
                    || ca.exposure != 0.0
                    || ca.highlights != 0.0
                    || ca.shadows != 0.0
            };

            if !has_effects && !has_color_adj {
                continue;
            }

            let id = node.base.identity.id.to_string();
            let w = node.base.size.width.max(1.0) as u32;
            let h = node.base.size.height.max(1.0) as u32;

            if w == 0 || h == 0 || w > 8192 || h > 8192 {
                continue;
            }

            // Process each layer independently — if one fails, skip it and
            // let the compositor render it without effects instead of crashing.
            match self.pre_render_single_layer(node, &id, w, h) {
                Ok(processed) => {
                    self.processed_layers.insert(id, processed);
                }
                Err(e) => {
                    log::warn!("Effect pre-render failed for layer {}: {e}", &id[..8.min(id.len())]);
                    // Layer will be rendered without effects by the compositor
                }
            }
        }

        Ok(())
    }

    /// Pre-render a single layer with effects. Separated to isolate failures.
    fn pre_render_single_layer(
        &mut self,
        node: &thamnel_core::node::Node,
        _id: &str,
        w: u32,
        h: u32,
    ) -> Result<DecodedImage, RenderError> {
        // Step 1: Build a mini scene with just this layer (no viewport transform)
        let mut layer_scene = Scene::new();
        compositor::render_single_node(
            &mut layer_scene,
            node,
            &self.image_cache,
            &mut self.text_engine,
        );

        // Step 2: Render the mini scene to an offscreen texture
        let offscreen_tex = self.device.create_texture(&TextureDescriptor {
            label: Some("effect_layer_offscreen"),
            size: wgpu::Extent3d {
                width: w,
                height: h,
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

        let offscreen_view = offscreen_tex.create_view(&wgpu::TextureViewDescriptor::default());

        self.renderer
            .render_to_texture(
                &self.device,
                &self.queue,
                &layer_scene,
                &offscreen_view,
                &RenderParams {
                    base_color: vello::peniko::Color::from_rgba8(0, 0, 0, 0),
                    width: w,
                    height: h,
                    antialiasing_method: AaConfig::Area,
                },
            )
            .map_err(|e| RenderError::Vello(format!("{e:?}")))?;

        // Step 3: Read back the unprocessed layer pixels
        let bytes_per_row = (w * 4 + 255) & !255;
        let readback_buf = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("effect_layer_readback"),
            size: (bytes_per_row * h) as u64,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("effect_layer_readback_enc"),
        });
        encoder.copy_texture_to_buffer(
            offscreen_tex.as_image_copy(),
            wgpu::TexelCopyBufferInfo {
                buffer: &readback_buf,
                layout: wgpu::TexelCopyBufferLayout {
                    offset: 0,
                    bytes_per_row: Some(bytes_per_row),
                    rows_per_image: Some(h),
                },
            },
            wgpu::Extent3d { width: w, height: h, depth_or_array_layers: 1 },
        );
        self.queue.submit(Some(encoder.finish()));

        let slice = readback_buf.slice(..);
        let (tx, rx) = std::sync::mpsc::channel();
        slice.map_async(wgpu::MapMode::Read, move |r| { let _ = tx.send(r); });
        let _ = self.device.poll(PollType::wait_indefinitely());
        rx.recv()
            .map_err(|e| RenderError::Readback(e.to_string()))?
            .map_err(|e| RenderError::Readback(e.to_string()))?;

        let data = slice.get_mapped_range();
        let mut layer_pixels = Vec::with_capacity((w * h * 4) as usize);
        for row in 0..h {
            let start = (row * bytes_per_row) as usize;
            let end = start + (w * 4) as usize;
            layer_pixels.extend_from_slice(&data[start..end]);
        }
        drop(data);

        // Step 4: Build effect pass list and apply GPU effects
        let passes = thamnel_effects::build_effect_passes(
            &node.base.effects,
            &node.base.color_adjustments,
            w,
            h,
        );

        let processed_pixels = if passes.is_empty() {
            layer_pixels
        } else {
            self.effect_pipeline.apply_effects(
                &self.device,
                &self.queue,
                &layer_pixels,
                w,
                h,
                &passes,
            )?
        };

        Ok(DecodedImage {
            rgba: processed_pixels,
            width: w,
            height: h,
        })
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
        // Collect current node IDs to detect deleted layers
        let current_ids: std::collections::HashSet<String> = doc
            .nodes
            .iter()
            .map(|n| n.base.identity.id.to_string())
            .collect();

        // Evict stale entries from image_cache for deleted layers
        self.image_cache.retain(|id, _| current_ids.contains(id));

        // Evict stale entries from processed_layers for deleted layers
        self.processed_layers.retain(|id, _| current_ids.contains(id));

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
        // Store viewport dimensions so render() and readback() use correct size
        self.target_width = viewport.width;
        self.target_height = viewport.height;

        self.scene.reset();
        compositor::build_document_scene(
            &mut self.scene,
            doc,
            viewport,
            selection,
            &self.image_cache,
            &self.processed_layers,
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
        self.pre_render_effects(doc)?;
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
