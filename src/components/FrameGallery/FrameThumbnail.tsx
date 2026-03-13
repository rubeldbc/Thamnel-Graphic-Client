export interface FrameThumbnailProps {
  /** Image URL or placeholder for the thumbnail. */
  src: string;
  /** Timestamp string displayed in bottom-right overlay. */
  timestamp: string;
  /** Whether this thumbnail is currently selected. */
  isSelected?: boolean;
  /** Click handler. */
  onClick?: () => void;
  /** Double-click handler (e.g. add to canvas immediately). */
  onDoubleClick?: () => void;
  /** Thumbnail height in pixels. Width auto-calculated as 16:9 ratio. */
  thumbHeight?: number;
  /** Whether to play the fade-in animation. */
  animate?: boolean;
}

/**
 * Individual frame thumbnail with timestamp overlay.
 * Matches WPF: 16:9 aspect ratio, 1px border, 4px radius, Uniform stretch.
 */
export function FrameThumbnail({
  src,
  timestamp,
  isSelected = false,
  onClick,
  onDoubleClick,
  thumbHeight = 68,
  animate = false,
}: FrameThumbnailProps) {
  const thumbWidth = Math.round(thumbHeight * 16 / 9);

  return (
    <button
      data-testid="frame-thumbnail"
      className={`relative shrink-0 cursor-pointer overflow-hidden${animate ? ' animate-fadeIn' : ''}`}
      style={{
        width: thumbWidth,
        height: thumbHeight,
        margin: '0 4px',
        borderRadius: 4,
        border: isSelected ? '2px solid #FF6600' : '1px solid #444',
        backgroundColor: 'black',
        padding: 0,
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <img
        src={src}
        alt={`Frame at ${timestamp}`}
        className="block"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
        draggable={false}
      />

      {/* Timestamp overlay (bottom-right) */}
      <span
        data-testid="frame-thumbnail-timestamp"
        className="absolute right-1 bottom-0.5"
        style={{
          fontSize: 10,
          color: 'white',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: '1px 3px',
          lineHeight: 1.3,
          borderRadius: 2,
        }}
      >
        {timestamp}
      </span>
    </button>
  );
}

export default FrameThumbnail;
