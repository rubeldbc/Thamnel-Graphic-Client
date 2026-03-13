import { useState, useCallback, useRef, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Select from '@radix-ui/react-select';
import * as Switch from '@radix-ui/react-switch';
import { Icon } from '../common/Icon';
import { NumericUpDown } from '../common/NumericUpDown';
import { ColorSwatch } from '../common/ColorSwatch';
import {
  mdiCursorDefault,
  mdiVectorPolyline,
  mdiDraw,
  mdiEraser,
  mdiMagnify,
  mdiHandBackRight,
  mdiVectorUnion,
  mdiSetSplit,
  mdiSetCenter,
  mdiClose,
  mdiChevronDown,
  mdiEye,
  mdiEyeOff,
  mdiChevronUp,
} from '@mdi/js';
import { addShape } from '../../commands/layerCommands';
import { useDocumentStore } from '../../stores/documentStore';
import { useSettingsStore } from '../../settings/settingsStore';
import { SHAPE_TYPES } from '../../types/enums';
import type { ShapeType } from '../../types/enums';
import { useDraggable } from '../../hooks/useDraggable';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShapeDrawingWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendToCanvas?: () => void;
}

type ToolId = 'select' | 'pen' | 'freehand' | 'eraser' | 'zoom' | 'pan';

interface ToolDef {
  id: ToolId;
  icon: string;
  label: string;
}

const TOOLS: ToolDef[] = [
  { id: 'select', icon: mdiCursorDefault, label: 'Select' },
  { id: 'pen', icon: mdiVectorPolyline, label: 'Pen Tool' },
  { id: 'freehand', icon: mdiDraw, label: 'Freehand' },
  { id: 'eraser', icon: mdiEraser, label: 'Eraser' },
  { id: 'zoom', icon: mdiMagnify, label: 'Zoom' },
  { id: 'pan', icon: mdiHandBackRight, label: 'Pan' },
];

const PREDEFINED_SHAPES = [
  'Rectangle', 'Rounded Rect', 'Circle', 'Ellipse', 'Triangle', 'Pentagon',
  'Hexagon', 'Octagon', 'Star 4', 'Star 5', 'Star 6', 'Star 8',
  'Arrow Right', 'Arrow Left', 'Arrow Up', 'Arrow Down', 'Heart', 'Diamond',
  'Cross', 'Crescent', 'Ring', 'Arc', 'Chevron', 'Trapezoid',
  'Parallelogram', 'Speech Bubble', 'Callout',
];

