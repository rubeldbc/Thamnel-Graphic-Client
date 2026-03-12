import { useState, useCallback } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { ColorSwatch } from '../common/ColorSwatch';

// ---------------------------------------------------------------------------
// Shared slider row
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
    <div className="flex items-center gap-2">
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
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b" style={{ borderColor: 'var(--border-color)' }}>
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
        {title}
      </div>
      <div className="flex flex-col gap-1.5 px-3 pb-3">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FillMode = 'solid' | 'gradient' | 'image' | 'transparent' | 'blur';
type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';

const FILL_MODES: { value: FillMode; label: string }[] = [
  { value: 'solid', label: 'Solid Color' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'image', label: 'Image' },
  { value: 'transparent', label: 'Transparent' },
  { value: 'blur', label: 'Blur Original' },
];

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
];

export interface BackgroundPanelProps {
  onChange?: (params: Record<string, unknown>) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BackgroundPanel({ onChange }: BackgroundPanelProps) {
  // Fill
  const [fillMode, setFillMode] = useState<FillMode>('solid');
  const [fillColor, setFillColor] = useState('#1A1A1A');

  // Color Tint
  const [tintColor, setTintColor] = useState('#FF6600');
  const [tintIntensity, setTintIntensity] = useState(0);

  // Blending
  const [blendMode, setBlendMode] = useState<BlendMode>('normal');
  const [blendOpacity, setBlendOpacity] = useState(100);

  // Pixel Effects
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [blur, setBlur] = useState(0);

  const notify = useCallback(
    (key: string, value: unknown) => {
      onChange?.({ [key]: value });
    },
    [onChange],
  );

  return (
    <div data-testid="background-panel" className="flex flex-col">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-status-blue">
        Background
      </div>

      {/* Fill Mode */}
      <Section title="Fill Mode">
        <div className="flex flex-wrap gap-1">
          {FILL_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              className="rounded px-2 py-1 text-xs"
              style={{
                backgroundColor: fillMode === mode.value ? 'var(--accent-orange)' : 'var(--toolbar-bg)',
                color: fillMode === mode.value ? '#fff' : 'var(--text-secondary)',
              }}
              onClick={() => { setFillMode(mode.value); notify('fillMode', mode.value); }}
            >
              {mode.label}
            </button>
          ))}
        </div>
        {fillMode === 'solid' && (
          <div className="mt-1 flex items-center gap-2">
            <span className="min-w-[72px] select-none text-text-secondary" style={{ fontSize: 11 }}>
              Color
            </span>
            <ColorSwatch
              color={fillColor}
              size={18}
              label="Fill Color"
              onClick={() => {
                const c = fillColor === '#1A1A1A' ? '#FFFFFF' : '#1A1A1A';
                setFillColor(c);
                notify('fillColor', c);
              }}
            />
          </div>
        )}
      </Section>

      {/* Color Tint */}
      <Section title="Color Tint">
        <div className="flex items-center gap-2">
          <span className="min-w-[72px] select-none text-text-secondary" style={{ fontSize: 11 }}>
            Color
          </span>
          <ColorSwatch
            color={tintColor}
            size={18}
            label="Tint Color"
            onClick={() => {
              const c = tintColor === '#FF6600' ? '#0088FF' : '#FF6600';
              setTintColor(c);
              notify('tintColor', c);
            }}
          />
        </div>
        <SliderRow
          label="Intensity"
          value={tintIntensity}
          min={0}
          max={100}
          onChange={(v) => { setTintIntensity(v); notify('tintIntensity', v); }}
        />
      </Section>

      {/* Blending */}
      <Section title="Blending">
        <div className="flex items-center gap-2">
          <span className="min-w-[72px] select-none text-text-secondary" style={{ fontSize: 11 }}>
            Mode
          </span>
          <select
            value={blendMode}
            onChange={(e) => { setBlendMode(e.target.value as BlendMode); notify('blendMode', e.target.value); }}
            className="flex-1 rounded border px-2 py-1 text-xs outline-none"
            style={{
              backgroundColor: 'var(--toolbar-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            {BLEND_MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <SliderRow
          label="Opacity"
          value={blendOpacity}
          min={0}
          max={100}
          onChange={(v) => { setBlendOpacity(v); notify('blendOpacity', v); }}
        />
      </Section>

      {/* Pixel Effects & Color Adjustments */}
      <Section title="Pixel Effects">
        <SliderRow label="Brightness" value={brightness} min={-100} max={100} onChange={(v) => { setBrightness(v); notify('bgBrightness', v); }} />
        <SliderRow label="Contrast" value={contrast} min={-100} max={100} onChange={(v) => { setContrast(v); notify('bgContrast', v); }} />
        <SliderRow label="Saturation" value={saturation} min={-100} max={100} onChange={(v) => { setSaturation(v); notify('bgSaturation', v); }} />
        <SliderRow label="Blur" value={blur} min={0} max={100} onChange={(v) => { setBlur(v); notify('bgBlur', v); }} />
      </Section>
    </div>
  );
}

export default BackgroundPanel;
