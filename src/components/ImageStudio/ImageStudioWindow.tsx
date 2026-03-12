import { useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as RadioGroup from '@radix-ui/react-radio-group';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as Slider from '@radix-ui/react-slider';
import { Icon } from '../common/Icon';
import {
  mdiHandBackRight,
  mdiEraser,
  mdiPencil,
  mdiSelectDrag,
  mdiSelectionDrag,
  mdiRefresh,
  mdiImageRefresh,
  mdiHelpCircleOutline,
  mdiContentSave,
  mdiCheck,
  mdiLoading,
  mdiClose,
} from '@mdi/js';

import { ImageStudioPreview, type ViewMode } from './ImageStudioPreview';
import { AIOperationsPanel } from './AIOperationsPanel';
import { PixelEffectsPanel, type ColorAdjustments, type ImageEffects } from './PixelEffectsPanel';
import { ImageBlendPanel } from './ImageBlendPanel';
import { ForegroundPanel } from './ForegroundPanel';
import { BackgroundPanel } from './BackgroundPanel';
import { useDocumentStore } from '../../stores/documentStore';
import { useUiStore } from '../../stores/uiStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BrushTool = 'pan' | 'eraser' | 'creator' | 'box-delete' | 'box-restore';

interface BrushToolDef {
  id: BrushTool;
  icon: string;
  label: string;
}

const BRUSH_TOOLS: BrushToolDef[] = [
  { id: 'pan', icon: mdiHandBackRight, label: 'Pan' },
  { id: 'eraser', icon: mdiEraser, label: 'Eraser' },
  { id: 'creator', icon: mdiPencil, label: 'Creator' },
  { id: 'box-delete', icon: mdiSelectDrag, label: 'Box Delete' },
  { id: 'box-restore', icon: mdiSelectionDrag, label: 'Box Restore' },
];

export interface ImageStudioWindowProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Callback to change open state. */
  onOpenChange: (open: boolean) => void;
  /** URL of the image to edit. */
  imageUrl?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImageStudioWindow({
  open,
  onOpenChange,
  imageUrl,
}: ImageStudioWindowProps) {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('combined');
  const [separated, setSeparated] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [keepOriginal, setKeepOriginal] = useState(false);
  const [brushTool, setBrushTool] = useState<BrushTool>('pan');
  const [brushSize, setBrushSize] = useState(50);
  const [zoom, _setZoom] = useState(1);
  const [statusText, setStatusText] = useState('Ready');
  const [colorAdjustments, setColorAdjustments] = useState<ColorAdjustments | undefined>(undefined);
  const [imageEffects, setImageEffects] = useState<ImageEffects | undefined>(undefined);

  const updateLayer = useDocumentStore((s) => s.updateLayer);
  const selectedLayerIds = useDocumentStore((s) => s.selectedLayerIds);
  const pushUndo = useDocumentStore((s) => s.pushUndo);
  const setActiveDialog = useUiStore((s) => s.setActiveDialog);

  const handleAIAction = useCallback(
    (action: string, _params?: Record<string, unknown>) => {
      setProcessing(true);
      setProcessingStatus(`Processing: ${action}...`);
      // Simulate completion
      setTimeout(() => {
        setProcessing(false);
        setProcessingStatus('');
        if (action === 'separate-background') {
          setSeparated(true);
          setStatusText('Background separated');
        } else {
          setStatusText(`${action} completed`);
        }
      }, 100);
    },
    [],
  );

  const handleApplyCombined = useCallback(() => {
    if (selectedLayerIds.length > 0) {
      pushUndo();
      const layerId = selectedLayerIds[0];
      // Apply color adjustments and effects to the selected layer
      if (colorAdjustments) {
        updateLayer(layerId, {
          colorAdjustments: {
            temperature: colorAdjustments.temperature,
            tint: 0,
            exposure: 0,
            highlights: colorAdjustments.brightness,
            shadows: colorAdjustments.contrast,
          },
        });
      }
      if (imageEffects) {
        updateLayer(layerId, {
          effects: {
            ...useDocumentStore.getState().project.layers.find((l) => l.id === layerId)!.effects,
            sharpen: imageEffects.sharpen,
            sharpenEnabled: imageEffects.sharpen > 0,
            vignette: imageEffects.vignette,
            vignetteEnabled: imageEffects.vignette > 0,
            gaussianBlur: imageEffects.blur,
            gaussianBlurEnabled: imageEffects.blur > 0,
          },
        });
      }
    }
    setActiveDialog(null);
    onOpenChange(false);
  }, [selectedLayerIds, pushUndo, updateLayer, colorAdjustments, imageEffects, onOpenChange, setActiveDialog]);

  const handleApplyFG = useCallback(() => {
    setActiveDialog(null);
    onOpenChange(false);
  }, [onOpenChange, setActiveDialog]);

  const handleApplyBG = useCallback(() => {
    setActiveDialog(null);
    onOpenChange(false);
  }, [onOpenChange, setActiveDialog]);

  const handleCancel = useCallback(() => {
    setActiveDialog(null);
    onOpenChange(false);
  }, [onOpenChange, setActiveDialog]);

  const showBrush = separated && (brushTool === 'eraser' || brushTool === 'creator');

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          data-testid="image-studio-overlay"
        />
        <Dialog.Content
          data-testid="image-studio-window"
          className="fixed inset-0 z-50 flex flex-col outline-none"
          style={{
            backgroundColor: 'var(--dark-bg)',
            color: 'var(--text-primary)',
          }}
          aria-describedby={undefined}
        >
          {/* ============================================================
             Header bar
             ============================================================ */}
          <div
            className="flex items-center justify-between border-b px-4"
            style={{
              height: 44,
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--panel-bg)',
            }}
          >
            {/* Left: Save to Gallery */}
            <button
              type="button"
              className="flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium text-text-secondary hover:text-text-primary"
              style={{ backgroundColor: 'var(--toolbar-bg)' }}
              data-testid="save-to-gallery-header"
            >
              <Icon path={mdiContentSave} size="sm" />
              Save to Gallery
            </button>

            {/* Center: Title */}
            <Dialog.Title
              className="text-sm font-bold"
              style={{ color: 'var(--accent-orange)' }}
            >
              Image Studio
            </Dialog.Title>

            {/* Right: View mode + status + close */}
            <div className="flex items-center gap-3">
              <RadioGroup.Root
                value={viewMode}
                onValueChange={(v) => setViewMode(v as ViewMode)}
                className="flex gap-0.5 rounded border"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--toolbar-bg)',
                }}
                data-testid="view-mode-radios"
              >
                {(['combined', 'foreground', 'background'] as const).map((mode) => (
                  <RadioGroup.Item
                    key={mode}
                    value={mode}
                    className="rounded px-2.5 py-1 text-xs capitalize outline-none data-[state=checked]:font-semibold"
                    style={{
                      backgroundColor: viewMode === mode ? 'var(--accent-orange)' : 'transparent',
                      color: viewMode === mode ? '#fff' : 'var(--text-secondary)',
                    }}
                    data-testid={`view-mode-${mode}`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </RadioGroup.Item>
                ))}
              </RadioGroup.Root>

              <span className="text-xs text-text-secondary" data-testid="status-text">
                {statusText}
              </span>

              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded p-1 text-text-secondary hover:bg-hover-bg hover:text-text-primary"
                  data-testid="close-button"
                >
                  <Icon path={mdiClose} size="md" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* ============================================================
             Brush toolbar (visible after separation)
             ============================================================ */}
          {separated && (
            <div
              className="flex items-center gap-1 border-b px-3"
              style={{
                height: 36,
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--toolbar-bg)',
              }}
              data-testid="brush-toolbar"
            >
              {BRUSH_TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  title={tool.label}
                  className="rounded p-1.5"
                  style={{
                    backgroundColor: brushTool === tool.id ? 'var(--accent-orange)' : 'transparent',
                    color: brushTool === tool.id ? '#fff' : 'var(--text-secondary)',
                  }}
                  onClick={() => setBrushTool(tool.id)}
                  data-testid={`brush-tool-${tool.id}`}
                >
                  <Icon path={tool.icon} size="sm" />
                </button>
              ))}

              <div
                className="mx-1 h-4"
                style={{ width: 1, backgroundColor: 'var(--border-color)' }}
              />

              {/* Reset FG/BG */}
              <button
                type="button"
                title="Reset FG/BG"
                className="rounded p-1.5 text-text-secondary hover:text-text-primary"
                data-testid="reset-fgbg"
              >
                <Icon path={mdiRefresh} size="sm" />
              </button>

              {/* Reform BG */}
              <button
                type="button"
                title="Reform BG"
                className="rounded p-1.5 text-text-secondary hover:text-text-primary"
                data-testid="reform-bg"
              >
                <Icon path={mdiImageRefresh} size="sm" />
              </button>

              <div
                className="mx-1 h-4"
                style={{ width: 1, backgroundColor: 'var(--border-color)' }}
              />

              {/* Preview slider */}
              <span className="text-xs text-text-secondary">Size:</span>
              <Slider.Root
                className="relative flex h-4 items-center"
                style={{ width: 80 }}
                value={[brushSize]}
                min={25}
                max={100}
                step={1}
                onValueChange={([v]) => setBrushSize(v)}
                data-testid="brush-size-slider"
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
              <span className="min-w-[24px] text-xs text-text-secondary">{brushSize}</span>

              <div className="flex-1" />

              {/* Shortcut help */}
              <button
                type="button"
                title="Shortcut Help"
                className="rounded p-1.5 text-text-secondary hover:text-text-primary"
                data-testid="shortcut-help"
              >
                <Icon path={mdiHelpCircleOutline} size="sm" />
              </button>

              {/* Save to Gallery */}
              <button
                type="button"
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
                style={{ backgroundColor: 'var(--hover-bg)' }}
                data-testid="save-to-gallery-toolbar"
              >
                <Icon path={mdiContentSave} size={12} />
                Save
              </button>
            </div>
          )}

          {/* ============================================================
             Main content area
             ============================================================ */}
          <div className="flex flex-1 overflow-hidden">
            {/* Preview area */}
            <ImageStudioPreview
              zoom={zoom}
              viewMode={viewMode}
              imageUrl={imageUrl}
              brushSize={brushSize}
              showBrush={showBrush}
            />

            {/* Right panel */}
            <div
              className="flex flex-col overflow-y-auto border-l"
              style={{
                width: 320,
                minWidth: 320,
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--panel-bg)',
              }}
              data-testid="right-panel"
            >
              {!separated ? (
                <>
                  <AIOperationsPanel onAction={handleAIAction} />
                  <div
                    className="border-t"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <PixelEffectsPanel
                      colorAdjustments={colorAdjustments}
                      imageEffects={imageEffects}
                      onColorAdjustmentsChange={setColorAdjustments}
                      onImageEffectsChange={setImageEffects}
                    />
                  </div>
                  <div
                    className="border-t"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <ImageBlendPanel />
                  </div>
                </>
              ) : (
                <>
                  <ForegroundPanel />
                  <div
                    className="border-t"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <BackgroundPanel />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ============================================================
             Processing overlay
             ============================================================ */}
          {processing && (
            <div
              className="absolute inset-0 z-[60] flex flex-col items-center justify-center"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
              data-testid="processing-overlay"
            >
              <Icon
                path={mdiLoading}
                size={48}
                color="var(--accent-orange)"
                className="animate-spin"
              />
              <span className="mt-3 text-sm text-text-primary">{processingStatus}</span>
            </div>
          )}

          {/* ============================================================
             Bottom action bar
             ============================================================ */}
          <div
            className="flex items-center justify-between border-t px-4"
            style={{
              height: 48,
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--panel-bg)',
            }}
            data-testid="action-bar"
          >
            {/* Left: Keep Original checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox.Root
                checked={keepOriginal}
                onCheckedChange={(v) => setKeepOriginal(!!v)}
                className="flex items-center justify-center rounded border"
                style={{
                  width: 16,
                  height: 16,
                  backgroundColor: keepOriginal ? 'var(--accent-orange)' : 'var(--toolbar-bg)',
                  borderColor: 'var(--border-color)',
                }}
                data-testid="keep-original-checkbox"
              >
                <Checkbox.Indicator>
                  <Icon path={mdiCheck} size={12} color="#fff" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <span className="select-none text-xs text-text-secondary">Keep Original</span>
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded px-4 py-1.5 text-xs font-medium text-white"
                style={{ backgroundColor: 'var(--accent-orange)' }}
                data-testid="apply-combined-button"
                onClick={handleApplyCombined}
              >
                Apply Combined
              </button>
              <button
                type="button"
                className="rounded px-4 py-1.5 text-xs font-medium text-white"
                style={{ backgroundColor: '#4FC3F7' }}
                data-testid="place-all-layers-button"
                onClick={handleApplyCombined}
              >
                Place All Layers
              </button>
              <button
                type="button"
                className="rounded px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
                style={{ backgroundColor: 'var(--toolbar-bg)' }}
                data-testid="apply-fg-button"
                onClick={handleApplyFG}
              >
                Apply FG Only
              </button>
              <button
                type="button"
                className="rounded px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
                style={{ backgroundColor: 'var(--toolbar-bg)' }}
                data-testid="apply-bg-button"
                onClick={handleApplyBG}
              >
                Apply BG Only
              </button>
              <button
                type="button"
                className="rounded px-3 py-1.5 text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
                data-testid="cancel-button"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default ImageStudioWindow;
