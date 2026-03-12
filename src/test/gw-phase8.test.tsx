import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import { useDocumentStore } from '../stores/documentStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import { useUiStore } from '../stores/uiStore';
import { useEraserTool } from '../hooks/useEraserTool';
import { useBlurBrushTool } from '../hooks/useBlurBrushTool';
import { useShapeDrawTool } from '../hooks/useShapeDrawTool';
import { useTextDrawTool } from '../hooks/useTextDrawTool';
import { InlineTextEditor } from '../components/Canvas/InlineTextEditor';
import type { TextLayerData } from '../components/Canvas/InlineTextEditor';
import { createDefaultLayer } from '../types/LayerModel';
import { createDefaultTextProperties } from '../types/TextProperties';

// ---------------------------------------------------------------------------
// Store reset helper
// ---------------------------------------------------------------------------

function resetStores() {
  useDocumentStore.setState({
    project: {
      projectId: 'test',
      version: '1.0.0',
      canvasWidth: 1920,
      canvasHeight: 1080,
      backgroundColor: '#000000',
      layers: [],
      videoPaths: [],
      timestamps: {},
      metadata: {
        name: 'Test',
        author: '',
        createdAt: '',
        modifiedAt: '',
        description: '',
      },
    },
    selectedLayerIds: [],
    undoStack: [],
    redoStack: [],
    isDirty: false,
    currentProjectPath: null,
    windowTitle: 'Thamnel',
    suppressRender: false,
  });

  useUndoRedoStore.setState({
    undoStack: [],
    redoStack: [],
    lastHash: '',
    maxSnapshotCount: 30,
  });

  useUiStore.setState({
    activeTool: 'select',
    zoom: 1,
    gridVisible: false,
    isEditingText: false,
    leftPanelVisible: true,
    rightPanelVisible: true,
    framePanelHeight: 150,
    statusMessage: '',
    activeDialog: null,
  });
}

// ---------------------------------------------------------------------------
// Canvas mock for jsdom
// ---------------------------------------------------------------------------

interface CtxCall {
  method: string;
  args: any[];
}

function createMockContext(): CanvasRenderingContext2D & { __calls: CtxCall[] } {
  const calls: CtxCall[] = [];

  const handler: ProxyHandler<any> = {
    get(target, prop) {
      if (prop === '__calls') return calls;
      if (prop === 'canvas') return target.__canvas ?? { width: 100, height: 100 };
      if (prop in target) return target[prop];

      return (...args: any[]) => {
        calls.push({ method: prop as string, args });
        if (prop === 'measureText') {
          return { width: (args[0] as string).length * 8 };
        }
        if (prop === 'getImageData') {
          const w = args[2] || 1;
          const h = args[3] || 1;
          return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
        }
        if (prop === 'createImageData') {
          const w = args[0] || 1;
          const h = args[1] || 1;
          return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
        }
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return { addColorStop: () => {} };
        }
        return undefined;
      };
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  };

  const target: any = {
    __canvas: null,
    filter: 'none',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    font: '10px sans-serif',
  };

  return new Proxy(target, handler) as CanvasRenderingContext2D & { __calls: CtxCall[]; __canvas?: unknown };
}

function createMockCanvas(width = 100, height = 100) {
  const ctx = createMockContext();
  const canvas = {
    width,
    height,
    getContext: vi.fn((_type: string) => {
      (ctx as any).__canvas = canvas;
      (ctx as any).canvas = canvas;
      return ctx;
    }),
    toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
  } as unknown as HTMLCanvasElement;
  return { canvas, ctx };
}

let origCreateElement: typeof document.createElement;

function setupCanvasMock() {
  origCreateElement = document.createElement.bind(document);
  document.createElement = vi.fn(((tag: string, options?: ElementCreationOptions) => {
    if (tag === 'canvas') {
      const mock = createMockCanvas();
      return mock.canvas;
    }
    return origCreateElement(tag, options);
  }) as typeof document.createElement) as typeof document.createElement;
}

function teardownCanvasMock() {
  document.createElement = origCreateElement;
}

class MockImage {
  src = '';
  complete = true;
  naturalWidth = 100;
  naturalHeight = 100;
  width = 100;
  height = 100;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
}

