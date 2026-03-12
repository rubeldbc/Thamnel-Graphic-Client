// Shared enums, union types, and helper arrays used across the data models.

import {
  mdiImage,
  mdiFormatText,
  mdiShapeOutline,
  mdiFolderOutline,
} from '@mdi/js';

// ---------------------------------------------------------------------------
// 1. LayerType
// ---------------------------------------------------------------------------
export type LayerType = 'image' | 'text' | 'shape' | 'group';

// ---------------------------------------------------------------------------
// 2. BlendMode (17 modes)
// ---------------------------------------------------------------------------
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'darken'
  | 'colorBurn'
  | 'screen'
  | 'lighten'
  | 'colorDodge'
  | 'linearDodge'
  | 'overlay'
  | 'softLight'
  | 'hardLight'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

// ---------------------------------------------------------------------------
// 3. ShapeType (27 shapes)
// ---------------------------------------------------------------------------
export type ShapeType =
  | 'line'
  | 'diagonalLine'
  | 'rectangle'
  | 'roundedRectangle'
  | 'snip'
  | 'ellipse'
  | 'triangle'
  | 'rightTriangle'
  | 'diamond'
  | 'parallelogram'
  | 'trapezoid'
  | 'pentagon'
  | 'hexagon'
  | 'octagon'
  | 'cross'
  | 'heart'
  | 'star'
  | 'star6'
  | 'ring'
  | 'arrow'
  | 'arrowLeft'
  | 'arrowUp'
  | 'arrowDown'
  | 'doubleArrow'
  | 'chevronRight'
  | 'chevronLeft'
  | 'polygon'
  | 'custom';

// ---------------------------------------------------------------------------
// 4. FillType
// ---------------------------------------------------------------------------
export type FillType = 'solid' | 'linearGradient' | 'radialGradient' | 'sweepGradient' | 'image';

// ---------------------------------------------------------------------------
// 5. TextAlignmentOption
// ---------------------------------------------------------------------------
export type TextAlignmentOption = 'left' | 'center' | 'right' | 'justify';

// ---------------------------------------------------------------------------
// 6. TransparencyMaskType
// ---------------------------------------------------------------------------
export type TransparencyMaskType = 'none' | 'linear' | 'radial';

// ---------------------------------------------------------------------------
// 7. TextTransformOption
// ---------------------------------------------------------------------------
export type TextTransformOption = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

// ---------------------------------------------------------------------------
// 8. TextBgMode
// ---------------------------------------------------------------------------
export type TextBgMode = 'none' | 'solid' | 'rounded' | 'boundingBox' | 'perLine' | 'widestLine';

// ---------------------------------------------------------------------------
// 9. TextBgStretch
// ---------------------------------------------------------------------------
export type TextBgStretch = 'perLine' | 'fullBlock';

// ---------------------------------------------------------------------------
// 10. ImageStretchMode
// ---------------------------------------------------------------------------
export type ImageStretchMode = 'tile' | 'stretch' | 'fit' | 'fill';

// ---------------------------------------------------------------------------
// 11. ActiveTool
// ---------------------------------------------------------------------------
export type ActiveTool = 'select' | 'text' | 'shape' | 'eraser' | 'blurBrush' | 'pan' | 'eyedropper';

// ---------------------------------------------------------------------------
// 12. JobStatus
// ---------------------------------------------------------------------------
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// ---------------------------------------------------------------------------
// 13. JobType
// ---------------------------------------------------------------------------
export type JobType = 'aiInference' | 'export' | 'render' | 'frameExtraction' | 'batch';

// ---------------------------------------------------------------------------
// 14. ExportFormat
// ---------------------------------------------------------------------------
export type ExportFormat = 'png' | 'jpg' | 'bmp' | 'psd' | 'svg';

// ---------------------------------------------------------------------------
// 15. CanvasQuality
// ---------------------------------------------------------------------------
export type CanvasQuality = 10 | 25 | 50 | 75 | 100;

// ---------------------------------------------------------------------------
// 16. EraserMode
// ---------------------------------------------------------------------------
export type EraserMode = 'soft' | 'hard';

// ---------------------------------------------------------------------------
// 17. ViewMode
// ---------------------------------------------------------------------------
export type ViewMode = 'combined' | 'foreground' | 'background';

// ---------------------------------------------------------------------------
// 18. CartoonStyle
// ---------------------------------------------------------------------------
export type CartoonStyle = 'classic' | 'anime' | 'sketch';

// ---------------------------------------------------------------------------
// 19. InpaintMode
// ---------------------------------------------------------------------------
export type InpaintMode = 'inpaint' | 'outpaint';

// ---------------------------------------------------------------------------
// 20. AnchorPosition
// ---------------------------------------------------------------------------
export type AnchorPosition =
  | 'topLeft'
  | 'topCenter'
  | 'topRight'
  | 'middleLeft'
  | 'middleCenter'
  | 'middleRight'
  | 'bottomLeft'
  | 'bottomCenter'
  | 'bottomRight';

// ---------------------------------------------------------------------------
// 21. LogLevel
// ---------------------------------------------------------------------------
export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

