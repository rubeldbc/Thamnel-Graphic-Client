import { useState, useCallback, useRef, useEffect } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import * as Slider from '@radix-ui/react-slider';
import { Icon } from '../../common/Icon';
import { NumericUpDown } from '../../common/NumericUpDown';
import { ColorSwatch } from '../../common/ColorSwatch';
import {
  mdiChevronDown,
  mdiChevronRight,
  mdiFormatBold,
  mdiFormatItalic,
  mdiFormatUnderline,
  mdiFormatStrikethrough,
  mdiFormatColorFill,
  mdiFormatAlignLeft,
  mdiFormatAlignCenter,
  mdiFormatAlignRight,
  mdiFormatAlignJustify,
} from '@mdi/js';
import type { LayerModel } from '../../../types/LayerModel';
import type { TextProperties } from '../../../types/TextProperties';
import type { TextAlignmentOption } from '../../../types/enums';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TextExpanderProps {
  /** The currently selected layer. */
  layer: LayerModel;
  /** Callback to push partial updates to the layer. */
  onUpdate: (changes: Partial<LayerModel>) => void;
  /** Initial open state (expanded by default for text layers). */
  defaultOpen?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Collapsible "TEXT" section with text content, font, style toggles, alignment, etc.
 * Expanded by default per Phase 10D spec.
 */
export function TextExpander({
  layer,
  onUpdate,
  defaultOpen = true,
}: TextExpanderProps) {
  const [open, setOpen] = useState(defaultOpen);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tp = layer.textProperties;
  if (!tp) return null;

  const updateText = useCallback(
    (changes: Partial<TextProperties>) => {
      onUpdate({
        textProperties: { ...tp, ...changes },
      });
    },
    [tp, onUpdate],
  );

  // Debounced text content change (150ms)
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateText({ text: value });
      }, 150);
    },
    [updateText],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const styleButtons: Array<{
    field: 'fontWeight' | 'fontStyle' | 'underline' | 'strikethrough' | 'hasBackground';
    icon: string;
    title: string;
    isActive: boolean;
  }> = [
    { field: 'fontWeight', icon: mdiFormatBold, title: 'Bold', isActive: tp.fontWeight >= 700 },
    { field: 'fontStyle', icon: mdiFormatItalic, title: 'Italic', isActive: tp.fontStyle === 'italic' },
    { field: 'underline', icon: mdiFormatUnderline, title: 'Underline', isActive: tp.underline },
    { field: 'strikethrough', icon: mdiFormatStrikethrough, title: 'Strikethrough', isActive: tp.strikethrough },
    { field: 'hasBackground', icon: mdiFormatColorFill, title: 'Has Background', isActive: tp.hasBackground },
  ];

  const toggleStyle = (field: string) => {
    switch (field) {
      case 'fontWeight':
        updateText({ fontWeight: tp.fontWeight >= 700 ? 400 : 700 });
        break;
      case 'fontStyle':
        updateText({ fontStyle: tp.fontStyle === 'italic' ? 'normal' : 'italic' });
        break;
      case 'underline':
        updateText({ underline: !tp.underline });
        break;
      case 'strikethrough':
        updateText({ strikethrough: !tp.strikethrough });
        break;
      case 'hasBackground':
        updateText({ hasBackground: !tp.hasBackground });
        break;
    }
  };

  const alignButtons: Array<{
    value: TextAlignmentOption;
    icon: string;
    title: string;
  }> = [
    { value: 'left', icon: mdiFormatAlignLeft, title: 'Align Left' },
    { value: 'center', icon: mdiFormatAlignCenter, title: 'Align Center' },
    { value: 'right', icon: mdiFormatAlignRight, title: 'Align Right' },
    { value: 'justify', icon: mdiFormatAlignJustify, title: 'Justify' },
  ];

  return (
    <Collapsible.Root
      data-testid="text-expander"
      open={open}
      onOpenChange={setOpen}
    >
      <Collapsible.Trigger
        data-testid="text-expander-trigger"
        className="flex w-full cursor-pointer items-center gap-1 border-b px-2 py-1 text-left select-none"
        style={{
          backgroundColor: 'var(--toolbar-bg)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        <Icon path={open ? mdiChevronDown : mdiChevronRight} size={14} color="var(--text-secondary)" />
        TEXT
      </Collapsible.Trigger>

      <Collapsible.Content data-testid="text-expander-content">
        <div className="flex flex-col gap-2 px-2 py-2" style={{ fontSize: 11 }}>
          {/* Text content */}
          <textarea
            data-testid="text-content-input"
            defaultValue={tp.text}
            onChange={handleTextChange}
            placeholder="Enter text..."
            className="w-full resize-y rounded-sm border px-1.5 py-1 outline-none"
            style={{
              minHeight: 60,
              backgroundColor: '#2A2A2A',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: 11,
              fontFamily: 'inherit',
            }}
          />

          {/* Font family */}
          <input
            data-testid="text-font-family"
            type="text"
            value={tp.fontFamily}
            onChange={(e) => updateText({ fontFamily: e.target.value })}
            placeholder="Font family"
            className="w-full rounded-sm border px-1.5 py-0.5 outline-none"
            style={{
              height: 22,
              backgroundColor: '#2A2A2A',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: 11,
            }}
          />

          {/* Font size */}
          <div className="flex items-center gap-2">
            <NumericUpDown
              label="Size"
              value={tp.fontSize}
              onChange={(v) => updateText({ fontSize: v })}
              min={8}
              max={200}
              width={60}
              suffix="px"
            />
            <Slider.Root
              className="relative flex h-4 flex-1 items-center"
              value={[tp.fontSize]}
              min={8}
              max={200}
              step={1}
              onValueChange={([v]) => updateText({ fontSize: v })}
            >
              <Slider.Track className="relative h-[3px] flex-1 rounded-full" style={{ backgroundColor: 'var(--border-color)' }}>
                <Slider.Range className="absolute h-full rounded-full" style={{ backgroundColor: 'var(--accent-orange)' }} />
              </Slider.Track>
              <Slider.Thumb
                className="block rounded-full outline-none"
                style={{ width: 10, height: 10, backgroundColor: 'var(--text-primary)' }}
              />
            </Slider.Root>
          </div>

          {/* Style toggles */}
          <div className="flex items-center gap-1">
            {styleButtons.map(({ field, icon, title, isActive }) => (
              <button
                key={field}
                type="button"
                data-testid={`text-style-${field}`}
                title={title}
                onClick={() => toggleStyle(field)}
                className="flex cursor-pointer items-center justify-center rounded-sm border outline-none"
                style={{
                  width: 30,
                  height: 30,
                  backgroundColor: isActive ? 'var(--accent-orange)' : '#2A2A2A',
                  borderColor: isActive ? 'var(--accent-orange)' : 'var(--border-color)',
                }}
              >
                <Icon
                  path={icon}
                  size={14}
                  color={isActive ? '#FFFFFF' : 'var(--text-secondary)'}
                />
              </button>
            ))}
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-1">
            {alignButtons.map(({ value, icon, title }) => (
              <button
                key={value}
                type="button"
                data-testid={`text-align-${value}`}
                title={title}
                onClick={() => updateText({ alignment: value })}
                className="flex cursor-pointer items-center justify-center rounded-sm border outline-none"
                style={{
                  width: 30,
                  height: 30,
                  backgroundColor: tp.alignment === value ? 'var(--accent-orange)' : '#2A2A2A',
                  borderColor: tp.alignment === value ? 'var(--accent-orange)' : 'var(--border-color)',
                }}
              >
                <Icon
                  path={icon}
                  size={14}
                  color={tp.alignment === value ? '#FFFFFF' : 'var(--text-secondary)'}
                />
              </button>
            ))}
          </div>

          {/* Text colour */}
          <div className="flex items-center gap-2">
            <span className="select-none" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Color</span>
            <ColorSwatch color={tp.color} size={26} label="text color" />
          </div>

          {/* Stroke */}
          <div className="flex items-center gap-2">
            <span className="select-none" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Stroke</span>
            <ColorSwatch color={tp.strokeColor} size={26} label="stroke color" />
            <NumericUpDown
              value={tp.strokeWidth}
              onChange={(v) => updateText({ strokeWidth: v })}
              min={0}
              max={50}
              width={50}
              suffix="px"
            />
            <Slider.Root
              className="relative flex h-4 flex-1 items-center"
              value={[tp.strokeWidth]}
              min={0}
              max={50}
              step={1}
              onValueChange={([v]) => updateText({ strokeWidth: v })}
            >
              <Slider.Track className="relative h-[3px] flex-1 rounded-full" style={{ backgroundColor: 'var(--border-color)' }}>
                <Slider.Range className="absolute h-full rounded-full" style={{ backgroundColor: 'var(--accent-orange)' }} />
              </Slider.Track>
              <Slider.Thumb
                className="block rounded-full outline-none"
                style={{ width: 10, height: 10, backgroundColor: 'var(--text-primary)' }}
              />
            </Slider.Root>
          </div>

          {/* Width/Height Squeeze */}
          <div className="grid grid-cols-2 gap-2">
            <NumericUpDown label="W Squeeze" value={tp.widthSqueeze} onChange={(v) => updateText({ widthSqueeze: v })} min={0.1} max={5} step={0.1} width={60} />
            <NumericUpDown label="H Squeeze" value={tp.heightSqueeze} onChange={(v) => updateText({ heightSqueeze: v })} min={0.1} max={5} step={0.1} width={60} />
          </div>
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

export default TextExpander;
