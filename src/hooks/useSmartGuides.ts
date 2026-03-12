import { useState, useCallback, useMemo } from 'react';
import type { LayerModel } from '../types/LayerModel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GuideOrientation = 'horizontal' | 'vertical';

export interface SmartGuide {
  orientation: GuideOrientation;
  /** Position in canvas coordinates (x for vertical, y for horizontal). */
  position: number;
  color: string;
  /** Dash pattern for the guide line. */
  dash?: string;
  /** Thickness of the guide line. */
  thickness?: number;
}

export interface SnapTarget {
  orientation: GuideOrientation;
  position: number;
  /** Label for debugging (e.g. "canvas-center", "layer-3-left"). */
  label?: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface SmartGuidesResult {
  /** Guides currently being displayed (snapped to). */
  activeGuides: SmartGuide[];
  /** Snap a given position to the nearest guides within threshold. */
  snapPosition: (pos: Position, objectWidth?: number, objectHeight?: number) => Position;
  /** Update the set of snap targets (call when layers or canvas change). */
  setSnapTargets: (targets: SnapTarget[]) => void;
  /** Clear active guides. */
  clearGuides: () => void;
  /** Build snap targets from layers (excluding the specified layer IDs). */
  buildLayerTargets: (layers: LayerModel[], excludeIds?: string[]) => SnapTarget[];
}

const SNAP_THRESHOLD = 5;
const GUIDE_COLOR = '#FF00FF'; // magenta (255, 0, 255)
const GUIDE_THICKNESS = 0.5;
const GUIDE_DASH = '2,2';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Smart-guide snap logic for canvas edges, canvas center, layer edges/centers,
 * and marker guides. Guides appear as magenta lines when within threshold.
 */
export function useSmartGuides(
  canvasWidth: number = 1920,
  canvasHeight: number = 1080,
): SmartGuidesResult {
  const [customTargets, setCustomTargets] = useState<SnapTarget[]>([]);
  const [activeGuides, setActiveGuides] = useState<SmartGuide[]>([]);

  // Built-in canvas snap targets
  const canvasTargets = useMemo<SnapTarget[]>(
    () => [
      { orientation: 'vertical', position: 0, label: 'canvas-left' },
      { orientation: 'vertical', position: canvasWidth / 2, label: 'canvas-center-x' },
      { orientation: 'vertical', position: canvasWidth, label: 'canvas-right' },
      { orientation: 'horizontal', position: 0, label: 'canvas-top' },
      { orientation: 'horizontal', position: canvasHeight / 2, label: 'canvas-center-y' },
      { orientation: 'horizontal', position: canvasHeight, label: 'canvas-bottom' },
    ],
    [canvasWidth, canvasHeight],
  );

  const allTargets = useMemo(
    () => [...canvasTargets, ...customTargets],
    [canvasTargets, customTargets],
  );

  const setSnapTargets = useCallback((targets: SnapTarget[]) => {
    setCustomTargets(targets);
  }, []);

  const clearGuides = useCallback(() => {
    setActiveGuides([]);
  }, []);

  /**
   * Build snap targets from layers — edges (left, right, top, bottom) and centers.
   * Optionally exclude certain layer IDs (e.g., the layer being moved).
   */
  const buildLayerTargets = useCallback(
    (layers: LayerModel[], excludeIds: string[] = []): SnapTarget[] => {
      const targets: SnapTarget[] = [];
      const excludeSet = new Set(excludeIds);

      for (const layer of layers) {
        if (excludeSet.has(layer.id)) continue;
        if (!layer.visible) continue;
        if (layer.type === 'group') continue;

        const left = layer.x;
        const right = layer.x + layer.width;
        const top = layer.y;
        const bottom = layer.y + layer.height;
        const centerX = layer.x + layer.width / 2;
        const centerY = layer.y + layer.height / 2;

        targets.push(
          { orientation: 'vertical', position: left, label: `${layer.id}-left` },
          { orientation: 'vertical', position: right, label: `${layer.id}-right` },
          { orientation: 'vertical', position: centerX, label: `${layer.id}-center-x` },
          { orientation: 'horizontal', position: top, label: `${layer.id}-top` },
          { orientation: 'horizontal', position: bottom, label: `${layer.id}-bottom` },
          { orientation: 'horizontal', position: centerY, label: `${layer.id}-center-y` },
        );
      }

      return targets;
    },
    [],
  );

  const snapPosition = useCallback(
    (pos: Position, objectWidth: number = 0, objectHeight: number = 0): Position => {
      const newGuides: SmartGuide[] = [];
      let snappedX = pos.x;
      let snappedY = pos.y;

      // Edges and center of the dragged object
      const xEdges = [pos.x, pos.x + objectWidth / 2, pos.x + objectWidth];
      const yEdges = [pos.y, pos.y + objectHeight / 2, pos.y + objectHeight];

      let bestDx = SNAP_THRESHOLD + 1;
      let bestDy = SNAP_THRESHOLD + 1;

      for (const target of allTargets) {
        if (target.orientation === 'vertical') {
          for (let i = 0; i < xEdges.length; i++) {
            const edge = xEdges[i]!;
            const dist = Math.abs(edge - target.position);
            if (dist <= SNAP_THRESHOLD && dist < bestDx) {
              bestDx = dist;
              // Adjust position so this edge aligns with the target
              snappedX = pos.x + (target.position - edge);
            }
          }
        } else {
          for (let i = 0; i < yEdges.length; i++) {
            const edge = yEdges[i]!;
            const dist = Math.abs(edge - target.position);
            if (dist <= SNAP_THRESHOLD && dist < bestDy) {
              bestDy = dist;
              snappedY = pos.y + (target.position - edge);
            }
          }
        }
      }

      // Collect matching guides for the snapped position
      const finalXEdges = [snappedX, snappedX + objectWidth / 2, snappedX + objectWidth];
      const finalYEdges = [snappedY, snappedY + objectHeight / 2, snappedY + objectHeight];

      for (const target of allTargets) {
        if (target.orientation === 'vertical') {
          for (const edge of finalXEdges) {
            if (Math.abs(edge - target.position) < 0.5) {
              newGuides.push({
                orientation: 'vertical',
                position: target.position,
                color: GUIDE_COLOR,
                thickness: GUIDE_THICKNESS,
                dash: GUIDE_DASH,
              });
              break;
            }
          }
        } else {
          for (const edge of finalYEdges) {
            if (Math.abs(edge - target.position) < 0.5) {
              newGuides.push({
                orientation: 'horizontal',
                position: target.position,
                color: GUIDE_COLOR,
                thickness: GUIDE_THICKNESS,
                dash: GUIDE_DASH,
              });
              break;
            }
          }
        }
      }

      setActiveGuides(newGuides);
      return { x: snappedX, y: snappedY };
    },
    [allTargets],
  );

  return {
    activeGuides,
    snapPosition,
    setSnapTargets,
    clearGuides,
    buildLayerTargets,
  };
}
