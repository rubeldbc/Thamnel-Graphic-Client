import { useState, useMemo, useCallback } from 'react';
import { DialogBase } from './DialogBase';
import { NumericUpDown } from '../common/NumericUpDown';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateStampConfig {
  language: 'bn' | 'en';
  calendar: 'gregorian' | 'bengali' | 'hijri';
  useCurrentDate: boolean;
  specificDate?: string;
  isLive: boolean;
  parts: {
    dayName: boolean;
    day: boolean;
    month: boolean;
    year: boolean;
    time: boolean;
  };
  timeFormat: '12h' | '24h';
  prefix: string;
  customFormat: string;
  useCustomFormat: boolean;
  bengaliOffset: number;
  hijriOffset: number;
  presetName?: string;
}

export interface DateStampWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCanvas?: (text: string, isLive: boolean, config: DateStampConfig) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

const BENGALI_MONTHS = [
  'বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন',
  'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র',
];

const BENGALI_DAY_NAMES = [
  'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার',
  'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার',
];

interface Preset {
  label: string;
  config: Partial<DateStampConfig>;
}

const PRESETS: Preset[] = [
  {
    label: 'English Full',
    config: {
      language: 'en', calendar: 'gregorian',
      parts: { dayName: true, day: true, month: true, year: true, time: false },
      useCustomFormat: false, prefix: '',
    },
  },
  {
    label: 'English Compact',
    config: {
      language: 'en', calendar: 'gregorian',
      parts: { dayName: false, day: true, month: true, year: true, time: false },
      useCustomFormat: false, prefix: '',
    },
  },
  {
    label: 'ISO Date',
    config: {
      language: 'en', calendar: 'gregorian',
      parts: { dayName: false, day: true, month: true, year: true, time: false },
      useCustomFormat: true, customFormat: '{year}-{month}-{day}', prefix: '',
    },
  },
  {
    label: 'বাংলা তারিখ',
    config: {
      language: 'bn', calendar: 'gregorian',
      parts: { dayName: true, day: true, month: true, year: true, time: false },
      useCustomFormat: false, prefix: '',
    },
  },
  {
    label: 'বঙ্গাব্দ',
    config: {
      language: 'bn', calendar: 'bengali',
      parts: { dayName: true, day: true, month: true, year: true, time: false },
      useCustomFormat: false, prefix: '',
    },
  },
  {
    label: 'হিজরী',
    config: {
      language: 'bn', calendar: 'hijri',
      parts: { dayName: true, day: true, month: true, year: true, time: false },
      useCustomFormat: false, prefix: '',
    },
  },
  {
    label: 'Time Only',
    config: {
      language: 'en', calendar: 'gregorian',
      parts: { dayName: false, day: false, month: false, year: false, time: true },
      timeFormat: '12h', useCustomFormat: false, prefix: '',
    },
  },
];

// ---------------------------------------------------------------------------
// Date formatting helpers
// ---------------------------------------------------------------------------

function toBengaliDigits(str: string): string {
  return str.replace(/[0-9]/g, (d) => BENGALI_DIGITS[parseInt(d, 10)]);
}

/**
 * Approximate Bengali calendar (Bangla) date from a Gregorian date.
 * The Bengali new year (1 Baisakh) starts around April 14.
 */
function toBengaliDate(date: Date, offset: number): { day: number; month: number; year: number } {
  // Day-of-year boundaries for each Bengali month (non-leap approximation)
  const starts = [0, 31, 62, 93, 124, 155, 186, 216, 245, 274, 304, 335];
  const greg = new Date(date);
  greg.setDate(greg.getDate() + offset);

  const apr14 = new Date(greg.getFullYear(), 3, 14); // April 14
  let diff = Math.floor((greg.getTime() - apr14.getTime()) / 86400000);
  let bengaliYear = greg.getFullYear() - 593;
  if (diff < 0) {
    // before Apr 14 -> previous Bengali year
    const prevApr14 = new Date(greg.getFullYear() - 1, 3, 14);
    diff = Math.floor((greg.getTime() - prevApr14.getTime()) / 86400000);
    bengaliYear -= 1;
  }

  let monthIdx = 0;
  for (let i = starts.length - 1; i >= 0; i--) {
    if (diff >= starts[i]) {
      monthIdx = i;
      break;
    }
  }
  const dayOfMonth = diff - starts[monthIdx] + 1;
  return { day: dayOfMonth, month: monthIdx, year: bengaliYear };
}

