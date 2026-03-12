import { DialogBase } from './DialogBase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AboutWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AboutWindow({ open, onOpenChange }: AboutWindowProps) {
  const footer = (
    <button
      type="button"
      className="rounded px-4 py-1.5 text-xs font-medium text-white"
      style={{ backgroundColor: 'var(--accent-orange)' }}
      onClick={() => onOpenChange(false)}
      data-testid="about-close-btn"
    >
      Close
    </button>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="About"
      width={400}
      height={300}
      footer={footer}
    >
      <div
        className="flex h-full flex-col items-center justify-center gap-3 p-6"
        data-testid="about-dialog-content"
      >
        {/* Logo placeholder */}
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: 64,
            height: 64,
            backgroundColor: 'var(--accent-orange)',
          }}
          data-testid="about-logo"
        >
          <span className="text-2xl font-bold text-white">TG</span>
        </div>

        <h2
          className="text-base font-bold"
          style={{ color: 'var(--text-primary)' }}
          data-testid="about-app-name"
        >
          Thamnel Graphics Editor
        </h2>

        <span className="text-xs" style={{ color: 'var(--text-secondary)' }} data-testid="about-version">
          Version 1.0.0
        </span>

        <span className="text-xs" style={{ color: 'var(--text-secondary)' }} data-testid="about-author">
          Author: Kamrul Islam Rubel
        </span>

        <span className="text-xs" style={{ color: 'var(--text-disabled)' }} data-testid="about-copyright">
          &copy; 2026 Thamnel Graphics. All rights reserved.
        </span>
      </div>
    </DialogBase>
  );
}

export default AboutWindow;
