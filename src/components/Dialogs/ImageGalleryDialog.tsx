import { useState } from 'react';
import { DialogBase } from './DialogBase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImageGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imagePaths?: string[];
  onSelect?: (path: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Simple image picker dialog.
 * Displays a grid of thumbnails; double-click to select.
 */
export function ImageGalleryDialog({
  open,
  onOpenChange,
  imagePaths = [],
  onSelect,
}: ImageGalleryDialogProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleDoubleClick = (path: string) => {
    onSelect?.(path);
    onOpenChange(false);
  };

  // ---- Footer ----

  const footer = (
    <button
      type="button"
      className="rounded px-4 py-1.5 text-xs font-medium"
      style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
      onClick={() => onOpenChange(false)}
      data-testid="image-gallery-cancel"
    >
      Cancel
    </button>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Image Gallery"
      width={800}
      height={600}
      footer={footer}
    >
      <div
        className="flex flex-col"
        style={{ height: '100%', padding: 12 }}
        data-testid="image-gallery-dialog-content"
      >
        {/* Instruction text */}
        <div
          style={{
            color: 'var(--text-secondary)',
            fontSize: 12,
            marginBottom: 10,
          }}
          data-testid="image-gallery-instruction"
        >
          Double-click an image to select it
        </div>

        {/* Thumbnail grid */}
        <div
          className="flex-1 overflow-y-auto"
          data-testid="image-gallery-grid"
        >
          {imagePaths.length === 0 ? (
            <div
              className="flex items-center justify-center"
              style={{
                height: '100%',
                color: 'var(--text-secondary)',
                fontSize: 13,
              }}
              data-testid="image-gallery-empty"
            >
              No images available
            </div>
          ) : (
            <div
              className="flex flex-wrap"
              style={{ gap: 8 }}
            >
              {imagePaths.map((path, index) => (
                <div
                  key={path}
                  style={{
                    width: 140,
                    height: 100,
                    border: `1px solid ${hoveredIndex === index ? 'var(--accent-orange)' : '#555'}`,
                    borderRadius: 3,
                    backgroundColor: '#1E1E1E',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onDoubleClick={() => handleDoubleClick(path)}
                  data-testid={`image-gallery-thumb-${index}`}
                >
                  <img
                    src={path}
                    alt={`Thumbnail ${index}`}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DialogBase>
  );
}

export default ImageGalleryDialog;
