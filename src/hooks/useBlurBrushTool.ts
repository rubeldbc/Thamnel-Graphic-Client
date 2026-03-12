import { useState, useCallback, useRef } from 'react';
import { useDocumentStore } from '../stores/documentStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import type { LayerModel } from '../types/LayerModel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlurBrushState {
  brushSize: number;
  intensity: number;
  isAntiBlur: boolean;
  isPainting: boolean;
}

export interface BlurBrushToolResult {
  blurState: BlurBrushState;
  setBrushSize: (size: number) => void;
  setIntensity: (intensity: number) => void;
  toggleAntiBlur: () => void;
  /** Throttled paint callback (30fps). Pass canvas coordinates. */
  paint: (x: number, y: number) => void;
  /** Start a blur paint session on a target layer. */
  startPaint: (layer: LayerModel, canvasX: number, canvasY: number) => boolean;
  /** Finalize the blur painting session and save mask data. */
  finishPaint: () => void;
  /** Build cursor CSS for the blur brush. */
  getCursorStyle: (zoom: number) => string;
}

const MIN_BRUSH_SIZE = 1;
const MAX_BRUSH_SIZE = 500;
const DEFAULT_BRUSH_SIZE = 30;
const DEFAULT_INTENSITY = 50;
const MIN_INTENSITY = 0;
const MAX_INTENSITY = 100;
const THROTTLE_MS = 1000 / 30; // 30fps

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Blur brush tool state and controls.
 *
 * - Brush size: 1..500, default 30
 * - Intensity: 0..100, default 50
 * - Anti-blur: activated by right-click or Ctrl; removes blur instead
 * - Paint events throttled to 30fps
 * - Paints white onto a blur mask canvas (normal) or uses destination-out (anti-blur)
 * - Saves mask as data URL to layer.blurMaskData on finish
 */
