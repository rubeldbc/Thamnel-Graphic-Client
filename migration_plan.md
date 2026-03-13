# Thamnel Graphics Editor — Migration Plan (Phases 0–4)

## Scope

Migrate **only what currently exists and works** from TypeScript Canvas to Rust wgpu+Vello.
Do NOT build new features. Do NOT add AI, networking, or batch export.
The app must compile, launch, and function identically at the end of every phase.

---

## Mandatory Rules

### 1. Test After Every Phase

After completing each phase (0, 1, 2, 3, 4), a **full verification pass** must be run
before proceeding to the next phase. This includes:

- `cargo test --workspace` — all Rust unit tests pass
- `cargo clippy --workspace` — zero warnings
- `npm run build` — TypeScript compiles with zero errors
- Launch the app and manually verify all existing features still work:
  - Layer panel: create, delete, rename, reorder, drag-drop, groups, visibility, lock, superLock
  - Shape drawing: all 27 shapes, polyline line drawing, shift-snap
  - Selection: click, shift-click, ctrl-click, marquee select
  - Resize/rotate/move handles
  - Properties panel: position, size, rotation, opacity, blend mode, effects, crop
  - Undo/redo
  - Save/load .rbl files (including loading old-format files)
  - Image import and export
  - Smart guides and snapping

**Do NOT start the next phase until every check passes.**

### 2. Shape Creation System — KEEP AS-IS

The current shape creation system (drawing interaction, tool behavior, polyline click-to-place)
**must be preserved exactly as it works today**. This includes:

- `useCanvasInteraction.ts` — mouse/keyboard interaction for shape drawing stays in TypeScript
- `useShapeDrawTool.ts` — shape draw tool logic stays in TypeScript
- `ShapePreviewOverlay.tsx` — live preview during drawing stays in TypeScript
- `CanvasViewport.tsx` — `handleShapeDrawn`, `handlePolylineDrawn` callbacks stay in TypeScript
- All 27 shape types, polyline drawing, shift-snap to 45° — behavior unchanged

**What changes**: Only the **rendering** of already-created shapes moves to Rust (kurbo paths
rendered by Vello). The shape creation interaction (how the user draws shapes with mouse clicks
and drags) stays entirely in the React/TypeScript frontend.

**Allowed**: Use kurbo, Vello, or any Rust library for **rendering** the shape paths after
creation. The Rust side converts `ShapeType` + `ShapeProperties` into kurbo/Vello paths
for display. But the creation UX — the click, drag, polyline point placement, preview
overlay — is NOT touched.

**GC_Core_Plan.md note**: The plan mentions shapes created in a "separate Shape Creator window."
That is a **future feature**. The current inline canvas shape drawing system is kept. The
separate window may be added later alongside the current system, not as a replacement.

### 3. Text System — Migrate Existing + Prepare for cosmic-text

Text functionality already exists in the codebase and **must be migrated**, not skipped:

**Currently working text features (KEEP all behavior):**
- `src/engine/textRenderer.ts` — full text rendering (word wrap, styled runs, alignment,
  shadows, backgrounds, underline, strikethrough, letter spacing, text transform)
- `src/components/Canvas/InlineTextEditor.tsx` — inline text editing overlay (double-click
  to edit, Ctrl+Enter commit, Escape cancel, debounced live update)
- `src/hooks/useTextDrawTool.ts` — text draw tool (drag rectangle to create text layer)
- `src/components/RightPanel/Properties/TextExpander.tsx` — text properties panel
- `src/types/TextProperties.ts` — text data model (TextProperties, StyledRun)

**Migration approach:**
- **Phase 0**: `text.rs` in thamnel-core mirrors the existing `TextProperties` data model
- **Phase 1**: TypeScript TextProperties type updated to mirror Rust struct
- **Phase 2**: Text rendering in Rust replaces `textRenderer.ts`. Use **cosmic-text**
  for text layout and shaping, rendered via Vello. Must reproduce all existing features:
  word wrap, styled runs, alignment, shadows, text backgrounds, underline/strikethrough.
- **Text creation UX stays in TypeScript**: `useTextDrawTool.ts` (drag to create),
  `InlineTextEditor.tsx` (inline editing) — these are UI interactions, not rendering.

**cosmic-text integration** (in thamnel-render, Phase 2):
```rust
// crates/thamnel-render/src/text_render.rs
use cosmic_text::{FontSystem, SwashCache, Buffer, Metrics};

pub fn layout_text(text_props: &TextProperties, width: f64, font_system: &mut FontSystem) -> Buffer { ... }
pub fn render_text(scene: &mut vello::Scene, buffer: &Buffer, transform: &Transform) { ... }
```

This replaces `textRenderer.ts` entirely. After migration, the user will continue
working on text improvements (multilingual, Bengali/Arabic support, better font
management) using cosmic-text as the foundation.

### 4. Code Quality Standards

All code — Rust and TypeScript — must follow these standards at every step:

- **Modular**: Each Rust module (`.rs` file) has a single clear responsibility.
  No god-files. No 1000-line modules. If a module grows beyond ~300 lines, split it.
- **Refactored**: No copy-paste duplication. Extract shared logic into helper functions.
  If the same pattern appears twice, abstract it.
- **Clean public API**: Each crate/module exposes only what consumers need.
  Use `pub(crate)` for internal helpers. Keep `pub` surface minimal.
- **Documented**: Every public Rust type and function has a `///` doc comment
  explaining what it does and why.
- **Error handling**: Use `Result<T, E>` with descriptive error types.
  No `.unwrap()` in production code. Use `thiserror` for library errors.
- **Naming**: Rust follows `snake_case`. TypeScript follows `camelCase`.
  Names must be descriptive — no single-letter variables except loop indices.
- **No dead code**: Remove unused imports, functions, and types immediately.
  `cargo clippy` and TypeScript strict mode enforce this.
- **Small commits**: Commit at each sub-step boundary with a clear message.
  Each commit should compile and pass tests.

---

