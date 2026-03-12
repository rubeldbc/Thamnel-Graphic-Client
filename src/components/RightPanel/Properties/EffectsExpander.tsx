import { useState, useCallback, useRef } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import * as Slider from '@radix-ui/react-slider';
import * as Switch from '@radix-ui/react-switch';
import * as Select from '@radix-ui/react-select';
import { Icon } from '../../common/Icon';
import { NumericUpDown } from '../../common/NumericUpDown';
import { ColorSwatch } from '../../common/ColorSwatch';
import { mdiChevronDown, mdiChevronRight } from '@mdi/js';
import type { LayerModel } from '../../../types/LayerModel';
import type { LayerEffect } from '../../../types/LayerEffect';
import { BLEND_MODES } from '../../../types/enums';
import type { BlendMode } from '../../../types/enums';

// ---------------------------------------------------------------------------
// Effect definitions
// ---------------------------------------------------------------------------

interface EffectDef {
  key: string;
  label: string;
  enabledKey: string | null; // null for toggle-only effects (grayscale, sepia, invert)
}

const EFFECT_DEFS: EffectDef[] = [
  { key: 'brightness', label: 'Brightness', enabledKey: 'brightnessEnabled' },
  { key: 'contrast', label: 'Contrast', enabledKey: 'contrastEnabled' },
  { key: 'saturation', label: 'Saturation', enabledKey: 'saturationEnabled' },
  { key: 'hue', label: 'Hue', enabledKey: 'hueEnabled' },
  { key: 'grayscale', label: 'Grayscale', enabledKey: null },
  { key: 'sepia', label: 'Sepia', enabledKey: null },
  { key: 'invert', label: 'Invert', enabledKey: null },
  { key: 'sharpen', label: 'Sharpen', enabledKey: 'sharpenEnabled' },
  { key: 'vignette', label: 'Vignette', enabledKey: 'vignetteEnabled' },
  { key: 'pixelate', label: 'Pixelate', enabledKey: 'pixelateEnabled' },
  { key: 'colorTint', label: 'Color Tint', enabledKey: 'colorTintEnabled' },
  { key: 'noise', label: 'Noise', enabledKey: 'noiseEnabled' },
  { key: 'posterize', label: 'Posterize', enabledKey: 'posterizeEnabled' },
  { key: 'gaussianBlur', label: 'Gaussian Blur', enabledKey: 'gaussianBlurEnabled' },
  { key: 'dropShadow', label: 'Drop Shadow', enabledKey: 'dropShadowEnabled' },
  { key: 'outerGlow', label: 'Outer Glow', enabledKey: 'outerGlowEnabled' },
  { key: 'cutStroke', label: 'Cut Stroke', enabledKey: 'cutStrokeEnabled' },
  { key: 'rimLight', label: 'Rim Light', enabledKey: 'rimLightEnabled' },
  { key: 'splitToning', label: 'Split Toning', enabledKey: 'splitToningEnabled' },
  { key: 'smoothStroke', label: 'Smooth Stroke', enabledKey: 'smoothStrokeEnabled' },
  { key: 'blendOverlay', label: 'Blend Overlay', enabledKey: 'blendOverlayEnabled' },
];

// ---------------------------------------------------------------------------
// Inline slider helper (with debounce)
// ---------------------------------------------------------------------------

function InlineSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (v: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(v);
    }, 100);
  };

  return (
    <Slider.Root
      className="relative flex h-4 flex-1 items-center"
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([v]) => handleChange(v)}
    >
      <Slider.Track className="relative h-[3px] flex-1 rounded-full" style={{ backgroundColor: 'var(--border-color)' }}>
        <Slider.Range className="absolute h-full rounded-full" style={{ backgroundColor: 'var(--accent-orange)' }} />
      </Slider.Track>
      <Slider.Thumb
        className="block rounded-full outline-none"
        style={{ width: 8, height: 8, backgroundColor: 'var(--text-primary)' }}
      />
    </Slider.Root>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EffectsExpanderProps {
  /** The currently selected layer. */
  layer: LayerModel;
  /** Callback to push partial updates to the layer. */
  onUpdate: (changes: Partial<LayerModel>) => void;
  /** Initial open state (expanded by default). */
  defaultOpen?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EffectsExpander({
  layer,
  onUpdate,
  defaultOpen = true,
}: EffectsExpanderProps) {
  const [open, setOpen] = useState(defaultOpen);
  const effects = layer.effects;

  const updateEffects = useCallback(
    (changes: Partial<LayerEffect>) => {
      onUpdate({
        effects: { ...effects, ...changes },
      });
    },
    [effects, onUpdate],
  );

  /** Is the effect currently enabled? */
  const isEnabled = (def: EffectDef): boolean => {
    if (def.enabledKey === null) {
      // Toggle-only effects: grayscale, sepia, invert
      return (effects as unknown as Record<string, unknown>)[def.key] as boolean;
    }
    return (effects as unknown as Record<string, unknown>)[def.enabledKey] as boolean;
  };

  /** Toggle the effect on/off. */
  const toggleEffect = (def: EffectDef) => {
    if (def.enabledKey === null) {
      const current = (effects as unknown as Record<string, unknown>)[def.key] as boolean;
      updateEffects({ [def.key]: !current } as Partial<LayerEffect>);
    } else {
      const current = (effects as unknown as Record<string, unknown>)[def.enabledKey] as boolean;
      updateEffects({ [def.enabledKey]: !current } as Partial<LayerEffect>);
    }
  };

  /** Render inline parameter controls for an effect. */
  const renderParams = (def: EffectDef) => {
    switch (def.key) {
      case 'brightness':
        return (
          <div className="flex flex-1 items-center gap-1">
            <InlineSlider value={effects.brightness} min={-100} max={100} onChange={(v) => updateEffects({ brightness: v })} />
            <NumericUpDown value={effects.brightness} onChange={(v) => updateEffects({ brightness: v })} min={-100} max={100} width={40} />
          </div>
        );
      case 'contrast':
        return (
          <div className="flex flex-1 items-center gap-1">
            <InlineSlider value={effects.contrast} min={-100} max={100} onChange={(v) => updateEffects({ contrast: v })} />
            <NumericUpDown value={effects.contrast} onChange={(v) => updateEffects({ contrast: v })} min={-100} max={100} width={40} />
          </div>
        );
      case 'saturation':
        return (
          <div className="flex flex-1 items-center gap-1">
            <InlineSlider value={effects.saturation} min={-100} max={100} onChange={(v) => updateEffects({ saturation: v })} />
            <NumericUpDown value={effects.saturation} onChange={(v) => updateEffects({ saturation: v })} min={-100} max={100} width={40} />
          </div>
        );
      case 'hue':
        return (
          <div className="flex flex-1 items-center gap-1">
            <InlineSlider value={effects.hue} min={-180} max={180} onChange={(v) => updateEffects({ hue: v })} />
            <NumericUpDown value={effects.hue} onChange={(v) => updateEffects({ hue: v })} min={-180} max={180} width={40} suffix="deg" />
          </div>
        );
      case 'grayscale':
      case 'sepia':
      case 'invert':
        return null; // Toggle only
      case 'sharpen':
        return (
          <div className="flex flex-1 items-center gap-1">
            <InlineSlider value={effects.sharpen} min={0} max={1} step={0.01} onChange={(v) => updateEffects({ sharpen: v })} />
          </div>
        );
      case 'vignette':
        return (
          <div className="flex flex-1 items-center gap-1">
            <InlineSlider value={effects.vignette} min={0} max={1} step={0.01} onChange={(v) => updateEffects({ vignette: v })} />
          </div>
        );
      case 'pixelate':
        return (
          <div className="flex flex-1 items-center gap-1">
            <InlineSlider value={effects.pixelate} min={2} max={50} onChange={(v) => updateEffects({ pixelate: v })} />
            <NumericUpDown value={effects.pixelate} onChange={(v) => updateEffects({ pixelate: v })} min={2} max={50} width={40} />
          </div>
        );
      case 'colorTint':
        return (
          <div className="flex flex-1 items-center gap-1">
            <ColorSwatch color={effects.colorTintColor} size={14} label="tint color" />
            <InlineSlider value={effects.colorTintIntensity} min={0} max={1} step={0.01} onChange={(v) => updateEffects({ colorTintIntensity: v })} />
          </div>
        );
      case 'noise':
        return (
          <div className="flex flex-1 items-center gap-1">
            <InlineSlider value={effects.noise} min={1} max={100} onChange={(v) => updateEffects({ noise: v })} />
            <NumericUpDown value={effects.noise} onChange={(v) => updateEffects({ noise: v })} min={1} max={100} width={40} />
          </div>
        );
      case 'posterize':
        return (
          <div className="flex flex-1 items-center gap-1">
            <InlineSlider value={effects.posterize} min={2} max={16} onChange={(v) => updateEffects({ posterize: v })} />
            <NumericUpDown value={effects.posterize} onChange={(v) => updateEffects({ posterize: v })} min={2} max={16} width={40} />
          </div>
        );
      case 'gaussianBlur':
        return (
          <div className="flex flex-1 items-center gap-1">
            <InlineSlider value={effects.gaussianBlur} min={1} max={50} onChange={(v) => updateEffects({ gaussianBlur: v })} />
            <NumericUpDown value={effects.gaussianBlur} onChange={(v) => updateEffects({ gaussianBlur: v })} min={1} max={50} width={40} />
          </div>
        );
      case 'dropShadow':
        return (
          <div className="flex flex-1 flex-wrap items-center gap-1">
            <ColorSwatch color={effects.dropShadowColor} size={14} label="shadow color" />
            <NumericUpDown label="X" value={effects.dropShadowOffsetX} onChange={(v) => updateEffects({ dropShadowOffsetX: v })} min={-50} max={50} width={36} />
            <NumericUpDown label="Y" value={effects.dropShadowOffsetY} onChange={(v) => updateEffects({ dropShadowOffsetY: v })} min={-50} max={50} width={36} />
            <NumericUpDown label="Blur" value={effects.dropShadowBlur} onChange={(v) => updateEffects({ dropShadowBlur: v })} min={0} max={50} width={36} />
          </div>
        );
      case 'outerGlow':
        return (
          <div className="flex flex-1 items-center gap-1">
            <ColorSwatch color={effects.outerGlowColor} size={14} label="glow color" />
            <NumericUpDown label="R" value={effects.outerGlowRadius} onChange={(v) => updateEffects({ outerGlowRadius: v })} min={1} max={200} width={40} />
            <NumericUpDown label="Op" value={effects.outerGlowIntensity} onChange={(v) => updateEffects({ outerGlowIntensity: v })} min={0} max={100} width={40} />
          </div>
        );
      case 'cutStroke':
        return (
          <div className="flex flex-1 items-center gap-1">
            <ColorSwatch color={effects.cutStrokeColor} size={14} label="cut stroke color" />
            <NumericUpDown label="W" value={effects.cutStrokeWidth} onChange={(v) => updateEffects({ cutStrokeWidth: v })} min={1} max={20} width={40} />
          </div>
        );
      case 'rimLight':
        return (
          <div className="flex flex-1 flex-wrap items-center gap-1">
            <ColorSwatch color={effects.rimLightColor} size={14} label="rim light color" />
            <NumericUpDown label="Int" value={effects.rimLightIntensity} onChange={(v) => updateEffects({ rimLightIntensity: v })} min={0} max={100} width={40} />
            <NumericUpDown label="W" value={effects.rimLightWidth} onChange={(v) => updateEffects({ rimLightWidth: v })} min={0} max={50} width={36} />
          </div>
        );
      case 'splitToning':
        return (
          <div className="flex flex-1 items-center gap-1">
            <ColorSwatch color={effects.splitToningHighlightColor} size={14} label="highlight" />
            <ColorSwatch color={effects.splitToningShadowColor} size={14} label="shadow" />
            <InlineSlider value={effects.splitToningBalance} min={0} max={100} onChange={(v) => updateEffects({ splitToningBalance: v })} />
          </div>
        );
      case 'smoothStroke':
        return (
          <div className="flex flex-1 items-center gap-1">
            <ColorSwatch color={effects.smoothStrokeColor} size={14} label="smooth stroke color" />
            <NumericUpDown label="W" value={effects.smoothStrokeWidth} onChange={(v) => updateEffects({ smoothStrokeWidth: v })} min={0} max={50} width={40} />
            <NumericUpDown label="Op" value={effects.smoothStrokeOpacity} onChange={(v) => updateEffects({ smoothStrokeOpacity: v })} min={0} max={1} step={0.01} width={40} />
          </div>
        );
      case 'blendOverlay':
        return (
          <div className="flex flex-1 items-center gap-1">
            <Select.Root
              value={effects.blendOverlayMode}
              onValueChange={(v) => updateEffects({ blendOverlayMode: v as BlendMode })}
            >
              <Select.Trigger
                data-testid="blend-overlay-mode-select"
                className="inline-flex shrink-0 items-center justify-between gap-0.5 rounded-sm border px-1 outline-none"
                style={{
                  width: 60,
                  height: 18,
                  backgroundColor: '#2A2A2A',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: 10,
                }}
              >
                <Select.Value />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  className="z-50 overflow-hidden rounded-md border shadow-lg"
                  style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}
                  position="popper"
                  sideOffset={2}
                >
                  <Select.Viewport className="p-1">
                    {BLEND_MODES.map((m) => (
                      <Select.Item
                        key={m.value}
                        value={m.value}
                        className="cursor-default rounded-sm px-2 py-0.5 text-[10px] outline-none select-none data-[highlighted]:bg-[var(--hover-bg)]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <Select.ItemText>{m.label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
            <InlineSlider value={effects.blendOverlayOpacity} min={0} max={1} step={0.01} onChange={(v) => updateEffects({ blendOverlayOpacity: v })} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Collapsible.Root
      data-testid="effects-expander"
      open={open}
      onOpenChange={setOpen}
    >
      <Collapsible.Trigger
        data-testid="effects-expander-trigger"
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
        EFFECTS
      </Collapsible.Trigger>

      <Collapsible.Content data-testid="effects-expander-content">
        <div className="flex flex-col" style={{ fontSize: 11 }}>
          {EFFECT_DEFS.map((def) => {
            const enabled = isEnabled(def);
            return (
              <div
                key={def.key}
                data-testid={`effect-row-${def.key}`}
                className="flex items-center gap-1.5 border-b px-2 py-1"
                style={{ borderColor: 'var(--border-color)' }}
              >
                {/* Enable toggle */}
                <Switch.Root
                  data-testid={`effect-toggle-${def.key}`}
                  checked={enabled}
                  onCheckedChange={() => toggleEffect(def)}
                  className="relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-none outline-none"
                  style={{
                    width: 26,
                    height: 14,
                    backgroundColor: enabled ? 'var(--accent-orange)' : 'var(--border-color)',
                  }}
                >
                  <Switch.Thumb
                    className="block rounded-full transition-transform"
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: '#FFFFFF',
                      transform: enabled ? 'translateX(13px)' : 'translateX(2px)',
                    }}
                  />
                </Switch.Root>

                {/* Effect name */}
                <span
                  data-testid={`effect-name-${def.key}`}
                  className="shrink-0 select-none"
                  style={{
                    width: 80,
                    color: enabled ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: 11,
                  }}
                >
                  {def.label}
                </span>

                {/* Inline parameters */}
                <div className="flex min-w-0 flex-1 items-center">
                  {renderParams(def)}
                </div>
              </div>
            );
          })}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

export default EffectsExpander;
