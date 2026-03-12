# Thamnel GUI Recreation — Phase-by-Phase Agent Task List
## Complete Operation Reference for Sequential Implementation

> **Source**: Extracted from WPF source code (~30,000 lines across 20+ files)
> **Purpose**: Phase-divided specification so a Claude agent can implement one phase at a time
> **Reference Layout**: `GC_GUI_Plan.md` (UI specification)
> **Rule**: Each phase lists exact deliverables, dependencies, and acceptance criteria

---

## IMPLEMENTATION STATUS (Updated 2026-03-11)

| Phase | Status | Tests |
|-------|--------|-------|
| 1 — Data Models & State | COMPLETE | gw-phase1.test.tsx |
| 2 — Main Layout Shell | COMPLETE | phase2.test.tsx |
| 3 — Undo/Redo & Clipboard | COMPLETE | gw-phase3.test.tsx |
| 4 — Rendering Engine | COMPLETE | phase4.test.tsx, gw-phase4.test.tsx |
| 5 — Canvas Viewport | COMPLETE | phase7.test.tsx, gw-phase5.test.tsx |
| 6 — Selection & Handles | COMPLETE | phase13.test.tsx |
| 7 — Mouse Interactions | COMPLETE | gw-phase8.test.tsx |
| 8 — Canvas Tools | COMPLETE | gw-phase8.test.tsx |
| 9 — Layer Panel (Right) | COMPLETE | phase9.test.tsx, gw-phase9.test.tsx |
| 10 — Properties Panel (Right) | COMPLETE | gw-phase10.test.tsx |
| 11 — Top Toolbar | COMPLETE | phase3.test.tsx, gw-phase11.test.tsx |
| 12 — Menu Bar | COMPLETE | gw-phase12-15.test.tsx |
| 13 — Left Toolbar | COMPLETE | gw-phase12-15.test.tsx |
| 14 — Context Menus | COMPLETE | gw-phase12-15.test.tsx |
| 15 — Keyboard Shortcuts | COMPLETE | phase14.test.tsx, gw-phase12-15.test.tsx |
| 16 — Left Tab Panel | COMPLETE | phase15.test.tsx, gw-phase16-18.test.tsx |
| 17 — Frame Gallery | COMPLETE | phase16.test.tsx, gw-phase16-18.test.tsx |
| 18 — Status Bar | COMPLETE | phase6.test.tsx, gw-phase16-18.test.tsx |
| 19 — Dialog Windows (Core) | COMPLETE | phase17.test.tsx |
| 20 — Dialog Windows (Advanced) | COMPLETE | phase17.test.tsx |

**Total: 1118 tests passing across 35 test files**
**Built EXE: src-tauri/target/release/thamnel-graphics-editor.exe (13.5 MB)**
**Installer: src-tauri/target/release/bundle/nsis/Thamnel Graphics Editor_0.1.0_x64-setup.exe**

---

## PHASE OVERVIEW

| Phase | Name | Depends On | Deliverables |
|-------|------|-----------|--------------|
| 1 | Data Models & State | — | Types, enums, stores, settings |
| 2 | Main Layout Shell | Phase 1 | Window grid, panels, splitters |
| 3 | Undo/Redo & Clipboard | Phase 1 | Snapshot system, clipboard ops |
| 4 | Rendering Engine | Phase 1 | Layer rendering, blend compositing |
| 5 | Canvas Viewport | Phase 2, 4 | Zoom, pan, rulers, grid, overlays |
| 6 | Selection & Handles | Phase 5 | Selection, handles, hit-testing |
| 7 | Mouse Interactions | Phase 6 | Move, resize, rotate, crop, anchor, marquee |
| 8 | Canvas Tools | Phase 7 | Eraser, blur brush, shape/text draw, inline edit |
| 9 | Layer Panel (Right) | Phase 1, 3 | Layer list, drag-drop, thumbnails, footer |
| 10 | Properties Panel (Right) | Phase 1, 4 | Properties tab, 21 effects, text/shape controls |
| 11 | Top Toolbar | Phase 1, 3 | All 28 toolbar buttons/combos |
| 12 | Menu Bar | Phase 11 | All 8 menus with full operations |
| 13 | Left Toolbar | Phase 8 | Tool toggles, popups, swatches |
| 14 | Context Menus | Phase 7, 9 | Canvas + layer panel context menus |
| 15 | Keyboard Shortcuts | Phase 7, 8 | 50+ shortcuts with full behavior |
| 16 | Left Tab Panel | Phase 1 | Video browser, image gallery, server audio |
| 17 | Frame Gallery | Phase 1 | Frame strip, video tabs, extraction |
| 18 | Status Bar | Phase 1 | Status text, progress, server indicators |
| 19 | Dialog Windows (Core) | Phase 10 | Settings, color picker, fill picker, shape creator |
| 20 | Dialog Windows (Advanced) | Phase 4, 19 | Image Studio, text props, batch, gallery, etc. |

---

# PHASE 1 — Data Models, Enums & State Management

## Goal
Define all data types, enums, state stores, and settings that every other phase depends on.

## Deliverables

### 1A — Enums
```
LayerType: Image, Text, Shape, Group
BlendMode (17): Normal, Multiply, Darken, ColorBurn, Screen, Lighten, ColorDodge, LinearDodge, Overlay, SoftLight, HardLight, Difference, Exclusion, Hue, Saturation, Color, Luminosity
ShapeType (27): Line, DiagonalLine, Rectangle, RoundedRectangle, Snip, Ellipse, Triangle, RightTriangle, Diamond, Parallelogram, Trapezoid, Pentagon, Hexagon, Octagon, Cross, Heart, Star, Star6, Ring, Arrow, ArrowLeft, ArrowUp, ArrowDown, DoubleArrow, ChevronRight, ChevronLeft, Custom
FillType: Solid, LinearGradient, RadialGradient, SweepGradient, Image
TextAlignmentOption: Left, Center, Right, Justify
TransparencyMaskType: None, Linear, Radial
DragMode: None, Move, Resize, Rotate, Crop, FillMove, FillResize, FillRotate, Erase, BlurBrush, MultiResize, MultiRotate, MarqueeSelect, DrawShape, DrawText, AnchorMove
TextTransformOption: None, Uppercase, Lowercase, Capitalize
TextBgMode: BoundingBox, PerLine, WidestLine
```

### 1B — LayerModel
| Property | Type | Default | Notes |
|----------|------|---------|-------|
| Id | string | GUID | Unique identifier |
| Name | string | "Layer" | Display name |
| Type | LayerType | Image | Layer type |
| X, Y | f64 | 0.0 | Canvas position |
| Width, Height | f64 | 200.0 | Dimensions |
| Rotation | f64 | 0.0 | Degrees |
| Opacity | f64 | 1.0 | 0.0–1.0 |
| IsVisible | bool | true | |
| IsLocked | bool | false | |
| BlendMode | BlendMode | Normal | |
| FlipHorizontal | bool | false | |
| FlipVertical | bool | false | |
| Padding | f64 | 0.0 | |
| ImageData | bytes? | null | PNG bytes |
| TextProps | TextProperties? | null | |
| ShapeProps | ShapeProperties? | null | |
| Effects | LayerEffect | new() | 21 effects |
| ColorAdj | ColorAdjustment | new() | BSCH |
| CropTop/Bottom/Left/Right | f64 | 0.0 | |
| ParentGroupId | string? | null | Group hierarchy |
| ChildIds | Vec\<string\> | [] | Group children |
| IsExpanded | bool | true | Panel expand |
| GroupColor | string? | null | Hex color |
| IsFrameReceiver | bool | false | Shape accepts frame images |
| IsSuperLocked | bool | false | Full protection |
| BlurMaskData | bytes? | null | Blur mask PNG |
| BlurRadius | f64 | 15.0 | |
| IsBackground | bool | false | |
| IsLiveDateTime | bool | false | |
| AnchorX, AnchorY | f64 | 0.5 | Rotation anchor (0–1) |

