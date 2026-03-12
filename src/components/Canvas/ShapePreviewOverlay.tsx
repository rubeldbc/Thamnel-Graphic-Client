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
}

/**
 * Live shape preview overlay — renders the shape being drawn in real time
 * using a small canvas element positioned over the marquee area.
 */
export function ShapePreviewOverlay({ rect, zoom, isDrawing }: ShapePreviewOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subscribe to reactive store values so re-render happens when sides/colors change
  const shapeType = useUiStore((s) => s.selectedShapeType);
  const sides = useUiStore((s) => s.drawPolygonSides);
  const fillColor = useUiStore((s) => s.drawFillColor);
  const borderColor = useUiStore((s) => s.drawStrokeColor);

  useEffect(() => {
    if (!rect || !isDrawing || rect.width < 2 || rect.height < 2) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = rect.width * zoom;
    const h = rect.height * zoom;

    // Set canvas size (use devicePixelRatio for sharpness)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    // Determine actual shape type (polygon if sides changed from 4)
    const actualType: ShapeType = (shapeType === 'rectangle' && sides !== 4) ? 'polygon' : shapeType;

    // Render shape path in canvas-coordinate space, scaled by zoom
    ctx.save();
    ctx.scale(zoom, zoom);

    renderShapePath(ctx, actualType, rect.width, rect.height, sides);

    // Fill
    ctx.fillStyle = fillColor;
    if (actualType !== 'line' && actualType !== 'diagonalLine') {
      ctx.fill('evenodd');
    }

    // Stroke
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }, [rect, zoom, isDrawing, shapeType, sides, fillColor, borderColor]);

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
