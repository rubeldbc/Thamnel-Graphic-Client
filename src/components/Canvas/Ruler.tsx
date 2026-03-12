import { useMemo } from 'react';

export interface RulerProps {
  /** Ruler orientation. */
  orientation: 'horizontal' | 'vertical';
  /** Current zoom level (1.0 = 100%). */
  zoom: number;
  /** Scroll offset in pixels (unscaled canvas coordinates). */
  scrollOffset: number;
  /** Total canvas size in the ruler's dimension (unscaled pixels). */
  canvasSize: number;
}

/** Size of the ruler track in px. */
const RULER_THICKNESS = 20;

/** Colour tokens. */
const BG = '#1E1E1E';
const MINOR_TICK = '#646464';
const LABEL_COLOR = '#A0A0A0';
const EDGE_COLOR = '#FF6600';

/**
 * Pick a human-friendly interval that keeps ticks roughly 50-150 screen-px apart.
 */
function computeInterval(zoom: number): number {
  const candidates = [10, 25, 50, 100, 200, 500, 1000];
  for (const c of candidates) {
    if (c * zoom >= 40) return c;
  }
  return 1000;
}

/**
 * Horizontal or vertical ruler rendered with pure CSS divs.
 */
export function Ruler({ orientation, zoom, scrollOffset, canvasSize }: RulerProps) {
  const isHorizontal = orientation === 'horizontal';

  const interval = useMemo(() => computeInterval(zoom), [zoom]);

  // Build tick marks to cover the canvas range plus some padding
  const ticks = useMemo(() => {
    const result: { position: number; label: string; isMajor: boolean }[] = [];
    // range in canvas coordinates
    const start = 0;
    const end = canvasSize;

    // Snap to nearest interval before start
    const firstTick = Math.floor(start / interval) * interval;

    for (let v = firstTick; v <= end; v += interval) {
      result.push({
        position: v,
        label: String(v),
        isMajor: v % (interval * 2) === 0 || interval >= 100,
      });
    }
    return result;
  }, [canvasSize, interval]);

  const tickElements = ticks.map((tick) => {
    const screenPos = tick.position * zoom - scrollOffset * zoom;
    const tickLength = tick.isMajor ? 10 : 6;

    if (isHorizontal) {
      return (
        <div
          key={tick.position}
          style={{
            position: 'absolute',
            left: screenPos,
            bottom: 0,
            width: 1,
            height: tickLength,
            backgroundColor: MINOR_TICK,
          }}
        >
          {tick.isMajor && (
            <span
              style={{
                position: 'absolute',
                left: 2,
                top: -12,
                fontSize: 9,
                color: LABEL_COLOR,
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              {tick.label}
            </span>
          )}
        </div>
      );
    }

    // vertical
    return (
      <div
        key={tick.position}
        style={{
          position: 'absolute',
          top: screenPos,
          right: 0,
          height: 1,
          width: tickLength,
          backgroundColor: MINOR_TICK,
        }}
      >
        {tick.isMajor && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: -2,
              fontSize: 9,
              color: LABEL_COLOR,
              whiteSpace: 'nowrap',
              userSelect: 'none',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
            }}
          >
            {tick.label}
          </span>
        )}
      </div>
    );
  });

  // Edge markers (canvas 0 and canvasSize)
  const edgePositions = [0, canvasSize];
  const edgeElements = edgePositions.map((pos) => {
    const screenPos = pos * zoom - scrollOffset * zoom;
    if (isHorizontal) {
      return (
        <div
          key={`edge-${pos}`}
          style={{
            position: 'absolute',
            left: screenPos,
            top: 0,
            bottom: 0,
            width: 1,
            backgroundColor: EDGE_COLOR,
          }}
        />
      );
    }
    return (
      <div
        key={`edge-${pos}`}
        style={{
          position: 'absolute',
          top: screenPos,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: EDGE_COLOR,
        }}
      />
    );
  });

  const containerStyle: React.CSSProperties = isHorizontal
    ? { height: RULER_THICKNESS, width: '100%', position: 'relative', overflow: 'hidden', backgroundColor: BG }
    : { width: RULER_THICKNESS, height: '100%', position: 'relative', overflow: 'hidden', backgroundColor: BG };

  return (
    <div
      data-testid={`ruler-${orientation}`}
      style={containerStyle}
    >
      {tickElements}
      {edgeElements}
    </div>
  );
}

/**
 * 20x20 corner piece that sits at the intersection of the two rulers.
 */
export function RulerCorner() {
  return (
    <div
      data-testid="ruler-corner"
      style={{
        width: RULER_THICKNESS,
        height: RULER_THICKNESS,
        backgroundColor: BG,
        flexShrink: 0,
      }}
    />
  );
}

export default Ruler;