**Computed methods**:
- `GetEffectiveVisibility()` — walk ancestor chain, all must be visible
- `GetEffectiveLock()` — walk ancestor chain, any locked = locked
- `GetEffectiveSuperLock()` — walk ancestor chain, any super-locked = super-locked
- `GetEffectiveOpacity()` — multiply opacity down ancestor chain
- `Clone()` — deep copy including byte arrays
- `GetUniqueLayerName(baseName, existingLayers)` — "Name 01", "Name 02", etc.

### 1C — TextProperties
| Property | Type | Default |
|----------|------|---------|
| Text | string | "Text" |
| FontFamily | string | "Arial" |
| FontSize | f64 | 48.0 |
| Bold, Italic, Underline, Strikethrough | bool | false |
| FillColor | string | "#FF000000" |
| FillDef | FillDefinition? | null |
| StrokeColor | string | "#00000000" |
| StrokeWidth | f64 | 0.0 |
| LineSpacing | f64 | 1.0 |
| LetterSpacing | f64 | 0.0 |
| TextAlignment | TextAlignmentOption | Center |
| TextTransform | TextTransformOption | None |
| HasBackground | bool | false |
| BackgroundColor | string | "#80000000" |
| BackgroundPadding T/B/L/R | f64 | 10.0 |
| BackgroundCornerRadius | f64 | 0.0 |
| BgMode | TextBgMode | PerLine |
| BgTextCutout | bool | false |
| BgImageFill | bool | false |
| SqueezeWidth, SqueezeHeight | f64 | 0.0 |
| Runs | Vec\<StyledRun\> | [] |

### 1D — ShapeProperties
| Property | Type | Default |
|----------|------|---------|
| ShapeType | ShapeType | Rectangle |
| FillColor | string | "#FFFF6600" |
| BorderColor | string | "#FFFFFFFF" |
| BorderWidth | f64 | 0.0 |
| CornerRadius | f64 | 0.0 |
| IsImageFilled | bool | false |
| ImageFillData | bytes? | null |
| ImageFillOffsetX/Y | f64 | 0.0 |
| ImageFillScaleX/Y | f64 | 1.0 |
| ImageFillRotation | f64 | 0.0 |
| ImageFillCrop T/B/L/R | f64 | 0.0 |
| MaskType | TransparencyMaskType | None |
| MaskAngle, Top, Bottom, Left, Right | f64 | 0.0 |
| MaskCenterX/Y | f64 | 0.5 |

### 1E — LayerEffect (21 toggles + parameters)
| Effect | Toggle | Parameters |
|--------|--------|-----------|
| Brightness | bool | Value: -100 to 100, default 0 |
| Contrast | bool | Value: -100 to 100, default 0 |
| Saturation | bool | Value: -100 to 100, default 0 |
| Hue | bool | Value: -180 to 180, default 0 |
| Grayscale | bool | (none) |
| Sepia | bool | (none) |
| Invert | bool | (none) |
| Sharpen | bool | Amount: 0–1, default 0.5 |
| Vignette | bool | Radius: 0–1 (0.7), Amount: 0–1 (0.6) |
| Pixelate | bool | Size: 2–50, default 8 |
| ColorTint | bool | Color: hex, Amount: 0–1 (0.3) |
| Noise | bool | Amount: 1–100, default 20 |
| Posterize | bool | Levels: 2–16, default 4 |
| GaussianBlur | bool | Radius: 1–50, default 5 |
| DropShadow | bool | OffX/OffY: -50/50 (4), Blur: 0/50 (8), Color: hex |
| OuterGlow | bool | Radius: 1–200 (10), Opacity: 0–100 (100), Color: hex |
| CutStroke | bool | Width: 1–20 (2), Color: hex |
| RimLight | bool | L/R Color, L/R Intensity: 0–100 (60), Glow: 0–100 (30), Softness: 0–100 (50) |
| SplitToning | bool | Shadow/Highlight Color, Balance: 0–100 (50), Strength: 0–100 (30) |
| SmoothStroke | bool | Thickness: 1–20 (3), Smoothness: 0–10 (2), Color, Opacity: 0–100 (100) |
| BlendOverlay | bool | Color, Mode: BlendMode, Opacity: 0–100 (50) |

### 1F — FillDefinition
| Property | Type | Default |
|----------|------|---------|
| Type | FillType | Solid |
| SolidColor | string | "#FF000000" |
| GradientStops | Vec\<{color, position, alpha}\> | [{white,0},{black,1}] |
| GradientAngle | f64 | 0.0 |
| GradientCenterX/Y | f64 | 0.5 |
| GradientRadiusX/Y | f64 | 0.5 |
| ImageStretch | enum | UniformFill |
| ImageOffsetX/Y | f64 | 0.0 |
| ImageScaleW/H | f64 | 100.0 |
| GlobalAlpha | f64 | 1.0 |

### 1G — ProjectModel
| Property | Type | Default |
|----------|------|---------|
| ProjectId | string | GUID |
| Version | string | "1.0" |
| CanvasWidth, CanvasHeight | i32 | 1280, 720 |
| CanvasBackground | string | "#FF1A1A1A" |
| Layers | Vec\<LayerModel\> | [] |
| SourceVideoPaths | Vec\<string\> | [] |
| CreatedAt, ModifiedAt | DateTime | Now |

