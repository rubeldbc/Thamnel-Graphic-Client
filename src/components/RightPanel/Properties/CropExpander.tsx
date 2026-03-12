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

export interface CropExpanderProps {
  /** The currently selected layer. */
  layer: LayerModel;
  /** Callback to push partial updates to the layer. */
  onUpdate: (changes: Partial<LayerModel>) => void;
  /** Initial collapsed/expanded state (collapsed by default). */
  defaultOpen?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Collapsible "CROP" section for image layers.
 * Top, Bottom, Left, Right with NUD (0-5000) + Slider (0-500).
 */
export function CropExpander({
  layer,
  onUpdate,
  defaultOpen = false,
}: CropExpanderProps) {
  const [open, setOpen] = useState(defaultOpen);

  const handleChange = useCallback(
    (field: 'cropTop' | 'cropBottom' | 'cropLeft' | 'cropRight', val: number) => {
      onUpdate({ [field]: val });
    },
    [onUpdate],
  );

  const fields: Array<{ label: string; field: 'cropTop' | 'cropBottom' | 'cropLeft' | 'cropRight' }> = [
    { label: 'Top', field: 'cropTop' },
    { label: 'Bottom', field: 'cropBottom' },
    { label: 'Left', field: 'cropLeft' },
    { label: 'Right', field: 'cropRight' },
  ];

  return (
    <Collapsible.Root
      data-testid="crop-expander"
      open={open}
      onOpenChange={setOpen}
    >
      <Collapsible.Trigger
        data-testid="crop-expander-trigger"
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
        CROP
      </Collapsible.Trigger>

      <Collapsible.Content data-testid="crop-expander-content">
        <div className="flex flex-col gap-2 px-2 py-2" style={{ fontSize: 11 }}>
          {fields.map(({ label, field }) => (
            <div key={field} className="flex items-center gap-2">
              <NumericUpDown
                label={label}
                value={layer[field]}
                onChange={(v) => handleChange(field, v)}
                min={0}
                max={5000}
                width={60}
                suffix="px"
              />
              <Slider.Root
                className="relative flex h-4 flex-1 items-center"
                value={[layer[field]]}
                min={0}
                max={500}
                step={1}
                onValueChange={([v]) => handleChange(field, v)}
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
          ))}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

export default CropExpander;
