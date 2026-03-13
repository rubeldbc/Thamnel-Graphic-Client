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

/// Build the full document scene for rendering.
pub fn build_document_scene(
    scene: &mut Scene,
    doc: &Document,
    viewport: &Viewport,
    selection: &SelectionInfo,
    image_cache: &HashMap<String, DecodedImage>,
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

        render_node(scene, node, viewport_transform, image_cache, text_engine);
    }

    // Render selection gizmos
    if !selection.selected_ids.is_empty() {
        render_selection_gizmos(scene, doc, viewport_transform, selection);
    }
}

/// Render a single node to the scene.
fn render_node(
    scene: &mut Scene,
    node: &Node,
    viewport_transform: Affine,
    image_cache: &HashMap<String, DecodedImage>,
    text_engine: &mut TextEngine,
) {
    let base = &node.base;
    let size = &base.size;
    let opacity = base.opacity;

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
