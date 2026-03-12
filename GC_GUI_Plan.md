# Thamnel GUI Recreation Plan
## Complete Interface Specification for React + Tailwind + Radix UI

---

## Table of Contents
1. [Global Theme & Colors](#1-global-theme--colors)
2. [MainWindow Layout](#2-mainwindow-layout)
3. [MainWindow Menus](#3-mainwindow-menus)
4. [Top Toolbar](#4-top-toolbar)
5. [Left Toolbar](#5-left-toolbar)
6. [Left Tab Panel](#6-left-tab-panel)
7. [Central Canvas](#7-central-canvas)
8. [Frame Gallery](#8-frame-gallery)
9. [Right Panel - Properties Tab](#9-right-panel---properties-tab)
10. [Right Panel - Layers Tab](#10-right-panel---layers-tab)
11. [Right Panel - Templates Tab](#11-right-panel---templates-tab)
12. [Status Bar](#12-status-bar)
13. [Canvas Behaviors](#13-canvas-behaviors)
14. [Keyboard Shortcuts](#14-keyboard-shortcuts)
15. [Context Menus](#15-context-menus)
16. [Image Studio Window](#16-image-studio-window)
17. [Dialog Windows](#17-dialog-windows)
18. [Data Models](#18-data-models)
19. [Enums](#19-enums)
20. [Canvas Presets](#20-canvas-presets)
21. [Value Converters](#21-value-converters)
22. [ViewModel Commands](#22-viewmodel-commands)
23. [AppSettings](#23-appsettings)

---

## 1. Global Theme & Colors

### Color Palette (CSS Variables)
| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-orange` | #FF6600 | Primary accent, selection, highlights, headers |
| `--dark-bg` | #1A1A1A | Window/app background |
| `--panel-bg` | #252525 | Side panels, menu bar |
| `--toolbar-bg` | #2D2D2D | Top/left/bottom toolbars, status bar |
| `--hover-bg` | #3A3A3A | Mouse hover state |
| `--selected-bg` | #404040 | Selected item background |
| `--border-gray` | #444444 | Borders, separators, dividers |
| `--text-primary` | #FFFFFF | Main text, button icons |
| `--text-secondary` | #B0B0B0 | Labels, subtext, inactive icons |
| `--canvas-bg` | #333333 | Canvas area background |

### Inline Colors Used
| Color | Usage |
|-------|-------|
| #1E1E1E | Ruler backgrounds |
| #2A2A2A | ComboBox/input backgrounds |
| #333333 | Layer name edit bg, progress bar bg, thumbnail bg |
| #FF5252 / #E53935 | Delete/close buttons (red) |
| #FF6B6B | Super lock icon |
| #8AB4F8 | CPU inference text (blue) |
| #81C784 | GPU inference / server connected (green) |
| #EF5350 | Server disconnected (red) |
| #42A5F5 | Render server connected (blue) |
| #4FC3F7 | Background section accent (Image Studio) |
| #707070 | Super-locked grey text |
| #0078D7 | Marquee selection (default) |
| #00BCD4 | Group bounding box (default) |
| #00FF00 | First selected in multi-select (default) |

### Font
- Primary: Roboto (MaterialDesign font family)
- Code/mono: Consolas (debug window)
- Default size: 13px
- Default weight: Regular (400)

### MaterialDesign Icon Pack
All icons use MaterialDesignIcons (MDI). Referenced by `Kind` name (e.g., `FileDocumentPlusOutline`, `Eraser`, `Brain`). Standard sizes: 14x14 (small), 16x16 (menu), 18x18 (toolbar sub), 20x20 (toolbar main), 24x24 (panel).

---

## 2. MainWindow Layout

**Window**: 1400x850, MinWidth=1000, MinHeight=600, CenterScreen, AllowDrop=True

### Root Grid (4 rows)
| Row | Height | Content |
|-----|--------|---------|
| 0 | Auto | Menu Bar |
| 1 | Auto | Top Toolbar |
| 2 | * (fill) | Main Content Area |
| 3 | Auto | Status Bar |

### Main Content (Row 2) - 4 columns
| Column | Width | Content |
|--------|-------|---------|
| 0 | * (fill) | Left side (canvas + frames) |
| 1 | 0 (collapsed) | Effect bar (reserved) |
| 2 | Auto | Right panel splitter (4px) |
| 3 | 310px | Right panel |

### Left Side (Column 0) - 3 rows
| Row | Height | Content |
|-----|--------|---------|
| 0 | * | Main area (toolbar + browser + canvas) |
| 1 | Auto | Frame gallery splitter (4px) |
| 2 | 130px (min 60, max 400) | Frame Gallery |

### Main Area (Row 0) - 4 columns
| Column | Width | Content |
|--------|-------|---------|
| 0 | 48px | Left toolbar |
| 1 | 0 (collapsed) | Left tab panel (video browser / image gallery / server audio) |
| 2 | 0 (collapsed) | Splitter for left tab panel |
| 3 | * | Central canvas |

---

## 3. MainWindow Menus

**Menu bar**: bg=panel-bg, bottom border=border-gray, font-size=13

### File Menu (`_File`)
| Item | Shortcut | Icon | Command |
|------|----------|------|---------|
| New Project | Ctrl+N | FileDocumentPlusOutline | NewProjectCommand |
| Open Project... | Ctrl+O | FolderOpenOutline | OpenProjectCommand |
| --- | | | |
| Save | Ctrl+S | ContentSaveOutline | SaveProjectCommand |
| Save As... | Ctrl+Shift+S | ContentSaveOutline | SaveProjectAsCommand |
| Save Copy | | ContentCopy | SaveCopyCommand |
| Save as Template | | BookmarkPlusOutline | SaveAsTemplate_Click |
| --- | | | |
| Import > Image... | Ctrl+I | ImagePlusOutline | ImportImageCommand |
| Import > Video... | | VideoOutline | ImportVideoCommand |
| Import > SVG... | Ctrl+Shift+I | VectorPolyline | ImportSvgCommand |
| Import > Project... | | FolderDownloadOutline | ImportLayersFromProjectCommand |
| Export > Export Image... | Ctrl+E | ImageOutline | ExportImageCommand |
| Export > Export as SVG... | Ctrl+Alt+S | VectorPolyline | ExportSvgCommand |
| Export > Export as Photoshop File... | Ctrl+Alt+P | FileExportOutline | ExportPsdCommand |
| Export > Export Layer | Ctrl+Shift+E | FileImageOutline | QuickExportLayerCommand |
| Export > Batch Image Producer... | | ImageMultipleOutline | BatchProducer_Click |
| --- | | | |
| Recent Files > Project Files | | FileDocumentOutline | Dynamic submenu |
| Recent Files > Template Files | | BookmarkOutline | Dynamic submenu |
| Recent Files > Local Image Files | | ImageOutline | Dynamic submenu |
| Recent Files > Gallery Images | | ImageMultipleOutline | Dynamic submenu |
| Recent Files > Online Images | | Web | Dynamic submenu |
| --- | | | |
| Settings... | | CogOutline | SettingsButton_Click |

### Edit Menu
| Item | Shortcut | Icon | Command |
|------|----------|------|---------|
| Undo | Ctrl+Z | Undo | UndoCommand |
| Redo | Ctrl+Y | Redo | RedoCommand |
| --- | | | |
| Cut | Ctrl+X | ContentCut | (disabled) |
| Copy | Ctrl+C | ContentCopy | CopyLayerCommand |
| Paste | Ctrl+V | ContentPaste | PasteLayerCommand |
| Duplicate | Ctrl+D | ContentDuplicate | DuplicateLayerCommand |
| Delete | Del | DeleteOutline | DeleteLayerCommand |
| --- | | | |
| Select All | Ctrl+A | SelectAll | SelectAllCommand |
| Deselect | Esc | Close | DeselectCommand |

### View Menu
| Item | Shortcut | Icon | Notes |
|------|----------|------|-------|
| Zoom In | Ctrl++ | MagnifyPlusOutline | |
| Zoom Out | Ctrl+- | MagnifyMinusOutline | |
| Original Size | Ctrl+0 | RelativeScale | |
| Fit to Screen | Ctrl+1 | FitToScreenOutline | |
| --- | | | |
| Zoom 200% | Ctrl+2 | | |
| Zoom 300% | Ctrl+3 | | |
| Zoom 400% | Ctrl+4 | | |
| Zoom 500% | Ctrl+5 | | |
| --- | | | |
| Show Grid | F | Grid | Checkable toggle |
| Show Items Outside Canvas | | EyeOutline | Checkable toggle |
| Clear Marker Grid | | RulerSquare | |
| --- | | | |
| Canvas Size | | Monitor | Dynamic submenu |
| Layout Presets | | ViewDashboardOutline | Dynamic submenu |

### Layer Menu
| Item | Shortcut | Icon |
|------|----------|------|
| New Empty Layer | Ctrl+Shift+N | PlusBoxOutline |
| New Group | | FolderPlusOutline |
| Add Text | T | FormatText |
| Add Shape | R | ShapeRectanglePlus |
| Add Date Stamp | | CalendarTextOutline |
| --- | | |
| Duplicate | Ctrl+D | ContentDuplicate |
| Delete | Del | DeleteOutline |
| Merge Down | Ctrl+M | ArrowDownBold |
| Rasterize | | ImageOutline |
| --- | | |
| Lock/Unlock | Ctrl+L | Lock |
| Toggle Visibility | H | EyeOutline |
| --- | | |
| Arrange > Bring to Front | Ctrl+Shift+] | ArrangeBringToFront |
| Arrange > Bring Forward | Ctrl+] | ArrangeBringForward |
| Arrange > Send Backward | Ctrl+[ | ArrangeSendBackward |
| Arrange > Send to Back | Ctrl+Shift+[ | ArrangeSendToBack |
| Group > Group | Ctrl+G | Group |
| Group > Ungroup | Ctrl+Shift+G | Ungroup |
| Align > Left/Center/Right/Top/Middle/Bottom | | AlignHorizontal* / AlignVertical* |
| Align > Distribute H/V | | ArrowExpand* |

### Image Menu
| Item | Shortcut | Icon |
|------|----------|------|
| Flip Horizontal | Ctrl+H | FlipHorizontal |
| Flip Vertical | Ctrl+Shift+H | FlipVertical |
| Rotate 90 | Ctrl+R | RotateRight |
| --- | | |
| Fit to Canvas | Ctrl+F | FitToPage |
| Fit Width | Ctrl+Shift+F | ArrowExpandHorizontal |
| Fit Height | Ctrl+Alt+Shift+F | ArrowExpandVertical |
| --- | | |
| AI Enhance Image | | AutoFix |
| AI Remove Background | | ImageAutoAdjust |

### Tools Menu
| Item | Shortcut | Icon |
|------|----------|------|
| Select Tool | V | CursorDefaultOutline |
| Eraser Tool | B | Eraser |
| Blur Brush | J | BlurOn |
| --- | | |
| Eraser Settings... | | Tune |
| Blur Brush Settings... | | Tune |

### Window Menu
| Item | Shortcut | Icon |
|------|----------|------|
| Image Gallery | G | ImageSearchOutline |
| Debug Log | | BugOutline |

### Help Menu
| Item | Icon |
|------|------|
| About Thamnel | InformationOutline |

---

## 4. Top Toolbar

**Container**: bg=toolbar-bg, bottom border=border-gray, padding=4px 2px

### Left Section (horizontal stack)
| # | Tooltip | Icon (20x20) | Type | Command |
|---|---------|-------------|------|---------|
| 1 | New Project (Ctrl+N) | FileDocumentPlusOutline | Button | NewProjectCommand |
| 2 | Open Project (Ctrl+O) | FolderOpenOutline | Button | OpenProjectCommand |
| 3 | Save Project (Ctrl+S) | ContentSaveOutline | Button | SaveProjectCommand |
| 4 | Save as Template | BookmarkPlusOutline | Button | SaveAsTemplate_Click |
| 5 | Save Copy | ContentCopy | Button | SaveCopyCommand |
| | *separator* | | | |
| 6 | Import Video | VideoOutline | Button | ImportVideoCommand |
| 7 | Export Image (Ctrl+E) | Export | Button | ExportImageCommand |
| 8 | Export List | FormatListBulleted | Button | ExportList_Click |
| 9 | Batch Image Producer | ImageMultipleOutline | Button | BatchProducer_Click |
| 10 | Image Gallery | ImageSearchOutline | Button | Gallery_Click |
| 11 | Video Browser | FolderPlayOutline | Toggle | VideoBrowserToggle_Click |
| 12 | Image Gallery Panel | ImageMultiple | Toggle | ImageGalleryToggle_Click |
| | *separator* | | | |
| 13 | Send To Server Render | SendOutline | Button | SendToServerRender_Click |
| 14 | Server Audio Library | MusicBoxMultipleOutline | Toggle | ServerAudioToggle_Click |
| | *separator* | | | |
| 15 | Undo (Ctrl+Z) | Undo | Button | UndoCommand |
| 16 | Redo (Ctrl+Y) | Redo | Button | RedoCommand |

### Center
- Branding: "Thamnel by Kamrul Islam Rubel", 15pt bold, orange, clickable (tooltip: "Click: last template | Ctrl+Click: last project | Ctrl+Shift+Click: open app folder")

### Right Section
| # | Element | Width | Notes |
|---|---------|-------|-------|
| 1 | Canvas Quality Combo | 80px | Items: 10% through 100% (10 items), h=22, bg=#2A2A2A |
| 2 | Canvas Size Preset Combo | 120px | Grouped by category, h=22 |
| 3 | Layout Preset Combo | 120px | h=22, placeholder "Select layout" |
| | *separator* | | |
| 4 | Zoom In button | | 18x18 icon |
| 5 | Zoom % text | 40px | e.g. "100%" |
| 6 | Zoom Out button | | 18x18 icon |
| 7 | Original Size button | | RelativeScale 18x18 |
| 8 | Fit to Screen button | | FitToScreenOutline 18x18 |
| 9 | Grid toggle | 36x36 | Grid 18x18 |
| 10 | Settings button | | CogOutline 18x18 |
| 11 | Debug button | | BugOutline 18x18, text-secondary |

---

## 5. Left Toolbar

**Container**: 48px wide, bg=toolbar-bg, right border=border-gray

### Tool Toggle Button Style
38x38, borderless, cursor=hand, corner-radius=4
- Normal: transparent bg, text-primary fg
- Hover: bg=#25FFFFFF
- Active/Checked: bg=#35FF6600, fg=accent-orange
- Active+Hover: bg=#45FF6600
- Disabled: opacity=0.3

### Tools (top to bottom)
| # | Tooltip | Icon (20x20) | Type | Notes |
|---|---------|-------------|------|-------|
| 1 | Select Tool (V) | CursorDefaultOutline | Toggle | Default active |
| 2 | Draw Text (T) | FormatText | Toggle | |
| 3 | Date Stamp | CalendarTextOutline | Button | Opens DateStampWindow |
| 4 | Draw Shape (R) | ShapeRectanglePlus | Toggle | Ctrl+Click opens ShapeDrawingWindow (full illustrator-like vector drawing) |
| 5 | Import Image (Ctrl+I) | ImagePlusOutline | Button | |
| | *separator* | | | |
| 6 | Image Studio | Brain | Button | Requires image layer selected |
| 7 | Eraser (B) | Eraser | Toggle | Right-click for settings |
| 8 | Blur Brush (J) | BlurOn | Toggle | Right-click for settings |
| | *separator* | | | |
| 9 | Align | AlignHorizontalCenter | Toggle | Requires selected layer |
| 10 | Distribute | (custom SVG) | Toggle | Requires 2+ selected layers |
| | *separator* | | | |
| 11 | Flip Horizontal | FlipHorizontal | Button | 38x34, icon 18x18 |
| 12 | Flip Vertical | FlipVertical | Button | 38x34 |
| 13 | Rotate 90 | RotateRight | Button | 38x34 |
| | *separator* | | | |
| 14 | Fill/Stroke Swatches | (custom) | Grid | Photoshop-style overlapping swatches |

### Shape Sub-Popup (right of shape toggle, 140px wide, max-h=460)

**Lines**: Line (Minus), DiagonalLine (SlashForward)
**Rectangles**: Rectangle (SquareOutline), RoundedRectangle (SquareRoundedOutline), Snip (ContentCut)
**Basic Shapes**: Ellipse (CircleOutline), Triangle (TriangleOutline), RightTriangle, Diamond (RhombusOutline), Parallelogram (ShapeOutline), Trapezoid (PerspectiveLess), Pentagon, Hexagon, Octagon, Cross (Plus), Heart (HeartOutline), Star (StarOutline), Star6 (HexagramOutline), Ring (CircleDouble)
**Block Arrows**: Arrow (ArrowRightBold), ArrowLeft, ArrowUp, ArrowDown, DoubleArrow (ArrowLeftRight), ChevronRight, ChevronLeft

Each button: 34x34, click selects shape type.

### Align Sub-Popup (6 buttons, 32x32 each)
AlignLeft, AlignCenter, AlignRight | AlignTop, AlignMiddle, AlignBottom

### Distribute Sub-Popup (6 buttons, 32x32 each, custom SVG icons)
DistributeTopEdges, DistributeVertically, DistributeBottomEdges | DistributeLeftEdges, DistributeHorizontally, DistributeRightEdges

### Fill/Stroke Swatches (Photoshop-style)
- **Fill swatch** (back, top-left): 24x24, rounded-3, checkerboard bg + color overlay + "X" cross (if no fill) + alpha text (7pt)
- **Stroke swatch** (front, bottom-right, overlapping): 18x18, rounded-2, same pattern

---

## 6. Left Tab Panel

**Container**: bg=panel-bg, right border=border-gray, initially collapsed
**TabControl**: 3 tabs, tab height=28, font-size=11

### Tab 1: VIDEO BROWSER
- Header: "VIDEO BROWSER" (orange, semibold, 11pt) + summary text + 4 action buttons (26x26): Add Videos, Append Videos, Add Folder, Append Folder
- DataGrid: read-only, row-height=24, font-size=11.5
  - Columns: SL (32px), Video File (*), Duration (60px)
  - Row style: selected=selected-bg, hover=hover-bg
  - Video File foreground: green (#4CAF50) if extracted, gray (#B0B0B0) if not
- Bottom: Duration progress bar (h=2, orange, collapsed)

### Tab 2: IMAGE GALLERY
- **Toolbar**: Folders label (orange), Refresh, Collapse, Quick Folders toggle, Open Explorer, Download Gallery Pack (+ progress), View Mode toggle, Sort toggle, Search box (120px, hint="Search..."), Thumb Size slider (60-200, default 120)
- **Quick Folder Strip**: Collapsed by default, shows shortcut buttons
- **Content**: 3-column (TreeView 160px | splitter 3px | thumbnail WrapPanel)
  - TreeView: folder hierarchy, font-size=11, text-secondary
  - PS Data panel (collapsed): X/Y/W/H NUDs (0-9999), Remove + Set PS buttons
  - Thumbnails: ItemsControl with WrapPanel, dynamic thumbnail size
- **Info Bar**: folder stats + info text + loading indicator

### Tab 3: SERVER AUDIO
- Header: "SERVER AUDIO" (orange) + Refresh button
- ListBox: RadioButton + MusicNote icon + Name + Duration per item
- Status text at bottom

---

## 7. Central Canvas

### Ruler System
- Top ruler: 20px height, bg=#1E1E1E, cursor=SizeNS (drag to create horizontal guide)
- Left ruler: 20px width, bg=#1E1E1E, cursor=SizeWE (drag to create vertical guide)
- Corner: 20x20, bg=#1E1E1E
- Tick colors: minor=#646464, labels=#A0A0A0, canvas edges=#FF6600
- Zoom-adaptive intervals: 50/100/200/500px

### Canvas Viewport
- ScrollViewer with auto scrollbars
- Inner grid: centered, margin=40, zoom via ScaleTransform bound to Zoom property
- Canvas shadow: DropShadow (blur=20, opacity=0.5, depth=5)

### Canvas Layers (bottom to top)
1. **DesignCanvas**: bg=white, width/height=CanvasWidth/CanvasHeight
2. **GridOverlay**: visible when ShowGrid=true
3. **DimOverlay**: semi-transparent (#80000000) outside canvas bounds
4. **PaddingOverlay**: padding guides
5. **MarkerGuideOverlay**: ruler drag guides (cyan #00BCD4, dash {4,4})
6. **MarqueeOverlay**: selection rectangle
7. **HandleOverlay**: selection handles, rotation handle, anchor point

### Active Tool Indicator
- Bottom-left corner, "Tool: {ActiveTool}", font-size=11, text-secondary, opacity=0.6

---

## 8. Frame Gallery

**Container**: bg=toolbar-bg, top border=border-gray, height=130px (resizable 60-400)

### Header Row
- "VIDEO FRAMES" text (bold, 11pt, orange, clickable for context menu)
  - Context menu: Add Video, Add Image Folder, Add Image, Add From Gallery
- Video tab strip: scrollable horizontal list of loaded video tabs
  - Active tab: bg=#55FF6600, orange border
  - Each tab: name (9pt, max-w=100) + close button (red #FF5252)
- Add Video button (28x28, orange, VideoPlus icon)
- Timestamp input (80px, hint="mm:ss")
- Previous/Play/Next buttons (20x20)
- Paste from clipboard button (28x28)

### Extraction Progress
- Visible during extraction, ProgressBar h=6, orange

### Frame Thumbnails
- Horizontal scrolling ItemsControl
- Each frame: width/height from settings, margin=4px, border-gray border, rounded-4, bg=black
  - Image (stretch=uniform)
  - Timestamp overlay (bottom-right, 10pt white on #80000000)
- Nav buttons (left/right, 32px wide, bg=#40000000, appear on hover)

---

## 9. Right Panel - Properties Tab

**Tab header**: Cog icon 14x14 + "Properties"
**Visible when**: HasSelectedLayer=true

### Opacity + Blend Row
- Effect Presets toggle (TuneVariant 16x16)
- Blend Mode combo (80px, h=22, 17 modes)
- Opacity NUD (50px, 0-1, step 0.01, format "F2")
- Opacity Slider (0-1, orange, small-thumb style)

### Preset Panel (collapsed by default)
- Preset combo (140px) + Delete button + Save button

### POSITION Expander (collapsed by default)
- X/Y: NUDs (-5000 to 5000, step 1)
- Width/Height: NUDs (1 to 10000, step 1)
- Rotation: NUD (-360 to 360, step 1)
- Padding: NUD (0-200) + Slider

### CROP Expander (image layers, collapsed)
- Top/Bottom/Left/Right: NUD (0-5000, w=50) + Slider (0-500)

### TEXT Expander (text layers, expanded by default)
- Text content: multiline TextBox (min-h=60, max-h=150)
- Font family: searchable ComboBox
- Font size: NUD (8-200) + Slider (snap to tick)
- Style toggles (30x30 each): Bold, Italic, Underline, Strikethrough, HasBackground
- Alignment (30x30 each): Left, Center, Right, Justify
- Color swatch (26x26, checkerboard + color overlay)
- Stroke: swatch + NUD (0-50, step 0.1) + Slider
- W Squeeze: NUD (-100 to 100, step 0.1) + Slider
- H Squeeze: same

### SHAPE Expander (shape layers, expanded by default)
- Fill color swatch (26x26)
- Border: swatch + NUD (0-50, step 0.1) + Slider
- Corner Radius: NUD (0-500) + Slider
- "Edit in Shape Drawing Window" button (opens ShapeDrawingWindow for full vector editing — re-editable nesting like Premiere Pro)

### EFFECTS Expander (expanded by default)

Each effect: CheckBox (11pt, text-secondary) + collapsible sub-panel (margin-left=18)
Sub-panel rows: Label (w=40, 9pt) + NUD (w=50) + Slider (orange, small-thumb, h=18)

| # | Effect | Sub-controls | Min | Max | Default |
|---|--------|-------------|-----|-----|---------|
| 1 | Brightness | slider | -100 | 100 | 0 |
| 2 | Contrast | slider | -100 | 100 | 0 |
| 3 | Saturation | slider | -100 | 100 | 0 |
| 4 | Hue | slider | -180 | 180 | 0 |
| 5 | Grayscale | (none) | | | |
| 6 | Sepia | (none) | | | |
| 7 | Invert | (none) | | | |
| 8 | Sharpen | Amount | 0 | 1 | 0.5 |
| 9 | Vignette | Radius, Amount | 0-1, 0-1 | | 0.7, 0.6 |
| 10 | Pixelate | Size | 2 | 50 | 8 |
| 11 | Color Tint | swatch + Amount | 0-1 | | 0.3 |
| 12 | Noise | Amount | 1 | 100 | 20 |
| 13 | Posterize | Levels | 2 | 16 | 4 |
| 14 | Gaussian Blur | Radius | 1 | 50 | 5 |
| 15 | Drop Shadow | OffX, OffY, Blur, Color swatch | -50/50, -50/50, 0/50 | | 4,4,8 |
| 16 | Outer Glow | Radius, Opacity, Color | 1/200, 0/100 | | 10, 100 |
| 17 | Cut Stroke | Width, Color | 1-20 (0.5) | | 2 |
| 18 | Rim Light | L/R Color, L/R Intensity, Glow, Softness | 0-100 each | | 60,60,30,50 |
| 19 | Split Toning | Shadow/Highlight Color, Balance, Strength | 0-100 each | | 50, 30 |
| 20 | Smooth Stroke | Thickness, Smoothness, Color, Opacity | 1-20, 0-10, -, 0-100 | | 3, 2, white, 100 |
| 21 | Blend Overlay | Color, Mode combo (110px), Opacity | 0-100 | | 50 |

### Bottom Sticky Section
- Layer name text (orange, centered)
- Image dimensions text (text-secondary, centered)
- Optimize Memory button (outlined, orange border)

---

## 10. Right Panel - Layers Tab

**Tab header**: LayersOutline icon 14x14 + "Layers" (default selected tab)

### Layer List
- Scrollable list bound to Layers collection
- Selected item: bg=#33FF6600
- AllowDrop for drag-and-drop reordering

### Layer Item Template (7 columns)
| Col | Element | Size | Details |
|-----|---------|------|---------|
| 0 | Expand/Collapse | 16x16 | Groups only, ChevronDown/ChevronRight icon |
| 1 | Visibility toggle | 24x24 | Eye/EyeOff icon |
| 2 | Type icon | 22x22 | rounded-3, hover=hover-bg. Icons: Image, FormatText, ShapeOutline, FolderOutline |
| 3 | Layer name | * | 12pt, ellipsis. Double-click for inline rename |
| 4 | Super lock icon | 14x14 | ShieldLock, red #FF6B6B, hidden by default |
| 5 | Thumbnail | 22x22 | rounded-2, bg=#333, orange border if frame-receiver |
| 6 | Lock toggle | 24x24 | Lock/LockOpenVariant icon |

### Tree Indentation
- Indent spacer: depth * 28px per level
- Tree connector lines: vertical + branch using group color at 40% opacity
- Group rows: 15% opacity of group color as background tint

### Footer Buttons (bg=toolbar-bg, padding=4)
| # | Element | Icon | Size | Notes |
|---|---------|------|------|-------|
| 1 | Export | (text only) | h=28 | bg=orange, white text, bold |
| 2 | New Layer | Plus | 32x32 | |
| 3 | New Group | FolderPlusOutline | 32x32 | |
| 4 | Duplicate | ContentDuplicate | 32x32 | |
| 5 | Bring Forward | ArrangeBringForward | 32x32 | |
| 6 | Send Backward | ArrangeSendBackward | 32x32 | |
| 7 | Group | Group | 32x32 | |
| 8 | Ungroup | Ungroup | 32x32 | |
| 9 | Delete | TrashCanOutline | 32x32 | red #E53935, drag-to-delete target |
| 10 | Text Link Config | LinkVariant | 32x32 | |
| 11 | Canvas BG Color | (color swatch) | 24x24 | rounded-3, default white |

---

## 11. Right Panel - Templates Tab

**Tab header**: BookmarkMultipleOutline 14x14 + "Templates" + count badge "(0)"

- ListBox of templates: BookmarkOutline icon (orange) + Name (13pt)
- Double-click to load template
- Context menu: "Update with Current Project", "Delete Template" (red)

---

## 12. Status Bar

**Container**: bg=toolbar-bg, padding=8px 3px, top border=border-gray

Left to right:
| Element | Binding | Color | Notes |
|---------|---------|-------|-------|
| Status text | StatusText | text-secondary | 11pt |
| Download progress | DownloadProgress | orange | 120x4, visible when downloading |
| Canvas dims | CanvasWidth x CanvasHeight | text-secondary | 11pt |
| Separator | | | visible when inference device |
| Inference device | InferenceDeviceName | #8AB4F8 (CPU) / #81C784 (GPU) | |
| Separator | | | |
| User name | | orange | clickable |
| Server status text | ServerStatusText | text-secondary | clickable |
| Server dot | | red #EF5350 / green #81C784 | 10x10 circle |
| Separator | | | |
| Render progress | RenderProgressPercent | orange | 80x6 bar + % text + stage text |
| Render server text | RenderServerStatusText | text-secondary | clickable |
| Render server dot | | red #EF5350 / blue #42A5F5 | 10x10 circle |
| API Key icon | | text-secondary | Key 14x14, margin=50px |

---

## 13. Canvas Behaviors

### Selection Handles (zoom-compensated)
- `handleSize = 8 * (1/zoom)` (configurable via Settings)
- **Single layer**: 8 resize handles (corners + edge midpoints) + rotation handle (35px above center) + anchor crosshair
- **Group/Multi**: dashed bounding box (dash {6,3}), 8 resize + rotation
- Colors: single=SelectionColor (#FF6600), first-multi=FirstSelectedColor (#00FF00), additional-multi=MultiSelectedColor (#FF6600), group=GroupBoxColor (#00BCD4)
- Locked layer: dashed border only, no handles

### Mouse Interaction Priority Chain
1. Shape fill edit click
2. Double-click (reset anchor / enter fill edit / inline text edit)
3. Tool action (Image, BgRemove, Brush, BlurBrush, Shape, Text)
4. Group rotation drag
5. Group resize drag
6. Anchor drag
7. Single rotation drag
8. Single resize drag (Alt = crop mode)
9. Group bounds move
10. Single bounds move (Ctrl = duplicate)
11. Hit-test selection
12. Fallback bounds selection
13. Marquee selection start

### Modifier Keys During Drag
| Context | Modifier | Behavior |
|---------|----------|----------|
| Move | Shift | Constrain to H or V axis |
| Move | Ctrl | Duplicate-then-move |
| Resize | Shift | Lock aspect ratio |
| Resize | Ctrl | Symmetric from center |
| Resize | Alt | Switch to Crop mode |
| Rotate | Shift | Snap to 15-degree increments |
| Shape Draw | Shift | Constrain to square |

### Smart Guides
- Snap targets: canvas edges/center, all layer edges/centers, marker guides
- Threshold: 5px for layers, configurable for markers
- Guide lines: magenta (255,0,255), thickness 0.5, dash {2,2}

### Eraser Tool
- Modes: Soft (radial gradient DstOut) / Hard (Clear blend)
- Anti-erase: right-click or Ctrl held (restores from original)
- Brush size: 1-500, adjustable via [ ] keys (step 5) or scroll wheel
- Cursor: circle/rectangle overlay, configurable color/thickness/dash

### Blur Brush Tool
- Paints alpha mask for blur effect
- Anti-blur: right-click or Ctrl held
- 30fps visual throttle
- Configurable size, hardness, radius, opacity

### Shape Drawing (Quick Place on Canvas)
- Preview: orange dashed rectangle during drag
- Shift = constrain to square
- Creates shape if drag > 5px in both dimensions
- Auto-switches to Select tool after creation
- Creates a basic shape layer on canvas (for quick use without opening Shape Drawing Window)
- **Double-click any shape layer** on canvas → opens ShapeDrawingWindow for full vector editing (re-editable nesting, like Premiere Pro)
- **Ctrl+Click** the shape tool in left toolbar → opens ShapeDrawingWindow directly for complex shape creation

### Text Inline Editing
- Activated by: double-click, F2, or after text drawing
- Rich text editing with per-character StyledRun formatting
- Orange border (#FF6600, 1.5px)
- Rotation-aware positioning
- Ctrl+Enter = commit, Escape = cancel

### Layer Panel Drag-Drop
- Drag threshold: system minimum drag distance
- InsertionAdorner: orange line (#FF6600, 2px) with circle endpoints
- Group ingest: green icon (allowed) / red icon (depth/lock guard)
- Max depth: 2 levels (Group > SubGroup > Layer)
- Drag-to-delete button supported

### Clipboard
- Custom format: "ThamneLayer" (cross-instance)
- Images > 5MB offloaded to temp files
- Paste remaps all IDs, offsets by (20,20)
- Fallback: system clipboard image paste

---

## 14. Keyboard Shortcuts

### Global (with modifiers)
| Shortcut | Action |
|----------|--------|
| Ctrl+N | New Project |
| Ctrl+O | Open Project |
| Ctrl+S | Save Project |
| Ctrl+Shift+S | Save As |
| Ctrl+E | Export Image |
| Ctrl+Shift+E | Quick Export Layer |
| Ctrl+I | Import Image |
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Ctrl+D | Duplicate |
| Delete | Delete Layer |
| Ctrl+C | Copy |
| Ctrl+V | Paste (layer or clipboard image) |
| Ctrl+A | Select All |
| Ctrl+Shift+A | Open Image Studio |
| Escape | Cancel/Deselect (priority chain) |
| Ctrl+G | Group |
| Ctrl+Shift+G | Ungroup |
| Ctrl+Shift+R | Release from Group |
| Ctrl+[ / Ctrl+] | Send Backward / Bring Forward |
| Ctrl+Shift+[ / Ctrl+Shift+] | Send to Back / Bring to Front |
| Ctrl+0..5 | Zoom levels (fit/100%/200%/300%/400%/500%) |
| Ctrl+H | Flip Horizontal |
| Ctrl+Shift+H | Flip Vertical |
| Ctrl+R | Rotate 90 |
| Ctrl+L | Lock/Unlock |
| Ctrl+M | Merge Down |
| Ctrl+Shift+N | New Empty Layer |
| Ctrl+F | Fit Layer to Canvas |
| Ctrl+Shift+F | Fit Width |
| Ctrl+Alt+Shift+F | Fit Height |
| Ctrl+Alt+W/H/B | Match Width/Height/Size |
| F2 | Instant Text Editor |

### Single-key (blocked when editing text)
| Key | Action |
|-----|--------|
| Space (hold) | Pan mode |
| T | Text tool toggle |
| R | Shape tool toggle |
| V | Select tool |
| B | Eraser toggle |
| J | Blur Brush toggle |
| G | Open Gallery |
| F | Toggle Grid |
| H | Toggle Visibility |
| L | Toggle Lock |
| [ / ] | Brush size -/+ 5 |
| Arrow keys | Nudge (1px default) |
| Shift+Arrow | Nudge 5px |
| Ctrl+Shift+Arrow | Nudge 10px |
| Ctrl+Shift+Alt+Arrow | Nudge 50px |

---

## 15. Context Menus

### Canvas Right-Click (single layer)
- Copy / Paste
- Ungroup (groups only)
- **Image Studio...** (bold, images only)
- Logo Remover... / Blur Faces... (images only)
- Text Properties... / Edit Date Stamp... / Convert to Characters (text only)
- Mask with Image... / Remove Image Fill / Transparency Mask... (shapes only)
- Fill Selected Object... (text/shape)
- Duplicate / Delete (red)
- Transform submenu (Auto Size, Rotate, Position, Arrange)
- Save/Apply Style Preset
- Select Layer submenu (all layers under cursor)

### Canvas Right-Click (multi-selection)
- Group (Ctrl+G)
- Autosize submenu (Same Width/Height/Size)
- Delete Selected (red)

### Layer Panel Right-Click (single layer)
- Rename / Duplicate / Merge Down
- Auto Size / Rotate / Position / Arrange submenus
- Quick Export PNG
- Blur Faces / Get Video Name (conditional)
- Style Presets submenu
- Release from Group (if in group)
- Clear Blur Mask (if has mask)
- Delete (red)
- Super Lock

### Layer Panel Right-Click (group)
- Rename / Duplicate Group
- New Sub-Group (if depth < 1)
- Change Group Color (8-color palette)
- Ungroup / Delete Group (red) / Super Lock

### Super-Locked Layer
- Only shows: "Off Super Lock"

---

## 16. Image Studio Window

**Title**: "Image Studio", 1200x800 (starts maximized), min 800x600, modal

### Layout
- Header bar (auto) + Main content (2-col: preview * | splitter 5px | right panel 310px)

### Header Bar
- Save to Gallery (ContentSaveOutline, 28x28)
- Title: "Image Studio Module By Kamrul Islam Rubel" (orange, semibold, 13pt)
- View Mode radios: Combined / Foreground / Background (collapsed until separation)
- Status text

### Preview Area
- **Brush Toolbar** (collapsed until separation):
  | Tool | Icon | Size | Notes |
  |------|------|------|-------|
  | Pan | CursorDefaultOutline | 30x30 | Default active |
  | Eraser | Eraser | 30x30 | Right-click for settings |
  | Creator | Creation | 30x30 | Right-click for settings |
  | Box Delete | SelectionRemove | 30x30 | |
  | Box Restore | SelectionSearch | 30x30 | |
  | Reset FG | AccountRemove | 30x30 | orange |
  | Reset BG | Restore | 30x30 | #4FC3F7 |
  | Reform BG | (text) | h=26 | outlined button |
  | Preview slider | | 80px | 25-100, default 50, tick=25 |
  | Shortcut Help | HelpCircleOutline | | |
  | Save Gallery | ContentSaveOutline | 30x30 | |

- Canvas: ScrollViewer with zoom (ScaleTransform), checkerboard bg, preview image, mask overlay, brush cursor canvas, shape boundary canvas
- Processing overlay: indeterminate progress + status text

### Right Panel - Pre-Separation

**A. AI Operations** (Brain icon, expanded):
  1. **Scratch Remover**: Brush Size (5-200, default 30), Brush/Box/Clear tools, "Remove Scratch" button
  2. **Face Restoration**: Fidelity (0-1, default 0.5), Blend (0-100, default 100%), "Restore Faces" button
  3. **Denoise**: Strength (0-100, default 100%), "Denoise" button
  4. **Inpaint/Outpaint**: Select Region button, Dilation (0-50), Tiling checkbox, Overlap (16-128, default 64), Progressive checkbox, Refine checkbox, Sharpen (0-200, default 50), Outpaint extend (50-500, default 150) with 4 direction buttons
  5. **Colorize**: Strength (0-100, default 100%), "Colorize" button
  6. **Cartoonize**: Strength (0-100, default 100%), "Cartoonize" button
  7. **Background Separation** (expanded): Threshold (0.01-0.99, default 0.3), Edge Softness (0-1, default 0.15), **"Separate Background"** raised button (orange, h=38, 13pt bold)

**B. Pixel Effects** (Tune icon):
  - Undo/Redo + Send to Canvas + Preset sidebar
  - Color Adjustments: Brightness/Contrast/Saturation (-100 to 100), Hue (0-360)
  - Image Effects: Blur (1-50), Sharpen (1-100), Grayscale, Sepia, Invert, Vignette (10-100), Pixelate (2-40), Posterize (2-16), Noise (1-100), Color Tint (1-100 + swatch)

**C. Image Blend** (Palette icon):
  - Enable checkbox, Choose Fill, Blend Mode combo, Position (Over/Under), Layer Opacity (0-100), Base Opacity (0-100)

### Right Panel - Post-Separation

**Presets Bar**: Combo + Apply/Save/Delete. System presets: Clear All, YouTube, Cinema, Neon, Warm, Cool

**FOREGROUND** (Account icon, orange accent):
  - Cinematic: Rim Light (L/R color+intensity+angle, glow, softness), Split Toning (shadow/highlight, balance, strength)
  - Pixel Effects: same as pre-separation
  - Color Adjustments: same
  - Stroke: Thickness (0-50, step 0.1), Smoothness (0-50), Opacity (0-100), Offset X/Y (-50 to 50), Color swatch
  - Blending: Enable, Choose Fill, Mode, Position, Layer/Base Opacity

**BACKGROUND** (Wallpaper icon, #4FC3F7 accent):
  - Fill: Original/Solid/Gradient/Image modes, Color swatches, Direction (0-360), Image controls, Vignette (0-100)
  - Color Tint: Enable, Color swatch, Opacity (0-100)
  - Blending: same as FG
  - Pixel Effects: same (blue accent)
  - Color Adjustments: same (blue accent)

### Action Buttons
- Keep Original Layer checkbox
- "Apply Combined" (orange raised)
- "Place All Layers" (#4FC3F7 raised)
- "Apply Foreground Only" (orange outlined)
- "Apply Background Only" (#4FC3F7 outlined)
- Cancel (flat)

### Accordion Behavior
- Pre-sep: AI Ops and Pixel Effects are mutually exclusive
- AI sub-sections: all 7 mutually exclusive
- Post-sep FG: all 5 sub-expanders mutually exclusive
- Post-sep BG: all 5 sub-expanders mutually exclusive

### Keyboard Shortcuts (Image Studio)
| Key | Action |
|-----|--------|
| V | Pan tool |
| B | Eraser tool |
| X | Box Delete |
| Y | Box Restore |
| R | Reform Background |
| [ / ] | Brush size -/+ 5 |
| Shift+( / Shift+) | Hardness -/+ 10 |
| Space (hold) | Pan mode |
| 1/2/3/4 | Preview quality 100/75/50/25% |
| +/- or Ctrl++/- | Zoom in/out |
| Ctrl+0 | Original size |
| Ctrl+1..5 | Fit/200/300/400/500% |
| Ctrl+S | Apply Combined |
| Ctrl+F | Apply Foreground |
| Ctrl+B | Apply Background |
| Ctrl+A | Place All Layers |
| Ctrl+Shift+F/B | Reset FG/BG |
| Ctrl+Z/Y | Undo/Redo pixel effects |
| Escape | Deselect tool / close |

### Debounce Timers
| Timer | Interval | Purpose |
|-------|----------|---------|
| Render | 300ms | Post-separation preview |
| Settings save | 500ms | Batch settings writes |
| Pre-effect | 300ms | Pre-separation pixel effects |

---

## 17. Dialog Windows

### TextPropertiesWindow
- **Size**: 520x750, min 440x550, resizable
- **3 tabs** (NavigationRail style):
  - **Basic**: Text content, Font family (fuzzy search), Font Size (6-300, slider+NUD), Bold/Italic/Underline/Strikethrough toggles (30x30), Fill/Stroke color swatches (open FillPicker), Stroke Width (0-20, step 0.1), Alignment (Left/Center/Right/Justify), Line Spacing (-1 to 3, step 0.1), Letter Spacing (-5 to 30, step 0.5), Transform combo (None/UPPERCASE/lowercase/Capitalize), Opacity (0-1, step 0.05), W/H Squeeze (-100 to 100)
  - **Background**: Enable checkbox, Mode (Bounding Box/Per Line/Widest Line), BG Color swatch, Corner Radius TL/TR/BL/BR (0-100), Padding T/B/L/R (-50 to 100, default 10), BG Height (0-200), Line Offset (-100 to 100), Text Cutout + Cutout Opacity (0-1)
  - **Image Fill**: Enable checkbox, Image browse/paste, Stretch combo, Opacity (0-1), Same Parts checkbox, Image X/Y (-500 to 500), Image W/H (10-500, default 100)
- **Live preview**: 150ms debounce
- **Cancel**: restores original

### InstantTextEditorWindow
- **Size**: 450x350, min 320x250, resizable
- Header: toggle sliders, font name, Editor Font Size NUD (8-72)
- Lock status (orange bar, collapsed)
- Slider panel (collapsed): Layer Font Size (6-300), W Squeeze (-100 to 100)
- White TextBox (accepts return, wrapping)
- Footer: status (chars/words) + Cancel/Accept
- **Keyboard**: Ctrl+Enter=Accept, Escape=Cancel
- **Live preview**: 150ms debounce
- Saves window position/size

### ShapeDrawingWindow (Illustrator-like — Separate Window)

A dedicated window for creating complex vector shapes with full illustrator tools. Works like **Adobe Premiere Pro nesting** — shapes are composed in their own environment with multiple internal layers, then sent to the main canvas as a single nested shape layer. Double-click the shape on the main canvas to re-open this window with all internal layers preserved.

- **Size**: 1000x700, min 800x600, resizable, starts maximized
- **Window Layout**:
  - **Left toolbar** (48px): Select, Pen tool, Freehand draw, Predefined shapes dropdown, Path operations (union/subtract/intersect), Eraser, Zoom/Pan
  - **Central canvas**: Drawing area with zoom, pan, rulers, grid overlay, checkerboard background
  - **Right panel** (280px):
    - **Shape Properties**: Fill (solid color, gradient via FillPicker), Stroke (color swatch + width NUD 0-50 + dash pattern), Opacity (0-100% slider)
    - **Predefined Shapes**: Rectangle, RoundedRectangle, Ellipse, Triangle, RightTriangle, Diamond, Parallelogram, Trapezoid, Pentagon, Hexagon, Octagon, Cross, Heart, Star, Star6, Ring, Arrow, ArrowLeft, ArrowUp, ArrowDown, DoubleArrow, ChevronRight, ChevronLeft, Line, DiagonalLine, Snip
    - **Corner Radius** NUD (0-500) for applicable shapes
    - **Path point editor**: Anchor point type (smooth/corner), handle controls
  - **Bottom panel**: Grouping layers list (organizational only — visibility toggle + name + ordering). No blend modes or effects inside.

- **Vector Tools**:
  - **Pen tool**: Click to place anchor points, click-drag for bezier handles, close path
  - **Anchor point manipulation**: Move points, adjust bezier handles, convert smooth↔corner
  - **Freehand draw**: Mouse draw with configurable smoothing
  - **Path operations**: Union, Subtract, Intersect (select 2+ shapes → apply)
  - **Predefined shapes**: Click-drag to place, Shift=constrain aspect ratio

- **Layer System (inside the window)**:
  - Grouping layers for organizing shape parts (organizational only — no blend modes, no effects)
  - Drag-and-drop reordering, visibility toggle, rename
  - **Image reference/trace layers**: Import images as background reference for tracing (locked, adjustable opacity)

- **Nesting Behavior**:
  - "Send to Canvas" button → creates one shape layer on the main canvas
  - On main canvas, behaves as a single layer (one entry in layer panel)
  - Double-click the shape on canvas → re-opens ShapeDrawingWindow with all internal layers preserved
  - Internal composition data stored in the ShapeNode within the .rbl file

- **Bottom action bar**: Send to Canvas (orange, primary), Cancel, Reset
- Saves window position/size

### ColorPickerWindow
- **Size**: 620x480, min 520x400, resizable
- SV gradient square (min 256x256) + Hue bar (24px) + Right controls (190px)
- New/Current color previews
- Eyedropper (Win32 P/Invoke)
- HSB (H:0-360, S:0-100, B:0-100) + RGB (0-255 each) + Hex (#AARRGGBB) + Alpha (0-255)

### FillPickerWindow
- **Size**: 580x700, min 520x600, resizable
- **3 tabs**: Solid Color (same as ColorPicker), Gradient, Image Fill
- **Gradient**: Type (Linear/Radial/Sweep radios), preview (80px), stop bar canvas, stop controls (color, position 0-100, delete, alpha 0-255)
  - Linear: Angle (0-360)
  - Radial: CenterX/Y (0-100, default 50), RadiusX/Y (1-100, default 50)
  - Sweep: CenterX/Y (0-100), Start Angle (0-360)
  - Global Opacity (0-100)
- **Image Fill**: Browse/Paste/Gallery, preview, Stretch combo, Offset X/Y (-2000 to 2000), Scale W/H% (1-500), Opacity (0-100)
- Ctrl+Click stop bar to add stop, right-click to delete

### GalleryWindow
- **Size**: 900x600, min 500x350, resizable
- Toolbar: Folders, Refresh, Collapse, Copy Path, Open Explorer, Download Pack, Thumb Size (60-200)
- 3-column: TreeView (220px) | splitter | WrapPanel thumbnails
- PS Data: X/Y/W/H NUDs (0-9999)
- Context menu: Set as BG, Add as is, Add as PS data, Remove PS, Rename, Delete, Add to Video Frame, Open Location

### BatchProducerWindow
- **Size**: 1350x600, min 1000x400
- Toolbar: Auto Link, Add/Delete Row, Delete Column, Check Error, Load Image Folder, Save/Load CSV, Export All (orange)
- DataGrid with orange bold headers, alternating rows (#1A1A1A / #222)
- Export progress + Cancel

### SettingsWindow
- **Size**: 750x820, no resize
- **5 tabs** (NavigationRail):
  - **General**: 7 path fields, File Association, Auto-Save (10-3600), Undo Disk Limit (1-100GB), Max Undo Steps (5-200), Recent Files (5-100), Max Export List (10-1000)
  - **Canvas**: Grid W/H (5-500), Grid Color/Opacity, Nudge amounts (4 levels), Selection Colors (6), Selection Sizes (8), Brush Cursor color/thickness
  - **Export**: JPG Quality (10-100), Export BG mode, Silent Export options (7 checkboxes), Frame Extraction (count/interval)
  - **AI**: Dynamic model panel, FFmpeg status, GPU info, Force CPU, API Key
  - **Network**: Text Server (IP, Port 1-65535, Alias, AutoConnect), Render Server (IP, Port, AutoConnect)
- Footer: Reset All (red), Cancel, Save (orange)

### LogoRemovalWindow (Scratch Remover)
- **Size**: 900x700, starts maximized, min 600x450
- Brush type (Circle/Block), Select tools (Rect/Circle), Width/Height sliders (3-300)
- Canvas: source image + mask overlay (semi-transparent) + brush cursor
- [ ] resize, Ctrl+Scroll zoom, Space+Drag pan

### DateStampWindow
- **Size**: 480xAuto, max-h=720, no resize
- Preset combo + save/delete
- Language: Bengali/English
- Calendar: Gregorian/Bengali/Hijri
- Date source: Current (+ Live checkbox) / Specific (DatePicker)
- Parts: Day Name, Day, Month, Year, Time (12h/24h)
- Prefix text, Custom Format text
- Day offsets: Bengali/Hijri (-5 to 5)
- Preview area (orange text on #2A2A2A)

### LinkedTextEditorWindow
- **Size**: 550x450, min 400x300, resizable
- LinkVariant icon, Editor Size NUD (8-72)
- Legend panel (per-line toggles with Size/Squeeze sliders)
- RichTextBox (white bg, one paragraph per linked layer)
- 150ms debounce, session lock support

### TransparencyManagerWindow
- **Size**: 380xAuto, no resize
- Profile panel (200px, collapsed): save/load/delete .trn profiles
- Mask Type: None/Linear/Radial
- Linear: per-side fade (Top/Bottom/Left/Right, 0-100)
- Radial: Center X/Y (0-1, step 0.05)
- Per-side gradient stop bars (Ctrl+Click add, right-click delete)
- 150ms debounce

### Other Windows
| Window | Size | Key Features |
|--------|------|-------------|
| SplashWindow | 520x300, borderless | Rounded, gradient bg, orange accent line, "TH" logo, animated dots |
| AboutWindow | 520x620, no resize | App icon, features grid, tech info, developer info, copyright 2026 |
| ProgressWindow | 480xAuto, borderless | Orange accent, icon+label, model name, progress bar, elapsed/ETA, cancel |
| NewDocumentDialog | 460x620, no resize | Built-in presets (grouped), user presets, custom W/H, validation 50-14043 |
| CanvasSizeWindow | 300xAuto, no resize | Width/Height TextBoxes, validation 1-14043 |
| InputDialog | 320x160, no resize | Prompt + input TextBox + OK/Cancel |
| EnhanceSettingsDialog | 380x200, no resize | Blend Strength slider 0-100 (step 5) |
| EraserSettingsWindow | 380xAuto, no resize | Block/Circle type (56x56), Size (1-500), Hardness (0-100, step 5), preview |
| BgStudioBrushSettings | 380xAuto, no resize | Same as Eraser Settings |
| BlurBrushSettings | 380xAuto, no resize | + Blur Radius (1-100), Opacity (1-100, step 5) |
| FramePreviewWindow | fullscreen, borderless | Dark overlay + full-res image, click/key/deactivate to close |
| ImageGalleryDialog | 800x600, resizable | Double-click thumbnails (140x100) to select |
| BgFillFramePickerWindow | 720x460, resizable | Double-click frames (160x90) to select |
| ModernNotificationDialog | 420xAuto, borderless | Icon (Info/Warning/Error/Question/Success), title, message, dynamic buttons |
| TextLinkConfigWindow | 680x520, no resize | 3-column: Available Groups, Add/Remove, Linked Groups + Text Layers |
| DebugWindow | 720x480 | Consolas font, virtualized ListBox, clear/copy, render log toggle |
| ExportListWindow | maximized | DataGrid (SL, Thumbnail, Date, Name, Path), preview panel (250px), CSV export |
| ProjectImportWindow | 420x520, resizable | Layer list with checkboxes, Select All/None/Invert, group cascade |
| FaceBlurWindow | 580x560, resizable | Face list (before/after 80x80), Strength (5-80), Threshold (0-100), Feather (0-50) |

---

## 18. Data Models

### LayerModel
| Property | Type | Default |
|----------|------|---------|
| Id | string | GUID |
| Name | string | "Layer" |
| Type | LayerType | Image |
| X, Y | double | 0 |
| Width, Height | double | 200 |
| Rotation | double | 0 |
| Opacity | double | 1.0 |
| IsVisible | bool | true |
| IsLocked | bool | false |
| BlendMode | BlendMode | Normal |
| FlipHorizontal, FlipVertical | bool | false |
| Padding | double | 0 |
| ImageData | byte[]? | null |
| TextProps | TextProperties? | null |
| ShapeProps | ShapeProperties? | null |
| Effects | LayerEffect | new() |
| ColorAdj | ColorAdjustment | new() |
| CropTop/Bottom/Left/Right | double | 0 |
| ParentGroupId | string? | null |
| ChildIds | List\<string\> | [] |
| IsExpanded | bool | true |
| GroupColor | string? | null |
| IsFrameReceiver | bool | false |
| IsSuperLocked | bool | false |
| BlurMaskData | byte[]? | null |
| BlurRadius | double | 15 |
| IsBackground | bool | false |
| IsLiveDateTime | bool | false |
| AnchorX, AnchorY | double | 0.5 |

### TextProperties
| Property | Type | Default |
|----------|------|---------|
| Text | string | "Text" |
| FontFamily | string | "Arial" |
| FontSize | double | 48 |
| Bold/Italic/Underline/Strikethrough | bool | false |
| FillColor | string | "#FF000000" |
| FillDef | FillDefinition? | null |
| StrokeColor | string | "#00000000" |
| StrokeWidth | double | 0 |
| LineSpacing | double | 1.0 |
| LetterSpacing | double | 0 |
| TextAlignment | TextAlignmentOption | Center |
| TextTransform | TextTransformOption | None |
| HasBackground | bool | false |
| BackgroundColor | string | "#80000000" |
| BackgroundPadding T/B/L/R | double | 10 |
| BackgroundCornerRadius | double | 0 |
| BgMode | TextBgMode | PerLine |
| BgTextCutout | bool | false |
| BgImageFill | bool | false |
| SqueezeWidth, SqueezeHeight | double | 0 |
| Runs | List\<StyledRun\> | [] |

### ShapeProperties
| Property | Type | Default |
|----------|------|---------|
| ShapeType | ShapeType | Rectangle |
| FillColor | string | "#FFFF6600" |
| BorderColor | string | "#FFFFFFFF" |
| BorderWidth | double | 0 |
| CornerRadius | double | 0 |
| IsImageFilled | bool | false |
| ImageFillOffset X/Y | double | 0 |
| ImageFillScale X/Y | double | 1.0 |
| ImageFillRotation | double | 0 |
| ImageFillCrop T/B/L/R | double | 0 |
| MaskType | TransparencyMaskType | None |
| MaskAngle/Top/Bottom/Left/Right | double | 0 |
| MaskCenterX/Y | double | 0.5 |
| Composition | ShapeComposition? | null |

### ShapeComposition (nested vector drawing data — Premiere Pro-like nesting)
The internal composition data for a shape created in the ShapeDrawingWindow. Stored inside the ShapeNode. Double-click on canvas re-opens ShapeDrawingWindow with this data preserved.

| Property | Type | Default |
|----------|------|---------|
| InternalLayers | List\<ShapeInternalLayer\> | [] |
| CanvasWidth | double | 800 |
| CanvasHeight | double | 600 |

### ShapeInternalLayer
| Property | Type | Default |
|----------|------|---------|
| Id | string | GUID |
| Name | string | "Layer 1" |
| Type | ShapeInternalLayerType | VectorPath |
| IsVisible | bool | true |
| Order | int | 0 |
| GroupId | string? | null |
| Paths | List\<VectorPath\> | [] |
| FillDef | FillDefinition? | null |
| StrokeColor | string | "#FF000000" |
| StrokeWidth | double | 1 |
| Opacity | double | 1.0 |
| ReferenceImagePath | string? | null |
| ReferenceImageOpacity | double | 0.5 |

`ShapeInternalLayerType`: `VectorPath`, `PredefinedShape`, `ImageReference`, `Group`

### LayerEffect (21 effect toggles + parameters)
See Section 9 (Effects Expander) for all effect properties with defaults.

### FillDefinition
| Property | Type | Default |
|----------|------|---------|
| Type | FillType | Solid |
| SolidColor | string | "#FF000000" |
| GradientStops | List\<FillGradientStop\> | [{white,0}, {black,1}] |
| GradientAngle | double | 0 |
| GradientCenterX/Y | double | 0.5 |
| GradientRadiusX/Y | double | 0.5 |
| ImageStretch | TextBgStretch | UniformFill |
| ImageOffsetX/Y | double | 0 |
| ImageScaleW/H | double | 100 |
| GlobalAlpha | double | 1.0 |

### ProjectModel
| Property | Type | Default |
|----------|------|---------|
| ProjectId | string | GUID |
| Version | string | "1.0" |
| CanvasWidth | int | 1280 |
| CanvasHeight | int | 720 |
| CanvasBackground | string | "#FF1A1A1A" |
| Layers | List\<LayerModel\> | [] |
| SourceVideoPaths | List\<string\> | [] |
| CreatedAt, ModifiedAt | DateTime | Now |

---

## 19. Enums

### LayerType
`Image`, `Text`, `Shape`, `Group`

### BlendMode (17)
`Normal`, `Multiply`, `Darken`, `ColorBurn`, `Screen`, `Lighten`, `ColorDodge`, `LinearDodge`, `Overlay`, `SoftLight`, `HardLight`, `Difference`, `Exclusion`, `Hue`, `Saturation`, `Color`, `Luminosity`

### ShapeType (27)
`Line`, `DiagonalLine`, `Rectangle`, `RoundedRectangle`, `Snip`, `Ellipse`, `Triangle`, `RightTriangle`, `Diamond`, `Parallelogram`, `Trapezoid`, `Pentagon`, `Hexagon`, `Octagon`, `Cross`, `Heart`, `Star`, `Star6`, `Ring`, `Arrow`, `ArrowLeft`, `ArrowUp`, `ArrowDown`, `DoubleArrow`, `ChevronRight`, `ChevronLeft`, `Custom`

Note: `Custom` is used for shapes created with the pen tool / freehand draw / path operations in the ShapeDrawingWindow. These shapes store their vector path data in a `ShapeComposition` (nested re-editable data, like Premiere Pro nesting).

### FillType
`Solid`, `LinearGradient`, `RadialGradient`, `SweepGradient`, `Image`

### TextAlignmentOption
`Left`, `Center`, `Right`, `Justify`

### TransparencyMaskType
`None`, `Linear`, `Radial`

---

## 20. Canvas Presets

### Social Media (20)
| Name | Width | Height |
|------|-------|--------|
| YouTube Channel Banner | 2560 | 1440 |
| YouTube Thumbnail | 1280 | 720 |
| YouTube Profile Picture | 800 | 800 |
| Facebook Profile Cover | 851 | 315 |
| Facebook Group Cover | 1640 | 856 |
| Facebook Event Cover | 1920 | 1050 |
| Facebook Profile Picture | 170 | 170 |
| TikTok Profile Picture | 200 | 200 |
| TikTok Video Size | 1080 | 1920 |
| Instagram Profile Picture | 320 | 320 |
| Instagram Post (Square) | 1080 | 1080 |
| Instagram Post (Portrait) | 1080 | 1350 |
| Instagram Stories/Reels | 1080 | 1920 |
| X (Twitter) Profile Pic | 400 | 400 |
| X (Twitter) Header Photo | 1500 | 500 |
| LinkedIn Profile Banner | 1584 | 396 |
| LinkedIn Profile Picture | 400 | 400 |
| Twitch Profile Banner | 1200 | 480 |
| Pinterest Board Cover | 600 | 600 |
| Discord Server Banner | 960 | 540 |

### Paper (300 DPI, 9)
| Name | Width | Height |
|------|-------|--------|
| A0 | 9933 | 14043 |
| A1 | 7016 | 9933 |
| A2 | 4961 | 7016 |
| A3 | 3508 | 4961 |
| A4 | 2480 | 3508 |
| A5 | 1748 | 2480 |
| Letter | 2550 | 3300 |
| Legal | 2550 | 4200 |
| Tabloid | 3300 | 5100 |

### Display & Video (6)
| Name | Width | Height |
|------|-------|--------|
| VGA | 640 | 480 |
| HD (720p) | 1280 | 720 |
| Full HD (1080p) | 1920 | 1080 |
| 2K (QHD) | 2560 | 1440 |
| 4K (UHD) | 3840 | 2160 |
| 8K (UHD) | 7680 | 4320 |

---

## 21. Value Converters

| Converter | Input -> Output |
|-----------|----------------|
| BoolToVisibility | bool -> visible/collapsed |
| InverseBoolToVisibility | bool -> collapsed/visible |
| NullToVisibility | object? -> visible if non-null |
| StringToColorBrush | hex string -> SolidColorBrush |
| ByteArrayToImage | byte[] -> BitmapImage |
| FilePathToImage | path -> BitmapImage (160px decode) |
| LayerTypeToIcon | LayerType -> icon name |
| TimespanToString | TimeSpan -> "mm:ss" |
| ActiveToolToBool | tool string -> bool (equality check) |
| EqualityToVisibility | value == param -> visible |
| Percentage | double -> "N%" |
| BoolToLockIcon | bool -> "Lock"/"LockOpenVariant" |
| BoolToVisibilityIcon | bool -> "Eye"/"EyeOff" |
| LayerToThumbnail | LayerModel -> thumbnail bitmap |
| BoolToFrameReceiverBorder | bool -> orange/transparent |
| FilePathToName | path -> filename without extension |
| GroupIndent | parentId -> left margin (18px or 0) |
| LayerTypeToVisibility | Group -> visible, others -> collapsed |
| BoolToExpandIcon | bool -> "ChevronDown"/"ChevronRight" |
| BoolToExtractedBrush | bool -> green #4CAF50 / gray #B0B0B0 |
| EqualityMulti | values[0] == values[1] -> bool |
| ProgressWidth | percent -> width (0-80px) |

---

## 22. ViewModel Commands (70+)

### File
NewProject, OpenProject, SaveProject, SaveProjectAs, SaveCopy, ExportImage, ExportPsd, ExportSvg, ImportImage, ImportVideo, ImportSvg, ImportLayersFromProject

### Edit
Undo (canExecute: undoStack > 0), Redo (canExecute: redoStack > 0), CopyLayer, PasteLayer, DeleteLayer, DuplicateLayer, SelectAll, Deselect

### Layer CRUD
AddText, AddShape (param), AddNewLayer, AddNewGroup, MergeDown, Rasterize, QuickExportLayer, LockLayer, ToggleVisibility

### Arrange
BringToFront, SendToBack, BringForward, SendBackward

### Group
Group (canExecute: 2+ selected), Ungroup (canExecute: selected is Group), ReleaseFromGroup

### Transform
FlipHorizontal, FlipVertical, Rotate90

### Alignment (14 commands)
AlignLeft/Center/Right/Top/Middle/Bottom, DistributeHorizontally/Vertically, DistributeLeft/Right/Top/BottomEdges, MatchWidth/Height/Size

### View
ZoomIn (+0.1), ZoomOut (-0.1), OriginalSize (=1.0), ToggleGrid, SetTool (param), SetCanvasPreset (param)

### AI
RemoveBackground, EnhanceImage, UpscaleRealEsrgan, LogoRemoval, FaceRestore

### Video
RemoveVideo, SelectVideo, RandomizeFrames, PlayFile, OpenFileLocation, ExtractFrameAtTime

---

## 23. AppSettings (160+ properties)

### Key Categories & Notable Defaults
| Category | Properties | Notable Defaults |
|----------|-----------|-----------------|
| Window State | Left/Top/Width/Height/IsMaximized | 100, 100, 1400, 850, false |
| File Paths | DefaultProject/Export/Video/Template/Gallery/Background/Presets/LayoutPresets | Auto-resolved relative paths |
| Auto-Save | AutoSaveIntervalSeconds | 300 |
| Export | LastExportFormat, JpgQuality | "PNG", 95 |
| Canvas | GridSizeX/Y, GridLineColor/Opacity, CanvasQuality | 50, #808080, 15, 100 |
| Video | FrameExtractionInterval/Count, FrameGalleryHeight | 10, 20, 130 |
| AI | BgRemovalThreshold/EdgeSoftness, CartoonizeStrength | 0.3, 0.15, 1.0 |
| Inpainting | MaskDilation, TileOverlap, RefineSharpen | 3, 64, 0.5 |
| UI Panels | RightPanelWidth, VideoBrowserWidth | 310, 250 |
| Nudge | Arrow/Shift/CtrlShift/CtrlShiftAlt | 1, 5, 10, 50 |
| Eraser | Type/Size/Hardness | Circle, 20, 100 |
| Blur Brush | Type/Size/Hardness/Radius/Opacity | Circle, 30, 80, 15, 100 |
| Selection | SelectionColor, FirstSelected, MultiSelected, GroupBox, Marquee | #FF6600, #00FF00, #FF6600, #00BCD4, #0078D7 |
| Handle Sizes | HandleSize, RotationHandleOffset, HandleStroke | 8, 28, 1.5 |
| Text Server | IP/Port/AutoConnect/UserName | 127.0.0.1, 5050, false |
| Render Server | IP/Port/AutoConnect | 127.0.0.1, 5051, false |
| Undo/Redo | SnapshotDiskLimitGB, MaxSnapshotCount | 10.0, 30 |
| Silent Export | Format, NamingMode, various auto-flags | "PNG", 0, all false |
| Date Stamp | Language, Calendar, Parts, Offsets | English, Gregorian, all parts true |
| Image Studio | BrushType/Size/Hardness, PanelWidth, PreviewQuality | Circle, 20, 100, 310, 50 |

### Group Color Palette (8 colors)
`#FF6B6B`, `#4ECDC4`, `#FFD93D`, `#A78BFA`, `#60A5FA`, `#F472B6`, `#A3E635`, `#FBBF24`

---

*Generated from exhaustive analysis of 30+ XAML files, 7 MainWindow partial files (~14,400 lines), 7 Image Studio partial files (~7,660 lines), 6 ViewModel files (~4,650 lines), and all model/helper files. Every control, slider range, default value, icon, keyboard shortcut, and behavioral detail has been captured.*
