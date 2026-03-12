import { useState, useCallback, useRef, useEffect } from 'react';
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
  /** Initial color in hex (e.g. "#FF6600" or "#FF660080" with alpha). */
  initialColor?: string;
  /** Called with the selected hex color on OK. */
  onOk?: (color: string) => void;
  /** Called on cancel (close without OK) so caller can revert live preview. */
  onCancel?: () => void;
  /** Fires on every color change for live preview. */
  onColorChange?: (color: string) => void;
}

// ---------------------------------------------------------------------------
// Color conversion helpers (exported for testing)
// ---------------------------------------------------------------------------

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16) || 0,
    parseInt(h.substring(2, 4), 16) || 0,
    parseInt(h.substring(4, 6), 16) || 0,
  ];
}

export function hexToAlpha(hex: string): number {
  const h = hex.replace('#', '');
  if (h.length >= 8) {
    return Math.round((parseInt(h.substring(6, 8), 16) / 255) * 100);
  }
  return 100;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((c) =>
        Math.max(0, Math.min(255, Math.round(c)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  );
}

export function rgbToHexAlpha(r: number, g: number, b: number, alpha: number): string {
  const hex = rgbToHex(r, g, b);
  if (alpha >= 100) return hex;
  const a = Math.max(0, Math.min(255, Math.round((alpha / 100) * 255)));
  return hex + a.toString(16).padStart(2, '0').toUpperCase();
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

export function hsbToHex(h: number, s: number, b: number): string {
  const [r, g, bb] = hsbToRgb(h, s, b);
  return rgbToHex(r, g, bb);
}

// ---------------------------------------------------------------------------
// Internal: GradientSlider (horizontal slider with gradient track)
// ---------------------------------------------------------------------------

interface GradientSliderProps {
  value: number;
  min: number;
  max: number;
  gradient: string;
  onChange: (value: number) => void;
  checkerboard?: boolean;
}

function GradientSlider({ value, min, max, gradient, onChange, checkerboard }: GradientSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const fraction = Math.max(0, Math.min(1, (value - min) / (max - min)));

  const update = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onChange(Math.round(min + x * (max - min)));
    },
    [min, max, onChange],
  );

  return (
    <div
      ref={trackRef}
      style={{
        flex: 1,
        height: 10,
        borderRadius: 5,
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        update(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons > 0) update(e.clientX);
      }}
    >
      {checkerboard && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 5,
            background:
              'repeating-conic-gradient(#606060 0% 25%, #404040 0% 50%) 50% / 8px 8px',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 5,
          background: gradient,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 5,
          border: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none',
        }}
      />
      {/* Thumb */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: `${fraction * 100}%`,
          transform: 'translate(-50%, -50%)',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#fff',
          border: '2px solid #333',
          boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal: ChannelRow (label + gradient slider + numeric input)
// ---------------------------------------------------------------------------

interface ChannelRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  gradient: string;
  onChange: (value: number) => void;
  suffix?: string;
  checkerboard?: boolean;
}

function ChannelRow({
  label,
  value,
  min,
  max,
  gradient,
  onChange,
  suffix,
  checkerboard,
}: ChannelRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 22 }}>
      <span
        style={{
          width: 12,
          fontSize: 11,
          color: 'var(--text-secondary)',
          fontWeight: 600,
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <GradientSlider
        value={value}
        min={min}
        max={max}
        gradient={gradient}
        onChange={onChange}
        checkerboard={checkerboard}
      />
      <NumericUpDown value={value} onChange={onChange} min={min} max={max} suffix={suffix} width={52} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal: VerticalBar (hue or alpha vertical bar)
// ---------------------------------------------------------------------------

interface VerticalBarProps {
  barRef: React.RefObject<HTMLDivElement | null>;
  gradient: string;
  value: number;
  max: number;
  onUpdate: (clientY: number) => void;
  checkerboard?: boolean;
  invert?: boolean;
}

function VerticalBar({ barRef, gradient, value, max, onUpdate, checkerboard, invert }: VerticalBarProps) {
  const fraction = invert ? 1 - value / max : value / max;

  return (
    <div
      ref={barRef}
      style={{
        width: 16,
        height: 200,
        borderRadius: 4,
        position: 'relative',
        cursor: 'pointer',
        overflow: 'hidden',
      }}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        onUpdate(e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.buttons > 0) onUpdate(e.clientY);
      }}
    >
      {checkerboard && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 4,
            background:
              'repeating-conic-gradient(#606060 0% 25%, #404040 0% 50%) 50% / 8px 8px',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 4,
          background: gradient,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.15)',
          pointerEvents: 'none',
        }}
      />
      {/* Indicator */}
      <div
        style={{
          position: 'absolute',
          left: -1,
          right: -1,
          top: `${fraction * 100}%`,
          transform: 'translateY(-50%)',
          height: 4,
          borderRadius: 2,
          background: '#fff',
          border: '1px solid #333',
          boxShadow: '0 1px 2px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ColorPickerWindow({
  open,
  onOpenChange,
  initialColor = '#FF6600',
  onOk,
  onCancel,
  onColorChange,
}: ColorPickerWindowProps) {
  const [r0, g0, b0] = hexToRgb(initialColor);
  const alpha0 = hexToAlpha(initialColor);
  const [h0, s0, br0] = rgbToHsb(r0, g0, b0);

  const [hue, setHue] = useState(h0);
  const [sat, setSat] = useState(s0);
  const [bright, setBright] = useState(br0);
  const [alpha, setAlpha] = useState(alpha0);
  const [hexInput, setHexInput] = useState('');

  const svRef = useRef<HTMLDivElement>(null);
  const hueBarRef = useRef<HTMLDivElement>(null);
  const alphaBarRef = useRef<HTMLDivElement>(null);
  const okClickedRef = useRef(false);

  // Derived values
  const currentRgb = hsbToRgb(hue, sat, bright);
  const currentHex = rgbToHex(currentRgb[0], currentRgb[1], currentRgb[2]);
  const currentHexAlpha = rgbToHexAlpha(currentRgb[0], currentRgb[1], currentRgb[2], alpha);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      const [r, g, b] = hexToRgb(initialColor);
      const a = hexToAlpha(initialColor);
      const [h, s, v] = rgbToHsb(r, g, b);
      setHue(h);
      setSat(s);
      setBright(v);
      setAlpha(a);
      setHexInput(rgbToHex(r, g, b).replace('#', ''));
      okClickedRef.current = false;
    }
  }, [open, initialColor]);

  // Update hex input display when color changes (but not during manual hex editing)
  useEffect(() => {
    setHexInput(currentHex.replace('#', ''));
  }, [currentHex]);

  // Fire live preview
  const prevColorRef = useRef(currentHexAlpha);
  useEffect(() => {
    if (open && prevColorRef.current !== currentHexAlpha) {
      prevColorRef.current = currentHexAlpha;
      onColorChange?.(currentHexAlpha);
    }
  }, [currentHexAlpha, open, onColorChange]);

  // RGB setters
  const setFromRgb = useCallback((rr: number, gg: number, bb: number) => {
    const [h, s, v] = rgbToHsb(rr, gg, bb);
    setHue(h);
    setSat(s);
    setBright(v);
  }, []);

  const setFromHex = useCallback(
    (hex: string) => {
      const clean = hex.replace('#', '').replace(/[^0-9a-fA-F]/g, '');
      if (clean.length >= 6) {
        const [rr, gg, bb] = hexToRgb(clean);
        setFromRgb(rr, gg, bb);
        if (clean.length >= 8) {
          setAlpha(hexToAlpha('#' + clean));
        }
      }
    },
    [setFromRgb],
  );

  // SV square interaction
  const updateSV = useCallback(
    (clientX: number, clientY: number) => {
      if (!svRef.current) return;
      const rect = svRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
      setSat(Math.round(x * 100));
      setBright(Math.round(y * 100));
    },
    [],
  );

  // Hue bar interaction
  const updateHue = useCallback((clientY: number) => {
    if (!hueBarRef.current) return;
    const rect = hueBarRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    setHue(Math.round(y * 360));
  }, []);

  // Alpha bar interaction (inverted: top = 100%, bottom = 0%)
  const updateAlpha = useCallback((clientY: number) => {
    if (!alphaBarRef.current) return;
    const rect = alphaBarRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    setAlpha(Math.round(y * 100));
  }, []);

  // Eyedropper
  const handleEyedropper = useCallback(async () => {
    try {
      if ('EyeDropper' in window) {
        const dropper = new (window as any).EyeDropper();
        const result = await dropper.open();
        if (result?.sRGBHex) {
          setFromHex(result.sRGBHex);
        }
      }
    } catch {
      // User cancelled or API not available
    }
  }, [setFromHex]);

  const eyedropperSupported = typeof window !== 'undefined' && 'EyeDropper' in window;

  // Gradient computations for channel sliders
  const hueGrad = 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)';
  const satGrad = `linear-gradient(to right, ${hsbToHex(hue, 0, bright)}, ${hsbToHex(hue, 100, bright)})`;
  const brightGrad = `linear-gradient(to right, #000000, ${hsbToHex(hue, sat, 100)})`;
  const rGrad = `linear-gradient(to right, ${rgbToHex(0, currentRgb[1], currentRgb[2])}, ${rgbToHex(255, currentRgb[1], currentRgb[2])})`;
  const gGrad = `linear-gradient(to right, ${rgbToHex(currentRgb[0], 0, currentRgb[2])}, ${rgbToHex(currentRgb[0], 255, currentRgb[2])})`;
  const bGrad = `linear-gradient(to right, ${rgbToHex(currentRgb[0], currentRgb[1], 0)}, ${rgbToHex(currentRgb[0], currentRgb[1], 255)})`;
  const alphaSliderGrad = `linear-gradient(to right, transparent, ${currentHex})`;

  // Handle dialog close (X button or backdrop)
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && !okClickedRef.current) {
        onCancel?.();
      }
      onOpenChange(isOpen);
    },
    [onOpenChange, onCancel],
  );

  // CSS for alpha preview
  const alphaColorCss =
    alpha < 100
      ? `rgba(${currentRgb[0]}, ${currentRgb[1]}, ${currentRgb[2]}, ${alpha / 100})`
      : currentHex;

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={() => {
          onCancel?.();
          onOpenChange(false);
        }}
        data-testid="color-picker-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={() => {
          okClickedRef.current = true;
          onOk?.(currentHexAlpha);
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
      onOpenChange={handleOpenChange}
      title="Color Picker"
      width={540}
      footer={footer}
    >
      <div
        style={{ display: 'flex', gap: 12, padding: 16 }}
        data-testid="color-picker-dialog-content"
      >
        {/* ---- Left Column: SV Square + Preview ---- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
          {/* Saturation-Value square */}
          <div
            ref={svRef}
            style={{
              width: 200,
              height: 200,
              borderRadius: 4,
              position: 'relative',
              cursor: 'crosshair',
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))`,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            data-testid="sv-gradient"
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              updateSV(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (e.buttons > 0) updateSV(e.clientX, e.clientY);
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: 12,
                height: 12,
                borderRadius: '50%',
                border: '2px solid #fff',
                left: `${sat}%`,
                top: `${100 - bright}%`,
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 3px rgba(0,0,0,0.8), inset 0 0 1px rgba(0,0,0,0.3)',
                pointerEvents: 'none',
              }}
            />
          </div>

          {/* Old vs New preview */}
          <div style={{ display: 'flex', gap: 0 }} data-testid="color-preview-swatches">
            <div style={{ position: 'relative', width: 40, height: 30, overflow: 'hidden', borderRadius: '4px 0 0 4px' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'repeating-conic-gradient(#606060 0% 25%, #404040 0% 50%) 50% / 8px 8px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: initialColor,
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '4px 0 0 4px',
                }}
                title="Original"
                data-testid="old-color-swatch"
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: 1,
                  left: 2,
                  fontSize: 8,
                  color: 'rgba(255,255,255,0.7)',
                  textShadow: '0 0 2px #000',
                  pointerEvents: 'none',
                }}
              >
                Old
              </span>
            </div>
            <div style={{ position: 'relative', width: 40, height: 30, overflow: 'hidden', borderRadius: '0 4px 4px 0' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'repeating-conic-gradient(#606060 0% 25%, #404040 0% 50%) 50% / 8px 8px',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: alphaColorCss,
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '0 4px 4px 0',
                }}
                title="New"
                data-testid="new-color-swatch"
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: 1,
                  left: 2,
                  fontSize: 8,
                  color: 'rgba(255,255,255,0.7)',
                  textShadow: '0 0 2px #000',
                  pointerEvents: 'none',
                }}
              >
                New
              </span>
            </div>
          </div>

          {/* Eyedropper */}
          {eyedropperSupported && (
            <button
              type="button"
              onClick={handleEyedropper}
              className="flex items-center gap-1.5 self-start rounded border px-2.5 py-1 text-xs hover:bg-[var(--hover-bg)]"
              style={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)',
                backgroundColor: '#2A2A2A',
                cursor: 'pointer',
              }}
              data-testid="eyedropper-button"
            >
              <Icon path={mdiEyedropper} size={14} color="var(--text-secondary)" />
              Pick Color
            </button>
          )}
        </div>

        {/* ---- Middle Column: Hue + Alpha vertical bars ---- */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {/* Hue bar */}
          <VerticalBar
            barRef={hueBarRef}
            gradient="linear-gradient(to bottom, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
            value={hue}
            max={360}
            onUpdate={updateHue}
          />

          {/* Alpha bar */}
          <VerticalBar
            barRef={alphaBarRef}
            gradient={`linear-gradient(to top, transparent, ${currentHex})`}
            value={alpha}
            max={100}
            onUpdate={updateAlpha}
            checkerboard
            invert
          />
        </div>

        {/* ---- Right Column: Channel sliders + Hex + Alpha ---- */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            minWidth: 200,
          }}
          data-testid="color-input-fields"
        >
          {/* HSB section */}
          <span
            style={{
              fontSize: 10,
              color: 'var(--text-disabled)',
              fontWeight: 600,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            HSB
          </span>
          <ChannelRow
            label="H"
            value={hue}
            min={0}
            max={360}
            gradient={hueGrad}
            onChange={setHue}
            suffix={'\u00B0'}
          />
          <ChannelRow
            label="S"
            value={sat}
            min={0}
            max={100}
            gradient={satGrad}
            onChange={setSat}
            suffix="%"
          />
          <ChannelRow
            label="B"
            value={bright}
            min={0}
            max={100}
            gradient={brightGrad}
            onChange={setBright}
            suffix="%"
          />

          {/* Separator */}
          <div
            style={{
              height: 1,
              backgroundColor: 'var(--border-color)',
              margin: '4px 0',
            }}
          />

          {/* RGB section */}
          <span
            style={{
              fontSize: 10,
              color: 'var(--text-disabled)',
              fontWeight: 600,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            RGB
          </span>
          <ChannelRow
            label="R"
            value={currentRgb[0]}
            min={0}
            max={255}
            gradient={rGrad}
            onChange={(v) => setFromRgb(v, currentRgb[1], currentRgb[2])}
          />
          <ChannelRow
            label="G"
            value={currentRgb[1]}
            min={0}
            max={255}
            gradient={gGrad}
            onChange={(v) => setFromRgb(currentRgb[0], v, currentRgb[2])}
          />
          <ChannelRow
            label="B"
            value={currentRgb[2]}
            min={0}
            max={255}
            gradient={bGrad}
            onChange={(v) => setFromRgb(currentRgb[0], currentRgb[1], v)}
          />

          {/* Separator */}
          <div
            style={{
              height: 1,
              backgroundColor: 'var(--border-color)',
              margin: '4px 0',
            }}
          />

          {/* Hex input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                fontWeight: 700,
                width: 12,
                textAlign: 'center',
              }}
            >
              #
            </span>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 8);
                setHexInput(val);
                if (val.length >= 6) {
                  setFromHex(val);
                }
              }}
              onBlur={() => {
                setHexInput(currentHex.replace('#', ''));
              }}
              className="rounded-sm border px-2 py-0.5 text-xs outline-none"
              style={{
                flex: 1,
                height: 22,
                backgroundColor: '#2A2A2A',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: 11,
              }}
              data-testid="hex-input-field"
            />
          </div>

          {/* Alpha slider */}
          <ChannelRow
            label="A"
            value={alpha}
            min={0}
            max={100}
            gradient={alphaSliderGrad}
            onChange={setAlpha}
            suffix="%"
            checkerboard
          />
        </div>
      </div>
    </DialogBase>
  );
}

export default ColorPickerWindow;
