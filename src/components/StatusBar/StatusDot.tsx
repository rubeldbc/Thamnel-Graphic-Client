export type StatusDotStatus = 'connected' | 'disconnected' | 'busy';

export interface StatusDotProps {
  /** Current connection status. */
  status: StatusDotStatus;
  /** Text label rendered next to the dot. */
  label?: string;
  /** Optional click handler. */
  onClick?: () => void;
}

const STATUS_COLORS: Record<StatusDotStatus, string> = {
  connected: '#81C784',
  disconnected: '#EF5350',
  busy: '#42A5F5',
};

/**
 * Reusable status indicator dot with an optional inline text label.
 */
export function StatusDot({ status, label, onClick }: StatusDotProps) {
  return (
    <span
      data-testid="status-dot"
      data-status={status}
      className="inline-flex items-center gap-1 select-none"
      style={{ cursor: onClick ? 'pointer' : 'default', fontSize: 11 }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <span
        className="inline-block shrink-0 rounded-full"
        style={{
          width: 8,
          height: 8,
          backgroundColor: STATUS_COLORS[status],
        }}
      />
      {label && (
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      )}
    </span>
  );
}

export default StatusDot;
