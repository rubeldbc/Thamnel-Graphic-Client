import MdiIcon from '@mdi/react';

/** Predefined icon size presets (in pixels). */
const SIZE_MAP = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 24,
} as const;

type SizePreset = keyof typeof SIZE_MAP;

export interface IconProps {
  /** MDI icon path string (import from @mdi/js). */
  path: string;
  /** Named size preset or an explicit pixel number. */
  size?: SizePreset | number;
  /** Additional CSS class names. */
  className?: string;
  /** Override colour (any valid CSS colour value). */
  color?: string;
  /** Accessible title for the SVG. */
  title?: string;
}

/**
 * Thin wrapper around `@mdi/react` that maps friendly size names
 * to pixel values used throughout the Thamnel Graphic Client.
 */
export function Icon({
  path,
  size = 'md',
  className,
  color,
  title,
}: IconProps) {
  const pxSize = typeof size === 'number' ? size : SIZE_MAP[size];
  // @mdi/react expects size as a number representing the viewport scale.
  // It renders an SVG whose width/height equal `size * 1.5rem` by default.
  // We pass a raw pixel string via the `style` prop instead for exact sizing.

  return (
    <MdiIcon
      path={path}
      size={`${pxSize}px`}
      color={color}
      title={title}
      className={className}
      data-testid="tg-icon"
    />
  );
}

export default Icon;