export function formatDateStamp(config: DateStampConfig, date: Date): string {
  const {
    language, calendar, parts, timeFormat, prefix,
    customFormat, useCustomFormat, bengaliOffset, hijriOffset,
  } = config;

  const isBn = language === 'bn';

  let dayNameStr = '';
  let dayStr = '';
  let monthStr = '';
  let yearStr = '';
  let timeStr = '';
  let calStr = '';

  if (calendar === 'bengali') {
    const bd = toBengaliDate(date, bengaliOffset);
    dayNameStr = BENGALI_DAY_NAMES[date.getDay()];
    dayStr = isBn ? toBengaliDigits(String(bd.day)) : String(bd.day);
    monthStr = BENGALI_MONTHS[bd.month];
    yearStr = isBn ? toBengaliDigits(String(bd.year)) : String(bd.year);
    calStr = 'বঙ্গাব্দ';
  } else if (calendar === 'hijri') {
    try {
      const adjusted = new Date(date);
      adjusted.setDate(adjusted.getDate() + hijriOffset);
      const fmt = new Intl.DateTimeFormat(isBn ? 'bn' : 'en', {
        calendar: 'islamic',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long',
      });
      const p = fmt.formatToParts(adjusted);
      dayNameStr = p.find((x) => x.type === 'weekday')?.value ?? '';
      dayStr = p.find((x) => x.type === 'day')?.value ?? '';
      monthStr = p.find((x) => x.type === 'month')?.value ?? '';
      yearStr = p.find((x) => x.type === 'year')?.value ?? '';
      calStr = 'হিজরী';
    } catch {
      dayStr = String(date.getDate());
      monthStr = String(date.getMonth() + 1);
      yearStr = String(date.getFullYear());
      calStr = 'Hijri';
    }
  } else {
    // Gregorian
    if (isBn) {
      const fmt = new Intl.DateTimeFormat('bn', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
      const p = fmt.formatToParts(date);
      dayNameStr = p.find((x) => x.type === 'weekday')?.value ?? '';
      dayStr = p.find((x) => x.type === 'day')?.value ?? '';
      monthStr = p.find((x) => x.type === 'month')?.value ?? '';
      yearStr = p.find((x) => x.type === 'year')?.value ?? '';
    } else {
      const fmtLong = new Intl.DateTimeFormat('en-US', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
      const p = fmtLong.formatToParts(date);
      dayNameStr = p.find((x) => x.type === 'weekday')?.value ?? '';
      dayStr = p.find((x) => x.type === 'day')?.value ?? '';
      monthStr = p.find((x) => x.type === 'month')?.value ?? '';
      yearStr = p.find((x) => x.type === 'year')?.value ?? '';
    }
    calStr = isBn ? 'গ্রেগরিয়ান' : 'Gregorian';
  }

  // Time
  if (parts.time) {
    const hour12 = timeFormat === '12h';
    const tFmt = new Intl.DateTimeFormat(isBn ? 'bn' : 'en', {
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12,
    });
    timeStr = tFmt.format(date);
  }

  // Custom format: token replacement
  if (useCustomFormat && customFormat) {
    let result = customFormat;
    result = result.replace(/\{dayname\}/gi, dayNameStr);
    result = result.replace(/\{day\}/gi, dayStr);
    result = result.replace(/\{month\}/gi, monthStr);
    result = result.replace(/\{year\}/gi, yearStr);
    result = result.replace(/\{time\}/gi, timeStr);
    result = result.replace(/\{cal\}/gi, calStr);
    return prefix ? `${prefix} ${result}` : result;
  }

  // Standard assembly from parts
  const segments: string[] = [];
  if (parts.dayName && dayNameStr) segments.push(dayNameStr);
  if (parts.day && dayStr) segments.push(dayStr);
  if (parts.month && monthStr) segments.push(monthStr);
  if (parts.year && yearStr) segments.push(yearStr);
  if (parts.time && timeStr) segments.push(timeStr);

  const assembled = segments.join(', ');
  return prefix ? `${prefix} ${assembled}` : assembled;
}

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

function defaultConfig(): DateStampConfig {
  return {
    language: 'en',
    calendar: 'gregorian',
    useCurrentDate: true,
    isLive: false,
    parts: { dayName: true, day: true, month: true, year: true, time: false },
    timeFormat: '12h',
    prefix: '',
    customFormat: '',
    useCustomFormat: false,
    bengaliOffset: 0,
    hijriOffset: 0,
    presetName: 'English Full',
  };
}

// ---------------------------------------------------------------------------
// Shared input styles
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  backgroundColor: '#2A2A2A',
  borderColor: 'var(--border-color)',
  color: 'var(--text-primary)',
};

const labelStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 11,
};

