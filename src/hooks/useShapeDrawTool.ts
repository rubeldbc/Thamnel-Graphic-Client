import { useState, useCallback, useRef } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import { useUiStore } from '../stores/uiStore';
import { createDefaultLayer, getUniqueLayerName } from '../types/LayerModel';
import { createDefaultShapeProperties } from '../types/ShapeProperties';
import type { LayerModel } from '../types/LayerModel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShapeDrawPreview {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShapeDrawState {
  isDrawing: boolean;
  preview: ShapeDrawPreview | null;
}

export interface ShapeDrawToolResult {
  shapeDrawState: ShapeDrawState;
  /** Call on mousedown to record start position. */
  startDraw: (canvasX: number, canvasY: number) => void;
  /** Call on mousemove to update preview rectangle. Shift constrains to square. */
  updateDraw: (canvasX: number, canvasY: number, shiftKey: boolean) => void;
  /** Call on mouseup. Creates a shape layer if large enough. Returns the new layer or null. */
  finishDraw: () => LayerModel | null;
  /** Cancel drawing without creating a layer. */
  cancelDraw: () => void;
}

const MIN_SHAPE_WIDTH = 5;
const MIN_SHAPE_HEIGHT = 5;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Shape drawing tool.
 *
 * - Activation: R key sets activeTool to 'shape'
 * - Mouse Down: record start position
 * - Mouse Move: update preview rectangle, Shift = square constraint
 * - Mouse Up: if w > 5 && h > 5, create shape layer
 * - Auto-switch to 'select' tool after creation
 */
export function useShapeDrawTool(): ShapeDrawToolResult {
  const [isDrawing, setIsDrawing] = useState(false);
  const [preview, setPreview] = useState<ShapeDrawPreview | null>(null);

  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  // ----- startDraw -----
  const startDraw = useCallback((canvasX: number, canvasY: number) => {
    startPosRef.current = { x: canvasX, y: canvasY };
    setIsDrawing(true);
    setPreview({ x: canvasX, y: canvasY, width: 0, height: 0 });
  }, []);

  // ----- updateDraw -----
  const updateDraw = useCallback(
    (canvasX: number, canvasY: number, shiftKey: boolean) => {
      const start = startPosRef.current;
      if (!start || !isDrawing) return;

      let w = canvasX - start.x;
      let h = canvasY - start.y;

      // Shift constrains to square
      if (shiftKey) {
        const maxDim = Math.max(Math.abs(w), Math.abs(h));
        w = Math.sign(w) * maxDim;
        h = Math.sign(h) * maxDim;
      }

      // Normalize negative dimensions
      const x = w >= 0 ? start.x : start.x + w;
      const y = h >= 0 ? start.y : start.y + h;
      const absW = Math.abs(w);
      const absH = Math.abs(h);

      setPreview({ x, y, width: absW, height: absH });
    },
    [isDrawing],
  );

  // ----- finishDraw -----
  const finishDraw = useCallback((): LayerModel | null => {
    const p = preview;
    if (!p || !isDrawing) {
      setIsDrawing(false);
      setPreview(null);
      startPosRef.current = null;
      return null;
    }

    setIsDrawing(false);
    setPreview(null);
    startPosRef.current = null;

    // Check minimum dimensions
    if (p.width < MIN_SHAPE_WIDTH || p.height < MIN_SHAPE_HEIGHT) {
      return null;
    }

    // Take undo snapshot
    useUndoRedoStore.getState().takeSnapshot();

    // Create shape layer
    const existingLayers = useDocumentStore.getState().project.layers;
    const name = getUniqueLayerName('Shape', existingLayers);

    const newLayer = createDefaultLayer({
      type: 'shape',
      name,
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
      shapeProperties: createDefaultShapeProperties(),
    });

    useDocumentStore.getState().addLayer(newLayer);
    useDocumentStore.getState().selectLayer(newLayer.id);

    // Auto-switch to select tool
    useUiStore.getState().setActiveTool('select');

    return newLayer;
  }, [preview, isDrawing]);

  // ----- cancelDraw -----
  const cancelDraw = useCallback(() => {
    setIsDrawing(false);
    setPreview(null);
    startPosRef.current = null;
  }, []);

  return {
    shapeDrawState: { isDrawing, preview },
    startDraw,
    updateDraw,
    finishDraw,
    cancelDraw,
  };
}
