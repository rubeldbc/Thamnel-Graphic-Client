//! `thamnel-core` — Core document model for the Thamnel Graphics Editor.
//!
//! This crate defines the data model, geometry, identity, command system,
//! and undo/redo history. It contains NO rendering logic — that lives in
//! `thamnel-render`.
//!
//! # Module overview
//!
//! - [`geometry`] — Point, Size, Rect, BezierPath
//! - [`transform`] — Animation-ready transform (anchor, position, scale, rotation, skew)
//! - [`identity`] — Triple identity model (UUID, binding key, display name)
//! - [`blend`] — Blend mode enum (17 modes)
//! - [`fill`] — Fill definitions (solid, gradients, image fills)
//! - [`effects`] — Effect stack and color adjustments
//! - [`shape`] — Shape types (28 variants) and shape-specific properties
//! - [`text`] — Text properties and styled runs
//! - [`node`] — Node types (image, text, shape, group) with common base
//! - [`document`] — Document container with canvas settings and node list
//! - [`commands`] — Command-based document mutations with inverse generation
//! - [`history`] — Undo/redo stack using the command pattern

pub mod geometry;
pub mod transform;
pub mod identity;
pub mod blend;
pub mod fill;
pub mod effects;
pub mod shape;
pub mod text;
pub mod node;
pub mod document;
pub mod commands;
pub mod history;

// Re-export key types for ergonomic use.
pub use geometry::{Point, Size, Rect, BezierPath, PathCommand};
pub use transform::Transform;
pub use identity::NodeIdentity;
pub use blend::BlendMode;
pub use fill::{FillDefinition, FillType, GradientStop, ImageStretchMode};
pub use effects::{EffectStack, ColorAdjustments};
pub use shape::{ShapeType, ShapeProperties, TransparencyMaskType};
pub use text::{TextProperties, TextAlignment, TextTransform, StyledRun};
pub use node::{Node, NodeBase, NodeKind, ImageData, GroupData};
pub use document::{Document, DocumentMetadata};
pub use commands::{DocumentCommand, PropertyValue, CommandError};
pub use history::History;
