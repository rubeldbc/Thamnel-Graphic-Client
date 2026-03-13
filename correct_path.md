# Thamnel Graphics Editor — Correct Path Migration Plan

## Purpose

This document defines the **phase-by-phase migration** from the current TypeScript-canvas-based
architecture to the production Rust-native GPU architecture defined in `GC_Core_Plan.md`.

**Iron Rule**: Every React UI component (panels, toolbars, dialogs, layer panel, properties panel)
is **KEPT**. Only the engine behind the canvas changes. The app must compile and run at the end
of every phase.

---

## Current State Inventory

### KEEP (React UI — untouched unless wiring changes)

```
src/components/LeftToolbar/       — Tool buttons, shape picker, fill/stroke swatches
src/components/RightPanel/        — Layer panel, properties tab, templates tab
src/components/TopToolbar/        — Toolbar buttons, combo boxes
src/components/MenuBar/           — Menu bar items
src/components/StatusBar/         — Status bar, progress indicator
src/components/Dialogs/           — All 30+ dialog windows
src/components/ImageStudio/       — AI operations UI
src/components/FrameGallery/      — Frame thumbnails, video tab strip
src/components/LeftTabPanel/      — Image gallery, video browser tabs
src/components/ContextMenus/      — Context menu UI
src/components/common/            — NumericUpDown, ColorSwatch, Icon
src/components/layout/            — MainLayout, PanelShell, ResizableSplitter
src/commands/                     — Command definitions (will rewire to Tauri IPC)
src/settings/                     — Settings UI and store
src/styles/                       — All CSS
src/data/                         — Canvas presets data
src/utils/                        — Formatters, converters
```

### REPLACE (will be deleted after Rust equivalents are working)

```
src/engine/compositor.ts          — Replaced by thamnel-render (Vello)
src/engine/layerRenderer.ts       — Replaced by thamnel-render (Vello)
src/engine/shapeRenderer.ts       — Replaced by thamnel-render (Vello shape paths)
src/engine/blendModes.ts          — Replaced by thamnel-render (wgpu blend)
src/engine/effectsEngine.ts       — Replaced by thamnel-effects + thamnel-render
src/engine/textRenderer.ts        — Replaced by thamnel-render (cosmic-text)
src/engine/index.ts               — Re-export barrel (updated to export Rust bridge)
```

### REWRITE (same UI, new data model underneath)

```
src/types/LayerModel.ts           — Becomes TypeScript mirror of Rust Node types
src/types/ProjectModel.ts         — Becomes TypeScript mirror of Rust Document
src/types/ShapeProperties.ts      — Mirror of Rust ShapeNode properties
src/types/TextProperties.ts       — Mirror of Rust TextNode properties
src/types/LayerEffect.ts          — Mirror of Rust EffectStack definitions
src/types/FillDefinition.ts       — Mirror of Rust FillDefinition
src/types/enums.ts                — Mirror of Rust enums (same values, auto-synced)
src/stores/documentStore.ts       — Calls Rust via IPC instead of direct state mutation
src/stores/undoRedoStore.ts       — Rust command history instead of snapshot cloning
src/hooks/useSelectionManager.ts  — Hit-testing calls Rust; selection state stays in TS
src/hooks/useCanvasInteraction.ts — Mouse events sent to Rust; drag state stays in TS
src/components/Canvas/*           — CanvasViewport displays Rust-rendered frame
```

### Rust Side — NEW (does not exist yet)

```
crates/thamnel-core/              — Document model, geometry, commands, history, identity
crates/thamnel-render/            — wgpu + Vello, RenderBackend trait
crates/thamnel-effects/           — Effect definitions + WGSL shaders
crates/thamnel-ai/                — ONNX inference (sync API)
crates/thamnel-io/                — .rbl save/load, rusqlite
crates/thamnel-video/             — FFmpeg CLI wrapper
crates/thamnel-net-text/          — WebSocket text sync
src-tauri/                        — Tauri app shell (IPC bridge to above crates)
```

---

## Migration Phases

---

### PHASE 0 — Cargo Workspace + thamnel-core

**Goal**: Create the Rust document model as the single source of truth.
No UI changes. No rendering changes. The app still works exactly as before.

#### 0.1 — Restructure to Cargo Workspace

Convert the project from a single `src-tauri` crate to a Cargo workspace.

**Create directory structure:**
```
crates/
  thamnel-core/
    Cargo.toml
    src/
      lib.rs
      document.rs
      node.rs
      geometry.rs
      transform.rs
      effects.rs
      text.rs
      shape.rs
      blend.rs
      identity.rs
      commands.rs
      history.rs
      metadata.rs
      fill.rs
```

**Create root Cargo workspace file** `crates/Cargo.toml` (workspace root):
```toml
[workspace]
members = [
    "thamnel-core",
    # Future: thamnel-render, thamnel-effects, thamnel-ai, thamnel-io, thamnel-video, thamnel-net-text
]
resolver = "2"
```

