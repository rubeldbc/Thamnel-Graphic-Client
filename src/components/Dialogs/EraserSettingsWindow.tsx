import { useState, useMemo } from 'react';
import { DialogBase } from './DialogBase';
import { NumericUpDown } from '../common/NumericUpDown';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EraserSettingsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 0 = block, 1 = circle */
  initialBrushType?: number;
  initialBrushSize?: number;
  initialBrushHardness?: number;
  onApply?: (settings: {
    brushType: number;
    brushSize: number;
    brushHardness: number;
  }) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EraserSettingsWindow({
  open,
  onOpenChange,
  initialBrushType = 1,
  initialBrushSize = 20,
  initialBrushHardness = 100,
  onApply,
}: EraserSettingsWindowProps) {
  const [brushType, setBrushType] = useState(initialBrushType);
  const [brushSize, setBrushSize] = useState(initialBrushSize);
  const [brushHardness, setBrushHardness] = useState(initialBrushHardness);

  // Clamp preview size to 4-50px range
  const previewSize = useMemo(
    () => Math.max(4, Math.min(50, brushSize)),
    [brushSize],
  );

  const gradientId = 'eraser-brush-gradient';

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={() => onOpenChange(false)}
        data-testid="eraser-settings-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={() => {
          onApply?.({ brushType, brushSize, brushHardness });
          onOpenChange(false);
        }}
        data-testid="eraser-settings-apply"
      >
        Apply
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Eraser Settings"
      width={380}
      footer={footer}
    >
      <div className="flex flex-col gap-4 p-4" data-testid="eraser-settings-content">
        {/* Section label */}
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--accent-orange)' }}
        >
          ERASER SETTINGS
        </span>

        {/* Brush Type */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)', minWidth: 80 }}>
            Brush Type
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              className="flex items-center justify-center rounded px-3 py-1 text-xs"
              style={{
                backgroundColor: brushType === 0 ? 'var(--accent-orange)' : 'var(--toolbar-bg)',
                color: brushType === 0 ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${brushType === 0 ? 'var(--accent-orange)' : 'var(--border-color)'}`,
              }}
              onClick={() => setBrushType(0)}
              data-testid="eraser-brush-type-block"
            >
              {/* Square icon */}
              <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginRight: 4 }}>
                <rect x="2" y="2" width="10" height="10" fill="currentColor" />
              </svg>
              Block
            </button>
            <button
              type="button"
              className="flex items-center justify-center rounded px-3 py-1 text-xs"
              style={{
                backgroundColor: brushType === 1 ? 'var(--accent-orange)' : 'var(--toolbar-bg)',
                color: brushType === 1 ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${brushType === 1 ? 'var(--accent-orange)' : 'var(--border-color)'}`,
              }}
              onClick={() => setBrushType(1)}
              data-testid="eraser-brush-type-circle"
            >
              {/* Circle icon */}
              <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginRight: 4 }}>
                <circle cx="7" cy="7" r="5" fill="currentColor" />
              </svg>
              Circle
            </button>
          </div>
        </div>

        {/* Brush Size */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)', minWidth: 80 }}>
            Brush Size
          </span>
          <NumericUpDown
            value={brushSize}
            onChange={setBrushSize}
            min={1}
            max={500}
            step={1}
            width={60}
            label=""
          />
          <input
            type="range"
            min={1}
            max={500}
            step={1}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="flex-1"
            style={{ accentColor: 'var(--accent-orange)' }}
            data-testid="eraser-brush-size-slider"
          />
        </div>

        {/* Brush Hardness */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)', minWidth: 80 }}>
            Hardness
          </span>
          <NumericUpDown
            value={brushHardness}
            onChange={setBrushHardness}
            min={0}
            max={100}
            step={1}
            width={60}
            label=""
          />
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={brushHardness}
            onChange={(e) => setBrushHardness(Number(e.target.value))}
            className="flex-1"
            style={{ accentColor: 'var(--accent-orange)' }}
            data-testid="eraser-brush-hardness-slider"
          />
        </div>

        {/* SVG Preview */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Preview
          </span>
          <div
            className="flex items-center justify-center rounded border"
            style={{
              width: 120,
              height: 120,
              backgroundColor: '#1a1a1a',
              borderColor: 'var(--border-color)',
            }}
            data-testid="eraser-brush-preview"
          >
            <svg width={120} height={120} viewBox="0 0 120 120">
              <defs>
                <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
                  <stop
                    offset={`${Math.max(0, brushHardness - 10)}%`}
                    stopColor="#fff"
                    stopOpacity={1}
                  />
                  <stop offset="100%" stopColor="#fff" stopOpacity={brushHardness >= 95 ? 1 : 0} />
                </radialGradient>
              </defs>
              {brushType === 1 ? (
                <circle
                  cx={60}
                  cy={60}
                  r={previewSize}
                  fill={`url(#${gradientId})`}
                />
              ) : (
                <rect
                  x={60 - previewSize}
                  y={60 - previewSize}
                  width={previewSize * 2}
                  height={previewSize * 2}
                  fill="#fff"
                />
              )}
            </svg>
          </div>
        </div>
      </div>
    </DialogBase>
  );
}

export default EraserSettingsWindow;
