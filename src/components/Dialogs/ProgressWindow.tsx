import { useState, useEffect, useRef, useCallback } from 'react';
import { DialogBase } from './DialogBase';
import { Icon } from '../common/Icon';
import { mdiLoading } from '@mdi/js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProgressWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Title shown in the title bar. */
  title?: string;
  /** Primary status label (e.g. "Downloading model…"). */
  statusText?: string;
  /** Progress 0–100, or -1 for indeterminate. */
  progressPercent?: number;
  /** Secondary step detail (e.g. "Step 2 of 5"). */
  stepText?: string;
  /** Name of the model being processed, shown when provided. */
  modelName?: string;
  /** Extra description text, shown when provided. */
  description?: string;
  /** Called when the user requests cancellation. */
  onCancel?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProgressWindow({
  open,
  onOpenChange,
  title = 'Processing...',
  statusText,
  progressPercent = -1,
  stepText,
  modelName,
  description,
  onCancel,
}: ProgressWindowProps) {
  const [elapsed, setElapsed] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Elapsed timer — starts when the dialog opens
  useEffect(() => {
    if (open) {
      setElapsed(0);
      setCancelling(false);
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open]);

  const handleCancel = useCallback(() => {
    setCancelling(true);
    onCancel?.();
  }, [onCancel]);

  const isIndeterminate = progressPercent < 0;
  const pct = isIndeterminate ? 0 : Math.min(Math.max(progressPercent, 0), 100);

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      width={480}
    >
      <div className="flex flex-col gap-4 p-5" data-testid="progress-window-content">
        {/* Top orange accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 36,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, var(--accent-orange), #FF8F00)',
          }}
          data-testid="progress-accent-bar"
        />

        {/* Status icon + label */}
        <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
          <span
            className="inline-block"
            style={{ animation: 'spin 1s linear infinite' }}
            data-testid="progress-spinner"
          >
            <Icon path={mdiLoading} size={20} color="var(--accent-orange)" />
          </span>
          {statusText && (
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
              data-testid="progress-status"
            >
              {statusText}
            </span>
          )}
        </div>

        {/* Model name (conditional) */}
        {modelName && (
          <span
            className="text-xs"
            style={{ color: 'var(--text-secondary)' }}
            data-testid="progress-model-name"
          >
            Model: {modelName}
          </span>
        )}

        {/* Description (conditional) */}
        {description && (
          <span
            className="text-xs"
            style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}
            data-testid="progress-description"
          >
            {description}
          </span>
        )}

        {/* Progress bar */}
        <div
          className="relative overflow-hidden rounded-sm"
          style={{ height: 8, backgroundColor: '#2A2A2A' }}
          data-testid="progress-bar-track"
        >
          {isIndeterminate ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'repeating-linear-gradient(90deg, var(--accent-orange) 0%, #FF8F00 25%, var(--accent-orange) 50%)',
                backgroundSize: '200% 100%',
                animation: 'progress-stripe 1.5s linear infinite',
              }}
              data-testid="progress-bar-indeterminate"
            />
          ) : (
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                backgroundColor: 'var(--accent-orange)',
                transition: 'width 0.3s ease',
              }}
              data-testid="progress-bar-fill"
            />
          )}
        </div>

        {/* Large percentage for determinate (download) mode */}
        {!isIndeterminate && (
          <span
            className="text-center font-bold"
            style={{ fontSize: 28, color: 'var(--text-primary)' }}
            data-testid="progress-percent-text"
          >
            {Math.round(pct)}%
          </span>
        )}

        {/* Step detail */}
        {stepText && (
          <span
            className="text-xs"
            style={{ color: 'var(--text-secondary)' }}
            data-testid="progress-step-text"
          >
            {stepText}
          </span>
        )}

        {/* Elapsed time */}
        <span
          className="text-xs"
          style={{ color: 'var(--text-secondary)' }}
          data-testid="progress-elapsed"
        >
          Elapsed: {formatElapsed(elapsed)}
        </span>

        {/* Cancel button */}
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded px-4 py-1.5 text-xs font-medium"
            style={{
              backgroundColor: cancelling ? 'var(--toolbar-bg)' : 'var(--toolbar-bg)',
              color: cancelling ? 'var(--text-secondary)' : 'var(--text-primary)',
              opacity: cancelling ? 0.6 : 1,
              cursor: cancelling ? 'not-allowed' : 'pointer',
              border: '1px solid var(--border-color)',
            }}
            disabled={cancelling}
            onClick={handleCancel}
            data-testid="progress-cancel"
          >
            {cancelling ? 'Cancelling...' : 'Cancel'}
          </button>
        </div>
      </div>

      {/* CSS keyframes injected once */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes progress-stripe {
          0%   { background-position: 200% 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
    </DialogBase>
  );
}

export default ProgressWindow;
