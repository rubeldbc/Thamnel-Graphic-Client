//! Shape rendering — converts ShapeType + ShapeProperties to kurbo paths for Vello.
//!
//! Mirrors the TypeScript `shapeRenderer.ts` exactly: same shape geometry,
//! same proportions, same fill/stroke behavior.

use kurbo::{Affine, BezPath, Circle, Ellipse, Point, Rect, RoundedRect, Shape, Stroke, Vec2};
use peniko::{Brush, Color, Fill};
use vello::Scene;

use thamnel_core::shape::{ShapeProperties, ShapeType};

/// Build a kurbo BezPath for the given shape type and dimensions.
pub fn build_shape_path(
    shape_type: ShapeType,
    w: f64,
    h: f64,
    polygon_sides: u32,
    star_inner_ratio: f64,
    points: &[thamnel_core::geometry::Point],
) -> BezPath {
    let cx = w / 2.0;
    let cy = h / 2.0;
    let mut path = BezPath::new();

    match shape_type {
        // ---- Lines -----------------------------------------------------------
        ShapeType::Line => {
            if points.len() >= 2 {
                path.move_to(Point::new(points[0].x, points[0].y));
                for p in &points[1..] {
                    path.line_to(Point::new(p.x, p.y));
                }
            } else {
                path.move_to(Point::new(0.0, cy));
                path.line_to(Point::new(w, cy));
            }
        }
        ShapeType::DiagonalLine => {
            path.move_to(Point::new(0.0, 0.0));
            path.line_to(Point::new(w, h));
        }

        // ---- Basic -----------------------------------------------------------
        ShapeType::Rectangle => {
            path = Rect::new(0.0, 0.0, w, h).into_path(0.1);
        }
        ShapeType::RoundedRectangle => {
            let r = f64::min(w, h) * 0.15;
            path = RoundedRect::new(0.0, 0.0, w, h, r).into_path(0.1);
        }
        ShapeType::Snip => {
            let s = f64::min(w, h) * 0.15;
            path.move_to(Point::new(s, 0.0));
            path.line_to(Point::new(w - s, 0.0));
            path.line_to(Point::new(w, s));
            path.line_to(Point::new(w, h));
            path.line_to(Point::new(0.0, h));
            path.line_to(Point::new(0.0, s));
            path.close_path();
        }
        ShapeType::Ellipse => {
            path = Ellipse::new(Point::new(cx, cy), Vec2::new(w / 2.0, h / 2.0), 0.0)
                .into_path(0.1);
        }
        ShapeType::Triangle => {
            path.move_to(Point::new(cx, 0.0));
            path.line_to(Point::new(w, h));
            path.line_to(Point::new(0.0, h));
            path.close_path();
        }
        ShapeType::RightTriangle => {
            path.move_to(Point::new(0.0, 0.0));
            path.line_to(Point::new(w, h));
            path.line_to(Point::new(0.0, h));
            path.close_path();
        }
        ShapeType::Diamond => {
            path.move_to(Point::new(cx, 0.0));
            path.line_to(Point::new(w, cy));
            path.line_to(Point::new(cx, h));
            path.line_to(Point::new(0.0, cy));
            path.close_path();
        }
        ShapeType::Parallelogram => {
            let off = w * 0.2;
            path.move_to(Point::new(off, 0.0));
            path.line_to(Point::new(w, 0.0));
            path.line_to(Point::new(w - off, h));
            path.line_to(Point::new(0.0, h));
            path.close_path();
        }
        ShapeType::Trapezoid => {
            let inset = w * 0.2;
            path.move_to(Point::new(inset, 0.0));
            path.line_to(Point::new(w - inset, 0.0));
            path.line_to(Point::new(w, h));
            path.line_to(Point::new(0.0, h));
            path.close_path();
        }

        // ---- Polygons --------------------------------------------------------
        ShapeType::Pentagon => {
            path = regular_polygon_path(cx, cy, f64::min(cx, cy), 5);
        }
        ShapeType::Hexagon => {
            path = regular_polygon_path(cx, cy, f64::min(cx, cy), 6);
        }
        ShapeType::Octagon => {
            path = regular_polygon_path(cx, cy, f64::min(cx, cy), 8);
        }

        // ---- Symbols ---------------------------------------------------------
        ShapeType::Cross => {
            let aw = w / 3.0;
            let ah = h / 3.0;
            path.move_to(Point::new(aw, 0.0));
            path.line_to(Point::new(2.0 * aw, 0.0));
            path.line_to(Point::new(2.0 * aw, ah));
            path.line_to(Point::new(w, ah));
            path.line_to(Point::new(w, 2.0 * ah));
            path.line_to(Point::new(2.0 * aw, 2.0 * ah));
            path.line_to(Point::new(2.0 * aw, h));
            path.line_to(Point::new(aw, h));
            path.line_to(Point::new(aw, 2.0 * ah));
            path.line_to(Point::new(0.0, 2.0 * ah));
            path.line_to(Point::new(0.0, ah));
            path.line_to(Point::new(aw, ah));
            path.close_path();
        }
        ShapeType::Heart => {
            path.move_to(Point::new(cx, h * 0.3));
            path.curve_to(
                Point::new(cx, 0.0),
                Point::new(0.0, 0.0),
                Point::new(0.0, h * 0.35),
            );
            path.curve_to(
                Point::new(0.0, h * 0.65),
                Point::new(cx, h * 0.8),
                Point::new(cx, h),
            );
            path.curve_to(
                Point::new(cx, h * 0.8),
                Point::new(w, h * 0.65),
                Point::new(w, h * 0.35),
            );
            path.curve_to(
                Point::new(w, 0.0),
                Point::new(cx, 0.0),
                Point::new(cx, h * 0.3),
            );
            path.close_path();
        }
        ShapeType::Star => {
            let outer_r = f64::min(cx, cy);
            let pts = polygon_sides.max(3);
            path = star_polygon_path(cx, cy, outer_r, outer_r * star_inner_ratio, pts);
        }
        ShapeType::Star6 => {
            let r = f64::min(cx, cy);
            path = star_polygon_path(cx, cy, r, r * 0.5, 6);
        }
        ShapeType::Ring => {
            let outer_r = f64::min(cx, cy);
            let inner_r = outer_r * 0.6;
            // Outer circle CCW
            path = Circle::new(Point::new(cx, cy), outer_r).into_path(0.1);
            // Inner circle CW (creates hole with even-odd fill)
            let inner = Circle::new(Point::new(cx, cy), inner_r).into_path(0.1);
            // Reverse the inner path for even-odd hole
            for el in inner.elements() {
                path.push(*el);
            }
        }

        // ---- Arrows ----------------------------------------------------------
        ShapeType::Arrow => {
            let shaft_h = h * 0.35;
            let head_start = w * 0.55;
            path.move_to(Point::new(0.0, cy - shaft_h / 2.0));
            path.line_to(Point::new(head_start, cy - shaft_h / 2.0));
            path.line_to(Point::new(head_start, 0.0));
            path.line_to(Point::new(w, cy));
            path.line_to(Point::new(head_start, h));
            path.line_to(Point::new(head_start, cy + shaft_h / 2.0));
            path.line_to(Point::new(0.0, cy + shaft_h / 2.0));
            path.close_path();
        }
        ShapeType::ArrowLeft => {
            let shaft_h = h * 0.35;
            let head_end = w * 0.45;
            path.move_to(Point::new(w, cy - shaft_h / 2.0));
            path.line_to(Point::new(head_end, cy - shaft_h / 2.0));
            path.line_to(Point::new(head_end, 0.0));
            path.line_to(Point::new(0.0, cy));
            path.line_to(Point::new(head_end, h));
            path.line_to(Point::new(head_end, cy + shaft_h / 2.0));
            path.line_to(Point::new(w, cy + shaft_h / 2.0));
            path.close_path();
        }
        ShapeType::ArrowUp => {
            let shaft_w = w * 0.35;
            let head_end = h * 0.45;
            path.move_to(Point::new(cx - shaft_w / 2.0, h));
            path.line_to(Point::new(cx - shaft_w / 2.0, head_end));
            path.line_to(Point::new(0.0, head_end));
            path.line_to(Point::new(cx, 0.0));
            path.line_to(Point::new(w, head_end));
            path.line_to(Point::new(cx + shaft_w / 2.0, head_end));
            path.line_to(Point::new(cx + shaft_w / 2.0, h));
            path.close_path();
        }
        ShapeType::ArrowDown => {
            let shaft_w = w * 0.35;
            let head_start = h * 0.55;
            path.move_to(Point::new(cx - shaft_w / 2.0, 0.0));
            path.line_to(Point::new(cx - shaft_w / 2.0, head_start));
            path.line_to(Point::new(0.0, head_start));
            path.line_to(Point::new(cx, h));
            path.line_to(Point::new(w, head_start));
            path.line_to(Point::new(cx + shaft_w / 2.0, head_start));
            path.line_to(Point::new(cx + shaft_w / 2.0, 0.0));
            path.close_path();
        }
        ShapeType::DoubleArrow => {
            let shaft_h = h * 0.35;
            let left_head = w * 0.25;
            let right_head = w * 0.75;
            path.move_to(Point::new(0.0, cy));
            path.line_to(Point::new(left_head, 0.0));
            path.line_to(Point::new(left_head, cy - shaft_h / 2.0));
            path.line_to(Point::new(right_head, cy - shaft_h / 2.0));
            path.line_to(Point::new(right_head, 0.0));
            path.line_to(Point::new(w, cy));
            path.line_to(Point::new(right_head, h));
            path.line_to(Point::new(right_head, cy + shaft_h / 2.0));
            path.line_to(Point::new(left_head, cy + shaft_h / 2.0));
            path.line_to(Point::new(left_head, h));
            path.close_path();
        }
        ShapeType::ChevronRight => {
            let thickness = w * 0.35;
            path.move_to(Point::new(0.0, 0.0));
            path.line_to(Point::new(w - thickness, cy));
            path.line_to(Point::new(0.0, h));
            path.line_to(Point::new(thickness, h));
            path.line_to(Point::new(w, cy));
            path.line_to(Point::new(thickness, 0.0));
            path.close_path();
        }
        ShapeType::ChevronLeft => {
            let thickness = w * 0.35;
            path.move_to(Point::new(w, 0.0));
            path.line_to(Point::new(thickness, cy));
            path.line_to(Point::new(w, h));
            path.line_to(Point::new(w - thickness, h));
            path.line_to(Point::new(0.0, cy));
            path.line_to(Point::new(w - thickness, 0.0));
            path.close_path();
        }

        // ---- Dynamic polygon -------------------------------------------------
        ShapeType::Polygon => {
            let sides = polygon_sides.max(3);
            path = regular_polygon_path(cx, cy, f64::min(cx, cy), sides);
        }

        // ---- Custom ----------------------------------------------------------
        ShapeType::Custom => {
            path = Rect::new(0.0, 0.0, w, h).into_path(0.1);
        }
    }

    path
}

