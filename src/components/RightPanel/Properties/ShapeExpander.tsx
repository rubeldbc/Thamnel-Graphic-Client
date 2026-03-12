import { useState, useCallback } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import * as Slider from '@radix-ui/react-slider';
import { Icon } from '../../common/Icon';
import { NumericUpDown } from '../../common/NumericUpDown';
import { ColorSwatch } from '../../common/ColorSwatch';
import { mdiChevronDown, mdiChevronRight } from '@mdi/js';
import type { LayerModel } from '../../../types/LayerModel';
import type { ShapeProperties } from '../../../types/ShapeProperties';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ShapeExpanderProps {
  /** The currently selected layer. */
  layer: LayerModel;
  /** Callback to push partial updates to the layer. */
  onUpdate: (changes: Partial<LayerModel>) => void;
  /** Initial open state (expanded by default for shape layers). */
  defaultOpen?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Collapsible "SHAPE" section with fill colour, border, and corner radius.
 * Expanded by default per Phase 10E spec.
 */
export function ShapeExpander({
  layer,
  onUpdate,
  defaultOpen = true,
}: ShapeExpanderProps) {
  const [open, setOpen] = useState(defaultOpen);

  const sp = layer.shapeProperties;
  if (!sp) return null;

  const updateShape = useCallback(
    (changes: Partial<ShapeProperties>) => {
      onUpdate({
        shapeProperties: { ...sp, ...changes },
      });
    },
    [sp, onUpdate],
  );

  return (
    <Collapsible.Root
      data-testid="shape-expander"
      open={open}
      onOpenChange={setOpen}
    >
      <Collapsible.Trigger
        data-testid="shape-expander-trigger"
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
        SHAPE
      </Collapsible.Trigger>

      <Collapsible.Content data-testid="shape-expander-content">
        <div className="flex flex-col gap-2 px-2 py-2" style={{ fontSize: 11 }}>
          {/* Fill colour */}
          <div className="flex items-center gap-2">
            <span className="select-none" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Fill</span>
            <ColorSwatch color={sp.fillColor} size={20} label="fill" />
          </div>

          {/* Border colour + width + slider */}
          <div className="flex items-center gap-2">
            <span className="select-none" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Border</span>
            <ColorSwatch color={sp.borderColor} size={20} label="border" />
            <NumericUpDown
              value={sp.borderWidth}
              onChange={(v) => updateShape({ borderWidth: v })}
              min={0}
              max={50}
              width={50}
              suffix="px"
            />
            <Slider.Root
              className="relative flex h-4 flex-1 items-center"
              value={[sp.borderWidth]}
              min={0}
              max={50}
              step={1}
              onValueChange={([v]) => updateShape({ borderWidth: v })}
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

          {/* Corner radius + slider */}
          <div className="flex items-center gap-2">
            <NumericUpDown
              label="Radius"
              value={sp.cornerRadius}
              onChange={(v) => updateShape({ cornerRadius: v })}
              min={0}
              max={500}
              width={60}
              suffix="px"
            />
            <Slider.Root
              className="relative flex h-4 flex-1 items-center"
              value={[sp.cornerRadius]}
              min={0}
              max={500}
              step={1}
              onValueChange={([v]) => updateShape({ cornerRadius: v })}
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
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

export default ShapeExpander;
