export interface GridOverlayProps {
  /** Whether the grid is visible. */
  visible: boolean;
  /** Grid spacing in canvas pixels. */
  gridSize?: number;
  /** Current zoom level. */
  zoom: number;
  /** Canvas width in unscaled pixels. */
  canvasWidth: number;
  /** Canvas height in unscaled pixels. */
  canvasHeight: number;
}

/**
 * Toggleable grid overlay rendered as an SVG with a repeating pattern.
 */
export function GridOverlay({
  visible,
  gridSize = 50,
  zoom,
  canvasWidth,
  canvasHeight,
}: GridOverlayProps) {
  if (!visible) return null;

  const scaledGrid = gridSize * zoom;
  const width = canvasWidth * zoom;
  const height = canvasHeight * zoom;

  return (
    <svg
      data-testid="grid-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: 'none',
      }}
    >
      <defs>
        <pattern
          id="grid-pattern"
          width={scaledGrid}
          height={scaledGrid}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${scaledGrid} 0 L 0 0 0 ${scaledGrid}`}
            fill="none"
            stroke="#333333"
            strokeWidth={1}
            opacity={0.5}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
    </svg>
  );
}

export default GridOverlay;
