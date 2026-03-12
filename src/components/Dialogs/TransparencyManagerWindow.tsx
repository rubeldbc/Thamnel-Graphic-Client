import { useState, useEffect, useRef, useCallback } from 'react';
import { DialogBase } from './DialogBase';
import { NumericUpDown } from '../common/NumericUpDown';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransparencySettings {
  maskType: 'none' | 'linear' | 'radial';
  top: number;
  bottom: number;
  left: number;
  right: number;
  centerX: number;
  centerY: number;
}

export interface TransparencyManagerWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMaskType?: 'none' | 'linear' | 'radial';
  initialTop?: number;
  initialBottom?: number;
  initialLeft?: number;
  initialRight?: number;
  initialCenterX?: number;
  initialCenterY?: number;
  onChange?: (settings: TransparencySettings) => void;
  onOk?: (settings: TransparencySettings) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MASK_TYPES: { value: TransparencySettings['maskType']; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'linear', label: 'Linear' },
  { value: 'radial', label: 'Radial' },
];

const labelStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 11,
  minWidth: 60,
};

const sectionStyle: React.CSSProperties = {
  color: 'var(--accent-orange)',
  fontSize: 11,
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  backgroundColor: '#2A2A2A',
  borderColor: 'var(--border-color)',
  color: 'var(--text-primary)',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TransparencyManagerWindow({
  open,
  onOpenChange,
  initialMaskType = 'none',
  initialTop = 0,
  initialBottom = 0,
  initialLeft = 0,
  initialRight = 0,
  initialCenterX = 0.5,
  initialCenterY = 0.5,
  onChange,
  onOk,
}: TransparencyManagerWindowProps) {
  const [maskType, setMaskType] = useState<TransparencySettings['maskType']>(initialMaskType);
  const [top, setTop] = useState(initialTop);
  const [bottom, setBottom] = useState(initialBottom);
  const [left, setLeft] = useState(initialLeft);
  const [right, setRight] = useState(initialRight);
  const [centerX, setCenterX] = useState(initialCenterX);
  const [centerY, setCenterY] = useState(initialCenterY);

  // Debounced onChange
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSettings = useCallback((): TransparencySettings => ({
    maskType, top, bottom, left, right, centerX, centerY,
  }), [maskType, top, bottom, left, right, centerX, centerY]);

  useEffect(() => {
    if (!onChange) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(getSettings());
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [maskType, top, bottom, left, right, centerX, centerY, onChange, getSettings]);

  const handleOk = useCallback(() => {
    onOk?.(getSettings());
    onOpenChange(false);
  }, [getSettings, onOk, onOpenChange]);

  // Footer
  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={() => onOpenChange(false)}
        data-testid="transparency-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={handleOk}
        data-testid="transparency-ok"
      >
        OK
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Transparency Manager"
      width={400}
      footer={footer}
    >
      <div className="flex flex-col gap-4 p-4" data-testid="transparency-content">
        {/* Mask Type */}
        <div className="flex items-center gap-2">
          <span style={sectionStyle}>Mask Type</span>
          <select
            value={maskType}
            onChange={(e) => setMaskType(e.target.value as TransparencySettings['maskType'])}
            className="rounded-sm border px-2 py-1 text-xs outline-none"
            style={{ ...inputStyle, minWidth: 120 }}
            data-testid="transparency-mask-type"
          >
            {MASK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Linear panel */}
        {maskType === 'linear' && (
          <div className="flex flex-col gap-3" data-testid="transparency-linear-panel">
            <span style={sectionStyle}>LINEAR FADE EDGES</span>

            {/* Top */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={labelStyle}>Top</span>
              <NumericUpDown value={top} onChange={setTop} min={0} max={100} step={1} width={60} suffix="%" />
              <input
                type="range" min={0} max={100} step={1} value={top}
                onChange={(e) => setTop(Number(e.target.value))}
                className="flex-1"
                style={{ accentColor: 'var(--accent-orange)' }}
                data-testid="transparency-top-slider"
              />
            </div>

            {/* Bottom */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={labelStyle}>Bottom</span>
              <NumericUpDown value={bottom} onChange={setBottom} min={0} max={100} step={1} width={60} suffix="%" />
              <input
                type="range" min={0} max={100} step={1} value={bottom}
                onChange={(e) => setBottom(Number(e.target.value))}
                className="flex-1"
                style={{ accentColor: 'var(--accent-orange)' }}
                data-testid="transparency-bottom-slider"
              />
            </div>

            {/* Left */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={labelStyle}>Left</span>
              <NumericUpDown value={left} onChange={setLeft} min={0} max={100} step={1} width={60} suffix="%" />
              <input
                type="range" min={0} max={100} step={1} value={left}
                onChange={(e) => setLeft(Number(e.target.value))}
                className="flex-1"
                style={{ accentColor: 'var(--accent-orange)' }}
                data-testid="transparency-left-slider"
              />
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={labelStyle}>Right</span>
              <NumericUpDown value={right} onChange={setRight} min={0} max={100} step={1} width={60} suffix="%" />
              <input
                type="range" min={0} max={100} step={1} value={right}
                onChange={(e) => setRight(Number(e.target.value))}
                className="flex-1"
                style={{ accentColor: 'var(--accent-orange)' }}
                data-testid="transparency-right-slider"
              />
            </div>
          </div>
        )}

        {/* Radial panel */}
        {maskType === 'radial' && (
          <div className="flex flex-col gap-3" data-testid="transparency-radial-panel">
            <span style={sectionStyle}>RADIAL CENTER</span>

            {/* Center X */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={labelStyle}>Center X</span>
              <NumericUpDown
                value={centerX} onChange={setCenterX}
                min={0} max={1} step={0.01} width={65}
              />
              <input
                type="range" min={0} max={1} step={0.01} value={centerX}
                onChange={(e) => setCenterX(Number(e.target.value))}
                className="flex-1"
                style={{ accentColor: 'var(--accent-orange)' }}
                data-testid="transparency-cx-slider"
              />
            </div>

            {/* Center Y */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={labelStyle}>Center Y</span>
              <NumericUpDown
                value={centerY} onChange={setCenterY}
                min={0} max={1} step={0.01} width={65}
              />
              <input
                type="range" min={0} max={1} step={0.01} value={centerY}
                onChange={(e) => setCenterY(Number(e.target.value))}
                className="flex-1"
                style={{ accentColor: 'var(--accent-orange)' }}
                data-testid="transparency-cy-slider"
              />
            </div>
          </div>
        )}

        {/* No controls for "none" */}
        {maskType === 'none' && (
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }} data-testid="transparency-none-hint">
            No transparency mask applied. Select a mask type above.
          </span>
        )}
      </div>
    </DialogBase>
  );
}

export default TransparencyManagerWindow;
