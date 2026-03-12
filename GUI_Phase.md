# Thamnel GUI Implementation Phases
## 23-Phase Development Plan (React + Tailwind + Radix UI)

---

## Phase Overview

| Phase | Name | Reference | Status |
|-------|------|-----------|--------|
| 1 | Global Theme & Design Tokens | Section 1 | [ ] |
| 2 | MainWindow Layout Shell | Section 2 | [ ] |
| 3 | MainWindow Menu Bar | Section 3 | [ ] |
| 4 | Top Toolbar | Section 4 | [ ] |
| 5 | Left Toolbar | Section 5 | [ ] |
| 6 | Left Tab Panel (Video/Gallery/Audio) | Section 6 | [ ] |
| 7 | Central Canvas & Viewport | Section 7 | [ ] |
| 8 | Frame Gallery | Section 8 | [ ] |
| 9 | Right Panel - Properties Tab | Section 9 | [ ] |
| 10 | Right Panel - Layers Tab | Section 10 | [ ] |
| 11 | Right Panel - Templates Tab | Section 11 | [ ] |
| 12 | Status Bar | Section 12 | [ ] |
| 13 | Canvas Behaviors & Interactions | Section 13 | [ ] |
| 14 | Keyboard Shortcuts System | Section 14 | [ ] |
| 15 | Context Menus | Section 15 | [ ] |
| 16 | Image Studio Window | Section 16 | [ ] |
| 17 | Dialog Windows | Section 17 | [ ] |
| 18 | Data Models & State Management | Section 18 | [ ] |
| 19 | Enums & Type Definitions | Section 19 | [ ] |
| 20 | Canvas Presets Data | Section 20 | [ ] |
| 21 | Value Converters & Utilities | Section 21 | [ ] |
| 22 | ViewModel Commands & Actions | Section 22 | [ ] |
| 23 | AppSettings & Persistence | Section 23 | [ ] |

---

## Phase 1: Global Theme & Design Tokens
**Reference**: GC_GUI_Plan.md - Section 1

### Objective
Set up the foundational design system: CSS variables, color palette, typography, and icon integration.

### Tasks
- [ ] Define CSS custom properties for all 10 theme tokens (--accent-orange, --dark-bg, --panel-bg, etc.)
- [ ] Define inline color constants (ruler bg, delete/close reds, status colors, etc.)
- [ ] Configure Roboto as primary font (13px default, 400 weight)
- [ ] Configure Consolas as monospace/debug font
- [ ] Integrate MaterialDesignIcons (MDI) icon pack with standard sizes (14/16/18/20/24px)
- [ ] Create reusable Tailwind theme extension with all custom colors
- [ ] Build base component styles (hover, selected, disabled states)

### Deliverables
- `tailwind.config.ts` with custom theme
- `globals.css` with CSS variables
- Icon utility component for MDI icons

---

## Phase 2: MainWindow Layout Shell
**Reference**: GC_GUI_Plan.md - Section 2

### Objective
Build the root application layout grid with all panels, splitters, and resizable regions.

### Tasks
- [ ] Create root 4-row grid (Menu Bar, Top Toolbar, Main Content, Status Bar)
- [ ] Build Main Content area with 4-column layout (Left side, Effect bar, Splitter, Right panel 310px)
- [ ] Build Left Side with 3-row layout (Main area, Splitter, Frame Gallery 130px)
- [ ] Build Main Area with 4-column layout (Left toolbar 48px, Left tab panel, Splitter, Central canvas)
- [ ] Implement resizable splitters (right panel 4px, frame gallery 4px, left tab panel)
- [ ] Set window constraints (min 1000x600, default 1400x850)
- [ ] Implement panel collapse/expand logic for left tab panel and effect bar
- [ ] Enable AllowDrop on the root container

### Deliverables
- `MainLayout.tsx` - root layout component
- `ResizableSplitter.tsx` - reusable splitter component
- All panel container components (empty shells)

---

## Phase 3: MainWindow Menu Bar
**Reference**: GC_GUI_Plan.md - Section 3

### Objective
Build the full menu bar with all 7 menus, submenus, shortcuts, icons, and command bindings.

### Tasks
- [ ] Build menu bar container (bg=panel-bg, bottom border, font-size=13)
- [ ] Implement File menu (17 items: New, Open, Save, Save As, Save Copy, Save as Template, Import submenu, Export submenu, Recent Files submenu, Settings)
- [ ] Implement Edit menu (9 items: Undo, Redo, Cut, Copy, Paste, Duplicate, Delete, Select All, Deselect)
- [ ] Implement View menu (Zoom levels, Show Grid, Show Items Outside Canvas, Canvas Size, Layout Presets)
- [ ] Implement Layer menu (New Layer, New Group, Add Text/Shape/Date Stamp, Duplicate, Delete, Merge Down, Rasterize, Lock, Visibility, Arrange submenu, Group submenu, Align submenu)
- [ ] Implement Image menu (Flip H/V, Rotate 90, Fit to Canvas/Width/Height, AI Enhance, AI Remove BG)
- [ ] Implement Tools menu (Select/Eraser/Blur Brush tools + settings)
- [ ] Implement Window menu (Image Gallery, Debug Log)
- [ ] Implement Help menu (About Thamnel)
- [ ] Wire all keyboard shortcuts to menu items
- [ ] Add MDI icons (16x16) to all applicable menu items
- [ ] Build dynamic Recent Files submenu system (5 categories)