// ---------------------------------------------------------------------------
// 22. ServerStatus
// ---------------------------------------------------------------------------
export type ServerStatus = 'connected' | 'disconnected' | 'connecting';

// ---------------------------------------------------------------------------
// 23. PathOperation
// ---------------------------------------------------------------------------
export type PathOperation = 'union' | 'subtract' | 'intersect' | 'exclude';

// ---------------------------------------------------------------------------
// 24. DragMode
// ---------------------------------------------------------------------------
export type DragMode =
  | 'none'
  | 'move'
  | 'resize'
  | 'rotate'
  | 'crop'
  | 'fillMove'
  | 'fillResize'
  | 'fillRotate'
  | 'erase'
  | 'blurBrush'
  | 'multiResize'
  | 'multiRotate'
  | 'marqueeSelect'
  | 'drawShape'
  | 'drawText'
  | 'anchorMove';

// ---------------------------------------------------------------------------
// DragMode values array for iteration
// ---------------------------------------------------------------------------
export const DRAG_MODES: DragMode[] = [
  'none',
  'move',
  'resize',
  'rotate',
  'crop',
  'fillMove',
  'fillResize',
  'fillRotate',
  'erase',
  'blurBrush',
  'multiResize',
  'multiRotate',
  'marqueeSelect',
  'drawShape',
  'drawText',
  'anchorMove',
];

// ===========================================================================
// Helper arrays for iteration / display
// ===========================================================================

// ---------------------------------------------------------------------------
// BLEND_MODES – array of {value, label} for all 17 blend modes
// ---------------------------------------------------------------------------
export const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'darken', label: 'Darken' },
  { value: 'colorBurn', label: 'Color Burn' },
  { value: 'screen', label: 'Screen' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'colorDodge', label: 'Color Dodge' },
  { value: 'linearDodge', label: 'Linear Dodge' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'softLight', label: 'Soft Light' },
  { value: 'hardLight', label: 'Hard Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
  { value: 'hue', label: 'Hue' },
  { value: 'saturation', label: 'Saturation' },
  { value: 'color', label: 'Color' },
  { value: 'luminosity', label: 'Luminosity' },
];

// ---------------------------------------------------------------------------
// SHAPE_TYPES – array of {value, label, category} for all 27 shapes
// ---------------------------------------------------------------------------
export type ShapeCategory = 'lines' | 'basic' | 'polygons' | 'symbols' | 'arrows' | 'custom';

export const SHAPE_TYPES: { value: ShapeType; label: string; category: ShapeCategory }[] = [
  // Lines
  { value: 'line', label: 'Line', category: 'lines' },
  { value: 'diagonalLine', label: 'Diagonal Line', category: 'lines' },
  // Basic
  { value: 'rectangle', label: 'Rectangle', category: 'basic' },
  { value: 'roundedRectangle', label: 'Rounded Rectangle', category: 'basic' },
  { value: 'snip', label: 'Snip', category: 'basic' },
  { value: 'ellipse', label: 'Ellipse', category: 'basic' },
  { value: 'triangle', label: 'Triangle', category: 'basic' },
  { value: 'rightTriangle', label: 'Right Triangle', category: 'basic' },
  { value: 'diamond', label: 'Diamond', category: 'basic' },
  { value: 'parallelogram', label: 'Parallelogram', category: 'basic' },
  { value: 'trapezoid', label: 'Trapezoid', category: 'basic' },
  // Polygons
  { value: 'pentagon', label: 'Pentagon', category: 'polygons' },
  { value: 'hexagon', label: 'Hexagon', category: 'polygons' },
  { value: 'octagon', label: 'Octagon', category: 'polygons' },
  // Symbols
  { value: 'cross', label: 'Cross', category: 'symbols' },
  { value: 'heart', label: 'Heart', category: 'symbols' },
  { value: 'star', label: 'Star', category: 'symbols' },
  { value: 'star6', label: '6-Point Star', category: 'symbols' },
  { value: 'ring', label: 'Ring', category: 'symbols' },
  // Arrows
  { value: 'arrow', label: 'Arrow Right', category: 'arrows' },
  { value: 'arrowLeft', label: 'Arrow Left', category: 'arrows' },
  { value: 'arrowUp', label: 'Arrow Up', category: 'arrows' },
  { value: 'arrowDown', label: 'Arrow Down', category: 'arrows' },
  { value: 'doubleArrow', label: 'Double Arrow', category: 'arrows' },
  { value: 'chevronRight', label: 'Chevron Right', category: 'arrows' },
  { value: 'chevronLeft', label: 'Chevron Left', category: 'arrows' },
  // Custom
  { value: 'custom', label: 'Custom', category: 'custom' },
];

// ---------------------------------------------------------------------------
// LAYER_TYPE_ICONS – Record<LayerType, string> mapping to @mdi/js icon paths
// ---------------------------------------------------------------------------
export const LAYER_TYPE_ICONS: Record<LayerType, string> = {
  image: mdiImage,
  text: mdiFormatText,
  shape: mdiShapeOutline,
  group: mdiFolderOutline,
};