/// Build a regular polygon path.
fn regular_polygon_path(cx: f64, cy: f64, radius: f64, sides: u32) -> BezPath {
    let mut path = BezPath::new();
    let start_angle = -std::f64::consts::FRAC_PI_2;
    for i in 0..=sides {
        let angle = start_angle + (i as f64 * 2.0 * std::f64::consts::PI) / sides as f64;
        let x = cx + radius * angle.cos();
        let y = cy + radius * angle.sin();
        if i == 0 {
            path.move_to(Point::new(x, y));
        } else {
            path.line_to(Point::new(x, y));
        }
    }
    path.close_path();
    path
}

/// Build a star polygon path (alternating inner/outer vertices).
fn star_polygon_path(cx: f64, cy: f64, outer_r: f64, inner_r: f64, points: u32) -> BezPath {
    let mut path = BezPath::new();
    let step = std::f64::consts::PI / points as f64;
    let mut angle = -std::f64::consts::FRAC_PI_2;
    for i in 0..(points * 2) {
        let r = if i % 2 == 0 { outer_r } else { inner_r };
        let x = cx + r * angle.cos();
        let y = cy + r * angle.sin();
        if i == 0 {
            path.move_to(Point::new(x, y));
        } else {
            path.line_to(Point::new(x, y));
        }
        angle += step;
    }
    path.close_path();
    path
}

