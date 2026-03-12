// Re-export all types and factory functions for convenient access.

export type {
  LayerType,
  BlendMode,
  ShapeType,
  FillType,
  TextAlignmentOption,
  TransparencyMaskType,
  TextTransformOption,
  TextBgMode,
  TextBgStretch,
  ImageStretchMode,
  ActiveTool,
  JobStatus,
  JobType,
  ExportFormat,
  CanvasQuality,
  EraserMode,
  ViewMode,
  CartoonStyle,
  InpaintMode,
  AnchorPosition,
  LogLevel,
  ServerStatus,
  PathOperation,
  ShapeCategory,
  DragMode,
} from './enums';

export {
  BLEND_MODES,
  SHAPE_TYPES,
  LAYER_TYPE_ICONS,
  DRAG_MODES,
} from './enums';

export type { GradientStop, FillDefinition } from './FillDefinition';
export { createDefaultFillDefinition } from './FillDefinition';

export type { StyledRun, TextProperties } from './TextProperties';
export { createDefaultTextProperties } from './TextProperties';

export type { ShapeProperties } from './ShapeProperties';
export { createDefaultShapeProperties } from './ShapeProperties';

export type { LayerEffect, ColorAdjustments } from './LayerEffect';
export { createDefaultLayerEffect, createDefaultColorAdjustments } from './LayerEffect';

export type { LayerModel } from './LayerModel';
export {
  createDefaultLayer,
  getEffectiveVisibility,
  getEffectiveLock,
  getEffectiveSuperLock,
  getEffectiveOpacity,
  cloneLayer,
  getUniqueLayerName,
} from './LayerModel';

export type { ProjectMetadata, ProjectModel } from './ProjectModel';
export { createDefaultProject, createDefaultProjectMetadata } from './ProjectModel';
