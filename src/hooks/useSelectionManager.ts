import { useState, useCallback, useMemo } from 'react';
import type { LayerModel } from '../types/LayerModel';
import { getEffectiveVisibility, getEffectiveSuperLock } from '../types/LayerModel';
import { pointInShapePath } from '../engine/shapeRenderer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LayerBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  cropTop?: number;
  cropBottom?: number;
  cropLeft?: number;
  cropRight?: number;
}

export interface SelectionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Handle border color constants. */
export const HANDLE_COLORS = {
  single: '#FF6600',
  firstMulti: '#00FF00',
  additional: '#FF6600',
  group: '#00BCD4',
} as const;

export interface SelectionManagerResult {
  /** Currently selected layer IDs. */
  selectedIds: Set<string>;
  /** The primary (first) selected layer, or null. */
  primarySelectedId: string | null;
  /** Combined bounding rectangle of all selected layers, or null. */
  selectionBounds: SelectionBounds | null;
  /** Select a single layer (replaces current selection). */
  selectLayer: (id: string) => void;
  /** Toggle a layer in/out of the current selection. */
  toggleSelection: (id: string) => void;
  /** Select all layers from a provided list of IDs. */
  selectAll: (allIds: string[]) => void;
  /** Clear the selection entirely. */
  deselectAll: () => void;
  /** Compute and return the bounding rectangle for the given layer bounds. */
  getSelectedBounds: (layerBoundsMap: Map<string, LayerBounds>) => SelectionBounds | null;
  /** Get the handle color for a given layer ID based on selection state. */
  getHandleColor: (id: string) => string;
  /** Check if a layer is selectable (not superLocked, effectively visible, not group). */
  isLayerSelectable: (layer: LayerModel, allLayers: LayerModel[]) => boolean;
  /** Hit-test: find topmost layer at a given point (canvas coords). Checks from top down. */
  hitTestPoint: (
    px: number,
    py: number,
    layers: LayerModel[],
  ) => LayerModel | null;
  /** Hit-test: find ALL selectable layers at a given point, ordered top-to-bottom. */
  hitTestAll: (
    px: number,
    py: number,
    layers: LayerModel[],
  ) => LayerModel[];
  /** Select layers whose bounds are entirely within a marquee rectangle. */
  selectByMarquee: (
    rect: { x: number; y: number; width: number; height: number },
    layers: LayerModel[],
  ) => string[];
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/**
 * Point-in-rotated-rectangle test.
 * Transforms the point into the rectangle's local coordinate system
 * (accounting for rotation around center, flip, and crop) and checks containment.
 */
export function pointInRotatedRect(
  px: number,
  py: number,
  layer: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
    cropTop?: number;
    cropBottom?: number;
    cropLeft?: number;
    cropRight?: number;
    anchorX?: number;
    anchorY?: number;
  },
): boolean {
  const { x, y, width, height } = layer;
  const rotation = layer.rotation ?? 0;

  // Anchor point in world space
  const anchorX = layer.anchorX ?? 0.5;
  const anchorY = layer.anchorY ?? 0.5;
  const cx = x + width * anchorX;
  const cy = y + height * anchorY;

  // Inverse-rotate the test point around the anchor
  const rad = (-rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  const localX = dx * cos - dy * sin + cx;
  const localY = dx * sin + dy * cos + cy;

  // Crop-adjusted bounds
  const cropTop = layer.cropTop ?? 0;
  const cropBottom = layer.cropBottom ?? 0;
  const cropLeft = layer.cropLeft ?? 0;
  const cropRight = layer.cropRight ?? 0;

  const visX = x + width * cropLeft;
  const visY = y + height * cropTop;
  const visW = width * (1 - cropLeft - cropRight);
  const visH = height * (1 - cropTop - cropBottom);

  return (
    localX >= visX &&
    localX <= visX + visW &&
    localY >= visY &&
    localY <= visY + visH
  );
}

/**
 * Get the axis-aligned bounding box of a rotated rectangle.
 */
export function getRotatedAABB(layer: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  anchorX?: number;
  anchorY?: number;
}): { x: number; y: number; width: number; height: number } {
  const { x, y, width, height } = layer;
  const rotation = layer.rotation ?? 0;

  if (rotation === 0) {
    return { x, y, width, height };
  }

  const anchorX = layer.anchorX ?? 0.5;
  const anchorY = layer.anchorY ?? 0.5;
  const cx = x + width * anchorX;
  const cy = y + height * anchorY;

  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Four corners of the unrotated rectangle
  const corners = [
    { x: x, y: y },
    { x: x + width, y: y },
    { x: x + width, y: y + height },
    { x: x, y: y + height },
  ];

  // Rotate each corner around center
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const c of corners) {
    const dx = c.x - cx;
    const dy = c.y - cy;
    const rx = dx * cos - dy * sin + cx;
    const ry = dx * sin + dy * cos + cy;
    minX = Math.min(minX, rx);
    minY = Math.min(minY, ry);
    maxX = Math.max(maxX, rx);
    maxY = Math.max(maxY, ry);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages layer selection state including single-select, multi-select
 * (Shift+click to add, Ctrl+click to toggle), and bounding-box computation.
 */
export function useSelectionManager(): SelectionManagerResult {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const primarySelectedId = useMemo(() => {
    if (selectedIds.size === 0) return null;
    return [...selectedIds][0]!;
  }, [selectedIds]);

  const selectLayer = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((allIds: string[]) => {
    setSelectedIds(new Set(allIds));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const getSelectedBounds = useCallback(
    (layerBoundsMap: Map<string, LayerBounds>): SelectionBounds | null => {
      if (layerBoundsMap.size === 0) return null;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let found = false;

      for (const [, b] of layerBoundsMap) {
        found = true;

        // Use rotated AABB for accurate multi-selection bounds
        const aabb = getRotatedAABB(b);
        minX = Math.min(minX, aabb.x);
        minY = Math.min(minY, aabb.y);
        maxX = Math.max(maxX, aabb.x + aabb.width);
        maxY = Math.max(maxY, aabb.y + aabb.height);
      }

      if (!found) return null;

      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    },
    [],
  );

  const selectionBounds: SelectionBounds | null = null; // Computed on demand via getSelectedBounds

  const getHandleColor = useCallback(
    (id: string): string => {
      if (selectedIds.size <= 1) return HANDLE_COLORS.single;
      const ids = [...selectedIds];
      if (ids[0] === id) return HANDLE_COLORS.firstMulti;
      return HANDLE_COLORS.additional;
    },
    [selectedIds],
  );

  /**
   * Check if a layer is selectable:
   * - Not superLocked (including inherited)
   * - Effectively visible (including inherited)
   * - Not a group layer
   */
  const isLayerSelectable = useCallback(
    (layer: LayerModel, allLayers: LayerModel[]): boolean => {
      if (layer.type === 'group') return false;
      if (getEffectiveSuperLock(layer, allLayers)) return false;
      if (!getEffectiveVisibility(layer, allLayers)) return false;
      return true;
    },
    [],
  );

  /**
   * Hit-test: find the topmost selectable layer at a given point.
   * Convention: index 0 = topmost. Iterate forward; first hit wins.
   */
  const hitTestPoint = useCallback(
    (
      px: number,
      py: number,
      layers: LayerModel[],
    ): LayerModel | null => {
      // Iterate from top layer (index 0) down
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        if (!isLayerSelectable(layer, layers)) continue;

        if (
          pointInRotatedRect(px, py, {
            x: layer.x,
            y: layer.y,
            width: layer.width,
            height: layer.height,
            rotation: layer.rotation,
            flipHorizontal: layer.flipHorizontal,
            flipVertical: layer.flipVertical,
            cropTop: layer.cropTop,
            cropBottom: layer.cropBottom,
            cropLeft: layer.cropLeft,
            cropRight: layer.cropRight,
            anchorX: layer.anchorX,
            anchorY: layer.anchorY,
          })
        ) {
          // For shape layers, do precise shape geometry hit test
          if (layer.type === 'shape' && layer.shapeProperties) {
            // Transform world point to local layer space (undo rotation)
            const anchorX = layer.anchorX ?? 0.5;
            const anchorY = layer.anchorY ?? 0.5;
            const cx = layer.x + layer.width * anchorX;
            const cy = layer.y + layer.height * anchorY;
            const rad = (-(layer.rotation ?? 0) * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const dx = px - cx;
            const dy = py - cy;
            const localX = dx * cos - dy * sin + cx - layer.x;
            const localY = dx * sin + dy * cos + cy - layer.y;

            if (
              !pointInShapePath(
                localX,
                localY,
                layer.width,
                layer.height,
                layer.shapeProperties.shapeType,
                layer.shapeProperties.polygonSides,
                layer.shapeProperties.starInnerRatio,
                layer.shapeProperties.points,
              )
            ) {
              continue; // Click was in bounding box but outside actual shape
            }
          }
          return layer;
        }
      }
      return null;
    },
    [isLayerSelectable],
  );

  /**
   * Hit-test: find ALL selectable layers at a given point, ordered top-to-bottom.
   * Convention: index 0 = topmost, so iterate forward.
   */
  const hitTestAll = useCallback(
    (px: number, py: number, layers: LayerModel[]): LayerModel[] => {
      const hits: LayerModel[] = [];
      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        if (!isLayerSelectable(layer, layers)) continue;
        if (
          pointInRotatedRect(px, py, {
            x: layer.x,
            y: layer.y,
            width: layer.width,
            height: layer.height,
            rotation: layer.rotation,
            flipHorizontal: layer.flipHorizontal,
            flipVertical: layer.flipVertical,
            cropTop: layer.cropTop,
            cropBottom: layer.cropBottom,
            cropLeft: layer.cropLeft,
            cropRight: layer.cropRight,
            anchorX: layer.anchorX,
            anchorY: layer.anchorY,
          })
        ) {
          // Shape-aware hit test
          if (layer.type === 'shape' && layer.shapeProperties) {
            const anchorX = layer.anchorX ?? 0.5;
            const anchorY = layer.anchorY ?? 0.5;
            const cx = layer.x + layer.width * anchorX;
            const cy = layer.y + layer.height * anchorY;
            const rad = (-(layer.rotation ?? 0) * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const dx = px - cx;
            const dy = py - cy;
            const localX = dx * cos - dy * sin + cx - layer.x;
            const localY = dx * sin + dy * cos + cy - layer.y;
            if (
              !pointInShapePath(
                localX, localY, layer.width, layer.height,
                layer.shapeProperties.shapeType, layer.shapeProperties.polygonSides,
                layer.shapeProperties.starInnerRatio, layer.shapeProperties.points,
              )
            ) {
              continue;
            }
          }
          hits.push(layer);
        }
      }
      return hits;
    },
    [isLayerSelectable],
  );

  /**
   * Select all selectable layers whose AABB is entirely within a marquee rectangle.
   */
  const selectByMarquee = useCallback(
    (
      rect: { x: number; y: number; width: number; height: number },
      layers: LayerModel[],
    ) => {
      const rLeft = Math.min(rect.x, rect.x + rect.width);
      const rRight = Math.max(rect.x, rect.x + rect.width);
      const rTop = Math.min(rect.y, rect.y + rect.height);
      const rBottom = Math.max(rect.y, rect.y + rect.height);

      const ids: string[] = [];
      for (const layer of layers) {
        if (!isLayerSelectable(layer, layers)) continue;

        const aabb = getRotatedAABB(layer);
        const lLeft = aabb.x;
        const lRight = aabb.x + aabb.width;
        const lTop = aabb.y;
        const lBottom = aabb.y + aabb.height;

        // Select if marquee intersects (touches) the layer bounds
        if (
          lLeft <= rRight &&
          lRight >= rLeft &&
          lTop <= rBottom &&
          lBottom >= rTop
        ) {
          ids.push(layer.id);
        }
      }
      setSelectedIds(new Set(ids));
      return ids;
    },
    [isLayerSelectable],
  );

  return {
    selectedIds,
    primarySelectedId,
    selectionBounds,
    selectLayer,
    toggleSelection,
    selectAll,
    deselectAll,
    getSelectedBounds,
    getHandleColor,
    isLayerSelectable,
    hitTestPoint,
    hitTestAll,
    selectByMarquee,
  };
}
