import { useRef, useEffect } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { renderShapePath } from '../../engine/shapeRenderer';
import type { ShapeType } from '../../types/enums';

export interface ShapePreviewOverlayProps {
  /** Drawing rect in canvas coordinates, or null. */
  rect: { x: number; y: number; width: number; height: number } | null;
  /** Current zoom level. */
  zoom: number;
  /** Whether shape drawing is active. */
  isDrawing: boolean;
  /** Polyline points already placed (for click-to-place line drawing). */
  polylinePoints?: Array<{ x: number; y: number }>;
  /** Current cursor position for polyline preview segment. */
  polylinePreviewPoint?: { x: number; y: number } | null;
}

/**
 * Live shape preview overlay — renders the shape being drawn in real time.
 * For polyline mode (click-to-place lines), renders confirmed segments + preview segment.
 * For normal shapes, renders the shape preview during drag.
 */
export function ShapePreviewOverlay({
  rect,
  zoom,
  isDrawing,
  polylinePoints = [],
  polylinePreviewPoint,
}: ShapePreviewOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const shapeType = useUiStore((s) => s.selectedShapeType);
  const sides = useUiStore((s) => s.drawPolygonSides);
  const fillColor = useUiStore((s) => s.drawFillColor);
  const borderColor = useUiStore((s) => s.drawStrokeColor);
  const starInnerRatio = useUiStore((s) => s.starInnerRatio);

  const isPolylineMode = polylinePoints.length > 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Polyline preview: draw confirmed segments + preview to cursor
    if (isPolylineMode) {
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

      // Draw confirmed segments (solid)
      if (polylinePoints.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(polylinePoints[0].x * zoom, polylinePoints[0].y * zoom);
        for (let i = 1; i < polylinePoints.length; i++) {
          ctx.lineTo(polylinePoints[i].x * zoom, polylinePoints[i].y * zoom);
        }
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw preview segment (dashed) from last point to cursor
      if (polylinePreviewPoint && polylinePoints.length >= 1) {
        const last = polylinePoints[polylinePoints.length - 1];
        ctx.beginPath();
        ctx.moveTo(last.x * zoom, last.y * zoom);
        ctx.lineTo(polylinePreviewPoint.x * zoom, polylinePreviewPoint.y * zoom);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw small circles at each confirmed point
      for (const pt of polylinePoints) {
        ctx.beginPath();
        ctx.arc(pt.x * zoom, pt.y * zoom, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      return;
    }

    // Normal shape preview (non-line drag drawing)
    if (!rect || !isDrawing || rect.width < 2 || rect.height < 2) return;

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
  }, [rect, zoom, isDrawing, shapeType, sides, fillColor, borderColor, starInnerRatio, isPolylineMode, polylinePoints, polylinePreviewPoint]);

  // Show for polyline mode (always visible while placing points)
  if (isPolylineMode) {
    return (
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    );
  }

  // Normal shape preview: require active drawing with minimum dimensions
  if (!rect || !isDrawing || rect.width < 2 || rect.height < 2) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        left: rect.x * zoom,
        top: rect.y * zoom,
        width: rect.width * zoom,
        height: rect.height * zoom,
        pointerEvents: 'none',
      }}
    />
  );
}

export default ShapePreviewOverlay;
