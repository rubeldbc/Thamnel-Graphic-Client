import { useCallback } from 'react';
import { DialogBase } from './DialogBase';
import { Icon } from '../common/Icon';
import {
  mdiInformationOutline,
  mdiAlertOutline,
  mdiCloseCircleOutline,
  mdiHelpCircleOutline,
  mdiCheckCircleOutline,
} from '@mdi/js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationIcon = 'info' | 'warning' | 'error' | 'question' | 'success';

export interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dialog title shown in the body area. */
  title?: string;
  /** Message body. */
  message?: string;
  /** Icon variant displayed above the title. */
  icon?: NotificationIcon;
  /** Labels for buttons rendered in the footer. First button is primary. */
  buttons?: string[];
  /** Called with the label of the button the user clicked. */
  onResult?: (result: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ICON_CONFIG: Record<NotificationIcon, { path: string; color: string }> = {
  info: { path: mdiInformationOutline, color: '#4FC3F7' },
  warning: { path: mdiAlertOutline, color: '#FFD54F' },
  error: { path: mdiCloseCircleOutline, color: '#EF5350' },
  question: { path: mdiHelpCircleOutline, color: 'var(--accent-orange)' },
  success: { path: mdiCheckCircleOutline, color: '#66BB6A' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationDialog({
  open,
  onOpenChange,
  title,
  message,
  icon = 'info',
  buttons = ['OK'],
  onResult,
}: NotificationDialogProps) {
  const handleClick = useCallback(
    (label: string) => {
      onResult?.(label);
      onOpenChange(false);
    },
    [onResult, onOpenChange],
  );

  const cfg = ICON_CONFIG[icon];

  const footer = (
    <>
      {buttons.map((label, idx) => (
        <button
          key={label}
          type="button"
          className="rounded px-4 py-1.5 text-xs font-medium"
          style={
            idx === 0
              ? { backgroundColor: 'var(--accent-orange)', color: '#fff' }
              : { backgroundColor: 'var(--toolbar-bg)', color: 'var(--text-secondary)' }
          }
          onClick={() => handleClick(label)}
          data-testid={`notification-btn-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {label}
        </button>
      ))}
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Notification"
      width={420}
      footer={footer}
    >
      <div className="flex flex-col items-center gap-3 p-5" data-testid="notification-dialog-content">
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 36, // below title bar
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, var(--accent-orange), #FF8F00)',
          }}
          data-testid="notification-accent-bar"
        />

        {/* Icon */}
        <div style={{ marginTop: 8 }}>
          <Icon path={cfg.path} size={40} color={cfg.color} />
        </div>

        {/* Title */}
        {title && (
          <span
            style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}
            data-testid="notification-title"
          >
            {title}
          </span>
        )}

        {/* Message */}
        {message && (
          <span
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
            data-testid="notification-message"
          >
            {message}
          </span>
        )}
      </div>
    </DialogBase>
  );
}

export default NotificationDialog;
