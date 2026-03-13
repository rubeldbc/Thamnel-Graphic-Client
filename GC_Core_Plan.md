# Thamnel Graphics Client (Graphics Editor) — Extracted Core Plan

## 1. Role in the Ecosystem

| # | App | Type | Role |
|---|-----|------|------|
| 1 | **Graphics Editor** | Tauri v2 desktop | Main editor. FFmpeg frame extraction, image effects, basic shapes (separate window), text with Unicode/multilingual effects, AI models (local GPU), Photoshop-like layer panel. Saves .rbl files. Connects to Text Server over LAN. Sends .rbl to Render Server. |

```
+-------------------------------------------------------------+
|                    THAMNEL ECOSYSTEM                         |
|                                                              |
|  +---------------+    WebSocket     +--------------------+   |
|  |  Graphics     |<--------------->|  Text Sync          |   |
|  |  Editor       |                  |  Server             |   |
|  |  (Tauri v2)   |                  |  (axum)             |   |
|  +-------+-------+                  +----------+---------+   |
|          |                                     |             |
|          | .rbl file                           | WebSocket   |
|          | (file transfer                      |             |
|          |  via net-text)                      |             |
|          v                                     v             |
|  +-------------------+              +--------------------+   |
|  |  Animation Editor |              |  Text Editor       |   |
|  |  + Render Server  |              |  Client            |   |
|  |  (Tauri + tonic)  |              |  (Tauri v2)        |   |
|  +-------------------+              +--------------------+   |
|                                                              |
|  +--------------------------------------------------------+  |
|  |              Shared Rust Core (crates)                  |  |
|  |  document model, rendering, effects, text, AI           |  |
|  +--------------------------------------------------------+  |
+-------------------------------------------------------------+
```

**Core workflow**: Breaking news happens → reporter types text → designer composes photocard → animation server auto-renders video reel — all in seconds.

**Requirements**:
- Cross-platform (Windows, Mac, Linux)
- Photoshop-smooth UX at 60fps
- Rust-based for maximum performance
- AI models run locally on user's GPU
- Shared .rbl project format across all apps
- Real-time text sync across LAN

---

## 2. The Killer Workflow (Graphics Editor's Role)

```
Breaking News Happens
        |
        v
Reporter types text in Text Editor Client/or Graphics Designer can also type text in directly to GC text layer
        | (WebSocket real-time)
        v
Graphics Designer sees text appear on canvas (Graphics Editor)
        |
        v
Designer picks video -> extracts frame -> applies effects -> saves .rbl
        | (send .rbl to Render Server)
        v
Animation Server receives .rbl
        |
        v
Auto-matches layers by binding_key to saved animation presets
        |
        v
Renders animated video (photocard -> reel) automatically
        |
        v
Video output ready in seconds
```

---

## 3. Graphics Editor — Detailed Scope

### What it does:
- Extract frames from video via FFmpeg
- Compose images with text overlays, shapes, effects on a layered canvas
- Apply AI effects: background removal, upscale, face restore, logo removal, colorize, cartoonize, denoise, inpaint
- Basic shape creation in a **separate window** (not complex illustrator-level vector drawing)
- Shapes used as image masks on the main canvas
- Unicode multilingual text with effects (shadow, outline, glow, gradient fill)
- Photoshop-like layer panel with groups, visibility, lock, opacity, blend modes
- Real-time text sync with Text Server over LAN
- Send .rbl files to Animation/Render Server over LAN
- Export final image as PNG/JPG/BMP
- Complex vector illustration (pen tool, bezier editing, path operations)

### What it does NOT do:
- Video editing or timeline
- Animation — that's the Animation Editor's job

### Shape System:
- Basic shapes: Rectangle, Ellipse,Star etc.
- Basic Shapes will be created directly in Canvas
- But for the complex illustration a separate Shape Creator window will be used. After creating the shape will be sent to main canvas.
- Placed on main canvas as mask layers or decorative elements
- Defined as **own serializable geometry types** in thamnel-core (not kurbo types directly)
- Converted to kurbo at the render layer for actual drawing

---

## 4. Tech Stack

### Foundation

| Component | Technology |
|-----------|-----------|
| Language | Rust + TypeScript |
| Workspace | Cargo workspace (9+ crates + 4 apps) |
| Desktop Shell | Tauri v2 |

### Frontend (Tauri app)

| Component | Technology | Role |
|-----------|-----------|------|
| UI Framework | React 19 + TypeScript | Panels, toolbars, dialogs |
| State | Zustand (sliced) | document, selection, UI, render cache, jobs |
| UI Kit | Radix UI | Accessible primitives (dialogs, menus, sliders, context menus) |
| Styling | Tailwind CSS | Dark theme, orange accent |
| Layer DnD | @dnd-kit/core + @dnd-kit/sortable | Layer panel drag-and-drop |
| Validation | zod (boundary validation only) | IPC boundary checks, not full schema mirror |
| Testing | Vitest | Frontend unit tests |

