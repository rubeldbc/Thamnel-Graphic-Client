import { useState, useCallback } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import * as Slider from '@radix-ui/react-slider';
import { Icon } from '../../common/Icon';
import { NumericUpDown } from '../../common/NumericUpDown';
import { mdiChevronDown, mdiChevronRight } from '@mdi/js';
import type { LayerModel } from '../../../types/LayerModel';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PositionExpanderProps {
  /** The currently selected layer. */
  layer: LayerModel;
  /** Callback to push partial updates to the layer. */
  onUpdate: (changes: Partial<LayerModel>) => void;
  /** Initial collapsed/expanded state. */
  defaultOpen?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Collapsible "POSITION" section with X, Y, Width, Height, Rotation, Padding.
 * Collapsed by default per Phase 10B spec.
 */
export function PositionExpander({
  layer,
  onUpdate,
  defaultOpen = false,
}: PositionExpanderProps) {
  const [open, setOpen] = useState(defaultOpen);

  const handleChange = useCallback(
    (field: keyof LayerModel, val: number) => {
      onUpdate({ [field]: val });
    },
    [onUpdate],
  );

  return (
    <Collapsible.Root
      data-testid="position-expander"
      open={open}
      onOpenChange={setOpen}
    >
      <Collapsible.Trigger
        data-testid="position-expander-trigger"
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
        POSITION
      </Collapsible.Trigger>

      <Collapsible.Content data-testid="position-expander-content">
        <div className="flex flex-col gap-2 px-2 py-2" style={{ fontSize: 11 }}>
          {/* X / Y row */}
          <div className="grid grid-cols-2 gap-2">
            <NumericUpDown label="X" value={layer.x} onChange={(v) => handleChange('x', v)} min={-5000} max={5000} width={70} suffix="px" />
            <NumericUpDown label="Y" value={layer.y} onChange={(v) => handleChange('y', v)} min={-5000} max={5000} width={70} suffix="px" />
          </div>

          {/* Width / Height row */}
          <div className="grid grid-cols-2 gap-2">
            <NumericUpDown label="W" value={layer.width} onChange={(v) => handleChange('width', v)} min={1} max={10000} width={70} suffix="px" />
            <NumericUpDown label="H" value={layer.height} onChange={(v) => handleChange('height', v)} min={1} max={10000} width={70} suffix="px" />
          </div>

          {/* Rotation */}
          <NumericUpDown label="Rotation" value={layer.rotation} onChange={(v) => handleChange('rotation', v)} min={-360} max={360} width={70} suffix="deg" />

          {/* Padding + Slider */}
          <div className="flex items-center gap-2">
            <NumericUpDown label="Padding" value={layer.padding} onChange={(v) => handleChange('padding', v)} min={0} max={200} width={60} suffix="px" />
            <Slider.Root
              className="relative flex h-4 flex-1 items-center"
              value={[layer.padding]}
              min={0}
              max={200}
              step={1}
              onValueChange={([v]) => handleChange('padding', v)}
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

export default PositionExpander;