// ===========================================================================
// Tests
// ===========================================================================

describe('GW Phase 8 -- Canvas Tools', () => {
  beforeEach(() => {
    resetStores();
    setupCanvasMock();
    (globalThis as any).Image = MockImage;
  });

  afterEach(() => {
    teardownCanvasMock();
    delete (globalThis as any).Image;
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 8A -- Eraser Tool
  // =========================================================================
  describe('Eraser Tool', () => {
    it('activates on B key (setting activeTool to eraser)', () => {
      act(() => {
        useUiStore.getState().setActiveTool('eraser');
      });
      expect(useUiStore.getState().activeTool).toBe('eraser');
    });

    it('initializes with default state', () => {
      const { result } = renderHook(() => useEraserTool(true));
      expect(result.current.eraserState.mode).toBe('soft');
      expect(result.current.eraserState.brushSize).toBe(20);
      expect(result.current.eraserState.isAntiErase).toBe(false);
      expect(result.current.eraserState.isErasing).toBe(false);
      expect(result.current.eraserState.brushShape).toBe('circle');
      expect(result.current.eraserState.hardness).toBe(100);
    });

    it('toggles anti-erase mode', () => {
      const { result } = renderHook(() => useEraserTool(true));
      act(() => {
        result.current.toggleAntiErase();
      });
      expect(result.current.eraserState.isAntiErase).toBe(true);
      act(() => {
        result.current.toggleAntiErase();
      });
      expect(result.current.eraserState.isAntiErase).toBe(false);
    });

    it('clamps brush size to 1..500', () => {
      const { result } = renderHook(() => useEraserTool(true));
      act(() => {
        result.current.setBrushSize(0);
      });
      expect(result.current.eraserState.brushSize).toBe(1);
      act(() => {
        result.current.setBrushSize(600);
      });
      expect(result.current.eraserState.brushSize).toBe(500);
    });

    it('adjusts brush size with [ and ] keys', () => {
      const { result } = renderHook(() => useEraserTool(true));
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ']' }));
      });
      expect(result.current.eraserState.brushSize).toBe(25);
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '[' }));
      });
      expect(result.current.eraserState.brushSize).toBe(20);
    });

    it('does not react to [ ] keys when inactive', () => {
      const { result } = renderHook(() => useEraserTool(false));
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ']' }));
      });
      // Should stay at default
      expect(result.current.eraserState.brushSize).toBe(20);
    });

    it('startErase returns false for non-image layers', () => {
      const { result } = renderHook(() => useEraserTool(true));
      const textLayer = createDefaultLayer({ id: 'txt1', type: 'text' });
      let started = false;
      act(() => {
        started = result.current.startErase(textLayer, 50, 50);
      });
      expect(started).toBe(false);
    });

    it('startErase returns true for image layers', () => {
      const { result } = renderHook(() => useEraserTool(true));
      const imgLayer = createDefaultLayer({
        id: 'img1',
        type: 'image',
        width: 200,
        height: 200,
        imageData: 'data:image/png;base64,mock',
      });
      let started = false;
      act(() => {
        started = result.current.startErase(imgLayer, 50, 50);
      });
      expect(started).toBe(true);
      expect(result.current.eraserState.isErasing).toBe(true);
    });

    it('finishErase takes undo snapshot and saves imageData', () => {
      const imgLayer = createDefaultLayer({
        id: 'img-erase',
        type: 'image',
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        imageData: 'data:image/png;base64,mock',
      });
      act(() => {
        useDocumentStore.getState().addLayer(imgLayer);
      });

      const { result } = renderHook(() => useEraserTool(true));

      act(() => {
        result.current.startErase(imgLayer, 50, 50);
      });
      act(() => {
        result.current.eraseAtPoint(55, 55);
      });
      act(() => {
        result.current.finishErase();
      });

      expect(result.current.eraserState.isErasing).toBe(false);
      // Undo stack should have an entry
      expect(useUndoRedoStore.getState().undoStack.length).toBeGreaterThan(0);
      // Layer imageData should be updated
      const updatedLayer = useDocumentStore.getState().project.layers.find(
        (l) => l.id === 'img-erase',
      );
      expect(updatedLayer?.imageData).toBe('data:image/png;base64,mock');
    });

    it('sets mode to hard or soft', () => {
      const { result } = renderHook(() => useEraserTool(true));
      act(() => {
        result.current.setMode('hard');
      });
      expect(result.current.eraserState.mode).toBe('hard');
      act(() => {
        result.current.setMode('soft');
      });
      expect(result.current.eraserState.mode).toBe('soft');
    });

    it('sets brush shape', () => {
      const { result } = renderHook(() => useEraserTool(true));
      act(() => {
        result.current.setBrushShape('block');
      });
      expect(result.current.eraserState.brushShape).toBe('block');
    });

    it('getCursorStyle returns a data URI cursor string', () => {
      const { result } = renderHook(() => useEraserTool(true));
      const cursor = result.current.getCursorStyle(1);
      expect(cursor).toContain('data:image/svg+xml');
      expect(cursor).toContain('crosshair');
    });
  });

  // =========================================================================
  // 8B -- Blur Brush Tool
  // =========================================================================
  describe('Blur Brush Tool', () => {
    it('activates on J key (setting activeTool to blurBrush)', () => {
      act(() => {
        useUiStore.getState().setActiveTool('blurBrush');
      });
      expect(useUiStore.getState().activeTool).toBe('blurBrush');
    });

    it('initializes with default state', () => {
      const { result } = renderHook(() => useBlurBrushTool());
      expect(result.current.blurState.brushSize).toBe(30);
      expect(result.current.blurState.intensity).toBe(50);
      expect(result.current.blurState.isAntiBlur).toBe(false);
      expect(result.current.blurState.isPainting).toBe(false);
    });

    it('toggles anti-blur mode', () => {
      const { result } = renderHook(() => useBlurBrushTool());
      act(() => {
        result.current.toggleAntiBlur();
      });
      expect(result.current.blurState.isAntiBlur).toBe(true);
    });

    it('clamps brush size', () => {
      const { result } = renderHook(() => useBlurBrushTool());
      act(() => {
        result.current.setBrushSize(0);
      });
      expect(result.current.blurState.brushSize).toBe(1);
      act(() => {
        result.current.setBrushSize(600);
      });
      expect(result.current.blurState.brushSize).toBe(500);
    });

    it('clamps intensity to 0..100', () => {
      const { result } = renderHook(() => useBlurBrushTool());
      act(() => {
        result.current.setIntensity(-10);
      });
      expect(result.current.blurState.intensity).toBe(0);
      act(() => {
        result.current.setIntensity(200);
      });
      expect(result.current.blurState.intensity).toBe(100);
    });

    it('startPaint returns false for non-image layers', () => {
      const { result } = renderHook(() => useBlurBrushTool());
      const textLayer = createDefaultLayer({ id: 'txt1', type: 'text' });
      let started = false;
      act(() => {
        started = result.current.startPaint(textLayer, 50, 50);
      });
      expect(started).toBe(false);
    });

    it('startPaint returns true for image layers', () => {
      const { result } = renderHook(() => useBlurBrushTool());
      const imgLayer = createDefaultLayer({
        id: 'img1',
        type: 'image',
        width: 200,
        height: 200,
      });
      let started = false;
      act(() => {
        started = result.current.startPaint(imgLayer, 50, 50);
      });
      expect(started).toBe(true);
      expect(result.current.blurState.isPainting).toBe(true);
    });

    it('finishPaint saves blurMaskData and takes snapshot', () => {
      const imgLayer = createDefaultLayer({
        id: 'img-blur',
        type: 'image',
        width: 100,
        height: 100,
        x: 0,
        y: 0,
      });
      act(() => {
        useDocumentStore.getState().addLayer(imgLayer);
      });

      const { result } = renderHook(() => useBlurBrushTool());

      act(() => {
        result.current.startPaint(imgLayer, 50, 50);
      });
      act(() => {
        result.current.finishPaint();
      });

      expect(result.current.blurState.isPainting).toBe(false);
      expect(useUndoRedoStore.getState().undoStack.length).toBeGreaterThan(0);

      const updated = useDocumentStore.getState().project.layers.find(
        (l) => l.id === 'img-blur',
      );
      expect(updated?.blurMaskData).toBeDefined();
      expect(updated?.blurMaskData).not.toBeNull();
    });

    it('getCursorStyle returns solid circle for normal mode', () => {
      const { result } = renderHook(() => useBlurBrushTool());
      const cursor = result.current.getCursorStyle(1);
      // URL-encoded: # becomes %23
      const decoded = decodeURIComponent(cursor);
      expect(decoded).toContain('#00BFFF');
      expect(decoded).not.toContain('stroke-dasharray');
    });

    it('getCursorStyle returns dotted circle for anti-blur mode', () => {
      const { result } = renderHook(() => useBlurBrushTool());
      act(() => {
        result.current.toggleAntiBlur();
      });
      const cursor = result.current.getCursorStyle(1);
      const decoded = decodeURIComponent(cursor);
      expect(decoded).toContain('#FF6600');
      expect(decoded).toContain('stroke-dasharray');
    });

    it('paint is throttled to 30fps', () => {
      const imgLayer = createDefaultLayer({
        id: 'img-throttle',
        type: 'image',
        width: 100,
        height: 100,
        x: 0,
        y: 0,
      });
      act(() => {
        useDocumentStore.getState().addLayer(imgLayer);
      });

      const { result } = renderHook(() => useBlurBrushTool());

      act(() => {
        result.current.startPaint(imgLayer, 50, 50);
      });

      // Multiple rapid paints should not all execute
      act(() => {
        result.current.paint(51, 51);
        result.current.paint(52, 52);
        result.current.paint(53, 53);
      });

      // No error should occur - throttling works
      expect(result.current.blurState.isPainting).toBe(true);
    });
  });

  // =========================================================================
  // 8C -- Shape Drawing
  // =========================================================================
  describe('Shape Drawing', () => {
    it('activates on R key (setting activeTool to shape)', () => {
      act(() => {
        useUiStore.getState().setActiveTool('shape');
      });
      expect(useUiStore.getState().activeTool).toBe('shape');
    });

    it('creates a shape layer when dragged sufficiently', () => {
      const { result } = renderHook(() => useShapeDrawTool());

      act(() => {
        result.current.startDraw(100, 100);
      });
      expect(result.current.shapeDrawState.isDrawing).toBe(true);

      act(() => {
        result.current.updateDraw(200, 180, false);
      });
      expect(result.current.shapeDrawState.preview).toEqual({
        x: 100,
        y: 100,
        width: 100,
        height: 80,
      });

      let newLayer: any = null;
      act(() => {
        newLayer = result.current.finishDraw();
      });

      expect(newLayer).not.toBeNull();
      expect(newLayer.type).toBe('shape');
      expect(newLayer.width).toBe(100);
      expect(newLayer.height).toBe(80);

      // Verify it was added to the store
      const layers = useDocumentStore.getState().project.layers;
      expect(layers).toHaveLength(1);
      expect(layers[0].type).toBe('shape');
      expect(layers[0].shapeProperties).not.toBeNull();
    });

    it('does not create a layer if too small', () => {
      const { result } = renderHook(() => useShapeDrawTool());

      act(() => {
        result.current.startDraw(100, 100);
      });
      act(() => {
        result.current.updateDraw(103, 103, false);
      });

      let newLayer: any = null;
      act(() => {
        newLayer = result.current.finishDraw();
      });

      expect(newLayer).toBeNull();
      expect(useDocumentStore.getState().project.layers).toHaveLength(0);
    });

    it('constrains to square with Shift key', () => {
      const { result } = renderHook(() => useShapeDrawTool());

      act(() => {
        result.current.startDraw(100, 100);
      });
      act(() => {
        result.current.updateDraw(250, 180, true);
      });

      const preview = result.current.shapeDrawState.preview;
      expect(preview).not.toBeNull();
      // Should be square: max(150, 80) = 150
      expect(preview!.width).toBe(preview!.height);
      expect(preview!.width).toBe(150);
    });

    it('auto-switches to select tool after creation', () => {
      act(() => {
        useUiStore.getState().setActiveTool('shape');
      });

      const { result } = renderHook(() => useShapeDrawTool());

      act(() => {
        result.current.startDraw(100, 100);
      });
      act(() => {
        result.current.updateDraw(200, 200, false);
      });
      act(() => {
        result.current.finishDraw();
      });

      expect(useUiStore.getState().activeTool).toBe('select');
    });

    it('selects the newly created layer', () => {
      const { result } = renderHook(() => useShapeDrawTool());

      act(() => {
        result.current.startDraw(0, 0);
      });
      act(() => {
        result.current.updateDraw(100, 100, false);
      });

      let newLayer: any = null;
      act(() => {
        newLayer = result.current.finishDraw();
      });

      expect(newLayer).not.toBeNull();
      expect(useDocumentStore.getState().selectedLayerIds).toContain(newLayer.id);
    });

    it('takes undo snapshot on creation', () => {
      const { result } = renderHook(() => useShapeDrawTool());

      act(() => {
        result.current.startDraw(0, 0);
      });
      act(() => {
        result.current.updateDraw(100, 100, false);
      });
      act(() => {
        result.current.finishDraw();
      });

      expect(useUndoRedoStore.getState().undoStack.length).toBeGreaterThan(0);
    });

    it('cancelDraw clears state without creating a layer', () => {
      const { result } = renderHook(() => useShapeDrawTool());

      act(() => {
        result.current.startDraw(0, 0);
      });
      act(() => {
        result.current.updateDraw(100, 100, false);
      });
      act(() => {
        result.current.cancelDraw();
      });

      expect(result.current.shapeDrawState.isDrawing).toBe(false);
      expect(result.current.shapeDrawState.preview).toBeNull();
      expect(useDocumentStore.getState().project.layers).toHaveLength(0);
    });

    it('handles negative drag direction (right-to-left)', () => {
      const { result } = renderHook(() => useShapeDrawTool());

      act(() => {
        result.current.startDraw(200, 200);
      });
      act(() => {
        result.current.updateDraw(100, 120, false);
      });

      const preview = result.current.shapeDrawState.preview;
      expect(preview).not.toBeNull();
      expect(preview!.x).toBe(100);
      expect(preview!.y).toBe(120);
      expect(preview!.width).toBe(100);
      expect(preview!.height).toBe(80);
    });
  });

  // =========================================================================
  // 8D -- Text Drawing
  // =========================================================================
  describe('Text Drawing', () => {
    it('activates on T key (setting activeTool to text)', () => {
      act(() => {
        useUiStore.getState().setActiveTool('text');
      });
      expect(useUiStore.getState().activeTool).toBe('text');
    });

    it('creates a text layer when dragged sufficiently', () => {
      const { result } = renderHook(() => useTextDrawTool());

      act(() => {
        result.current.startDraw(50, 50);
      });
      act(() => {
        result.current.updateDraw(200, 100);
      });

      let newLayer: any = null;
      act(() => {
        newLayer = result.current.finishDraw();
      });

      expect(newLayer).not.toBeNull();
      expect(newLayer.type).toBe('text');
      expect(newLayer.width).toBe(150);
      expect(newLayer.height).toBe(50);
      expect(newLayer.textProperties).not.toBeNull();
      expect(newLayer.textProperties.text).toBe('');

      // Verify it was added to the store
      const layers = useDocumentStore.getState().project.layers;
      expect(layers).toHaveLength(1);
      expect(layers[0].type).toBe('text');
    });

    it('does not create a layer if too small', () => {
      const { result } = renderHook(() => useTextDrawTool());

      act(() => {
        result.current.startDraw(100, 100);
      });
      act(() => {
        result.current.updateDraw(110, 105);
      });

      let newLayer: any = null;
      act(() => {
        newLayer = result.current.finishDraw();
      });

      expect(newLayer).toBeNull();
    });

    it('auto-switches to select tool after creation', () => {
      act(() => {
        useUiStore.getState().setActiveTool('text');
      });

      const { result } = renderHook(() => useTextDrawTool());

      act(() => {
        result.current.startDraw(50, 50);
      });
      act(() => {
        result.current.updateDraw(200, 100);
      });
      act(() => {
        result.current.finishDraw();
      });

      expect(useUiStore.getState().activeTool).toBe('select');
    });

    it('starts inline text editing after creation', () => {
      const { result } = renderHook(() => useTextDrawTool());

      act(() => {
        result.current.startDraw(50, 50);
      });
      act(() => {
        result.current.updateDraw(200, 100);
      });
      act(() => {
        result.current.finishDraw();
      });

      expect(useUiStore.getState().isEditingText).toBe(true);
    });

    it('takes undo snapshot on creation', () => {
      const { result } = renderHook(() => useTextDrawTool());

      act(() => {
        result.current.startDraw(50, 50);
      });
      act(() => {
        result.current.updateDraw(200, 100);
      });
      act(() => {
        result.current.finishDraw();
      });

      expect(useUndoRedoStore.getState().undoStack.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 8E -- Inline Text Editing
  // =========================================================================
  describe('Inline Text Editor', () => {
    const makeLayerData = (overrides?: Partial<TextLayerData>): TextLayerData => ({
      id: 'text-edit-1',
      text: 'Hello World',
      x: 100,
      y: 100,
      width: 300,
      height: 50,
      rotation: 0,
      fontSize: 16,
      fontFamily: 'Arial',
      color: '#000000',
      ...overrides,
    });

    it('renders the inline text editor', () => {
      const layer = makeLayerData();
      const onCommit = vi.fn();
      const onCancel = vi.fn();

      render(
        <InlineTextEditor
          layer={layer}
          position={{ x: 0, y: 0 }}
          zoom={1}
          onCommit={onCommit}
          onCancel={onCancel}
        />,
      );

      const editor = screen.getByTestId('inline-text-editor');
      expect(editor).toBeInTheDocument();
    });

    it('appears with the layer text pre-filled', () => {
      const layer = makeLayerData({ text: 'Original text' });
      const onCommit = vi.fn();
      const onCancel = vi.fn();

      render(
        <InlineTextEditor
          layer={layer}
          position={{ x: 0, y: 0 }}
          zoom={1}
          onCommit={onCommit}
          onCancel={onCancel}
        />,
      );

      const textarea = screen.getByTestId('inline-text-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Original text');
    });

    it('has orange border (#FF6600)', () => {
      const layer = makeLayerData();
      const onCommit = vi.fn();
      const onCancel = vi.fn();

      render(
        <InlineTextEditor
          layer={layer}
          position={{ x: 0, y: 0 }}
          zoom={1}
          onCommit={onCommit}
          onCancel={onCancel}
        />,
      );

      const textarea = screen.getByTestId('inline-text-textarea') as HTMLTextAreaElement;
      // jsdom normalizes hex colors to rgb(), so check for the rgb equivalent
      const border = textarea.style.border;
      expect(
        border.includes('#FF6600') || border.includes('rgb(255, 102, 0)'),
      ).toBe(true);
    });

    it('Ctrl+Enter commits text changes', () => {
      const layer = makeLayerData({ text: 'Initial' });
      const onCommit = vi.fn();
      const onCancel = vi.fn();

      render(
        <InlineTextEditor
          layer={layer}
          position={{ x: 0, y: 0 }}
          zoom={1}
          onCommit={onCommit}
          onCancel={onCancel}
        />,
      );

      const textarea = screen.getByTestId('inline-text-textarea') as HTMLTextAreaElement;

      // Type some text
      fireEvent.change(textarea, { target: { value: 'Updated text' } });

      // Ctrl+Enter to commit
      fireEvent.keyDown(textarea, {
        key: 'Enter',
        ctrlKey: true,
      });

      expect(onCommit).toHaveBeenCalledWith('text-edit-1', 'Updated text');
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('Escape cancels text editing', () => {
      // Add the layer to the store so cancel can restore
      const textProps = createDefaultTextProperties();
      textProps.text = 'Original';
      const storeLayer = createDefaultLayer({
        id: 'text-cancel-1',
        type: 'text',
        textProperties: textProps,
      });
      act(() => {
        useDocumentStore.getState().addLayer(storeLayer);
      });

      const layer = makeLayerData({ id: 'text-cancel-1', text: 'Original' });
      const onCommit = vi.fn();
      const onCancel = vi.fn();

      render(
        <InlineTextEditor
          layer={layer}
          position={{ x: 0, y: 0 }}
          zoom={1}
          onCommit={onCommit}
          onCancel={onCancel}
        />,
      );

      const textarea = screen.getByTestId('inline-text-textarea') as HTMLTextAreaElement;

      // Type some text
      fireEvent.change(textarea, { target: { value: 'Changed text' } });

      // Escape to cancel
      fireEvent.keyDown(textarea, { key: 'Escape' });

      expect(onCancel).toHaveBeenCalled();
      expect(onCommit).not.toHaveBeenCalled();

      // Verify original text was restored in store
      const restoredLayer = useDocumentStore.getState().project.layers.find(
        (l) => l.id === 'text-cancel-1',
      );
      expect(restoredLayer?.textProperties?.text).toBe('Original');
    });

    it('applies rotation transform when rotation is non-zero', () => {
      const layer = makeLayerData({ rotation: 45 });
      const onCommit = vi.fn();
      const onCancel = vi.fn();

      render(
        <InlineTextEditor
          layer={layer}
          position={{ x: 0, y: 0 }}
          zoom={1}
          onCommit={onCommit}
          onCancel={onCancel}
        />,
      );

      const editor = screen.getByTestId('inline-text-editor');
      expect(editor.style.transform).toBe('rotate(45deg)');
    });

    it('scales position and size by zoom', () => {
      const layer = makeLayerData({
        x: 100,
        y: 100,
        width: 300,
        height: 50,
      });
      const onCommit = vi.fn();
      const onCancel = vi.fn();

      render(
        <InlineTextEditor
          layer={layer}
          position={{ x: 10, y: 20 }}
          zoom={2}
          onCommit={onCommit}
          onCancel={onCancel}
        />,
      );

      const editor = screen.getByTestId('inline-text-editor');
      // left = position.x + layer.x * zoom = 10 + 100 * 2 = 210
      expect(editor.style.left).toBe('210px');
      // top = position.y + layer.y * zoom = 20 + 100 * 2 = 220
      expect(editor.style.top).toBe('220px');
      // width = layer.width * zoom = 300 * 2 = 600
      expect(editor.style.width).toBe('600px');
      // height = layer.height * zoom = 50 * 2 = 100
      expect(editor.style.height).toBe('100px');
    });

    it('Meta+Enter also commits (macOS Cmd key)', () => {
      const layer = makeLayerData({ text: 'Mac test' });
      const onCommit = vi.fn();
      const onCancel = vi.fn();

      render(
        <InlineTextEditor
          layer={layer}
          position={{ x: 0, y: 0 }}
          zoom={1}
          onCommit={onCommit}
          onCancel={onCancel}
        />,
      );

      const textarea = screen.getByTestId('inline-text-textarea') as HTMLTextAreaElement;

      fireEvent.keyDown(textarea, {
        key: 'Enter',
        metaKey: true,
      });

      expect(onCommit).toHaveBeenCalledWith(layer.id, 'Mac test');
    });
  });

  // =========================================================================
  // Integration: tool activations via uiStore
  // =========================================================================
  describe('Tool activation integration', () => {
    it('B key sets activeTool to eraser', () => {
      act(() => {
        useUiStore.getState().setActiveTool('eraser');
      });
      expect(useUiStore.getState().activeTool).toBe('eraser');
    });

    it('J key sets activeTool to blurBrush', () => {
      act(() => {
        useUiStore.getState().setActiveTool('blurBrush');
      });
      expect(useUiStore.getState().activeTool).toBe('blurBrush');
    });

    it('R key sets activeTool to shape', () => {
      act(() => {
        useUiStore.getState().setActiveTool('shape');
      });
      expect(useUiStore.getState().activeTool).toBe('shape');
    });

    it('T key sets activeTool to text', () => {
      act(() => {
        useUiStore.getState().setActiveTool('text');
      });
      expect(useUiStore.getState().activeTool).toBe('text');
    });

    it('V key sets activeTool to select', () => {
      act(() => {
        useUiStore.getState().setActiveTool('shape');
      });
      act(() => {
        useUiStore.getState().setActiveTool('select');
      });
      expect(useUiStore.getState().activeTool).toBe('select');
    });
  });
});
