import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Switch from '@radix-ui/react-switch';
import * as Select from '@radix-ui/react-select';
import { DialogBase } from './DialogBase';
import { NumericUpDown } from '../common/NumericUpDown';
import { ColorSwatch } from '../common/ColorSwatch';
import { Icon } from '../common/Icon';
import {
  mdiFormatAlignLeft,
  mdiFormatAlignCenter,
  mdiFormatAlignRight,
  mdiFormatAlignJustify,
  mdiChevronDown,
} from '@mdi/js';
import { useDocumentStore } from '../../stores/documentStore';
import type { TextProperties } from '../../types/TextProperties';
import type { TextAlignmentOption } from '../../types/enums';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TextPropertiesWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply?: () => void;
  /** Layer ID whose text properties to edit. If omitted, uses the first selected text layer. */
  layerId?: string;
}

type TabId = 'basic' | 'background' | 'image-fill';

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'basic', label: 'Basic' },
  { id: 'background', label: 'Background' },
  { id: 'image-fill', label: 'Image Fill' },
];

const FONT_FAMILIES = [
  'Roboto',
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Verdana',
  'Impact',
];

const FONT_WEIGHTS = ['Thin', 'Light', 'Regular', 'Medium', 'Bold', 'Black'];
const FONT_STYLES = ['Normal', 'Italic', 'Oblique'];
const STRETCH_MODES = ['Stretch', 'Fit', 'Fill', 'Tile'];

const WEIGHT_MAP: Record<string, number> = {
  Thin: 100,
  Light: 300,
  Regular: 400,
  Medium: 500,
  Bold: 700,
  Black: 900,
};