### Deliverables
- `MenuBar.tsx` with Radix UI DropdownMenu/MenuBar
- Menu item components with icon, shortcut label, and command binding

---

## Phase 4: Top Toolbar
**Reference**: GC_GUI_Plan.md - Section 4

### Objective
Build the horizontal top toolbar with action buttons, branding, combos, and zoom controls.

### Tasks
- [ ] Build toolbar container (bg=toolbar-bg, bottom border, padding 4px 2px)
- [ ] Build left section: 16 action buttons (New, Open, Save, Template, Copy, Video, Export, Export List, Batch, Gallery, Video Browser toggle, Image Gallery toggle, Send to Server, Audio toggle, Undo, Redo) with separators
- [ ] Build center branding text ("Thamnel by Kamrul Islam Rubel", 15pt bold, orange, clickable with 3 click modes)
- [ ] Build right section: Canvas Quality combo (80px, 10-100%), Canvas Size Preset combo (120px, grouped), Layout Preset combo (120px)
- [ ] Build zoom controls: Zoom In, Zoom %, Zoom Out, Original Size, Fit to Screen buttons (18x18 icons)
- [ ] Build Grid toggle (36x36), Settings button, Debug button
- [ ] Style combo boxes (h=22, bg=#2A2A2A)
- [ ] Wire toggle buttons (Video Browser, Image Gallery, Server Audio) to panel visibility

### Deliverables
- `TopToolbar.tsx`
- `ToolbarButton.tsx` - reusable toolbar button component
- `ToolbarComboBox.tsx` - styled combo component

---

## Phase 5: Left Toolbar
**Reference**: GC_GUI_Plan.md - Section 5

### Objective
Build the vertical left toolbar with tool toggles, shape picker, align/distribute popups, and fill/stroke swatches.

### Tasks
- [ ] Build toolbar container (48px wide, bg=toolbar-bg, right border)
- [ ] Build 14 tool buttons (38x38, borderless, cursor=hand, rounded-4) with proper states (normal, hover, active, disabled)
- [ ] Implement toggle behavior for tool selection (Select, Text, Shape, Eraser, Blur Brush, Align, Distribute)
- [ ] Build Shape sub-popup (140px wide, max-h=460, 27 shapes: Lines, Rectangles, Basic Shapes, Block Arrows)
- [ ] Build Align sub-popup (6 buttons, 32x32: Left, Center, Right, Top, Middle, Bottom)
- [ ] Build Distribute sub-popup (6 buttons, 32x32 with custom SVG icons)
- [ ] Build Fill/Stroke swatches (Photoshop-style overlapping: fill 24x24 back, stroke 18x18 front)
- [ ] Implement right-click settings for Eraser and Blur Brush
- [ ] Implement Ctrl+Click on Shape to open ShapeDrawingWindow (full illustrator-like vector drawing window)
- [ ] Wire tool buttons to active tool state

### Deliverables
- `LeftToolbar.tsx`
- `ToolToggleButton.tsx`
- `ShapePickerPopup.tsx` (quick shapes; Ctrl+Click opens full ShapeDrawingWindow)
- `AlignPopup.tsx` / `DistributePopup.tsx`
- `FillStrokeSwatches.tsx`

---

## Phase 6: Left Tab Panel (Video Browser / Image Gallery / Server Audio)
**Reference**: GC_GUI_Plan.md - Section 6

### Objective
Build the collapsible left tab panel with 3 tabs for video browsing, image gallery, and server audio.

### Tasks
- [ ] Build tab panel container (bg=panel-bg, right border, initially collapsed)
- [ ] Build TabControl with 3 tabs (tab height=28, font-size=11)
- [ ] **Video Browser tab**: header (orange, semibold, 11pt) + 4 action buttons (26x26), DataGrid (SL/Video File/Duration columns, row-height=24), duration progress bar (h=2)
- [ ] **Image Gallery tab**: toolbar (Folders, Refresh, Collapse, Quick Folders, Explorer, Download, View Mode, Sort, Search 120px, Thumb Size slider 60-200), 3-column layout (TreeView 160px, splitter, thumbnail WrapPanel), PS Data panel, Info bar
- [ ] **Server Audio tab**: header (orange) + Refresh, ListBox with RadioButton + icon + Name + Duration, status text
- [ ] Implement Quick Folder strip (collapsed by default)
- [ ] Implement dynamic thumbnail sizing
- [ ] Wire toggle visibility to top toolbar buttons

### Deliverables
- `LeftTabPanel.tsx`
- `VideoBrowserTab.tsx`
- `ImageGalleryTab.tsx`
- `ServerAudioTab.tsx`

---

## Phase 7: Central Canvas & Viewport
**Reference**: GC_GUI_Plan.md - Section 7

### Objective
Build the central canvas area with rulers, viewport, zoom, grid overlay, and layer rendering.

### Tasks
- [ ] Build ruler system: top ruler (20px height), left ruler (20px width), corner piece (20x20), all bg=#1E1E1E
- [ ] Implement ruler tick marks (minor=#646464, labels=#A0A0A0, canvas edges=#FF6600)
- [ ] Implement zoom-adaptive ruler intervals (50/100/200/500px)
- [ ] Build canvas viewport with ScrollViewer and auto scrollbars
- [ ] Implement zoom via ScaleTransform (bound to Zoom property)
- [ ] Build canvas shadow (DropShadow blur=20, opacity=0.5, depth=5)
- [ ] Build canvas layers stack (bottom to top): DesignCanvas (white bg), GridOverlay, DimOverlay (#80000000), PaddingOverlay, MarkerGuideOverlay (cyan, dash), MarqueeOverlay, HandleOverlay
- [ ] Implement ruler drag to create marker guides
- [ ] Build active tool indicator (bottom-left, font-size=11, opacity=0.6)
- [ ] Center canvas with margin=40

### Deliverables
- `CanvasViewport.tsx`
- `Ruler.tsx` (horizontal/vertical)
- `GridOverlay.tsx`
- `MarkerGuideOverlay.tsx`
- `MarqueeOverlay.tsx`
- `HandleOverlay.tsx`

---

## Phase 8: Frame Gallery
**Reference**: GC_GUI_Plan.md - Section 8

### Objective
Build the frame gallery panel for video frame browsing and extraction.

### Tasks
- [ ] Build container (bg=toolbar-bg, top border, height=130px, resizable 60-400)
- [ ] Build header row: "VIDEO FRAMES" text (bold, 11pt, orange, clickable for context menu)
- [ ] Build video tab strip (scrollable horizontal, active tab: bg=#55FF6600 + orange border)
- [ ] Build tab items (name 9pt max-w=100 + close button red #FF5252)
- [ ] Build Add Video button (28x28, orange, VideoPlus icon)
- [ ] Build timestamp input (80px, hint="mm:ss")
- [ ] Build Previous/Play/Next buttons (20x20)
- [ ] Build Paste from clipboard button (28x28)
- [ ] Build extraction progress bar (h=6, orange, visible during extraction)
- [ ] Build horizontal scrolling frame thumbnails (margin=4px, border-gray, rounded-4, bg=black)
- [ ] Add timestamp overlay per frame (bottom-right, 10pt white on #80000000)
- [ ] Build left/right nav buttons (32px wide, bg=#40000000, appear on hover)
- [ ] Build context menu (Add Video, Add Image Folder, Add Image, Add From Gallery)

### Deliverables
- `FrameGallery.tsx`
- `FrameThumbnail.tsx`
- `VideoTabStrip.tsx`

---

## Phase 9: Right Panel - Properties Tab
**Reference**: GC_GUI_Plan.md - Section 9

### Objective
Build the Properties tab with all property editors for opacity, blend, position, crop, text, shape, and 21 effects.

### Tasks
- [ ] Build tab header (Cog icon 14x14 + "Properties"), visible when HasSelectedLayer=true
- [ ] Build Opacity + Blend row: Effect Presets toggle, Blend Mode combo (80px, 17 modes), Opacity NUD (50px, 0-1), Opacity Slider
- [ ] Build Preset panel (collapsed): combo 140px + Delete + Save buttons
- [ ] Build POSITION expander: X/Y NUDs (-5000 to 5000), Width/Height (1-10000), Rotation (-360 to 360), Padding (0-200) + Slider
- [ ] Build CROP expander (image layers only): Top/Bottom/Left/Right NUDs (0-5000) + Sliders (0-500)
- [ ] Build TEXT expander: Text content (multiline, min-h=60), Font family (searchable), Font size NUD (8-200) + Slider, Style toggles (Bold/Italic/Underline/Strikethrough/HasBackground 30x30), Alignment (4 buttons 30x30), Color swatch, Stroke (swatch + NUD + Slider), W/H Squeeze
- [ ] Build SHAPE expander: Fill color swatch, Border (swatch + NUD + Slider), Corner Radius (0-500) + Slider
- [ ] Build EFFECTS expander with all 21 effects: Brightness, Contrast, Saturation, Hue, Grayscale, Sepia, Invert, Sharpen, Vignette, Pixelate, Color Tint, Noise, Posterize, Gaussian Blur, Drop Shadow, Outer Glow, Cut Stroke, Rim Light, Split Toning, Smooth Stroke, Blend Overlay
- [ ] Build bottom sticky section: layer name (orange), image dimensions (text-secondary), Optimize Memory button
- [ ] Build reusable NUD (NumericUpDown) component with slider pairing

### Deliverables
- `PropertiesTab.tsx`
- `PositionExpander.tsx`
- `CropExpander.tsx`
- `TextExpander.tsx`
- `ShapeExpander.tsx`
- `EffectsExpander.tsx`
- `NumericUpDown.tsx` - reusable component
- `ColorSwatch.tsx` - reusable component

---

## Phase 10: Right Panel - Layers Tab
**Reference**: GC_GUI_Plan.md - Section 10

### Objective
Build the Layers tab with the layer list, drag-and-drop reordering, tree structure, and footer actions.

### Tasks
- [ ] Build tab header (LayersOutline icon 14x14 + "Layers", default selected tab)
- [ ] Build scrollable layer list (selected: bg=#33FF6600)
- [ ] Build layer item template (7 columns): Expand/Collapse, Visibility toggle, Type icon, Layer name (12pt, ellipsis, double-click rename), Super lock icon, Thumbnail (22x22, orange border if frame-receiver), Lock toggle
- [ ] Implement tree indentation (depth * 28px per level)
- [ ] Build tree connector lines (vertical + branch, group color at 40% opacity)
- [ ] Implement group row tinting (15% opacity of group color)
- [ ] Implement drag-and-drop reordering with insertion adorner (orange #FF6600, 2px)
- [ ] Implement group ingest (green=allowed, red=depth/lock guard, max depth=2)
- [ ] Build footer buttons (11 items): Export (orange bg), New Layer, New Group, Duplicate, Bring Forward, Send Backward, Group, Ungroup, Delete (red), Text Link Config, Canvas BG Color swatch
- [ ] Implement inline layer rename on double-click
- [ ] Implement drag-to-delete on trash button

### Deliverables
- `LayersTab.tsx`
- `LayerItem.tsx`
- `LayerTreeConnector.tsx`
- `LayerFooterBar.tsx`

---

## Phase 11: Right Panel - Templates Tab
**Reference**: GC_GUI_Plan.md - Section 11

### Objective
Build the Templates tab with template list, double-click loading, and management context menu.

### Tasks
- [ ] Build tab header (BookmarkMultipleOutline 14x14 + "Templates" + count badge "(0)")
- [ ] Build ListBox of templates (BookmarkOutline icon orange + Name 13pt)
- [ ] Implement double-click to load template
- [ ] Build context menu: "Update with Current Project", "Delete Template" (red)
- [ ] Wire template count to badge

### Deliverables
- `TemplatesTab.tsx`
- `TemplateItem.tsx`

---

## Phase 12: Status Bar
**Reference**: GC_GUI_Plan.md - Section 12

### Objective
Build the status bar with all status indicators, progress bars, and server connection displays.

### Tasks
- [ ] Build container (bg=toolbar-bg, padding 8px 3px, top border)
- [ ] Build status text (11pt, text-secondary)
- [ ] Build download progress bar (120x4, orange, visible when downloading)
- [ ] Build canvas dimensions display (CanvasWidth x CanvasHeight)
- [ ] Build inference device indicator (CPU=#8AB4F8 blue, GPU=#81C784 green)
- [ ] Build user name display (orange, clickable)
- [ ] Build server status (text + dot: red #EF5350 / green #81C784, clickable)
- [ ] Build render progress (80x6 bar + % text + stage text, orange)
- [ ] Build render server status (text + dot: red / blue #42A5F5, clickable)
- [ ] Build API key icon (Key 14x14, text-secondary, margin=50px)
- [ ] Add separators between sections

### Deliverables
- `StatusBar.tsx`
- `StatusDot.tsx` - reusable status indicator
- `ProgressIndicator.tsx`

---

## Phase 13: Canvas Behaviors & Interactions
**Reference**: GC_GUI_Plan.md - Section 13

### Objective
Implement all canvas interaction behaviors: selection, resize, rotation, smart guides, tools, and clipboard.

### Tasks
- [ ] Implement selection handles (zoom-compensated, handleSize = 8 * (1/zoom)): 8 resize handles + rotation handle (35px above) + anchor crosshair
- [ ] Implement multi-selection: dashed bounding box (dash {6,3}), configurable colors (single=#FF6600, first-multi=#00FF00, group=#00BCD4)
- [ ] Implement locked layer display (dashed border only, no handles)
- [ ] Build mouse interaction priority chain (13 levels from shape fill edit to marquee selection)
- [ ] Implement modifier keys during drag: Shift (constrain axis/aspect/15deg), Ctrl (duplicate/symmetric), Alt (crop mode)
- [ ] Implement smart guides: snap to canvas edges/center, layer edges/centers, marker guides (threshold 5px, magenta lines)
- [ ] Implement Eraser tool: Soft/Hard modes, Anti-erase (right-click/Ctrl), brush size 1-500, [ ] keys adjust
- [ ] Implement Blur Brush tool: alpha mask painting, anti-blur, 30fps throttle
- [ ] Implement Shape drawing: orange dashed preview, Shift=constrain, min 5px drag, auto-switch to Select, double-click shape layer opens ShapeDrawingWindow for re-editing (Premiere Pro-like nesting)
- [ ] Implement Text inline editing: double-click/F2 activate, StyledRun formatting, orange border, rotation-aware, Ctrl+Enter=commit
- [ ] Implement layer panel drag-drop: InsertionAdorner (orange 2px), group ingest, max depth 2
- [ ] Implement clipboard: "ThamneLayer" format, >5MB offload to temp, paste remaps IDs + offset (20,20), fallback system clipboard

### Deliverables
- `SelectionManager.ts`
- `HandleRenderer.tsx`
- `SmartGuides.ts`
- `EraserTool.ts`
- `BlurBrushTool.ts`
- `ShapeDrawTool.ts`
- `InlineTextEditor.tsx`
- `ClipboardManager.ts`

---

## Phase 14: Keyboard Shortcuts System
**Reference**: GC_GUI_Plan.md - Section 14

### Objective
Implement the complete keyboard shortcut system with global and single-key bindings.

### Tasks
- [ ] Build keyboard shortcut manager/hook
- [ ] Implement all global shortcuts with modifiers (Ctrl+N/O/S, Ctrl+Shift+S, Ctrl+E, Ctrl+Z/Y, Ctrl+D, Delete, Ctrl+C/V/A, Ctrl+G, Ctrl+Shift+G, etc.)
- [ ] Implement all single-key shortcuts (blocked when editing text): Space=pan, T=text, R=shape, V=select, B=eraser, J=blur, G=gallery, F=grid, H=visibility, L=lock
- [ ] Implement brush size shortcuts ([ / ] keys, step 5)
- [ ] Implement arrow key nudging (1px default, Shift+5px, Ctrl+Shift+10px, Ctrl+Shift+Alt+50px)
- [ ] Implement zoom shortcuts (Ctrl+0 through Ctrl+5)
- [ ] Add text editing mode guard (block single-key shortcuts during text input)
- [ ] Wire all shortcuts to corresponding commands

### Deliverables
- `useKeyboardShortcuts.ts` - custom hook
- `ShortcutManager.ts` - centralized shortcut registry

---

## Phase 15: Context Menus
**Reference**: GC_GUI_Plan.md - Section 15

### Objective
Build all context menus for canvas and layer panel interactions.

### Tasks
- [ ] Build canvas right-click menu (single layer): Copy, Paste, Ungroup, Image Studio, Logo Remover, Blur Faces, Text Properties, Edit Date Stamp, Convert to Characters, Mask with Image, Fill Selected, Duplicate, Delete (red), Transform submenu, Style Preset, Select Layer submenu
- [ ] Build canvas right-click menu (multi-selection): Group, Autosize submenu, Delete Selected (red)
- [ ] Build layer panel right-click menu (single layer): Rename, Duplicate, Merge Down, Auto Size, Rotate, Position, Arrange submenus, Quick Export PNG, Blur Faces, Get Video Name, Style Presets, Release from Group, Clear Blur Mask, Delete (red), Super Lock
- [ ] Build layer panel right-click menu (group): Rename, Duplicate Group, New Sub-Group, Change Group Color (8 colors), Ungroup, Delete Group (red), Super Lock
- [ ] Build super-locked layer menu (only "Off Super Lock")
- [ ] Implement conditional item visibility based on layer type and selection state

### Deliverables
- `CanvasContextMenu.tsx`
- `LayerContextMenu.tsx`
- `GroupContextMenu.tsx`

---

## Phase 16: Image Studio Window
**Reference**: GC_GUI_Plan.md - Section 16

### Objective
Build the full Image Studio modal window with AI operations, pixel effects, background separation, and brush tools.

### Tasks
- [ ] Build window (1200x800, starts maximized, min 800x600, modal)
- [ ] Build header bar: Save to Gallery, title (orange), View Mode radios (Combined/Foreground/Background), status text
- [ ] Build preview area: ScrollViewer with zoom, checkerboard bg, preview image, mask overlay, brush cursor canvas
- [ ] Build brush toolbar (collapsed until separation): Pan, Eraser, Creator, Box Delete, Box Restore, Reset FG/BG, Reform BG, Preview slider (25-100), Shortcut Help, Save Gallery
- [ ] Build processing overlay (indeterminate progress + status)
- [ ] **Pre-separation right panel**: AI Operations (7 sub-sections: Scratch Remover, Face Restoration, Denoise, Inpaint/Outpaint, Colorize, Cartoonize, Background Separation), Pixel Effects (Color Adjustments + Image Effects), Image Blend
- [ ] **Post-separation right panel**: Presets bar, FOREGROUND section (Cinematic, Pixel Effects, Color Adjustments, Stroke, Blending), BACKGROUND section (Fill modes, Color Tint, Blending, Pixel Effects, Color Adjustments)
- [ ] Build action buttons: Keep Original checkbox, Apply Combined (orange), Place All Layers (#4FC3F7), Apply FG Only, Apply BG Only, Cancel
- [ ] Implement accordion behavior (mutually exclusive expanders)
- [ ] Implement Image Studio keyboard shortcuts (V, B, X, Y, R, [, ], Space, 1-4, Ctrl+S/F/B/A, etc.)
- [ ] Implement debounce timers (Render 300ms, Settings save 500ms, Pre-effect 300ms)

### Deliverables
- `ImageStudioWindow.tsx`
- `ImageStudioPreview.tsx`
- `AIOperationsPanel.tsx`
- `PixelEffectsPanel.tsx`
- `ImageBlendPanel.tsx`
- `ForegroundPanel.tsx`
- `BackgroundPanel.tsx`

---

## Phase 17: Dialog Windows
**Reference**: GC_GUI_Plan.md - Section 17

### Objective
Build all dialog/modal windows used throughout the application.

### Tasks
- [ ] **TextPropertiesWindow** (520x750): 3 tabs (Basic, Background, Image Fill), live preview 150ms, cancel restores
- [ ] **InstantTextEditorWindow** (450x350): toggle sliders, font controls, white TextBox, chars/words status, Ctrl+Enter=Accept
- [ ] **ShapeDrawingWindow** (1000x700, starts maximized, min 800x600): Full illustrator-like vector drawing window. Left toolbar (Select, Pen tool, Freehand draw, Predefined shapes dropdown, Path operations — union/subtract/intersect, Eraser, Zoom/Pan). Central canvas with rulers/grid. Right panel (280px): shape properties (fill/gradient/stroke/opacity), predefined shapes palette (27 shapes), corner radius, path point editor (anchor type smooth/corner, handle controls). Bottom panel: grouping layers list (organizational only — visibility + name + ordering, no blend modes/effects). Supports image reference/trace layers. "Send to Canvas" creates one nested shape layer. Double-click shape on main canvas re-opens window with all internal layers preserved (Premiere Pro-like nesting). Bottom action bar: Send to Canvas (orange), Cancel, Reset.
- [ ] **ColorPickerWindow** (620x480): SV gradient square, Hue bar, Eyedropper, HSB/RGB/Hex/Alpha inputs
- [ ] **FillPickerWindow** (580x700): 3 tabs (Solid, Gradient, Image Fill), gradient stop editor, Ctrl+Click add stop
- [ ] **GalleryWindow** (900x600): TreeView + WrapPanel thumbnails, PS Data, context menu
- [ ] **BatchProducerWindow** (1350x600): DataGrid with auto-link, CSV import/export, Export All progress
- [ ] **SettingsWindow** (750x820): 5 tabs (General, Canvas, Export, AI, Network), Reset All, Save
- [ ] **LogoRemovalWindow** (900x700): Brush tools, mask overlay, zoom/pan
- [ ] **DateStampWindow** (480xAuto): Presets, Language/Calendar selection, date parts, preview
- [ ] **LinkedTextEditorWindow** (550x450): per-line toggles, RichTextBox, session lock
- [ ] **TransparencyManagerWindow** (380xAuto): Mask profiles, Linear/Radial modes, gradient stop bars
- [ ] **Other windows**: SplashWindow, AboutWindow, ProgressWindow, NewDocumentDialog, CanvasSizeWindow, InputDialog, EnhanceSettingsDialog, EraserSettingsWindow, BgStudioBrushSettings, BlurBrushSettings, FramePreviewWindow, ImageGalleryDialog, BgFillFramePickerWindow, ModernNotificationDialog, TextLinkConfigWindow, DebugWindow, ExportListWindow, ProjectImportWindow, FaceBlurWindow

### Deliverables
- One component file per dialog window
- `DialogBase.tsx` - shared modal wrapper with common styling

---

## Phase 18: Data Models & State Management
**Reference**: GC_GUI_Plan.md - Section 18

### Objective
Define all TypeScript data models and set up the application state management layer.

### Tasks
- [ ] Define `LayerModel` interface (30+ properties: Id, Name, Type, X/Y, Width/Height, Rotation, Opacity, visibility, lock, blend, flip, padding, image data, text/shape props, effects, color adjustments, crop, group hierarchy, blur mask, anchor, etc.)
- [ ] Define `TextProperties` interface (25+ properties: text, font, size, styles, fill/stroke, spacing, alignment, transform, background, squeeze, runs)
- [ ] Define `ShapeProperties` interface (15+ properties: type, fill, border, corner radius, image fill, mask)
- [ ] Define `LayerEffect` interface (21 effect toggles + parameters)
- [ ] Define `FillDefinition` interface (type, solid color, gradient stops/angle/center/radius, image fill settings, global alpha)
- [ ] Define `ProjectModel` interface (ProjectId, Version, canvas dimensions, background, layers, video paths, timestamps)
- [ ] Set up state management (Zustand/Redux) for project state, UI state, tool state
- [ ] Implement undo/redo state management

### Deliverables
- `types/LayerModel.ts`
- `types/TextProperties.ts`
- `types/ShapeProperties.ts`
- `types/LayerEffect.ts`
- `types/FillDefinition.ts`
- `types/ProjectModel.ts`
- `store/` - state management setup

---

## Phase 19: Enums & Type Definitions
**Reference**: GC_GUI_Plan.md - Section 19

### Objective
Define all enum types and union types used throughout the application.

### Tasks
- [ ] Define `LayerType` enum: Image, Text, Shape, Group
- [ ] Define `BlendMode` enum (17 modes): Normal, Multiply, Darken, ColorBurn, Screen, Lighten, ColorDodge, LinearDodge, Overlay, SoftLight, HardLight, Difference, Exclusion, Hue, Saturation, Color, Luminosity
- [ ] Define `ShapeType` enum (27 shapes): Line, DiagonalLine, Rectangle, RoundedRectangle, Snip, Ellipse, Triangle, RightTriangle, Diamond, Parallelogram, Trapezoid, Pentagon, Hexagon, Octagon, Cross, Heart, Star, Star6, Ring, Arrow, ArrowLeft, ArrowUp, ArrowDown, DoubleArrow, ChevronRight, ChevronLeft, Custom
- [ ] Define `FillType` enum: Solid, LinearGradient, RadialGradient, SweepGradient, Image
- [ ] Define `TextAlignmentOption` enum: Left, Center, Right, Justify
- [ ] Define `TransparencyMaskType` enum: None, Linear, Radial
- [ ] Define additional supporting enums (TextTransformOption, TextBgMode, TextBgStretch, etc.)

### Deliverables
- `types/enums.ts` - all enum definitions

---

## Phase 20: Canvas Presets Data
**Reference**: GC_GUI_Plan.md - Section 20

### Objective
Define all canvas size presets data organized by category.

### Tasks
- [ ] Define Social Media presets (20 presets: YouTube, Facebook, TikTok, Instagram, X/Twitter, LinkedIn, Twitch, Pinterest, Discord)
- [ ] Define Paper presets at 300 DPI (9 presets: A0-A5, Letter, Legal, Tabloid)
- [ ] Define Display & Video presets (6 presets: VGA, HD, Full HD, 2K, 4K, 8K)
- [ ] Build preset data structure with name, width, height, category grouping
- [ ] Wire presets to Canvas Size Preset combo box in top toolbar
- [ ] Wire presets to View > Canvas Size submenu
- [ ] Wire presets to NewDocumentDialog built-in presets

### Deliverables
- `data/canvasPresets.ts` - all preset definitions
- Preset selection utility functions

---

## Phase 21: Value Converters & Utilities
**Reference**: GC_GUI_Plan.md - Section 21

### Objective
Build all value converter functions and utility helpers used for data binding and display.

### Tasks
- [ ] `BoolToVisibility` - bool to visible/collapsed
- [ ] `InverseBoolToVisibility` - bool to collapsed/visible
- [ ] `NullToVisibility` - object? to visible if non-null
- [ ] `StringToColorBrush` - hex string to CSS color
- [ ] `ByteArrayToImage` - byte[] to image URL/blob
- [ ] `FilePathToImage` - path to image (160px decode)
- [ ] `LayerTypeToIcon` - LayerType to MDI icon name
- [ ] `TimespanToString` - TimeSpan to "mm:ss"
- [ ] `ActiveToolToBool` - tool string equality check
- [ ] `EqualityToVisibility` - value == param to visible
- [ ] `Percentage` - double to "N%"
- [ ] `BoolToLockIcon` - bool to "Lock"/"LockOpenVariant"
- [ ] `BoolToVisibilityIcon` - bool to "Eye"/"EyeOff"
- [ ] `LayerToThumbnail` - LayerModel to thumbnail bitmap
- [ ] `BoolToFrameReceiverBorder` - bool to orange/transparent
- [ ] `FilePathToName` - path to filename without extension
- [ ] `GroupIndent` - parentId to left margin (18px or 0)
- [ ] `LayerTypeToVisibility` - Group to visible, others to collapsed
- [ ] `BoolToExpandIcon` - bool to "ChevronDown"/"ChevronRight"
- [ ] `BoolToExtractedBrush` - bool to green/gray
- [ ] `EqualityMulti` - values[0] == values[1] to bool
- [ ] `ProgressWidth` - percent to width (0-80px)

### Deliverables
- `utils/converters.ts` - all converter functions
- `utils/formatters.ts` - display formatting helpers

---

## Phase 22: ViewModel Commands & Actions
**Reference**: GC_GUI_Plan.md - Section 22

### Objective
Implement all 70+ commands/actions that drive the application logic.

### Tasks
- [ ] **File commands (12)**: NewProject, OpenProject, SaveProject, SaveProjectAs, SaveCopy, ExportImage, ExportPsd, ExportSvg, ImportImage, ImportVideo, ImportSvg, ImportLayersFromProject
- [ ] **Edit commands (8)**: Undo (canExecute: undoStack > 0), Redo (canExecute: redoStack > 0), CopyLayer, PasteLayer, DeleteLayer, DuplicateLayer, SelectAll, Deselect
- [ ] **Layer CRUD commands (9)**: AddText, AddShape (param), AddNewLayer, AddNewGroup, MergeDown, Rasterize, QuickExportLayer, LockLayer, ToggleVisibility
- [ ] **Arrange commands (4)**: BringToFront, SendToBack, BringForward, SendBackward
- [ ] **Group commands (3)**: Group (canExecute: 2+ selected), Ungroup (canExecute: selected is Group), ReleaseFromGroup
- [ ] **Transform commands (3)**: FlipHorizontal, FlipVertical, Rotate90
- [ ] **Alignment commands (14)**: AlignLeft/Center/Right/Top/Middle/Bottom, DistributeHorizontally/Vertically, DistributeLeft/Right/Top/BottomEdges, MatchWidth/Height/Size
- [ ] **View commands (5)**: ZoomIn (+0.1), ZoomOut (-0.1), OriginalSize (=1.0), ToggleGrid, SetTool (param), SetCanvasPreset (param)
- [ ] **AI commands (5)**: RemoveBackground, EnhanceImage, UpscaleRealEsrgan, LogoRemoval, FaceRestore
- [ ] **Video commands (6)**: RemoveVideo, SelectVideo, RandomizeFrames, PlayFile, OpenFileLocation, ExtractFrameAtTime
- [ ] Implement canExecute guards for all commands
- [ ] Wire commands to menu items, toolbar buttons, keyboard shortcuts, and context menus

### Deliverables
- `commands/fileCommands.ts`
- `commands/editCommands.ts`
- `commands/layerCommands.ts`
- `commands/arrangeCommands.ts`
- `commands/groupCommands.ts`
- `commands/transformCommands.ts`
- `commands/alignCommands.ts`
- `commands/viewCommands.ts`
- `commands/aiCommands.ts`
- `commands/videoCommands.ts`
- `useCommand.ts` - command execution hook

---

## Phase 23: AppSettings & Persistence
**Reference**: GC_GUI_Plan.md - Section 23

### Objective
Implement the complete application settings system with 160+ properties, persistence, and the Settings UI.

### Tasks
- [ ] Define settings schema with all categories: Window State, File Paths, Auto-Save, Export, Canvas, Video, AI, Inpainting, UI Panels, Nudge, Eraser, Blur Brush, Selection, Handle Sizes, Text Server, Render Server, Undo/Redo, Silent Export, Date Stamp, Image Studio
- [ ] Implement settings defaults for all 160+ properties
- [ ] Implement settings persistence (localStorage / electron-store / file-based)
- [ ] Build settings migration system for version upgrades
- [ ] Define Group Color Palette (8 colors: #FF6B6B, #4ECDC4, #FFD93D, #A78BFA, #60A5FA, #F472B6, #A3E635, #FBBF24)
- [ ] Wire settings to all consuming components
- [ ] Implement auto-save interval (10-3600 seconds, default 300)
- [ ] Implement undo disk limit (1-100GB) and max undo steps (5-200)
- [ ] Implement path resolution for all 7 file path settings
- [ ] Wire to SettingsWindow UI (Phase 17)

### Deliverables
- `settings/AppSettings.ts` - settings interface and defaults
- `settings/settingsStore.ts` - persistence layer
- `settings/useSettings.ts` - settings access hook

---

## Implementation Notes

### Recommended Build Order
1. **Foundation** (Phases 18, 19, 20, 23): Data models, enums, presets, settings
2. **Theme & Layout** (Phases 1, 2): Design system, app shell
3. **UI Panels** (Phases 3, 4, 5, 6, 8, 12): Menu, toolbars, panels, status bar
4. **Canvas Core** (Phases 7, 13): Canvas rendering, interactions
5. **Right Panel** (Phases 9, 10, 11): Properties, layers, templates
6. **Shortcuts & Menus** (Phases 14, 15): Keyboard, context menus
7. **Commands** (Phases 21, 22): Converters, all commands
8. **Windows** (Phases 16, 17): Image Studio, all dialogs

### Tech Stack
- **React 18+** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** for accessible primitives (menus, dialogs, tabs, sliders, etc.)
- **Zustand** or **Redux Toolkit** for state management
- **MDI React** for icons

---

*This phase plan is derived from the complete GC_GUI_Plan.md specification (23 sections, 1286 lines).*
