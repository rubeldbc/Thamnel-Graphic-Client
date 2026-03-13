import { useCallback, useRef, useEffect } from 'react';
import { Icon } from './Icon';
import { mdiChevronUp, mdiChevronDown } from '@mdi/js';

export interface NumericUpDownProps {
  /** Current value. */
  value: number;
  /** Change handler receiving the new numeric value. */
  onChange?: (value: number) => void;
  /** Minimum allowed value. */
  min?: number;
  /** Maximum allowed value. */
  max?: number;
  /** Increment / decrement step. */
  step?: number;
  /** Width in pixels. */
  width?: number;
  /** Suffix displayed after the value (e.g. "px", "%", "°"). */
  suffix?: string;
  /** Label displayed before the input. */
  label?: string;
  /** Disabled state. */
  disabled?: boolean;
}

/**
 * Reusable numeric input with small up/down arrow buttons on the right side.
 * Press-and-hold on arrows: starts at 300ms interval, accelerates to 50ms.
 */
export function NumericUpDown({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  width = 50,
  suffix,
  label,
  disabled = false,
}: NumericUpDownProps) {
  const clamp = useCallback(
    (v: number) => Math.min(Math.max(v, min), max),
    [min, max],
  );

  // Keep latest props in refs so repeat timer reads fresh values
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const stepRef = useRef(step);
  const clampRef = useRef(clamp);
  valueRef.current = value;
  onChangeRef.current = onChange;
  stepRef.current = step;
  clampRef.current = clamp;

  const repeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatStartRef = useRef(0);

  const stopRepeat = useCallback(() => {
    if (repeatTimerRef.current !== null) {
      clearTimeout(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => stopRepeat, [stopRepeat]);

  const startRepeat = useCallback(
    (direction: 1 | -1) => {
      if (disabled) return;
      stopRepeat();

      // Fire immediately on first press
      onChangeRef.current?.(clampRef.current(valueRef.current + stepRef.current * direction));
      repeatStartRef.current = Date.now();

      const tick = () => {
        const elapsed = Date.now() - repeatStartRef.current;
        // Accelerate: 300ms → 50ms over ~1s
        const delay = Math.max(50, 300 - (elapsed / 1000) * 250);
        repeatTimerRef.current = setTimeout(() => {
          onChangeRef.current?.(
            clampRef.current(valueRef.current + stepRef.current * direction),
          );
          tick();
        }, delay);
      };

      // Initial delay before continuous repeat begins
      repeatTimerRef.current = setTimeout(tick, 400);
    },
    [disabled, stopRepeat],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const raw = e.target.value.replace(/[^0-9.\-]/g, '');
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) {
        onChange?.(clamp(parsed));
      }
    },
    [clamp, onChange, disabled],
  );

  const testId = label
    ? `nud-${label.toLowerCase().replace(/\s+/g, '-')}`
    : 'nud';

  // Format display value: show integer for whole numbers, limited decimals otherwise
  const displayValue =
    step < 1 ? value.toFixed(Math.max(2, -Math.floor(Math.log10(step)))) : String(value);

  return (
    <div
      data-testid={testId}
      className="inline-flex items-center gap-1"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      {label && (
        <span
          className="select-none text-text-secondary"
          style={{ fontSize: 11 }}
        >
          {label}
        </span>
      )}
      <div
        className="relative inline-flex items-center overflow-hidden rounded-sm border"
        style={{
          width,
          height: 22,
          backgroundColor: '#2A2A2A',
          borderColor: 'var(--border-color)',
        }}
      >
        <input
          type="text"
          data-testid={`${testId}-input`}
          value={`${displayValue}${suffix ?? ''}`}
          onChange={handleChange}
          disabled={disabled}
          className="w-full border-none bg-transparent px-1 outline-none"
          style={{
            color: 'var(--text-primary)',
            fontSize: 11,
            paddingRight: 16,
          }}
        />
        <div className="absolute right-0 top-0 flex h-full flex-col" style={{ width: 14 }}>
          <button
            type="button"
            data-testid={`${testId}-up`}
            onMouseDown={() => startRepeat(1)}
            onMouseUp={stopRepeat}
            onMouseLeave={stopRepeat}
            disabled={disabled}
            className="flex flex-1 cursor-pointer items-center justify-center border-none bg-transparent p-0 outline-none hover:bg-[var(--hover-bg)]"
            tabIndex={-1}
          >
            <Icon path={mdiChevronUp} size={10} color="var(--text-secondary)" />
          </button>
          <button
            type="button"
            data-testid={`${testId}-down`}
            onMouseDown={() => startRepeat(-1)}
            onMouseUp={stopRepeat}
            onMouseLeave={stopRepeat}
            disabled={disabled}
            className="flex flex-1 cursor-pointer items-center justify-center border-none bg-transparent p-0 outline-none hover:bg-[var(--hover-bg)]"
            tabIndex={-1}
          >
            <Icon path={mdiChevronDown} size={10} color="var(--text-secondary)" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default NumericUpDown;
