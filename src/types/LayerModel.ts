import type { LayerType, BlendMode } from './enums';
import type { TextProperties } from './TextProperties';
import type { ShapeProperties } from './ShapeProperties';
import type { LayerEffect, ColorAdjustments } from './LayerEffect';
import { createDefaultLayerEffect, createDefaultColorAdjustments } from './LayerEffect';

export interface LayerModel {
  id: string;
  name: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  /** 0 to 1 */
  opacity: number;
  visible: boolean;
  locked: boolean;
  superLocked: boolean;
  blendMode: BlendMode;
  flipHorizontal: boolean;
  flipVertical: boolean;
  padding: number;
  imageData: string | null;
  thumbnailData: string | null;
  textProperties: TextProperties | null;
  shapeProperties: ShapeProperties | null;
  effects: LayerEffect;
  colorAdjustments: ColorAdjustments;
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  parentGroupId: string | null;
  groupColor: string | null;
  depth: number;
  isFrameReceiver: boolean;
  isExpanded: boolean;
  blurMaskData: Uint8Array | null;
  anchorX: number;
  anchorY: number;
  bindingKey: string;
  displayName: string;
  childIds: string[];
  blurRadius: number;
  isBackground: boolean;
  isLiveDateTime: boolean;
  renderVersion: number;
}

function generateId(): string {
  return crypto.randomUUID();
}

export function createDefaultLayer(overrides?: Partial<LayerModel>): LayerModel {
  const id = overrides?.id ?? generateId();
  return {
    id,
    name: 'New Layer',
    type: 'image',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    superLocked: false,
    blendMode: 'normal',
    flipHorizontal: false,
    flipVertical: false,
    padding: 0,
    imageData: null,
    thumbnailData: null,
    textProperties: null,
    shapeProperties: null,
    effects: createDefaultLayerEffect(),
    colorAdjustments: createDefaultColorAdjustments(),
    cropTop: 0,
    cropBottom: 0,
    cropLeft: 0,
    cropRight: 0,
    parentGroupId: null,
    groupColor: null,
    depth: 0,
    isFrameReceiver: false,
    isExpanded: false,
    blurMaskData: null,
    anchorX: 0.5,
    anchorY: 0.5,
    bindingKey: '',
    displayName: '',
    childIds: [],
    blurRadius: 15,
    isBackground: false,
    isLiveDateTime: false,
    renderVersion: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Computed utility functions
// ---------------------------------------------------------------------------

/**
 * Walk the parent chain; returns true only if every ancestor (and the layer
 * itself) has `visible === true`.
 */
export function getEffectiveVisibility(
  layer: LayerModel,
  allLayers: LayerModel[],
): boolean {
  if (!layer.visible) return false;
  if (layer.parentGroupId === null) return true;
  const parent = allLayers.find((l) => l.id === layer.parentGroupId);
  if (!parent) return true;
  return getEffectiveVisibility(parent, allLayers);
}

/**
 * Returns true if the layer itself OR any ancestor is locked.
 */
export function getEffectiveLock(
  layer: LayerModel,
  allLayers: LayerModel[],
): boolean {
  if (layer.locked) return true;
  if (layer.parentGroupId === null) return false;
  const parent = allLayers.find((l) => l.id === layer.parentGroupId);
  if (!parent) return false;
  return getEffectiveLock(parent, allLayers);
}

/**
 * Returns true if the layer itself OR any ancestor is superLocked.
 */
export function getEffectiveSuperLock(
  layer: LayerModel,
  allLayers: LayerModel[],
): boolean {
  if (layer.superLocked) return true;
  if (layer.parentGroupId === null) return false;
  const parent = allLayers.find((l) => l.id === layer.parentGroupId);
  if (!parent) return false;
  return getEffectiveSuperLock(parent, allLayers);
}

/**
 * Multiply opacity down the parent chain to get the effective rendered opacity.
 */
export function getEffectiveOpacity(
  layer: LayerModel,
  allLayers: LayerModel[],
): number {
  if (layer.parentGroupId === null) return layer.opacity;
  const parent = allLayers.find((l) => l.id === layer.parentGroupId);
  if (!parent) return layer.opacity;
  return layer.opacity * getEffectiveOpacity(parent, allLayers);
}

/**
 * Deep-clone a layer, assigning a brand-new id.
 */
export function cloneLayer(layer: LayerModel): LayerModel {
  const clone: LayerModel = {
    ...layer,
    id: generateId(),
    childIds: [...layer.childIds],
    effects: { ...layer.effects },
    colorAdjustments: { ...layer.colorAdjustments },
    textProperties: layer.textProperties
      ? { ...layer.textProperties, fill: { ...layer.textProperties.fill, gradientStops: layer.textProperties.fill.gradientStops.map((s) => ({ ...s })) }, runs: layer.textProperties.runs.map((r) => ({ ...r })) }
      : null,
    shapeProperties: layer.shapeProperties
      ? { ...layer.shapeProperties, fill: layer.shapeProperties.fill ? { ...layer.shapeProperties.fill, gradientStops: layer.shapeProperties.fill.gradientStops.map((s) => ({ ...s })) } : null, points: layer.shapeProperties.points.map((p) => ({ ...p })) }
      : null,
    blurMaskData: layer.blurMaskData ? new Uint8Array(layer.blurMaskData) : null,
  };
  return clone;
}

/**
 * Generate a unique layer name by appending a two-digit sequential number.
 * E.g. "Text 01", "Text 02", etc.
 */
export function getUniqueLayerName(
  baseName: string,
  existingLayers: LayerModel[],
): string {
  const existingNames = new Set(existingLayers.map((l) => l.name));
  let index = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = `${baseName} ${String(index).padStart(2, '0')}`;
    if (!existingNames.has(candidate)) return candidate;
    index += 1;
  }
}