**Update `src-tauri/Cargo.toml`** to depend on workspace crate:
```toml
[dependencies]
thamnel-core = { path = "../crates/thamnel-core" }
```

**Verification**: `cargo build` succeeds from `src-tauri/`. App launches normally.

#### 0.2 — Implement thamnel-core: Geometry Types

Own geometry types. NOT kurbo. Schema-stable.

```rust
// crates/thamnel-core/src/geometry.rs

/// 2D point.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

/// 2D size.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Size {
    pub width: f64,
    pub height: f64,
}

/// Axis-aligned rectangle.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Rect {
    pub origin: Point,
    pub size: Size,
}

/// Path drawing command (own type, NOT kurbo).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum PathCommand {
    MoveTo(Point),
    LineTo(Point),
    CurveTo {
        ctrl1: Point,
        ctrl2: Point,
        to: Point,
    },
    Close,
}

/// Bézier path composed of path commands.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BezierPath {
    pub commands: Vec<PathCommand>,
}
```

**thamnel-core Cargo.toml dependencies** (ONLY these — no GPU, no kurbo):
```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
uuid = { version = "1", features = ["v4", "serde"] }
schemars = "0.8"
```

**Verification**: `cargo test -p thamnel-core` passes. Geometry types serialize/deserialize.

#### 0.3 — Implement thamnel-core: Animation-Ready Transform

The plan explicitly forbids flat `x, y, width, height, rotation` fields.

