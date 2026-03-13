import { useState, useEffect } from 'react';
import { DialogBase } from './DialogBase';
import { NumericUpDown } from '../common/NumericUpDown';
import { useSettingsStore } from '../../settings/settingsStore';
import { useUiStore } from '../../stores/uiStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StarSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Internal: SliderRow
// ---------------------------------------------------------------------------

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step ?? 1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            flex: 1,
            accentColor: 'var(--accent-orange)',
            cursor: 'pointer',
          }}
        />
        <NumericUpDown
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          step={step ?? 1}
          suffix={suffix}
          width={60}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StarSettingsDialog({ open, onOpenChange }: StarSettingsDialogProps) {
  const getSetting = useSettingsStore((s) => s.getSetting);
  const setSetting = useSettingsStore((s) => s.setSetting);

  const [spikeCount, setSpikeCount] = useState(5);
  const [spikeHigh, setSpikeHigh] = useState(50);
  const [spikeLow, setSpikeLow] = useState(25);

  // Load settings when dialog opens
  useEffect(() => {
    if (open) {
      setSpikeCount((getSetting('shapeTool.starSpikeCount') as number) ?? 5);
      setSpikeHigh((getSetting('shapeTool.starSpikeHigh') as number) ?? 50);
      setSpikeLow((getSetting('shapeTool.starSpikeLow') as number) ?? 25);
    }
  }, [open, getSetting]);

  const handleOk = () => {
    // Save to settings
    setSetting('shapeTool.starSpikeCount', spikeCount);
    setSetting('shapeTool.starSpikeHigh', spikeHigh);
    setSetting('shapeTool.starSpikeLow', spikeLow);

    // Apply to uiStore for immediate use
    useUiStore.getState().setDrawPolygonSides(spikeCount);
    const ratio = spikeHigh > 0 ? spikeLow / spikeHigh : 0.5;
    useUiStore.getState().setStarInnerRatio(ratio);

    onOpenChange(false);
  };

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={handleOk}
      >
        OK
      </button>
    </>
  );

  // Live preview of the star shape
  const ratio = spikeHigh > 0 ? spikeLow / spikeHigh : 0.5;
  const previewSize = 120;
  const cx = previewSize / 2;
  const cy = previewSize / 2;
  const outerR = previewSize / 2 - 4;
  const innerR = outerR * ratio;

  // Generate star path
  const starPoints: string[] = [];
  const step = Math.PI / spikeCount;
  let angle = -Math.PI / 2;
  for (let i = 0; i < spikeCount * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    starPoints.push(`${x},${y}`);
    angle += step;
  }

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Star Settings"
      width={320}
      footer={footer}
    >
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Star preview */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: 8,
          }}
        >
          <svg
            width={previewSize}
            height={previewSize}
            viewBox={`0 0 ${previewSize} ${previewSize}`}
            style={{ border: '1px solid var(--border-color)', borderRadius: 4, backgroundColor: '#1a1a1a' }}
          >
            <polygon
              points={starPoints.join(' ')}
              fill="var(--accent-orange)"
              stroke="#fff"
              strokeWidth={1}
              opacity={0.8}
            />
          </svg>
        </div>

        {/* Sliders */}
        <SliderRow
          label="Spike Count"
          value={spikeCount}
          min={3}
          max={24}
          onChange={setSpikeCount}
        />
        <SliderRow
          label="Spike High (px)"
          value={spikeHigh}
          min={10}
          max={200}
          suffix="px"
          onChange={setSpikeHigh}
        />
        <SliderRow
          label="Spike Low (px)"
          value={spikeLow}
          min={5}
          max={200}
          suffix="px"
          onChange={setSpikeLow}
        />
      </div>
    </DialogBase>
  );
}

export default StarSettingsDialog;
