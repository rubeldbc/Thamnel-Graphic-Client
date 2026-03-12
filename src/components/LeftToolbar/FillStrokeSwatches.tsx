export interface FillStrokeSwatchesProps {
  /** Fill colour (any valid CSS colour value). */
  fillColor?: string;
  /** Stroke colour (any valid CSS colour value). */
  strokeColor?: string;
  /** Click handler for the fill swatch. */
  onFillClick?: () => void;
  /** Click handler for the stroke swatch. */
  onStrokeClick?: () => void;
}

/**
 * Photoshop-style overlapping colour swatches with checkerboard behind
 * to indicate transparency.
 *
 * - Fill swatch: 24x24, sits behind (top-left).
 * - Stroke swatch: 18x18, in front at bottom-right.
 */
export function FillStrokeSwatches({
  fillColor = '#FFFFFF',
  strokeColor = '#000000',
  onFillClick,
  onStrokeClick,
}: FillStrokeSwatchesProps) {
  return (
    <div
      data-testid="fill-stroke-swatches"
      className="relative"
      style={{ width: 34, height: 34 }}
    >
      {/* Fill swatch (behind) */}
      <button
        type="button"
        data-testid="swatch-fill"
        title="Fill color"
        onClick={onFillClick}
        className="absolute cursor-pointer border-0 outline-none"
        style={{
          top: 0,
          left: 0,
          width: 24,
          height: 24,
          borderRadius: 2,
          zIndex: 1,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Checkerboard */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-conic-gradient(#808080 0% 25%, #c0c0c0 0% 50%) 50% / 6px 6px',
          }}
        />
        {/* Color */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: fillColor,
            border: '1.5px solid #555',
            borderRadius: 2,
          }}
        />
      </button>

      {/* Stroke swatch (in front, bottom-right) */}
      <button
        type="button"
        data-testid="swatch-stroke"
        title="Stroke color"
        onClick={onStrokeClick}
        className="absolute cursor-pointer border-0 outline-none"
        style={{
          bottom: 0,
          right: 0,
          width: 18,
          height: 18,
          borderRadius: 2,
          zIndex: 2,
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Checkerboard */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-conic-gradient(#808080 0% 25%, #c0c0c0 0% 50%) 50% / 6px 6px',
          }}
        />
        {/* Color */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: strokeColor,
            border: '1.5px solid #555',
            borderRadius: 2,
          }}
        />
      </button>
    </div>
  );
}

export default FillStrokeSwatches;
