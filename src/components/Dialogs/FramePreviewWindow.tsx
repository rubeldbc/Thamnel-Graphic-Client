import { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FramePreviewWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Full-screen borderless overlay for previewing a single frame / image.
 * Click anywhere or press any key to close.
 */
export function FramePreviewWindow({
  open,
  onOpenChange,
  imageSrc,
}: FramePreviewWindowProps) {
  // Close on any key press
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = () => {
      onOpenChange(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.88)' }}
          onClick={() => onOpenChange(false)}
          data-testid="frame-preview-overlay"
        />
        <Dialog.Content
          className="fixed inset-0 z-50 flex items-center justify-center p-5"
          style={{ background: 'transparent' }}
          onClick={() => onOpenChange(false)}
          aria-describedby={undefined}
          data-testid="frame-preview-dialog"
        >
          <Dialog.Title className="sr-only">Frame Preview</Dialog.Title>

          {imageSrc ? (
            <img
              src={imageSrc}
              alt="Frame preview"
              style={{
                maxWidth: '95vw',
                maxHeight: '95vh',
                objectFit: 'contain',
              }}
              onClick={(e) => e.stopPropagation()}
              data-testid="frame-preview-image"
            />
          ) : (
            <div
              style={{
                color: 'var(--text-secondary)',
                fontSize: 14,
              }}
              data-testid="frame-preview-empty"
            >
              No image to preview
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default FramePreviewWindow;
