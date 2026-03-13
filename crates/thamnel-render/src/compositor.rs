//! Document compositor — builds a complete Vello scene from a Document.
//!
//! Iterates visible nodes in order, applying transforms, opacity, and blend modes.
//! Replaces the TypeScript `compositor.ts`.

use std::collections::HashMap;

use kurbo::{Affine, Rect};
use peniko::{Blob, BlendMode, Brush, Color, Fill, ImageAlphaType, ImageBrush, ImageData, ImageFormat, ImageSampler, Mix};
use vello::Scene;

use thamnel_core::node::{Node, NodeKind};
use thamnel_core::Document;

use crate::backend::{SelectionInfo, Viewport};
use crate::conversions::to_kurbo_affine;
use crate::engine::DecodedImage;
use crate::shape_render;
use crate::text_render::TextEngine;

/// Convert a thamnel_core BlendMode to a peniko BlendMode (Mix + Compose).
fn to_peniko_blend(mode: thamnel_core::BlendMode) -> BlendMode {
    let mix = match mode {
        thamnel_core::BlendMode::Normal => Mix::Normal,
        thamnel_core::BlendMode::Multiply => Mix::Multiply,
        thamnel_core::BlendMode::Darken => Mix::Darken,
        thamnel_core::BlendMode::ColorBurn => Mix::ColorBurn,
        thamnel_core::BlendMode::Screen => Mix::Screen,
        thamnel_core::BlendMode::Lighten => Mix::Lighten,
        thamnel_core::BlendMode::ColorDodge => Mix::ColorDodge,
        thamnel_core::BlendMode::LinearDodge => {
            // LinearDodge = additive blending. Vello doesn't have a Mix variant
            // for this, so we use Normal mix with Plus compositing below.
            Mix::Normal
        }
        thamnel_core::BlendMode::Overlay => Mix::Overlay,
        thamnel_core::BlendMode::SoftLight => Mix::SoftLight,
        thamnel_core::BlendMode::HardLight => Mix::HardLight,
        thamnel_core::BlendMode::Difference => Mix::Difference,
        thamnel_core::BlendMode::Exclusion => Mix::Exclusion,
        thamnel_core::BlendMode::Hue => Mix::Hue,
        thamnel_core::BlendMode::Saturation => Mix::Saturation,
        thamnel_core::BlendMode::Color => Mix::Color,
        thamnel_core::BlendMode::Luminosity => Mix::Luminosity,
    };

    // LinearDodge uses Plus compositing instead of SrcOver
    let compose = if matches!(mode, thamnel_core::BlendMode::LinearDodge) {
        peniko::Compose::Plus
    } else {
        peniko::Compose::SrcOver
    };

    BlendMode::new(mix, compose)
}

/// Check if a blend mode is non-normal (requires a compositing layer).
fn needs_blend_layer(mode: thamnel_core::BlendMode) -> bool {
    !matches!(mode, thamnel_core::BlendMode::Normal)
}

