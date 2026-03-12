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

type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';

const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
];

export interface ForegroundPanelProps {
  onChange?: (params: Record<string, unknown>) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ForegroundPanel({ onChange }: ForegroundPanelProps) {
  // Cinematic
  const [rimLightColor, setRimLightColor] = useState('#FFFFFF');
  const [rimLightAngle, setRimLightAngle] = useState(0);
  const [rimLightIntensity, setRimLightIntensity] = useState(50);
  const [splitToneHighlight, setSplitToneHighlight] = useState('#FFD700');
  const [splitToneShadow, setSplitToneShadow] = useState('#4169E1');

  // Pixel Effects
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [sharpen, setSharpen] = useState(0);

  // Stroke
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);

  // Blending
  const [blendMode, setBlendMode] = useState<BlendMode>('normal');
  const [blendOpacity, setBlendOpacity] = useState(100);

  const notify = useCallback(
    (key: string, value: unknown) => {
      onChange?.({ [key]: value });
    },
    [onChange],
  );

  return (
    <div data-testid="foreground-panel" className="flex flex-col">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-accent-orange">
        Foreground
      </div>

      {/* Cinematic */}
      <Section title="Cinematic">
        <div className="flex items-center gap-2">
          <span className="min-w-[72px] select-none text-text-secondary" style={{ fontSize: 11 }}>
            Rim Light
          </span>
          <ColorSwatch
            color={rimLightColor}
            size={18}
            label="Rim Light"
            onClick={() => {
              const c = rimLightColor === '#FFFFFF' ? '#FF6600' : '#FFFFFF';
              setRimLightColor(c);
              notify('rimLightColor', c);
            }}
          />
        </div>
        <SliderRow
          label="Angle"
          value={rimLightAngle}
          min={0}
          max={360}
          onChange={(v) => { setRimLightAngle(v); notify('rimLightAngle', v); }}
        />
        <SliderRow
          label="Intensity"
          value={rimLightIntensity}
          min={0}
          max={100}
          onChange={(v) => { setRimLightIntensity(v); notify('rimLightIntensity', v); }}
        />
        <div className="flex items-center gap-2">
          <span className="min-w-[72px] select-none text-text-secondary" style={{ fontSize: 11 }}>
            Split Tone
          </span>
          <ColorSwatch
            color={splitToneHighlight}
            size={18}
            label="Highlight"
            onClick={() => {
              const c = splitToneHighlight === '#FFD700' ? '#FF0000' : '#FFD700';
              setSplitToneHighlight(c);
              notify('splitToneHighlight', c);
            }}
          />
          <ColorSwatch
            color={splitToneShadow}
            size={18}
            label="Shadow"
            onClick={() => {
              const c = splitToneShadow === '#4169E1' ? '#0000FF' : '#4169E1';
              setSplitToneShadow(c);
              notify('splitToneShadow', c);
            }}
          />
        </div>
      </Section>

      {/* Pixel Effects / Color Adjustments */}
      <Section title="Pixel Effects">
        <SliderRow label="Brightness" value={brightness} min={-100} max={100} onChange={(v) => { setBrightness(v); notify('brightness', v); }} />
        <SliderRow label="Contrast" value={contrast} min={-100} max={100} onChange={(v) => { setContrast(v); notify('contrast', v); }} />
        <SliderRow label="Saturation" value={saturation} min={-100} max={100} onChange={(v) => { setSaturation(v); notify('saturation', v); }} />
        <SliderRow label="Sharpen" value={sharpen} min={0} max={100} onChange={(v) => { setSharpen(v); notify('sharpen', v); }} />
      </Section>

      {/* Stroke */}
      <Section title="Stroke">
        <div className="flex items-center gap-2">
          <span className="min-w-[72px] select-none text-text-secondary" style={{ fontSize: 11 }}>
            Color
          </span>
          <ColorSwatch
            color={strokeColor}
            size={18}
            label="Stroke Color"
            onClick={() => {
              const c = strokeColor === '#000000' ? '#FF6600' : '#000000';
              setStrokeColor(c);
              notify('strokeColor', c);
            }}
          />
        </div>
        <SliderRow
          label="Width"
          value={strokeWidth}
          min={0}
          max={20}
          onChange={(v) => { setStrokeWidth(v); notify('strokeWidth', v); }}
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
    </div>
  );
}

export default ForegroundPanel;
