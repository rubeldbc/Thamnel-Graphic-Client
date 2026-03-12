export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MarqueeOverlayProps {
  /** Selection rectangle in canvas coordinates, or null if no active selection. */
  rect: MarqueeRect | null;
  /** Current zoom level. */
  zoom: number;
}

/** Marquee selection color: #0078D7 */
const MARQUEE_COLOR = '#0078D7';
const MARQUEE_BG = 'rgba(0, 120, 215, 0.1)';

/**
 * Selection marquee rectangle with dashed border and semi-transparent fill.
 */
export function MarqueeOverlay({ rect, zoom }: MarqueeOverlayProps) {
  if (!rect) return null;

  return (
    <div
      data-testid="marquee-overlay"
      style={{
        position: 'absolute',
        left: rect.x * zoom,
        top: rect.y * zoom,
        width: rect.width * zoom,
        height: rect.height * zoom,
        border: `1px dashed ${MARQUEE_COLOR}`,
        backgroundColor: MARQUEE_BG,
        pointerEvents: 'none',
      }}
    />
  );
}

export default MarqueeOverlay;
