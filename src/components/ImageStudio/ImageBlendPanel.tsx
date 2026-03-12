import { useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import type { BlendMode } from '../../types/enums';
import { BLEND_MODES } from '../../types/enums';

export interface ImageBlendPanelProps {
  onApply?: (params: { blendMode: BlendMode; opacity: number }) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImageBlendPanel({ onApply }: ImageBlendPanelProps) {
  const [blendMode, setBlendMode] = useState<BlendMode>('normal');
  const [opacity, setOpacity] = useState(100);

  return (
    <div data-testid="image-blend-panel" className="flex flex-col">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
        Image Blend
      </div>

      <div className="flex flex-col gap-3 px-3 pb-3">
        {/* Source selector placeholder */}
        <div className="flex items-center gap-2">
          <span className="min-w-[72px] select-none text-text-secondary" style={{ fontSize: 11 }}>
            Source
          </span>
          <div
            className="flex-1 rounded border px-2 py-1 text-xs text-text-disabled"
            style={{
              backgroundColor: 'var(--toolbar-bg)',
              borderColor: 'var(--border-color)',
            }}
            data-testid="blend-source-selector"
          >
            Select source image...
          </div>
        </div>

        {/* Blend mode */}
        <div className="flex items-center gap-2">
          <span className="min-w-[72px] select-none text-text-secondary" style={{ fontSize: 11 }}>
            Blend Mode
          </span>
          <select
            value={blendMode}
            onChange={(e) => setBlendMode(e.target.value as BlendMode)}
            className="flex-1 rounded border px-2 py-1 text-xs outline-none"
            style={{
              backgroundColor: 'var(--toolbar-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
            data-testid="blend-mode-select"
          >
            {BLEND_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Opacity slider */}
        <div className="flex items-center gap-2">
          <span className="min-w-[72px] select-none text-text-secondary" style={{ fontSize: 11 }}>
            Opacity
          </span>
          <Slider.Root
            className="relative flex h-4 flex-1 items-center"
            value={[opacity]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => setOpacity(v)}
          >
            <Slider.Track
              className="relative h-[3px] flex-1 rounded-full"
              style={{ backgroundColor: 'var(--border-color)' }}
            >
              <Slider.Range
                className="absolute h-full rounded-full"
                style={{ backgroundColor: 'var(--accent-orange)' }}
              />
            </Slider.Track>
            <Slider.Thumb
              className="block rounded-full outline-none"
              style={{ width: 10, height: 10, backgroundColor: 'var(--text-primary)' }}
            />
          </Slider.Root>
          <span className="min-w-[32px] text-right text-text-secondary" style={{ fontSize: 11 }}>
            {opacity}%
          </span>
        </div>

        {/* Apply button */}
        <button
          type="button"
          className="w-full rounded px-3 py-1.5 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--accent-orange)' }}
          onClick={() => onApply?.({ blendMode, opacity })}
          data-testid="apply-blend-button"
        >
          Apply Blend
        </button>
      </div>
    </div>
  );
}

export default ImageBlendPanel;
