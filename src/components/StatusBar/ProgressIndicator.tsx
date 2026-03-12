export interface ProgressIndicatorProps {
  /** Progress value from 0 to 100. */
  value: number;
  /** Bar width in pixels (default 80). */
  width?: number;
  /** Bar height in pixels (default 6). */
  height?: number;
  /** Whether the indicator is visible. */
  visible?: boolean;
  /** Optional stage / label text shown after the percentage. */
  label?: string;
}

/**
 * Small inline progress bar with percentage text and optional stage label.
 */
export function ProgressIndicator({
  value,
  width = 80,
  height = 6,
  visible = true,
  label,
}: ProgressIndicatorProps) {
  if (!visible) return null;

  const clamped = Math.min(100, Math.max(0, value));

  return (
    <span
      data-testid="progress-indicator"
      className="inline-flex items-center gap-1.5 select-none"
      style={{ fontSize: 11 }}
    >
      {/* Track */}
      <span
        className="inline-block overflow-hidden rounded"
        style={{
          width,
          height,
          backgroundColor: '#333',
        }}
      >
        {/* Fill */}
        <span
          className="block h-full rounded"
          style={{
            width: `${clamped}%`,
            backgroundColor: 'var(--accent-orange)',
            transition: 'width 0.2s ease',
          }}
        />
      </span>

      {/* Percentage text */}
      <span style={{ color: 'var(--text-secondary)' }}>
        {Math.round(clamped)}%
      </span>

      {/* Optional stage label */}
      {label && (
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      )}
    </span>
  );
}

export default ProgressIndicator;