### 1H — AppSettings (160+ properties)
Create a settings store with JSON persistence. Key categories:
- **Window**: Left/Top/Width/Height/IsMaximized (100, 100, 1400, 850, false)
- **Paths**: DefaultProject/Export/Video/Template/Gallery/Background/Presets/LayoutPresets
- **AutoSave**: Interval=300s
- **Export**: Format="PNG", JpgQuality=95
- **Canvas**: GridSizeX/Y=50, GridLineColor="#808080", GridLineOpacity=15, CanvasQuality=100
- **Video**: FrameExtractionInterval=10, Count=20, FrameGalleryHeight=130
- **Nudge**: Arrow=1, Shift=5, CtrlShift=10, CtrlShiftAlt=50
- **Eraser**: Type=Circle, Size=20, Hardness=100
- **BlurBrush**: Type=Circle, Size=30, Hardness=80, Radius=15, Opacity=100
- **Selection**: Color=#FF6600, FirstSelected=#00FF00, Multi=#FF6600, GroupBox=#00BCD4, Marquee=#0078D7
- **Handles**: Size=8, RotationOffset=28, Stroke=1.5
- **Servers**: TextServer IP/Port/AutoConnect, RenderServer IP/Port/AutoConnect
- **Undo**: DiskLimitGB=10, MaxCount=30
- **GroupColors**: [#FF6B6B, #4ECDC4, #FFD93D, #A78BFA, #60A5FA, #F472B6, #A3E635, #FBBF24]

### 1I — Canvas Presets Data
- Social Media (20): YouTube Banner 2560x1440, Thumbnail 1280x720, Profile 800x800, Facebook Cover 851x315, Group 1640x856, Event 1920x1050, Profile 170x170, TikTok Profile 200x200, Video 1080x1920, Instagram Profile 320x320, Post 1080x1080, Portrait 1080x1350, Stories 1080x1920, X Profile 400x400, Header 1500x500, LinkedIn Banner 1584x396, Profile 400x400, Twitch Banner 1200x480, Pinterest 600x600, Discord 960x540
- Paper 300DPI (9): A0 9933x14043, A1 7016x9933, A2 4961x7016, A3 3508x4961, A4 2480x3508, A5 1748x2480, Letter 2550x3300, Legal 2550x4200, Tabloid 3300x5100
- Display (6): VGA 640x480, HD 1280x720, FHD 1920x1080, 2K 2560x1440, 4K 3840x2160, 8K 7680x4320

### 1J — Core State Store
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| Layers | ObservableList\<LayerModel\> | [] | All layers |
| SelectedLayer | LayerModel? | null | Current selection |
| SelectedLayerIds | Vec\<string\> | [] | Multi-selection |
| CanvasWidth/Height | i32 | 1280/720 | |
| CanvasBackground | string | "#FF1A1A1A" | |
| Zoom | f64 | 1.0 | 0.1–5.0 |
| ShowGrid | bool | false | |
| ShowItemsOutsideCanvas | bool | true | |
| ActiveTool | string | "Select" | Select/Brush/BlurBrush/Shape/Text/Image/BgRemove |
| IsDirty | bool | false | |
| CurrentProjectPath | string? | null | |
| ProjectId | string | GUID | |
| WindowTitle | string | "Thamnel" | |
| StatusText | string | "" | |

**Derived**: HasSelectedLayer, IsTextSelected, IsImageSelected, IsShapeSelected, CanUseImageTools

**Suppression flags**: SuppressCollectionRender, IsDragInteractive, IsChangingSelectedLayer

## Acceptance Criteria
- [ ] All types compile/parse correctly
- [ ] LayerModel.Clone() produces independent deep copy
- [ ] GetEffective* methods walk ancestor chain correctly
- [ ] Settings load/save to JSON
- [ ] Canvas presets data is complete and accurate

---

# PHASE 2 — Main Layout Shell

## Goal
Build the window chrome and panel grid — empty panels with correct sizing and splitters.

## Dependencies: Phase 1

## Deliverables

### 2A — Root Grid (4 rows)
| Row | Height | Content |
|-----|--------|---------|
| 0 | Auto | Menu Bar (placeholder) |
| 1 | Auto | Top Toolbar (placeholder) |
| 2 | Fill | Main Content Area |
| 3 | Auto | Status Bar (placeholder) |

### 2B — Main Content (4 columns)
| Column | Width | Content |
|--------|-------|---------|
| 0 | Fill | Left side (canvas + frames) |
| 1 | 0 (collapsed) | Effect bar (reserved) |
| 2 | Auto | Right panel splitter (4px, draggable) |
| 3 | 310px | Right panel |

### 2C — Left Side (3 rows)
| Row | Height | Content |
|-----|--------|---------|
| 0 | Fill | Main area (toolbar + browser + canvas) |
| 1 | Auto | Frame gallery splitter (4px, draggable) |
| 2 | 130px (min 60, max 400) | Frame Gallery (placeholder) |

### 2D — Main Area (4 columns)
| Column | Width | Content |
|--------|-------|---------|
| 0 | 48px | Left toolbar (placeholder) |
| 1 | 0 (collapsed) | Left tab panel |
| 2 | 0 (collapsed) | Splitter for left tab panel |
| 3 | Fill | Central canvas (placeholder) |

### 2E — Theme & Colors
Apply CSS variables / theme tokens:
- `--accent-orange: #FF6600`, `--dark-bg: #1A1A1A`, `--panel-bg: #252525`, `--toolbar-bg: #2D2D2D`
- `--hover-bg: #3A3A3A`, `--selected-bg: #404040`, `--border-gray: #444444`
- `--text-primary: #FFFFFF`, `--text-secondary: #B0B0B0`, `--canvas-bg: #333333`
- Window: 1400x850, min 1000x600

## Acceptance Criteria
- [ ] All panels render at correct sizes with dark theme
- [ ] Splitters are draggable and resize adjacent panels
- [ ] Frame gallery height respects min 60 / max 400
- [ ] Right panel width persists to settings
- [ ] Left tab panel can be toggled collapsed/expanded

---

# PHASE 3 — Undo/Redo & Clipboard System

## Goal
Implement the snapshot-based undo/redo system and cross-instance clipboard.

## Dependencies: Phase 1

## Deliverables

### 3A — Undo/Redo (Snapshot System)
**TakeSnapshot()**:
1. Serialize entire `Layers` collection to JSON
2. Compute MD5 hash — skip if matches last snapshot (dedup)
3. Write to storage (file or IndexedDB): `temp/{ProjectId}/snap_{index}.json`
4. Push file path/key to `_undoStack`, clear `_redoStack`
5. Enforce limits: max `Settings.MaxSnapshotCount` (30), max `Settings.SnapshotDiskLimitGB` (10)

**Undo**:
1. canExecute: `_undoStack.Count > 0`
2. Push current state to `_redoStack`
3. Pop from `_undoStack`, deserialize, replace Layers
4. Re-select layer by ID if still exists
5. Trigger full render

**Redo**: Same reversed — push to `_undoStack`, pop from `_redoStack`

**Operations that take snapshots**: Every mutation — add/delete/duplicate/reorder layers, property changes, transforms, eraser/blur strokes, text edits, effect changes, group/ungroup, AI ops, import/paste, alignment, merge/rasterize, nudge (one per hold sequence)

### 3B — Clipboard System
**Copy**:
1. Guard: selected layer, not super-locked
2. Serialize layer(s) to JSON
3. Groups: include all descendants recursively
4. Clone ImageData/ImageFillData byte arrays separately
5. Files > 5MB: offload to temp storage
6. Store with custom format key "ThamneLayer"

**Paste** (priority chain):
1. "ThamneLayer" format: deserialize, remap all IDs (new GUIDs), offset +20,+20, restore image data. If pasting Image onto shape with `IsFrameReceiver=true`, fill shape instead. Enforce max depth 2. Assign group color.
2. System clipboard image: create new Image layer
3. HTML/text clipboard: detect image URLs, download, create layer

**Duplicate**:
1. JSON clone + byte[] copy, new GUID, unique name, offset +20,+20
2. Groups: recursively duplicate descendants, remap ParentGroupId
3. Insert above original, select duplicate

## Acceptance Criteria
- [ ] Undo/redo correctly restores full layer state
- [ ] MD5 dedup prevents duplicate snapshots
- [ ] Clipboard works across instances/tabs
- [ ] Large images (>5MB) handled via temp storage
- [ ] Paste remaps all IDs, groups maintain hierarchy
- [ ] Max depth 2 enforced on paste

---

# PHASE 4 — Rendering Engine

## Goal
Implement the layer rendering pipeline that composites all layers to a display surface.

## Dependencies: Phase 1

## Deliverables

### 4A — RenderLayerToSKBitmap(layer) — Single Layer Render
1. Handle eraser override (live eraser bitmap with padding)
2. Apply blur mask if exists (merge onto source before rendering)
3. **Render by type**:
   - Image: decode ImageData bytes to bitmap
   - Text: render via text shaping (font, size, style, alignment, line spacing, letter spacing, squeeze, per-run StyledRun formatting, background boxes, stroke)
   - Shape: render 27 shape paths (Line, DiagonalLine, Rectangle, RoundedRectangle, Snip, Ellipse, Triangle, RightTriangle, Diamond, Parallelogram, Trapezoid, Pentagon, Hexagon, Octagon, Cross, Heart, Star, Star6, Ring, Arrow, ArrowLeft/Up/Down, DoubleArrow, ChevronRight/Left) with fill (solid/gradient/image), border, corner radius, transparency masks
   - Group: skip (children rendered individually)
4. Apply color adjustments: brightness, contrast, saturation, hue
5. Apply gaussian blur (if enabled)
6. Apply pixel effects: sharpen, vignette, pixelate, tint, noise, posterize, grayscale, sepia, invert
7. Cache result with version number — reuse if unchanged

### 4B — ApplyBlendComposite() — Full Canvas Composite
1. Calculate display scale: `Zoom * dpiScale * (CanvasQuality / 100%)`, cap to 16M pixels
2. Create render surface with calculated dimensions
3. Draw canvas background (solid color or checkerboard for transparency)
4. For each visible, non-Group layer (reverse order = bottom to top):
   - Call RenderLayerToSKBitmap() to get layer bitmap
   - Set up paint: blend mode, effective opacity (ancestor chain product)
   - Apply crop clipping
   - Apply rotation + flip transforms (Translate, Rotate/Scale, Translate)
   - Apply text squeeze (ScaleTransform with alignment anchoring: Left=left edge, Center=center, Right=right edge)
   - **During interactive drag**: skip expensive effects, use cached bitmaps, low quality
   - **Normal**: apply Drop Shadow (CreateDropShadow), Outer Glow (zero-offset shadow), Cut Stroke (dilation + DstOut), Rim Light, Split Toning, Smooth Stroke, Blend Overlay
5. Convert to display bitmap, show on canvas

### 4C — RenderAllLayers() — Full Rebuild
1. Iterate layers reverse order
2. Create/update invisible hit-test elements (Opacity=0 but hittable) for each visible layer
3. Apply crop clipping, rotation/flip to hit-test elements
4. Clean up orphaned elements for deleted/hidden layers
5. Call ApplyBlendComposite()
6. Call UpdateSelectionHandles()
7. **CRITICAL RULE**: Only call when layer CONTENT changes — never on selection change

### 4D — Blend Mode Mapping
Map 17 blend modes to rendering engine equivalents:
Normal, Multiply, Darken, ColorBurn, Screen, Lighten, ColorDodge, LinearDodge(Add), Overlay, SoftLight, HardLight, Difference, Exclusion, Hue, Saturation, Color, Luminosity

## Acceptance Criteria
- [ ] All 4 layer types render correctly
- [ ] All 27 shape types render accurate paths
- [ ] All 21 effects apply correctly
- [ ] 17 blend modes composite correctly
- [ ] Canvas quality slider affects render resolution
- [ ] Interactive drag skips expensive effects for performance
- [ ] Effect caching prevents redundant re-renders

---

# PHASE 5 — Canvas Viewport

## Goal
Build the canvas viewport with zoom, pan, rulers, grid, and overlay layers.

## Dependencies: Phase 2, 4

## Deliverables

### 5A — Canvas Container
- ScrollView with auto scrollbars
- Inner container: centered, margin=40, zoom via scale transform bound to `Zoom`
- Canvas shadow: drop-shadow (blur=20, opacity=0.5, depth=5)

### 5B — Canvas Overlay Layers (bottom to top)
1. **DesignCanvas**: bg=white, width/height = CanvasWidth/CanvasHeight
2. **GridOverlay**: visible when ShowGrid=true, lines at GridSizeX/Y intervals, color/opacity from Settings
3. **DimOverlay**: semi-transparent (#80000000) outside canvas bounds
4. **PaddingOverlay**: padding guide lines
5. **MarkerGuideOverlay**: ruler drag guides (cyan #00BCD4, dash {4,4})
6. **MarqueeOverlay**: selection rectangle
7. **HandleOverlay**: selection handles, rotation handle, anchor crosshair

### 5C — Ruler System
- Top ruler: 20px height, bg=#1E1E1E, cursor=ns-resize (drag creates horizontal guide)
- Left ruler: 20px width, bg=#1E1E1E, cursor=ew-resize (drag creates vertical guide)
- Corner: 20x20, bg=#1E1E1E
- Tick colors: minor=#646464, labels=#A0A0A0, canvas edges=#FF6600
- Zoom-adaptive intervals: switch between 50/100/200/500px based on zoom level

### 5D — Zoom Controls
- Zoom In: +0.1, clamp to max 5.0
- Zoom Out: -0.1, clamp to min 0.1
- Original Size: set to 1.0
- Fit to Screen: `zoom = min(viewportW/canvasW, viewportH/canvasH) * 0.95`, center
- Scroll Wheel Zoom: Ctrl+scroll, maintain mouse position as anchor
- Zoom to percentage: Ctrl+0 (100%), Ctrl+1 (fit), Ctrl+2..5 (200-500%, center on mouse)

### 5E — Pan
- Space+drag: pan mode (cursor=Hand, update scroll offset)
- Space release: restore cursor

### 5F — Active Tool Indicator
- Bottom-left corner: "Tool: {ActiveTool}", font-size=11, secondary, opacity=0.6

## Acceptance Criteria
- [ ] Canvas renders at correct zoom level with smooth scaling
- [ ] Rulers show accurate measurements and adapt to zoom
- [ ] Grid overlay toggles and renders at correct intervals
- [ ] Zoom maintains mouse position as anchor
- [ ] Space+drag pans smoothly
- [ ] Marker guides can be dragged from rulers

---

# PHASE 6 — Selection & Handles

## Goal
Implement layer selection, multi-selection, and visual selection handles.

## Dependencies: Phase 5

## Deliverables

### 6A — Selection Logic
- Click layer: select (replaces current selection)
- Shift+click: add/remove from multi-selection
- Click empty area: deselect all
- `IsLayerSelectable(layer)`: not super-locked, effectively visible, not Group (select Group's children unless clicking group bounds)

### 6B — Selection Handles (UpdateSelectionHandles)
- Handle size: `8 * (1/zoom)` (zoom-compensated), configurable via Settings
- **Single layer**: 8 resize handles (4 corners + 4 edge midpoints) + rotation handle (35px above center via RotationHandleOffset) + anchor crosshair
- **Multi-selection / Group**: dashed bounding box (dash {6,3}), 8 resize + rotation
- **Colors**: single=Settings.SelectionColor (#FF6600), first-multi=Settings.FirstSelectedColor (#00FF00), additional-multi=Settings.MultiSelectedColor (#FF6600), group=Settings.GroupBoxColor (#00BCD4)
- **Locked layer**: dashed border only, no handles
- **CRITICAL**: This is LIGHTWEIGHT — only updates handles, never re-renders layer content

### 6C — Hit-Testing
- Each visible layer has an invisible hit-test element (Opacity near 0, but hittable)
- Apply rotation/flip/crop transforms to hit-test geometry
- Hit-test checks from top layer down (first hit wins)
- Resolve to parent group (click child = select parent group)

### 6D — Smart Guides (during drag only)
**Snap targets** (cached, rebuilt when dirty):
- Canvas edges (0, Width, Height) and center (Width/2, Height/2)
- All visible, non-Group layer edges/centers (crop-adjusted bounds)
- Marker guide lines (if enabled)

**Snap behavior**:
- Threshold: 5px for layers, configurable for markers
- Guide lines: magenta (255,0,255), thickness 0.5, dash {2,2}
- 3 X test points per moving layer (left, center, right) against all X targets
- 3 Y test points (top, center, bottom) against all Y targets

## Acceptance Criteria
- [ ] Single-click selects, Shift adds to multi-select
- [ ] Handles render at correct zoom-compensated size
- [ ] Rotation handle positioned correctly above layer
- [ ] Group/multi shows dashed bounding box with correct color
- [ ] Locked layers show dashed border, no handles
- [ ] Smart guides appear during drag with magenta lines
- [ ] Snap correctly to canvas edges/centers and other layer edges/centers

---

# PHASE 7 — Mouse Interactions

## Goal
Implement all canvas drag operations: move, resize, rotate, crop, anchor, multi-ops, marquee.

## Dependencies: Phase 6

## Deliverables

### 7A — Mouse Down Priority Chain
Process in order — first match wins:
1. Inline text commit (if RichTextBox active)
2. Shape fill edit click (rotation/resize/move handles on fill overlay)
3. Double-click: anchor reset / enter fill edit / start inline text
4. Tool action: Brush/BlurBrush/Shape/Text/Image/BgRemove
5. Group rotation drag start
6. Group resize drag start
7. Anchor drag start
8. Single rotation drag start
9. Single resize drag start (Alt = crop mode)
10. Group bounds move
11. Single bounds move (Ctrl = duplicate-then-move)
12. Hit-test selection
13. Fallback selection (closest unselected within 50px)
14. Marquee start

### 7B — Move (DragMode.Move)
1. Delta: `dx = pos.X - start.X`, `dy = pos.Y - start.Y`
2. **Shift**: Constrain to axis — if `|dx| > |dy|` set `dy=0`, else `dx=0`
3. **Ctrl**: Duplicate layer at original position, drag the clone
4. **Grid snap**: if ShowGrid, snap to grid intersections
5. **Object snap**: snap edges/center to other layers within 5px
6. **Multi-selection**: apply delta to ALL selected layers
7. **Smart guides**: draw snap alignment lines
8. **Live preview**: ApplyBlendComposite() + translate HandleOverlay (don't rebuild)
9. **On release**: ApplyBlendComposite() for single; RenderAllLayers() only if has blend/effects

### 7C — Resize (DragMode.Resize)
1. Transform delta to layer-local space (rotation matrix)
2. Handle-specific: 8 handles modify different edges
3. **Shift**: Lock aspect ratio
4. **Ctrl**: Symmetric from center
5. **Ctrl+Shift**: Both
6. Minimum: 20px
7. Grid/edge snap
8. Opposite corner/edge fixed (Photoshop behavior)
9. **On release**: RenderAllLayers()

### 7D — Rotate (DragMode.Rotate)
1. Angle from anchor to cursor: `atan2(dy, dx)`
2. Apply delta to `Rotation`
3. **Shift**: Snap to 15 degree increments
4. Rotation around anchor point (not center)
5. Recalculate position so anchor stays at screen position
6. **On release**: ApplyBlendComposite()

### 7E — Crop (DragMode.Crop)
1. Alt + drag on resize handle
2. Handle-specific: Top: CropTop += dy, Bottom: CropBottom -= dy, etc.
3. Corner handles combine both axes
4. All values >= 0
5. **On release**: apply crop, RenderAllLayers()

### 7F — Anchor Move (DragMode.AnchorMove)
1. Un-rotate cursor around layer center
2. Compute anchor fractions (0-1 normalized)
3. Center snap: if within 3% of 0.5, snap to 0.5
4. Clamp 0-1
5. Double-click: reset to (0.5, 0.5)

### 7G — Multi-Resize (DragMode.MultiResize)
1. Resize group bounding box
2. Shift+corner: uniform proportional
3. Scale all children proportionally
4. **On release**: RenderAllLayers()

### 7H — Multi-Rotate (DragMode.MultiRotate)
1. All layers orbit around group center
2. Each layer's Rotation also incremented
3. Shift: 15 degree snap
4. **On release**: RenderAllLayers()

### 7I — Marquee Selection (DragMode.MarqueeSelect)
1. Click empty area, drag rectangle
2. Color: Settings.MarqueeColor (#0078D7)
3. **On release** (if w>3 && h>3): select all layers with bounds inside marquee
4. Resolve to parent groups, deduplicate

### 7J — Shape Fill Edit Mode
Entry: double-click shape with IsImageFilled
- **Drag body**: move image (ImageFillOffsetX/Y), Shift=axis constrain
- **Drag handles** (8): scale image (ImageFillScaleX/Y), Alt=crop, Shift=aspect lock
- **Drag rotation**: rotate image (ImageFillRotation), Shift=15 degree snap
Exit: click outside / Escape(cancel) / select other layer(commit)

## Acceptance Criteria
- [ ] All 14 priority chain items work correctly
- [ ] Move with Shift constrains to axis
- [ ] Move with Ctrl duplicates-then-drags
- [ ] Resize respects rotation, aspect lock, symmetric mode
- [ ] Rotate around anchor (not center), Shift snaps to 15 degrees
- [ ] Crop adjusts values correctly per handle
- [ ] Multi-resize scales all children proportionally
- [ ] Marquee selects correct layers
- [ ] Fill edit mode supports move/resize/rotate/crop of image within shape

---

# PHASE 8 — Canvas Tools

## Goal
Implement eraser, blur brush, shape drawing, text drawing, and inline text editing.

## Dependencies: Phase 7

## Deliverables

### 8A — Eraser Tool
**Activation**: B key or Eraser button. Right-click button opens settings dialog.
**Target**: image layers, shapes with image fill.

**Mouse Down**: Hit-test, init persistent bitmap from layer data, set DragMode.Erase, EraseAtPoint(), capture mouse

**Mouse Move (EraseAtPoint)**:
1. Convert canvas pos to image-local coords (handle fill offset/scale)
2. Interpolate stroke between last and current point
3. Per point: Hard(hardness=100)=Clear blend | Soft(<100)=DstOut+radial gradient
4. Block brush=DrawRect | Circle brush=DrawCircle
5. Anti-erase (right-click or Ctrl): SrcOver from original backup
6. UpdateEraserVisualFast() for live preview

**Mouse Up**: Encode bitmap, save to ImageData, cleanup

**Cursor**: Circle=hollow circle dashed (3on,2off) | Block=hollow square | color from Settings | scales with zoom

### 8B — Blur Brush Tool
**Activation**: J key or Blur Brush button. Right-click opens settings.

**Mouse Down**: Hit-test image, init blur mask bitmap (or load existing BlurMaskData)

**Mouse Move**: Paint white onto mask with opacity (normal) | DstOut erase (anti-blur: right-click/Ctrl/Shift+J). Throttle to 30 FPS.

**Mouse Up**: Encode mask, save to BlurMaskData

**Cursor**: Normal=solid dashed #00BFFF | Anti-blur=dotted (1on,2off)

### 8C — Shape Drawing
**Activation**: R key or Shape button.
**Down**: record start, DragMode.DrawShape, orange dashed rect preview
**Move**: update rect, Shift=square constraint
**Up**: if w>5 && h>5: AddShapeAtRect(), auto-switch to Select

### 8D — Text Drawing
**Activation**: T key or Text button.
**Down**: record start, DragMode.DrawText, light dashed rect preview
**Move**: update rect
**Up**: if w>20 && h>10: AddTextAtRect(), start inline text edit

### 8E — Inline Text Editing
**Activation**: double-click text, F2, or after text draw.
1. Create RichTextBox overlay at layer position/size
2. Convert StyledRuns to FlowDocument (per-run styling: font, size, bold, italic, color, underline, strikethrough)
3. Apply RotateTransform matching layer rotation
4. Orange border (#FF6600, 1.5px)
5. Hide original layer element
6. **Live preview**: 150ms debounce, update layer text, re-render
7. **Ctrl+Enter**: commit — ExtractRunsFromDocument(), update TextProperties, remove overlay, render
8. **Escape**: cancel — restore original text

## Acceptance Criteria
- [ ] Eraser paints transparency with correct brush shape/hardness
- [ ] Anti-erase restores pixels from original
- [ ] Blur brush creates mask that affects rendering
- [ ] Shape draw creates correct shape type at drawn rect
- [ ] Text draw creates text and starts inline edit
- [ ] Inline text preserves per-run formatting (StyledRun)
- [ ] All tools auto-switch to Select after creation

---

# PHASE 9 — Layer Panel (Right Panel — Layers Tab)

## Goal
Build the layer list with 7-column items, drag-drop reorder, thumbnails, and footer buttons.

## Dependencies: Phase 1, 3

## Deliverables

### 9A — Layer List
- Scrollable list bound to Layers collection
- Selected item: bg=#33FF6600
- AllowDrop for drag-and-drop

### 9B — Layer Item Template (7 columns)
| Col | Element | Size | Behavior |
|-----|---------|------|----------|
| 0 | Expand/Collapse | 16x16 | Groups only. ChevronDown/Right. Toggle IsExpanded (hides children in panel, not canvas) |
| 1 | Visibility toggle | 24x24 | Eye/EyeOff. Toggle IsVisible. If group: toggle all descendants |
| 2 | Type icon | 22x22 | Image/FormatText/ShapeOutline/FolderOutline. rounded-3, hover=hover-bg |
| 3 | Layer name | fill | 12pt, ellipsis. Double-click: TextBox for inline rename. Enter=commit, Escape=cancel. Super-locked: gray #707070 |
| 4 | Super lock icon | 14x14 | ShieldLock, red #FF6B6B. Visible only when IsSuperLocked |
| 5 | Thumbnail | 22x22 | rounded-2, bg=#333. Orange border if IsFrameReceiver. Dirty-flag re-render |
| 6 | Lock toggle | 24x24 | Lock/LockOpenVariant. Toggle IsLocked |

### 9C — Tree Indentation
- Spacer: depth x 28px left margin
- Vertical + branch connector lines (group color at 40% opacity)
- Group rows: 15% group color as background tint

### 9D — Drag-and-Drop Reorder
**Start**: Minimum drag distance threshold
**During**: Orange insertion line (#FF6600, 2px) with circle endpoints. Group ingest: green=allowed, red=denied (depth/lock guard)
**Drop**: Remove from old position, insert at new. Reparent: set/clear ParentGroupId, update ChildIds. Max depth 2 enforced. Contiguous flat list invariant maintained.
**Drag-to-delete**: Drag onto Delete button

### 9E — Footer Buttons (bg=toolbar-bg, padding=4)
| # | Element | Icon | Behavior |
|---|---------|------|----------|
| 1 | Export | text "Export" | bg=orange. Opens Export Image dialog |
| 2 | New Layer | Plus | Creates new empty image layer |
| 3 | New Group | FolderPlusOutline | Creates new group with next group color |
| 4 | Duplicate | ContentDuplicate | Clones selected layer +20,+20 |
| 5 | Bring Forward | ArrangeBringForward | Moves layer one position up |
| 6 | Send Backward | ArrangeSendBackward | Moves layer one position down |
| 7 | Group | Group | Groups 2+ selected layers |
| 8 | Ungroup | Ungroup | Dissolves selected group |
| 9 | Delete | TrashCanOutline | Red #E53935. Deletes selected. Drag-to-delete target |
| 10 | Text Link | LinkVariant | Opens TextLinkConfigWindow |
| 11 | Canvas BG | color swatch | Opens ColorPicker for canvas background |

## Acceptance Criteria
- [ ] All 7 columns render correctly per layer type
- [ ] Group expand/collapse hides/shows children in panel
- [ ] Double-click name enables inline rename
- [ ] Drag-drop reorders layers correctly
- [ ] Drag into group reparents (respecting max depth 2)
- [ ] Drag-to-delete button works
- [ ] Thumbnails render and update on content change (dirty flag)
- [ ] Tree connector lines render with correct group colors

---

# PHASE 10 — Properties Panel (Right Panel — Properties Tab)

## Goal
Build the properties tab with all controls for position, text, shape, and 21 effects.

## Dependencies: Phase 1, 4

## Deliverables

### 10A — Opacity + Blend Row
- Effect Presets toggle (TuneVariant 16x16): show/hide preset panel
- Blend Mode combo (80px, 17 modes): snapshot, RenderAllLayers(). Groups: propagate to descendants
- Opacity NUD (50px, 0-1, step 0.01) + Slider: update layer.Opacity, ApplyBlendComposite()

### 10B — Position Expander (collapsed default)
- X/Y NUDs (-5000 to 5000) — set layer position, grid snap if enabled
- Width/Height NUDs (1 to 10000) — set dimensions
- Rotation NUD (-360 to 360) — set angle
- Padding NUD (0-200) + Slider — expand bounds without scaling content

### 10C — Crop Expander (image layers, collapsed)
- Top/Bottom/Left/Right NUDs (0-5000, w=50) + Sliders (0-500) — visual crop, original preserved

### 10D — Text Expander (text layers, expanded)
- Text multiline box (min-h=60, max-h=150) — 150ms debounce, one snapshot per typing sequence
- Font family searchable combo — fuzzy filter, immediate re-render
- Font size NUD (8-200) + Slider
- Style toggles 30x30: Bold/Italic/Underline/Strikethrough/HasBackground
- Alignment 30x30: Left/Center/Right/Justify
- Color swatch 26x26: opens FillPickerWindow (live preview via callback)
- Stroke swatch + NUD (0-50, step 0.1) + Slider
- W/H Squeeze NUDs (-100 to 100, step 0.1) + Sliders

### 10E — Shape Expander (shape layers, expanded)
- Fill swatch 26x26: opens FillPickerWindow
- Border swatch + NUD (0-50, step 0.1) + Slider
- Corner Radius NUD (0-500) + Slider

### 10F — Effects Expander (expanded, 21 effects)
Each: CheckBox toggle + collapsible sub-panel. Sub-panel: Label(w=40, 9pt) + NUD(w=50) + Slider(orange, small-thumb, h=18). 100ms debounce for sliders. Snapshot before change.

1. Brightness (-100/100, 0)
2. Contrast (-100/100, 0)
3. Saturation (-100/100, 0)
4. Hue (-180/180, 0)
5. Grayscale (toggle only)
6. Sepia (toggle only)
7. Invert (toggle only)
8. Sharpen (Amount 0/1, 0.5)
9. Vignette (Radius 0/1 0.7, Amount 0/1 0.6)
10. Pixelate (Size 2/50, 8)
11. Color Tint (swatch + Amount 0/1, 0.3)
12. Noise (Amount 1/100, 20)
13. Posterize (Levels 2/16, 4)
14. Gaussian Blur (Radius 1/50, 5)
15. Drop Shadow (OffX -50/50 4, OffY -50/50 4, Blur 0/50 8, Color swatch)
16. Outer Glow (Radius 1/200 10, Opacity 0/100 100, Color)
17. Cut Stroke (Width 1/20 2, Color)
18. Rim Light (L/R Color, L/R Intensity 0/100 60, Glow 0/100 30, Softness 0/100 50)
19. Split Toning (Shadow/Highlight Color, Balance 0/100 50, Strength 0/100 30)
20. Smooth Stroke (Thickness 1/20 3, Smoothness 0/10 2, Color, Opacity 0/100 100)
21. Blend Overlay (Color, Mode combo 110px, Opacity 0/100 50)

### 10G — Bottom Sticky
- Layer name (orange, centered)
- Image dimensions text (secondary)
- Optimize Memory button (outlined, orange): rasterize to display size, bake effects, free source

## Acceptance Criteria
- [ ] All controls visible only for correct layer types
- [ ] Text content debounces at 150ms
- [ ] Color swatches open FillPicker with live preview
- [ ] All 21 effects toggle and render correctly
- [ ] Effect sliders debounce at 100ms
- [ ] Optimize Memory rasterizes and reduces memory

---

# PHASE 11 — Top Toolbar

## Goal
Build the complete top toolbar with all 28 buttons, combos, and controls.

## Dependencies: Phase 1, 3

## Deliverables

### 11A — Left Section (16 items)
1. New Project (Ctrl+N) `FileDocumentPlusOutline` — If dirty, confirm save. Open NewDocumentDialog for canvas size. Generate new ProjectId, clear layers, reset undo, render.
2. Open Project (Ctrl+O) `FolderOpenOutline` — If dirty, confirm. OpenFileDialog for .rbl. Load ZIP (data.json + images/). Restore layers, canvas, video paths. Init undo. Render.
3. Save Project (Ctrl+S) `ContentSaveOutline` — If no path, redirect to SaveAs. Serialize to JSON, pack images into ZIP, write .rbl. Set IsDirty=false.
4. Save as Template `BookmarkPlusOutline` — InputDialog for name. Save to Templates path. Refresh templates list.
5. Save Copy `ContentCopy` — SaveFileDialog. Save without updating CurrentProjectPath.
6. *separator*
7. Import Video `VideoOutline` — OpenFileDialog for video. Add to SourceVideoPaths. Extract frames via FFmpeg. Show progress.
8. Export Image (Ctrl+E) `Export` — SaveFileDialog (PNG/JPG/BMP). Render all layers at full resolution. Encode. Save.
9. Export List `FormatListBulleted` — Open ExportListWindow. DataGrid of past exports.
10. Batch Producer `ImageMultipleOutline` — Open BatchProducerWindow. Data-driven bulk export.
11. Image Gallery `ImageSearchOutline` — Open GalleryWindow. Browse/add images.
12. Video Browser toggle `FolderPlayOutline` — Show/hide left tab panel VIDEO BROWSER tab.
13. Image Gallery Panel toggle `ImageMultiple` — Show/hide left tab panel IMAGE GALLERY tab.
14. *separator*
15. Server Render `SendOutline` — Serialize project, send via SignalR.
16. Server Audio toggle `MusicBoxMultipleOutline` — Show/hide SERVER AUDIO tab.
17. *separator*
18. Undo (Ctrl+Z) `Undo` — canExecute: undoStack > 0. Pop undo, push redo, restore state, render.
19. Redo (Ctrl+Y) `Redo` — canExecute: redoStack > 0. Reverse of undo.

### 11B — Center
- "Thamnel by Kamrul Islam Rubel" (15pt bold, orange, clickable: Click=last template, Ctrl+Click=last project, Ctrl+Shift+Click=open app folder)

### 11C — Right Section (11 items)
1. Canvas Quality combo (80px) — 10-100% in 10% steps. Changes CanvasQuality setting. Re-renders.
2. Canvas Size Preset combo (120px) — Grouped (Social/Paper/Display). Sets CanvasWidth/Height. Snapshot. Render.
3. Layout Preset combo (120px) — Applies saved layer arrangement.
4. *separator*
5. Zoom In `MagnifyPlus` — +0.1, max 5.0
6. Zoom % text (40px) — Read-only display
7. Zoom Out `MagnifyMinus` — -0.1, min 0.1
8. Original Size `RelativeScale` — Set zoom to 1.0
9. Fit to Screen `FitToScreen` — Calculate optimal zoom, center
10. Grid toggle `Grid` (36x36) — Toggle ShowGrid
11. Settings `CogOutline` — Open SettingsWindow (5 tabs)
12. Debug `BugOutline` — Open DebugWindow

## Acceptance Criteria
- [ ] All 28 elements render at correct positions
- [ ] Button commands wire to correct operations
- [ ] Combos populate with correct data
- [ ] Undo/Redo enable/disable based on stack state

---

# PHASE 12 — Menu Bar

## Goal
Build all 8 menus with complete item lists, shortcuts, icons, and submenus.

## Dependencies: Phase 11

## Deliverables
- **File** (20+ items): New/Open/Save/SaveAs/SaveCopy/SaveTemplate, Import(Image/Video/SVG/Project), Export(Image/SVG/PSD/Layer/Batch), Recent Files(5 categories), Settings
- **Edit** (9 items): Undo/Redo, Cut(disabled)/Copy/Paste/Duplicate/Delete, SelectAll/Deselect
- **View** (10+ items): Zoom levels, Grid toggle, ShowOutside, ClearMarkers, CanvasSize submenu, LayoutPresets submenu
- **Layer** (20+ items): New Layer/Group/Text/Shape/DateStamp, Duplicate/Delete/MergeDown/Rasterize, Lock/Visibility, Arrange(4), Group/Ungroup/Release, Align(6)/Distribute(6)/Match(3)
- **Image** (9 items): FlipH/V, Rotate90, Fit Canvas/Width/Height, AI Enhance/RemoveBG
- **Tools** (5 items): Select/Eraser/BlurBrush, EraserSettings/BlurSettings
- **Window** (2 items): Gallery, Debug
- **Help** (1 item): About

## Acceptance Criteria
- [ ] All menus show correct items with icons + shortcut text
- [ ] Submenus (Import, Export, Recent, Arrange, Group, Align, Canvas Size, Layout) work
- [ ] Dynamic items (Recent Files) populate from data

---

# PHASE 13 — Left Toolbar

## Goal
Build the vertical tool bar with toggles, popups, and swatches.

## Dependencies: Phase 8

## Deliverables
- 14 tools (top to bottom): Select(V)/Text(T)/DateStamp/Shape(R)/ImportImage | ImageStudio/Eraser(B)/BlurBrush(J) | Align/Distribute | FlipH/FlipV/Rotate90 | Fill/Stroke swatches
- Tool toggle style: 38x38, borderless, cursor=hand, rounded-4. States: normal(transparent), hover(#25FFFFFF), active(#35FF6600+orange fg), disabled(opacity=0.3)
- Shape popup: 27 shape buttons (34x34), organized by category
- Align popup: 6 buttons (32x32)
- Distribute popup: 6 buttons (32x32)
- Fill/Stroke swatches: Photoshop-style overlapping, checkerboard bg, "X" cross, alpha text

## Acceptance Criteria
- [ ] Only one tool active at a time (radio behavior)
- [ ] Shape popup shows all 27 shapes
- [ ] Fill/Stroke swatches show current colors and open FillPicker on click

---

# PHASE 14 — Context Menus

## Goal
Build all 5 context menus with conditional items based on layer type and state.

## Dependencies: Phase 7, 9

## Deliverables

### 14A — Canvas Single-Layer Menu
Copy/Paste | Ungroup(group) | **Image Studio**(bold,image) | Logo Remover/Blur Faces(image) | Text Properties/Edit Date Stamp/Convert to Characters(text) | Mask with Image/Remove Fill/Transparency Mask(shape) | Fill Selected Object(text/shape) | Duplicate/Delete(red) | Transform submenu(AutoSize/Rotate/Position/Arrange) | Style Preset | Fill To submenu | Select Layer submenu | AI Upscale/FaceRestore(image)

### 14B — Canvas Multi-Selection Menu
Group(Ctrl+G) | AutoSize(Same W/H/Both) | Rotate | Position | Arrange | Delete Selected(red)

### 14C — Layer Panel Single-Layer Menu
Rename/Duplicate/MergeDown | AutoSize/Rotate/Position/Arrange | Quick Export PNG | Image Studio/Blur Faces(image) | Text Properties(text) | Style Presets | Release from Group(if in group) | Clear Blur Mask(if mask) | Delete(red) | Super Lock

### 14D — Layer Panel Group Menu
Rename/Duplicate Group | Expand/Collapse | New Sub-Group(depth<1) | Change Group Color(8 colors) | Ungroup | Delete Group(red) | Super Lock

### 14E — Super-Locked Menu
Only: "Off Super Lock" (Cyan icon)

## Acceptance Criteria
- [ ] Correct items shown based on layer type/state
- [ ] Conditional items hidden when not applicable
- [ ] Super-locked layers show ONLY "Off Super Lock"

---

# PHASE 15 — Keyboard Shortcuts

## Goal
Implement all 50+ keyboard shortcuts with correct behavior.

## Dependencies: Phase 7, 8

## Deliverables

### 15A — Global (always work)
Ctrl+N/O/S, Ctrl+Shift+S, Ctrl+E/Shift+E, Ctrl+I, Ctrl+Z/Y/Shift+Z, Ctrl+D, Del, Ctrl+C/V, Ctrl+A/Shift+A, Esc, Ctrl+G/Shift+G/Shift+R, Ctrl+[/]/Shift+[/], Ctrl+0..5, Ctrl+H/Shift+H, Ctrl+R, Ctrl+L/M/Shift+N, Ctrl+F/Shift+F/Alt+Shift+F, Ctrl+Alt+W/H/B, F2

### 15B — Single-Key (blocked when text editing)
Space(pan), T(text), R(shape), V(select), B(eraser), J(blur), G(gallery), F(grid), H(visibility), L(lock), [/](brush size +/-2), Arrows(nudge 1/5/10/50px with modifiers)

### 15C — Key Up Events
Alt release: refresh cursor | Space release: end pan | Arrow release: reset nudge snapshot flag

## Acceptance Criteria
- [ ] All shortcuts trigger correct operations
- [ ] Single-key blocked during text editing
- [ ] Nudge creates one snapshot per hold sequence
- [ ] Escape follows priority chain

---

# PHASE 16 — Left Tab Panel

## Goal
Build the 3-tab left panel: Video Browser, Image Gallery, Server Audio.

## Dependencies: Phase 1

## Deliverables

### 16A — Video Browser
Header "VIDEO BROWSER" (orange), 4 buttons (Add/Append Videos/Folders). DataGrid: SL(32px), Video File(fill, green/gray), Duration(60px). Double-click extracts frames. Progress bar.

### 16B — Image Gallery
Toolbar: Folders/Refresh/Collapse/QuickFolders/OpenExplorer/DownloadPack/ViewMode/Sort/Search/ThumbSize. 3-column: TreeView(160px) | splitter | thumbnails. PS Data panel. Thumbnail double-click adds layer.

### 16C — Server Audio
Header "SERVER AUDIO" (orange) + Refresh. ListBox: RadioButton + MusicNote + Name + Duration. Status text.

## Acceptance Criteria
- [ ] All 3 tabs switch correctly
- [ ] Video browser shows extracted status with color coding
- [ ] Image gallery shows folder tree and thumbnails
- [ ] Search filters thumbnails

---

# PHASE 17 — Frame Gallery

## Goal
Build the frame strip panel at bottom of canvas area.

## Dependencies: Phase 1

## Deliverables
- Container: bg=toolbar-bg, 130px height (resizable 60-400)
- Header: "VIDEO FRAMES" (orange, clickable context menu), video tabs (scrollable, active=#55FF6600), Add Video button, timestamp input, prev/play/next, paste clipboard
- Extraction progress bar (h=6, orange)
- Frame thumbnails: horizontal scroll, timestamp overlay, nav buttons on hover
- Frame click: apply to selected shape's image fill or create new layer

## Acceptance Criteria
- [ ] Video tabs show/switch correctly
- [ ] Frame thumbnails display with timestamps
- [ ] Click frame applies to layer/shape

---

# PHASE 18 — Status Bar

## Goal
Build the bottom status bar with all indicators.

## Dependencies: Phase 1

## Deliverables
Left-to-right: Status text(11pt) | Download progress(120x4, orange) | Canvas dims | Inference device(blue/green) | User name(orange, clickable) | Server status(dot red/green + text) | Render progress(80x6 bar + % + stage) | Render server(dot red/blue + text) | API Key icon

## Acceptance Criteria
- [ ] All elements display correct data
- [ ] Server dots show correct color by state

---

# PHASE 19 — Dialog Windows (Core)

## Goal
Build the essential dialog windows used by many features.

## Dependencies: Phase 10

## Deliverables

### 19A — ColorPickerWindow (620x480)
SV gradient square (min 256x256) + Hue bar (24px) + controls (190px). New/Current preview. Eyedropper. HSB + RGB + Hex (#AARRGGBB) + Alpha.

### 19B — FillPickerWindow (580x700)
3 tabs: Solid Color | Gradient (Linear/Radial/Sweep + stop bar + params) | Image Fill (browse/paste + stretch + offset + scale + opacity). Ctrl+Click adds stop, right-click deletes.

### 19C — ShapeCreatorWindow (420x530)
6 shape radios (52x52), W/H NUDs, fill/border swatches, border width, corner radius. Saves per-type defaults.

### 19D — SettingsWindow (750x820)
5 tabs: General(paths, auto-save, undo) | Canvas(grid, nudge, selection colors, handles) | Export(JPG quality, silent) | AI(models, GPU) | Network(servers). Footer: Reset All(red)/Cancel/Save(orange).

### 19E — Other Core Dialogs
NewDocumentDialog(460x620), CanvasSizeWindow(300xauto), InputDialog(320x160), ProgressWindow(480xauto, borderless), ModernNotificationDialog(420xauto), EraserSettingsWindow(380xauto), BlurBrushSettings(380xauto)

## Acceptance Criteria
- [ ] Color picker produces correct HSB/RGB/Hex values
- [ ] Fill picker supports solid/gradient/image fills
- [ ] Settings persist to JSON on save
- [ ] All dialogs open/close as modal

---

# PHASE 20 — Dialog Windows (Advanced)

## Goal
Build the complex dialogs: Image Studio, text editors, batch producer, gallery, etc.

## Dependencies: Phase 4, 19

## Deliverables

### 20A — Image Studio (1200x800, starts maximized)
**Pre-sep**: 7 AI ops (Scratch Remover, Face Restore, Denoise, Inpaint/Outpaint, Colorize, Cartoonize, BG Separation) + Pixel Effects + Image Blend. Mutually exclusive expanders.
**Post-sep**: Presets(Clear All/YouTube/Cinema/Neon/Warm/Cool) + FG section(Cinematic/Effects/Color/Stroke/Blend, orange accent) + BG section(Fill/Tint/Blend/Effects/Color, #4FC3F7 accent)
**Brush tools**: Pan(V)/Eraser(B)/Creator/BoxDelete(X)/BoxRestore(Y)/ResetFG/ResetBG/ReformBG(R)
**Actions**: Apply Combined(orange)/Place All(#4FC3F7)/Apply FG/Apply BG/Cancel. Keep Original checkbox.
**Debounce**: Render 300ms, Settings 500ms, Pre-effect 300ms
**Shortcuts**: V/B/X/Y/R tools, [/] brush, 1-4 quality, zoom, Ctrl+S/F/B/A apply, Ctrl+Z/Y undo

### 20B — TextPropertiesWindow (520x750)
3 tabs (NavigationRail): Basic(text, font search, size, style toggles, fill/stroke, alignment, spacing, transform, opacity, squeeze) | Background(enable, mode, color, corner radius 4 corners, padding 4 sides, height, offset, cutout) | Image Fill(enable, browse, stretch, opacity, image position). Live preview 150ms. Cancel restores.

### 20C — InstantTextEditorWindow (450x350)
Header(toggle sliders, font name, editor size NUD), lock status bar, slider panel, white TextBox, footer(chars/words, Cancel/Accept). Ctrl+Enter=accept, Escape=cancel. 150ms preview. Saves position.

### 20D — GalleryWindow (900x600)
Toolbar + 3-column(TreeView 220px | splitter | thumbnails). PS Data NUDs. Context menu(Set BG, Add, PS data, Rename, Delete, Add to frame, Open location).

### 20E — BatchProducerWindow (1350x600)
Toolbar(Auto Link, Add/Delete Row/Column, Check Error, Load Image Folder, Save/Load CSV, Export All orange). DataGrid(orange headers, alternating rows). Export progress + Cancel.

### 20F — Remaining Dialogs
DateStampWindow(480xauto), LinkedTextEditorWindow(550x450), TransparencyManagerWindow(380xauto), LogoRemovalWindow(900x700), SplashWindow(520x300), AboutWindow(520x620), FramePreviewWindow(fullscreen), ImageGalleryDialog(800x600), BgFillFramePickerWindow(720x460), TextLinkConfigWindow(680x520), DebugWindow(720x480), ExportListWindow(maximized), ProjectImportWindow(420x520), FaceBlurWindow(580x560), EnhanceSettingsDialog(380x200)

## Acceptance Criteria
- [ ] Image Studio full pipeline works (pre-sep > separate > post-sep > apply)
- [ ] Brush tools paint/erase foreground correctly
- [ ] All presets save/load/apply
- [ ] Text properties live preview updates canvas
- [ ] Batch producer generates correct output per row

---

# DEPENDENCY GRAPH

```
Phase 1 (Data Models)
|-- Phase 2 (Layout Shell)
|   +-- Phase 5 (Canvas Viewport) <-- Phase 4
|       +-- Phase 6 (Selection)
|           +-- Phase 7 (Mouse Interactions)
|               |-- Phase 8 (Canvas Tools)
|               |   +-- Phase 13 (Left Toolbar)
|               |   +-- Phase 15 (Keyboard Shortcuts)
|               +-- Phase 14 (Context Menus) <-- Phase 9
|-- Phase 3 (Undo/Redo & Clipboard)
|   |-- Phase 9 (Layer Panel)
|   +-- Phase 11 (Top Toolbar)
|       +-- Phase 12 (Menu Bar)
|-- Phase 4 (Rendering Engine)
|   |-- Phase 10 (Properties Panel)
|   |   +-- Phase 19 (Core Dialogs)
|   |       +-- Phase 20 (Advanced Dialogs)
|   +-- Phase 5 (see above)
|-- Phase 16 (Left Tab Panel)
|-- Phase 17 (Frame Gallery)
+-- Phase 18 (Status Bar)
```

**Parallel tracks** (can be worked on simultaneously):
- **Track A**: Phase 1 > 2 > 5 > 6 > 7 > 8 > 13 > 15
- **Track B**: Phase 1 > 3 > 9 > 14
- **Track C**: Phase 1 > 4 > 10 > 19 > 20
- **Track D**: Phase 1 > 11 > 12
- **Track E**: Phase 1 > 16, 17, 18 (independent)

---

*Restructured into 20 sequential phases with clear dependencies, deliverables, and acceptance criteria. Each phase is self-contained for a Claude agent to implement independently.*
