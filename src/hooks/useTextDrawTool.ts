import { useState, useCallback, useRef } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import { useUiStore } from '../stores/uiStore';
import { createDefaultLayer, getUniqueLayerName } from '../types/LayerModel';
import { createDefaultTextProperties } from '../types/TextProperties';
import type { LayerModel } from '../types/LayerModel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TextDrawPreview {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextDrawState {
  isDrawing: boolean;
  preview: TextDrawPreview | null;
}

export interface TextDrawToolResult {
  textDrawState: TextDrawState;
  /** Call on mousedown to record start position. */
  startDraw: (canvasX: number, canvasY: number) => void;
  /** Call on mousemove to update preview rectangle. */
  updateDraw: (canvasX: number, canvasY: number) => void;
  /** Call on mouseup. Creates a text layer if large enough. Returns the new layer or null. */
  finishDraw: () => LayerModel | null;
  /** Cancel drawing without creating a layer. */
  cancelDraw: () => void;
}

const MIN_TEXT_WIDTH = 20;
const MIN_TEXT_HEIGHT = 10;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Text drawing tool.
 *
 * - Activation: T key sets activeTool to 'text'
 * - Mouse Down: record start position
 * - Mouse Move: update preview rectangle
 * - Mouse Up: if w > 20 && h > 10, create text layer and start inline text edit
 * - Auto-switch to 'select' tool after creation
 */
export function useTextDrawTool(): TextDrawToolResult {
  const [isDrawing, setIsDrawing] = useState(false);
  const [preview, setPreview] = useState<TextDrawPreview | null>(null);

  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  // ----- startDraw -----
  const startDraw = useCallback((canvasX: number, canvasY: number) => {
    startPosRef.current = { x: canvasX, y: canvasY };
    setIsDrawing(true);
    setPreview({ x: canvasX, y: canvasY, width: 0, height: 0 });
  }, []);

  // ----- updateDraw -----
  const updateDraw = useCallback(
    (canvasX: number, canvasY: number) => {
      const start = startPosRef.current;
      if (!start || !isDrawing) return;

      const w = canvasX - start.x;
      const h = canvasY - start.y;

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
    if (p.width < MIN_TEXT_WIDTH || p.height < MIN_TEXT_HEIGHT) {
      return null;
    }

    // Take undo snapshot
    useUndoRedoStore.getState().takeSnapshot();

    // Create text layer
    const existingLayers = useDocumentStore.getState().project.layers;
    const name = getUniqueLayerName('Text', existingLayers);

    const textProperties = createDefaultTextProperties();
    textProperties.text = '';

    const newLayer = createDefaultLayer({
      type: 'text',
      name,
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
      textProperties,
    });

    useDocumentStore.getState().addLayer(newLayer);
    useDocumentStore.getState().selectLayer(newLayer.id);

    // Start inline text editing
    useUiStore.getState().setEditingText(true);

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
    textDrawState: { isDrawing, preview },
    startDraw,
    updateDraw,
    finishDraw,
    cancelDraw,
  };
}
