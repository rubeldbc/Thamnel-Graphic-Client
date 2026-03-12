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
 * Photoshop-style overlapping colour swatches.
 *
 * - Fill swatch: 24x24, sits behind (top-left).
 * - Stroke swatch: 18x18, in front at bottom-right.
 * - Both have a thin #555 border.
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
          backgroundColor: fillColor,
          border: '1px solid #555',
          borderRadius: 2,
          zIndex: 1,
        }}
      />

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
          backgroundColor: strokeColor,
          border: '1px solid #555',
          borderRadius: 2,
          zIndex: 2,
        }}
      />
    </div>
  );
}

export default FillStrokeSwatches;