### Canvas / Rendering (Rust-native GPU)

| Component | Technology | Role |
|-----------|-----------|------|
| GPU Layer | wgpu | Cross-platform GPU abstraction |
| 2D Renderer | Vello (behind pipeline-oriented render backend trait) | GPU-accelerated 2D scene rendering |
| Text Engine | cosmic-text | Multilingual text shaping and layout |
| 2D Geometry (render) | kurbo | Render-layer only: converts from core geometry types |
| Hit-testing | Custom (Rust-side) | Layer picking using own geometry types |
| Selection gizmos | Custom (Rust-side) | Resize/rotate handles rendered by Vello |
| GPU Effects | Custom wgpu shaders | Blur, glow, shadow, outline, color adjustment |

**Renderer policy**:
- Vello is the single production renderer. Preview and export use the same Vello pipeline.
- Vello is accessed through a **pipeline-oriented render backend trait** (abstraction seam). The rest of the codebase programs against the trait, not Vello directly. This allows future renderer swap if needed without rewriting all consumers.
- Skia may be used only during development as a benchmark/reference for verifying Vello output. It is NOT a runtime fallback.

**Render backend trait** (in thamnel-render) — pipeline-oriented, NOT per-feature:
```rust
pub trait RenderBackend {
    /// Load textures, fonts, shader programs
    fn prepare_resources(&mut self, assets: &AssetSet) -> Result<()>;
    /// Build full scene graph from document (all node types resolved here)
    fn build_scene(&mut self, document: &Document) -> Result<()>;
    /// Execute GPU render passes to target
    fn render(&self, target: RenderTarget) -> Result<()>;
    /// Read pixels back from GPU
    fn readback(&self, region: Option<Rect>) -> Result<RenderOutput>;
}
```

**Why pipeline-oriented**: Per-feature methods (render_text, render_shape) leak implementation details and break backend-neutrality. All node types (text, shape, image) are resolved during `build_scene`. The backend never exposes per-feature methods.

### Rust Engine

| Crate | Role |
|-------|------|
| tokio | Async runtime |
| rayon | CPU parallelism (batch export, image processing) |
| image + imageproc | Import/export, thumbnails, preprocessing only (NOT the effect engine) |
| ort | ONNX Runtime for AI inference (DirectML/CoreML/CUDA + CPU fallback) |
| serde + serde_json | Serialization |
| schemars | JSON Schema generation for docs/tooling |
| zip | .rbl project file container |
| uuid | Stable layer identity |
| notify | File system watching |
| rusqlite | Local metadata, recent projects, job queue, render history, asset cache index |
| tracing + tracing-subscriber | Structured logging — MANDATORY from Phase 1, not optional |
| thiserror | Typed library/engine errors |
| anyhow | Application-level error propagation |

### Media

| Component | Technology | Notes |
|-----------|-----------|-------|
| Video frames | FFmpeg CLI via std::process::Command | Frame extraction, encode, transcode. CLI only for v1. Not ffmpeg-next. |

### Networking (Graphics Editor uses net-text only)

| Component | Crate | Technology | Role |
|-----------|-------|-----------|------|
| Text sync | thamnel-net-text | axum + WebSocket | Real-time text relay. Used by Graphics Editor, Text Server, Text Client. |

**.rbl file transfer**: Graphics Editor sends .rbl to Animation Server. This can be done via a lightweight mechanism through the net-text WebSocket channel or simple HTTP upload — it does NOT require the graphics editor to depend on tonic/gRPC. The gRPC protocol is for the render server's automation API (job management, status, queue). The graphics editor only needs to push a file.

### Testing

| Component | Technology |
|-----------|-----------|
| Rust unit tests | cargo test |
| Frontend unit tests | Vitest |
| Rendering regression | Image-diff golden render tests |
| Text layout regression | Text layout snapshot tests |
| Document compatibility | .rbl cross-version roundtrip tests |
| Serialization | Render command serialization tests |
| Integration | Multi-app communication tests |

---

## 5. Document Format — .rbl

The .rbl file is the backbone of the ecosystem. It must be engine-agnostic, animation-ready, and the single source of truth.

**Rule**: UI framework (React state), canvas library, or renderer node tree NEVER define the project format. The canonical document schema is independent.

### Container Structure

```
project.rbl (ZIP)
|-- manifest.json          <- version, app info, feature flags, hashes
|-- document.json          <- THE canonical project state (source of truth)
|-- assets/                <- original images, videos, masks
|-- previews/              <- disposable preview cache (optional, regenerated)
|-- cache/                 <- disposable (file opens without it)
|-- thumbnails/            <- layer thumbnails (disposable)
```