const WEIGHT_REVERSE: Record<number, string> = {
  100: 'Thin',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  700: 'Bold',
  900: 'Black',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block select-none text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </span>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="shrink-0 select-none text-xs" style={{ color: 'var(--text-secondary)', minWidth: 80 }}>
        {label}
      </span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TextPropertiesWindow({ open, onOpenChange, onApply, layerId }: TextPropertiesWindowProps) {
  const [activeTab, setActiveTab] = useState<TabId>('basic');

  const project = useDocumentStore((s) => s.project);
  const selectedLayerIds = useDocumentStore((s) => s.selectedLayerIds);
  const updateLayer = useDocumentStore((s) => s.updateLayer);
  const pushUndo = useDocumentStore((s) => s.pushUndo);

  // Determine the target layer
  const targetId = layerId ?? selectedLayerIds.find((id) => {
    const layer = project.layers.find((l) => l.id === id);
    return layer?.type === 'text';
  });
  const targetLayer = targetId ? project.layers.find((l) => l.id === targetId) : undefined;
  const tp = targetLayer?.textProperties;

  // Keep a copy of original for cancel
  const originalRef = useRef<TextProperties | null>(null);
  useEffect(() => {
    if (open && tp) {
      originalRef.current = { ...tp, fill: { ...tp.fill, gradientStops: tp.fill.gradientStops.map((s) => ({ ...s })) }, runs: tp.runs.map((r) => ({ ...r })) };
    }
  }, [open]); // intentionally only trigger on open change

  // Basic tab state
  const [fontFamily, setFontFamily] = useState('Roboto');
  const [fontSize, setFontSize] = useState(24);
  const [fontWeight, setFontWeight] = useState('Regular');
  const [fontStyle, setFontStyle] = useState('Normal');
  const [textColor, _setTextColor] = useState('#FFFFFF');
  const [strokeColor, _setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(120);
  const [shadowX, setShadowX] = useState(0);
  const [shadowY, setShadowY] = useState(2);
  const [shadowBlur, setShadowBlur] = useState(4);
  const [shadowColor, _setShadowColor] = useState('#00000080');
  const [alignment, setAlignment] = useState<TextAlignmentOption>('left');

  // Background tab state
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgColor, _setBgColor] = useState('#000000');
  const [bgOpacity, setBgOpacity] = useState(80);
  const [bgPaddingH, setBgPaddingH] = useState(8);
  const [bgPaddingV, setBgPaddingV] = useState(4);
  const [bgCornerRadius, setBgCornerRadius] = useState(4);

  // Image Fill tab state
  const [imgFillEnabled, setImgFillEnabled] = useState(false);
  const [imgFillStretchMode, setImgFillStretchMode] = useState('Stretch');
  const [imgFillOpacity, setImgFillOpacity] = useState(100);

  // Sync from layer on open
  useEffect(() => {
    if (open && tp) {
      setFontFamily(tp.fontFamily || 'Roboto');
      setFontSize(tp.fontSize || 24);
      setFontWeight(WEIGHT_REVERSE[tp.fontWeight] ?? 'Regular');
      setFontStyle(tp.fontStyle === 'italic' ? 'Italic' : 'Normal');
      _setTextColor(tp.color || '#FFFFFF');
      _setStrokeColor(tp.strokeColor || '#000000');
      setStrokeWidth(tp.strokeWidth || 0);
      setLetterSpacing(tp.letterSpacing || 0);
      setLineHeight(Math.round((tp.lineHeight || 1.2) * 100));
      setShadowX(tp.shadowOffsetX || 0);
      setShadowY(tp.shadowOffsetY || 2);
      setShadowBlur(tp.shadowBlur || 4);
      _setShadowColor(tp.shadowColor || '#00000080');
      setAlignment(tp.alignment || 'left');
      setBgEnabled(tp.hasBackground || false);
      _setBgColor(tp.backgroundColor || '#000000');
      setBgOpacity(Math.round((tp.backgroundOpacity || 0.5) * 100));
      setBgPaddingH(tp.backgroundPadding || 8);
      setBgPaddingV(tp.backgroundPadding || 4);
      setBgCornerRadius(tp.backgroundCornerRadius || 4);
    }
  }, [open]); // intentionally only trigger on open change

  // Debounced live preview - push changes to the layer
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushPreview = useCallback(() => {
    if (!targetId || !tp) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateLayer(targetId, {
        textProperties: {
          ...tp,
          fontFamily,
          fontSize,
          fontWeight: WEIGHT_MAP[fontWeight] ?? 400,
          fontStyle: fontStyle === 'Italic' ? 'italic' : 'normal',
          color: textColor,
          strokeColor,
          strokeWidth,
          letterSpacing,
          lineHeight: lineHeight / 100,
          alignment,
          shadowOffsetX: shadowX,
          shadowOffsetY: shadowY,
          shadowBlur,
          shadowColor,
          hasBackground: bgEnabled,
          backgroundColor: bgColor,
          backgroundOpacity: bgOpacity / 100,
          backgroundPadding: bgPaddingH,
          backgroundCornerRadius: bgCornerRadius,
        },
      });
    }, 150);
  }, [
    targetId, tp, fontFamily, fontSize, fontWeight, fontStyle, textColor,
    strokeColor, strokeWidth, letterSpacing, lineHeight, alignment,
    shadowX, shadowY, shadowBlur, shadowColor, bgEnabled, bgColor,
    bgOpacity, bgPaddingH, bgCornerRadius, updateLayer,
  ]);

  // Trigger preview on state changes (only when dialog is open)
  useEffect(() => {
    if (open) pushPreview();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    open, fontFamily, fontSize, fontWeight, fontStyle, strokeWidth,
    letterSpacing, lineHeight, alignment, shadowX, shadowY, shadowBlur,
    bgEnabled, bgOpacity, bgPaddingH, bgCornerRadius,
  ]);

  const handleCancel = useCallback(() => {
    // Restore original text properties
    if (targetId && originalRef.current) {
      updateLayer(targetId, { textProperties: originalRef.current });
    }
    onOpenChange(false);
  }, [targetId, updateLayer, onOpenChange]);

  const handleApply = useCallback(() => {
    if (targetId) pushUndo();
    onApply?.();
    onOpenChange(false);
  }, [targetId, pushUndo, onApply, onOpenChange]);

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={handleCancel}
        data-testid="text-props-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={handleApply}
        data-testid="text-props-apply"
      >
        Apply
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Text Properties"
      width={520}
      height={750}
      footer={footer}
    >
      <div data-testid="text-properties-dialog-content" className="flex h-full flex-col">
        <Tabs.Root
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabId)}
          className="flex flex-1 flex-col"
        >
          {/* Tab list */}
          <Tabs.List
            className="flex shrink-0 border-b"
            style={{ borderColor: 'var(--border-color)' }}
            data-testid="text-props-tabs"
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
                data-testid={`text-props-tab-${t.id}`}
              >
                {t.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* --- Basic tab --- */}
          <Tabs.Content value="basic" className="flex-1 overflow-auto p-3" data-testid="text-props-basic">
            <SectionLabel>Font</SectionLabel>
            <FieldRow label="Family">
              <Select.Root value={fontFamily} onValueChange={setFontFamily}>
                <Select.Trigger
                  className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs outline-none"
                  style={{
                    backgroundColor: '#2A2A2A',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    minWidth: 140,
                  }}
                  data-testid="font-family-select"
                >
                  <Select.Value />
                  <Select.Icon>
                    <Icon path={mdiChevronDown} size={12} color="var(--text-secondary)" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    className="overflow-hidden rounded border shadow-lg"
                    style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}
                  >
                    <Select.Viewport className="p-1">
                      {FONT_FAMILIES.map((f) => (
                        <Select.Item
                          key={f}
                          value={f}
                          className="cursor-pointer rounded px-2 py-1 text-xs outline-none hover:bg-[var(--hover-bg)]"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <Select.ItemText>{f}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </FieldRow>
            <FieldRow label="Size">
              <NumericUpDown value={fontSize} onChange={setFontSize} min={1} max={500} suffix="px" label="" width={70} />
            </FieldRow>
            <FieldRow label="Weight">
              <Select.Root value={fontWeight} onValueChange={setFontWeight}>
                <Select.Trigger
                  className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs outline-none"
                  style={{ backgroundColor: '#2A2A2A', borderColor: 'var(--border-color)', color: 'var(--text-primary)', minWidth: 100 }}
                  data-testid="font-weight-select"
                >
                  <Select.Value />
                  <Select.Icon><Icon path={mdiChevronDown} size={12} color="var(--text-secondary)" /></Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="overflow-hidden rounded border shadow-lg" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
                    <Select.Viewport className="p-1">
                      {FONT_WEIGHTS.map((w) => (
                        <Select.Item key={w} value={w} className="cursor-pointer rounded px-2 py-1 text-xs outline-none hover:bg-[var(--hover-bg)]" style={{ color: 'var(--text-primary)' }}>
                          <Select.ItemText>{w}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </FieldRow>
            <FieldRow label="Style">
              <Select.Root value={fontStyle} onValueChange={setFontStyle}>
                <Select.Trigger
                  className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs outline-none"
                  style={{ backgroundColor: '#2A2A2A', borderColor: 'var(--border-color)', color: 'var(--text-primary)', minWidth: 100 }}
                  data-testid="font-style-select"
                >
                  <Select.Value />
                  <Select.Icon><Icon path={mdiChevronDown} size={12} color="var(--text-secondary)" /></Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="overflow-hidden rounded border shadow-lg" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
                    <Select.Viewport className="p-1">
                      {FONT_STYLES.map((s) => (
                        <Select.Item key={s} value={s} className="cursor-pointer rounded px-2 py-1 text-xs outline-none hover:bg-[var(--hover-bg)]" style={{ color: 'var(--text-primary)' }}>
                          <Select.ItemText>{s}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </FieldRow>

            <div className="my-2 border-t" style={{ borderColor: 'var(--border-color)' }} />

            <SectionLabel>Color &amp; Stroke</SectionLabel>
            <FieldRow label="Text Color">
              <ColorSwatch color={textColor} size={20} label="text" />
            </FieldRow>
            <FieldRow label="Stroke Color">
              <ColorSwatch color={strokeColor} size={20} label="stroke" />
            </FieldRow>
            <FieldRow label="Stroke Width">
              <NumericUpDown value={strokeWidth} onChange={setStrokeWidth} min={0} max={50} suffix="px" width={60} />
            </FieldRow>

            <div className="my-2 border-t" style={{ borderColor: 'var(--border-color)' }} />

            <SectionLabel>Spacing</SectionLabel>
            <FieldRow label="Letter Spacing">
              <NumericUpDown value={letterSpacing} onChange={setLetterSpacing} min={-20} max={100} suffix="px" width={60} />
            </FieldRow>
            <FieldRow label="Line Height">
              <NumericUpDown value={lineHeight} onChange={setLineHeight} min={50} max={300} suffix="%" width={60} />
            </FieldRow>

            <div className="my-2 border-t" style={{ borderColor: 'var(--border-color)' }} />

            <SectionLabel>Shadow</SectionLabel>
            <FieldRow label="Offset X">
              <NumericUpDown value={shadowX} onChange={setShadowX} min={-100} max={100} suffix="px" width={60} />
            </FieldRow>
            <FieldRow label="Offset Y">
              <NumericUpDown value={shadowY} onChange={setShadowY} min={-100} max={100} suffix="px" width={60} />
            </FieldRow>
            <FieldRow label="Blur">
              <NumericUpDown value={shadowBlur} onChange={setShadowBlur} min={0} max={100} suffix="px" width={60} />
            </FieldRow>
            <FieldRow label="Shadow Color">
              <ColorSwatch color={shadowColor} size={20} label="shadow" />
            </FieldRow>

            <div className="my-2 border-t" style={{ borderColor: 'var(--border-color)' }} />

            <SectionLabel>Alignment</SectionLabel>
            <div className="flex gap-1" data-testid="text-alignment-buttons">
              {([
                { icon: mdiFormatAlignLeft, value: 'left' as TextAlignmentOption },
                { icon: mdiFormatAlignCenter, value: 'center' as TextAlignmentOption },
                { icon: mdiFormatAlignRight, value: 'right' as TextAlignmentOption },
                { icon: mdiFormatAlignJustify, value: 'justify' as TextAlignmentOption },
              ]).map((a) => (
                <button
                  key={a.value}
                  type="button"
                  className="rounded p-1.5 hover:bg-[var(--hover-bg)]"
                  style={{
                    backgroundColor: alignment === a.value ? 'var(--accent-orange)' : 'var(--toolbar-bg)',
                  }}
                  onClick={() => setAlignment(a.value)}
                  data-testid={`align-${a.value}`}
                >
                  <Icon path={a.icon} size="sm" color={alignment === a.value ? '#fff' : 'var(--text-secondary)'} />
                </button>
              ))}
            </div>
          </Tabs.Content>

          {/* --- Background tab --- */}
          <Tabs.Content value="background" className="flex-1 overflow-auto p-3" data-testid="text-props-background">
            <div className="flex items-center justify-between py-1">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Enable Background
              </span>
              <Switch.Root
                checked={bgEnabled}
                onCheckedChange={setBgEnabled}
                className="relative inline-flex items-center rounded-full"
                style={{ width: 34, height: 18, backgroundColor: bgEnabled ? 'var(--accent-orange)' : 'var(--border-color)' }}
                data-testid="bg-enable-toggle"
              >
                <Switch.Thumb
                  className="block rounded-full bg-white transition-transform"
                  style={{ width: 14, height: 14, transform: bgEnabled ? 'translateX(17px)' : 'translateX(2px)' }}
                />
              </Switch.Root>
            </div>

            <div style={{ opacity: bgEnabled ? 1 : 0.4, pointerEvents: bgEnabled ? 'auto' : 'none' }}>
              <FieldRow label="Color">
                <ColorSwatch color={bgColor} size={20} label="bg-color" />
              </FieldRow>
              <FieldRow label="Opacity">
                <NumericUpDown value={bgOpacity} onChange={setBgOpacity} min={0} max={100} suffix="%" width={60} />
              </FieldRow>
              <FieldRow label="Padding H">
                <NumericUpDown value={bgPaddingH} onChange={setBgPaddingH} min={0} max={100} suffix="px" width={60} />
              </FieldRow>
              <FieldRow label="Padding V">
                <NumericUpDown value={bgPaddingV} onChange={setBgPaddingV} min={0} max={100} suffix="px" width={60} />
              </FieldRow>
              <FieldRow label="Corner Radius">
                <NumericUpDown value={bgCornerRadius} onChange={setBgCornerRadius} min={0} max={100} suffix="px" width={60} />
              </FieldRow>
            </div>
          </Tabs.Content>

          {/* --- Image Fill tab --- */}
          <Tabs.Content value="image-fill" className="flex-1 overflow-auto p-3" data-testid="text-props-image-fill">
            <div className="flex items-center justify-between py-1">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Enable Image Fill
              </span>
              <Switch.Root
                checked={imgFillEnabled}
                onCheckedChange={setImgFillEnabled}
                className="relative inline-flex items-center rounded-full"
                style={{ width: 34, height: 18, backgroundColor: imgFillEnabled ? 'var(--accent-orange)' : 'var(--border-color)' }}
                data-testid="img-fill-enable-toggle"
              >
                <Switch.Thumb
                  className="block rounded-full bg-white transition-transform"
                  style={{ width: 14, height: 14, transform: imgFillEnabled ? 'translateX(17px)' : 'translateX(2px)' }}
                />
              </Switch.Root>
            </div>

            <div style={{ opacity: imgFillEnabled ? 1 : 0.4, pointerEvents: imgFillEnabled ? 'auto' : 'none' }}>
              <FieldRow label="Image">
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-xs"
                  style={{ borderColor: 'var(--border-color)', backgroundColor: '#2A2A2A', color: 'var(--text-secondary)' }}
                  data-testid="img-fill-selector"
                >
                  Select Image...
                </button>
              </FieldRow>
              <FieldRow label="Stretch Mode">
                <Select.Root value={imgFillStretchMode} onValueChange={setImgFillStretchMode}>
                  <Select.Trigger
                    className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs outline-none"
                    style={{ backgroundColor: '#2A2A2A', borderColor: 'var(--border-color)', color: 'var(--text-primary)', minWidth: 100 }}
                    data-testid="img-fill-stretch-select"
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
              </FieldRow>
              <FieldRow label="Opacity">
                <NumericUpDown value={imgFillOpacity} onChange={setImgFillOpacity} min={0} max={100} suffix="%" width={60} />
              </FieldRow>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </DialogBase>
  );
}

export default TextPropertiesWindow;
