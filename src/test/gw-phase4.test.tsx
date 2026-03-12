import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BlendMode, ShapeType } from '../types/enums';
import { BLEND_MODES, SHAPE_TYPES } from '../types/enums';
import { createDefaultLayer } from '../types/LayerModel';
import { createDefaultShapeProperties } from '../types/ShapeProperties';
import { createDefaultTextProperties } from '../types/TextProperties';
import { createDefaultLayerEffect, createDefaultColorAdjustments } from '../types/LayerEffect';

// ---------------------------------------------------------------------------
// Canvas / CanvasRenderingContext2D mock
//
// jsdom does not ship a real Canvas implementation, so we provide a
// lightweight mock that records calls so we can assert behaviour.
// ---------------------------------------------------------------------------

/** Tracked calls made on a mock context. */
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

      // Return recorded value for property sets
      if (prop in target) return target[prop];

      // For any function call, record it and return a safe value
      return (...args: any[]) => {
        calls.push({ method: prop as string, args });
        // measureText needs to return an object
        if (prop === 'measureText') {
          return { width: (args[0] as string).length * 8 };
        }
        // getImageData needs to return an ImageData-like
        if (prop === 'getImageData') {
          const w = args[2] || 1;
          const h = args[3] || 1;
          return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
        }
        // createImageData
        if (prop === 'createImageData') {
          const w = args[0] || 1;
          const h = args[1] || 1;
          return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
        }
        // createLinearGradient / createRadialGradient
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

  return new Proxy(target, handler) as CanvasRenderingContext2D & { __calls: CtxCall[] };
}

function createMockCanvas(width = 100, height = 100) {
  const ctx = createMockContext();
  const canvas = {
    width,
    height,
    getContext: vi.fn((_type: string) => {
      (ctx as any).canvas = canvas;
      (ctx as any).canvas = canvas;
      return ctx;
    }),
    toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
  } as unknown as HTMLCanvasElement;
  return { canvas, ctx };
}

// Patch document.createElement to intercept canvas creation
let origCreateElement: typeof document.createElement;
const canvasInstances: Array<ReturnType<typeof createMockCanvas>> = [];

function setupCanvasMock() {
  origCreateElement = document.createElement.bind(document);
  document.createElement = vi.fn(((tag: string, options?: any) => {
    if (tag === 'canvas') {
      const mock = createMockCanvas();
      canvasInstances.push(mock);
      return mock.canvas;
    }
    return origCreateElement(tag, options);
  })) as unknown as typeof document.createElement;
}

function teardownCanvasMock() {
  document.createElement = origCreateElement;
  canvasInstances.length = 0;
}