## Current .rbl File Format

The current .rbl save/load is **plain JSON** (not ZIP). The flow:
- **Save**: `JSON.stringify(project)` → Tauri `save_project` → `fs::write`
- **Load**: Tauri `load_project` → `fs::read_to_string` → `JSON.parse` → `setProject`

The JSON contains the full `ProjectModel` with all `LayerModel` objects including
base64 `imageData` strings inline.

**Migration impact**: When the data model changes from `LayerModel` to `Node` types,
the .rbl JSON structure changes too. A compatibility migration must handle loading
old-format .rbl files. This is addressed in Phase 1.

---

## PHASE 0 — Cargo Workspace + thamnel-core

**Goal**: Build the Rust document model. Zero UI changes. App works exactly as before.

### 0.1 — Create Cargo Workspace

**Create directory structure:**
```
crates/
├── Cargo.toml              ← workspace root
└── thamnel-core/
    ├── Cargo.toml
    └── src/
        ├── lib.rs
        ├── geometry.rs      ← Point, Size, Rect, PathCommand, BezierPath
        ├── transform.rs     ← Animation-ready Transform
        ├── identity.rs      ← NodeIdentity (UUID + binding_key + display_name)
        ├── blend.rs         ← BlendMode enum (17 modes)
        ├── fill.rs          ← FillDefinition, GradientStop
        ├── effects.rs       ← EffectStack, ColorAdjustments
        ├── shape.rs         ← ShapeType enum (27 types), ShapeProperties
        ├── text.rs          ← TextProperties, StyledRun (data model only, no rendering)
        ├── node.rs          ← NodeBase, ImageNode, TextNode, ShapeNode, GroupNode, Node enum
        ├── document.rs      ← Document, Metadata, Manifest
        ├── commands.rs      ← DocumentCommand enum, execute/inverse logic
        └── history.rs       ← Undo/redo stack (command-based)
```

**Create** `crates/Cargo.toml`:
```toml
[workspace]
members = ["thamnel-core"]
resolver = "2"
```

**Update** `src-tauri/Cargo.toml` — add dependency:
```toml
[dependencies]
thamnel-core = { path = "../crates/thamnel-core" }
```

**thamnel-core/Cargo.toml** — minimal deps (NO wgpu, NO kurbo, NO vello):
```toml
[package]
name = "thamnel-core"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4", "serde"] }
```

**Verification**: `cargo build` from `src-tauri/` succeeds. App launches normally.

---

### 0.2 — geometry.rs

