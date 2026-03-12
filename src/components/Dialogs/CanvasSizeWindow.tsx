import { useState } from 'react';
import * as Select from '@radix-ui/react-select';
import { DialogBase } from './DialogBase';
import { NumericUpDown } from '../common/NumericUpDown';
import { ColorSwatch } from '../common/ColorSwatch';
import { Icon } from '../common/Icon';
import { mdiChevronDown } from '@mdi/js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CanvasSizeWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWidth?: number;
  currentHeight?: number;
  onApply?: (width: number, height: number, anchor: string) => void;
}

type AnchorPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

const ANCHORS: AnchorPosition[] = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'middle-center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

const SIZE_PRESETS = [
  { label: '1920x1080', width: 1920, height: 1080 },
  { label: '1280x720', width: 1280, height: 720 },
  { label: '3840x2160', width: 3840, height: 2160 },
  { label: '1080x1080', width: 1080, height: 1080 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CanvasSizeWindow({
  open,
  onOpenChange,
  currentWidth = 1920,
  currentHeight = 1080,
  onApply,
}: CanvasSizeWindowProps) {
  const [width, setWidth] = useState(currentWidth);
  const [height, setHeight] = useState(currentHeight);
  const [anchor, setAnchor] = useState<AnchorPosition>('middle-center');
  const [bgColor, _setBgColor] = useState('#000000');
  const [preset, setPreset] = useState('1920x1080');

  const applyPreset = (val: string) => {
    setPreset(val);
    const found = SIZE_PRESETS.find((p) => p.label === val);
    if (found) {
      setWidth(found.width);
      setHeight(found.height);
    }
  };

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={() => onOpenChange(false)}
        data-testid="canvas-size-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={() => {
          onApply?.(width, height, anchor);
          onOpenChange(false);
        }}
        data-testid="canvas-size-apply"
      >
        Apply
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Canvas Size"
      width={450}
      height={350}
      footer={footer}
    >
      <div className="flex flex-col gap-4 p-4" data-testid="canvas-size-dialog-content">
        {/* Size inputs */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Width</span>
            <NumericUpDown value={width} onChange={setWidth} min={1} max={10000} suffix="px" width={80} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Height</span>
            <NumericUpDown value={height} onChange={setHeight} min={1} max={10000} suffix="px" width={80} />
          </div>
        </div>

        {/* Preset dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Preset</span>
          <Select.Root value={preset} onValueChange={applyPreset}>
            <Select.Trigger
              className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs outline-none"
              style={{ backgroundColor: '#2A2A2A', borderColor: 'var(--border-color)', color: 'var(--text-primary)', minWidth: 140 }}
              data-testid="canvas-size-preset"
            >
              <Select.Value />
              <Select.Icon><Icon path={mdiChevronDown} size={12} color="var(--text-secondary)" /></Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="overflow-hidden rounded border shadow-lg" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
                <Select.Viewport className="p-1">
                  {SIZE_PRESETS.map((p) => (
                    <Select.Item key={p.label} value={p.label} className="cursor-pointer rounded px-2 py-1 text-xs outline-none hover:bg-[var(--hover-bg)]" style={{ color: 'var(--text-primary)' }}>
                      <Select.ItemText>{p.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* Anchor position grid */}
        <div>
          <span className="mb-2 block text-xs font-semibold" style={{ color: 'var(--accent-orange)' }}>
            Anchor Position
          </span>
          <div className="grid grid-cols-3 gap-1" style={{ width: 90 }} data-testid="anchor-grid">
            {ANCHORS.map((a) => (
              <button
                key={a}
                type="button"
                className="rounded"
                style={{
                  width: 26,
                  height: 26,
                  backgroundColor: anchor === a ? 'var(--accent-orange)' : 'var(--toolbar-bg)',
                  border: `1px solid ${anchor === a ? 'var(--accent-orange)' : 'var(--border-color)'}`,
                }}
                onClick={() => setAnchor(a)}
                data-testid={`anchor-${a}`}
                title={a}
              />
            ))}
          </div>
        </div>

        {/* Background color */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Background</span>
          <ColorSwatch color={bgColor} size={22} label="canvas-bg" />
        </div>
      </div>
    </DialogBase>
  );
}

export default CanvasSizeWindow;