### manifest.json

- File format version
- Created by app/version
- Minimum supported reader version
- Feature flags
- Document hash
- Asset manifest hash

### document.json

The canonical project grammar. Contains all layers, transforms, effects, text, shapes as declarative data.

**Extension system**: Instead of a single optional timeline field, the document uses a **namespaced extensions map** for app-specific metadata:

```rust
pub struct Document {
    pub nodes: Vec<Node>,
    pub metadata: Metadata,
    /// Namespaced extension data — preserved by apps that don't understand it
    pub extensions: BTreeMap<String, serde_json::Value>,
}
```

- Animation data stored as `"thamnel.anim.timeline"` key
- Future app-specific metadata uses other namespaces
- Graphics editor preserves ALL extensions on save without parsing them
- Animation editor reads/writes the `"thamnel.anim.*"` namespace

This is more extensible than a single optional timeline field and supports future ecosystem growth.

---

## 6. Canonical Document Schema

### Core Types (in thamnel-core)

```
ProjectFile
AssetManifest
Document
Node (base for all layer types)
  - ImageNode
  - TextNode
  - ShapeNode
  - GroupNode
  - AdjustmentNode
  - MaskNode
Transform
EffectStack (definitions only — execution is in thamnel-render)
BlendMode
Metadata
```

### Own Geometry Types (in thamnel-core, NOT kurbo)

```rust
// thamnel-core/src/geometry.rs — owned by us, schema-stable
pub struct Point { pub x: f64, pub y: f64 }
pub struct Size { pub width: f64, pub height: f64 }
pub struct Rect { pub origin: Point, pub size: Size }
pub enum PathCommand {
    MoveTo(Point),
    LineTo(Point),
    CurveTo { ctrl1: Point, ctrl2: Point, to: Point },
    Close,
}
pub struct BezierPath { pub commands: Vec<PathCommand> }
```

These are converted to kurbo types at the render layer:
```rust
// thamnel-render/src/conversions.rs
impl From<&core::BezierPath> for kurbo::BezPath { ... }
impl From<&core::Point> for kurbo::Point { ... }
impl From<&core::Rect> for kurbo::Rect { ... }
```

**Why own types**: Schema stability. If kurbo changes its API, the document format doesn't break. Frontend zod/type generation from our own types is cleaner. Backward compatibility stays in our control.

### Animation Types — NOT in Graphics Editor

The graphics editor does NOT depend on the `thamnel-anim` crate. Animation data is stored in the document's `extensions` map under the `"thamnel.anim.*"` namespace — preserved by the editor, fully parsed by the animation app.

---

## 7. Layer Identity — Triple Identity Model