/// Build the full document scene for rendering.
pub fn build_document_scene(
    scene: &mut Scene,
    doc: &Document,
    viewport: &Viewport,
    selection: &SelectionInfo,
    image_cache: &HashMap<String, DecodedImage>,
    processed_layers: &HashMap<String, DecodedImage>,
    text_engine: &mut TextEngine,
) {
    // Canvas background
    let bg_color = shape_render::parse_color(&doc.background_color);
    let canvas_rect = Rect::new(
        0.0,
        0.0,
        doc.canvas_size.width,
        doc.canvas_size.height,
    );

    // Viewport transform: scroll + zoom
    let viewport_transform = Affine::scale(viewport.zoom)
        * Affine::translate((-viewport.scroll_x, -viewport.scroll_y));

    // Draw background
    scene.fill(
        Fill::NonZero,
        viewport_transform,
        &Brush::Solid(bg_color),
        None,
        &canvas_rect,
    );

    // Convention: index 0 = topmost (front). Render in reverse so bottom
    // layers are drawn first and index 0 is drawn last (on top).
    for node in doc.nodes.iter().rev() {
        if !node.base.visible {
            continue;
        }

        let blend_mode = node.base.blend_mode;
        let opacity = node.base.opacity;
        let use_layer = needs_blend_layer(blend_mode) || opacity < 1.0;

        // If blend mode is non-normal or opacity < 1, wrap in a compositing layer.
        // This applies the blend mode and opacity to the ENTIRE node as a group.
        if use_layer {
            let size = &node.base.size;
            let node_transform = to_kurbo_affine(&node.base.transform, size);
            let clip_transform = viewport_transform * node_transform;
            // Clip rect in node-local space; generous padding for effects/shadows
            let clip_rect = Rect::new(-size.width, -size.height, size.width * 2.0, size.height * 2.0);
            scene.push_layer(
                Fill::NonZero,
                to_peniko_blend(blend_mode),
                opacity as f32,
                clip_transform,
                &clip_rect,
            );
        }

        let id = node.base.identity.id.to_string();
        if let Some(processed) = processed_layers.get(&id) {
            render_processed_layer(scene, processed, node, viewport_transform, use_layer);
        } else {
            render_node(scene, node, viewport_transform, image_cache, text_engine, use_layer);
        }

        if use_layer {
            scene.pop_layer();
        }
    }

    // Render selection gizmos
    if !selection.selected_ids.is_empty() {
        render_selection_gizmos(scene, doc, viewport_transform, selection);
    }
}

/// Render a single node to the scene.
///
/// When `in_blend_layer` is true, the node's opacity and blend mode are handled
/// by the parent compositing layer, so content is drawn at full opacity.
fn render_node(
    scene: &mut Scene,
    node: &Node,
    viewport_transform: Affine,
    image_cache: &HashMap<String, DecodedImage>,
    text_engine: &mut TextEngine,
    in_blend_layer: bool,
) {
    let base = &node.base;
    let size = &base.size;
    // If we're inside a compositing layer, draw at full opacity (layer handles it)
    let opacity = if in_blend_layer { 1.0 } else { base.opacity };

    // Build the node's local transform
    let node_transform = to_kurbo_affine(&base.transform, size);

    // Apply flip transforms
    let flip = if base.flip_horizontal || base.flip_vertical {
        let sx = if base.flip_horizontal { -1.0 } else { 1.0 };
        let sy = if base.flip_vertical { -1.0 } else { 1.0 };
        let cx = size.width / 2.0;
        let cy = size.height / 2.0;
        Affine::translate((cx, cy))
            * Affine::scale_non_uniform(sx, sy)
            * Affine::translate((-cx, -cy))
    } else {
        Affine::IDENTITY
    };

    let full_transform = viewport_transform * node_transform * flip;

    match &node.kind {
        NodeKind::Image(_img_data) => {
            let id = base.identity.id.to_string();
            if let Some(decoded) = image_cache.get(&id) {
                render_image(scene, decoded, size.width, size.height, full_transform, opacity, base);
            }
        }
        NodeKind::Text(text_props) => {
            let buffer = text_engine.layout_text(text_props, size.width);
            crate::text_render::render_text_to_scene(
                scene,
                text_props,
                &buffer,
                text_engine,
                full_transform,
                opacity,
                size.width,
                size.height,
            );
        }
        NodeKind::Shape(shape_props) => {
            shape_render::render_shape(
                scene,
                shape_props,
                size.width,
                size.height,
                full_transform,
                opacity,
            );
        }
        NodeKind::Group(_) => {
            // Groups are rendered by their children (which have parentGroupId set).
            // The group node itself is not rendered.
        }
    }
}