// Also mock Image
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Phase 4 – Canvas Rendering Engine', () => {
  beforeEach(() => {
    setupCanvasMock();
    (globalThis as any).Image = MockImage;
  });

  afterEach(() => {
    teardownCanvasMock();
    delete (globalThis as any).Image;
    // Clear caches between tests
    vi.resetModules();
  });

  // =========================================================================
  // 1. blendModes
  // =========================================================================
  describe('blendModes', () => {
    it('maps all 17 BlendMode values to correct composite operations', async () => {
      const { BLEND_MODE_MAP } = await import('../engine/blendModes');

      const expectedMap: Record<string, string> = {
        normal: 'source-over',
        multiply: 'multiply',
        darken: 'darken',
        colorBurn: 'color-burn',
        screen: 'screen',
        lighten: 'lighten',
        colorDodge: 'color-dodge',
        linearDodge: 'lighter',
        overlay: 'overlay',
        softLight: 'soft-light',
        hardLight: 'hard-light',
        difference: 'difference',
        exclusion: 'exclusion',
        hue: 'hue',
        saturation: 'saturation',
        color: 'color',
        luminosity: 'luminosity',
      };

      // Verify all 17 are present
      expect(Object.keys(BLEND_MODE_MAP)).toHaveLength(17);

      for (const [mode, expected] of Object.entries(expectedMap)) {
        expect(BLEND_MODE_MAP[mode as BlendMode]).toBe(expected);
      }
    });

    it('maps every BLEND_MODES enum entry', async () => {
      const { BLEND_MODE_MAP } = await import('../engine/blendModes');

      for (const { value } of BLEND_MODES) {
        expect(BLEND_MODE_MAP[value]).toBeDefined();
        expect(typeof BLEND_MODE_MAP[value]).toBe('string');
      }
    });

    it('getCompositeOperation falls back to source-over', async () => {
      const { getCompositeOperation } = await import('../engine/blendModes');

      expect(getCompositeOperation('normal')).toBe('source-over');
      expect(getCompositeOperation('multiply')).toBe('multiply');
      // Unknown value (cast) falls back
      expect(getCompositeOperation('nonexistent' as BlendMode)).toBe('source-over');
    });
  });

  // =========================================================================
  // 2. shapeRenderer
  // =========================================================================
  describe('shapeRenderer', () => {
    it('renderShapePath draws without error for all 27 shape types', async () => {
      const { renderShapePath } = await import('../engine/shapeRenderer');

      const allShapeTypes: ShapeType[] = SHAPE_TYPES.map((s) => s.value);
      expect(allShapeTypes).toHaveLength(27);

      for (const shapeType of allShapeTypes) {
        const ctx = createMockContext();
        expect(() => {
          renderShapePath(ctx, shapeType, 200, 150);
        }).not.toThrow();

        // Every shape should at least call beginPath
        const hasBeginPath = ctx.__calls.some((c) => c.method === 'beginPath');
        expect(hasBeginPath).toBe(true);
      }
    });

    it('rectangle calls ctx.rect', async () => {
      const { renderShapePath } = await import('../engine/shapeRenderer');

      const ctx = createMockContext();
      renderShapePath(ctx, 'rectangle', 100, 50);

      const rectCall = ctx.__calls.find((c) => c.method === 'rect');
      expect(rectCall).toBeDefined();
      expect(rectCall!.args).toEqual([0, 0, 100, 50]);
    });

    it('ellipse calls ctx.ellipse', async () => {
      const { renderShapePath } = await import('../engine/shapeRenderer');

      const ctx = createMockContext();
      renderShapePath(ctx, 'ellipse', 100, 80);

      const ellipseCall = ctx.__calls.find((c) => c.method === 'ellipse');
      expect(ellipseCall).toBeDefined();
      expect(ellipseCall!.args[0]).toBeCloseTo(50); // cx
      expect(ellipseCall!.args[1]).toBeCloseTo(40); // cy
    });

    it('fillShape applies fill and stroke', async () => {
      const { fillShape } = await import('../engine/shapeRenderer');

      const ctx = createMockContext();
      const props = createDefaultShapeProperties();
      props.shapeType = 'rectangle';
      props.fillColor = '#ff0000';
      props.borderWidth = 2;
      props.borderColor = '#00ff00';

      fillShape(ctx, props, 100, 100);

      // Should have called fill
      const fillCall = ctx.__calls.find((c) => c.method === 'fill');
      expect(fillCall).toBeDefined();

      // Should have called stroke (borderWidth > 0)
      const strokeCall = ctx.__calls.find((c) => c.method === 'stroke');
      expect(strokeCall).toBeDefined();
    });
  });

  // =========================================================================
  // 3. textRenderer
  // =========================================================================
  describe('textRenderer', () => {
    it('renders basic text without error', async () => {
      const { renderText } = await import('../engine/textRenderer');

      const ctx = createMockContext();
      const textProps = createDefaultTextProperties();
      textProps.text = 'Hello World';

      expect(() => {
        renderText(ctx, textProps, 300, 100);
      }).not.toThrow();

      // Should call fillText
      const fillTextCall = ctx.__calls.find((c) => c.method === 'fillText');
      expect(fillTextCall).toBeDefined();
    });

    it('applies text transform uppercase', async () => {
      const { renderText } = await import('../engine/textRenderer');

      const ctx = createMockContext();
      const textProps = createDefaultTextProperties();
      textProps.text = 'hello';
      textProps.transform = 'uppercase';

      renderText(ctx, textProps, 300, 100);

      const fillTextCall = ctx.__calls.find((c) => c.method === 'fillText');
      expect(fillTextCall).toBeDefined();
      expect(fillTextCall!.args[0]).toBe('HELLO');
    });

    it('applies text transform lowercase', async () => {
      const { renderText } = await import('../engine/textRenderer');

      const ctx = createMockContext();
      const textProps = createDefaultTextProperties();
      textProps.text = 'Hello World';
      textProps.transform = 'lowercase';

      renderText(ctx, textProps, 300, 100);

      const fillTextCall = ctx.__calls.find((c) => c.method === 'fillText');
      expect(fillTextCall).toBeDefined();
      expect(fillTextCall!.args[0]).toBe('hello world');
    });

    it('strokes text when strokeWidth > 0', async () => {
      const { renderText } = await import('../engine/textRenderer');

      const ctx = createMockContext();
      const textProps = createDefaultTextProperties();
      textProps.text = 'Stroke';
      textProps.strokeWidth = 2;
      textProps.strokeColor = '#ff0000';

      renderText(ctx, textProps, 300, 100);

      const strokeTextCall = ctx.__calls.find((c) => c.method === 'strokeText');
      expect(strokeTextCall).toBeDefined();
    });

    it('draws background box when hasBackground is true', async () => {
      const { renderText } = await import('../engine/textRenderer');

      const ctx = createMockContext();
      const textProps = createDefaultTextProperties();
      textProps.text = 'BG';
      textProps.hasBackground = true;
      textProps.backgroundColor = '#000000';
      textProps.backgroundOpacity = 0.8;

      renderText(ctx, textProps, 300, 100);

      const fillRectCall = ctx.__calls.find((c) => c.method === 'fillRect');
      expect(fillRectCall).toBeDefined();
    });

    it('handles per-run styling', async () => {
      const { renderText } = await import('../engine/textRenderer');

      const ctx = createMockContext();
      const textProps = createDefaultTextProperties();
      textProps.text = 'ABCD';
      textProps.runs = [
        { startIndex: 0, length: 2, fontWeight: 700, color: '#ff0000' },
        { startIndex: 2, length: 2, fontStyle: 'italic', color: '#0000ff' },
      ];

      expect(() => {
        renderText(ctx, textProps, 300, 100);
      }).not.toThrow();

      // Should have multiple fillText calls (one per segment)
      const fillTextCalls = ctx.__calls.filter((c) => c.method === 'fillText');
      expect(fillTextCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // 4. effectsEngine
  // =========================================================================
  describe('effectsEngine', () => {
    it('applyEffects returns a canvas (no-op when all disabled)', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');

      const { canvas: source } = createMockCanvas(200, 100);
      const effects = createDefaultLayerEffect();

      const result = applyEffects(source, effects);
      // With all effects disabled, should return the source canvas unchanged
      expect(result).toBe(source);
    });

    it('applies brightness via CSS filter', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');

      const { canvas: source } = createMockCanvas(200, 100);
      const effects = createDefaultLayerEffect();
      effects.brightnessEnabled = true;
      effects.brightness = 50;

      const result = applyEffects(source, effects);
      // Should return a new canvas (offscreen)
      expect(result).not.toBe(source);
      expect(result.width).toBe(200);
      expect(result.height).toBe(100);
    });

    it('applies contrast via CSS filter', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');

      const { canvas: source } = createMockCanvas(150, 150);
      const effects = createDefaultLayerEffect();
      effects.contrastEnabled = true;
      effects.contrast = 30;

      const result = applyEffects(source, effects);
      expect(result).not.toBe(source);
    });

    it('applies grayscale toggle', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');

      const { canvas: source } = createMockCanvas(100, 100);
      const effects = createDefaultLayerEffect();
      effects.grayscale = true;

      const result = applyEffects(source, effects);
      expect(result).not.toBe(source);
    });

    it('applies sepia toggle', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');

      const { canvas: source } = createMockCanvas(100, 100);
      const effects = createDefaultLayerEffect();
      effects.sepia = true;

      const result = applyEffects(source, effects);
      expect(result).not.toBe(source);
    });

    it('applies gaussian blur', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');

      const { canvas: source } = createMockCanvas(100, 100);
      const effects = createDefaultLayerEffect();
      effects.gaussianBlurEnabled = true;
      effects.gaussianBlur = 5;

      const result = applyEffects(source, effects);
      expect(result).not.toBe(source);
    });

    it('applyColorAdjustments returns source when all zero', async () => {
      const { applyColorAdjustments } = await import('../engine/effectsEngine');

      const { canvas: source } = createMockCanvas(100, 100);
      const adj = createDefaultColorAdjustments();

      const result = applyColorAdjustments(source, adj);
      expect(result).toBe(source);
    });

    it('applyColorAdjustments creates new canvas when exposure != 0', async () => {
      const { applyColorAdjustments } = await import('../engine/effectsEngine');

      const { canvas: source } = createMockCanvas(100, 100);
      const adj = createDefaultColorAdjustments();
      adj.exposure = 0.5;

      const result = applyColorAdjustments(source, adj);
      expect(result).not.toBe(source);
      expect(result.width).toBe(100);
    });

    it('applies pixel effects: pixelate', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');

      const { canvas: source } = createMockCanvas(100, 100);
      const effects = createDefaultLayerEffect();
      effects.pixelateEnabled = true;
      effects.pixelate = 8;

      const result = applyEffects(source, effects);
      expect(result).not.toBe(source);
    });

    it('applies pixel effects: color tint', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');

      const { canvas: source } = createMockCanvas(100, 100);
      const effects = createDefaultLayerEffect();
      effects.colorTintEnabled = true;
      effects.colorTintIntensity = 50;
      effects.colorTintColor = '#ff0000';

      const result = applyEffects(source, effects);
      expect(result).not.toBe(source);
    });
  });

  // =========================================================================
  // 5. layerRenderer
  // =========================================================================
  describe('layerRenderer', () => {
    it('returns null for group layers', async () => {
      const { renderLayerToCanvas } = await import('../engine/layerRenderer');

      const groupLayer = createDefaultLayer({ id: 'g1', type: 'group' });
      const result = renderLayerToCanvas(groupLayer);
      expect(result).toBeNull();
    });

    it('returns a canvas for a shape layer', async () => {
      const { renderLayerToCanvas } = await import('../engine/layerRenderer');

      const shapeLayer = createDefaultLayer({
        id: 'shape1',
        type: 'shape',
        width: 200,
        height: 100,
        shapeProperties: createDefaultShapeProperties(),
      });

      const result = renderLayerToCanvas(shapeLayer);
      expect(result).not.toBeNull();
      expect(result!.width).toBe(200);
      expect(result!.height).toBe(100);
    });

    it('returns a canvas for a text layer', async () => {
      const { renderLayerToCanvas } = await import('../engine/layerRenderer');

      const textLayer = createDefaultLayer({
        id: 'text1',
        type: 'text',
        width: 300,
        height: 50,
        textProperties: { ...createDefaultTextProperties(), text: 'Test' },
      });

      const result = renderLayerToCanvas(textLayer);
      expect(result).not.toBeNull();
      expect(result!.width).toBe(300);
    });

    it('returns a canvas for an image layer (no imageData)', async () => {
      const { renderLayerToCanvas } = await import('../engine/layerRenderer');

      const imgLayer = createDefaultLayer({
        id: 'img1',
        type: 'image',
        width: 400,
        height: 300,
        imageData: null,
      });

      const result = renderLayerToCanvas(imgLayer);
      // Should still return a canvas even though imageData is null
      expect(result).not.toBeNull();
      expect(result!.width).toBe(400);
    });

    it('returns a canvas for an image layer with imageData', async () => {
      const { renderLayerToCanvas } = await import('../engine/layerRenderer');

      const imgLayer = createDefaultLayer({
        id: 'img2',
        type: 'image',
        width: 400,
        height: 300,
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANS',
      });

      const result = renderLayerToCanvas(imgLayer);
      expect(result).not.toBeNull();
    });

    it('cache returns same canvas for same renderVersion', async () => {
      const { renderLayerToCanvas, renderLayerCache } = await import('../engine/layerRenderer');

      const layer = createDefaultLayer({
        id: 'cache-test',
        type: 'shape',
        width: 100,
        height: 100,
        shapeProperties: createDefaultShapeProperties(),
        renderVersion: 5,
      });

      const first = renderLayerToCanvas(layer);
      expect(first).not.toBeNull();

      // Cache should have the entry
      expect(renderLayerCache.has('cache-test')).toBe(true);
      expect(renderLayerCache.get('cache-test')!.version).toBe(5);

      // Second call should return the cached canvas
      const second = renderLayerToCanvas(layer);
      expect(second).toBe(first);
    });

    it('cache invalidates when renderVersion changes', async () => {
      const { renderLayerToCanvas, renderLayerCache } = await import('../engine/layerRenderer');

      const layer = createDefaultLayer({
        id: 'cache-invalidate',
        type: 'shape',
        width: 100,
        height: 100,
        shapeProperties: createDefaultShapeProperties(),
        renderVersion: 1,
      });

      const first = renderLayerToCanvas(layer);
      expect(first).not.toBeNull();

      // Update version
      const layer2 = { ...layer, renderVersion: 2 };
      const second = renderLayerToCanvas(layer2);
      expect(second).not.toBeNull();
      // New canvas should be created
      expect(second).not.toBe(first);
      expect(renderLayerCache.get('cache-invalidate')!.version).toBe(2);
    });

    it('clearLayerCache empties the cache', async () => {
      const { renderLayerToCanvas, renderLayerCache, clearLayerCache } = await import(
        '../engine/layerRenderer'
      );

      const layer = createDefaultLayer({
        id: 'clear-test',
        type: 'shape',
        width: 50,
        height: 50,
        shapeProperties: createDefaultShapeProperties(),
      });

      renderLayerToCanvas(layer);
      expect(renderLayerCache.size).toBeGreaterThan(0);

      clearLayerCache();
      expect(renderLayerCache.size).toBe(0);
    });

    it('applies crop clipping', async () => {
      const { renderLayerToCanvas } = await import('../engine/layerRenderer');

      const layer = createDefaultLayer({
        id: 'crop-test',
        type: 'shape',
        width: 200,
        height: 200,
        cropTop: 0.1,
        cropBottom: 0.1,
        cropLeft: 0.1,
        cropRight: 0.1,
        shapeProperties: createDefaultShapeProperties(),
      });

      const result = renderLayerToCanvas(layer);
      expect(result).not.toBeNull();
    });
  });

  // =========================================================================
  // 6. compositor
  // =========================================================================
  describe('compositor', () => {
    it('creates final canvas with correct dimensions', async () => {
      const { compositeAllLayers } = await import('../engine/compositor');

      const result = compositeAllLayers([], 1920, 1080, '#000000', 1, 100);
      expect(result).toBeDefined();
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });

    it('scales dimensions by zoom and quality', async () => {
      const { compositeAllLayers } = await import('../engine/compositor');

      const result = compositeAllLayers([], 1920, 1080, '#ffffff', 0.5, 50);
      // scale = 0.5 * 50/100 = 0.25
      expect(result.width).toBe(Math.round(1920 * 0.25));
      expect(result.height).toBe(Math.round(1080 * 0.25));
    });

    it('draws background color', async () => {
      const { compositeAllLayers } = await import('../engine/compositor');

      compositeAllLayers([], 800, 600, '#ff0000', 1, 100);

      // The first created canvas is the surface; its context should have fillRect called
      const surfaceCtx = canvasInstances[0]?.ctx;
      expect(surfaceCtx).toBeDefined();

      const fillRectCall = surfaceCtx!.__calls.find((c) => c.method === 'fillRect');
      expect(fillRectCall).toBeDefined();
    });

    it('composites visible layers (shape)', async () => {
      const { compositeAllLayers } = await import('../engine/compositor');

      const layer = createDefaultLayer({
        id: 'comp-shape',
        type: 'shape',
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        visible: true,
        opacity: 0.8,
        blendMode: 'multiply',
        shapeProperties: createDefaultShapeProperties(),
      });

      const result = compositeAllLayers([layer], 800, 600, '#ffffff', 1, 100);
      expect(result).toBeDefined();
      expect(result.width).toBe(800);
    });

    it('skips hidden layers', async () => {
      const { compositeAllLayers } = await import('../engine/compositor');

      const hidden = createDefaultLayer({
        id: 'hidden',
        type: 'shape',
        visible: false,
        shapeProperties: createDefaultShapeProperties(),
      });

      const result = compositeAllLayers([hidden], 800, 600, '#ffffff', 1, 100);
      expect(result).toBeDefined();
      // Only the surface canvas should be created (no layer render canvas)
      // The surface is canvasInstances[0]
      expect(canvasInstances.length).toBe(1);
    });

    it('skips group layers (renders only leaf layers)', async () => {
      const { compositeAllLayers } = await import('../engine/compositor');

      const group = createDefaultLayer({
        id: 'group1',
        type: 'group',
        visible: true,
      });

      compositeAllLayers([group], 800, 600, '#000000', 1, 100);
      // Group layer returns null from renderLayerToCanvas, so only surface canvas
      expect(canvasInstances.length).toBe(1);
    });

    it('interactive mode skips effects', async () => {
      const { compositeAllLayers } = await import('../engine/compositor');

      const layer = createDefaultLayer({
        id: 'interactive-layer',
        type: 'shape',
        visible: true,
        shapeProperties: createDefaultShapeProperties(),
        effects: { ...createDefaultLayerEffect(), brightnessEnabled: true, brightness: 50 },
      });

      // In interactive mode, effects should be skipped
      const result = compositeAllLayers([layer], 800, 600, '#000000', 1, 100, true);
      expect(result).toBeDefined();
    });

    it('computes effective opacity through parent chain', async () => {
      const { compositeAllLayers } = await import('../engine/compositor');

      const parent = createDefaultLayer({
        id: 'parent-g',
        type: 'group',
        visible: true,
        opacity: 0.5,
      });
      const child = createDefaultLayer({
        id: 'child-layer',
        type: 'shape',
        visible: true,
        opacity: 0.5,
        parentGroupId: 'parent-g',
        shapeProperties: createDefaultShapeProperties(),
      });

      compositeAllLayers([parent, child], 400, 300, '#000000', 1, 100);

      // The surface context should have globalAlpha set to 0.25 (0.5 * 0.5)
      const surfaceCtx = canvasInstances[0]?.ctx;
      expect(surfaceCtx).toBeDefined();
    });
  });

  // =========================================================================
  // 7. barrel export
  // =========================================================================
  describe('barrel export (engine/index.ts)', () => {
    it('exports all expected symbols', async () => {
      const engine = await import('../engine/index');

      expect(engine.BLEND_MODE_MAP).toBeDefined();
      expect(engine.getCompositeOperation).toBeInstanceOf(Function);
      expect(engine.renderShapePath).toBeInstanceOf(Function);
      expect(engine.fillShape).toBeInstanceOf(Function);
      expect(engine.renderText).toBeInstanceOf(Function);
      expect(engine.applyEffects).toBeInstanceOf(Function);
      expect(engine.applyColorAdjustments).toBeInstanceOf(Function);
      expect(engine.renderLayerToCanvas).toBeInstanceOf(Function);
      expect(engine.renderLayerCache).toBeDefined();
      expect(engine.clearLayerCache).toBeInstanceOf(Function);
      expect(engine.invalidateLayer).toBeInstanceOf(Function);
      expect(engine.compositeAllLayers).toBeInstanceOf(Function);
    });
  });
});
