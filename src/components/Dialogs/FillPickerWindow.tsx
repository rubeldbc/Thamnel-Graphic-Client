import { useState, useCallback } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';
import { DialogBase } from './DialogBase';
import { NumericUpDown } from '../common/NumericUpDown';
import { ColorSwatch } from '../common/ColorSwatch';
import { Icon } from '../common/Icon';
import { mdiChevronDown } from '@mdi/js';
import type { FillDefinition } from '../../types/FillDefinition';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FillPickerWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the fill definition when OK is pressed. */
  onOk?: (fill: FillDefinition) => void;
  /** Initial fill definition to edit. */
  initialFill?: Partial<FillDefinition>;
}

type TabId = 'solid' | 'gradient' | 'image-fill';
type GradientType = 'Linear' | 'Radial' | 'Sweep';

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'image-fill', label: 'Image Fill' },
];

const STRETCH_MODES = ['Tile', 'Stretch', 'Fit', 'Fill'];

interface GradientStop {
  id: string;
  color: string;
  position: number; // 0-100
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FillPickerWindow({ open, onOpenChange, onOk, initialFill }: FillPickerWindowProps) {
  const [activeTab, setActiveTab] = useState<TabId>('solid');

  // Solid
  const [solidColor, setSolidColor] = useState(initialFill?.solidColor ?? '#FF6600');
  const [solidHex, setSolidHex] = useState(initialFill?.solidColor ?? '#FF6600');
  const [solidOpacity, setSolidOpacity] = useState(Math.round((initialFill?.globalAlpha ?? 1) * 100));

  // Gradient
  const [gradientType, setGradientType] = useState<GradientType>('Linear');
  const [gradientAngle, setGradientAngle] = useState(initialFill?.gradientAngle ?? 90);
  const [gradientCenterX, setGradientCenterX] = useState(initialFill?.gradientCenterX ?? 0.5);
  const [gradientCenterY, setGradientCenterY] = useState(initialFill?.gradientCenterY ?? 0.5);
  const [stops, setStops] = useState<GradientStop[]>(() => {
    if (initialFill?.gradientStops && initialFill.gradientStops.length > 0) {
      return initialFill.gradientStops.map((s, i) => ({
        id: String(i + 1),
        color: s.color,
        position: Math.round(s.position * 100),
      }));
    }
    return [
      { id: '1', color: '#FF6600', position: 0 },
      { id: '2', color: '#FFFFFF', position: 100 },
    ];
  });
  const [selectedStopId, setSelectedStopId] = useState<string>('1');

  // Image fill
  const [imgStretchMode, setImgStretchMode] = useState('Stretch');
  const [imgOpacity, setImgOpacity] = useState(100);
  const [imgOffsetX, setImgOffsetX] = useState(0);
  const [imgOffsetY, setImgOffsetY] = useState(0);
  const [imgScale, setImgScale] = useState(100);

  // Gradient bar CSS
  const gradientBarCss = stops
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.color} ${s.position}%`)
    .join(', ');

  const selectedStop = stops.find((s) => s.id === selectedStopId);

  const handleGradientBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!e.ctrlKey) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const newId = String(Date.now());
    setStops((prev) => [...prev, { id: newId, color: '#888888', position: pos }]);
    setSelectedStopId(newId);
  };

  const removeStop = useCallback(() => {
    if (stops.length <= 2) return; // Need at least 2 stops
    setStops((prev) => prev.filter((s) => s.id !== selectedStopId));
    setSelectedStopId(stops[0]?.id ?? '1');
  }, [stops, selectedStopId]);

  // Build FillDefinition from current state
  const buildFillDefinition = useCallback((): FillDefinition => {
    const fillTypeMap = {
      solid: 'solid' as const,
      gradient: gradientType === 'Linear' ? 'linearGradient' as const : gradientType === 'Radial' ? 'radialGradient' as const : 'sweepGradient' as const,
      'image-fill': 'image' as const,
    };

    const stretchMap: Record<string, 'tile' | 'stretch' | 'fit' | 'fill'> = {
      Tile: 'tile',
      Stretch: 'stretch',
      Fit: 'fit',
      Fill: 'fill',
    };

    return {
      type: fillTypeMap[activeTab],
      solidColor,
      gradientStops: stops
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((s) => ({ color: s.color, position: s.position / 100 })),
      gradientAngle,
      gradientCenterX,
      gradientCenterY,
      gradientRadius: 0.5,
      imagePath: null,
      imageStretch: stretchMap[imgStretchMode] ?? 'fill',
      globalAlpha: activeTab === 'solid' ? solidOpacity / 100 : imgOpacity / 100,
    };
  }, [activeTab, solidColor, solidOpacity, stops, gradientAngle, gradientCenterX, gradientCenterY, gradientType, imgStretchMode, imgOpacity]);

  // Preview: compute fill preview background
  let previewBg: string;
  if (activeTab === 'solid') {
    previewBg = solidColor;
  } else if (activeTab === 'gradient') {
    if (gradientType === 'Radial') {
      previewBg = `radial-gradient(circle, ${gradientBarCss})`;
    } else if (gradientType === 'Sweep') {
      previewBg = `conic-gradient(from ${gradientAngle}deg, ${gradientBarCss})`;
    } else {
      previewBg = `linear-gradient(${gradientAngle}deg, ${gradientBarCss})`;
    }
  } else {
    previewBg = 'repeating-conic-gradient(#808080 0% 25%, #606060 0% 50%) 50% / 16px 16px';
  }

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={() => onOpenChange(false)}
        data-testid="fill-picker-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={() => {
          onOk?.(buildFillDefinition());
          onOpenChange(false);
        }}
        data-testid="fill-picker-ok"
      >
        OK
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Fill Picker"
      width={580}
      height={700}
      footer={footer}
    >
      <div className="flex h-full flex-col" data-testid="fill-picker-dialog-content">
        {/* Preview strip */}
        <div
          className="shrink-0 border-b"
          style={{
            height: 48,
            borderColor: 'var(--border-color)',
            background: previewBg,
          }}
          data-testid="fill-preview-strip"
        />

        <Tabs.Root
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabId)}
          className="flex flex-1 flex-col"
        >
          <Tabs.List
            className="flex shrink-0 border-b"
            style={{ borderColor: 'var(--border-color)' }}
            data-testid="fill-picker-tabs"
          >
            {TABS.map((t) => (
              <Tabs.Trigger
                key={t.id}
                value={t.id}
                className="flex-1 px-3 py-2 text-xs font-medium outline-none"
                style={{
                  color: activeTab === t.id ? 'var(--accent-orange)' : 'var(--text-secondary)',
                  borderBottom: activeTab === t.id ? '2px solid var(--accent-orange)' : '2px solid transparent',
                  backgroundColor: 'transparent',
                }}
                data-testid={`fill-tab-${t.id}`}
              >
                {t.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* ---- Solid tab ---- */}
          <Tabs.Content value="solid" className="flex-1 overflow-auto p-4" data-testid="fill-solid-tab">
            <div className="flex gap-4">
              {/* Color area placeholder */}
              <div
                className="cursor-crosshair rounded"
                style={{
                  width: 200,
                  height: 200,
                  background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${solidColor})`,
                }}
                data-testid="solid-color-area"
              />
              <div className="flex flex-col gap-3">
                <div>
                  <span className="mb-1 block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Hex</span>
                  <input
                    type="text"
                    value={solidHex}
                    onChange={(e) => {
                      setSolidHex(e.target.value);
                      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                        setSolidColor(e.target.value);
                      }
                    }}
                    className="rounded border px-2 py-1 text-xs outline-none"
                    style={{ width: 90, backgroundColor: '#2A2A2A', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    data-testid="solid-hex-input"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Opacity</span>
                  <NumericUpDown value={solidOpacity} onChange={setSolidOpacity} min={0} max={100} suffix="%" width={60} />
                </div>
                <ColorSwatch color={solidColor} size={32} label="solid-preview" />
              </div>
            </div>
          </Tabs.Content>

          {/* ---- Gradient tab ---- */}
          <Tabs.Content value="gradient" className="flex-1 overflow-auto p-4" data-testid="fill-gradient-tab">
            {/* Type toggle */}
            <div className="mb-3 flex gap-1" data-testid="gradient-type-toggle">
              {(['Linear', 'Radial', 'Sweep'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className="rounded px-3 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: gradientType === t ? 'var(--accent-orange)' : 'var(--toolbar-bg)',
                    color: gradientType === t ? '#fff' : 'var(--text-secondary)',
                  }}
                  onClick={() => setGradientType(t)}
                  data-testid={`gradient-type-${t.toLowerCase()}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Angle */}
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Angle</span>
              <NumericUpDown value={gradientAngle} onChange={setGradientAngle} min={0} max={360} suffix="\u00B0" width={60} />
            </div>

            {/* Center (for radial/sweep) */}
            {(gradientType === 'Radial' || gradientType === 'Sweep') && (
              <div className="mb-3 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Center X</span>
                  <NumericUpDown value={Math.round(gradientCenterX * 100)} onChange={(v) => setGradientCenterX(v / 100)} min={0} max={100} suffix="%" width={60} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Center Y</span>
                  <NumericUpDown value={Math.round(gradientCenterY * 100)} onChange={(v) => setGradientCenterY(v / 100)} min={0} max={100} suffix="%" width={60} />
                </div>
              </div>
            )}

            {/* Gradient bar with stops */}
            <div className="mb-3">
              <span className="mb-1 block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Gradient Bar (Ctrl+Click to add stop)
              </span>
              <div
                className="relative cursor-pointer rounded"
                style={{
                  height: 24,
                  background: `linear-gradient(to right, ${gradientBarCss})`,
                  border: '1px solid var(--border-color)',
                }}
                onClick={handleGradientBarClick}
                data-testid="gradient-bar"
              >
                {stops.map((stop) => (
                  <div
                    key={stop.id}
                    className="absolute top-0 cursor-pointer"
                    style={{
                      left: `${stop.position}%`,
                      transform: 'translateX(-50%)',
                      width: 10,
                      height: 24,
                      borderRadius: 2,
                      border: selectedStopId === stop.id ? '2px solid #fff' : '1px solid #888',
                      backgroundColor: stop.color,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStopId(stop.id);
                    }}
                    data-testid={`gradient-stop-${stop.id}`}
                  />
                ))}
              </div>
            </div>

            {/* Stop editor */}
            {selectedStop && (
              <div className="flex items-end gap-3" data-testid="stop-editor">
                <div>
                  <span className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>Color</span>
                  <ColorSwatch
                    color={selectedStop.color}
                    size={24}
                    label="stop-color"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs" style={{ color: 'var(--text-secondary)' }}>Position</span>
                  <NumericUpDown
                    value={selectedStop.position}
                    onChange={(v) =>
                      setStops((prev) =>
                        prev.map((s) => (s.id === selectedStopId ? { ...s, position: v } : s)),
                      )
                    }
                    min={0}
                    max={100}
                    suffix="%"
                    width={60}
                  />
                </div>
                {stops.length > 2 && (
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-xs"
                    style={{ backgroundColor: 'var(--toolbar-bg)', color: 'var(--text-secondary)' }}
                    onClick={removeStop}
                    data-testid="remove-stop"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </Tabs.Content>

          {/* ---- Image Fill tab ---- */}
          <Tabs.Content value="image-fill" className="flex-1 overflow-auto p-4" data-testid="fill-image-tab">
            <div className="mb-3">
              <span className="mb-1 block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Image</span>
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-xs"
                style={{ borderColor: 'var(--border-color)', backgroundColor: '#2A2A2A', color: 'var(--text-secondary)' }}
                data-testid="fill-image-selector"
              >
                Select Image...
              </button>
            </div>

            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Stretch Mode</span>
              <Select.Root value={imgStretchMode} onValueChange={setImgStretchMode}>
                <Select.Trigger
                  className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs outline-none"
                  style={{ backgroundColor: '#2A2A2A', borderColor: 'var(--border-color)', color: 'var(--text-primary)', minWidth: 100 }}
                  data-testid="fill-stretch-select"
                >
                  <Select.Value />
                  <Select.Icon><Icon path={mdiChevronDown} size={12} color="var(--text-secondary)" /></Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="overflow-hidden rounded border shadow-lg" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
                    <Select.Viewport className="p-1">
                      {STRETCH_MODES.map((m) => (
                        <Select.Item key={m} value={m} className="cursor-pointer rounded px-2 py-1 text-xs outline-none hover:bg-[var(--hover-bg)]" style={{ color: 'var(--text-primary)' }}>
                          <Select.ItemText>{m}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Opacity</span>
              <NumericUpDown value={imgOpacity} onChange={setImgOpacity} min={0} max={100} suffix="%" width={60} />
            </div>

            {/* Offset / Scale controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Offset X</span>
                <NumericUpDown value={imgOffsetX} onChange={setImgOffsetX} min={-1000} max={1000} suffix="px" width={70} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Offset Y</span>
                <NumericUpDown value={imgOffsetY} onChange={setImgOffsetY} min={-1000} max={1000} suffix="px" width={70} />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Scale</span>
              <NumericUpDown value={imgScale} onChange={setImgScale} min={1} max={1000} suffix="%" width={70} />
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </DialogBase>
  );
}

export default FillPickerWindow;
