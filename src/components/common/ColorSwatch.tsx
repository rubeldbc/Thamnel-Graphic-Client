export interface ColorSwatchProps {
  /** Colour value (any valid CSS colour, typically hex). */
  color: string;
  /** Size of the swatch square in pixels. */
  size?: number;
  /** Click handler. */
  onClick?: () => void;
  /** Accessible label. */
  label?: string;
}

/**
 * Small colour preview square with checkerboard background for transparency.
 */
export function ColorSwatch({
  color,
  size = 24,
  onClick,
  label,
}: ColorSwatchProps) {
  const testId = label
    ? `color-swatch-${label.toLowerCase().replace(/\s+/g, '-')}`
    : 'color-swatch';

  return (
    <button
      type="button"
      data-testid={testId}
      title={label ?? color}
      onClick={onClick}
      className="relative cursor-pointer overflow-hidden border-0 p-0 outline-none"
      style={{
        width: size,
        height: size,
        border: '1px solid #555',
        borderRadius: 2,
      }}
    >
      {/* Checkerboard background for transparency */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(45deg, #808080 25%, transparent 25%), ' +
            'linear-gradient(-45deg, #808080 25%, transparent 25%), ' +
            'linear-gradient(45deg, transparent 75%, #808080 75%), ' +
            'linear-gradient(-45deg, transparent 75%, #808080 75%)',
          backgroundSize: `${Math.max(6, size / 4)}px ${Math.max(6, size / 4)}px`,
          backgroundPosition: `0 0, 0 ${Math.max(3, size / 8)}px, ${Math.max(3, size / 8)}px -${Math.max(3, size / 8)}px, -${Math.max(3, size / 8)}px 0px`,
        }}
      />
      {/* Colour overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: color }}
        data-testid={`${testId}-fill`}
      />
    </button>
  );
}

export default ColorSwatch;
