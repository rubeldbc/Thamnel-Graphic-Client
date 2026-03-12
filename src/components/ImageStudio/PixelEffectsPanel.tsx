import { useState, useCallback } from 'react';
import * as Slider from '@radix-ui/react-slider';

// ---------------------------------------------------------------------------
// Slider row helper
// ---------------------------------------------------------------------------

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2" data-testid={`slider-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <span className="min-w-[72px] select-none text-text-secondary" style={{ fontSize: 11 }}>
        {label}
      </span>
      <Slider.Root
        className="relative flex h-4 flex-1 items-center"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
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
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColorAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  temperature: number;
}

export interface ImageEffects {
  sharpen: number;
  vignette: number;
  grain: number;
  blur: number;
}

export interface PixelEffectsPanelProps {
  colorAdjustments?: ColorAdjustments;
  imageEffects?: ImageEffects;
  onColorAdjustmentsChange?: (adjustments: ColorAdjustments) => void;
  onImageEffectsChange?: (effects: ImageEffects) => void;
}

const DEFAULT_COLOR_ADJUSTMENTS: ColorAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  temperature: 0,
};

const DEFAULT_IMAGE_EFFECTS: ImageEffects = {
  sharpen: 0,
  vignette: 0,
  grain: 0,
  blur: 0,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PixelEffectsPanel({
  colorAdjustments: externalColors,
  imageEffects: externalEffects,
  onColorAdjustmentsChange,
  onImageEffectsChange,
}: PixelEffectsPanelProps) {
  const [colors, setColors] = useState<ColorAdjustments>(externalColors ?? { ...DEFAULT_COLOR_ADJUSTMENTS });
  const [effects, setEffects] = useState<ImageEffects>(externalEffects ?? { ...DEFAULT_IMAGE_EFFECTS });

  const updateColor = useCallback(
    (key: keyof ColorAdjustments, value: number) => {
      setColors((prev) => {
        const next = { ...prev, [key]: value };
        onColorAdjustmentsChange?.(next);
        return next;
      });
    },
    [onColorAdjustmentsChange],
  );

  const updateEffect = useCallback(
    (key: keyof ImageEffects, value: number) => {
      setEffects((prev) => {
        const next = { ...prev, [key]: value };
        onImageEffectsChange?.(next);
        return next;
      });
    },
    [onImageEffectsChange],
  );

  const resetColors = useCallback(() => {
    const defaults = { ...DEFAULT_COLOR_ADJUSTMENTS };
    setColors(defaults);
    onColorAdjustmentsChange?.(defaults);
  }, [onColorAdjustmentsChange]);

  const resetEffects = useCallback(() => {
    const defaults = { ...DEFAULT_IMAGE_EFFECTS };
    setEffects(defaults);
    onImageEffectsChange?.(defaults);
  }, [onImageEffectsChange]);

  return (
    <div data-testid="pixel-effects-panel" className="flex flex-col">
      {/* Color Adjustments */}
      <div className="border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Color Adjustments
          </span>
          <button
            type="button"
            onClick={resetColors}
            className="rounded px-2 py-0.5 text-xs text-text-secondary hover:text-text-primary"
            style={{ backgroundColor: 'var(--toolbar-bg)' }}
            data-testid="reset-color-adjustments"
          >
            Reset
          </button>
        </div>
        <div className="flex flex-col gap-1.5 px-3 pb-3">
          <SliderRow label="Brightness" value={colors.brightness} min={-100} max={100} onChange={(v) => updateColor('brightness', v)} />
          <SliderRow label="Contrast" value={colors.contrast} min={-100} max={100} onChange={(v) => updateColor('contrast', v)} />
          <SliderRow label="Saturation" value={colors.saturation} min={-100} max={100} onChange={(v) => updateColor('saturation', v)} />
          <SliderRow label="Hue" value={colors.hue} min={0} max={360} onChange={(v) => updateColor('hue', v)} />
          <SliderRow label="Temperature" value={colors.temperature} min={-100} max={100} onChange={(v) => updateColor('temperature', v)} />
        </div>
      </div>

      {/* Image Effects */}
      <div>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Image Effects
          </span>
          <button
            type="button"
            onClick={resetEffects}
            className="rounded px-2 py-0.5 text-xs text-text-secondary hover:text-text-primary"
            style={{ backgroundColor: 'var(--toolbar-bg)' }}
            data-testid="reset-image-effects"
          >
            Reset
          </button>
        </div>
        <div className="flex flex-col gap-1.5 px-3 pb-3">
          <SliderRow label="Sharpen" value={effects.sharpen} min={0} max={100} onChange={(v) => updateEffect('sharpen', v)} />
          <SliderRow label="Vignette" value={effects.vignette} min={0} max={100} onChange={(v) => updateEffect('vignette', v)} />
          <SliderRow label="Grain" value={effects.grain} min={0} max={100} onChange={(v) => updateEffect('grain', v)} />
          <SliderRow label="Blur" value={effects.blur} min={0} max={100} onChange={(v) => updateEffect('blur', v)} />
        </div>
      </div>
    </div>
  );
}

export default PixelEffectsPanel;
