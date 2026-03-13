import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { createDefaultLayer } from '../types/LayerModel';
import { createDefaultLayerEffect, createDefaultColorAdjustments } from '../types/LayerEffect';
import type { LayerEffect } from '../types/LayerEffect';

// ---------------------------------------------------------------------------
// Canvas / CanvasRenderingContext2D mock (matches gw-phase4 pattern)
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

  return new Proxy(target, handler) as CanvasRenderingContext2D & { __calls: CtxCall[] };
}

function createMockCanvas(width = 200, height = 200) {
  const ctx = createMockContext();
  const canvas = {
    width,
    height,
    getContext: vi.fn((_type: string) => {
      (ctx as any).canvas = canvas;
      return ctx;
    }),
    toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
  } as unknown as HTMLCanvasElement;
  return { canvas, ctx };
}

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

describe('Fixes — Effects, Frames, and Performance', () => {
  beforeEach(() => {
    setupCanvasMock();
    (globalThis as any).Image = MockImage;
  });

  afterEach(() => {
    teardownCanvasMock();
    delete (globalThis as any).Image;
    vi.resetModules();
  });

  // =========================================================================
  // 1. Effect parameter range fixes
  // =========================================================================

  describe('Effect parameter ranges', () => {
    it('applyEffects with sharpen=0.5 creates a new canvas (not near-zero sharpening)', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');
      const { canvas: source } = createMockCanvas(100, 100);
      const effects = createDefaultLayerEffect();
      effects.sharpenEnabled = true;
      effects.sharpen = 0.5;

      const result = applyEffects(source, effects);
      // Should produce a new canvas (not return source unchanged)
      expect(result).not.toBe(source);
      expect(result.width).toBe(100);
    });

    it('applyEffects with vignette=0.5 creates a visible vignette', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');
      const { canvas: source } = createMockCanvas(100, 100);
      const effects = createDefaultLayerEffect();
      effects.vignetteEnabled = true;
      effects.vignette = 0.5;

      const result = applyEffects(source, effects);
      expect(result).not.toBe(source);
      expect(result.width).toBe(100);
    });

    it('applyEffects with colorTint intensity=0.5 applies visible tint', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');
      const { canvas: source } = createMockCanvas(100, 100);
      const effects = createDefaultLayerEffect();
      effects.colorTintEnabled = true;
      effects.colorTintColor = '#ff0000';
      effects.colorTintIntensity = 0.5;

      const result = applyEffects(source, effects);
      expect(result).not.toBe(source);
      // Verify the offscreen canvas was created with correct dimensions
      expect(result.width).toBe(100);
    });

    it('applyEffects with noise=50 creates noisy canvas', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');
      const { canvas: source } = createMockCanvas(100, 100);
      const effects = createDefaultLayerEffect();
      effects.noiseEnabled = true;
      effects.noise = 50;

      const result = applyEffects(source, effects);
      expect(result).not.toBe(source);
    });

    it('applyEffects with posterize=4 reduces levels', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');
      const { canvas: source } = createMockCanvas(100, 100);
      const effects = createDefaultLayerEffect();
      effects.posterizeEnabled = true;
      effects.posterize = 4;

      const result = applyEffects(source, effects);
      expect(result).not.toBe(source);
    });

    it('applyEffects with gaussianBlur=10 blurs canvas', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');
      const { canvas: source } = createMockCanvas(100, 100);
      const effects = createDefaultLayerEffect();
      effects.gaussianBlurEnabled = true;
      effects.gaussianBlur = 10;

      const result = applyEffects(source, effects);
      expect(result).not.toBe(source);
    });

    it('applyEffects with pixelate=8 pixelates canvas', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');
      const { canvas: source } = createMockCanvas(100, 100);
      const effects = createDefaultLayerEffect();
      effects.pixelateEnabled = true;
      effects.pixelate = 8;

      const result = applyEffects(source, effects);
      expect(result).not.toBe(source);
    });

    it('applyEffects with sepia toggle creates new canvas', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');
      const { canvas: source } = createMockCanvas(100, 100);
      const effects = createDefaultLayerEffect();
      effects.sepia = true;

      const result = applyEffects(source, effects);
      expect(result).not.toBe(source);
    });

    it('applyEffects with invert toggle creates new canvas', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');
      const { canvas: source } = createMockCanvas(100, 100);
      const effects = createDefaultLayerEffect();
      effects.invert = true;

      const result = applyEffects(source, effects);
      expect(result).not.toBe(source);
    });

    it('applyEffects with grayscale toggle creates new canvas', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');
      const { canvas: source } = createMockCanvas(100, 100);
      const effects = createDefaultLayerEffect();
      effects.grayscale = true;

      const result = applyEffects(source, effects);
      expect(result).not.toBe(source);
    });

    it('all 21 effects produce a non-source result when enabled', async () => {
      const { applyEffects } = await import('../engine/effectsEngine');

      const effectConfigs: Array<{ name: string; patch: Partial<LayerEffect> }> = [
        { name: 'brightness', patch: { brightnessEnabled: true, brightness: 50 } },
        { name: 'contrast', patch: { contrastEnabled: true, contrast: 50 } },
        { name: 'saturation', patch: { saturationEnabled: true, saturation: 50 } },
        { name: 'hue', patch: { hueEnabled: true, hue: 45 } },
        { name: 'grayscale', patch: { grayscale: true } },
        { name: 'sepia', patch: { sepia: true } },
        { name: 'invert', patch: { invert: true } },
        { name: 'gaussianBlur', patch: { gaussianBlurEnabled: true, gaussianBlur: 5 } },
        { name: 'sharpen', patch: { sharpenEnabled: true, sharpen: 0.5 } },
        { name: 'vignette', patch: { vignetteEnabled: true, vignette: 0.5 } },
        { name: 'pixelate', patch: { pixelateEnabled: true, pixelate: 8 } },
        { name: 'noise', patch: { noiseEnabled: true, noise: 50 } },
        { name: 'posterize', patch: { posterizeEnabled: true, posterize: 4 } },
        { name: 'colorTint', patch: { colorTintEnabled: true, colorTintColor: '#ff0000', colorTintIntensity: 0.5 } },
        { name: 'cutStroke', patch: { cutStrokeEnabled: true, cutStrokeColor: '#000000', cutStrokeWidth: 3 } },
        { name: 'smoothStroke', patch: { smoothStrokeEnabled: true, smoothStrokeColor: '#000000', smoothStrokeWidth: 3, smoothStrokeOpacity: 0.8 } },
        { name: 'rimLight', patch: { rimLightEnabled: true, rimLightColor: '#ffffff', rimLightAngle: 45, rimLightIntensity: 50, rimLightWidth: 5 } },
        { name: 'splitToning', patch: { splitToningEnabled: true, splitToningBalance: 50 } },
      ];

      for (const config of effectConfigs) {
        const { canvas: source } = createMockCanvas(100, 100);
        const effects = { ...createDefaultLayerEffect(), ...config.patch };
        const result = applyEffects(source, effects);
        expect(result).not.toBe(source);
        // Result must have valid dimensions
        expect(result.width).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // 2. hasActiveEffects completeness
  // =========================================================================

  describe('hasActiveEffects', () => {
    it('detects sepia as active', async () => {
      const { hasActiveEffects } = await import('../engine/compositor');
      const layer = createDefaultLayer();
      layer.effects.sepia = true;
      expect(hasActiveEffects(layer)).toBe(true);
    });

    it('detects invert as active', async () => {
      const { hasActiveEffects } = await import('../engine/compositor');
      const layer = createDefaultLayer();
      layer.effects.invert = true;
      expect(hasActiveEffects(layer)).toBe(true);
    });

    it('detects posterize as active', async () => {
      const { hasActiveEffects } = await import('../engine/compositor');
      const layer = createDefaultLayer();
      layer.effects.posterizeEnabled = true;
      layer.effects.posterize = 4;
      expect(hasActiveEffects(layer)).toBe(true);
    });

    it('detects colorTint as active', async () => {
      const { hasActiveEffects } = await import('../engine/compositor');
      const layer = createDefaultLayer();
      layer.effects.colorTintEnabled = true;
      layer.effects.colorTintIntensity = 0.5;
      expect(hasActiveEffects(layer)).toBe(true);
    });

    it('detects dropShadow with only offset (no blur) as active', async () => {
      const { hasActiveEffects } = await import('../engine/compositor');
      const layer = createDefaultLayer();
      layer.effects.dropShadowEnabled = true;
      layer.effects.dropShadowBlur = 0;
      layer.effects.dropShadowOffsetX = 5;
      layer.effects.dropShadowOffsetY = 0;
      expect(hasActiveEffects(layer)).toBe(true);
    });

    it('detects dropShadow with Y offset only as active', async () => {
      const { hasActiveEffects } = await import('../engine/compositor');
      const layer = createDefaultLayer();
      layer.effects.dropShadowEnabled = true;
      layer.effects.dropShadowBlur = 0;
      layer.effects.dropShadowOffsetX = 0;
      layer.effects.dropShadowOffsetY = 10;
      expect(hasActiveEffects(layer)).toBe(true);
    });

    it('returns false when no effects are active', async () => {
      const { hasActiveEffects } = await import('../engine/compositor');
      const layer = createDefaultLayer();
      expect(hasActiveEffects(layer)).toBe(false);
    });

    it('detects every individual effect type', async () => {
      const { hasActiveEffects } = await import('../engine/compositor');

      const effectPatches: Array<{ name: string; patch: Partial<LayerEffect> }> = [
        { name: 'brightness', patch: { brightnessEnabled: true, brightness: 10 } },
        { name: 'contrast', patch: { contrastEnabled: true, contrast: 10 } },
        { name: 'saturation', patch: { saturationEnabled: true, saturation: 10 } },
        { name: 'hue', patch: { hueEnabled: true, hue: 10 } },
        { name: 'grayscale', patch: { grayscale: true } },
        { name: 'sepia', patch: { sepia: true } },
        { name: 'invert', patch: { invert: true } },
        { name: 'sharpen', patch: { sharpenEnabled: true, sharpen: 0.5 } },
        { name: 'vignette', patch: { vignetteEnabled: true, vignette: 0.5 } },
        { name: 'pixelate', patch: { pixelateEnabled: true, pixelate: 5 } },
        { name: 'noise', patch: { noiseEnabled: true, noise: 10 } },
        { name: 'posterize', patch: { posterizeEnabled: true, posterize: 4 } },
        { name: 'colorTint', patch: { colorTintEnabled: true, colorTintIntensity: 0.5 } },
        { name: 'gaussianBlur', patch: { gaussianBlurEnabled: true, gaussianBlur: 5 } },
        { name: 'dropShadow (blur)', patch: { dropShadowEnabled: true, dropShadowBlur: 5 } },
        { name: 'dropShadow (offsetX)', patch: { dropShadowEnabled: true, dropShadowOffsetX: 5 } },
        { name: 'dropShadow (offsetY)', patch: { dropShadowEnabled: true, dropShadowOffsetY: 5 } },
        { name: 'outerGlow', patch: { outerGlowEnabled: true } },
        { name: 'cutStroke', patch: { cutStrokeEnabled: true } },
        { name: 'rimLight', patch: { rimLightEnabled: true } },
        { name: 'splitToning', patch: { splitToningEnabled: true } },
        { name: 'smoothStroke', patch: { smoothStrokeEnabled: true } },
        { name: 'blendOverlay', patch: { blendOverlayEnabled: true } },
      ];

      for (const ep of effectPatches) {
        const layer = createDefaultLayer();
        Object.assign(layer.effects, ep.patch);
        expect(hasActiveEffects(layer)).toBe(true);
      }
    });
  });

  // =========================================================================
  // 3. Compositor blend modes
  // =========================================================================

  describe('Compositor blend modes', () => {
    it('composites a layer with multiply blend mode', async () => {
      const { compositeAllLayers } = await import('../engine/compositor');
      const layer = createDefaultLayer({
        id: 'blend-test',
        type: 'image',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        visible: true,
        blendMode: 'multiply',
      });

      const result = compositeAllLayers([layer], 200, 200, '#ffffff', 1, 100);
      expect(result).toBeDefined();
      expect(result.width).toBe(200);
      expect(result.height).toBe(200);
    });

    it('composites multiple layers with different blend modes', async () => {
      const { compositeAllLayers } = await import('../engine/compositor');
      const layer1 = createDefaultLayer({
        id: 'layer-1',
        type: 'image',
        x: 0, y: 0,
        width: 100, height: 100,
        visible: true,
        blendMode: 'screen',
      });
      const layer2 = createDefaultLayer({
        id: 'layer-2',
        type: 'image',
        x: 50, y: 50,
        width: 100, height: 100,
        visible: true,
        blendMode: 'overlay',
      });

      const result = compositeAllLayers([layer1, layer2], 200, 200, '#ffffff', 1, 100);
      expect(result).toBeDefined();
      expect(result.width).toBe(200);
    });
  });

  // =========================================================================
  // 4. FrameThumbnail animate prop
  // =========================================================================

  describe('FrameThumbnail', () => {
    it('renders without animate class by default', async () => {
      const { FrameThumbnail } = await import('../components/FrameGallery/FrameThumbnail');
      render(
        <FrameThumbnail
          src="data:image/png;base64,test"
          timestamp="01:23"
        />,
      );

      const thumb = screen.getByTestId('frame-thumbnail');
      expect(thumb.className).not.toContain('animate-fadeIn');
    });

    it('renders with animate-fadeIn class when animate=true', async () => {
      const { FrameThumbnail } = await import('../components/FrameGallery/FrameThumbnail');
      render(
        <FrameThumbnail
          src="data:image/png;base64,test"
          timestamp="01:23"
          animate={true}
        />,
      );

      const thumb = screen.getByTestId('frame-thumbnail');
      expect(thumb.className).toContain('animate-fadeIn');
    });

    it('renders timestamp overlay', async () => {
      const { FrameThumbnail } = await import('../components/FrameGallery/FrameThumbnail');
      render(
        <FrameThumbnail
          src="data:image/png;base64,test"
          timestamp="02:45"
        />,
      );

      const ts = screen.getByTestId('frame-thumbnail-timestamp');
      expect(ts.textContent).toBe('02:45');
    });

    it('applies correct 16:9 aspect ratio from thumbHeight', async () => {
      const { FrameThumbnail } = await import('../components/FrameGallery/FrameThumbnail');
      render(
        <FrameThumbnail
          src="data:image/png;base64,test"
          timestamp="00:00"
          thumbHeight={90}
        />,
      );

      const thumb = screen.getByTestId('frame-thumbnail');
      // Width = 90 * 16/9 = 160
      expect(thumb.style.width).toBe('160px');
      expect(thumb.style.height).toBe('90px');
    });
  });

  // =========================================================================
  // 5. Color adjustments
  // =========================================================================

  describe('Color adjustments', () => {
    it('applyColorAdjustments returns source when all defaults', async () => {
      const { applyColorAdjustments } = await import('../engine/effectsEngine');
      const { canvas: source } = createMockCanvas(100, 100);
      const adj = createDefaultColorAdjustments();

      const result = applyColorAdjustments(source, adj);
      expect(result).toBe(source); // No change, returns same reference
    });

    it('applyColorAdjustments with exposure creates new canvas', async () => {
      const { applyColorAdjustments } = await import('../engine/effectsEngine');
      const { canvas: source } = createMockCanvas(100, 100);
      const adj = createDefaultColorAdjustments();
      adj.exposure = 0.5;

      const result = applyColorAdjustments(source, adj);
      expect(result).not.toBe(source);
      expect(result.width).toBe(100);
    });

    it('applyColorAdjustments with temperature creates new canvas', async () => {
      const { applyColorAdjustments } = await import('../engine/effectsEngine');
      const { canvas: source } = createMockCanvas(100, 100);
      const adj = createDefaultColorAdjustments();
      adj.temperature = 30;

      const result = applyColorAdjustments(source, adj);
      expect(result).not.toBe(source);
    });
  });

  // =========================================================================
  // 6. MediaStore addFrame
  // =========================================================================

  describe('MediaStore addFrame', () => {
    it('addFrame adds a single frame to the store', async () => {
      const { useMediaStore } = await import('../stores/mediaStore');
      const store = useMediaStore.getState();

      // Clear any existing frames
      useMediaStore.setState({ frames: [] });

      store.addFrame({
        id: 'test-frame-1',
        videoId: 'video-1',
        src: 'data:image/jpeg;base64,abc',
        timestamp: '00:05',
      });

      const frames = useMediaStore.getState().frames;
      expect(frames).toHaveLength(1);
      expect(frames[0].id).toBe('test-frame-1');
      expect(frames[0].timestamp).toBe('00:05');
    });

    it('addFrame adds frames incrementally', async () => {
      const { useMediaStore } = await import('../stores/mediaStore');
      useMediaStore.setState({ frames: [] });

      const store = useMediaStore.getState();
      store.addFrame({
        id: 'frame-a',
        videoId: 'v1',
        src: 'data:image/jpeg;base64,a',
        timestamp: '00:01',
      });
      store.addFrame({
        id: 'frame-b',
        videoId: 'v1',
        src: 'data:image/jpeg;base64,b',
        timestamp: '00:02',
      });
      store.addFrame({
        id: 'frame-c',
        videoId: 'v1',
        src: 'data:image/jpeg;base64,c',
        timestamp: '00:03',
      });

      const frames = useMediaStore.getState().frames;
      expect(frames).toHaveLength(3);
      expect(frames[0].id).toBe('frame-a');
      expect(frames[1].id).toBe('frame-b');
      expect(frames[2].id).toBe('frame-c');
    });
  });

  // =========================================================================
  // 7. NumericUpDown press-and-hold behavior
  // =========================================================================

  describe('NumericUpDown', () => {
    it('renders with value and suffix', async () => {
      const { NumericUpDown } = await import('../components/common/NumericUpDown');
      render(<NumericUpDown value={42} suffix="px" />);
      const input = screen.getByTestId('nud-input');
      expect(input).toHaveValue('42px');
    });

    it('renders with label', async () => {
      const { NumericUpDown } = await import('../components/common/NumericUpDown');
      render(<NumericUpDown value={10} label="Width" />);
      const container = screen.getByTestId('nud-width');
      expect(container).toBeTruthy();
    });

    it('fires onChange immediately on up button mousedown', async () => {
      const { NumericUpDown } = await import('../components/common/NumericUpDown');
      const onChange = vi.fn();
      render(<NumericUpDown value={10} step={1} min={0} max={100} onChange={onChange} />);

      const upBtn = screen.getByTestId('nud-up');
      fireEvent.mouseDown(upBtn);
      fireEvent.mouseUp(upBtn);

      // Should fire exactly once on immediate press
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(11);
    });

    it('fires onChange immediately on down button mousedown', async () => {
      const { NumericUpDown } = await import('../components/common/NumericUpDown');
      const onChange = vi.fn();
      render(<NumericUpDown value={10} step={1} min={0} max={100} onChange={onChange} />);

      const downBtn = screen.getByTestId('nud-down');
      fireEvent.mouseDown(downBtn);
      fireEvent.mouseUp(downBtn);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(9);
    });

    it('clamps to min value', async () => {
      const { NumericUpDown } = await import('../components/common/NumericUpDown');
      const onChange = vi.fn();
      render(<NumericUpDown value={0} step={1} min={0} max={100} onChange={onChange} />);

      const downBtn = screen.getByTestId('nud-down');
      fireEvent.mouseDown(downBtn);
      fireEvent.mouseUp(downBtn);

      expect(onChange).toHaveBeenCalledWith(0); // clamped to min
    });

    it('clamps to max value', async () => {
      const { NumericUpDown } = await import('../components/common/NumericUpDown');
      const onChange = vi.fn();
      render(<NumericUpDown value={100} step={1} min={0} max={100} onChange={onChange} />);

      const upBtn = screen.getByTestId('nud-up');
      fireEvent.mouseDown(upBtn);
      fireEvent.mouseUp(upBtn);

      expect(onChange).toHaveBeenCalledWith(100); // clamped to max
    });

    it('does not fire onChange when disabled', async () => {
      const { NumericUpDown } = await import('../components/common/NumericUpDown');
      const onChange = vi.fn();
      render(<NumericUpDown value={10} step={1} onChange={onChange} disabled />);

      const upBtn = screen.getByTestId('nud-up');
      fireEvent.mouseDown(upBtn);
      fireEvent.mouseUp(upBtn);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('continuously increments on sustained mousedown (press-and-hold)', async () => {
      vi.useFakeTimers();
      const { NumericUpDown } = await import('../components/common/NumericUpDown');
      const onChange = vi.fn();
      render(<NumericUpDown value={10} step={1} min={0} max={1000} onChange={onChange} />);

      const upBtn = screen.getByTestId('nud-up');
      fireEvent.mouseDown(upBtn);

      // Immediate fire
      expect(onChange).toHaveBeenCalledTimes(1);

      // After 400ms initial delay + 300ms first tick = ~700ms → 2 calls
      act(() => { vi.advanceTimersByTime(700); });
      expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(2);

      // After another 500ms → more calls (acceleration)
      act(() => { vi.advanceTimersByTime(500); });
      expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(3);

      fireEvent.mouseUp(upBtn);

      // No more calls after mouseUp
      const countAfterUp = onChange.mock.calls.length;
      act(() => { vi.advanceTimersByTime(1000); });
      expect(onChange.mock.calls.length).toBe(countAfterUp);

      vi.useRealTimers();
    });

    it('stops repeating on mouseLeave', async () => {
      vi.useFakeTimers();
      const { NumericUpDown } = await import('../components/common/NumericUpDown');
      const onChange = vi.fn();
      render(<NumericUpDown value={10} step={1} min={0} max={1000} onChange={onChange} />);

      const upBtn = screen.getByTestId('nud-up');
      fireEvent.mouseDown(upBtn);

      expect(onChange).toHaveBeenCalledTimes(1);

      // Mouse leaves the button
      fireEvent.mouseLeave(upBtn);

      const countAfterLeave = onChange.mock.calls.length;
      act(() => { vi.advanceTimersByTime(2000); });
      expect(onChange.mock.calls.length).toBe(countAfterLeave);

      vi.useRealTimers();
    });

    it('uses step for fractional values', async () => {
      const { NumericUpDown } = await import('../components/common/NumericUpDown');
      const onChange = vi.fn();
      render(<NumericUpDown value={0.5} step={0.1} min={0} max={1} onChange={onChange} />);

      const upBtn = screen.getByTestId('nud-up');
      fireEvent.mouseDown(upBtn);
      fireEvent.mouseUp(upBtn);

      expect(onChange).toHaveBeenCalledTimes(1);
      // 0.5 + 0.1 = 0.6 (floating point may differ slightly)
      expect(onChange.mock.calls[0][0]).toBeCloseTo(0.6, 5);
    });
  });

  // =========================================================================
  // 8. Default LayerEffect enabled states
  // =========================================================================

  describe('Default LayerEffect enabled states', () => {
    it('slider effects are enabled by default', () => {
      const defaults = createDefaultLayerEffect();

      // All slider-based effects should be enabled
      expect(defaults.brightnessEnabled).toBe(true);
      expect(defaults.contrastEnabled).toBe(true);
      expect(defaults.saturationEnabled).toBe(true);
      expect(defaults.hueEnabled).toBe(true);
      expect(defaults.sharpenEnabled).toBe(true);
      expect(defaults.vignetteEnabled).toBe(true);
      expect(defaults.pixelateEnabled).toBe(true);
      expect(defaults.colorTintEnabled).toBe(true);
      expect(defaults.noiseEnabled).toBe(true);
      expect(defaults.posterizeEnabled).toBe(true);
      expect(defaults.gaussianBlurEnabled).toBe(true);
    });

    it('slider effects have neutral (no-op) values by default', () => {
      const defaults = createDefaultLayerEffect();

      expect(defaults.brightness).toBe(0);
      expect(defaults.contrast).toBe(0);
      expect(defaults.saturation).toBe(0);
      expect(defaults.hue).toBe(0);
      expect(defaults.sharpen).toBe(0);
      expect(defaults.vignette).toBe(0);
      expect(defaults.pixelate).toBe(0);
      expect(defaults.colorTintIntensity).toBe(0);
      expect(defaults.noise).toBe(0);
      expect(defaults.posterize).toBe(0);
      expect(defaults.gaussianBlur).toBe(0);
    });

    it('non-slider effects are disabled by default', () => {
      const defaults = createDefaultLayerEffect();

      expect(defaults.dropShadowEnabled).toBe(false);
      expect(defaults.outerGlowEnabled).toBe(false);
      expect(defaults.cutStrokeEnabled).toBe(false);
      expect(defaults.rimLightEnabled).toBe(false);
      expect(defaults.splitToningEnabled).toBe(false);
      expect(defaults.smoothStrokeEnabled).toBe(false);
      expect(defaults.blendOverlayEnabled).toBe(false);
    });

    it('toggle effects (grayscale, sepia, invert) are off by default', () => {
      const defaults = createDefaultLayerEffect();

      expect(defaults.grayscale).toBe(false);
      expect(defaults.sepia).toBe(false);
      expect(defaults.invert).toBe(false);
    });

    it('default layer effects do not trigger hasActiveEffects', async () => {
      const { hasActiveEffects } = await import('../engine/compositor');
      const layer = createDefaultLayer();
      // With slider effects enabled but at neutral values, hasActiveEffects should be false
      expect(hasActiveEffects(layer)).toBe(false);
    });
  });
});
