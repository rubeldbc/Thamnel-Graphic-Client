import { useRef, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Icon } from '../common/Icon';
import { mdiClose } from '@mdi/js';
import { useDraggable } from '../../hooks/useDraggable';

export interface DialogBaseProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Callback to change open state. */
  onOpenChange: (open: boolean) => void;
  /** Dialog title shown in the title bar. */
  title: string;
  /** Width in pixels. */
  width?: number;
  /** Height in pixels. */
  height?: number;
  /** Minimum width in pixels. */
  minWidth?: number;
  /** Minimum height in pixels. */
  minHeight?: number;
  /** Dialog body content. */
  children?: ReactNode;
  /** Footer content (e.g. action buttons). */
  footer?: ReactNode;
}

/**
 * Shared modal wrapper with common dark theme styling.
 * All Thamnel dialog windows compose this base component.
 */
export function DialogBase({
  open,
  onOpenChange,
  title,
  width = 500,
  height,
  minWidth,
  minHeight,
  children,
  footer,
}: DialogBaseProps) {
  const testId = `${title.toLowerCase().replace(/\s+/g, '-')}-dialog`;
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  useDraggable(handleRef, containerRef, open);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ backgroundColor: 'transparent' }}
          data-testid={`${testId}-overlay`}
        />
        <Dialog.Content
          ref={containerRef}
          data-testid={testId}
          className="fixed left-1/2 top-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border shadow-xl outline-none"
          style={{
            width,
            height,
            minWidth,
            minHeight,
            maxHeight: '95vh',
            backgroundColor: 'var(--panel-bg)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
          aria-describedby={undefined}
        >
          {/* ---- Title bar (drag handle) ---- */}
          <div
            ref={handleRef}
            className="flex shrink-0 items-center justify-between border-b px-3"
            style={{
              height: 36,
              backgroundColor: 'var(--toolbar-bg)',
              borderColor: 'var(--border-color)',
              cursor: 'grab',
            }}
            data-testid={`${testId}-titlebar`}
          >
            <Dialog.Title
              className="select-none text-sm font-bold"
              style={{ color: 'var(--accent-orange)', fontSize: 14 }}
            >
              {title}
            </Dialog.Title>

            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-0.5 text-text-secondary hover:bg-hover-bg hover:text-text-primary"
                data-testid={`${testId}-close`}
              >
                <Icon path={mdiClose} size="sm" />
              </button>
            </Dialog.Close>
          </div>

          {/* ---- Body ---- */}
          <div className="flex-1 overflow-auto">{children}</div>

          {/* ---- Footer ---- */}
          {footer && (
            <div
              className="flex shrink-0 items-center justify-end gap-2 border-t px-4"
              style={{
                height: 48,
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--toolbar-bg)',
              }}
              data-testid={`${testId}-footer`}
            >
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default DialogBase;