Every layer/node must have three levels of identity:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "binding_key": "headline_text",
  "display_name": "Main Headline"
}
```

| Field | Purpose |
|-------|---------|
| `id` | Immutable internal UUID. Never changes. |
| `binding_key` | Stable logical key for animation preset matching. This is how the render server auto-maps presets to incoming files. Without this, auto-render is impossible. |
| `display_name` | User-facing name shown in layer panel. Can be renamed freely. |

### binding_key Policy Rules — Schema-Enforced (not just guidelines)

These are enforced in `thamnel-core` code, not just documented:

| Rule | Enforcement |
|------|-------------|
| Optional at creation | Default: auto-generated (`image_001`, `text_002`) |
| Required for render/export template mode | Validation error blocks export if missing |
| Unique within project scope | Enforced on set/import — reject duplicates |
| Immutable once referenced by preset | Default locked; rename requires explicit rebind flow |
| Duplicate key on import | Deterministic resolution: suffix increment (`headline_text_2`) |
| Deleted key | Preset invalidation warning propagated to animation server |
| Preset-required keys | Animation presets can mark certain binding_keys as required — render server warns on mismatch |

This is the foundation of the auto-render pipeline. Casual behavior here breaks the killer workflow.

---

## 8. Animation-Ready Transform Model

Define this from day one, even though the editor uses static values:

```json
{
  "transform": {
    "anchor": { "x": 0.5, "y": 0.5 },
    "position": { "x": 100, "y": 200 },
    "scale": { "x": 1.0, "y": 1.0 },
    "rotation": 0.0,
    "skew": { "x": 0.0, "y": 0.0 }
  }
}
```

Today: static values.
Tomorrow: keyframeable animation channels.

Do NOT use `x, y, width, height, angle` flat fields — this causes migration hell when adding animation.

---

## 9. Effects — Definitions vs Execution Split

### Declarative Effect Stacks (saved in document)

Save the effect recipe, not the processed bitmap.

```json
{
  "effects": [
    { "type": "brightness", "value": 20 },
    { "type": "contrast", "value": 10 },
    { "type": "blur", "radius": 3.0, "mask_ref": null },
    { "type": "bg_removal", "mask_ref": "assets/mask_001.png" },
    { "type": "glow", "radius": 5.0, "intensity": 0.8 }
  ]
}
```

Canonical form: original source asset + ordered effect stack + parameters + optional mask reference.

Preview cache is disposable. The declarative stack is the truth.

### Crate Responsibility Split

| Crate | Owns | Does NOT own |
|-------|------|-------------|
| **thamnel-effects** | Effect definitions, parameter models, shader kernel source code | Render pass scheduling, execution ordering |
| **thamnel-render** | Render graph orchestration, effect execution, GPU pass ordering | Effect parameter schemas |

**Why**: In a real GPU pipeline, compositing and effects are interleaved in render passes (blur → composite → shadow → composite). Render pass ordering is a render graph concern, not an effect definition concern. Effects exposes **what** to do. Render decides **when** and **how**.

---

## 10. Text as First-Class Citizen

Text layers store full editable data, never rasterized bitmaps:

```json
{
  "type": "text",
  "binding_key": "headline_text",
  "content": "Breaking news headline",
  "font_family": "Noto Sans Bengali",
  "font_weight": 700,
  "font_style": "normal",
  "font_size": 48.0,
  "line_height": 1.2,
  "letter_spacing": 0.0,
  "alignment": "center",
  "box_size": { "width": 600, "height": 200 },
  "fill": { "type": "solid", "color": "#FFFFFF" },
  "stroke": { "color": "#000000", "width": 2.0 },
  "effects": [
    { "type": "shadow", "offset": { "x": 2, "y": 2 }, "blur": 4, "color": "#00000080" }
  ],
  "transform": { ... }
}
```

This ensures:
- Text is editable in the animation app
- Text sync works (only content + binding_key travel over the wire)
- cosmic-text renders consistently across all apps

### Font Management Strategy (Phase 0/1 design doc — NOT deferred)

| Concern | Policy |
|---------|--------|
| Template fonts | Packaged with the app (bundled in assets) — not system font dependent |
| System fonts | Supported as secondary option, but templates must not rely on them |
| Missing font substitution | Defined fallback chain per script: Bengali → Noto Sans Bengali → system fallback |
| Render server parity | Render server MUST have identical font set as graphics editor — enforced via shared font package |
| Arabic/Bengali fallback | Explicit fallback chain documented per project template |
| Template font lock | Templates can declare required fonts; export warns if font unavailable |
| Glyph coverage validation | Validate before export that all characters in text layers have glyphs in the resolved font |
| Cross-machine guarantee | Same font package version → identical line breaks, identical metrics |

Without this, cross-machine layout drift is guaranteed. This must be defined in Phase 0 alongside the document schema, not deferred to Phase 3+.

---

## 11. Processing Split — What Runs Where

### Frontend (React + Canvas display)

| Operation | Notes |
|-----------|-------|
| UI panels, toolbars, dialogs | React components |
| Layer panel interaction | Zustand state + @dnd-kit |
| Display rendered canvas frame | Image element updated from Rust |
| Mouse/keyboard input capture | Events sent to Rust via Tauri IPC |
| Settings UI | React forms |

### Rust Backend (all heavy work)

| Operation | Technology |
|-----------|-----------|
| Canvas rendering | wgpu + Vello (via RenderBackend trait) |
| Text layout/shaping | cosmic-text |
| Shape geometry | Own types (core) → kurbo conversion (render) |
| Hit-testing | Own geometry checks in core |
| Selection handles | Vello-rendered gizmos |
| Effect definitions | thamnel-effects (parameter models, shader kernels) |
| Effect execution | thamnel-render (GPU pass ordering, render graph) |
| Blend mode compositing | wgpu shaders (in render graph) |
| AI inference | ort — sync API, app layer handles async via spawn_blocking |
| Image import/export/thumbnails | image + imageproc |
| Video frame extraction | FFmpeg CLI |
| Project save/load | zip + serde |
| Undo/redo | Command-based (structural) + tile diff (raster) — lives in thamnel-core |
| Autosave | Periodic checkpoints — lives in thamnel-io |
| Text sync | axum WebSocket (thamnel-net-text) |
| Local metadata/job queue | rusqlite |

### IPC Design

No base64 roundtrips for images. Correct model:

```
Frontend sends: command + params (e.g., { command: "apply_blur", layer_id: "uuid", radius: 5 })
Rust processes: writes result to shared buffer or temp file
Frontend gets:  buffer handle / file path reference (lightweight)
Slider scrubbing: debounced + coalesced (Rust processes only latest value)
In-flight jobs: cancellable
```

---

## 12. AI Inference — Sync/Async Boundary

### Architecture Rule

thamnel-ai exposes a **sync (blocking) API**. The app layer handles async scheduling.

| Layer | Responsibility |
|-------|---------------|
| **thamnel-ai crate** | Sync model session management. Load model, run inference, return result. No tokio, no async in the inference path itself. |
| **App layer** (graphics-editor) | `tokio::spawn_blocking` to run inference off UI thread. Cancellation token checked between model steps. Progress reporting via channels. Worker queue for batch jobs. |

**Why**: ONNX Runtime via ort is fundamentally a blocking GPU/CPU call. Wrapping inference in async inside the crate creates unnecessary complexity. Keep the crate simple and let the app layer handle concurrency.

```rust
// thamnel-ai — sync API
pub struct BgRemovalModel { session: ort::Session }
impl BgRemovalModel {
    pub fn load(model_path: &Path) -> Result<Self> { ... }
    pub fn run(&self, input: &RgbaImage) -> Result<RgbaImage> { ... }  // blocking
}

