//! thamnel-render — GPU rendering engine for Thamnel Graphics Editor.
//!
//! Uses wgpu + Vello for vector rendering and cosmic-text for text layout.
//! Replaces the TypeScript Canvas-based renderer with GPU-accelerated paths.

pub mod backend;
pub mod compositor;
pub mod conversions;
pub mod effect_pipeline;
pub mod engine;
pub mod export;
pub mod hit_test;
pub mod shape_render;
pub mod text_render;

// Re-export key types for consumers.
pub use backend::{RenderBackend, Viewport};
pub use engine::RenderEngine;