/// Render a decoded image to the scene using Vello's image brush.
fn render_image(
    scene: &mut Scene,
    decoded: &DecodedImage,
    layer_w: f64,
    layer_h: f64,
    transform: Affine,
    opacity: f64,
    base: &thamnel_core::node::NodeBase,
) {
    let crop_left = base.crop_left;
    let crop_top = base.crop_top;
    let crop_right = base.crop_right;
    let crop_bottom = base.crop_bottom;

    let draw_w = layer_w - crop_left - crop_right;
    let draw_h = layer_h - crop_top - crop_bottom;

    if draw_w <= 0.0 || draw_h <= 0.0 {
        return;
    }

    // Create a peniko ImageData from the decoded RGBA pixel data
    let blob: Blob<u8> = decoded.rgba.clone().into();
    let image_data = ImageData {
        data: blob,
        format: ImageFormat::Rgba8,
        alpha_type: ImageAlphaType::Alpha,
        width: decoded.width,
        height: decoded.height,
    };

    // Create an ImageBrush with opacity baked into the sampler alpha
    let image_brush = ImageBrush {
        image: image_data,
        sampler: ImageSampler::default().with_alpha(opacity as f32),
    };

    // Scale from image pixel space to layer local space
    let sx = layer_w / decoded.width as f64;
    let sy = layer_h / decoded.height as f64;
    let image_xform = transform * Affine::scale_non_uniform(sx, sy);

    let has_crop = crop_left > 0.0 || crop_top > 0.0 || crop_right > 0.0 || crop_bottom > 0.0;

    if has_crop {
        // Use a compositing layer for crop clipping
        let clip_rect = Rect::new(crop_left, crop_top, crop_left + draw_w, crop_top + draw_h);
        scene.push_layer(
            Fill::NonZero,
            BlendMode::new(Mix::Normal, peniko::Compose::SrcOver),
            1.0,
            transform,
            &clip_rect,
        );
        scene.draw_image(&image_brush, image_xform);
        scene.pop_layer();
    } else {
        scene.draw_image(&image_brush, image_xform);
    }
}

/// Render a pre-processed layer (with effects already applied) as an image.
///
/// When `in_blend_layer` is true, opacity is handled by the parent compositing
/// layer, so the image is drawn at full opacity.
fn render_processed_layer(
    scene: &mut Scene,
    processed: &DecodedImage,
    node: &Node,
    viewport_transform: Affine,
    in_blend_layer: bool,
) {
    let base = &node.base;
    let size = &base.size;
    let opacity = if in_blend_layer { 1.0 } else { base.opacity };

    let node_transform = to_kurbo_affine(&base.transform, size);

    let flip = if base.flip_horizontal || base.flip_vertical {
        let sx = if base.flip_horizontal { -1.0 } else { 1.0 };
        let sy = if base.flip_vertical { -1.0 } else { 1.0 };
        let cx = size.width / 2.0;
        let cy = size.height / 2.0;
        Affine::translate((cx, cy))
            * Affine::scale_non_uniform(sx, sy)
            * Affine::translate((-cx, -cy))
    } else {
        Affine::IDENTITY
    };

    let full_transform = viewport_transform * node_transform * flip;

    // Draw the processed pixels as an image
    let blob: Blob<u8> = processed.rgba.clone().into();
    let image_data = ImageData {
        data: blob,
        format: ImageFormat::Rgba8,
        alpha_type: ImageAlphaType::Alpha,
        width: processed.width,
        height: processed.height,
    };

    let image_brush = ImageBrush {
        image: image_data,
        sampler: ImageSampler::default().with_alpha(opacity as f32),
    };

    // Scale from processed pixel space to layer local space
    let sx = size.width / processed.width as f64;
    let sy = size.height / processed.height as f64;
    let image_xform = full_transform * Affine::scale_non_uniform(sx, sy);

    scene.draw_image(&image_brush, image_xform);
}

