# TGC Master Plan — Thamnel Graphics Client
## Single Source of Truth (replaces all other plan files)
**Created**: 2026-03-13
**Status**: Active — follow this file only

---

## PART 1: WHAT EXISTS TODAY

### 1.1 Project Identity

| Field | Value |
|-------|-------|
| App | Thamnel Graphics Client (TGC) |
| Type | Tauri v2 desktop app (Rust + React/TypeScript) |
| Role | Main graphics editor in the Thamnel ecosystem |
| Migrating from | WPF app at `D:\Code3\Thamnel_Project\Thamnel.sln` |
| File format | `.rbl` (currently plain JSON, target: ZIP container) |

### 1.2 Ecosystem Context

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

**Killer workflow**: Breaking news → reporter types text → designer composes photocard → animation server auto-renders video reel — all in seconds.

### 1.3 Rust Crates — What Exists

#### thamnel-core (COMPLETE)

Location: `crates/thamnel-core/src/`

| Module | Status | Contains |
|--------|--------|----------|
| `geometry.rs` | Done | Own types: Point, Size, Rect, BezierPath, PathCommand (NOT kurbo) |
| `transform.rs` | Done | Animation-ready: anchor, position, scale, rotation, skew |
| `identity.rs` | Done | Triple identity: UUID + binding_key + display_name |
| `node.rs` | Done | NodeBase + 4 kinds: ImageNode, TextNode, ShapeNode, GroupNode |
| `document.rs` | Done | Document struct with nodes, canvas_size, metadata |
| `blend.rs` | Done | 17 blend modes |
| `fill.rs` | Done | 5 fill types: Solid, LinearGradient, RadialGradient, SweepGradient, Image |
| `effects.rs` | Done | EffectStack (21 effects) + ColorAdjustments (5 params) |
| `shape.rs` | Done | 28 shape types + ShapeProperties (mask, image fill, polygon sides, etc.) |
| `text.rs` | Done | TextProperties + StyledRun (per-character styling) |
| `commands.rs` | Done | 7 command types: Add, Remove, Reorder, SetProperty, ReplaceNode, SetParentGroup, Batch |
| `history.rs` | Done | Command-based undo/redo, 50-step stack |
| `hit_test.rs` | Done | AABB + rotation-aware hit testing |

**Dependencies**: serde, serde_json, uuid, thiserror — NO kurbo, NO wgpu, NO GPU deps.

#### thamnel-render (PARTIAL)

Location: `crates/thamnel-render/src/`

| Module | Status | Contains |
|--------|--------|----------|
| `backend.rs` | Done | RenderBackend trait (prepare → build_scene → render → readback) |
| `vello_backend.rs` | Done | Vello implementation of RenderBackend |
| `engine.rs` | Done | wgpu Device/Queue, Vello Renderer, image cache, TextEngine |
| `compositor.rs` | Done | Builds Vello scene: images, shapes (solid fill only), text, opacity, blend |
| `shape_render.rs` | Done | All 28 shapes → kurbo BezPath, solid color fill + stroke |
| `text_render.rs` | Done | cosmic-text layout → Vello glyphs, shadows, backgrounds, styled runs |
| `hit_test.rs` | Done | Shape-precise hit testing (winding number, line proximity) |
| `conversions.rs` | Done | thamnel-core geometry → kurbo conversions |
| `export.rs` | Done | PNG/JPEG export via GPU render |

**What compositor.rs CAN render**:
- Images with crop, opacity, blend mode
- Shapes with solid color fill and stroke (all 28 types)
- Text with word wrap, alignment, shadows, backgrounds, styled runs
- Canvas background
- Viewport transform (zoom, scroll)

**What compositor.rs CANNOT render yet**:
- Gradient fills (linear, radial, sweep) on shapes
- Image fills on shapes
- Per-layer effects (brightness, contrast, blur, glow, shadow, etc.)
- Transparency masks (linear, radial)
- Group compositing as atomic units
- Selection gizmos (handles rendered by TS HandleOverlay)

**Dependencies**: thamnel-core, wgpu 27, vello 0.7, kurbo 0.13, peniko 0.6, cosmic-text 0.18, image 0.25

#### Crates That DO NOT EXIST Yet

