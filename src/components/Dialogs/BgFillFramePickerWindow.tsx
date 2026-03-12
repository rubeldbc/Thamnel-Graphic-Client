import { DialogBase } from './DialogBase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BgFillFramePickerWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Array of file paths for frame thumbnail images. */
  framePaths?: string[];
  /** Called when the user double-clicks a frame thumbnail. */
  onSelect?: (path: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BgFillFramePickerWindow({
  open,
  onOpenChange,
  framePaths = [],
  onSelect,
}: BgFillFramePickerWindowProps) {
  const handleDoubleClick = (path: string) => {
    onSelect?.(path);
    onOpenChange(false);
  };

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Select Background Frame"
      width={720}
      height={460}
    >
      <div className="flex flex-col gap-3 p-4" data-testid="bgfill-frame-picker-content">
        {/* Instruction text */}
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Double-click a frame to select it as the background image.
        </span>

        {/* Scrollable grid of thumbnails */}
        <div
          className="flex flex-wrap gap-2 overflow-y-auto"
          style={{ maxHeight: 360 }}
          data-testid="bgfill-frame-grid"
        >
          {framePaths.length === 0 && (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              No frames available.
            </span>
          )}
          {framePaths.map((path) => (
            <div
              key={path}
              className="shrink-0 cursor-pointer"
              style={{
                width: 160,
                height: 90,
                borderRadius: 3,
                border: '1px solid var(--border-color)',
                backgroundColor: '#1a1a1a',
                overflow: 'hidden',
                transition: 'border-color 0.15s ease',
              }}
              onDoubleClick={() => handleDoubleClick(path)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-orange)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)';
              }}
              data-testid="bgfill-frame-thumbnail"
              title={path}
            >
              <img
                src={path}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </DialogBase>
  );
}

export default BgFillFramePickerWindow;
