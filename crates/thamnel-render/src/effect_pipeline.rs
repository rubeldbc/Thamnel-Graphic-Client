//! GPU effect pipeline — executes WGSL compute shaders on per-layer textures.
//!
//! Uses a ping-pong pair of textures: each effect pass reads from one and
//! writes to the other. After all passes, the result is read back to CPU.

use std::collections::HashMap;
use std::sync::Arc;

use wgpu::{
    BindGroupDescriptor, BindGroupEntry, BindGroupLayout, BindGroupLayoutDescriptor,
    BindGroupLayoutEntry, BindingResource, BindingType, BufferBindingType, BufferDescriptor,
    BufferUsages, CommandEncoderDescriptor, ComputePipeline, ComputePipelineDescriptor, Device,
    Extent3d, PipelineLayoutDescriptor, PollType, Queue, ShaderModuleDescriptor, ShaderStages,
    StorageTextureAccess, Texture, TextureDescriptor, TextureDimension, TextureFormat,
    TextureSampleType, TextureUsages, TextureViewDescriptor, TextureViewDimension,
};

use thamnel_effects::{EffectPassKind, EffectUniforms};

use crate::backend::RenderError;

/// Manages wgpu compute pipelines and ping-pong textures for effect processing.
pub struct EffectPipeline {
    /// Cached compute pipelines keyed by effect pass kind.
    pipelines: HashMap<EffectPassKind, ComputePipeline>,
    /// Bind group layout shared by all effect shaders.
    bind_group_layout: BindGroupLayout,
    /// Ping-pong texture A.
    tex_a: Option<Texture>,
    /// Ping-pong texture B.
    tex_b: Option<Texture>,
    /// Current dimensions of the ping-pong textures.
    tex_width: u32,
    tex_height: u32,
}