Own types. NOT kurbo. Schema-stable, serializable.

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Point { pub x: f64, pub y: f64 }

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Size { pub width: f64, pub height: f64 }

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Rect { pub origin: Point, pub size: Size }

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum PathCommand {
    MoveTo(Point),
    LineTo(Point),
    CurveTo { ctrl1: Point, ctrl2: Point, to: Point },
    Close,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BezierPath { pub commands: Vec<PathCommand> }
```

---

### 0.3 — transform.rs

Animation-ready. NOT flat x/y/width/height.

```rust
use serde::{Deserialize, Serialize};
use crate::geometry::Point;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Transform {
    pub anchor: Point,       // normalized 0–1
    pub position: Point,     // world-space position
    pub scale: Point,        // scale factors (1.0 = 100%)
    pub rotation: f64,       // degrees
    pub skew: Point,         // skew in degrees
}

impl Default for Transform {
    fn default() -> Self {
        Self {
            anchor: Point { x: 0.5, y: 0.5 },
            position: Point { x: 0.0, y: 0.0 },
            scale: Point { x: 1.0, y: 1.0 },
            rotation: 0.0,
            skew: Point { x: 0.0, y: 0.0 },
        }
    }
}
```

---

### 0.4 — identity.rs

Triple identity per GC_Core_Plan.md.

```rust
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NodeIdentity {
    pub id: Uuid,
    pub binding_key: Option<String>,
    pub display_name: String,
}

impl NodeIdentity {
    pub fn new(display_name: &str) -> Self {
        Self {
            id: Uuid::new_v4(),
            binding_key: None,
            display_name: display_name.to_string(),
        }
    }
}
```

---

### 0.5 — blend.rs

All 17 blend modes matching current `enums.ts`.

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum BlendMode {
    Normal, Multiply, Screen, Overlay, Darken, Lighten,
    ColorDodge, ColorBurn, HardLight, SoftLight, Difference,
    Exclusion, Hue, Saturation, Color, Luminosity, Dissolve,
}

impl Default for BlendMode {
    fn default() -> Self { Self::Normal }
}
```

---

### 0.6 — fill.rs

Mirrors current `FillDefinition.ts`.

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FillType {
    Solid, LinearGradient, RadialGradient, SweepGradient, Image,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ImageStretchMode {
    Tile, Stretch, Fit, Fill,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GradientStop {
    pub color: String,
    pub position: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FillDefinition {
    #[serde(rename = "type")]
    pub fill_type: FillType,
    pub solid_color: String,
    pub gradient_stops: Vec<GradientStop>,
    pub gradient_angle: f64,
    pub gradient_center_x: f64,
    pub gradient_center_y: f64,
    pub gradient_radius: f64,
    pub image_path: Option<String>,
    pub image_stretch: ImageStretchMode,
    pub global_alpha: f64,
}
```

---

### 0.7 — effects.rs

Mirrors current `LayerEffect.ts` — every field that currently exists.

```rust
use serde::{Deserialize, Serialize};
use crate::blend::BlendMode;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EffectStack {
    // Brightness
    pub brightness: f64,
    pub brightness_enabled: bool,
    // Contrast
    pub contrast: f64,
    pub contrast_enabled: bool,
    // Saturation
    pub saturation: f64,
    pub saturation_enabled: bool,
    // Hue
    pub hue: f64,
    pub hue_enabled: bool,
    // Simple toggles
    pub grayscale: bool,
    pub sepia: bool,
    pub invert: bool,
    // Sharpen
    pub sharpen: f64,
    pub sharpen_enabled: bool,
    // Vignette
    pub vignette: f64,
    pub vignette_enabled: bool,
    // Pixelate
    pub pixelate: f64,
    pub pixelate_enabled: bool,
    // Color tint
    pub color_tint_color: String,
    pub color_tint_intensity: f64,
    pub color_tint_enabled: bool,
    // Noise
    pub noise: f64,
    pub noise_enabled: bool,
    // Posterize
    pub posterize: f64,
    pub posterize_enabled: bool,
    // Gaussian blur
    pub gaussian_blur: f64,
    pub gaussian_blur_enabled: bool,
    // Drop shadow
    pub drop_shadow_color: String,
    pub drop_shadow_offset_x: f64,
    pub drop_shadow_offset_y: f64,
    pub drop_shadow_blur: f64,
    pub drop_shadow_opacity: f64,
    pub drop_shadow_enabled: bool,
    // Outer glow
    pub outer_glow_color: String,
    pub outer_glow_radius: f64,
    pub outer_glow_intensity: f64,
    pub outer_glow_enabled: bool,
    // Cut stroke
    pub cut_stroke_color: String,
    pub cut_stroke_width: f64,
    pub cut_stroke_enabled: bool,
    // Rim light
    pub rim_light_color: String,
    pub rim_light_angle: f64,
    pub rim_light_intensity: f64,
    pub rim_light_width: f64,
    pub rim_light_enabled: bool,
    // Split toning
    pub split_toning_highlight_color: String,
    pub split_toning_shadow_color: String,
    pub split_toning_balance: f64,
    pub split_toning_enabled: bool,
    // Smooth stroke
    pub smooth_stroke_width: f64,
    pub smooth_stroke_color: String,
    pub smooth_stroke_opacity: f64,
    pub smooth_stroke_enabled: bool,
    // Blend overlay
    pub blend_overlay_image: Option<String>,
    pub blend_overlay_opacity: f64,
    pub blend_overlay_mode: BlendMode,
    pub blend_overlay_enabled: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColorAdjustments {
    pub temperature: f64,
    pub tint: f64,
    pub exposure: f64,
    pub highlights: f64,
    pub shadows: f64,
}
```

---

### 0.8 — shape.rs

All 27 shape types + ShapeProperties matching current `ShapeProperties.ts`.

```rust
use serde::{Deserialize, Serialize};
use crate::geometry::Point;
use crate::fill::{FillDefinition, FillType, ImageStretchMode};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ShapeType {
    Rectangle, RoundedRectangle, Ellipse, Triangle, Star, Diamond,
    Heart, Pentagon, Hexagon, Octagon, Cross, Arrow, DoubleArrow,
    Chevron, Parallelogram, Trapezoid, Polygon, Arc, Ring, Wedge,
    Line, DiagonalLine, SpeechBubble, Callout, RoundedTriangle,
    CutCornerRectangle, Custom,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TransparencyMaskType {
    None, Linear, Radial,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShapeProperties {
    pub shape_type: ShapeType,
    pub fill_color: String,
    pub fill_type: FillType,
    pub fill: Option<FillDefinition>,
    pub border_color: String,
    pub border_width: f64,
    pub corner_radius: f64,
    pub image_fill_path: Option<String>,
    pub image_fill_stretch: String,
    pub mask_mode: bool,
    pub path_data: Option<String>,
    pub points: Vec<Point>,
    pub is_closed: bool,
    pub opacity: f64,
    pub is_image_filled: bool,
    pub image_fill_data: Option<String>,
    pub image_fill_offset_x: f64,
    pub image_fill_offset_y: f64,
    pub image_fill_scale_x: f64,
    pub image_fill_scale_y: f64,
    pub image_fill_rotation: f64,
    pub image_fill_crop_top: f64,
    pub image_fill_crop_bottom: f64,
    pub image_fill_crop_left: f64,
    pub image_fill_crop_right: f64,
    pub mask_type: TransparencyMaskType,
    pub mask_angle: f64,
    pub mask_top: f64,
    pub mask_bottom: f64,
    pub mask_left: f64,
    pub mask_right: f64,
    pub mask_center_x: f64,
    pub mask_center_y: f64,
    pub polygon_sides: u32,
    pub star_inner_ratio: f64,
}
```

---

### 0.9 — text.rs

Data model only (no rendering). Mirrors current `TextProperties.ts`.

```rust
use serde::{Deserialize, Serialize};
use crate::fill::FillDefinition;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TextAlignment { Left, Center, Right, Justify }

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TextTransform { None, Uppercase, Lowercase, Capitalize }

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StyledRun {
    pub start_index: usize,
    pub length: usize,
    pub font_weight: Option<u32>,
    pub font_style: Option<String>,
    pub color: Option<String>,
    pub underline: Option<bool>,
    pub strikethrough: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextProperties {
    pub text: String,
    pub font_family: String,
    pub font_size: f64,
    pub font_weight: u32,
    pub font_style: String,
    pub color: String,
    pub stroke_color: String,
    pub stroke_width: f64,
    pub letter_spacing: f64,
    pub line_height: f64,
    pub alignment: TextAlignment,
    pub underline: bool,
    pub strikethrough: bool,
    pub has_background: bool,
    pub background_color: String,
    pub background_opacity: f64,
    pub background_padding: f64,
    pub background_corner_radius: f64,
    pub width_squeeze: f64,
    pub height_squeeze: f64,
    pub transform: TextTransform,
    pub fill: FillDefinition,
    pub shadow_offset_x: f64,
    pub shadow_offset_y: f64,
    pub shadow_blur: f64,
    pub shadow_color: String,
    pub runs: Vec<StyledRun>,
}
```

---

### 0.10 — node.rs

Typed nodes replace the flat `LayerModel`.

```rust
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::identity::NodeIdentity;
use crate::transform::Transform;
use crate::geometry::Size;
use crate::blend::BlendMode;
use crate::effects::{EffectStack, ColorAdjustments};
use crate::shape::ShapeProperties;
use crate::text::TextProperties;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CropRect {
    pub top: f64,
    pub bottom: f64,
    pub left: f64,
    pub right: f64,
}

impl Default for CropRect {
    fn default() -> Self {
        Self { top: 0.0, bottom: 0.0, left: 0.0, right: 0.0 }
    }
}

/// Common properties shared by ALL node types.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeBase {
    pub identity: NodeIdentity,
    pub transform: Transform,
    pub size: Size,
    pub opacity: f64,
    pub visible: bool,
    pub locked: bool,
    pub super_locked: bool,
    pub blend_mode: BlendMode,
    pub flip_horizontal: bool,
    pub flip_vertical: bool,
    pub padding: f64,
    pub effects: EffectStack,
    pub color_adjustments: ColorAdjustments,
    pub crop: CropRect,
    pub parent_group_id: Option<Uuid>,
    pub is_background: bool,
    pub is_frame_receiver: bool,
    pub is_live_date_time: bool,
    pub render_version: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageNode {
    #[serde(flatten)]
    pub base: NodeBase,
    /// Base64 data URL or asset reference path.
    pub image_data: Option<String>,
    pub thumbnail_data: Option<String>,
    pub blur_radius: f64,
    pub blur_mask_data: Option<Vec<u8>>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextNode {
    #[serde(flatten)]
    pub base: NodeBase,
    pub text_properties: TextProperties,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShapeNode {
    #[serde(flatten)]
    pub base: NodeBase,
    pub shape_properties: ShapeProperties,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupNode {
    #[serde(flatten)]
    pub base: NodeBase,
    pub child_ids: Vec<Uuid>,
    pub group_color: Option<String>,
    pub is_expanded: bool,
}

/// Tagged node enum.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Node {
    Image(ImageNode),
    Text(TextNode),
    Shape(ShapeNode),
    Group(GroupNode),
}

impl Node {
    /// Access the common NodeBase regardless of node type.
    pub fn base(&self) -> &NodeBase {
        match self {
            Node::Image(n) => &n.base,
            Node::Text(n) => &n.base,
            Node::Shape(n) => &n.base,
            Node::Group(n) => &n.base,
        }
    }

    pub fn base_mut(&mut self) -> &mut NodeBase {
        match self {
            Node::Image(n) => &mut n.base,
            Node::Text(n) => &mut n.base,
            Node::Shape(n) => &mut n.base,
            Node::Group(n) => &mut n.base,
        }
    }

    pub fn id(&self) -> Uuid {
        self.base().identity.id
    }
}
```

---

### 0.11 — document.rs

Document model with extensions map. Mirrors current `ProjectModel.ts` structure.

```rust
use std::collections::BTreeMap;
use serde::{Deserialize, Serialize};
use crate::node::Node;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Metadata {
    pub name: String,
    pub author: String,
    pub created_at: String,
    pub modified_at: String,
    pub description: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub project_id: String,
    pub version: String,
    pub canvas_width: f64,
    pub canvas_height: f64,
    pub background_color: String,
    pub nodes: Vec<Node>,
    pub video_paths: Vec<String>,
    pub timestamps: BTreeMap<String, String>,
    pub metadata: Metadata,
    /// Namespaced extensions — preserved by apps that don't understand them.
    #[serde(default)]
    pub extensions: BTreeMap<String, serde_json::Value>,
}
```

---

### 0.12 — commands.rs + history.rs

Command-based undo/redo replaces snapshot cloning.

```rust
// commands.rs — every mutation the UI can perform
pub enum DocumentCommand {
    AddNode { node: Node, index: Option<usize> },
    RemoveNode { id: Uuid },
    UpdateNodeBase { id: Uuid, changes: serde_json::Value },
    UpdateShapeProperties { id: Uuid, changes: serde_json::Value },
    UpdateTextProperties { id: Uuid, changes: serde_json::Value },
    MoveNode { id: Uuid, new_index: usize },
    MoveNodeSubtree { id: Uuid, new_index: usize },
    SetCanvasSize { width: f64, height: f64 },
    SetBackgroundColor { color: String },
    // Batch: group multiple commands into one undo step
    Batch(Vec<DocumentCommand>),
}
```

```rust
// history.rs
pub struct History {
    undo_stack: Vec<DocumentCommand>,  // stores INVERSE commands
    redo_stack: Vec<DocumentCommand>,
    max_undo: usize,                   // 50, matching current MAX_UNDO
}

impl History {
    pub fn push(&mut self, inverse_cmd: DocumentCommand) { ... }
    pub fn undo(&mut self) -> Option<DocumentCommand> { ... }
    pub fn redo(&mut self) -> Option<DocumentCommand> { ... }
}
```

---

### 0.13 — Tauri IPC Bridge

**New file**: `src-tauri/src/document_bridge.rs`

Expose Rust document operations to the React frontend:

```rust
use std::sync::Mutex;
use tauri::State;
use thamnel_core::{Document, DocumentCommand};

pub struct AppDocumentState {
    pub document: Mutex<Document>,
    pub history: Mutex<History>,
}

#[tauri::command]
pub fn get_document(state: State<AppDocumentState>) -> Result<Document, String> { ... }

#[tauri::command]
pub fn apply_command(state: State<AppDocumentState>, cmd: DocumentCommand) -> Result<Document, String> { ... }

#[tauri::command]
pub fn undo_document(state: State<AppDocumentState>) -> Result<Document, String> { ... }

#[tauri::command]
pub fn redo_document(state: State<AppDocumentState>) -> Result<Document, String> { ... }
```

Register in `lib.rs` invoke_handler. Manage `AppDocumentState` via `tauri::Builder::manage()`.

---

### 0.14 — .rbl Compatibility

Current .rbl files are JSON with `ProjectModel` shape. Two options:

**Option A (recommended)**: Add a `load_legacy_rbl` Tauri command that reads old-format
JSON and converts `ProjectModel` → `Document` in Rust. Save always uses new format.

**Option B**: Keep the new format close enough to the old one via `#[serde(rename)]`
so existing files can be loaded directly. This is fragile with the flat-to-nested
transform change.

The migration converter maps:
```
Old ProjectModel.layers[i].x        → Node.transform.position.x
Old ProjectModel.layers[i].y        → Node.transform.position.y
Old ProjectModel.layers[i].width    → Node.size.width
Old ProjectModel.layers[i].height   → Node.size.height
Old ProjectModel.layers[i].rotation → Node.transform.rotation
Old ProjectModel.layers[i].anchorX  → Node.transform.anchor.x
Old ProjectModel.layers[i].anchorY  → Node.transform.anchor.y
Old ProjectModel.layers[i].name     → Node.identity.display_name
Old ProjectModel.layers[i].id       → Node.identity.id (convert string → UUID)
Old ProjectModel.layers[i].type     → Node enum tag
```

**Verification**: Load an old .rbl, verify all layers appear correctly, save in new format.

---

### Phase 0 — Completion Criteria

- [ ] `cargo test -p thamnel-core` passes — all types serialize/deserialize round-trip
- [ ] `cargo build` from `src-tauri/` compiles with thamnel-core dependency
- [ ] App launches and works exactly as before (no UI changes yet)
- [ ] IPC bridge commands callable from browser dev console
- [ ] Old .rbl files can be loaded via migration converter

---

## PHASE 1 — TypeScript Type Migration

**Goal**: Frontend switches from `LayerModel` to TypeScript mirrors of Rust `Node` types.
All UI stays identical. Document mutations go through Tauri IPC → Rust.

### 1.1 — Create TypeScript Mirror Types

New files that exactly mirror the Rust structs (camelCase field names match serde output):

```
src/types/geometry.ts       ← Point, Size, Rect
src/types/transform.ts      ← Transform
src/types/identity.ts       ← NodeIdentity
src/types/node.ts           ← NodeBase, ImageNode, TextNode, ShapeNode, GroupNode, Node
src/types/document.ts       ← Document, Metadata
src/types/effects.ts        ← EffectStack, ColorAdjustments (replaces LayerEffect.ts)
src/types/shape.ts          ← ShapeProperties, ShapeType (replaces ShapeProperties.ts)
src/types/text.ts           ← TextProperties, StyledRun (replaces TextProperties.ts)
src/types/fill.ts           ← FillDefinition, GradientStop (replaces FillDefinition.ts)
src/types/blend.ts          ← BlendMode (extracted from enums.ts)
src/types/enums.ts          ← UI-only enums (ActiveTool, DragMode, etc.) — unchanged
src/types/index.ts          ← Re-exports everything
```

### 1.2 — Compatibility Adapter (TEMPORARY)

During migration, both old and new types coexist. Components are updated one by one.

```typescript
// src/types/compat.ts — DELETE after all components migrated

/** Convert new Node → old LayerModel shape (for components not yet migrated). */
export function nodeToLegacyLayer(node: Node): LegacyLayerModel { ... }

/** Convert old LayerModel → new Node (for loading old .rbl files). */
export function legacyLayerToNode(layer: LegacyLayerModel): Node { ... }
```

### 1.3 — Migrate documentStore.ts

The Zustand store becomes a thin cache of Rust document state.

```typescript
// Every mutation calls Rust IPC
applyCommand: async (cmd: DocumentCommand) => {
    const updated = await invoke<Document>('apply_command', { cmd });
    set({ document: updated });
},

undo: async () => {
    const updated = await invoke<Document>('undo_document');
    set({ document: updated });
},
```

**Selection state stays in TypeScript** — it's a UI concern, not document data.

### 1.4 — Update Components (property access changes)

Every component that reads layer data needs property path updates:

| Old Access | New Access |
|------------|-----------|
| `layer.id` | `node.base.identity.id` |
| `layer.name` | `node.base.identity.display_name` |
| `layer.type` | discriminant on `Node` (`node.type`) |
| `layer.x` | `node.base.transform.position.x` |
| `layer.y` | `node.base.transform.position.y` |
| `layer.width` | `node.base.size.width` |
| `layer.height` | `node.base.size.height` |
| `layer.rotation` | `node.base.transform.rotation` |
| `layer.anchorX` | `node.base.transform.anchor.x` |
| `layer.anchorY` | `node.base.transform.anchor.y` |
| `layer.opacity` | `node.base.opacity` |
| `layer.visible` | `node.base.visible` |
| `layer.locked` | `node.base.locked` |
| `layer.superLocked` | `node.base.superLocked` |
| `layer.blendMode` | `node.base.blendMode` |
| `layer.effects` | `node.base.effects` |
| `layer.colorAdjustments` | `node.base.colorAdjustments` |
| `layer.flipHorizontal` | `node.base.flipHorizontal` |
| `layer.flipVertical` | `node.base.flipVertical` |
| `layer.cropTop` | `node.base.crop.top` |
| `layer.parentGroupId` | `node.base.parentGroupId` |
| `layer.bindingKey` | `node.base.identity.bindingKey` |
| `layer.displayName` | `node.base.identity.displayName` |
| `layer.shapeProperties` | `(node as ShapeNode).shapeProperties` |
| `layer.textProperties` | `(node as TextNode).textProperties` |
| `layer.imageData` | `(node as ImageNode).imageData` |
| `layer.childIds` | `(node as GroupNode).childIds` |

**Files to update** (in recommended order — leaf components first):
1. `src/components/common/*` — no LayerModel refs, skip
2. `src/components/RightPanel/Properties/PositionExpander.tsx`
3. `src/components/RightPanel/Properties/ShapeExpander.tsx`
4. `src/components/RightPanel/Properties/EffectsExpander.tsx`
5. `src/components/RightPanel/Properties/CropExpander.tsx`
6. `src/components/RightPanel/Properties/TextExpander.tsx`
7. `src/components/RightPanel/Properties/PropertiesTab.tsx`
8. `src/components/RightPanel/Layers/LayerItem.tsx`
9. `src/components/RightPanel/Layers/DraggableLayerRow.tsx`
10. `src/components/RightPanel/Layers/LayersTab.tsx`
11. `src/components/RightPanel/Layers/LayerFooterBar.tsx`
12. `src/components/ContextMenus/*.tsx`
13. `src/components/LeftToolbar/LeftToolbar.tsx`
14. `src/components/Canvas/HandleOverlay.tsx`
15. `src/components/Canvas/CanvasViewport.tsx`
16. `src/hooks/useSelectionManager.ts`
17. `src/hooks/useCanvasInteraction.ts`
18. `src/hooks/useShapeDrawTool.ts`
19. `src/hooks/useEraserTool.ts`
20. `src/hooks/useBlurBrushTool.ts`
21. `src/hooks/useClipboard.ts`
22. `src/commands/*.ts`

### 1.5 — Update .rbl Save/Load

**Save**: `Document` (from Rust state) → `JSON.stringify` → `save_project` IPC
**Load**: `load_project` IPC → JSON string → try parse as new `Document`, if fail → try parse
as old `ProjectModel` → convert via `load_legacy_rbl` IPC → set document

### 1.6 — Delete Old Types

```
DELETE: src/types/LayerModel.ts
DELETE: src/types/ProjectModel.ts
DELETE: src/types/ShapeProperties.ts
DELETE: src/types/TextProperties.ts
DELETE: src/types/LayerEffect.ts
DELETE: src/types/FillDefinition.ts
DELETE: src/types/compat.ts
```

### Phase 1 — Completion Criteria

- [ ] All components use `Node` types
- [ ] documentStore calls Rust IPC for every mutation
- [ ] Undo/redo works via Rust command history
- [ ] `npm run build` compiles with zero errors
- [ ] Layer panel works: drag-drop, rename, visibility, lock, superLock, groups
- [ ] Properties panel works: position, rotation, opacity, blend mode, effects
- [ ] Shape drawing works: all 27 shapes, polyline lines
- [ ] Selection works: click, shift-click, marquee
- [ ] Resize/rotate handles work
- [ ] Save/load .rbl works (both old and new format)
- [ ] Old type files deleted

---

## PHASE 2 — Rust Rendering Engine (thamnel-render)

**Goal**: wgpu + Vello replaces TypeScript Canvas rendering. Shapes crisp at any zoom.

### 2.0 — wgpu Headless Spike (MANDATORY)

Before building the renderer, prove wgpu works in Tauri on Windows.

**Create**: `crates/thamnel-render/tests/headless_spike.rs`

4 mandatory tests:
1. Render solid color to texture — window visible
2. Render solid color to texture — window hidden/minimized
3. Render offscreen (no window)
4. Render 500 frames in batch

**DO NOT proceed to 2.1 until all 4 pass.**

### 2.1 — Create thamnel-render Crate

```
crates/thamnel-render/
├── Cargo.toml
└── src/
    ├── lib.rs
    ├── backend.rs          ← RenderBackend trait (pipeline-oriented)
    ├── vello_backend.rs    ← Vello implementation
    ├── conversions.rs      ← thamnel-core geometry → kurbo
    ├── engine.rs           ← wgpu device/queue/surface setup
    ├── compositor.rs       ← Layer compositing, blend modes
    ├── shape_render.rs     ← All 27 shapes → kurbo paths → Vello
    ├── text_render.rs      ← cosmic-text layout → Vello glyphs (replaces textRenderer.ts)
    ├── gizmo_render.rs     ← Selection handles, bounding boxes → Vello
    └── export.rs           ← PNG/JPG export via readback
```

**Cargo.toml dependencies:**
```toml
[dependencies]
thamnel-core = { path = "../thamnel-core" }
wgpu = "24"
vello = "0.4"
kurbo = "0.11"
cosmic-text = "0.12"
image = { version = "0.25", default-features = false, features = ["png", "jpeg", "bmp"] }
```

**cosmic-text included** — text nodes render via cosmic-text + Vello, reproducing all
existing text features (word wrap, styled runs, alignment, shadows, backgrounds).

### 2.2 — RenderBackend Trait

```rust
// backend.rs — pipeline-oriented, NOT per-feature
pub trait RenderBackend {
    fn prepare_resources(&mut self, doc: &Document) -> Result<()>;
    fn build_scene(&mut self, doc: &Document, viewport: &Viewport) -> Result<()>;
    fn render(&mut self, target: &mut RenderTarget) -> Result<()>;
    fn readback(&self, region: Option<Rect>) -> Result<Vec<u8>>;
}

pub struct Viewport {
    pub width: u32,
    pub height: u32,
    pub zoom: f64,
    pub scroll_x: f64,
    pub scroll_y: f64,
}
```

### 2.3 — Vello Shape Rendering

Convert all 27 `ShapeType` variants to kurbo paths. This replaces `shapeRenderer.ts`.

Must handle:
- All shapes from `renderShapePath()` in current `shapeRenderer.ts`
- Fill (solid color, gradient)
- Stroke (border color, border width)
- Polyline points for line shapes
- Star inner ratio
- Polygon sides
- Corner radius for rounded rectangle

### 2.4 — Text Rendering (cosmic-text)

Replaces `textRenderer.ts`. All existing text features must work:

```rust
// crates/thamnel-render/src/text_render.rs

/// Layout text using cosmic-text, matching current textRenderer.ts behavior.
pub fn layout_text(
    text_props: &TextProperties,
    width: f64,
    font_system: &mut FontSystem,
) -> Buffer { ... }

/// Render laid-out text to Vello scene.
pub fn render_text(
    scene: &mut vello::Scene,
    buffer: &Buffer,
    swash_cache: &mut SwashCache,
    transform: &Affine,
) { ... }
```

**Must reproduce these existing features from textRenderer.ts:**
- Word wrapping within layer width
- Styled runs (per-character weight, style, color, underline, strikethrough)
- Text alignment (left, center, right, justify)
- Text transform (uppercase, lowercase, capitalize)
- Letter spacing
- Line height
- Text stroke (outline)
- Text shadow (offsetX, offsetY, blur, color)
- Text background (per-line background box with opacity, padding, corner radius)
- Fill definition (solid color — gradient text is future work)

**Font system initialization**: Load system fonts on startup via `cosmic_text::FontSystem::new()`.
Font management improvements (bundled fonts, fallback chains) are future work built on this foundation.

**Text creation UX unchanged**: `useTextDrawTool.ts`, `InlineTextEditor.tsx` stay in TypeScript.

### 2.5 — Image Rendering

Load base64 image data → decode → create Vello image brush → draw at layer position.

Must handle:
- Crop (cropTop/Bottom/Left/Right)
- Flip horizontal/vertical
- Opacity
- Blend modes

### 2.6 — Selection Gizmo Rendering

Replaces visual rendering from `HandleOverlay.tsx`. Draw via Vello:
- Selection bounding box (orange/green border)
- 8 resize handles (corner + edge)
- Rotation handle
- Anchor point handle
- Marquee selection rectangle
- Smart guide lines

### 2.7 — Effect Rendering

Current effects from `effectsEngine.ts` re-implemented as wgpu operations
within the Vello render pipeline.

**High priority** (currently used and visible):
- Gaussian blur
- Drop shadow
- Outer glow
- Brightness / contrast / saturation / hue
- Grayscale / sepia / invert
- Opacity (per-layer)
- Blend modes (all 17)

**Medium priority** (available in UI):
- Sharpen, vignette, noise, pixelate, posterize
- Color tint, rim light, split toning
- Cut stroke, smooth stroke

### 2.8 — Tauri Frame Delivery

```rust
// src-tauri/src/render_bridge.rs

#[tauri::command]
fn render_frame(
    doc_state: State<AppDocumentState>,
    render_state: State<RenderState>,
    viewport_width: u32,
    viewport_height: u32,
    zoom: f64,
    scroll_x: f64,
    scroll_y: f64,
    selected_ids: Vec<String>,     // for gizmo rendering
) -> Result<Vec<u8>, String> {
    // 1. Lock document
    // 2. Build Vello scene from document
    // 3. Add selection gizmos for selected_ids
    // 4. Render to texture
    // 5. Readback RGBA pixels
    // 6. Return as Vec<u8>
}
```

Frontend `CanvasViewport.tsx`:
```typescript
// Replace compositeAllLayers() call with:
const frame = await invoke<number[]>('render_frame', {
    viewportWidth, viewportHeight, zoom, scrollX, scrollY, selectedIds
});
const imageData = new ImageData(
    new Uint8ClampedArray(frame), viewportWidth, viewportHeight
);
ctx.putImageData(imageData, 0, 0);
```

### 2.9 — Swap Rendering

Once Rust rendering matches TS rendering:

1. Update `CanvasViewport.tsx` to call `render_frame` instead of TS compositor
2. Update `exportImage` in `fileCommands.ts` to call Rust export
3. `HandleOverlay.tsx` becomes event-only (mouse capture for resize/rotate)
4. `ShapePreviewOverlay.tsx` — preview during shape drawing, can stay in TS
   or move to Rust (renders preview shape in the scene during draw)

**DELETE:**
```
src/engine/compositor.ts
src/engine/layerRenderer.ts
src/engine/shapeRenderer.ts
src/engine/blendModes.ts
src/engine/effectsEngine.ts
src/engine/textRenderer.ts
```

Keep `src/engine/index.ts` if any utility re-exports are still needed, otherwise delete.

### Phase 2 — Completion Criteria

- [ ] wgpu headless spike passes all 4 tests
- [ ] All 27 shape types render correctly via Vello
- [ ] Text renders via cosmic-text (word wrap, styled runs, alignment, shadows, backgrounds)
- [ ] Image layers render with crop, flip, opacity, blend modes
- [ ] All effects that currently work in TS also work in Rust
- [ ] Selection gizmos rendered by Vello (handles, bounding box, anchor)
- [ ] Frame delivery at 60fps (1920x1080)
- [ ] Shapes and text are crisp at any zoom level (GPU vector rendering)
- [ ] Image export works via Rust readback
- [ ] Text creation (drag to draw) and inline editing still work (TS side unchanged)
- [ ] All TS engine files deleted (including textRenderer.ts)
- [ ] Visual regression test: Rust output matches previous TS output

---

## PHASE 3 — Hit-Testing in Rust

**Goal**: Move geometry hit-testing from TypeScript to Rust.

### 3.1 — Hit-Test Functions in thamnel-core

```rust
// crates/thamnel-core/src/hit_test.rs

/// Point-in-rotated-rectangle test with crop support.
pub fn point_in_node(px: f64, py: f64, node: &Node) -> bool { ... }

/// Shape-precise hit test (point-in-shape-path for shape nodes).
pub fn point_in_shape(px: f64, py: f64, node: &ShapeNode) -> bool { ... }

/// Axis-aligned bounding box of a rotated node.
pub fn rotated_aabb(node: &Node) -> Rect { ... }

/// Find topmost node at point. Returns node ID or None.
pub fn hit_test_point(doc: &Document, px: f64, py: f64) -> Option<Uuid> { ... }

/// Find ALL nodes at point, ordered top-to-bottom.
pub fn hit_test_all(doc: &Document, px: f64, py: f64) -> Vec<Uuid> { ... }

/// Find all nodes within a marquee rectangle.
pub fn select_by_marquee(doc: &Document, rect: Rect) -> Vec<Uuid> { ... }
```

### 3.2 — Tauri IPC Commands

```rust
#[tauri::command]
fn hit_test(state: State<AppDocumentState>, x: f64, y: f64) -> Option<String> { ... }

#[tauri::command]
fn hit_test_all(state: State<AppDocumentState>, x: f64, y: f64) -> Vec<String> { ... }

#[tauri::command]
fn marquee_select(state: State<AppDocumentState>, x: f64, y: f64, w: f64, h: f64) -> Vec<String> { ... }
```

### 3.3 — Update useSelectionManager.ts

**Remove** from `useSelectionManager.ts`:
- `pointInRotatedRect()` function
- `getRotatedAABB()` function
- Local hit-test loop logic in `hitTestPoint` and `hitTestAll`
- Shape-path hit-test logic

**Replace with** Tauri IPC calls:
```typescript
const hitTestPoint = useCallback(async (px: number, py: number) => {
    return invoke<string | null>('hit_test', { x: px, y: py });
}, []);
```

**Keep** in TypeScript (UI concerns):
- `selectedIds` state
- `selectLayer`, `toggleSelection`, `selectAll`, `deselectAll`
- `getHandleColor`
- `isLayerSelectable` (can also move to Rust, but minor)
- `getSelectedBounds` (for UI overlay positioning)

### 3.4 — Update HandleOverlay.tsx

Remove all visual gizmo rendering (drawn by Vello in Phase 2).
Keep only the invisible hit areas for mouse events:
- Resize handle mouse targets
- Rotation handle mouse target
- Anchor handle mouse target

These are transparent `<div>` elements positioned over the Vello-rendered gizmos.

### 3.5 — Clean Up ShapePreviewOverlay.tsx

If shape preview is rendered by Vello in the scene, delete this file.
If kept in TS for responsiveness during drawing, leave as-is.

### Phase 3 — Completion Criteria

- [ ] Hit-testing calls Rust via IPC (not TypeScript math)
- [ ] Shape-precise clicking works (click through empty areas of stars, etc.)
- [ ] Marquee selection works via Rust
- [ ] HandleOverlay.tsx has zero visual rendering code
- [ ] `pointInRotatedRect` and `getRotatedAABB` deleted from TS
- [ ] Selection, resize, rotate, move all still work correctly

---

## PHASE 4 — Cleanup + Stabilization

**Goal**: Remove all dead code, verify everything works, add tests.

### 4.1 — Delete Dead Code

Verify and remove any remaining dead TS engine code:
```
Verify deleted: src/engine/compositor.ts
Verify deleted: src/engine/layerRenderer.ts
Verify deleted: src/engine/shapeRenderer.ts
Verify deleted: src/engine/blendModes.ts
Verify deleted: src/engine/effectsEngine.ts
Verify deleted: src/engine/textRenderer.ts
Verify deleted: src/types/LayerModel.ts
Verify deleted: src/types/ProjectModel.ts
Verify deleted: src/types/ShapeProperties.ts (old)
Verify deleted: src/types/TextProperties.ts (old)
Verify deleted: src/types/LayerEffect.ts (old)
Verify deleted: src/types/FillDefinition.ts (old)
Verify deleted: src/types/compat.ts
```

Remove unused imports across all files.

### 4.2 — Rust Tests

```
thamnel-core:
  - Serde round-trip for every type
  - Command execute + inverse round-trip
  - History push/undo/redo
  - Hit-test accuracy (rotated, cropped, shapes)
  - Legacy .rbl migration converter
  - NodeIdentity uniqueness enforcement

thamnel-render:
  - Golden render image-diff tests (render known document → compare pixels)
  - All 27 shapes render correctly
  - Blend mode visual tests
  - Effect parameter sweep
  - Export PNG/JPG matches expected output
```

### 4.3 — Frontend Tests

Update existing Vitest tests to use new types.
Delete tests that test deleted code (TS engine).

### 4.4 — Performance Verification

- [ ] 60fps at 1920x1080 with 50 layers
- [ ] Shape zoom: no pixelation at any zoom level
- [ ] Smooth slider scrubbing for effect parameters
- [ ] No visible lag on layer selection, move, resize

### Phase 4 — Completion Criteria

- [ ] Zero dead code
- [ ] All Rust tests pass
- [ ] All frontend tests pass
- [ ] `npm run build` zero errors
- [ ] `cargo test --workspace` zero failures
- [ ] App works identically to pre-migration (all features preserved)
- [ ] Performance targets met

---

## Files Changed Per Phase — Summary

| Phase | New Files | Modified Files | Deleted Files |
|-------|-----------|---------------|---------------|
| 0 | ~15 Rust files in crates/ | src-tauri/Cargo.toml, lib.rs | None |
| 1 | ~10 new TS type files | ~30 component/hook/store files | 6 old type files |
| 2 | ~8 Rust render files | CanvasViewport.tsx, HandleOverlay.tsx, fileCommands.ts | 6 engine files |
| 3 | 1 Rust hit_test.rs | useSelectionManager.ts, HandleOverlay.tsx | Functions only |
| 4 | Test files | Cleanup imports | Any remaining dead code |

---

## Execution Rules for Claude Agent

1. **One phase at a time.** Never start Phase N+1 until Phase N completion criteria are all met.
2. **Never break the app.** After every file change, the app must still compile and run.
3. **Use compatibility layer in Phase 1.** Update components one at a time, not all at once.
4. **Test after every sub-step.** Run `cargo build`, `npm run build`, launch the app.
5. **Full verification after every phase.** Run `cargo test --workspace`, `cargo clippy --workspace`,
   `npm run build`, and launch the app to verify all features work. See "Mandatory Rules" section.
6. **Migrate only existing features.** Do NOT add AI, networking, or .rbl ZIP.
   cosmic-text IS included (replaces textRenderer.ts in Phase 2).
7. **Keep React UI identical.** Same look, same behavior, same interactions.
8. **Commit at each sub-step boundary** with clear message describing what changed.
9. **Write modular, refactored code.** No god-files, no duplication, no dead code.
   Follow the code quality standards in "Mandatory Rules" section.
10. **Write tests alongside code.** Every Rust module must have `#[cfg(test)] mod tests`
    with unit tests covering serialization round-trips, command execution, and core logic.
    Do not defer tests to Phase 4 — write them as you build each module.
