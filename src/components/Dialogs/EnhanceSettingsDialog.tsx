import { useState, useEffect, useCallback } from 'react';
import { DialogBase } from './DialogBase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnhanceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Initial blend strength (0.0 – 1.0). */
  initialBlend?: number;
  /** Called with the final blend value (0.0 – 1.0) when the user applies. */
  onApply?: (blend: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EnhanceSettingsDialog({
  open,
  onOpenChange,
  initialBlend = 1.0,
  onApply,
}: EnhanceSettingsDialogProps) {
  // Internal state is 0–100 (integer, snapped to 5)
  const [sliderValue, setSliderValue] = useState(Math.round(initialBlend * 100));

  // Reset when the dialog opens with a new initialBlend
  useEffect(() => {
    if (open) {
      setSliderValue(Math.round(initialBlend * 100));
    }
  }, [open, initialBlend]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    // Snap to nearest 5
    const snapped = Math.round(raw / 5) * 5;
    setSliderValue(snapped);
  }, []);

  const handleApply = useCallback(() => {
    onApply?.(sliderValue / 100);
    onOpenChange(false);
  }, [sliderValue, onApply, onOpenChange]);

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={() => onOpenChange(false)}
        data-testid="enhance-settings-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={handleApply}
        data-testid="enhance-settings-apply"
      >
        Apply
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Enhance Settings"
      width={380}
      height={220}
      footer={footer}
    >
      <div className="flex flex-col gap-4 p-4" data-testid="enhance-settings-content">
        {/* Section label */}
        <span
          className="text-xs font-bold uppercase"
          style={{ color: 'var(--accent-orange)', letterSpacing: '0.05em' }}
          data-testid="enhance-section-label"
        >
          AI Face Restoration
        </span>

        {/* Blend Strength label + value */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Blend Strength
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--text-primary)' }}
            data-testid="enhance-blend-value"
          >
            {sliderValue}%
          </span>
        </div>

        {/* Slider */}
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={sliderValue}
          onChange={handleSliderChange}
          className="w-full"
          style={{ accentColor: 'var(--accent-orange)' }}
          data-testid="enhance-blend-slider"
        />

        {/* Helper text */}
        <span
          className="text-center"
          style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}
          data-testid="enhance-helper-text"
        >
          0% = original image, 100% = fully enhanced
        </span>
      </div>
    </DialogBase>
  );
}

export default EnhanceSettingsDialog;
