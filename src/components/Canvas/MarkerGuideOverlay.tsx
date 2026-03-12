export interface Guide {
  id: string;
  orientation: 'horizontal' | 'vertical';
  /** Position in canvas (unscaled) pixels. */
  position: number;
}

export interface MarkerGuideOverlayProps {
  /** Array of guide lines. */
  guides: Guide[];
  /** Current zoom level. */
  zoom: number;
}

const GUIDE_COLOR = '#00BCD4';

/**
 * Renders horizontal and vertical marker guides (cyan dashed lines).
 */
export function MarkerGuideOverlay({ guides, zoom }: MarkerGuideOverlayProps) {
  if (guides.length === 0) return null;

  return (
    <div
      data-testid="marker-guide-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {guides.map((guide) => {
        const pos = guide.position * zoom;
        const isH = guide.orientation === 'horizontal';

        return (
          <div
            key={guide.id}
            data-testid={`guide-${guide.id}`}
            style={{
              position: 'absolute',
              ...(isH
                ? { top: pos, left: 0, right: 0, height: 1, borderTop: `1px dashed ${GUIDE_COLOR}` }
                : { left: pos, top: 0, bottom: 0, width: 1, borderLeft: `1px dashed ${GUIDE_COLOR}` }),
            }}
          />
        );
      })}
    </div>
  );
}

export default MarkerGuideOverlay;
