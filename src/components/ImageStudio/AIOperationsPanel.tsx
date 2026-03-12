import { useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import * as Slider from '@radix-ui/react-slider';
import { Icon } from '../common/Icon';
import {
  mdiAutoFix,
  mdiFaceRecognition,
  mdiBlurRadial,
  mdiImageEditOutline,
  mdiPalette,
  mdiDrawPen,
  mdiLayersTriple,
  mdiChevronDown,
} from '@mdi/js';

// ---------------------------------------------------------------------------
// Inline slider helper (consistent with EffectsExpander pattern)
// ---------------------------------------------------------------------------

function InlineSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="min-w-[80px] select-none text-text-secondary" style={{ fontSize: 11 }}>
          {label}
        </span>
      )}
      <Slider.Root
        className="relative flex h-4 flex-1 items-center"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      >
        <Slider.Track
          className="relative h-[3px] flex-1 rounded-full"
          style={{ backgroundColor: 'var(--border-color)' }}
        >
          <Slider.Range
            className="absolute h-full rounded-full"
            style={{ backgroundColor: 'var(--accent-orange)' }}
          />
        </Slider.Track>
        <Slider.Thumb
          className="block rounded-full outline-none"
          style={{ width: 10, height: 10, backgroundColor: 'var(--text-primary)' }}
        />
      </Slider.Root>
      <span className="min-w-[28px] text-right text-text-secondary" style={{ fontSize: 11 }}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

interface SectionDef {
  value: string;
  label: string;
  icon: string;
}

const SECTIONS: SectionDef[] = [
  { value: 'scratch', label: 'Scratch Remover', icon: mdiAutoFix },
  { value: 'face', label: 'Face Restoration', icon: mdiFaceRecognition },
  { value: 'denoise', label: 'Denoise', icon: mdiBlurRadial },
  { value: 'inpaint', label: 'Inpaint / Outpaint', icon: mdiImageEditOutline },
  { value: 'colorize', label: 'Colorize', icon: mdiPalette },
  { value: 'cartoonize', label: 'Cartoonize', icon: mdiDrawPen },
  { value: 'separation', label: 'Background Separation', icon: mdiLayersTriple },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface AIOperationsPanelProps {
  onAction?: (action: string, params?: Record<string, unknown>) => void;
}

export function AIOperationsPanel({ onAction }: AIOperationsPanelProps) {
  const [faceQuality, setFaceQuality] = useState(50);
  const [denoiseStrength, setDenoiseStrength] = useState(50);
  const [inpaintMode, setInpaintMode] = useState<'inpaint' | 'outpaint'>('inpaint');
  const [cartoonStyle, setCartoonStyle] = useState<'classic' | 'anime' | 'sketch'>('classic');
  const [edgeRefinement, setEdgeRefinement] = useState(50);

  const renderContent = (value: string) => {
    switch (value) {
      case 'scratch':
        return (
          <button
            type="button"
            className="w-full rounded px-3 py-1.5 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--accent-orange)' }}
            onClick={() => onAction?.('scratch-remove')}
          >
            Remove Scratches
          </button>
        );

      case 'face':
        return (
          <div className="flex flex-col gap-2">
            <InlineSlider
              label="Quality"
              value={faceQuality}
              min={0}
              max={100}
              onChange={setFaceQuality}
            />
            <button
              type="button"
              className="w-full rounded px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--accent-orange)' }}
              onClick={() => onAction?.('face-restore', { quality: faceQuality })}
            >
              Restore Faces
            </button>
          </div>
        );

      case 'denoise':
        return (
          <div className="flex flex-col gap-2">
            <InlineSlider
              label="Strength"
              value={denoiseStrength}
              min={0}
              max={100}
              onChange={setDenoiseStrength}
            />
            <button
              type="button"
              className="w-full rounded px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--accent-orange)' }}
              onClick={() => onAction?.('denoise', { strength: denoiseStrength })}
            >
              Denoise
            </button>
          </div>
        );

      case 'inpaint':
        return (
          <div className="flex flex-col gap-2">
            <div className="flex gap-1">
              <button
                type="button"
                className="flex-1 rounded px-2 py-1 text-xs"
                style={{
                  backgroundColor: inpaintMode === 'inpaint' ? 'var(--accent-orange)' : 'var(--toolbar-bg)',
                  color: inpaintMode === 'inpaint' ? '#fff' : 'var(--text-secondary)',
                }}
                onClick={() => setInpaintMode('inpaint')}
              >
                Inpaint
              </button>
              <button
                type="button"
                className="flex-1 rounded px-2 py-1 text-xs"
                style={{
                  backgroundColor: inpaintMode === 'outpaint' ? 'var(--accent-orange)' : 'var(--toolbar-bg)',
                  color: inpaintMode === 'outpaint' ? '#fff' : 'var(--text-secondary)',
                }}
                onClick={() => setInpaintMode('outpaint')}
              >
                Outpaint
              </button>
            </div>
            <button
              type="button"
              className="w-full rounded px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--accent-orange)' }}
              onClick={() => onAction?.('inpaint-outpaint', { mode: inpaintMode })}
            >
              Process
            </button>
          </div>
        );

      case 'colorize':
        return (
          <button
            type="button"
            className="w-full rounded px-3 py-1.5 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--accent-orange)' }}
            onClick={() => onAction?.('colorize')}
          >
            Colorize
          </button>
        );

      case 'cartoonize':
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="min-w-[80px] select-none text-text-secondary" style={{ fontSize: 11 }}>
                Style
              </span>
              <select
                value={cartoonStyle}
                onChange={(e) => setCartoonStyle(e.target.value as 'classic' | 'anime' | 'sketch')}
                className="flex-1 rounded border px-2 py-1 text-xs outline-none"
                style={{
                  backgroundColor: 'var(--toolbar-bg)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="classic">Classic</option>
                <option value="anime">Anime</option>
                <option value="sketch">Sketch</option>
              </select>
            </div>
            <button
              type="button"
              className="w-full rounded px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--accent-orange)' }}
              onClick={() => onAction?.('cartoonize', { style: cartoonStyle })}
            >
              Cartoonize
            </button>
          </div>
        );

      case 'separation':
        return (
          <div className="flex flex-col gap-2">
            <InlineSlider
              label="Edge Refine"
              value={edgeRefinement}
              min={0}
              max={100}
              onChange={setEdgeRefinement}
            />
            <button
              type="button"
              className="w-full rounded px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--accent-orange)' }}
              onClick={() => onAction?.('separate-background', { edgeRefinement })}
            >
              Separate Background
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div data-testid="ai-operations-panel" className="flex flex-col">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
        AI Operations
      </div>
      <Accordion.Root type="single" collapsible className="flex flex-col">
        {SECTIONS.map((section) => (
          <Accordion.Item
            key={section.value}
            value={section.value}
            className="border-b"
            style={{ borderColor: 'var(--border-color)' }}
            data-testid={`ai-section-${section.value}`}
          >
            <Accordion.Header>
              <Accordion.Trigger className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary outline-none hover:bg-hover-bg data-[state=open]:text-accent-orange">
                <Icon path={section.icon} size="sm" />
                <span className="flex-1">{section.label}</span>
                <Icon
                  path={mdiChevronDown}
                  size="sm"
                  className="transition-transform duration-200 [[data-state=open]>&]:rotate-180"
                />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="overflow-hidden px-3 pb-3 data-[state=closed]:animate-none data-[state=open]:animate-none">
              {renderContent(section.value)}
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </div>
  );
}

export default AIOperationsPanel;