| Crate | Purpose | When Needed |
|-------|---------|-------------|
| `thamnel-effects` | Effect definitions + WGSL shader kernels | Phase A (next) |
| `thamnel-io` | .rbl ZIP save/load, manifest, migration | Phase B |
| `thamnel-ai` | ONNX inference (sync API) | Phase D |
| `thamnel-video` | FFmpeg CLI wrapper | Phase D |
| `thamnel-net-text` | WebSocket text sync | Phase E |

### 1.4 Tauri IPC Bridge — What Exists

Location: `src-tauri/src/`

| Module | Status | IPC Commands |
|--------|--------|-------------|
| `document_bridge.rs` | Done | get_document, set_document, apply_command, undo, redo, get_history_state, load_legacy_rbl |
| `render_bridge.rs` | Done | render_frame (base64), render_frame_bin (binary 32B header + RGBA), export_render, hit_test, hit_test_all, marquee_select |
| `commands.rs` | Done | save_project, load_project, export_image_data, read_image_as_base64, decode_image_dimensions, extract_video_frames, get_system_fonts, file_exists, list_files, get_temp_dir, open_in_explorer |
| `settings.rs` | Done | save_settings, load_settings, get_app_data_dir |
| `lib.rs` | Done | App init, state management (AppDocumentState, AppRenderState) |

**Binary IPC format** (render_frame_bin):
```
[0..4]   width (u32 LE)
[4..8]   height (u32 LE)
[8..12]  render_time_us
[12..16] node_count
[16..20] prepare_us
[20..24] readback_us
[24..28] status (0=ok, 1=error)
[28..32] reserved
[32..]   raw RGBA pixels
```

### 1.5 TypeScript Frontend — What Exists

#### React Components (100+ files — ALL KEPT)

```
src/components/
  Canvas/              — CanvasViewport, GridOverlay, HandleOverlay, ShapePreview
  RightPanel/          — LayerPanel, Properties, Effects, Templates
  LeftToolbar/         — Tool buttons, shape picker, fill/stroke swatches
  TopToolbar/          — Action buttons, combo boxes, text formatting
  LeftTabPanel/        — Image gallery, video browser, media tabs
  MenuBar/             — File, Edit, View, Image, Effects, Help menus
  StatusBar/           — Status, zoom, coordinates, progress
  Dialogs/             — 30+ dialogs (new file, export, debug, shape creator, etc.)
  ImageStudio/         — AI operations UI
  FrameGallery/        — Video frame thumbnails
  ContextMenus/        — Right-click menus
  layout/              — MainLayout, PanelShell, ResizableSplitter
  common/              — NumericUpDown, ColorSwatch, Icon
```

#### Stores (Zustand)

| Store | Status | Role |
|-------|--------|------|
| `documentStore.ts` | Working, needs migration | Project state + Rust sync (debounced 16ms) |
| `undoRedoStore.ts` | Working | Snapshot-based (will migrate to Rust commands) |
| `uiStore.ts` | Done | Panel visibility, toolbar state, selected tool |
| `dialogStore.ts` | Done | Dialog open/close state |
| `jobStore.ts` | Done | Async job queue for AI inference, exports |
| `mediaStore.ts` | Done | Images, video data, thumbnails |
| `debugStore.ts` | Done | Debug logging and frame metrics |

#### Hooks

| Hook | Status | Notes |
|------|--------|-------|
| `useGpuRenderer.ts` | Working | RAF loop, binary IPC, fallback on error |
| `useCanvasInteraction.ts` | Working | All mouse/keyboard interactions (move, resize, rotate, crop, draw, marquee) |
| `useSelectionManager.ts` | Working, **uses TS-only hit testing** | Does NOT call Rust hit_test yet |
| `useShapeDrawTool.ts` | Working | Shape creation during draw |
| `useTextDrawTool.ts` | Working | Text creation tool |
| `useEraserTool.ts` | Working | Eraser/mask tool |
| `useBlurBrushTool.ts` | Working | Blur brush interaction |
| `useClipboard.ts` | Working | Copy/paste layer data |
| `useDraggable.ts` | Working | Drag-and-drop handlers |
| `useKeyboardShortcuts.ts` | Working | Global keyboard shortcuts |
| `useSmartGuides.ts` | Working | Alignment guides |

#### TS Engine (LEGACY — to be replaced by Rust)