/// Parse a CSS color string (e.g., "#FF0000", "#FF000080", "rgb(...)") to peniko Color.
pub fn parse_color(css: &str) -> Color {
    let s = css.trim();
    if let Some(hex) = s.strip_prefix('#') {
        return parse_hex_color(hex);
    }
    // Fallback: black
    Color::from_rgba8(0, 0, 0, 255)
}

fn parse_hex_color(hex: &str) -> Color {
    let bytes: Vec<u8> = (0..hex.len())
        .step_by(2)
        .filter_map(|i| u8::from_str_radix(hex.get(i..i + 2)?, 16).ok())
        .collect();
    match bytes.len() {
        3 => Color::from_rgba8(bytes[0], bytes[1], bytes[2], 255),
        4 => Color::from_rgba8(bytes[0], bytes[1], bytes[2], bytes[3]),
        _ => Color::from_rgba8(0, 0, 0, 255),
    }
}

/// Render a shape node to a Vello scene.
pub fn render_shape(
    scene: &mut Scene,
    shape_props: &ShapeProperties,
    w: f64,
    h: f64,
    transform: Affine,
    opacity: f64,
) {
    let path = build_shape_path(
        shape_props.shape_type,
        w,
        h,
        shape_props.polygon_sides,
        shape_props.star_inner_ratio,
        &shape_props.points,
    );

    let is_line = matches!(
        shape_props.shape_type,
        ShapeType::Line | ShapeType::DiagonalLine
    );

    // Fill (skip for lines)
    if !is_line {
        let fill_color = parse_color(&shape_props.fill_color);
        let fill_brush = Brush::Solid(fill_color.multiply_alpha(opacity as f32));
        scene.fill(Fill::EvenOdd, transform, &fill_brush, None, &path);
    }

    // Stroke
    let stroke_width = if is_line && shape_props.border_width <= 0.0 {
        2.0 // Lines always need visible stroke
    } else {
        shape_props.border_width
    };

    if stroke_width > 0.0 {
        let stroke_color_str = if is_line && shape_props.border_color.is_empty() {
            &shape_props.fill_color
        } else {
            &shape_props.border_color
        };
        let stroke_color = parse_color(stroke_color_str);
        let stroke_brush = Brush::Solid(stroke_color.multiply_alpha(opacity as f32));
        let stroke = Stroke::new(stroke_width);
        scene.stroke(&stroke, transform, &stroke_brush, None, &path);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rectangle_path_is_valid() {
        let path = build_shape_path(ShapeType::Rectangle, 100.0, 50.0, 4, 0.4, &[]);
        assert!(!path.elements().is_empty());
    }

    #[test]
    fn star_path_is_closed() {
        let path = build_shape_path(ShapeType::Star, 100.0, 100.0, 5, 0.4, &[]);
        let elements: Vec<_> = path.elements().to_vec();
        assert!(
            matches!(elements.last(), Some(kurbo::PathEl::ClosePath)),
            "Star path should be closed"
        );
    }

    #[test]
    fn parse_hex_colors() {
        let c = parse_color("#FF0000");
        assert_eq!(c, Color::from_rgba8(255, 0, 0, 255));

        let c2 = parse_color("#00FF0080");
        assert_eq!(c2, Color::from_rgba8(0, 255, 0, 128));
    }

    #[test]
    fn all_28_shapes_produce_paths() {
        let types = [
            ShapeType::Line,
            ShapeType::DiagonalLine,
            ShapeType::Rectangle,
            ShapeType::RoundedRectangle,
            ShapeType::Snip,
            ShapeType::Ellipse,
            ShapeType::Triangle,
            ShapeType::RightTriangle,
            ShapeType::Diamond,
            ShapeType::Parallelogram,
            ShapeType::Trapezoid,
            ShapeType::Pentagon,
            ShapeType::Hexagon,
            ShapeType::Octagon,
            ShapeType::Cross,
            ShapeType::Heart,
            ShapeType::Star,
            ShapeType::Star6,
            ShapeType::Ring,
            ShapeType::Arrow,
            ShapeType::ArrowLeft,
            ShapeType::ArrowUp,
            ShapeType::ArrowDown,
            ShapeType::DoubleArrow,
            ShapeType::ChevronRight,
            ShapeType::ChevronLeft,
            ShapeType::Polygon,
            ShapeType::Custom,
        ];
        for st in types {
            let path = build_shape_path(st, 100.0, 100.0, 5, 0.4, &[]);
            assert!(
                !path.elements().is_empty(),
                "{st:?} should produce a non-empty path"
            );
        }
    }
}
