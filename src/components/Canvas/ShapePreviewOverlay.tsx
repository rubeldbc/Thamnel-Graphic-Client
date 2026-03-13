import { useRef, useEffect } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { renderShapePath } from '../../engine/shapeRenderer';
import type { ShapeType } from '../../types/enums';
import type { DragStartState } from '../../hooks/useCanvasInteraction';

export interface ShapePreviewOverlayProps {
  /** Drawing rect in canvas coordinates, or null. */
  rect: { x: number; y: number; width: number; height: number } | null;
  /** Current zoom level. */
  zoom: number;
  /** Whether shape drawing is active. */
  isDrawing: boolean;
  /** Drag start state — used to compute line start point. */
  dragStartState?: DragStartState | null;
}

/**
 * Live shape preview overlay — renders the shape being drawn in real time
 * using a small canvas element positioned over the marquee area.
 * For line shapes, draws a line from start to end instead of a rectangle marquee.
 */
export function ShapePreviewOverlay({ rect, zoom, isDrawing, dragStartState }: ShapePreviewOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subscribe to reactive store values so re-render happens when sides/colors change
  const shapeType = useUiStore((s) => s.selectedShapeType);
  const sides = useUiStore((s) => s.drawPolygonSides);
  const fillColor = useUiStore((s) => s.drawFillColor);
  const borderColor = useUiStore((s) => s.drawStrokeColor);
  const starInnerRatio = useUiStore((s) => s.starInnerRatio);

  const isLineDraw = shapeType === 'line';

  useEffect(() => {
    if (!rect || !isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isLineDraw && dragStartState) {
      // Line preview: draw a line from start point to the rect's opposite corner
      // The rect is the bounding box of start and end points
      const startX = dragStartState.canvasX;
      const startY = dragStartState.canvasY;
      // End point is whichever corner of the rect is NOT the start
      // Since rect is the bounding box, we need to figure out the actual end
      // The marqueeRect x/y is the min, so the end point could be anywhere
      // We compute the end from the rect bounds relative to start
      const endX = rect.x === startX ? rect.x + rect.width :
                   rect.x + rect.width === startX ? rect.x :
                   rect.x + rect.width; // fallback
      const endY = rect.y === startY ? rect.y + rect.height :
                   rect.y + rect.height === startY ? rect.y :
                   rect.y + rect.height; // fallback

      // Use full viewport-sized canvas for line drawing
      const parent = canvas.parentElement;
      if (!parent) return;
      const pw = parent.clientWidth;
      const ph = parent.clientHeight;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = pw * dpr;
      canvas.height = ph * dpr;
      canvas.style.left = '0';
      canvas.style.top = '0';
      canvas.style.width = `${pw}px`;
      canvas.style.height = `${ph}px`;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, pw, ph);

      // Draw line from start to end in screen coordinates
      ctx.beginPath();
      ctx.moveTo(startX * zoom, startY * zoom);
      ctx.lineTo(endX * zoom, endY * zoom);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Normal shape preview
      if (rect.width < 2 || rect.height < 2) return;

      const w = rect.width * zoom;
      const h = rect.height * zoom;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.left = `${rect.x * zoom}px`;
      canvas.style.top = `${rect.y * zoom}px`;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, w, h);

      const actualType: ShapeType = (shapeType === 'rectangle' && sides !== 4) ? 'polygon' : shapeType;

      ctx.save();
      ctx.scale(zoom, zoom);
      renderShapePath(ctx, actualType, rect.width, rect.height, sides, starInnerRatio);

      ctx.fillStyle = fillColor;
      if (actualType !== 'line' && actualType !== 'diagonalLine') {
        ctx.fill('evenodd');
      }

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }
  }, [rect, zoom, isDrawing, shapeType, sides, fillColor, borderColor, starInnerRatio, isLineDraw, dragStartState]);

  if (!rect || !isDrawing) return null;
  // For non-line shapes, require minimum dimensions
  if (!isLineDraw && (rect.width < 2 || rect.height < 2)) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        left: isLineDraw ? 0 : rect.x * zoom,
        top: isLineDraw ? 0 : rect.y * zoom,
        width: isLineDraw ? '100%' : rect.width * zoom,
        height: isLineDraw ? '100%' : rect.height * zoom,
        pointerEvents: 'none',
      }}
    />
  );
}

export default ShapePreviewOverlay;