// App layer — async scheduling
let result = tokio::task::spawn_blocking(move || {
    model.run(&input_image)
}).await??;
```

---

## 13. Undo/Redo — Command + Tile Diff

No full snapshot on every change. Undo/redo is a **document mutation concern**, not a file I/O concern.

`commands.rs` and `history.rs` live in **thamnel-core** (next to the document model they mutate), NOT in thamnel-io.

| Edit Type | Strategy | Examples |
|-----------|----------|----------|
| Structural | Command-based history (store inverse command) | Add/delete/reorder layer, rename, opacity, transform, effect params |
| Raster | Tile/patch diff (store only changed pixels) | Eraser, brush mask, pixel edits |
| Recovery | Periodic checkpoint autosave (in thamnel-io) | Crash recovery |

---

## 14. Text Sync Protocol

Minimal data over the wire:

```
Graphics Editor -> Text Server:
  { layers: [{ binding_key: "headline", text: "...", style: {...} }] }

Text Server -> Text Client:
  (same)

Text Client -> Text Server:
  { binding_key: "headline", text: "Updated text" }

Text Server -> Graphics Editor:
  (same)
```

Only text content and binding_key travel. Not the full document.

---

## 15. Graphics Editor — App Structure

```
apps/
|-- graphics-editor/                # App 1: Main editor (Tauri v2)
|   |-- src-tauri/
|   |   |-- src/
|   |   |   |-- main.rs
|   |   |   |-- commands.rs         # Tauri IPC commands
|   |   |   |-- canvas.rs           # wgpu surface management
|   |   |   |-- state.rs            # App state
|   |   |   |-- ai_worker.rs        # spawn_blocking wrapper for AI inference
|   |   |-- Cargo.toml              # tauri, core, render, effects, ai, io, video, net-text
|   |   |-- tauri.conf.json         # NO thamnel-anim, NO thamnel-net-render
|   |-- src/                        # React frontend
|   |   |-- App.tsx
|   |   |-- stores/                 # Zustand slices (document, selection, UI, jobs)
|   |   |-- components/
|   |   |   |-- LayerPanel/         # Photoshop-like layer management
|   |   |   |-- PropertiesPanel/    # Layer properties, effects, text
|   |   |   |-- Toolbar/            # Top toolbar
|   |   |   |-- ShapeCreatorWindow/ # Separate shape creation dialog
|   |   |   |-- ImageStudio/        # AI processing suite
|   |   |   |-- Canvas/             # Canvas display + mouse/keyboard interaction
|   |   |   |-- Settings/
|   |   |   |-- BatchProducer/
|   |   |-- ...
|   |-- package.json
```

---

## 16. Crate Dependencies (Graphics Editor)

```
thamnel-core             (ZERO dependencies on other thamnel crates)
                          owns: document model, geometry, commands, history, identity, extensions
                          deps: serde, serde_json, uuid, schemars
    ^
    |
    +-- thamnel-effects      (core + wgpu for shader types)
    |                         owns: effect definitions, parameter models, shader kernels
    |                         does NOT own: execution scheduling
    |
    +-- thamnel-render       (core + effects + wgpu + vello + cosmic-text + kurbo + image)
    |                         kurbo lives HERE only (conversion from core geometry)
    |                         exposes pipeline-oriented RenderBackend trait
    |                         owns: render graph, effect execution, pass ordering
    |
    +-- thamnel-ai           (core + ort + image)
    |                         SYNC API only — no tokio
    |
    +-- thamnel-io           (core + zip + rusqlite + notify)
    |
    +-- thamnel-video        (tokio only — NO core dependency)
    |                         pure FFmpeg CLI wrapper
    |
    +-- thamnel-net-text     (core + axum + tokio)       # NO tonic

