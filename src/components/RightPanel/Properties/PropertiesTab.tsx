import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Select from '@radix-ui/react-select';
import * as Slider from '@radix-ui/react-slider';
import { Icon } from '../../common/Icon';
import { NumericUpDown } from '../../common/NumericUpDown';
import { PositionExpander } from './PositionExpander';
import { CropExpander } from './CropExpander';
import { TextExpander } from './TextExpander';
import { ShapeExpander } from './ShapeExpander';
import { EffectsExpander } from './EffectsExpander';
import { useDocumentStore } from '../../../stores/documentStore';
import { useUndoRedoStore } from '../../../stores/undoRedoStore';
import { BLEND_MODES } from '../../../types/enums';
import type { BlendMode } from '../../../types/enums';
import type { LayerModel } from '../../../types/LayerModel';
import {
  mdiChevronDown,
  mdiTune,
  mdiContentSave,
  mdiDelete,
  mdiMemory,
} from '@mdi/js';
import { useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PropertiesTabProps {
  /** Placeholder – kept for backward compatibility with RightPanel. */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PropertiesTab(_props: PropertiesTabProps) {
  const project = useDocumentStore((s) => s.project);
  const selectedLayerIds = useDocumentStore((s) => s.selectedLayerIds);
  const updateLayer = useDocumentStore((s) => s.updateLayer);
  const takeSnapshot = useUndoRedoStore((s) => s.takeSnapshot);

  const [showPresets, setShowPresets] = useState(false);
  const [presetValue, setPresetValue] = useState('');

  // Derive selected layer
  const selectedLayer: LayerModel | null =
    selectedLayerIds.length === 1
      ? project.layers.find((l) => l.id === selectedLayerIds[0]) ?? null
      : null;

  // ----- Helpers -----
  const update = useCallback(
    (changes: Partial<LayerModel>) => {
      if (!selectedLayer) return;
      takeSnapshot();
      updateLayer(selectedLayer.id, changes);
    },
    [selectedLayer, takeSnapshot, updateLayer],
  );

  // No layer selected state
  if (!selectedLayer) {
    return (
      <div
        data-testid="properties-tab"
        className="flex h-full items-center justify-center"
        style={{ backgroundColor: 'var(--panel-bg)', color: 'var(--text-disabled)', fontSize: 12 }}
      >
        No layer selected
      </div>
    );
  }

  const isImage = selectedLayer.type === 'image';
  const isText = selectedLayer.type === 'text';
  const isShape = selectedLayer.type === 'shape';

  return (
    <div
      data-testid="properties-tab"
      className="flex h-full flex-col"
      style={{ backgroundColor: 'var(--panel-bg)' }}
    >
      {/* ---- 10A: Opacity + Blend Row ---- */}
      <div
        className="flex flex-col gap-1.5 border-b px-2 py-2"
        style={{ borderColor: 'var(--border-color)', fontSize: 11 }}
      >
        <div className="flex items-center gap-2">
          {/* Effect Presets toggle */}
          <button
            type="button"
            data-testid="effect-presets-toggle"
            title="Effect Presets"
            onClick={() => setShowPresets((p) => !p)}
            className="flex cursor-pointer items-center justify-center rounded-sm border outline-none"
            style={{
              width: 22,
              height: 22,
              backgroundColor: showPresets ? 'var(--accent-orange)' : '#2A2A2A',
              borderColor: showPresets ? 'var(--accent-orange)' : 'var(--border-color)',
            }}
          >
            <Icon path={mdiTune} size={14} color={showPresets ? '#FFFFFF' : 'var(--text-secondary)'} />
          </button>

          {/* Blend Mode */}
          <Select.Root
            value={selectedLayer.blendMode}
            onValueChange={(v) => update({ blendMode: v as BlendMode })}
          >
            <Select.Trigger
              data-testid="blend-mode-select"
              className="inline-flex items-center justify-between gap-1 rounded-sm border px-1.5 outline-none"
              style={{
                width: 80,
                height: 22,
                backgroundColor: '#2A2A2A',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: 11,
              }}
            >
              <Select.Value />
              <Select.Icon>
                <Icon path={mdiChevronDown} size={12} color="var(--text-secondary)" />
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content
                className="z-50 overflow-hidden rounded-md border shadow-lg"
                style={{
                  backgroundColor: 'var(--panel-bg)',
                  borderColor: 'var(--border-color)',
                }}
                position="popper"
                sideOffset={2}
              >
                <Select.Viewport className="p-1">
                  {BLEND_MODES.map((mode) => (
                    <Select.Item
                      key={mode.value}
                      value={mode.value}
                      className="cursor-default rounded-sm px-2 py-0.5 text-[11px] outline-none select-none data-[highlighted]:bg-[var(--hover-bg)]"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <Select.ItemText>{mode.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          {/* Opacity NUD */}
          <NumericUpDown
            label="Opacity"
            value={selectedLayer.opacity}
            onChange={(v) => update({ opacity: v })}
            min={0}
            max={1}
            step={0.01}
            width={50}
          />
        </div>

        {/* Opacity Slider */}
        <Slider.Root
          data-testid="opacity-slider"
          className="relative flex h-4 items-center"
          value={[selectedLayer.opacity]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={([v]) => update({ opacity: v })}
        >
          <Slider.Track className="relative h-[3px] flex-1 rounded-full" style={{ backgroundColor: 'var(--border-color)' }}>
            <Slider.Range className="absolute h-full rounded-full" style={{ backgroundColor: 'var(--accent-orange)' }} />
          </Slider.Track>
          <Slider.Thumb
            className="block rounded-full outline-none"
            style={{ width: 10, height: 10, backgroundColor: 'var(--text-primary)' }}
          />
        </Slider.Root>

        {/* Preset panel */}
        {showPresets && (
          <div
            data-testid="presets-panel"
            className="flex items-center gap-1 rounded border px-1.5 py-1"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--toolbar-bg)',
            }}
          >
            <Select.Root value={presetValue} onValueChange={setPresetValue}>
              <Select.Trigger
                data-testid="preset-select"
                className="inline-flex items-center justify-between gap-1 rounded-sm border px-1.5 outline-none"
                style={{
                  width: 140,
                  height: 22,
                  backgroundColor: '#2A2A2A',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: 11,
                }}
              >
                <Select.Value placeholder="Select preset..." />
                <Select.Icon>
                  <Icon path={mdiChevronDown} size={12} color="var(--text-secondary)" />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  className="z-50 overflow-hidden rounded-md border shadow-lg"
                  style={{
                    backgroundColor: 'var(--panel-bg)',
                    borderColor: 'var(--border-color)',
                  }}
                  position="popper"
                  sideOffset={2}
                >
                  <Select.Viewport className="p-1">
                    <Select.Item
                      value="none"
                      className="cursor-default rounded-sm px-2 py-0.5 text-[11px] outline-none select-none"
                      style={{ color: 'var(--text-disabled)' }}
                    >
                      <Select.ItemText>No presets</Select.ItemText>
                    </Select.Item>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
            <button
              type="button"
              data-testid="preset-delete"
              title="Delete Preset"
              className="flex cursor-pointer items-center justify-center rounded-sm border-none bg-transparent p-0.5 outline-none hover:bg-[var(--hover-bg)]"
            >
              <Icon path={mdiDelete} size={14} color="var(--text-secondary)" />
            </button>
            <button
              type="button"
              data-testid="preset-save"
              title="Save Preset"
              className="flex cursor-pointer items-center justify-center rounded-sm border-none bg-transparent p-0.5 outline-none hover:bg-[var(--hover-bg)]"
            >
              <Icon path={mdiContentSave} size={14} color="var(--text-secondary)" />
            </button>
          </div>
        )}
      </div>

      {/* ---- Scrollable property expanders ---- */}
      <ScrollArea.Root className="min-h-0 flex-1" type="auto">
        <ScrollArea.Viewport className="h-full w-full">
          <PositionExpander layer={selectedLayer} onUpdate={update} />
          {isImage && <CropExpander layer={selectedLayer} onUpdate={update} />}
          {isText && <TextExpander layer={selectedLayer} onUpdate={update} />}
          {isShape && <ShapeExpander layer={selectedLayer} onUpdate={update} />}
          <EffectsExpander layer={selectedLayer} onUpdate={update} />
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          orientation="vertical"
          className="flex w-2 touch-none p-[1px] select-none"
        >
          <ScrollArea.Thumb
            className="relative flex-1 rounded-full"
            style={{ backgroundColor: 'var(--border-color)' }}
          />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      {/* ---- 10G: Bottom Sticky ---- */}
      <div
        data-testid="properties-bottom-bar"
        className="flex shrink-0 items-center justify-between border-t px-2 py-1.5"
        style={{
          borderColor: 'var(--border-color)',
          fontSize: 11,
        }}
      >
        <div className="flex flex-col items-center gap-0.5">
          <span data-testid="layer-name" style={{ color: 'var(--accent-orange)', fontWeight: 600, fontSize: 11, textAlign: 'center' }}>
            {selectedLayer.name}
          </span>
          {selectedLayer.width && selectedLayer.height && (
            <span data-testid="image-dimensions" style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
              {selectedLayer.width} x {selectedLayer.height}
            </span>
          )}
        </div>
        <button
          type="button"
          data-testid="optimize-memory-btn"
          title="Optimize Memory"
          className="flex cursor-pointer items-center gap-1 rounded-sm border px-1.5 py-0.5 outline-none hover:bg-[var(--hover-bg)]"
          style={{
            backgroundColor: '#2A2A2A',
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
            fontSize: 10,
          }}
        >
          <Icon path={mdiMemory} size={12} color="var(--text-secondary)" />
          Optimize Memory
        </button>
      </div>
    </div>
  );
}

export default PropertiesTab;