const sectionStyle: React.CSSProperties = {
  color: 'var(--accent-orange)',
  fontSize: 11,
  fontWeight: 600,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DateStampWindow({
  open,
  onOpenChange,
  onAddToCanvas,
}: DateStampWindowProps) {
  const [config, setConfig] = useState<DateStampConfig>(defaultConfig);

  const update = useCallback(
    <K extends keyof DateStampConfig>(key: K, value: DateStampConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const updateParts = useCallback(
    (key: keyof DateStampConfig['parts'], value: boolean) => {
      setConfig((prev) => ({
        ...prev,
        parts: { ...prev.parts, [key]: value },
      }));
    },
    [],
  );

  const applyPreset = useCallback((name: string) => {
    const preset = PRESETS.find((p) => p.label === name);
    if (preset) {
      setConfig((prev) => ({
        ...prev,
        ...preset.config,
        parts: preset.config.parts ?? prev.parts,
        presetName: name,
      }));
    }
  }, []);

  const activeDate = useMemo(() => {
    if (config.useCurrentDate) return new Date();
    if (config.specificDate) return new Date(config.specificDate);
    return new Date();
  }, [config.useCurrentDate, config.specificDate]);

  const preview = useMemo(
    () => formatDateStamp(config, activeDate),
    [config, activeDate],
  );

  const handleAdd = useCallback(() => {
    onAddToCanvas?.(preview, config.isLive, config);
    onOpenChange(false);
  }, [preview, config, onAddToCanvas, onOpenChange]);

  // Footer
  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={() => onOpenChange(false)}
        data-testid="datestamp-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={handleAdd}
        data-testid="datestamp-add"
      >
        Add to Canvas
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Date Stamp"
      width={500}
      minHeight={500}
      footer={footer}
    >
      <div className="flex flex-col gap-3 p-4" data-testid="datestamp-content">
        {/* Preset */}
        <div className="flex items-center gap-2">
          <span style={sectionStyle}>Preset</span>
          <select
            value={config.presetName ?? ''}
            onChange={(e) => applyPreset(e.target.value)}
            className="rounded-sm border px-2 py-1 text-xs outline-none"
            style={{ ...inputStyle, minWidth: 160 }}
            data-testid="datestamp-preset"
          >
            {PRESETS.map((p) => (
              <option key={p.label} value={p.label}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div className="flex items-center gap-3">
          <span style={sectionStyle}>Language</span>
          <label className="inline-flex items-center gap-1 text-xs" style={labelStyle}>
            <input
              type="radio" name="ds-lang" checked={config.language === 'bn'}
              onChange={() => update('language', 'bn')}
              style={{ accentColor: 'var(--accent-orange)' }}
              data-testid="datestamp-lang-bn"
            />
            বাংলা
          </label>
          <label className="inline-flex items-center gap-1 text-xs" style={labelStyle}>
            <input
              type="radio" name="ds-lang" checked={config.language === 'en'}
              onChange={() => update('language', 'en')}
              style={{ accentColor: 'var(--accent-orange)' }}
              data-testid="datestamp-lang-en"
            />
            English
          </label>
        </div>

        {/* Calendar */}
        <div className="flex items-center gap-3">
          <span style={sectionStyle}>Calendar</span>
          <label className="inline-flex items-center gap-1 text-xs" style={labelStyle}>
            <input
              type="radio" name="ds-cal" checked={config.calendar === 'gregorian'}
              onChange={() => update('calendar', 'gregorian')}
              style={{ accentColor: 'var(--accent-orange)' }}
              data-testid="datestamp-cal-gregorian"
            />
            Gregorian
          </label>
          <label className="inline-flex items-center gap-1 text-xs" style={labelStyle}>
            <input
              type="radio" name="ds-cal" checked={config.calendar === 'bengali'}
              onChange={() => update('calendar', 'bengali')}
              style={{ accentColor: 'var(--accent-orange)' }}
              data-testid="datestamp-cal-bengali"
            />
            বঙ্গাব্দ
          </label>
          <label className="inline-flex items-center gap-1 text-xs" style={labelStyle}>
            <input
              type="radio" name="ds-cal" checked={config.calendar === 'hijri'}
              onChange={() => update('calendar', 'hijri')}
              style={{ accentColor: 'var(--accent-orange)' }}
              data-testid="datestamp-cal-hijri"
            />
            হিজরী
          </label>
        </div>

        {/* Date source */}
        <div className="flex flex-col gap-2">
          <span style={sectionStyle}>Date Source</span>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1 text-xs" style={labelStyle}>
              <input
                type="radio" name="ds-src" checked={config.useCurrentDate}
                onChange={() => update('useCurrentDate', true)}
                style={{ accentColor: 'var(--accent-orange)' }}
                data-testid="datestamp-src-current"
              />
              Current Date
            </label>
            {config.useCurrentDate && (
              <label className="inline-flex items-center gap-1 text-xs" style={labelStyle}>
                <input
                  type="checkbox" checked={config.isLive}
                  onChange={(e) => update('isLive', e.target.checked)}
                  style={{ accentColor: 'var(--accent-orange)' }}
                  data-testid="datestamp-live"
                />
                Live auto-update
              </label>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1 text-xs" style={labelStyle}>
              <input
                type="radio" name="ds-src" checked={!config.useCurrentDate}
                onChange={() => update('useCurrentDate', false)}
                style={{ accentColor: 'var(--accent-orange)' }}
                data-testid="datestamp-src-specific"
              />
              Specific Date
            </label>
            {!config.useCurrentDate && (
              <input
                type="date"
                value={config.specificDate ?? ''}
                onChange={(e) => update('specificDate', e.target.value)}
                className="rounded-sm border px-2 py-0.5 text-xs outline-none"
                style={inputStyle}
                data-testid="datestamp-specific-date"
              />
            )}
          </div>
        </div>

        {/* Parts checkboxes */}
        <div className="flex flex-col gap-1">
          <span style={sectionStyle}>Parts</span>
          <div className="flex flex-wrap items-center gap-3">
            {(['dayName', 'day', 'month', 'year', 'time'] as const).map((key) => (
              <label key={key} className="inline-flex items-center gap-1 text-xs" style={labelStyle}>
                <input
                  type="checkbox" checked={config.parts[key]}
                  onChange={(e) => updateParts(key, e.target.checked)}
                  style={{ accentColor: 'var(--accent-orange)' }}
                  data-testid={`datestamp-part-${key}`}
                />
                {key === 'dayName' ? 'Day Name' : key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
            ))}
          </div>
          {config.parts.time && (
            <div className="mt-1 flex items-center gap-3">
              <label className="inline-flex items-center gap-1 text-xs" style={labelStyle}>
                <input
                  type="radio" name="ds-tf" checked={config.timeFormat === '12h'}
                  onChange={() => update('timeFormat', '12h')}
                  style={{ accentColor: 'var(--accent-orange)' }}
                  data-testid="datestamp-tf-12h"
                />
                12h
              </label>
              <label className="inline-flex items-center gap-1 text-xs" style={labelStyle}>
                <input
                  type="radio" name="ds-tf" checked={config.timeFormat === '24h'}
                  onChange={() => update('timeFormat', '24h')}
                  style={{ accentColor: 'var(--accent-orange)' }}
                  data-testid="datestamp-tf-24h"
                />
                24h
              </label>
            </div>
          )}
        </div>

        {/* Prefix */}
        <div className="flex items-center gap-2">
          <span style={{ ...sectionStyle, minWidth: 40 }}>Prefix</span>
          <input
            type="text"
            value={config.prefix}
            onChange={(e) => update('prefix', e.target.value)}
            className="flex-1 rounded-sm border px-2 py-1 text-xs outline-none"
            style={inputStyle}
            placeholder="e.g. Date:"
            data-testid="datestamp-prefix"
          />
        </div>

        {/* Custom format */}
        <div className="flex flex-col gap-1">
          <label className="inline-flex items-center gap-1 text-xs" style={labelStyle}>
            <input
              type="checkbox" checked={config.useCustomFormat}
              onChange={(e) => update('useCustomFormat', e.target.checked)}
              style={{ accentColor: 'var(--accent-orange)' }}
              data-testid="datestamp-use-custom"
            />
            Use custom format
          </label>
          {config.useCustomFormat && (
            <>
              <input
                type="text"
                value={config.customFormat}
                onChange={(e) => update('customFormat', e.target.value)}
                className="rounded-sm border px-2 py-1 text-xs outline-none"
                style={inputStyle}
                placeholder="{day} {month}, {year}"
                data-testid="datestamp-custom-format"
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
                Tokens: {'{day}'}, {'{month}'}, {'{year}'}, {'{time}'}, {'{dayname}'}, {'{cal}'}
              </span>
            </>
          )}
        </div>

        {/* Calendar offsets */}
        {(config.calendar === 'bengali' || config.calendar === 'hijri') && (
          <div className="flex items-center gap-4">
            {config.calendar === 'bengali' && (
              <div className="flex items-center gap-2">
                <span style={labelStyle}>Bengali Offset</span>
                <NumericUpDown
                  value={config.bengaliOffset}
                  onChange={(v) => update('bengaliOffset', v)}
                  min={-5} max={5} step={1} width={60}
                />
              </div>
            )}
            {config.calendar === 'hijri' && (
              <div className="flex items-center gap-2">
                <span style={labelStyle}>Hijri Offset</span>
                <NumericUpDown
                  value={config.hijriOffset}
                  onChange={(v) => update('hijriOffset', v)}
                  min={-5} max={5} step={1} width={60}
                />
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        <div className="flex flex-col gap-1">
          <span style={sectionStyle}>Preview</span>
          <div
            className="rounded border px-3 py-2"
            style={{
              backgroundColor: '#1A1A1A',
              borderColor: 'var(--border-color)',
              color: 'var(--accent-orange)',
              fontSize: 16,
              minHeight: 32,
              wordBreak: 'break-word',
            }}
            data-testid="datestamp-preview"
          >
            {preview || '\u00A0'}
          </div>
        </div>
      </div>
    </DialogBase>
  );
}

export default DateStampWindow;
