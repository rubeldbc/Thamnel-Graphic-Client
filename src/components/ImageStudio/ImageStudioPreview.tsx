import { useRef, useCallback, useState } from 'react';

export type ViewMode = 'combined' | 'foreground' | 'background';

export interface ImageStudioPreviewProps {
  /** Current zoom level (1 = 100%). */
  zoom?: number;
  /** Which layer(s) to display. */
  viewMode?: ViewMode;
  /** Source URL of the image to preview. */
  imageUrl?: string;
  /** Optional mask overlay URL. */
  maskUrl?: string;
  /** Brush diameter in pixels (preview space). */
  brushSize?: number;
  /** Whether to show the brush cursor circle. */
  showBrush?: boolean;
}

/**
 * Image Studio preview area with scrollable viewport, checkerboard transparency
 * background, optional mask overlay, and brush cursor canvas.
 */
export function ImageStudioPreview({
  zoom = 1,
  viewMode = 'combined',
  imageUrl,
  maskUrl,
  brushSize = 20,
  showBrush = false,
}: ImageStudioPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!showBrush || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setCursorPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [showBrush],
  );

  const handleMouseLeave = useCallback(() => {
    setCursorPos(null);
  }, []);

  return (
    <div
      data-testid="image-studio-preview"
      ref={containerRef}
      className="relative flex-1 overflow-auto"
      style={{
        backgroundImage:
          'linear-gradient(45deg, #2a2a2a 25%, transparent 25%), ' +
          'linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), ' +
          'linear-gradient(45deg, transparent 75%, #2a2a2a 75%), ' +
          'linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        backgroundColor: '#1e1e1e',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Image container */}
      <div
        className="flex min-h-full min-w-full items-center justify-center p-8"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt={`Preview - ${viewMode}`}
            className="max-w-none select-none"
            draggable={false}
            data-testid="preview-image"
          />
        )}

        {/* Mask overlay */}
        {maskUrl && (viewMode === 'combined' || viewMode === 'foreground') && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${maskUrl})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              opacity: 0.4,
              pointerEvents: 'none',
            }}
            data-testid="mask-overlay"
          />
        )}
      </div>

      {/* Brush cursor overlay */}
      {showBrush && cursorPos && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: cursorPos.x - brushSize / 2,
            top: cursorPos.y - brushSize / 2,
            width: brushSize,
            height: brushSize,
            border: '1.5px solid rgba(255, 255, 255, 0.8)',
            borderRadius: '50%',
          }}
          data-testid="brush-cursor"
        />
      )}
    </div>
  );
}

export default ImageStudioPreview;
