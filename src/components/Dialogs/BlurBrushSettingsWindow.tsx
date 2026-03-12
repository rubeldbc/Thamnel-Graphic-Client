import { useState, useMemo } from 'react';
import { DialogBase } from './DialogBase';
import { NumericUpDown } from '../common/NumericUpDown';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlurBrushSettingsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 0 = block, 1 = circle */
  initialBrushType?: number;
  initialBrushSize?: number;
  initialBrushHardness?: number;
  initialBlurRadius?: number;
  initialOpacity?: number;
  onApply?: (settings: {
    brushType: number;
    brushSize: number;
    brushHardness: number;
    blurRadius: number;
    opacity: number;
  }) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BlurBrushSettingsWindow({
  open,
  onOpenChange,
  initialBrushType = 1,
  initialBrushSize = 30,
  initialBrushHardness = 80,
  initialBlurRadius = 15,
  initialOpacity = 100,
  onApply,
}: BlurBrushSettingsWindowProps) {
  const [brushType, setBrushType] = useState(initialBrushType);
  const [brushSize, setBrushSize] = useState(initialBrushSize);
  const [brushHardness, setBrushHardness] = useState(initialBrushHardness);
  const [blurRadius, setBlurRadius] = useState(initialBlurRadius);
  const [opacity, setOpacity] = useState(initialOpacity);

  // Clamp preview size to 4-50px range
  const previewSize = useMemo(
    () => Math.max(4, Math.min(50, brushSize)),
    [brushSize],
  );

  const gradientId = 'blur-brush-gradient';
  // Deep Sky Blue
  const brushColor = 'rgb(0,191,255)';

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={() => onOpenChange(false)}
        data-testid="blur-brush-settings-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={() => {
          onApply?.({ brushType, brushSize, brushHardness, blurRadius, opacity });
          onOpenChange(false);
        }}
        data-testid="blur-brush-settings-apply"
      >
        Apply
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Blur Brush Settings"
      width={380}
      footer={footer}
    >
      <div className="flex flex-col gap-4 p-4" data-testid="blur-brush-settings-content">
        {/* Section label */}
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--accent-orange)' }}
        >
          BLUR BRUSH SETTINGS
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
              data-testid="blur-brush-type-block"
            >
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
              data-testid="blur-brush-type-circle"
            >
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
            data-testid="blur-brush-size-slider"
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
            data-testid="blur-brush-hardness-slider"
          />
        </div>

        {/* Blur Radius */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)', minWidth: 80 }}>
            Blur Radius
          </span>
          <NumericUpDown
            value={blurRadius}
            onChange={setBlurRadius}
            min={1}
            max={100}
            step={1}
            width={60}
            label=""
          />
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={blurRadius}
            onChange={(e) => setBlurRadius(Number(e.target.value))}
            className="flex-1"
            style={{ accentColor: 'var(--accent-orange)' }}
            data-testid="blur-brush-radius-slider"
          />
        </div>

        {/* Opacity */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)', minWidth: 80 }}>
            Opacity
          </span>
          <NumericUpDown
            value={opacity}
            onChange={setOpacity}
            min={1}
            max={100}
            step={1}
            width={60}
            suffix="%"
            label=""
          />
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="flex-1"
            style={{ accentColor: 'var(--accent-orange)' }}
            data-testid="blur-brush-opacity-slider"
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
            data-testid="blur-brush-preview"
          >
            <svg width={120} height={120} viewBox="0 0 120 120">
              <defs>
                <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
                  <stop
                    offset={`${Math.max(0, brushHardness - 10)}%`}
                    stopColor={brushColor}
                    stopOpacity={opacity / 100}
                  />
                  <stop
                    offset="100%"
                    stopColor={brushColor}
                    stopOpacity={brushHardness >= 95 ? opacity / 100 : 0}
                  />
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
                  fill={brushColor}
                  opacity={opacity / 100}
                />
              )}
            </svg>
          </div>
        </div>
      </div>
    </DialogBase>
  );
}

export default BlurBrushSettingsWindow;
