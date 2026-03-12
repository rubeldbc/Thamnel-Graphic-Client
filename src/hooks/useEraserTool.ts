import { useState, useCallback, useEffect, useRef } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import type { LayerModel } from '../types/LayerModel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EraserMode = 'soft' | 'hard';
export type EraserBrushShape = 'circle' | 'block';

export interface EraserState {
  mode: EraserMode;
  brushSize: number;
  brushShape: EraserBrushShape;
  hardness: number;
  isAntiErase: boolean;
  isErasing: boolean;
}

export interface EraserToolResult {
  eraserState: EraserState;
  setMode: (mode: EraserMode) => void;
  setBrushSize: (size: number) => void;
  setBrushShape: (shape: EraserBrushShape) => void;
  setHardness: (hardness: number) => void;
  toggleAntiErase: () => void;
  /** Call on mousedown over a target layer. Returns true if erase started. */
  startErase: (layer: LayerModel, canvasX: number, canvasY: number) => boolean;
  /** Call on mousemove during erase. */
  eraseAtPoint: (canvasX: number, canvasY: number) => void;
  /** Call on mouseup. Finalizes the erase and takes an undo snapshot. */
  finishErase: () => void;
  /** Build cursor CSS for the current brush size and zoom. */
  getCursorStyle: (zoom: number) => string;
}

const MIN_BRUSH_SIZE = 1;
const MAX_BRUSH_SIZE = 500;
const DEFAULT_BRUSH_SIZE = 20;
const BRUSH_STEP = 5;
const DEFAULT_HARDNESS = 100;
const INTERPOLATION_STEP = 2; // px between interpolated stroke points

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampSize(size: number): number {
  return Math.max(MIN_BRUSH_SIZE, Math.min(MAX_BRUSH_SIZE, size));
}

function clampHardness(h: number): number {
  return Math.max(0, Math.min(100, h));
}

/** Interpolate points along a line segment for smooth brush strokes. */
function interpolatePoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  step: number,
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < step) {
    points.push({ x: x1, y: y1 });
    return points;
  }

  const steps = Math.ceil(dist / step);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    points.push({ x: x0 + dx * t, y: y0 + dy * t });
  }
  return points;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Eraser tool with full canvas-based erasing logic.
 *
 * - Mode: 'soft' (feathered edge) or 'hard' (sharp edge)
 * - Brush size: 1..500, default 20; adjust with [ ] keys (step 5)
 * - Brush shape: 'circle' or 'block'
 * - Hardness: 0..100, default 100
 * - Anti-erase: activated by right-click or Ctrl; restores erased areas
 * - Erases into a persistent offscreen canvas, saves to layer.imageData on finish.
 */