impl EffectPipeline {
    /// Create a new effect pipeline with the shared bind group layout.
    pub fn new(device: &Device) -> Self {
        // All effect shaders share this layout:
        // @binding(0): texture_2d<f32>                     (input, read)
        // @binding(1): texture_storage_2d<rgba8unorm, write> (output, write)
        // @binding(2): uniform buffer                       (params)
        let bind_group_layout = device.create_bind_group_layout(&BindGroupLayoutDescriptor {
            label: Some("effect_bind_group_layout"),
            entries: &[
                BindGroupLayoutEntry {
                    binding: 0,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Texture {
                        sample_type: TextureSampleType::Float { filterable: false },
                        view_dimension: TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                BindGroupLayoutEntry {
                    binding: 1,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::StorageTexture {
                        access: StorageTextureAccess::WriteOnly,
                        format: TextureFormat::Rgba8Unorm,
                        view_dimension: TextureViewDimension::D2,
                    },
                    count: None,
                },
                BindGroupLayoutEntry {
                    binding: 2,
                    visibility: ShaderStages::COMPUTE,
                    ty: BindingType::Buffer {
                        ty: BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });

        Self {
            pipelines: HashMap::new(),
            bind_group_layout,
            tex_a: None,
            tex_b: None,
            tex_width: 0,
            tex_height: 0,
        }
    }

    /// Ensure ping-pong textures are at least the given size.
    fn ensure_textures(&mut self, device: &Device, width: u32, height: u32) {
        if self.tex_width >= width && self.tex_height >= height
            && self.tex_a.is_some() && self.tex_b.is_some()
        {
            return;
        }

        let w = width.max(1);
        let h = height.max(1);

        let usage = TextureUsages::TEXTURE_BINDING
            | TextureUsages::STORAGE_BINDING
            | TextureUsages::COPY_SRC
            | TextureUsages::COPY_DST;

        let desc = |label| TextureDescriptor {
            label: Some(label),
            size: Extent3d {
                width: w,
                height: h,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: TextureDimension::D2,
            format: TextureFormat::Rgba8Unorm,
            usage,
            view_formats: &[],
        };

        self.tex_a = Some(device.create_texture(&desc("effect_tex_a")));
        self.tex_b = Some(device.create_texture(&desc("effect_tex_b")));
        self.tex_width = w;
        self.tex_height = h;
    }

    /// Get or create a compute pipeline for the given effect pass.
    fn get_or_create_pipeline(
        &mut self,
        device: &Device,
        kind: EffectPassKind,
    ) -> &ComputePipeline {
        if !self.pipelines.contains_key(&kind) {
            let source = thamnel_effects::kernels::get_shader_source(kind);
            let shader = device.create_shader_module(ShaderModuleDescriptor {
                label: Some("effect_shader"),
                source: wgpu::ShaderSource::Wgsl(source.into()),
            });

            let pipeline_layout = device.create_pipeline_layout(&PipelineLayoutDescriptor {
                label: Some("effect_pipeline_layout"),
                bind_group_layouts: &[&self.bind_group_layout],
                push_constant_ranges: &[],
            });

            let pipeline = device.create_compute_pipeline(&ComputePipelineDescriptor {
                label: Some("effect_compute_pipeline"),
                layout: Some(&pipeline_layout),
                module: &shader,
                entry_point: Some("main"),
                compilation_options: Default::default(),
                cache: None,
            });

            self.pipelines.insert(kind, pipeline);
        }

        &self.pipelines[&kind]
    }

    /// Apply a chain of effect passes to a source texture.
    ///
    /// The source texture pixels are first copied into the ping-pong pair,
    /// then each pass reads from one texture and writes to the other.
    ///
    /// Returns the processed RGBA pixel data.
    pub fn apply_effects(
        &mut self,
        device: &Arc<Device>,
        queue: &Arc<Queue>,
        source_pixels: &[u8],
        width: u32,
        height: u32,
        passes: &[(EffectPassKind, EffectUniforms)],
    ) -> Result<Vec<u8>, RenderError> {
        if passes.is_empty() || width == 0 || height == 0 {
            return Ok(source_pixels.to_vec());
        }

        self.ensure_textures(device, width, height);

        // Pre-create all needed pipelines to avoid borrow conflicts
        for (kind, _) in passes {
            self.get_or_create_pipeline(device, *kind);
        }

        let tex_a = self.tex_a.as_ref().unwrap();
        let tex_b = self.tex_b.as_ref().unwrap();

        // Upload source pixels to tex_a
        let bytes_per_row = width * 4;
        queue.write_texture(
            tex_a.as_image_copy(),
            source_pixels,
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(bytes_per_row),
                rows_per_image: Some(height),
            },
            Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
        );

        let view_a = tex_a.create_view(&TextureViewDescriptor::default());
        let view_b = tex_b.create_view(&TextureViewDescriptor::default());

        // Run each effect pass, ping-ponging between textures
        // Pass 0: read A → write B
        // Pass 1: read B → write A
        // Pass 2: read A → write B
        // ...
        for (i, (kind, uniforms)) in passes.iter().enumerate() {
            let (input_view, output_view) = if i % 2 == 0 {
                (&view_a, &view_b)
            } else {
                (&view_b, &view_a)
            };

            let uniform_data = write_uniform_bytes(*kind, uniforms);
            let uniform_buffer = device.create_buffer(&BufferDescriptor {
                label: Some("effect_uniform"),
                size: uniform_data.len() as u64,
                usage: BufferUsages::UNIFORM | BufferUsages::COPY_DST,
                mapped_at_creation: false,
            });
            queue.write_buffer(&uniform_buffer, 0, &uniform_data);

            let pipeline = &self.pipelines[kind];

            let bind_group = device.create_bind_group(&BindGroupDescriptor {
                label: Some("effect_bind_group"),
                layout: &self.bind_group_layout,
                entries: &[
                    BindGroupEntry {
                        binding: 0,
                        resource: BindingResource::TextureView(input_view),
                    },
                    BindGroupEntry {
                        binding: 1,
                        resource: BindingResource::TextureView(output_view),
                    },
                    BindGroupEntry {
                        binding: 2,
                        resource: uniform_buffer.as_entire_binding(),
                    },
                ],
            });

            let mut encoder = device.create_command_encoder(&CommandEncoderDescriptor {
                label: Some("effect_encoder"),
            });

            {
                let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                    label: Some("effect_pass"),
                    timestamp_writes: None,
                });
                pass.set_pipeline(pipeline);
                pass.set_bind_group(0, &bind_group, &[]);
                // Workgroup size is 16x16
                let wg_x = (width + 15) / 16;
                let wg_y = (height + 15) / 16;
                pass.dispatch_workgroups(wg_x, wg_y, 1);
            }

            queue.submit(Some(encoder.finish()));
        }

        // Read back from the final output texture
        let result_tex = if passes.len() % 2 == 0 {
            tex_a // Even number of passes: result is back in A (last write was to A)
        } else {
            tex_b // Odd number of passes: result is in B
        };

        self.readback_texture(device, queue, result_tex, width, height)
    }

    /// Read pixels from a texture back to CPU.
    fn readback_texture(
        &self,
        device: &Arc<Device>,
        queue: &Arc<Queue>,
        texture: &Texture,
        width: u32,
        height: u32,
    ) -> Result<Vec<u8>, RenderError> {
        let bytes_per_row = (width * 4 + 255) & !255; // Align to 256
        let buffer_size = (bytes_per_row * height) as u64;

        let readback_buffer = device.create_buffer(&BufferDescriptor {
            label: Some("effect_readback"),
            size: buffer_size,
            usage: BufferUsages::COPY_DST | BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        let mut encoder = device.create_command_encoder(&CommandEncoderDescriptor {
            label: Some("effect_readback_encoder"),
        });

        encoder.copy_texture_to_buffer(
            texture.as_image_copy(),
            wgpu::TexelCopyBufferInfo {
                buffer: &readback_buffer,
                layout: wgpu::TexelCopyBufferLayout {
                    offset: 0,
                    bytes_per_row: Some(bytes_per_row),
                    rows_per_image: Some(height),
                },
            },
            Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
        );

        queue.submit(Some(encoder.finish()));

        let buffer_slice = readback_buffer.slice(..);
        let (tx, rx) = std::sync::mpsc::channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |result| {
            let _ = tx.send(result);
        });
        let _ = device.poll(PollType::wait_indefinitely());
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
}

/// Serialize effect uniform parameters to raw bytes for the GPU buffer.
///
/// The byte layout must match the WGSL `Params` struct for each shader,
/// padded to 16-byte alignment.
fn write_uniform_bytes(kind: EffectPassKind, uniforms: &EffectUniforms) -> Vec<u8> {
    match (kind, uniforms) {
        // Color adjust: 10 f32s → 40 bytes, padded to 48
        (EffectPassKind::ColorAdjust, EffectUniforms::ColorAdjust(p)) => {
            pad_to_16(&f32s_to_bytes(&[
                p.brightness, p.contrast, p.saturation, p.hue_rotation,
                p.temperature, p.tint, p.exposure, p.highlights,
                p.shadows, p._pad,
            ]))
        }

        // Gaussian blur H: radius, w, h, direction(1,0) → 5 f32s, padded to 32
        (EffectPassKind::GaussianBlurH, EffectUniforms::GaussianBlur(p)) => {
            pad_to_16(&f32s_to_bytes(&[p.radius, p.tex_width, p.tex_height, 1.0, 0.0]))
        }

        // Gaussian blur V: radius, w, h, direction(0,1) → 5 f32s, padded to 32
        (EffectPassKind::GaussianBlurV, EffectUniforms::GaussianBlur(p)) => {
            pad_to_16(&f32s_to_bytes(&[p.radius, p.tex_width, p.tex_height, 0.0, 1.0]))
        }

        // Sharpen: 3 f32s, padded to 16
        (EffectPassKind::Sharpen, EffectUniforms::Sharpen(p)) => {
            pad_to_16(&f32s_to_bytes(&[p.amount, p.tex_width, p.tex_height]))
        }

        // Vignette: 1 f32, padded to 16
        (EffectPassKind::Vignette, EffectUniforms::Vignette(p)) => {
            pad_to_16(&f32s_to_bytes(&[p.intensity]))
        }

        // Pixelate: 3 f32s, padded to 16
        (EffectPassKind::Pixelate, EffectUniforms::Pixelate(p)) => {
            pad_to_16(&f32s_to_bytes(&[p.block_size, p.tex_width, p.tex_height]))
        }

        // Noise: 4 f32s (amount + 3 padding), padded to 16
        (EffectPassKind::Noise, EffectUniforms::Noise(p)) => {
            pad_to_16(&f32s_to_bytes(&[p.amount, 0.0, 0.0, 0.0]))
        }

        // Posterize: 1 f32, padded to 16
        (EffectPassKind::Posterize, EffectUniforms::Posterize(p)) => {
            pad_to_16(&f32s_to_bytes(&[p.levels]))
        }

        // Color toggle: 4 f32s, padded to 16
        (EffectPassKind::ColorToggle, EffectUniforms::ColorToggle(p)) => {
            pad_to_16(&f32s_to_bytes(&[p.grayscale, p.sepia, p.invert, p._pad]))
        }

        // Color tint: 4 f32s, padded to 16
        (EffectPassKind::ColorTint, EffectUniforms::ColorTint(p)) => {
            pad_to_16(&f32s_to_bytes(&[p.tint_r, p.tint_g, p.tint_b, p.intensity]))
        }

        // Drop shadow: 7 f32s, padded to 32
        (EffectPassKind::DropShadow, EffectUniforms::DropShadow(p)) => {
            pad_to_16(&f32s_to_bytes(&[
                p.color_r, p.color_g, p.color_b, p.offset_x,
                p.offset_y, p.blur_radius, p.opacity,
            ]))
        }

        // Outer glow: 5 f32s, padded to 32
        (EffectPassKind::OuterGlow, EffectUniforms::OuterGlow(p)) => {
            pad_to_16(&f32s_to_bytes(&[
                p.color_r, p.color_g, p.color_b, p.radius, p.intensity,
            ]))
        }

        // Cut stroke: 6 f32s, padded to 32
        (EffectPassKind::CutStroke, EffectUniforms::CutStroke(p)) => {
            pad_to_16(&f32s_to_bytes(&[
                p.color_r, p.color_g, p.color_b, p.width,
                p.tex_width, p.tex_height,
            ]))
        }

        // Smooth stroke: 7 f32s, padded to 32
        (EffectPassKind::SmoothStroke, EffectUniforms::SmoothStroke(p)) => {
            pad_to_16(&f32s_to_bytes(&[
                p.color_r, p.color_g, p.color_b, p.width,
                p.opacity, p.tex_width, p.tex_height,
            ]))
        }

        // Rim light: 8 f32s, padded to 32
        (EffectPassKind::RimLight, EffectUniforms::RimLight(p)) => {
            pad_to_16(&f32s_to_bytes(&[
                p.color_r, p.color_g, p.color_b, p.angle,
                p.intensity, p.width, p.tex_width, p.tex_height,
            ]))
        }

        // Split toning: 8 f32s, padded to 32
        (EffectPassKind::SplitToning, EffectUniforms::SplitToning(p)) => {
            pad_to_16(&f32s_to_bytes(&[
                p.highlight_r, p.highlight_g, p.highlight_b,
                p.shadow_r, p.shadow_g, p.shadow_b,
                p.balance, 0.0,
            ]))
        }

        // Fallback: shouldn't happen but return empty padded buffer
        _ => pad_to_16(&[]),
    }
}

/// Convert f32 slice to little-endian bytes.
fn f32s_to_bytes(values: &[f32]) -> Vec<u8> {
    values.iter().flat_map(|v| v.to_le_bytes()).collect()
}

/// Pad byte vector to 16-byte alignment (minimum 16 bytes).
fn pad_to_16(data: &[u8]) -> Vec<u8> {
    let mut out = data.to_vec();
    let aligned = ((out.len() + 15) / 16) * 16;
    let aligned = aligned.max(16);
    out.resize(aligned, 0);
    out
}