| File | Lines | What It Does | Rust Replacement |
|------|-------|-------------|-----------------|
| `effectsEngine.ts` | 295+ | 21 effects (CSS filters + pixel manipulation) | thamnel-effects + thamnel-render |
| `compositor.ts` | ~300 | Full layer compositing, blend modes, opacity, crop | thamnel-render compositor |
| `shapeRenderer.ts` | ~400 | 27 shapes, fills, gradients, hit testing | thamnel-render shape_render |
| `textRenderer.ts` | ~200 | Text layout, styling, backgrounds | thamnel-render text_render |
| `blendModes.ts` | ~50 | Canvas composite operation mapping | thamnel-render compositor |
| `layerRenderer.ts` | ~150 | Per-layer rendering dispatch | thamnel-render compositor |
| `index.ts` | ~10 | Re-exports | Delete when engine deleted |

**CRITICAL**: These files are the ONLY fallback when GPU can't handle something. They stay until Rust covers every feature.

#### Types (Dual Model — needs consolidation)

| File | Role | Status |
|------|------|--------|
| `document-model.ts` | Rust-compatible DocumentModel | Done |
| `compat.ts` | ProjectModel ↔ DocumentModel conversion | Working |
| `ProjectModel.ts` | Legacy flat LayerModel[] | Being phased out |
| `LayerModel.ts` | Legacy layer type | Being phased out |
| `geometry.ts` | Mirror of core geometry | Done |
| `node.ts` | Mirror of core node types | Done |
| `LayerEffect.ts` | 21 effect types + ColorAdjustments | Done |
| `FillDefinition.ts` | 5 fill types + GradientStop | Done |
| `ShapeProperties.ts` | 28 shape types + properties | Done |
| `TextProperties.ts` | Text styling + styled runs | Done |
| `enums.ts` | UI enums (ActiveTool, DragMode, etc.) | Done |

#### Settings

| File | Status | Contains |
|------|--------|----------|
| `AppSettings.ts` | Done | 160+ settings in 23 categories |
| `settingsStore.ts` | Done | Zustand store with dot-path access, persistence |

### 1.6 Current Rendering Decision Tree

```
Layer change detected
    │
    ▼
documentStore subscriber triggers
    │
    ▼
legacyProjectToDocument() conversion
    │
    ▼
syncProjectToRust() via IPC (debounced 16ms)
    │
    ▼
_rustSyncVersion increments
    │
    ▼
useGpuRenderer RAF tick detects new version
    │
    ▼
Is effectiveGpuActive?
    │
    ├── effectiveGpuActive = gpuActive
    │     && !isInteracting
    │     && !layersHaveEffects
    │
    ├── YES → render_frame_bin IPC → binary RGBA → putImageData
    │
    └── NO → CPU fallback:
              compositeAllLayers() in TS
              (handles effects, interactions, all layer types)
```