/// Render a single node to a standalone scene (no viewport transform).
///
/// Used by the effect pre-render step to render individual layers to offscreen textures.
/// The node is rendered at its natural size at position (0, 0).
pub fn render_single_node(
    scene: &mut Scene,
    node: &Node,
    image_cache: &HashMap<String, DecodedImage>,
    text_engine: &mut TextEngine,
) {
    let base = &node.base;
    let size = &base.size;

    // Render at identity (no viewport, no position — just content at origin)
    let flip = if base.flip_horizontal || base.flip_vertical {
        let sx = if base.flip_horizontal { -1.0 } else { 1.0 };
        let sy = if base.flip_vertical { -1.0 } else { 1.0 };
        let cx = size.width / 2.0;
        let cy = size.height / 2.0;
        Affine::translate((cx, cy))
            * Affine::scale_non_uniform(sx, sy)
            * Affine::translate((-cx, -cy))
    } else {
        Affine::IDENTITY
    };

    match &node.kind {
        NodeKind::Image(_img_data) => {
            let id = base.identity.id.to_string();
            if let Some(decoded) = image_cache.get(&id) {
                // Render image at natural size, no crop, full opacity (effects handle the rest)
                let blob: Blob<u8> = decoded.rgba.clone().into();
                let image_data = ImageData {
                    data: blob,
                    format: ImageFormat::Rgba8,
                    alpha_type: ImageAlphaType::Alpha,
                    width: decoded.width,
                    height: decoded.height,
                };
                let image_brush = ImageBrush {
                    image: image_data,
                    sampler: ImageSampler::default(),
                };
                let sx = size.width / decoded.width as f64;
                let sy = size.height / decoded.height as f64;
                let xform = flip * Affine::scale_non_uniform(sx, sy);

                // Apply crop if any
                let crop_left = base.crop_left;
                let crop_top = base.crop_top;
                let crop_right = base.crop_right;
                let crop_bottom = base.crop_bottom;
                let has_crop = crop_left > 0.0 || crop_top > 0.0 || crop_right > 0.0 || crop_bottom > 0.0;

                if has_crop {
                    let draw_w = size.width - crop_left - crop_right;
                    let draw_h = size.height - crop_top - crop_bottom;
                    if draw_w > 0.0 && draw_h > 0.0 {
                        let clip_rect = Rect::new(crop_left, crop_top, crop_left + draw_w, crop_top + draw_h);
                        scene.push_layer(
                            Fill::NonZero,
                            BlendMode::new(Mix::Normal, peniko::Compose::SrcOver),
                            1.0,
                            Affine::IDENTITY,
                            &clip_rect,
                        );
                        scene.draw_image(&image_brush, xform);
                        scene.pop_layer();
                    }
                } else {
                    scene.draw_image(&image_brush, xform);
                }
            }
        }
        NodeKind::Text(text_props) => {
            let buffer = text_engine.layout_text(text_props, size.width);
            crate::text_render::render_text_to_scene(
                scene,
                text_props,
                &buffer,
                text_engine,
                flip,
                1.0, // full opacity — compositor handles layer opacity
                size.width,
                size.height,
            );
        }
        NodeKind::Shape(shape_props) => {
            shape_render::render_shape(
                scene,
                shape_props,
                size.width,
                size.height,
                flip,
                1.0, // full opacity
            );
        }
        NodeKind::Group(_) => {}
    }
}

/// Render selection gizmos (bounding boxes and handles) for selected nodes.
fn render_selection_gizmos(
    scene: &mut Scene,
    doc: &Document,
    viewport_transform: Affine,
    selection: &SelectionInfo,
) {
    let gizmo_color = Color::from_rgba8(255, 165, 0, 255); // Orange
    let handle_size = 6.0;

    for node in &doc.nodes {
        let id = node.base.identity.id.to_string();
        if !selection.selected_ids.contains(&id) {
            continue;
        }

        let size = &node.base.size;
        let node_transform = to_kurbo_affine(&node.base.transform, size);
        let full_transform = viewport_transform * node_transform;

        // Bounding box
        let bbox = Rect::new(0.0, 0.0, size.width, size.height);
        let stroke = kurbo::Stroke::new(1.5);
        scene.stroke(&stroke, full_transform, &Brush::Solid(gizmo_color), None, &bbox);

        // 8 resize handles (4 corners + 4 edges)
        let handle_positions = [
            (0.0, 0.0),
            (size.width / 2.0, 0.0),
            (size.width, 0.0),
            (size.width, size.height / 2.0),
            (size.width, size.height),
            (size.width / 2.0, size.height),
            (0.0, size.height),
            (0.0, size.height / 2.0),
        ];

        let handle_fill = Color::from_rgba8(255, 255, 255, 255);
        for (hx, hy) in handle_positions {
            let handle_rect = Rect::new(
                hx - handle_size / 2.0,
                hy - handle_size / 2.0,
                hx + handle_size / 2.0,
                hy + handle_size / 2.0,
            );
            scene.fill(Fill::NonZero, full_transform, &Brush::Solid(handle_fill), None, &handle_rect);
            scene.stroke(&kurbo::Stroke::new(1.0), full_transform, &Brush::Solid(gizmo_color), None, &handle_rect);
        }
    }
}