interface ShapeLayer {
  id: string;
  name: string;
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShapeDrawingWindow({ open, onOpenChange, onSendToCanvas }: ShapeDrawingWindowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  useDraggable(handleRef, containerRef, open);

  const [activeTool, setActiveTool] = useState<ToolId>('select');
  const [fillColor, _setFillColor] = useState('#FF6600');
  const [strokeColor, _setStrokeColor] = useState('#FFFFFF');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [opacity, setOpacity] = useState(100);
  const [cornerRadius, setCornerRadius] = useState(0);
  const [gradientEnabled, setGradientEnabled] = useState(false);
  const [selectedShape, setSelectedShape] = useState('Rectangle');
  const [shapeWidth, setShapeWidth] = useState(200);
  const [shapeHeight, setShapeHeight] = useState(200);

  // Load persisted shape settings when dialog opens
  useEffect(() => {
    if (!open) return;
    const gs = useSettingsStore.getState().getSetting;
    const w = gs('shapeTool.shapeWidth') as number;
    const h = gs('shapeTool.shapeHeight') as number;
    const sw = gs('shapeTool.strokeWidth') as number;
    const cr = gs('shapeTool.cornerRadius') as number;
    const op = gs('shapeTool.shapeOpacity') as number;
    const ge = gs('shapeTool.gradientEnabled') as boolean;
    const fc = gs('shapeTool.fillColor') as string;
    const sc = gs('shapeTool.strokeColor') as string;
    if (w > 0) setShapeWidth(w);
    if (h > 0) setShapeHeight(h);
    if (typeof sw === 'number') setStrokeWidth(sw);
    if (typeof cr === 'number') setCornerRadius(cr);
    if (typeof op === 'number' && op > 0) setOpacity(op);
    if (typeof ge === 'boolean') setGradientEnabled(ge);
    if (fc) _setFillColor(fc);
    if (sc) _setStrokeColor(sc);
  }, [open]);

  // Map display name to ShapeType enum
  const shapeTypeMap: Record<string, ShapeType> = {};
  for (const st of SHAPE_TYPES) {
    shapeTypeMap[st.label] = st.value;
  }

  const handleSendToCanvas = useCallback(() => {
    const shapeType = shapeTypeMap[selectedShape] ?? 'rectangle';
    addShape.execute(shapeType);
    // Update the newly added layer dimensions
    const store = useDocumentStore.getState();
    const layers = store.project.layers;
    if (layers.length > 0) {
      const lastLayer = layers[layers.length - 1];
      store.updateLayer(lastLayer.id, {
        width: shapeWidth,
        height: shapeHeight,
        opacity: opacity / 100,
      });
      if (lastLayer.shapeProperties) {
        store.updateLayer(lastLayer.id, {
          shapeProperties: {
            ...lastLayer.shapeProperties,
            fillColor,
            borderColor: strokeColor,
            borderWidth: strokeWidth,
            cornerRadius,
            opacity: opacity / 100,
          },
        });
      }
    }
    // Persist shape settings for next time
    const ss = useSettingsStore.getState().setSetting;
    ss('shapeTool.shapeWidth', shapeWidth);
    ss('shapeTool.shapeHeight', shapeHeight);
    ss('shapeTool.strokeWidth', strokeWidth);
    ss('shapeTool.cornerRadius', cornerRadius);
    ss('shapeTool.shapeOpacity', opacity);
    ss('shapeTool.gradientEnabled', gradientEnabled);
    ss('shapeTool.fillColor', fillColor);
    ss('shapeTool.strokeColor', strokeColor);

    onSendToCanvas?.();
    onOpenChange(false);
  }, [selectedShape, shapeWidth, shapeHeight, fillColor, strokeColor, strokeWidth, cornerRadius, opacity, gradientEnabled, onSendToCanvas, onOpenChange]);

  const [layers, setLayers] = useState<ShapeLayer[]>([
    { id: '1', name: 'Shape 1', visible: true },
    { id: '2', name: 'Shape 2', visible: true },
  ]);

  const toggleLayerVisibility = (id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    );
  };