```rust
// crates/thamnel-core/src/transform.rs

/// Animation-ready transform model.
/// Today: static values. Tomorrow: keyframeable channels.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Transform {
    /// Anchor point (normalized 0..1 within the node's own bounds).
    pub anchor: Point,
    /// World-space position.
    pub position: Point,
    /// Scale factors.
    pub scale: Point,
    /// Rotation in degrees.
    pub rotation: f64,
    /// Skew in degrees (x, y).
    pub skew: Point,
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

**Verification**: Default transform serializes to expected JSON structure.

#### 0.4 — Implement thamnel-core: Identity Model

Triple identity: UUID + binding_key + display_name.

```rust
// crates/thamnel-core/src/identity.rs

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NodeIdentity {
    /// Immutable internal UUID. Never changes after creation.
    pub id: Uuid,
    /// Stable logical key for animation preset matching.
    /// Optional at creation, required for render/export template mode.
    pub binding_key: Option<String>,
    /// User-facing name shown in layer panel. Can be renamed freely.
    pub display_name: String,
}
```

Policy enforcement functions (uniqueness, immutability once referenced) also live here.

#### 0.5 — Implement thamnel-core: Node Types

Replace the flat `LayerModel` concept with typed nodes.

```rust
// crates/thamnel-core/src/node.rs

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NodeBase {
    pub identity: NodeIdentity,
    pub transform: Transform,
    pub size: Size,
    pub opacity: f64,           // 0.0 to 1.0
    pub visible: bool,
    pub locked: bool,
    pub super_locked: bool,
    pub blend_mode: BlendMode,
    pub flip_horizontal: bool,
    pub flip_vertical: bool,
    pub effects: EffectStack,
    pub color_adjustments: ColorAdjustments,
    pub crop: CropRect,
    pub parent_group_id: Option<Uuid>,
    pub is_background: bool,
    pub is_frame_receiver: bool,
    pub is_live_date_time: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ImageNode {
    pub base: NodeBase,
    pub asset_ref: Option<String>,    // Reference to asset in .rbl container
    pub blur_radius: f64,
    pub blur_mask_ref: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TextNode {
    pub base: NodeBase,
    pub text_properties: TextProperties,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ShapeNode {
    pub base: NodeBase,
    pub shape_properties: ShapeProperties,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GroupNode {
    pub base: NodeBase,
    pub child_ids: Vec<Uuid>,
    pub group_color: Option<String>,
    pub is_expanded: bool,
}

/// Unified node enum — tagged for serialization.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Node {
    Image(ImageNode),
    Text(TextNode),
    Shape(ShapeNode),
    Group(GroupNode),
}
```

#### 0.6 — Implement thamnel-core: Effects, Shape, Text, Fill, Blend

Map every field from the current TypeScript types into properly structured Rust types.

**Current TS → Rust mapping:**

| Current TS File | Rust Module | Notes |
|----------------|-------------|-------|
| `LayerEffect.ts` (LayerEffect) | `effects.rs` (EffectStack) | Ordered Vec of effect definitions |
| `LayerEffect.ts` (ColorAdjustments) | `effects.rs` (ColorAdjustments) | Same fields |
| `ShapeProperties.ts` | `shape.rs` (ShapeProperties) | ShapeType enum + fill + geometry |
| `TextProperties.ts` | `text.rs` (TextProperties, StyledRun) | Same fields |
| `FillDefinition.ts` | `fill.rs` (FillDefinition, GradientStop) | Same structure |
| `enums.ts` (BlendMode) | `blend.rs` (BlendMode enum) | All 17 modes |
| `enums.ts` (ShapeType) | `shape.rs` (ShapeType enum) | All 27 shapes |
| All other enums | Respective modules | Same values |

Every Rust type must derive `Serialize, Deserialize, Clone, PartialEq, Debug`.

#### 0.7 — Implement thamnel-core: Document + Extensions

```rust
// crates/thamnel-core/src/document.rs

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Document {
    pub nodes: Vec<Node>,
    pub metadata: Metadata,
    /// Namespaced extensions — preserved by apps that don't understand them.
    pub extensions: BTreeMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProjectFile {
    pub manifest: Manifest,
    pub document: Document,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Manifest {
    pub format_version: String,
    pub created_by: String,
    pub created_by_version: String,
    pub min_reader_version: String,
    pub feature_flags: Vec<String>,
    pub document_hash: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Metadata {
    pub name: String,
    pub author: String,
    pub created_at: String,
    pub modified_at: String,
    pub description: String,
    pub canvas_width: f64,
    pub canvas_height: f64,
    pub background_color: String,
}
```

#### 0.8 — Implement thamnel-core: Command-Based Undo/Redo

```rust
// crates/thamnel-core/src/commands.rs

pub enum DocumentCommand {
    AddNode(Node),
    RemoveNode(Uuid),
    UpdateNodeBase { id: Uuid, changes: NodeBaseChanges },
    MoveNode { id: Uuid, new_index: usize },
    SetCanvasSize { width: f64, height: f64 },
    SetBackgroundColor(String),
    // ... more commands for every mutation
}

pub trait CommandExecutor {
    fn execute(&mut self, cmd: DocumentCommand) -> DocumentCommand; // Returns inverse
}
```

```rust
// crates/thamnel-core/src/history.rs

pub struct History {
    undo_stack: Vec<DocumentCommand>,
    redo_stack: Vec<DocumentCommand>,
    max_undo: usize,
}
```

#### 0.9 — Expose thamnel-core via Tauri IPC

Create Tauri commands that let the frontend send/receive document state.

**New file**: `src-tauri/src/document_bridge.rs`

```rust
use thamnel_core::{Document, Node, NodeIdentity, Transform};

/// Get the full document as JSON (for initial load / full sync).
#[tauri::command]
fn get_document(state: State<AppState>) -> Result<Document, String> { ... }

/// Apply a command (add node, update, move, etc.) and return updated state.
#[tauri::command]
fn apply_command(state: State<AppState>, cmd: DocumentCommand) -> Result<Document, String> { ... }

/// Undo last command.
#[tauri::command]
fn undo(state: State<AppState>) -> Result<Document, String> { ... }

/// Redo.
#[tauri::command]
fn redo(state: State<AppState>) -> Result<Document, String> { ... }

/// Hit-test at canvas coordinates. Returns node ID or null.
#[tauri::command]
fn hit_test(state: State<AppState>, x: f64, y: f64) -> Result<Option<Uuid>, String> { ... }
```

Register these in `lib.rs` invoke_handler.

**Verification**: Can call `get_document` from React dev console and see valid JSON.

#### Phase 0 — Completion Criteria

- [ ] `cargo test -p thamnel-core` — all types serialize/deserialize correctly
- [ ] `cargo build` from `src-tauri/` — compiles with thamnel-core dependency
- [ ] App launches and works exactly as before (no UI changes)
- [ ] Tauri IPC bridge commands registered and callable from frontend
- [ ] Document round-trip test: create Document in Rust → serialize → deserialize → assert equal

---

### PHASE 1 — TypeScript Type Migration (Frontend Data Model)

**Goal**: Frontend switches from current flat `LayerModel` to TypeScript mirrors of
Rust `Node` types. All UI components updated. No rendering changes yet.

#### 1.1 — Generate TypeScript Mirrors

Create TypeScript interfaces that exactly mirror every Rust type from thamnel-core.
These live in `src/types/` and replace the current files.

**New/updated files:**
```
src/types/geometry.ts       — Point, Size, Rect (mirrors Rust)
src/types/transform.ts      — Transform (mirrors Rust)
src/types/identity.ts       — NodeIdentity (mirrors Rust)
src/types/node.ts           — NodeBase, ImageNode, TextNode, ShapeNode, GroupNode, Node
src/types/document.ts       — Document, ProjectFile, Manifest, Metadata
src/types/effects.ts        — EffectStack, ColorAdjustments (mirrors Rust)
src/types/shape.ts          — ShapeProperties, ShapeType (mirrors Rust)
src/types/text.ts           — TextProperties, StyledRun (mirrors Rust)
src/types/fill.ts           — FillDefinition, GradientStop (mirrors Rust)
src/types/blend.ts          — BlendMode enum (mirrors Rust)
src/types/enums.ts          — Other enums (ActiveTool, DragMode, etc. — UI-only, no Rust mirror)
src/types/index.ts          — Re-export barrel
```

**Compatibility layer**: During migration, provide adapter functions:
```typescript
// src/types/compat.ts — TEMPORARY, deleted after Phase 1 complete
export function nodeToLegacyLayer(node: Node): LayerModel { ... }
export function legacyLayerToNode(layer: LayerModel): Node { ... }
```

#### 1.2 — Migrate documentStore.ts

Replace `ProjectModel` with `Document`. Replace `LayerModel[]` with `Node[]`.

The store either:
- **Option A (IPC-first)**: Every mutation calls a Tauri command, Rust applies the command,
  returns updated document, store replaces its state. Undo/redo handled by Rust.
- **Option B (local-first, sync later)**: Store mutates locally using the new types,
  syncs to Rust periodically. Simpler to migrate but eventually must become Option A.

**Recommended**: Option A — go IPC-first from the start. The Zustand store becomes a
thin cache of the Rust document state.

```typescript
// src/stores/documentStore.ts — after migration
const useDocumentStore = create<DocumentStore>((set, get) => ({
  document: createDefaultDocument(),

  // Every mutation goes through Rust
  applyCommand: async (cmd: DocumentCommand) => {
    const updated = await invoke<Document>('apply_command', { cmd });
    set({ document: updated });
  },

  undo: async () => {
    const updated = await invoke<Document>('undo');
    set({ document: updated });
  },

  // ... etc
}));
```

#### 1.3 — Update All UI Components

Every component that reads `LayerModel` properties must switch to `Node` properties.

**Key mapping (most common property accesses):**

| Old (LayerModel) | New (Node) |
|-------------------|-----------|
| `layer.id` | `node.base.identity.id` |
| `layer.name` | `node.base.identity.display_name` |
| `layer.type` | Tag on Node enum (`node.type`) |
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
| `layer.superLocked` | `node.base.super_locked` |
| `layer.blendMode` | `node.base.blend_mode` |
| `layer.effects` | `node.base.effects` |
| `layer.bindingKey` | `node.base.identity.binding_key` |
| `layer.displayName` | `node.base.identity.display_name` |
| `layer.shapeProperties` | `(node as ShapeNode).shape_properties` |
| `layer.textProperties` | `(node as TextNode).text_properties` |
| `layer.imageData` | `(node as ImageNode).asset_ref` |
| `layer.parentGroupId` | `node.base.parent_group_id` |
| `layer.childIds` | `(node as GroupNode).child_ids` |

**Files that reference LayerModel and need updating** (all in `src/`):
```
components/RightPanel/Layers/LayerItem.tsx
components/RightPanel/Layers/LayersTab.tsx
components/RightPanel/Layers/DraggableLayerRow.tsx
components/RightPanel/Layers/LayerFooterBar.tsx
components/RightPanel/Properties/PropertiesTab.tsx
components/RightPanel/Properties/PositionExpander.tsx
components/RightPanel/Properties/ShapeExpander.tsx
components/RightPanel/Properties/TextExpander.tsx
components/RightPanel/Properties/EffectsExpander.tsx
components/RightPanel/Properties/CropExpander.tsx
components/Canvas/CanvasViewport.tsx
components/Canvas/HandleOverlay.tsx
components/ContextMenus/*.tsx
components/LeftToolbar/LeftToolbar.tsx
hooks/useCanvasInteraction.ts
hooks/useSelectionManager.ts
hooks/useShapeDrawTool.ts
hooks/useTextDrawTool.ts
hooks/useEraserTool.ts
hooks/useBlurBrushTool.ts
hooks/useClipboard.ts
commands/*.ts
```

**Strategy**: Use the compatibility layer (`compat.ts`) during migration so components
can be updated one at a time. Delete `compat.ts` once all components are migrated.

#### 1.4 — Delete Old Type Files

Once all components use the new types:
```
DELETE: src/types/LayerModel.ts
DELETE: src/types/ProjectModel.ts
DELETE: src/types/ShapeProperties.ts    (replaced by src/types/shape.ts)
DELETE: src/types/TextProperties.ts     (replaced by src/types/text.ts)
DELETE: src/types/LayerEffect.ts        (replaced by src/types/effects.ts)
DELETE: src/types/FillDefinition.ts     (replaced by src/types/fill.ts)
DELETE: src/types/compat.ts             (temporary adapter — delete last)
```

#### Phase 1 — Completion Criteria

- [ ] All components use `Node` types instead of `LayerModel`
- [ ] documentStore calls Rust IPC for mutations and undo/redo
- [ ] All old type files deleted
- [ ] `npm run build` compiles clean (zero TS errors)
- [ ] App launches, layer panel works, properties panel works, tools work
- [ ] Undo/redo works via Rust command history

---

### PHASE 2 — Rust Rendering Engine (thamnel-render)

**Goal**: Build the wgpu + Vello rendering pipeline in Rust. Canvas displays
Rust-rendered frames instead of TypeScript-rendered canvas.

#### 2.0 — wgpu Headless Rendering Spike

Before building the full pipeline, prove wgpu works headless in Tauri on Windows.
This is the **mandatory spike** from GC_Core_Plan.md Phase 0.

**4 tests:**
1. Render to texture when window is visible
2. Render to texture when window is hidden/minimized
3. Render offscreen (no window at all)
4. Render 500 frames in a batch

**Create**: `crates/thamnel-render/tests/headless_spike.rs`

If this spike fails, the entire architecture must be reconsidered. Do NOT proceed
to 2.1 until all 4 tests pass.

#### 2.1 — Create thamnel-render Crate

```
crates/thamnel-render/
  Cargo.toml
  src/
    lib.rs
    backend.rs         — RenderBackend trait (pipeline-oriented)
    vello_backend.rs   — Vello implementation
    conversions.rs     — thamnel-core geometry → kurbo conversions
    engine.rs          — wgpu setup, render loop
    compositor.rs      — Layer compositing, blend modes
    shape_render.rs    — Core shapes → kurbo → Vello
    text_render.rs     — cosmic-text → Vello glyphs (Phase 3+)
    export.rs          — PNG/JPG export
    lib.rs
```

**Cargo.toml dependencies:**
```toml
[dependencies]
thamnel-core = { path = "../thamnel-core" }
wgpu = "24"
vello = "0.4"
kurbo = "0.11"
image = { version = "0.25", default-features = false, features = ["png", "jpeg"] }
cosmic-text = "0.12"          # Added in Phase 3 for text
```

#### 2.2 — Pipeline-Oriented RenderBackend Trait

```rust
// crates/thamnel-render/src/backend.rs

pub trait RenderBackend {
    /// Load textures, fonts, shader programs.
    fn prepare_resources(&mut self, assets: &AssetSet) -> Result<()>;
    /// Build full scene graph from document.
    fn build_scene(&mut self, document: &Document) -> Result<()>;
    /// Execute GPU render passes to target.
    fn render(&self, target: RenderTarget) -> Result<()>;
    /// Read pixels back from GPU.
    fn readback(&self, region: Option<Rect>) -> Result<RenderOutput>;
}
```

**Critical rule**: NO per-feature methods (no `render_text`, `render_shape`).
All node types resolved during `build_scene`.

#### 2.3 — Vello Implementation

Implement `VelloBackend` that:
1. Walks `Document.nodes` in order
2. For each node: applies transform, renders shape/image/text via Vello scene API
3. Handles blend modes and opacity per node
4. Renders selection gizmos (handles, bounding boxes) — replaces HandleOverlay.tsx

**Shape rendering**: Convert core `ShapeType` → kurbo paths → Vello scene primitives.
Must render all 27 shape types from `enums.ts`.

**Image rendering**: Load image assets, create Vello image brushes.

**Text rendering**: Placeholder in Phase 2 (renders bounding box). Full cosmic-text in Phase 3.

#### 2.4 — Tauri Frame Delivery

The rendered frame must get from Rust to the React frontend efficiently.

**Approach**: Shared memory buffer (NOT base64 roundtrip).

```rust
// src-tauri/src/render_bridge.rs

/// Render the current document state and return the frame as raw RGBA bytes.
/// Frontend receives an ArrayBuffer, creates ImageBitmap, draws to canvas.
#[tauri::command]
fn render_frame(
    state: State<AppState>,
    viewport_width: u32,
    viewport_height: u32,
    zoom: f64,
    scroll_x: f64,
    scroll_y: f64,
) -> Result<Vec<u8>, String> { ... }
```

Frontend canvas component:
```typescript
// CanvasViewport.tsx — simplified
const frame = await invoke<ArrayBuffer>('render_frame', {
    viewportWidth, viewportHeight, zoom, scrollX, scrollY
});
const imageData = new ImageData(new Uint8ClampedArray(frame), viewportWidth, viewportHeight);
ctx.putImageData(imageData, 0, 0);
```

**Performance target**: 60fps at 1920x1080. If IPC overhead is too high, switch to
shared memory or WebView resource URL approach.

#### 2.5 — Replace TypeScript Rendering

Once Rust rendering works:

1. `CanvasViewport.tsx` — Replace TS compositor call with Rust `render_frame` IPC
2. Remove `useEffect` render loop that calls `compositeScene`
3. Add `useEffect` that requests Rust frames on document/viewport changes

**DELETE after verified working:**
```
src/engine/compositor.ts
src/engine/layerRenderer.ts
src/engine/shapeRenderer.ts
src/engine/blendModes.ts
src/engine/effectsEngine.ts
src/engine/textRenderer.ts
```

Keep `src/engine/index.ts` as a minimal re-export if any utilities are still needed.

#### Phase 2 — Completion Criteria

- [ ] wgpu headless spike passes all 4 tests
- [ ] VelloBackend renders shapes, images at correct positions with correct transforms
- [ ] Blend modes work (all 17)
- [ ] Frame delivery to frontend at 60fps (1080p)
- [ ] Selection gizmos rendered by Vello (replaces HandleOverlay.tsx rendering)
- [ ] All TS engine files deleted
- [ ] App renders identically to before (visual regression test)
- [ ] Shapes are crisp at any zoom level (vector rendering)

---

### PHASE 3 — Text Engine + Effects Pipeline

**Goal**: Full text rendering via cosmic-text, GPU effects via wgpu shaders.

#### 3.1 — cosmic-text Integration

```rust
// crates/thamnel-render/src/text_render.rs

/// Layout and render text using cosmic-text.
/// Converts TextNode properties → cosmic-text buffer → Vello glyphs.
pub fn layout_text(
    text_node: &TextNode,
    font_system: &mut FontSystem,
) -> TextLayout { ... }

pub fn render_text_to_scene(
    scene: &mut vello::Scene,
    layout: &TextLayout,
    transform: &Transform,
) { ... }
```

**Font management** (per GC_Core_Plan.md):
- Template fonts bundled with the app
- System fonts as secondary option
- Explicit fallback chain per script (Bengali → Noto Sans Bengali → system)
- Glyph coverage validation before export

#### 3.2 — Create thamnel-effects Crate

```
crates/thamnel-effects/
  Cargo.toml
  src/
    lib.rs
    shaders/
      blur.wgsl
      glow.wgsl
      shadow.wgsl
      color_adjust.wgsl
      sharpen.wgsl
      vignette.wgsl
      noise.wgsl
    kernels.rs         — Shader kernel registry
    color.rs           — Color adjustment parameter models
    filters.rs         — Blur, sharpen, denoise parameters
    masks.rs           — Shape masks, alpha masks
    cinematic.rs       — Rim light, tint, split tone parameters
```

**Dependencies**: `thamnel-core` + `wgpu` (for shader types only).
**NO** render graph code. NO execution scheduling.

#### 3.3 — Effect Execution in thamnel-render

```rust
// crates/thamnel-render/src/render_graph.rs

/// Build render passes from document effect stacks.
/// Effects defines WHAT. Render graph decides WHEN and HOW.
pub struct RenderGraph {
    passes: Vec<RenderPass>,
}

impl RenderGraph {
    pub fn build(document: &Document) -> Self { ... }
    pub fn execute(&self, device: &wgpu::Device, queue: &wgpu::Queue) { ... }
}
```

**Map current TS effects to WGSL shaders:**

| Current TS Effect | WGSL Shader | Priority |
|-------------------|-------------|----------|
| gaussianBlur | blur.wgsl | High |
| dropShadow | shadow.wgsl | High |
| outerGlow | glow.wgsl | High |
| brightness/contrast/saturation/hue | color_adjust.wgsl | High |
| grayscale/sepia/invert | color_adjust.wgsl | High |
| sharpen | sharpen.wgsl | Medium |
| vignette | vignette.wgsl | Medium |
| noise | noise.wgsl | Medium |
| colorTint/splitToning/rimLight | cinematic shaders | Medium |
| pixelate/posterize | pixel_effects.wgsl | Low |
| cutStroke/smoothStroke | stroke.wgsl | Low |

#### Phase 3 — Completion Criteria

- [ ] Text renders with cosmic-text (multilingual, Bengali, Arabic)
- [ ] Font fallback chains work
- [ ] All 20+ effects render via GPU shaders
- [ ] Effects are non-destructive (original asset + effect stack = rendered output)
- [ ] Performance: effects apply at interactive speed during slider scrubbing

---

### PHASE 4 — Hit-Testing + Selection in Rust

**Goal**: Move hit-testing and selection gizmo logic to Rust.

#### 4.1 — Rust Hit-Testing

Move `pointInRotatedRect`, `pointInShapePath`, `getRotatedAABB` from
`useSelectionManager.ts` to Rust.

```rust
// crates/thamnel-core/src/hit_test.rs

/// Hit-test a point against all nodes, return topmost hit.
pub fn hit_test_point(document: &Document, px: f64, py: f64) -> Option<Uuid> { ... }

/// Hit-test a point against all nodes, return ALL hits top-to-bottom.
pub fn hit_test_all(document: &Document, px: f64, py: f64) -> Vec<Uuid> { ... }

/// Marquee selection: find all nodes within rectangle.
pub fn select_by_marquee(
    document: &Document,
    rect: Rect,
) -> Vec<Uuid> { ... }
```

**Tauri IPC commands:**
```rust
#[tauri::command]
fn hit_test(state: State<AppState>, x: f64, y: f64) -> Option<String> { ... }

#[tauri::command]
fn marquee_select(state: State<AppState>, x: f64, y: f64, w: f64, h: f64) -> Vec<String> { ... }
```

#### 4.2 — Update useSelectionManager.ts

- Remove `pointInRotatedRect`, `pointInShapePath`, `getRotatedAABB` functions
- `hitTestPoint` calls `invoke('hit_test', { x, y })` instead of local computation
- `selectByMarquee` calls `invoke('marquee_select', { ... })`
- Selection state (selectedIds) stays in TypeScript (UI concern)
- Handle color computation stays in TypeScript (UI concern)

#### 4.3 — Vello Selection Gizmos

Selection handles, bounding boxes, rotation handles are rendered by the Vello backend
as part of the scene. The frontend no longer renders `HandleOverlay.tsx` gizmo graphics.

`HandleOverlay.tsx` becomes a transparent event-capture layer only (mouse events for
resize/rotate handles) — no visual rendering.

**DELETE gizmo rendering from HandleOverlay.tsx**, keep event handling.

#### Phase 4 — Completion Criteria

- [ ] Hit-testing calls Rust via IPC
- [ ] Shape-precise hit-testing works (click through transparent shape areas)
- [ ] Marquee selection works via Rust
- [ ] Selection gizmos rendered by Vello (crisp at any zoom)
- [ ] HandleOverlay.tsx is event-only, no visual rendering
- [ ] useSelectionManager.ts has no geometry computation functions

---

### PHASE 5 — thamnel-io (.rbl File Format)

**Goal**: Save/load .rbl project files per GC_Core_Plan.md spec.

#### 5.1 — Create thamnel-io Crate

```
crates/thamnel-io/
  Cargo.toml
  src/
    lib.rs
    project.rs         — .rbl ZIP read/write
    manifest.rs        — Version, feature flags, hashes
    asset_manager.rs   — Embedded/linked asset handling
    migration.rs       — Schema version migration
    autosave.rs        — Periodic checkpoint
    db.rs              — rusqlite (recent files, cache index)
```

**Dependencies**: `thamnel-core`, `zip`, `serde_json`, `md5`, `notify`, `rusqlite`

#### 5.2 — .rbl Container

```
project.rbl (ZIP)
├── manifest.json      — version, app info, feature flags, hashes
├── document.json      — THE canonical project state
├── assets/            — original images, videos, masks
├── previews/          — disposable preview cache (optional)
├── cache/             — disposable
└── thumbnails/        — disposable layer thumbnails
```

**Save flow**: Document (Rust) → serialize → ZIP → write to disk
**Load flow**: Read ZIP → extract → deserialize → Document (Rust) → sync to frontend

#### 5.3 — Wire Save/Load to Frontend

Replace current `save_project`/`load_project` Tauri commands with proper .rbl operations.

**Tauri IPC:**
```rust
#[tauri::command]
fn save_rbl(state: State<AppState>, path: String) -> Result<(), String> { ... }

#[tauri::command]
fn load_rbl(state: State<AppState>, path: String) -> Result<Document, String> { ... }
```

Frontend `fileCommands.ts` calls these instead of current JSON save/load.

#### 5.4 — Image Asset Management

Current approach: base64 `imageData` string in LayerModel.
New approach: Images stored as files in .rbl `assets/` directory, referenced by path.

```rust
pub struct ImageNode {
    pub base: NodeBase,
    pub asset_ref: Option<String>,      // e.g., "assets/img_001.png"
    // ...
}
```

The rendering engine loads the actual image bytes from the asset store.
Frontend receives a thumbnail for the layer panel, not the full image.

#### Phase 5 — Completion Criteria

- [ ] Save document as .rbl ZIP file
- [ ] Load .rbl file and restore full document state
- [ ] Images stored as files in assets/ directory (not base64)
- [ ] Manifest includes version, hashes, feature flags
- [ ] Extensions map preserved on save/load (unknown namespaces survive)
- [ ] Migration path for old JSON projects to new .rbl format
- [ ] Autosave checkpoint works

---

### PHASE 6 — AI Inference (thamnel-ai)

**Goal**: Local GPU AI models via ONNX Runtime with sync API.

#### 6.1 — Create thamnel-ai Crate

```
crates/thamnel-ai/
  Cargo.toml
  src/
    lib.rs
    runtime.rs          — ORT session management, GPU fallback
    bg_removal.rs       — InSPyReNet (sync)
    upscale.rs          — Real-ESRGAN (sync)
    face_restore.rs     — CodeFormer + GFPGAN (sync)
    face_detect.rs      — SCRFD (sync)
    inpaint.rs          — LaMa (sync)
    denoise.rs          — SCUNet (sync)
    colorize.rs         — DDColor (sync)
    cartoonize.rs       — White-box Cartoonization (sync)
    model_manager.rs    — Download, verify, cache models
```

**Dependencies**: `thamnel-core`, `ort`, `image`. **NO tokio** — sync API only.

**App layer** (in `src-tauri/`) wraps with `tokio::spawn_blocking`:
```rust
#[tauri::command]
async fn remove_background(state: State<'_, AppState>, layer_id: String) -> Result<(), String> {
    let result = tokio::task::spawn_blocking(move || {
        model.run(&input_image)
    }).await.map_err(|e| e.to_string())?;
    // ... apply result to document
    Ok(())
}
```

#### Phase 6 — Completion Criteria

- [ ] Background removal works (InSPyReNet)
- [ ] Upscale works (Real-ESRGAN)
- [ ] Face restore works (CodeFormer)
- [ ] AI runs on GPU (DirectML on Windows)
- [ ] UI not blocked during inference (spawn_blocking)
- [ ] Cancellable long-running jobs
- [ ] Model download/cache management

---

### PHASE 7 — Video + Remaining Features

**Goal**: FFmpeg integration, batch export, remaining features.

#### 7.1 — Create thamnel-video Crate

```
crates/thamnel-video/
  Cargo.toml
  src/
    lib.rs
    ffmpeg.rs           — FFmpeg CLI wrapper
```

**Dependencies**: `tokio` only. **NO thamnel-core dependency** — pure media utility.

#### 7.2 — Batch Export

Use `rayon` for parallel image export.

#### Phase 7 — Completion Criteria

- [ ] FFmpeg frame extraction works
- [ ] Batch export with progress
- [ ] Image export (PNG/JPG/BMP)

---

### PHASE 8 — Networking (thamnel-net-text)

**Goal**: Real-time text sync across LAN.

#### 8.1 — Create thamnel-net-text Crate

```
crates/thamnel-net-text/
  Cargo.toml
  src/
    lib.rs
    server.rs           — WebSocket server
    client.rs           — WebSocket client
    protocol.rs         — Text sync message types
```

**Dependencies**: `thamnel-core`, `axum`, `tokio`, `tower`. **NO tonic**.

#### 8.2 — Text Sync Protocol

Only `binding_key` + text content travel over the wire. Not the full document.

#### Phase 8 — Completion Criteria

- [ ] Text sync server runs
- [ ] Graphics editor connects as client
- [ ] Text changes propagate in real-time
- [ ] LAN discovery or manual connection

---

## Deletion Schedule

Files are deleted only AFTER their Rust replacement is verified working.

| Phase | Files Deleted |
|-------|-------------|
| Phase 1 | `src/types/LayerModel.ts`, `ProjectModel.ts`, `ShapeProperties.ts`, `TextProperties.ts`, `LayerEffect.ts`, `FillDefinition.ts` |
| Phase 2 | `src/engine/compositor.ts`, `layerRenderer.ts`, `shapeRenderer.ts`, `blendModes.ts`, `effectsEngine.ts`, `textRenderer.ts` |
| Phase 3 | (no deletions — effects were already deleted with engine in Phase 2) |
| Phase 4 | Geometry functions from `useSelectionManager.ts`, gizmo rendering from `HandleOverlay.tsx`, `ShapePreviewOverlay.tsx` |

---

## Cross-Cutting Concerns

### Structured Logging (tracing)

Add `tracing` + `tracing-subscriber` to `src-tauri/` from Phase 0.
Log all IPC commands, render times, hit-test results.

```rust
// Add to src-tauri/Cargo.toml
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
```

### Testing Strategy

| Phase | Tests |
|-------|-------|
| Phase 0 | Rust unit tests for all thamnel-core types (serde roundtrip, command execute/undo) |
| Phase 1 | Frontend build passes. Manual visual verification. |
| Phase 2 | Golden render image-diff tests. 60fps benchmark. |
| Phase 3 | Text layout snapshot tests. Effect parameter sweep tests. |
| Phase 4 | Hit-test accuracy tests (rotated shapes, cropped layers). |
| Phase 5 | .rbl roundtrip tests. Cross-version migration tests. |
| Phase 6 | AI model load/inference tests (may need CI GPU). |
| Phase 8 | Multi-client text sync integration tests. |

### CI Enforcement (from Phase 0)

```
thamnel-core:       NO wgpu, kurbo, vello, axum, tonic, ort deps
thamnel-effects:    NO render graph code, NO execution scheduling
thamnel-ai:         NO tokio dependency
thamnel-video:      NO thamnel-core dependency
thamnel-net-text:   NO tonic dependency
graphics-editor:    NO thamnel-anim, NO thamnel-net-render
```

---

## Summary: What Survives, What Dies

| Category | Verdict |
|----------|---------|
| React UI components (60+ files) | **KEEP** — only wire changes |
| Zustand stores | **REWRITE** — thin IPC wrappers around Rust state |
| TypeScript types | **REPLACE** — mirrors of Rust types |
| TS engine (7 files) | **DELETE** — replaced by thamnel-render |
| TS hooks (10 files) | **PARTIAL REWRITE** — hit-testing goes to Rust, interaction stays |
| TS commands (12 files) | **REWIRE** — call Tauri IPC instead of direct store mutation |
| Rust src-tauri/ | **EXPAND** — becomes IPC bridge to workspace crates |
| CSS/styles | **KEEP** |
| Tests | **REWRITE** — new types require new tests |

---

## Execution Order for Claude Agent

When working on this migration, follow this exact order:

1. **Phase 0**: Build `thamnel-core` crate. This is pure Rust, zero UI risk.
2. **Phase 1**: Migrate TS types. Use compatibility layer. Update components one by one.
3. **Phase 2**: Build `thamnel-render`. Run both renderers in parallel until Rust matches.
4. **Phase 3**: Add text + effects to Rust renderer.
5. **Phase 4**: Move hit-testing to Rust.
6. **Phase 5**: Implement .rbl file format.
7. **Phase 6-8**: AI, video, networking (new features, not migration).

**Never break the app.** At every phase boundary, the app must compile, launch,
and function correctly.
