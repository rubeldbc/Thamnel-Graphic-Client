import { useState, useRef, useEffect, useCallback } from 'react';
import { DialogBase } from './DialogBase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dialog title. */
  title?: string;
  /** Prompt text shown above the input. */
  prompt?: string;
  /** Pre-filled value for the text input. */
  defaultValue?: string;
  /** Called with the current input value when the user confirms. */
  onOk?: (value: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InputDialog({
  open,
  onOpenChange,
  title = 'Input',
  prompt = 'Enter a value:',
  defaultValue = '',
  onOk,
}: InputDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset value and auto-focus when dialog opens
  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      // Small delay so the DOM is ready after portal mount
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open, defaultValue]);

  const handleOk = useCallback(() => {
    onOk?.(value);
    onOpenChange(false);
  }, [value, onOk, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleOk();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    },
    [handleOk, onOpenChange],
  );

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={() => onOpenChange(false)}
        data-testid="input-dialog-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={handleOk}
        data-testid="input-dialog-ok"
      >
        OK
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      width={350}
      height={180}
      footer={footer}
    >
      <div className="flex flex-col gap-3 p-4" data-testid="input-dialog-content">
        {/* Prompt text */}
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {prompt}
        </span>

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-sm border px-2 py-1.5 text-xs outline-none"
          style={{
            backgroundColor: '#2A2A2A',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
          data-testid="input-dialog-input"
        />
      </div>
    </DialogBase>
  );
}

export default InputDialog;