export function useBlurBrushTool(): BlurBrushToolResult {
  const [brushSize, setBrushSizeState] = useState(DEFAULT_BRUSH_SIZE);
  const [intensity, setIntensityState] = useState(DEFAULT_INTENSITY);
  const [isAntiBlur, setIsAntiBlur] = useState(false);
  const [isPainting, setIsPainting] = useState(false);

  const lastPaintTime = useRef(0);

  // Blur mask canvas for current session
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const targetLayerIdRef = useRef<string | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const clampSizeVal = (s: number) => Math.max(MIN_BRUSH_SIZE, Math.min(MAX_BRUSH_SIZE, s));
  const clampIntensity = (i: number) => Math.max(MIN_INTENSITY, Math.min(MAX_INTENSITY, i));

  const setBrushSize = useCallback((size: number) => {
    setBrushSizeState(clampSizeVal(size));
  }, []);

  const setIntensity = useCallback((value: number) => {
    setIntensityState(clampIntensity(value));
  }, []);

  const toggleAntiBlur = useCallback(() => {
    setIsAntiBlur((prev) => !prev);
  }, []);

  // ----- startPaint -----
  const startPaint = useCallback(
    (layer: LayerModel, canvasX: number, canvasY: number): boolean => {
      // Only image layers can have blur masks
      if (layer.type !== 'image') return false;

      const canvas = document.createElement('canvas');
      canvas.width = layer.width;
      canvas.height = layer.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      // Load existing blur mask data if present
      if (layer.blurMaskData) {
        // blurMaskData is a Uint8Array - load it as image data if possible
        // For simplicity, treat it as image data URL stored as bytes
        try {
          const decoder = new TextDecoder();
          const dataUrl = decoder.decode(layer.blurMaskData);
          if (dataUrl.startsWith('data:')) {
            const img = new Image();
            img.src = dataUrl;
            if (img.complete) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
          }
        } catch {
          // Ignore decode errors, start with empty mask
        }
      }

      maskCanvasRef.current = canvas;
      maskCtxRef.current = ctx;
      targetLayerIdRef.current = layer.id;
      lastPointRef.current = {
        x: canvasX - layer.x,
        y: canvasY - layer.y,
      };

      setIsPainting(true);

      // Apply initial point
      paintOnMask(
        ctx,
        canvasX - layer.x,
        canvasY - layer.y,
        brushSize,
        intensity,
        isAntiBlur,
      );

      return true;
    },
    [brushSize, intensity, isAntiBlur],
  );

  // ----- paint (throttled) -----
  const paint = useCallback(
    (x: number, y: number) => {
      const now = performance.now();
      if (now - lastPaintTime.current < THROTTLE_MS) return;
      lastPaintTime.current = now;

      const ctx = maskCtxRef.current;
      const targetId = targetLayerIdRef.current;
      if (!ctx || !targetId || !isPainting) return;

      const layer = useDocumentStore
        .getState()
        .project.layers.find((l) => l.id === targetId);
      if (!layer) return;

      const localX = x - layer.x;
      const localY = y - layer.y;
      const lastPt = lastPointRef.current;

      if (lastPt) {
        // Interpolate points for smooth strokes
        const dx = localX - lastPt.x;
        const dy = localY - lastPt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(1, Math.ceil(dist / 2));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          paintOnMask(
            ctx,
            lastPt.x + dx * t,
            lastPt.y + dy * t,
            brushSize,
            intensity,
            isAntiBlur,
          );
        }
      } else {
        paintOnMask(ctx, localX, localY, brushSize, intensity, isAntiBlur);
      }

      lastPointRef.current = { x: localX, y: localY };
    },
    [brushSize, intensity, isAntiBlur, isPainting],
  );

  // ----- finishPaint -----
  const finishPaint = useCallback(() => {
    const canvas = maskCanvasRef.current;
    const targetId = targetLayerIdRef.current;
    if (!canvas || !targetId) {
      setIsPainting(false);
      return;
    }

    // Take undo snapshot
    useUndoRedoStore.getState().takeSnapshot();

    // Save mask as data URL encoded into Uint8Array
    const dataUrl = canvas.toDataURL('image/png');
    const encoder = new TextEncoder();
    const blurMaskData = encoder.encode(dataUrl);

    useDocumentStore.getState().updateLayer(targetId, { blurMaskData });

    // Clean up
    maskCanvasRef.current = null;
    maskCtxRef.current = null;
    targetLayerIdRef.current = null;
    lastPointRef.current = null;
    setIsPainting(false);
  }, []);

  // ----- getCursorStyle -----
  const getCursorStyle = useCallback(
    (zoom: number) => {
      const size = Math.max(2, brushSize * zoom);
      const half = size / 2;
      const svgSize = size + 2;
      const center = svgSize / 2;
      const color = isAntiBlur ? '#FF6600' : '#00BFFF';
      const dashArray = isAntiBlur ? 'stroke-dasharray="3,3"' : '';

      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${svgSize}' height='${svgSize}'><circle cx="${center}" cy="${center}" r="${half}" fill="none" stroke="${color}" stroke-width="1.5" ${dashArray}/></svg>`;
      const encoded = encodeURIComponent(svg);
      return `url("data:image/svg+xml,${encoded}") ${Math.round(center)} ${Math.round(center)}, crosshair`;
    },
    [brushSize, isAntiBlur],
  );

  return {
    blurState: { brushSize, intensity, isAntiBlur, isPainting },
    setBrushSize,
    setIntensity,
    toggleAntiBlur,
    paint,
    startPaint,
    finishPaint,
    getCursorStyle,
  };
}

// ---------------------------------------------------------------------------
// Internal mask painting
// ---------------------------------------------------------------------------

function paintOnMask(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  intensity: number,
  antiBlur: boolean,
): void {
  ctx.save();

  if (antiBlur) {
    // Remove from mask: use destination-out
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';
  } else {
    // Paint white onto mask: normal mode
    ctx.globalCompositeOperation = 'source-over';
    const alpha = intensity / 100;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  }

  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
