import { useState, useCallback, useRef } from 'react';
import { DialogBase } from './DialogBase';
import { NumericUpDown } from '../common/NumericUpDown';
import { Icon } from '../common/Icon';
import { mdiEyedropper } from '@mdi/js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColorPickerWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Initial color in hex (e.g. "#FF6600"). */
  initialColor?: string;
  /** Called with the selected hex color on OK. */
  onOk?: (color: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers (exported for testing)
// ---------------------------------------------------------------------------

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16) || 0,
    parseInt(h.substring(2, 4), 16) || 0,
    parseInt(h.substring(4, 6), 16) || 0,
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function rgbToHsb(r: number, g: number, b: number): [number, number, number] {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
    else if (max === gg) h = ((bb - rr) / d + 2) / 6;
    else h = ((rr - gg) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
}

export function hsbToRgb(h: number, s: number, b: number): [number, number, number] {
  const hh = h / 360;
  const ss = s / 100;
  const vv = b / 100;
  const i = Math.floor(hh * 6);
  const f = hh * 6 - i;
  const p = vv * (1 - ss);
  const q = vv * (1 - f * ss);
  const t = vv * (1 - (1 - f) * ss);
  let rr: number, gg: number, bb: number;
  switch (i % 6) {
    case 0: rr = vv; gg = t; bb = p; break;
    case 1: rr = q; gg = vv; bb = p; break;
    case 2: rr = p; gg = vv; bb = t; break;
    case 3: rr = p; gg = q; bb = vv; break;
    case 4: rr = t; gg = p; bb = vv; break;
    default: rr = vv; gg = p; bb = q; break;
  }
  return [Math.round(rr * 255), Math.round(gg * 255), Math.round(bb * 255)];
}

/** Convert HSB values to hex string. */
export function hsbToHex(h: number, s: number, b: number): string {
  const [r, g, bb] = hsbToRgb(h, s, b);
  return rgbToHex(r, g, bb);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ColorPickerWindow({
  open,
  onOpenChange,
  initialColor = '#FF6600',
  onOk,
}: ColorPickerWindowProps) {
  const [r, g, b] = hexToRgb(initialColor);
  const [hInit, sInit, bInit] = rgbToHsb(r, g, b);

  const [hue, setHue] = useState(hInit);
  const [sat, setSat] = useState(sInit);
  const [bright, setBright] = useState(bInit);
  const [alpha, setAlpha] = useState(100);
  const [draggingSV, setDraggingSV] = useState(false);
  const [draggingHue, setDraggingHue] = useState(false);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const currentRgb = hsbToRgb(hue, sat, bright);
  const currentHex = rgbToHex(currentRgb[0], currentRgb[1], currentRgb[2]);

  const setFromRgb = useCallback((rr: number, gg: number, bb: number) => {
    const [h, s, v] = rgbToHsb(rr, gg, bb);
    setHue(h);
    setSat(s);
    setBright(v);
  }, []);

  const setFromHex = useCallback(
    (hex: string) => {
      const clean = hex.replace('#', '');
      if (clean.length === 6) {
        const [rr, gg, bb] = hexToRgb(clean);
        setFromRgb(rr, gg, bb);
      }
    },
    [setFromRgb],
  );

  const handleSVInteraction = useCallback((clientX: number, clientY: number) => {
    if (!svRef.current) return;
    const rect = svRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    setSat(Math.round(x * 100));
    setBright(Math.round(y * 100));
  }, []);

  const handleHueInteraction = useCallback((clientY: number) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    setHue(Math.round(y * 360));
  }, []);

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={() => onOpenChange(false)}
        data-testid="color-picker-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={() => {
          onOk?.(currentHex);
          onOpenChange(false);
        }}
        data-testid="color-picker-ok"
      >
        OK
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Color Picker"
      width={620}
      height={480}
      footer={footer}
    >
      <div className="flex gap-4 p-4" data-testid="color-picker-dialog-content">
        {/* SV gradient area */}
        <div className="flex flex-col gap-3">
          {/* Saturation-Value square */}
          <div
            ref={svRef}
            className="relative cursor-crosshair rounded"
            style={{
              width: 200,
              height: 200,
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))`,
            }}
            data-testid="sv-gradient"
            onMouseDown={(e) => {
              setDraggingSV(true);
              handleSVInteraction(e.clientX, e.clientY);
            }}
            onMouseMove={(e) => {
              if (draggingSV) handleSVInteraction(e.clientX, e.clientY);
            }}
            onMouseUp={() => setDraggingSV(false)}
            onMouseLeave={() => setDraggingSV(false)}
            onClick={(e) => handleSVInteraction(e.clientX, e.clientY)}
          >
            {/* Indicator dot */}
            <div
              className="pointer-events-none absolute rounded-full border-2 border-white"
              style={{
                width: 10,
                height: 10,
                left: `${sat}%`,
                top: `${100 - bright}%`,
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 2px rgba(0,0,0,0.8)',
              }}
            />
          </div>

          {/* Alpha bar */}
          <div
            className="relative cursor-pointer rounded"
            style={{
              width: 200,
              height: 16,
              backgroundImage: `linear-gradient(to right, transparent, ${currentHex}), linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)`,
              backgroundSize: '100% 100%, 8px 8px, 8px 8px, 8px 8px, 8px 8px',
              backgroundPosition: '0 0, 0 0, 0 4px, 4px -4px, -4px 0px',
            }}
            data-testid="alpha-bar"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              setAlpha(Math.round(x * 100));
            }}
          />

          {/* Preview: old vs new */}
          <div className="flex gap-0" data-testid="color-preview-swatches">
            <div
              className="border"
              style={{ width: 40, height: 30, backgroundColor: initialColor, borderColor: 'var(--border-color)' }}
              title="Old Color"
              data-testid="old-color-swatch"
            />
            <div
              className="border"
              style={{ width: 40, height: 30, backgroundColor: currentHex, borderColor: 'var(--border-color)' }}
              title="New Color"
              data-testid="new-color-swatch"
            />
          </div>
        </div>

        {/* Hue vertical bar */}
        <div
          ref={hueRef}
          className="relative cursor-pointer rounded"
          style={{
            width: 20,
            height: 200,
            background: 'linear-gradient(to bottom, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
          }}
          data-testid="hue-bar"
          onMouseDown={(e) => {
            setDraggingHue(true);
            handleHueInteraction(e.clientY);
          }}
          onMouseMove={(e) => {
            if (draggingHue) handleHueInteraction(e.clientY);
          }}
          onMouseUp={() => setDraggingHue(false)}
          onMouseLeave={() => setDraggingHue(false)}
          onClick={(e) => handleHueInteraction(e.clientY)}
        >
          <div
            className="pointer-events-none absolute left-0 right-0 border border-white"
            style={{ top: `${(hue / 360) * 100}%`, height: 3, transform: 'translateY(-50%)' }}
          />
        </div>

        {/* Input fields */}
        <div className="flex flex-col gap-3" data-testid="color-input-fields">
          {/* Eyedropper */}
          <button
            type="button"
            className="flex items-center gap-1 self-start rounded border px-2 py-1 text-xs hover:bg-[var(--hover-bg)]"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
            data-testid="eyedropper-button"
          >
            <Icon path={mdiEyedropper} size="sm" />
            Eyedropper
          </button>

          {/* HSB */}
          <div data-testid="hsb-inputs">
            <span className="mb-1 block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>HSB</span>
            <div className="flex flex-col gap-1">
              <NumericUpDown value={hue} onChange={setHue} min={0} max={360} label="H" suffix="\u00B0" width={60} />
              <NumericUpDown value={sat} onChange={setSat} min={0} max={100} label="S" suffix="%" width={60} />
              <NumericUpDown value={bright} onChange={setBright} min={0} max={100} label="B" suffix="%" width={60} />
            </div>
          </div>

          {/* RGB */}
          <div data-testid="rgb-inputs">
            <span className="mb-1 block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>RGB</span>
            <div className="flex flex-col gap-1">
              <NumericUpDown
                value={currentRgb[0]}
                onChange={(v) => setFromRgb(v, currentRgb[1], currentRgb[2])}
                min={0} max={255} label="R" width={60}
              />
              <NumericUpDown
                value={currentRgb[1]}
                onChange={(v) => setFromRgb(currentRgb[0], v, currentRgb[2])}
                min={0} max={255} label="G" width={60}
              />
              <NumericUpDown
                value={currentRgb[2]}
                onChange={(v) => setFromRgb(currentRgb[0], currentRgb[1], v)}
                min={0} max={255} label="B" width={60}
              />
            </div>
          </div>

          {/* Hex */}
          <div data-testid="hex-input">
            <span className="mb-1 block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Hex</span>
            <input
              type="text"
              value={currentHex}
              onChange={(e) => setFromHex(e.target.value)}
              className="rounded border px-2 py-1 text-xs outline-none"
              style={{
                width: 90,
                backgroundColor: '#2A2A2A',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
              data-testid="hex-input-field"
            />
          </div>

          {/* Alpha */}
          <div data-testid="alpha-input">
            <span className="mb-1 block text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Alpha</span>
            <NumericUpDown value={alpha} onChange={setAlpha} min={0} max={100} suffix="%" width={60} />
          </div>
        </div>
      </div>
    </DialogBase>
  );
}

export default ColorPickerWindow;