**When CPU fallback triggers**:
1. During interactive drag/resize/rotate (IPC latency ~60ms too slow for handle sync)
2. When ANY visible layer has active effects (GPU doesn't support effects yet)
3. GPU initialization failure

### 1.7 Current File Save/Load Flow

```
SAVE (Ctrl+S):
  TS ProjectModel → JSON.stringify(project, null, 2) →
  tauriInvoke('save_project', {path, data}) → disk as .rbl (plain JSON)

LOAD (Ctrl+O):
  tauriInvoke('load_project') → JSON string → parseJSON →
  detect format (nodes[] = new, layers[] = old) →
  convert if needed via compat.ts → setProject() →
  auto-sync to Rust for rendering
```

**Problems with current flow**:
- `.rbl` is plain JSON, not ZIP container
- No manifest, no versioning, no asset embedding
- TS ProjectModel is the persistence format, not Rust Document
- No migration system

### 1.8 What Hit-Testing Actually Uses

**IMPORTANT**: Despite Rust having shape-precise hit-testing (`render_bridge.rs` exposes `hit_test`, `hit_test_all`, `marquee_select`), the TypeScript `useSelectionManager.ts` does **NOT** call them. All hit-testing runs in TS via:
- `pointInRotatedRect()` — AABB with rotation
- `pointInShapePath()` from `shapeRenderer.ts` — Canvas 2D path testing

This means deleting `shapeRenderer.ts` requires first wiring hit-testing to Rust.

---

## PART 2: ARCHITECTURE RULES (NON-NEGOTIABLE)

These rules are permanent. Every phase must obey them.

### 2.1 Crate Boundaries

```
thamnel-core             (ZERO dependencies on other thamnel crates)
    ^
    |
    +-- thamnel-effects      (core + wgpu shader types only)
    |
    +-- thamnel-render       (core + effects + wgpu + vello + cosmic-text + kurbo)
    |
    +-- thamnel-ai           (core + ort + image — SYNC API, NO tokio)
    |
    +-- thamnel-io           (core + zip + serde_json)
    |
    +-- thamnel-video        (tokio only — NO core dependency)
    |
    +-- thamnel-net-text     (core + axum + tokio — NO tonic)

graphics-editor (src-tauri) → core, render, effects, ai, io, video, net-text
```

**CI enforcement rules**:
- core has NO wgpu, kurbo, vello, axum, tonic, ort
- effects has NO render graph, NO execution scheduling
- ai has NO tokio
- video has NO core
- net-text has NO tonic
- graphics-editor has NO thamnel-anim, NO thamnel-net-render

### 2.2 Document Model Rules

- **Own geometry types** in thamnel-core (Point, Rect, BezierPath) — NOT kurbo
- **kurbo only in thamnel-render** (conversion layer)
- **Animation-ready transforms** from day 1 (anchor, position, scale, rotation, skew)
- **Triple identity**: UUID (immutable) + binding_key (preset matching) + display_name (user-facing)
- **Declarative effect stacks**: Save recipes, not processed bitmaps
- **Extensions map**: `BTreeMap<String, serde_json::Value>` for app-specific metadata

### 2.3 Five Smoothness Rules

1. **No heavy work on UI thread** — All processing on tokio/rayon/spawn_blocking
2. **One text layout engine** — cosmic-text everywhere, no browser text fallback
3. **One renderer** — Vello for both preview and export (TS fallback is temporary, not permanent)
4. **GPU-first effects** — wgpu shaders, not CPU Canvas 2D
5. **Immutable snapshot model** — Render reads snapshots, edit writes new versions

### 2.4 IPC Design

- **Binary IPC** for rendered frames (32-byte header + raw RGBA)
- **No base64** for image pixel data in the render pipeline
- **Commands + params** for mutations (not full document roundtrips)
- **Debounced sync** (16ms) for document → Rust updates
- **Cancellable** long-running operations (AI inference, batch export)

### 2.5 .rbl File Format (TARGET)

```
project.rbl (ZIP)
├── manifest.json          ← version, app info, feature flags, hashes
├── document.json          ← THE canonical document (Rust Document serialized)
├── assets/                ← original images, videos, masks
├── previews/              ← disposable preview cache
├── cache/                 ← disposable
└── thumbnails/            ← disposable
```

**Version policy**:
- `manifest.json` contains `format_version` (integer, monotonic)
- Newer app always reads older files (auto-upgrade on save)
- Older app reads newer files if `format_version <= max_supported_version`
- Unknown extensions preserved, unknown node types replaced with placeholder
- Migration functions chained: v1→v2→v3

### 2.6 Effects Architecture

| Crate | Owns | Does NOT Own |
|-------|------|-------------|
| **thamnel-effects** | Effect parameter models, WGSL shader kernel source | Render pass scheduling |
| **thamnel-render** | Render graph, effect execution, GPU pass ordering | Effect parameter schemas |

Effects defines **what**. Render decides **when** and **how**.

---

## PART 3: MIGRATION PHASES

### Iron Rules for All Phases

1. **App must compile and run** at the end of every phase
2. **No performance regression** — TS fallback stays until Rust proves each feature
3. **Delete TS code only after** Rust equivalent is tested and working
4. **React UI components are KEPT** — only engine/stores/hooks get rewired
5. **Each phase is a deployable milestone** — no half-finished states

---

### PHASE A — GPU Effects Pipeline (Priority #1)

**Goal**: Make the GPU renderer handle all 21 effects so it never falls back to TS for effects.

#### A.1 — Create thamnel-effects crate

```
crates/thamnel-effects/
  src/
    lib.rs
    color.rs            — brightness, contrast, saturation, hue, exposure, temperature, tint
    filters.rs          — gaussian blur, sharpen, vignette, pixelate, noise, posterize
    masks.rs            — color tint, blend overlay parameter models
    shadows.rs          — drop shadow, outer glow parameter models
    strokes.rs          — cut stroke, smooth stroke parameter models
    cinematic.rs        — rim light, split toning parameter models
    toggles.rs          — grayscale, sepia, invert
    shaders/
      color_adjust.wgsl — brightness/contrast/saturation/hue/exposure/temperature/tint
      blur.wgsl         — gaussian blur (two-pass separable)
      sharpen.wgsl      — unsharp mask
      vignette.wgsl     — radial darkening
      pixelate.wgsl     — downscale/upscale
      noise.wgsl        — random pixel offset
      posterize.wgsl    — color level reduction
      shadow.wgsl       — drop shadow (offset + blur)
      glow.wgsl         — outer glow (0-offset blur)
      stroke.wgsl       — outline/border around alpha
      rim_light.wgsl    — directional edge highlight
      split_tone.wgsl   — highlight/shadow color grading
      tint.wgsl         — color multiply overlay
    kernels.rs          — shader registry, pipeline creation
  Cargo.toml            — thamnel-core, wgpu (for shader types)
```

**Dependency**: `thamnel-effects` depends on `thamnel-core` + `wgpu` (shader types only).

**Migration step**: Move effect parameter structs from `thamnel-core/src/effects.rs` to `thamnel-effects`. Keep `thamnel-core/effects.rs` as re-exports or thin wrappers so existing code doesn't break.

#### A.2 — Wire effects into thamnel-render

Add to `thamnel-render`:
- `effect_pipeline.rs` — creates wgpu compute/render pipelines from WGSL shaders
- `effect_pass.rs` — executes effect stack on a per-layer texture before compositing

**Render flow becomes**:
```
For each visible layer:
  1. Render layer content to intermediate texture (image/shape/text)
  2. If layer has active effects:
     Apply effect stack via GPU passes (blur → brightness → shadow → etc.)
  3. Composite result onto canvas with blend mode + opacity
```

#### A.3 — Add gradient fills to compositor

Update `compositor.rs` and `shape_render.rs`:
- Linear gradient → Vello LinearGradient brush
- Radial gradient → Vello RadialGradient brush
- Sweep gradient → Vello SweepGradient brush (if Vello supports, otherwise approximate)
- Image fill → render image clipped to shape path

#### A.4 — Add transparency masks to compositor

Update `compositor.rs`:
- Linear transparency mask → gradient alpha overlay
- Radial transparency mask → radial alpha overlay
- Apply before final composite

#### A.5 — Remove TS effects fallback trigger

Once ALL 21 effects + gradients + masks work on GPU:
1. Remove `layersHaveEffects` check in CanvasViewport.tsx
2. GPU renderer now handles effects — no more CPU fallback for this reason
3. **DO NOT delete effectsEngine.ts yet** — it stays as emergency fallback until Phase C

**Verification**: Open a project with every effect type active. GPU renders correctly. Compare with TS output pixel-by-pixel.

---

### PHASE B — File Format (.rbl ZIP + thamnel-io)

**Goal**: Rust owns persistence. .rbl becomes a real ZIP container. Old JSON files auto-migrate.

#### B.1 — Create thamnel-io crate

```
crates/thamnel-io/
  src/
    lib.rs
    project.rs          — .rbl ZIP read/write
    manifest.rs         — ManifestV1 { format_version, app_version, min_reader_version, doc_hash }
    migration.rs        — detect version, run chained migrations
    asset_manager.rs    — embed/extract assets to/from ZIP
  Cargo.toml            — thamnel-core, zip, serde_json, sha2
```

#### B.2 — Implement save_rbl / load_rbl

**save_rbl(path)**:
1. Serialize `Document` to `document.json`
2. Create `manifest.json` with format_version=1, doc hash
3. Collect referenced assets (images) → `assets/` folder in ZIP
4. Write ZIP to disk with `.rbl` extension

**load_rbl(path)**:
1. Check if file is ZIP or plain JSON (first 2 bytes: `PK` = ZIP, else JSON)
2. If ZIP: extract `manifest.json`, read `document.json`, validate hash
3. If JSON: parse as legacy ProjectModel or DocumentModel, auto-convert
4. Return `Document`

#### B.3 — Add Tauri commands

- `save_project_rbl(path)` — calls thamnel-io save
- `load_project_rbl(path)` — calls thamnel-io load, returns DocumentModel JSON
- Keep old `save_project`/`load_project` temporarily for backward compat

#### B.4 — Rewire fileCommands.ts

```
SAVE: documentStore.project → legacyProjectToDocument() →
      tauriInvoke('save_project_rbl', {path}) → .rbl ZIP

LOAD: tauriInvoke('load_project_rbl', {path}) → DocumentModel →
      documentToLegacyProject() → setProject()
```

#### B.5 — Asset embedding

- On save: scan all layers for image data → write to `assets/` in ZIP
- On load: extract assets, provide paths or data URLs to frontend
- Image nodes store `asset_ref: "assets/image_001.png"` instead of inline base64

**Verification**: Save a multi-layer project as .rbl ZIP. Close app. Reopen. All layers, effects, and images intact. Old JSON files still load.

---

### PHASE C — Kill TS Engine + Wire Rust Hit-Testing

**Goal**: Delete the legacy TS rendering engine. All rendering through Rust GPU. Hit-testing through Rust.

**PREREQUISITE**: Phase A complete (GPU handles all effects, gradients, masks).

#### C.1 — Wire Rust hit-testing into useSelectionManager

Replace TS `pointInRotatedRect()` + `pointInShapePath()` with:
```typescript
const hitId = await tauriInvoke('hit_test', { x: canvasX, y: canvasY });
```

The Rust functions already exist and support shape-precise testing. Just wire them.

#### C.2 — Handle interaction rendering in GPU

Currently, interactive drags use TS CPU fallback because GPU IPC is ~60ms.

**Solution**: During interactions, use the LAST GPU-rendered frame as background + render ONLY the moving layer's transform overlay in TS (lightweight, just a rectangle/outline). This gives instant feedback without full re-render.

Alternative: If binary IPC roundtrip is fast enough (<16ms), just let GPU render during interactions too.

#### C.3 — Delete TS engine files one by one

Delete in this order (each is a separate commit with tests):

1. `src/engine/blendModes.ts` — Rust compositor handles all 17 blend modes
2. `src/engine/layerRenderer.ts` — Rust compositor dispatches by NodeKind
3. `src/engine/shapeRenderer.ts` — Rust shape_render.rs handles all 28 shapes (**only after** hit-testing is wired to Rust in C.1)
4. `src/engine/textRenderer.ts` — Rust text_render.rs handles all text features
5. `src/engine/effectsEngine.ts` — Rust effect pipeline handles all 21 effects
6. `src/engine/compositor.ts` — Rust compositor handles full scene
7. `src/engine/index.ts` — barrel file, delete last

#### C.4 — Clean up CanvasViewport.tsx

Remove:
- `effectiveGpuActive` logic (GPU is always active now)
- `compositeAllLayers()` fallback path
- `layersHaveEffects` check
- `isInteracting` CPU fallback
- `suppressRender` flag

CanvasViewport becomes: display Rust-rendered frame + overlay handles.

#### C.5 — Phase out ProjectModel

Once thamnel-io owns persistence and TS engine is deleted:
1. documentStore uses DocumentModel (Node-based) as primary format
2. Remove `legacyProjectToDocument()` / `documentToLegacyProject()` from hot paths
3. Keep compat.ts conversion only for loading old pre-migration files
4. Delete `ProjectModel.ts`, `LayerModel.ts` types (move to compat.ts as legacy-only)

**Verification**: App runs entirely on GPU rendering. No TS compositor code executes. All tools work. Save/load through Rust.

---

### PHASE D — Features (Parallel Workstreams)

**PREREQUISITE**: Phases A and B complete. Phase C can overlap.

These can be built in any order. Each is independent.

#### D.1 — Text System Polish

- Full cosmic-text text creation from UI
- All text properties wired: font family, size, weight, style, color, stroke
- Letter spacing, line height, alignment (left/center/right/justify)
- Text transform (uppercase/lowercase/capitalize)
- Per-character styled runs (bold, italic, color, underline, strikethrough)
- Text shadow (offset, blur, color)
- Text background (color, opacity, padding, corner radius)
- Fill types on text (solid, gradient)
- Width/height squeeze
- Live text editing on canvas

#### D.2 — Shape System Polish

- Image fill on shapes (image clipped to shape path = mask effect)
- Gradient transparency on shapes/images (linear + radial alpha masks)
- Fill color transparency (globalAlpha on any fill)
- Shape Creator window (separate dialog for complex illustration)
  - Pen tool, freehand, eraser
  - Path operations (union, subtract, intersect) — make functional
  - Export shape to main canvas
- Pin-point properties panel (all shape properties accessible)
- Corner radius per-shape
- Mask mode (shape as clipping mask for layer below)

#### D.3 — AI Features (thamnel-ai crate)

```
crates/thamnel-ai/
  src/
    lib.rs
    runtime.rs           — ORT session management, GPU/CPU fallback
    bg_removal.rs        — InSPyReNet (sync)
    upscale.rs           — Real-ESRGAN (sync)
    face_restore.rs      — CodeFormer + GFPGAN (sync)
    face_detect.rs       — SCRFD (sync)
    inpaint.rs           — LaMa (sync)
    denoise.rs           — SCUNet (sync)
    colorize.rs          — DDColor (sync)
    cartoonize.rs        — White-box Cartoonization (sync)
    model_manager.rs     — Download, verify, cache models
  Cargo.toml             — thamnel-core, ort, image (NO tokio)
```

**Rule**: thamnel-ai exposes SYNC API. App layer uses `tokio::spawn_blocking`.

**Tauri integration**:
```rust
// src-tauri/src/ai_worker.rs
let result = tokio::task::spawn_blocking(move || {
    model.run(&input_image)
}).await??;
```

- Cancellation via CancellationToken checked between model steps
- Progress reporting via channels
- Job queue in jobStore.ts

#### D.4 — Video Frame Extraction (thamnel-video crate)

```
crates/thamnel-video/
  src/
    lib.rs
    ffmpeg.rs            — FFmpeg CLI wrapper (extract, encode, probe)
  Cargo.toml             — tokio only (NO thamnel-core dependency)
```

- Move `extract_video_frames` logic from `commands.rs` into thamnel-video
- FFmpeg path discovery stays in app layer
- Pure media utility — app feeds raw paths, receives frame output

#### D.5 — Additional Features

| Feature | Priority | Phase |
|---------|----------|-------|
| Groups (max depth 2) | High | D |
| Smart guides + snapping | Medium | D |
| Autosave/recovery | Medium | D (after thamnel-io) |
| Clipboard image paste | Medium | D |
| Layer masks (shape-based) | High | D |
| Batch export | Medium | D |
| BMP/WebP export via Rust | Low | D |
| DPI/HiDPI canvas rendering | Medium | D |
| Color management (sRGB) | Low | D |

---

### PHASE E — Networking

**PREREQUISITE**: Phase D.1 (text system) should be solid.

#### E.1 — Text Sync (thamnel-net-text crate)

```
crates/thamnel-net-text/
  src/
    lib.rs
    server.rs            — WebSocket server (for text-sync-server app)
    client.rs            — WebSocket client (for graphics editor)
    protocol.rs          — Text sync message types
  Cargo.toml             — thamnel-core, axum, tokio (NO tonic)
```

**Protocol** (minimal data over wire):
```
Graphics Editor → Text Server:
  { layers: [{ binding_key: "headline", text: "...", style: {...} }] }

Text Client → Text Server → Graphics Editor:
  { binding_key: "headline", text: "Updated text" }
```

Only text content + binding_key travels. Not the full document.

#### E.2 — LAN Discovery

- mDNS/manual IP entry
- Connection UI in settings (textServer: host/port)
- Auto-reconnect

#### E.3 — .rbl File Transfer

- Send .rbl to Animation Server via net-text WebSocket channel or HTTP upload
- Graphics editor does NOT need tonic/gRPC

---

### PHASE F — Production Polish

| Task | Details |
|------|---------|
| Structured logging | tracing + tracing-subscriber, mandatory log points |
| Golden render tests | Image-diff regression tests for Vello output |
| Text layout snapshot tests | cosmic-text layout verification |
| .rbl roundtrip tests | Save → load → save → compare |
| Performance profiling | Ensure <12ms render, <4ms IPC, <1ms hit-test |
| Font management | Bundled template fonts, fallback chains, glyph validation |
| Schema migration tests | v1→v2 migration roundtrip |
| Error recovery | Crash recovery from autosave checkpoints |
| PSD/SVG/PDF export | If needed for broadcast workflow |

---

## PART 4: FILE DELETION SCHEDULE

**Rule**: Never delete a TS file until its Rust replacement is tested and covers ALL features.

| File | Delete After | Blocker |
|------|-------------|---------|
| `src/engine/blendModes.ts` | Phase C.3 | Rust compositor blend modes verified |
| `src/engine/layerRenderer.ts` | Phase C.3 | Rust compositor dispatches all node types |
| `src/engine/shapeRenderer.ts` | Phase C.3 | Rust shape rendering + hit-testing wired to Rust (C.1) |
| `src/engine/textRenderer.ts` | Phase C.3 | Rust text rendering covers all features |
| `src/engine/effectsEngine.ts` | Phase C.3 | All 21 GPU effects verified |
| `src/engine/compositor.ts` | Phase C.3 | Full GPU rendering, no CPU fallback |
| `src/engine/index.ts` | Phase C.3 | After all above deleted |
| `src/types/ProjectModel.ts` | Phase C.5 | thamnel-io handles persistence |
| `src/types/LayerModel.ts` | Phase C.5 | DocumentModel is primary |
| `src/types/compat.ts` | Never fully | Keep for loading pre-migration files |

---

## PART 5: PERFORMANCE BUDGETS

| Metric | Target | Alarm | Measured Where |
|--------|--------|-------|----------------|
| GPU render frame | < 12ms | > 16ms | render_bridge.rs timing |
| Binary IPC roundtrip | < 4ms | > 8ms | useGpuRenderer.ts |
| Hit-test (single) | < 1ms | > 3ms | render_bridge.rs |
| Document Rust sync | < 2ms | > 5ms | documentStore.ts |
| File save (50 layers) | < 500ms | > 1s | thamnel-io |
| File load (50 layers) | < 300ms | > 800ms | thamnel-io |
| AI inference (bg removal) | < 3s | > 8s | ai_worker.rs |
| Effect stack (5 effects) | < 8ms | > 16ms | effect_pass.rs |
| Export 1920x1080 PNG | < 200ms | > 500ms | export.rs |

---

## PART 6: QUICK REFERENCE

### Current Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri v2 |
| UI | React 19 + TypeScript + Zustand + Radix UI + Tailwind CSS |
| GPU rendering | wgpu 27 + Vello 0.7 (behind RenderBackend trait) |
| Text engine | cosmic-text 0.18 |
| 2D geometry (render) | kurbo 0.13 (render-layer only) |
| Serialization | serde + serde_json |
| Layer DnD | @dnd-kit/core + sortable |
| Testing | cargo test + Vitest |

### File Locations

| What | Where |
|------|-------|
| Rust core model | `crates/thamnel-core/src/` |
| Rust GPU renderer | `crates/thamnel-render/src/` |
| Tauri IPC bridge | `src-tauri/src/` |
| React components | `src/components/` |
| Zustand stores | `src/stores/` |
| Custom hooks | `src/hooks/` |
| Type definitions | `src/types/` |
| TS engine (LEGACY) | `src/engine/` |
| Commands | `src/commands/` |
| Settings | `src/settings/` |
| This plan | `TGC_Master_Plan.md` |

### Phase Status Tracker

| Phase | Status | Description |
|-------|--------|-------------|
| A — GPU Effects | NOT STARTED | thamnel-effects + WGSL shaders + gradient fills + masks |
| B — File Format | NOT STARTED | thamnel-io + .rbl ZIP + asset embedding |
| C — Kill TS Engine | NOT STARTED | Wire Rust hit-testing, delete TS engine, remove CPU fallback |
| D — Features | NOT STARTED | Text polish, shape polish, AI, video, groups, masks |
| E — Networking | NOT STARTED | Text sync, LAN discovery, .rbl transfer |
| F — Polish | NOT STARTED | Logging, tests, profiling, fonts, error recovery |

---

**END OF PLAN**

When working on this project, follow this file. Do not reference GC_Core_Plan.md, correct_path.md, GUI_Phase.md, GUI_Works.md, or migration_plan.md — they are superseded by this document.
