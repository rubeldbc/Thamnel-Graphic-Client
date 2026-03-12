import type { ReactNode } from 'react';

export interface PanelShellProps {
  /** Optional panel title shown in a small header bar. */
  title?: string;
  /** Panel content. */
  children?: ReactNode;
  /** Additional CSS class names merged onto the outer wrapper. */
  className?: string;
  /** data-testid for testing. */
  testId?: string;
}

/**
 * Generic empty panel container used as a placeholder shell for every
 * region of the application layout.  Renders a dark-themed box with an
 * optional title header bar.
 */
export function PanelShell({
  title,
  children,
  className = '',
  testId,
}: PanelShellProps) {
  return (
    <div
      data-testid={testId}
      className={`tg-panel flex flex-col overflow-hidden border border-border ${className}`}
    >
      {title && (
        <div className="tg-toolbar flex h-6 shrink-0 items-center border-b border-border px-2 text-xs text-text-secondary select-none">
          {title}
        </div>
      )}
      <div className="flex flex-1 items-center justify-center overflow-auto text-xs text-text-disabled">
        {children}
      </div>
    </div>
  );
}

export default PanelShell;