graphics-editor -> core, render, effects, ai, io, video, net-text
```

**CI enforcement** (Graphics Editor boundaries):
- core has NO wgpu, kurbo, vello, axum, tonic, ort deps
- effects has NO render graph, NO execution scheduling code
- ai has NO tokio dependency
- video has NO core dependency
- net-text has NO tonic
- **graphics-editor has NO thamnel-anim, NO thamnel-net-render**

---

## 17. Crate Details (Used by Graphics Editor)

### thamnel-core — Shared document model + command system

```
crates/thamnel-core/
|-- src/
|   |-- document.rs             # ProjectFile, Document (with extensions map), Manifest
|   |-- node.rs                 # ImageNode, TextNode, ShapeNode, GroupNode
|   |-- geometry.rs             # OWN Point, Rect, BezierPath, PathCommand (NOT kurbo)
|   |-- transform.rs            # Animation-ready transform model
|   |-- effects.rs              # Declarative effect stack definitions (parameter models only)
|   |-- text.rs                 # Text properties, styled runs
|   |-- shape.rs                # Shape definitions (basic set, using own geometry)
|   |-- blend.rs                # BlendMode enum (17 modes)
|   |-- identity.rs             # UUID + binding_key + display_name + policy enforcement
|   |-- commands.rs             # Command model (add, delete, transform, etc.)
|   |-- history.rs              # Command-based undo + tile diff tracking
|   |-- metadata.rs             # Project metadata
|   |-- lib.rs
|-- Cargo.toml                  # serde, serde_json, uuid, schemars
|                               # NO kurbo, NO wgpu, NO animation logic
```

### thamnel-render — Rendering engine (behind pipeline trait boundary)

```
crates/thamnel-render/
|-- src/
|   |-- backend.rs              # RenderBackend trait (pipeline-oriented)
|   |-- vello_backend.rs        # Vello implementation of RenderBackend
|   |-- conversions.rs          # core::geometry -> kurbo type conversions
|   |-- engine.rs               # wgpu setup, render loop
|   |-- render_graph.rs         # Render pass ordering, effect execution scheduling
|   |-- compositor.rs           # Layer compositing, blend modes (GPU)
|   |-- text_render.rs          # cosmic-text layout -> Vello glyphs
|   |-- shape_render.rs         # core geometry -> kurbo -> Vello shapes
|   |-- export.rs               # Final frame export (PNG/JPG)
|   |-- headless.rs             # Headless rendering for render server
|   |-- lib.rs
|-- Cargo.toml                  # core, effects, wgpu, vello, cosmic-text, kurbo, image
|                               # kurbo is a dependency HERE only
|                               # effects imported for shader kernels
```

### thamnel-effects — Effect definitions + shader kernels

```
crates/thamnel-effects/
|-- src/
|   |-- shaders/                # GPU shader source files (WGSL)
|   |   |-- blur.wgsl
|   |   |-- glow.wgsl
|   |   |-- shadow.wgsl
|   |   |-- color_adjust.wgsl
|   |-- kernels.rs              # Shader kernel registry, loading
|   |-- color.rs                # Color adjustment parameter models
|   |-- filters.rs              # Blur, sharpen, denoise parameter models
|   |-- masks.rs                # Shape masks, alpha masks parameter models
|   |-- cinematic.rs            # Rim light, tint, split tone parameter models
|   |-- lib.rs
|-- Cargo.toml                  # core, wgpu (for shader types only)
|                               # NO render graph, NO execution scheduling
```

### thamnel-ai — AI inference (SYNC API)

```
crates/thamnel-ai/
|-- src/
|   |-- runtime.rs              # ORT session management, GPU provider fallback
|   |-- bg_removal.rs           # InSPyReNet (sync)
|   |-- upscale.rs              # Real-ESRGAN (sync)
|   |-- face_restore.rs         # CodeFormer + GFPGAN (sync)
|   |-- face_detect.rs          # SCRFD (sync)
|   |-- inpaint.rs              # LaMa (sync)
|   |-- denoise.rs              # SCUNet (sync)
|   |-- colorize.rs             # DDColor (sync)
|   |-- cartoonize.rs           # White-box Cartoonization (sync)
|   |-- model_manager.rs        # Download, verify, cache models
|   |-- lib.rs
|-- Cargo.toml                  # core, ort, image
|                               # NO tokio — sync API only
|                               # App layer handles async via spawn_blocking
```

### thamnel-io — File I/O + storage (NOT undo/redo)

```
crates/thamnel-io/
|-- src/
|   |-- project.rs              # .rbl ZIP read/write
|   |-- manifest.rs             # Version, feature flags, hashes
|   |-- asset_manager.rs        # Embedded/linked asset handling (extract to thamnel-assets later)
|   |-- migration.rs            # Schema version migration
|   |-- autosave.rs             # Periodic checkpoint (persistence only)
|   |-- db.rs                   # rusqlite (recent files, job queue, cache index)
|   |-- lib.rs
|-- Cargo.toml                  # core, zip, serde_json, md5, notify, rusqlite
```

### thamnel-video — Video operations (DUMB media wrapper)

```
crates/thamnel-video/
|-- src/
|   |-- ffmpeg.rs               # FFmpeg CLI wrapper (frame extract, encode, mux, probe)
|   |-- lib.rs
|-- Cargo.toml                  # tokio only
|                               # NO core dependency — pure media utility
|                               # App layer feeds raw image paths, receives video output
```

### thamnel-net-text — Text sync networking (SPLIT from render)

```
crates/thamnel-net-text/
|-- src/
|   |-- server.rs               # WebSocket server (for text-sync-server app)
|   |-- client.rs               # WebSocket client (for graphics editor / text editor)
|   |-- protocol.rs             # Text sync message types
|   |-- lib.rs
|-- Cargo.toml                  # core, axum, tokio, tower
|                               # NO tonic dependency
```

---

## 18. Future Crate Extractions

| Crate | Extract From | When | Why |
|-------|-------------|------|-----|
| `thamnel-assets` | thamnel-io (asset_manager.rs) | Phase 3+ | Asset concerns (hash, dedupe, relink, missing recovery, font packaging, derived outputs like AI results and extracted frames) will outgrow thamnel-io |

---

## 19. Phase Plan (Graphics Editor Phases)

### Phase 0 — Document Platform Design (Before any code)

- Canonical document schema v1 (Rust structs with serde)
- Own geometry types (Point, Rect, BezierPath, PathCommand)
- Extensions map design (`BTreeMap<String, serde_json::Value>`)
- manifest.json spec
- Asset policy (embedded vs linked)
- Transform semantics (animation-ready from day 1)
- Blend/mask/effect rules
- Versioning + migration rules
- binding_key conventions and schema-enforced policy rules
- .rbl container spec
- **Font management strategy document** (packaged vs system, fallback chains, glyph validation)
- Pipeline-oriented RenderBackend trait definition
- Effects/render boundary definition (effects = definitions, render = execution)
- **Headless wgpu rendering spike** (4 mandatory tests: visible, hidden, offscreen, 500-job batch)

### Phase 1 — Editor MVP

- Cargo workspace setup (9+ crates + 4 app shells)
- Tauri v2 graphics editor scaffold
- wgpu + Vello canvas rendering (via RenderBackend trait)
- tracing integration from day 1
- Open/save .rbl files (with extensions preservation)
- Layer tree (image, text, shape, group nodes)
- Transform tools (move, resize, rotate)
- Visibility, opacity, blend modes
- Basic image export (PNG/JPG)
- Keyboard shortcut system
- Command-based undo/redo (in thamnel-core)
- binding_key policy enforcement (in thamnel-core)
- Font management implementation (bundled template fonts)

### Phase 2 — Render Engine + History

- Full Vello rendering pipeline via RenderBackend
- Render graph with effect execution scheduling
- Thumbnail generation
- Non-destructive adjustment effects (GPU shaders from thamnel-effects)
- Preview/export parity tests (golden render)
- Tile diff for raster undo
- Layer panel polish (Photoshop-like)
- Text layout snapshot tests

### Phase 3 — Production Features

- Shape masks
- Groups (max depth 2)
- Text system polish (cosmic-text, multilingual, effects)
- Shape Creator window (basic shapes)
- Autosave/recovery
- Linked/embedded assets
- Missing asset handling
- Settings persistence (rusqlite)
- Smart guides + snapping
- Consider extracting thamnel-assets

### Phase 4 — AI + Media

- ONNX model manager (download, verify, cache)
- Background removal (InSPyReNet) — sync API + spawn_blocking in app
- Upscale (Real-ESRGAN)
- Face restore (CodeFormer + GFPGAN)
- Face detection (SCRFD)
- Inpainting (LaMa)
- Denoise (SCUNet)
- Colorize (DDColor)
- Cartoonize (White-box)
- Cancellable inference jobs (app-layer cancellation tokens)
- FFmpeg frame extraction (thamnel-video, no core dependency)
- Batch export
- Image Studio window

### Phase 5 — Networking (Graphics Editor connects to ecosystem)

- Text Sync Server (axum + WebSocket via thamnel-net-text)
- Text Editor Client (Tauri v2, lightweight)
- Real-time text sync protocol
- LAN discovery / manual connection
- .rbl file transfer from graphics editor to animation server (via net-text channel)

---

## 20. Five Rules for Smoothness

These matter more than the stack itself:

1. **No heavy work on main UI thread** — All processing on tokio/rayon/spawn_blocking. UI thread only renders.
2. **One text layout engine** — cosmic-text everywhere. No fallback to browser text.
3. **One renderer** — Vello for both preview and export. No dual renderer path. Same RenderBackend implementation everywhere.
4. **GPU-first effect pipeline** — wgpu shaders for blur/glow/shadow. Effects defines kernels, render executes them. Not CPU imageproc.
5. **Immutable snapshot document model** — Render thread reads snapshots. Edit thread writes new versions. No shared mutable state.

---

## 21. Structured Logging — Mandatory

tracing + tracing-subscriber is NOT optional. Required from Phase 1.

Critical log points for Graphics Editor:

| Area | What to log |
|------|-------------|
| Text sync | Diff logs (what text changed, which binding_key) |
| FFmpeg | Command templates, stderr output, exit codes |
| AI inference | Model load time, inference time per image, GPU/CPU provider used |
| Document migration | Version from/to, fields migrated, warnings |
| IPC | Command received, processing time, result size |
| binding_key | Policy violations, rebind events, preset invalidation warnings |

---

## 22. Known Risks + Mitigations (Graphics Editor relevant)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Vello maturity (pre-1.0, smaller ecosystem) | Medium | Pipeline-oriented RenderBackend trait allows future swap. Monitor Vello releases. Budget time for glue code. |
| Text/render parity across apps | High | One renderer everywhere. One font package everywhere. Golden render + text layout snapshot tests. |
| Render/effects boundary drift | Medium | Clear rule: effects = definitions + kernels, render = orchestration + execution. CI enforces no execution code in effects crate. |
| AI inference blocking UI | Medium | Sync API in thamnel-ai. App layer uses spawn_blocking. Cancellation tokens between model steps. |
| Crate boundary discipline | Medium | CI enforcement: core has no GPU deps, ai has no tokio, video has no core, net-text has no tonic, net-render has no axum, graphics-editor has no anim/net-render. |
| Cross-machine font drift | Medium | Font packaging strategy in Phase 0. Bundled template fonts. Explicit fallback chains. Glyph coverage validation. |
| binding_key policy violations | Medium | Schema-enforced in thamnel-core code: uniqueness, immutability, import resolution, preset invalidation. Logged via tracing. |
| Schema→zod auto-gen drift | Low | Rust serde = source of truth. schemars for docs. zod only at IPC boundaries, not full mirror. |

---

## 23. Full Stack Summary (Graphics Editor)

```
=== Foundation ===
Rust + TypeScript
Cargo workspace (9+ crates + 4 apps)
Tauri v2