export function useEraserTool(active: boolean = true): EraserToolResult {
  const [mode, setModeState] = useState<EraserMode>('soft');
  const [brushSize, setBrushSizeState] = useState(DEFAULT_BRUSH_SIZE);
  const [brushShape, setBrushShapeState] = useState<EraserBrushShape>('circle');
  const [hardness, setHardnessState] = useState(DEFAULT_HARDNESS);
  const [isAntiErase, setIsAntiErase] = useState(false);
  const [isErasing, setIsErasing] = useState(false);

  // Persistent canvas for the current erase session
  const eraseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const eraseCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  // Backup of original image for anti-erase restore
  const originalBackupRef = useRef<HTMLCanvasElement | null>(null);
  // Target layer id for current session
  const targetLayerIdRef = useRef<string | null>(null);
  // Last point for interpolation
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const setMode = useCallback((m: EraserMode) => {
    setModeState(m);
  }, []);

  const setBrushSize = useCallback((size: number) => {
    setBrushSizeState(clampSize(size));
  }, []);

  const setBrushShape = useCallback((shape: EraserBrushShape) => {
    setBrushShapeState(shape);
  }, []);

  const setHardness = useCallback((h: number) => {
    setHardnessState(clampHardness(h));
  }, []);

  const toggleAntiErase = useCallback(() => {
    setIsAntiErase((prev) => !prev);
  }, []);

  // ----- startErase -----
  const startErase = useCallback(
    (layer: LayerModel, canvasX: number, canvasY: number): boolean => {
      // Only image layers and shapes with image fill can be erased
      const isImageLayer = layer.type === 'image';
      const isImageFilledShape =
        layer.type === 'shape' && layer.shapeProperties?.isImageFilled === true;
      if (!isImageLayer && !isImageFilledShape) return false;

      // Create persistent erase canvas from layer imageData
      const canvas = document.createElement('canvas');
      canvas.width = layer.width;
      canvas.height = layer.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      // If the layer has existing imageData, draw it
      if (layer.imageData) {
        const img = new Image();
        img.src = layer.imageData;
        if (img.complete) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      }

      // Create backup for anti-erase
      const backup = document.createElement('canvas');
      backup.width = layer.width;
      backup.height = layer.height;
      const backupCtx = backup.getContext('2d');
      if (backupCtx) {
        backupCtx.drawImage(canvas, 0, 0);
      }

      eraseCanvasRef.current = canvas;
      eraseCtxRef.current = ctx;
      originalBackupRef.current = backup;
      targetLayerIdRef.current = layer.id;
      lastPointRef.current = {
        x: canvasX - layer.x,
        y: canvasY - layer.y,
      };

      setIsErasing(true);

      // Apply initial point
      applyBrush(
        ctx,
        canvasX - layer.x,
        canvasY - layer.y,
        brushSize,
        brushShape,
        hardness,
        isAntiErase,
        backup,
      );

      return true;
    },
    [brushSize, brushShape, hardness, isAntiErase],
  );

  // ----- eraseAtPoint -----
  const eraseAtPoint = useCallback(
    (canvasX: number, canvasY: number) => {
      const ctx = eraseCtxRef.current;
      const targetId = targetLayerIdRef.current;
      if (!ctx || !targetId || !isErasing) return;

      const layer = useDocumentStore
        .getState()
        .project.layers.find((l) => l.id === targetId);
      if (!layer) return;

      const localX = canvasX - layer.x;
      const localY = canvasY - layer.y;
      const lastPt = lastPointRef.current;

      if (lastPt) {
        const points = interpolatePoints(
          lastPt.x,
          lastPt.y,
          localX,
          localY,
          INTERPOLATION_STEP,
        );
        for (const pt of points) {
          applyBrush(
            ctx,
            pt.x,
            pt.y,
            brushSize,
            brushShape,
            hardness,
            isAntiErase,
            originalBackupRef.current,
          );
        }
      } else {
        applyBrush(
          ctx,
          localX,
          localY,
          brushSize,
          brushShape,
          hardness,
          isAntiErase,
          originalBackupRef.current,
        );
      }

      lastPointRef.current = { x: localX, y: localY };
    },
    [brushSize, brushShape, hardness, isAntiErase, isErasing],
  );

  // ----- finishErase -----
  const finishErase = useCallback(() => {
    const canvas = eraseCanvasRef.current;
    const targetId = targetLayerIdRef.current;
    if (!canvas || !targetId) {
      setIsErasing(false);
      return;
    }

    // Take undo snapshot before applying changes
    useUndoRedoStore.getState().takeSnapshot();

    // Save canvas to layer imageData
    const dataUrl = canvas.toDataURL('image/png');
    useDocumentStore.getState().updateLayer(targetId, { imageData: dataUrl });

    // Clean up
    eraseCanvasRef.current = null;
    eraseCtxRef.current = null;
    originalBackupRef.current = null;
    targetLayerIdRef.current = null;
    lastPointRef.current = null;
    setIsErasing(false);
  }, []);

  // ----- getCursorStyle -----
  const getCursorStyle = useCallback(
    (zoom: number) => {
      const size = Math.max(2, brushSize * zoom);
      const half = size / 2;
      const svgSize = size + 2;
      const center = svgSize / 2;

      let shape: string;
      if (brushShape === 'circle') {
        shape = `<circle cx="${center}" cy="${center}" r="${half}" fill="none" stroke="white" stroke-width="1"/>`;
      } else {
        shape = `<rect x="1" y="1" width="${size}" height="${size}" fill="none" stroke="white" stroke-width="1"/>`;
      }

      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${svgSize}' height='${svgSize}'>${shape}</svg>`;
      const encoded = encodeURIComponent(svg);
      return `url("data:image/svg+xml,${encoded}") ${Math.round(center)} ${Math.round(center)}, crosshair`;
    },
    [brushSize, brushShape],
  );

  // Keyboard shortcuts for brush-size adjustment
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '[') {
        setBrushSizeState((prev) => clampSize(prev - BRUSH_STEP));
      } else if (e.key === ']') {
        setBrushSizeState((prev) => clampSize(prev + BRUSH_STEP));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return {
    eraserState: { mode, brushSize, brushShape, hardness, isAntiErase, isErasing },
    setMode,
    setBrushSize,
    setBrushShape,
    setHardness,
    toggleAntiErase,
    startErase,
    eraseAtPoint,
    finishErase,
    getCursorStyle,
  };
}

// ---------------------------------------------------------------------------
// Internal brush painting
// ---------------------------------------------------------------------------

function applyBrush(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  shape: EraserBrushShape,
  hardness: number,
  antiErase: boolean,
  backup: HTMLCanvasElement | null,
): void {
  ctx.save();

  if (antiErase && backup) {
    // Anti-erase: restore from backup using source-over
    ctx.globalCompositeOperation = 'source-over';
    // Clip to brush area then draw backup
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    } else {
      ctx.rect(x - size / 2, y - size / 2, size, size);
    }
    ctx.clip();
    ctx.drawImage(backup, 0, 0);
  } else {
    // Erase: use destination-out
    ctx.globalCompositeOperation = 'destination-out';

    if (hardness >= 100) {
      // Hard erase — full opacity
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.beginPath();
      if (shape === 'circle') {
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
    } else {
      // Soft erase — use radial gradient for feathered edge
      if (shape === 'circle') {
        const radius = size / 2;
        const innerRadius = radius * (hardness / 100);
        const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, radius);
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Block brush with softness — use uniform alpha
        const alpha = hardness / 100;
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
    }
  }

  ctx.restore();
}