  const moveLayer = (id: string, direction: 'up' | 'down') => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx < 0) return prev;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ backgroundColor: 'transparent' }}
        />
        <Dialog.Content
          ref={containerRef}
          data-testid="shape-drawing-dialog"
          className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-lg border shadow-xl outline-none"
          style={{
            backgroundColor: 'var(--panel-bg)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
            minWidth: 1000,
            minHeight: 700,
          }}
          aria-describedby={undefined}
        >
          {/* ---- Title bar (drag handle) ---- */}
          <div
            ref={handleRef}
            className="flex shrink-0 items-center justify-between border-b px-3"
            style={{ height: 36, backgroundColor: 'var(--toolbar-bg)', borderColor: 'var(--border-color)', cursor: 'grab' }}
          >
            <Dialog.Title className="select-none text-sm font-bold" style={{ color: 'var(--accent-orange)', fontSize: 14 }}>
              Shape Drawing
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="rounded p-0.5 text-text-secondary hover:bg-hover-bg hover:text-text-primary" data-testid="shape-drawing-close">
                <Icon path={mdiClose} size="sm" />
              </button>
            </Dialog.Close>
          </div>

          {/* ---- Main layout ---- */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left toolbar */}
            <div
              className="flex shrink-0 flex-col gap-1 border-r p-1"
              style={{ width: 44, backgroundColor: 'var(--toolbar-bg)', borderColor: 'var(--border-color)' }}
              data-testid="shape-left-toolbar"
            >
              {TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  title={tool.label}
                  className="rounded p-1.5"
                  style={{
                    backgroundColor: activeTool === tool.id ? 'var(--accent-orange)' : 'transparent',
                    color: activeTool === tool.id ? '#fff' : 'var(--text-secondary)',
                  }}
                  onClick={() => setActiveTool(tool.id)}
                  data-testid={`shape-tool-${tool.id}`}
                >
                  <Icon path={tool.icon} size="sm" />
                </button>
              ))}

              <div className="my-1 border-t" style={{ borderColor: 'var(--border-color)' }} />

              {/* Predefined shapes dropdown */}
              <Select.Root value={selectedShape} onValueChange={setSelectedShape}>
                <Select.Trigger
                  className="rounded p-1.5 text-text-secondary hover:bg-[var(--hover-bg)]"
                  title="Predefined Shapes"
                  data-testid="shape-predefined-trigger"
                >
                  <Icon path={mdiChevronDown} size="sm" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="overflow-hidden rounded border shadow-lg" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)', maxHeight: 300 }}>
                    <Select.Viewport className="p-1">
                      {PREDEFINED_SHAPES.map((s) => (
                        <Select.Item key={s} value={s} className="cursor-pointer rounded px-2 py-1 text-xs outline-none hover:bg-[var(--hover-bg)]" style={{ color: 'var(--text-primary)' }}>
                          <Select.ItemText>{s}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>

              <div className="my-1 border-t" style={{ borderColor: 'var(--border-color)' }} />

              {/* Path operations */}
              <button type="button" title="Union" className="rounded p-1.5 text-text-secondary hover:bg-[var(--hover-bg)]" data-testid="path-op-union">
                <Icon path={mdiVectorUnion} size="sm" />
              </button>
              <button type="button" title="Subtract" className="rounded p-1.5 text-text-secondary hover:bg-[var(--hover-bg)]" data-testid="path-op-subtract">
                <Icon path={mdiSetSplit} size="sm" />
              </button>
              <button type="button" title="Intersect" className="rounded p-1.5 text-text-secondary hover:bg-[var(--hover-bg)]" data-testid="path-op-intersect">
                <Icon path={mdiSetCenter} size="sm" />
              </button>
            </div>

            {/* Central canvas area */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Rulers */}
              <div
                className="shrink-0 border-b"
                style={{ height: 20, backgroundColor: 'var(--ruler-bg, #1E1E1E)', borderColor: 'var(--border-color)' }}
                data-testid="shape-ruler-h"
              />
              <div className="flex flex-1 overflow-hidden">
                <div
                  className="shrink-0 border-r"
                  style={{ width: 20, backgroundColor: 'var(--ruler-bg, #1E1E1E)', borderColor: 'var(--border-color)' }}
                  data-testid="shape-ruler-v"
                />
                {/* Drawing area */}
                <div
                  className="flex flex-1 items-center justify-center"
                  style={{ backgroundColor: '#1A1A1A' }}
                  data-testid="shape-canvas-area"
                >
                  <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                    Drawing Canvas
                  </span>
                </div>
              </div>
            </div>

            {/* Right panel */}
            <div
              className="flex shrink-0 flex-col overflow-y-auto border-l"
              style={{ width: 280, backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}
              data-testid="shape-right-panel"
            >
              {/* Shape properties */}
              <div className="border-b p-3" style={{ borderColor: 'var(--border-color)' }}>
                <span className="mb-2 block text-xs font-bold" style={{ color: 'var(--accent-orange)' }}>
                  Shape Properties
                </span>

                <div className="flex items-center justify-between py-1">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Width</span>
                  <NumericUpDown value={shapeWidth} onChange={setShapeWidth} min={1} max={10000} suffix="px" width={70} />
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Height</span>
                  <NumericUpDown value={shapeHeight} onChange={setShapeHeight} min={1} max={10000} suffix="px" width={70} />
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Fill Color</span>
                  <ColorSwatch color={fillColor} size={20} label="shape-fill" />
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Gradient</span>
                  <Switch.Root
                    checked={gradientEnabled}
                    onCheckedChange={setGradientEnabled}
                    className="relative inline-flex items-center rounded-full"
                    style={{ width: 34, height: 18, backgroundColor: gradientEnabled ? 'var(--accent-orange)' : 'var(--border-color)' }}
                    data-testid="shape-gradient-toggle"
                  >
                    <Switch.Thumb
                      className="block rounded-full bg-white transition-transform"
                      style={{ width: 14, height: 14, transform: gradientEnabled ? 'translateX(17px)' : 'translateX(2px)' }}
                    />
                  </Switch.Root>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Stroke Color</span>
                  <ColorSwatch color={strokeColor} size={20} label="shape-stroke" />
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Stroke Width</span>
                  <NumericUpDown value={strokeWidth} onChange={setStrokeWidth} min={0} max={50} suffix="px" width={60} />
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Opacity</span>
                  <NumericUpDown value={opacity} onChange={setOpacity} min={0} max={100} suffix="%" width={60} />
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Corner Radius</span>
                  <NumericUpDown value={cornerRadius} onChange={setCornerRadius} min={0} max={200} suffix="px" width={60} />
                </div>
              </div>

              {/* Predefined shapes palette */}
              <div className="border-b p-3" style={{ borderColor: 'var(--border-color)' }}>
                <span className="mb-2 block text-xs font-bold" style={{ color: 'var(--accent-orange)' }}>
                  Predefined Shapes
                </span>
                <div className="grid grid-cols-5 gap-1" data-testid="shape-palette">
                  {PREDEFINED_SHAPES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      title={s}
                      className="flex items-center justify-center rounded border p-1 text-[9px] leading-tight hover:bg-[var(--hover-bg)]"
                      style={{
                        height: 36,
                        borderColor: selectedShape === s ? 'var(--accent-orange)' : 'var(--border-color)',
                        backgroundColor: selectedShape === s ? 'rgba(255,102,0,0.15)' : 'var(--toolbar-bg)',
                        color: 'var(--text-secondary)',
                      }}
                      onClick={() => setSelectedShape(s)}
                    >
                      {s.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Path point editor placeholder */}
              <div className="p-3">
                <span className="mb-2 block text-xs font-bold" style={{ color: 'var(--accent-orange)' }}>
                  Path Points
                </span>
                <div
                  className="flex items-center justify-center rounded border"
                  style={{ height: 60, borderColor: 'var(--border-color)', backgroundColor: '#1A1A1A' }}
                  data-testid="path-point-editor"
                >
                  <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>No path selected</span>
                </div>
              </div>
            </div>
          </div>

          {/* ---- Bottom panel: Grouping layers ---- */}
          <div
            className="shrink-0 border-t"
            style={{ height: 120, borderColor: 'var(--border-color)', backgroundColor: 'var(--toolbar-bg)' }}
            data-testid="shape-layers-panel"
          >
            <div className="flex items-center justify-between border-b px-3 py-1" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-xs font-bold" style={{ color: 'var(--accent-orange)' }}>Layers</span>
            </div>
            <div className="overflow-auto p-1" style={{ maxHeight: 90 }}>
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  className="flex items-center gap-2 rounded px-2 py-0.5 hover:bg-[var(--hover-bg)]"
                  data-testid={`shape-layer-${layer.id}`}
                >
                  <button
                    type="button"
                    className="p-0.5 text-text-secondary"
                    onClick={() => toggleLayerVisibility(layer.id)}
                    data-testid={`layer-vis-${layer.id}`}
                  >
                    <Icon path={layer.visible ? mdiEye : mdiEyeOff} size={12} />
                  </button>
                  <span className="flex-1 text-xs" style={{ color: 'var(--text-primary)' }}>{layer.name}</span>
                  <button type="button" className="p-0.5 text-text-secondary" onClick={() => moveLayer(layer.id, 'up')}>
                    <Icon path={mdiChevronUp} size={12} />
                  </button>
                  <button type="button" className="p-0.5 text-text-secondary" onClick={() => moveLayer(layer.id, 'down')}>
                    <Icon path={mdiChevronDown} size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ---- Bottom action bar ---- */}
          <div
            className="flex shrink-0 items-center justify-end gap-2 border-t px-4"
            style={{ height: 48, borderColor: 'var(--border-color)', backgroundColor: 'var(--toolbar-bg)' }}
            data-testid="shape-action-bar"
          >
            <button
              type="button"
              className="rounded px-3 py-1.5 text-xs font-medium"
              style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--panel-bg)' }}
              data-testid="shape-reset"
            >
              Reset
            </button>
            <button
              type="button"
              className="rounded px-4 py-1.5 text-xs font-medium"
              style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--panel-bg)' }}
              onClick={() => onOpenChange(false)}
              data-testid="shape-cancel"
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded px-4 py-1.5 text-xs font-medium text-white"
              style={{ backgroundColor: 'var(--accent-orange)' }}
              onClick={handleSendToCanvas}
              data-testid="shape-send-to-canvas"
            >
              Send to Canvas
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default ShapeDrawingWindow;