=== Frontend ===
React 19 + TypeScript
Zustand (sliced: document, selection, UI, render cache, jobs)
Radix UI
Tailwind CSS
@dnd-kit/core + @dnd-kit/sortable
zod (boundary validation only)
Vitest

=== Canvas / Rendering (Rust-native GPU) ===
wgpu
Vello (behind pipeline-oriented RenderBackend trait — single production renderer)
cosmic-text
kurbo (render-layer only, NOT in document model)
Custom hit-testing (Rust-side, using own geometry types)
Custom selection/transform gizmos (Rust-side)
Custom GPU effect graph (wgpu shaders — effects defines, render executes)

=== Rust Engine ===
tokio
rayon
image + imageproc (import/export/thumbnails only — NOT effect engine)
ort (ONNX Runtime — sync API, app layer handles async)
serde + serde_json
schemars
zip
uuid
notify
rusqlite
tracing + tracing-subscriber (MANDATORY from Phase 1)
thiserror + anyhow

=== Media ===
FFmpeg CLI (std::process::Command) — NO core dependency, pure utility

=== Networking ===
thamnel-net-text: axum + WebSocket (text sync + file transfer)
(NO thamnel-net-render — graphics editor does NOT use gRPC)

=== Document Format ===
.rbl ZIP container
manifest.json (version, features, hashes)
document.json (canonical schema, engine-agnostic, own geometry types)
Namespaced extensions map (BTreeMap — animation data as "thamnel.anim.*")
Animation-ready transforms from day 1
Declarative effect stacks (not baked bitmaps)
Triple identity: UUID + binding_key + display_name
Schema-enforced binding_key policy
Font management strategy (bundled fonts, fallback chains, glyph validation)

=== Testing ===
cargo test
Vitest
Image-diff golden rendering tests
Text layout snapshot tests
.rbl migration roundtrip tests
Render command serialization tests
Multi-app integration tests
```
