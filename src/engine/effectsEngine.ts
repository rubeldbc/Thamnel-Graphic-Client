import type { LayerEffect, ColorAdjustments } from '../types/LayerEffect';
import type { BlendMode } from '../types/enums';
import { getCompositeOperation } from './blendModes';

// ---------------------------------------------------------------------------
// Helpers – offscreen canvas creation
// ---------------------------------------------------------------------------

function createOffscreen(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// ---------------------------------------------------------------------------
// applyColorAdjustments – brightness, contrast, saturation, hue rotation
//   via CSS filter strings on an offscreen canvas.
// ---------------------------------------------------------------------------
export function applyColorAdjustments(
  sourceCanvas: HTMLCanvasElement,
  adj: ColorAdjustments,
): HTMLCanvasElement {
  const { temperature, tint, exposure, highlights, shadows } = adj;

  // Quick exit if nothing to adjust
  const isDefault =
    temperature === 0 && tint === 0 && exposure === 0 && highlights === 0 && shadows === 0;
  if (isDefault) return sourceCanvas;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const out = createOffscreen(w, h);
  const ctx = out.getContext('2d')!;

  // Map adjustments to CSS filters (rough approximations):
  // exposure  -> brightness (1 = no change; +1 => 2x)
  // temperature -> hue-rotate + saturate tweak
  // tint -> hue-rotate offset
  const brightness = 1 + exposure; // exposure -1..+1 => 0..2
  const hueRotate = temperature * 0.5 + tint * 0.3; // degrees (small)
  const contrastBoost = 1 + highlights * 0.2 - shadows * 0.2;

  const parts: string[] = [];
  if (brightness !== 1) parts.push(`brightness(${brightness})`);
  if (hueRotate !== 0) parts.push(`hue-rotate(${hueRotate}deg)`);
  if (contrastBoost !== 1) parts.push(`contrast(${contrastBoost})`);

  if (parts.length > 0) {
    ctx.filter = parts.join(' ');
  }

  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.filter = 'none';
  return out;
}

// ---------------------------------------------------------------------------
// applyEffects – applies LayerEffect adjustments to a source canvas
// ---------------------------------------------------------------------------
export function applyEffects(
  sourceCanvas: HTMLCanvasElement,
  effects: LayerEffect,
): HTMLCanvasElement {
  let current = sourceCanvas;

  // ---- CSS-filter-based effects ----
  current = applyCSSFilters(current, effects);

  // ---- Pixel-manipulation effects ----
  if (effects.sharpenEnabled && effects.sharpen > 0) {
    current = applySharpen(current, effects.sharpen);
  }
  if (effects.vignetteEnabled && effects.vignette > 0) {
    current = applyVignette(current, effects.vignette);
  }
  if (effects.pixelateEnabled && effects.pixelate > 0) {
    current = applyPixelate(current, effects.pixelate);
  }
  if (effects.noiseEnabled && effects.noise > 0) {
    current = applyNoise(current, effects.noise);
  }
  if (effects.posterizeEnabled && effects.posterize > 0) {
    current = applyPosterize(current, effects.posterize);
  }
  if (effects.colorTintEnabled && effects.colorTintIntensity > 0) {
    current = applyColorTint(current, effects.colorTintColor, effects.colorTintIntensity);
  }

  // ---- Stroke / outline effects ----
  if (effects.cutStrokeEnabled && effects.cutStrokeWidth > 0) {
    current = applyCutStroke(current, effects.cutStrokeColor, effects.cutStrokeWidth);
  }
  if (effects.smoothStrokeEnabled && effects.smoothStrokeWidth > 0) {
    current = applySmoothStroke(
      current,
      effects.smoothStrokeColor,
      effects.smoothStrokeWidth,
      effects.smoothStrokeOpacity,
    );
  }

  // ---- Lighting effects ----
  if (effects.rimLightEnabled && effects.rimLightWidth > 0 && effects.rimLightIntensity > 0) {
    current = applyRimLight(
      current,
      effects.rimLightColor,
      effects.rimLightAngle,
      effects.rimLightIntensity,
      effects.rimLightWidth,
    );
  }

  // ---- Color grading ----
  if (effects.splitToningEnabled) {
    current = applySplitToning(
      current,
      effects.splitToningHighlightColor,
      effects.splitToningShadowColor,
      effects.splitToningBalance,
    );
  }

  // ---- Blend overlay ----
  if (effects.blendOverlayEnabled && effects.blendOverlayImage) {
    current = applyBlendOverlay(
      current,
      effects.blendOverlayImage,
      effects.blendOverlayOpacity,
      effects.blendOverlayMode,
    );
  }

  // NOTE: Drop shadow and outer glow are applied at the compositor level
  // using the canvas shadow API so they can extend beyond layer bounds.

  return current;
}

// ---------------------------------------------------------------------------
// CSS filters: brightness, contrast, saturation, hue, grayscale, sepia,
//   invert, gaussianBlur
// ---------------------------------------------------------------------------
function applyCSSFilters(
  source: HTMLCanvasElement,
  effects: LayerEffect,
): HTMLCanvasElement {
  const parts: string[] = [];

  if (effects.brightnessEnabled && effects.brightness !== 0) {
    // brightness is -100..+100 => CSS brightness 0..2 (0 = -100, 1 = 0, 2 = +100)
    parts.push(`brightness(${1 + effects.brightness / 100})`);
  }
  if (effects.contrastEnabled && effects.contrast !== 0) {
    parts.push(`contrast(${1 + effects.contrast / 100})`);
  }
  if (effects.saturationEnabled && effects.saturation !== 0) {
    parts.push(`saturate(${1 + effects.saturation / 100})`);
  }
  if (effects.hueEnabled && effects.hue !== 0) {
    parts.push(`hue-rotate(${effects.hue}deg)`);
  }
  if (effects.grayscale) {
    parts.push('grayscale(1)');
  }
  if (effects.sepia) {
    parts.push('sepia(1)');
  }
  if (effects.invert) {
    parts.push('invert(1)');
  }
  if (effects.gaussianBlurEnabled && effects.gaussianBlur > 0) {
    parts.push(`blur(${effects.gaussianBlur}px)`);
  }

  if (parts.length === 0) return source;

  const w = source.width;
  const h = source.height;
  const out = createOffscreen(w, h);
  const ctx = out.getContext('2d')!;
  ctx.filter = parts.join(' ');
  ctx.drawImage(source, 0, 0);
  ctx.filter = 'none';
  return out;
}

// ---------------------------------------------------------------------------
// Sharpen (3x3 convolution kernel)
// ---------------------------------------------------------------------------
function applySharpen(source: HTMLCanvasElement, amount: number): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  if (w === 0 || h === 0) return source;

  const srcCtx = source.getContext('2d')!;
  const imageData = srcCtx.getImageData(0, 0, w, h);
  const src = imageData.data;

  const out = createOffscreen(w, h);
  const outCtx = out.getContext('2d')!;
  const outData = outCtx.createImageData(w, h);
  const dst = outData.data;

  // Sharpening kernel (normalized by amount)
  const k = amount / 100; // 0..1
  const center = 1 + 4 * k;
  const side = -k;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const top = y > 0 ? src[((y - 1) * w + x) * 4 + c] : src[idx + c];
        const bottom = y < h - 1 ? src[((y + 1) * w + x) * 4 + c] : src[idx + c];
        const left = x > 0 ? src[(y * w + (x - 1)) * 4 + c] : src[idx + c];
        const right = x < w - 1 ? src[(y * w + (x + 1)) * 4 + c] : src[idx + c];

        const val = center * src[idx + c] + side * (top + bottom + left + right);
        dst[idx + c] = Math.max(0, Math.min(255, val));
      }
      dst[idx + 3] = src[idx + 3]; // alpha
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return out;
}

// ---------------------------------------------------------------------------
// Vignette (radial gradient overlay)
// ---------------------------------------------------------------------------
function applyVignette(source: HTMLCanvasElement, intensity: number): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  const out = createOffscreen(w, h);
  const ctx = out.getContext('2d')!;

  ctx.drawImage(source, 0, 0);

  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.sqrt(cx * cx + cy * cy);
  const grad = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
  const alpha = Math.min(1, intensity / 100);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${alpha})`);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  return out;
}

// ---------------------------------------------------------------------------
// Pixelate (down-scale then up-scale)
// ---------------------------------------------------------------------------
function applyPixelate(source: HTMLCanvasElement, blockSize: number): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  if (w === 0 || h === 0) return source;

  const size = Math.max(1, Math.round(blockSize));
  const smallW = Math.max(1, Math.ceil(w / size));
  const smallH = Math.max(1, Math.ceil(h / size));

  const small = createOffscreen(smallW, smallH);
  const sCtx = small.getContext('2d')!;
  sCtx.imageSmoothingEnabled = false;
  sCtx.drawImage(source, 0, 0, smallW, smallH);

  const out = createOffscreen(w, h);
  const oCtx = out.getContext('2d')!;
  oCtx.imageSmoothingEnabled = false;
  oCtx.drawImage(small, 0, 0, w, h);
  return out;
}

// ---------------------------------------------------------------------------
// Noise (random pixel offsets)
// ---------------------------------------------------------------------------
function applyNoise(source: HTMLCanvasElement, amount: number): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  if (w === 0 || h === 0) return source;

  const out = createOffscreen(w, h);
  const ctx = out.getContext('2d')!;
  ctx.drawImage(source, 0, 0);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const strength = (amount / 100) * 50; // max +-50 per channel

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const noise = (Math.random() - 0.5) * 2 * strength;
      data[i + c] = Math.max(0, Math.min(255, data[i + c] + noise));
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return out;
}

// ---------------------------------------------------------------------------
// Posterize (reduce colour levels)
// ---------------------------------------------------------------------------
function applyPosterize(source: HTMLCanvasElement, levels: number): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  if (w === 0 || h === 0) return source;

  const numLevels = Math.max(2, Math.round(levels));

  const out = createOffscreen(w, h);
  const ctx = out.getContext('2d')!;
  ctx.drawImage(source, 0, 0);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const step = 255 / (numLevels - 1);

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      data[i + c] = Math.round(Math.round(data[i + c] / step) * step);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return out;
}

// ---------------------------------------------------------------------------
// Color tint (multiply-blend overlay)
// ---------------------------------------------------------------------------
function applyColorTint(
  source: HTMLCanvasElement,
  tintColor: string,
  intensity: number,
): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  const out = createOffscreen(w, h);
  const ctx = out.getContext('2d')!;

  ctx.drawImage(source, 0, 0);

  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = Math.min(1, intensity / 100);
  ctx.fillStyle = tintColor;
  ctx.fillRect(0, 0, w, h);

  // Reset
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  return out;
}

// ---------------------------------------------------------------------------
// Helper: parse hex color
// ---------------------------------------------------------------------------
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) || 0,
    g: parseInt(h.substring(2, 4), 16) || 0,
    b: parseInt(h.substring(4, 6), 16) || 0,
  };
}

// ---------------------------------------------------------------------------
// Cut Stroke (hard outline around non-transparent content)
// ---------------------------------------------------------------------------
function applyCutStroke(
  source: HTMLCanvasElement,
  color: string,
  width: number,
): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  if (w === 0 || h === 0 || width <= 0) return source;

  const out = createOffscreen(w, h);
  const ctx = out.getContext('2d')!;

  // Create a colored silhouette of the source
  const silhouette = createOffscreen(w, h);
  const sCtx = silhouette.getContext('2d')!;
  sCtx.drawImage(source, 0, 0);
  sCtx.globalCompositeOperation = 'source-in';
  sCtx.fillStyle = color;
  sCtx.fillRect(0, 0, w, h);

  // Draw silhouette offset in all directions to create the stroke ring
  const strokePx = Math.max(1, Math.round(width));
  const steps = Math.max(16, strokePx * 4);
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    ctx.drawImage(
      silhouette,
      Math.cos(angle) * strokePx,
      Math.sin(angle) * strokePx,
    );
  }

  // Draw original on top so the stroke surrounds the content
  ctx.drawImage(source, 0, 0);
  return out;
}

// ---------------------------------------------------------------------------
// Smooth Stroke (anti-aliased / blurred outline)
// ---------------------------------------------------------------------------
function applySmoothStroke(
  source: HTMLCanvasElement,
  color: string,
  width: number,
  opacity: number,
): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  if (w === 0 || h === 0 || width <= 0) return source;

  const out = createOffscreen(w, h);
  const ctx = out.getContext('2d')!;

  // Create a blurred colored silhouette
  const silhouette = createOffscreen(w, h);
  const sCtx = silhouette.getContext('2d')!;
  sCtx.drawImage(source, 0, 0);
  sCtx.globalCompositeOperation = 'source-in';
  sCtx.fillStyle = color;
  sCtx.fillRect(0, 0, w, h);

  const blurred = createOffscreen(w, h);
  const bCtx = blurred.getContext('2d')!;
  bCtx.filter = `blur(${Math.max(1, width / 2)}px)`;
  bCtx.drawImage(silhouette, 0, 0);
  bCtx.filter = 'none';

  // Draw blurred silhouette offset in all directions
  const strokePx = Math.max(1, Math.round(width));
  const steps = Math.max(16, strokePx * 4);
  ctx.globalAlpha = Math.min(1, opacity);
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    ctx.drawImage(
      blurred,
      Math.cos(angle) * strokePx,
      Math.sin(angle) * strokePx,
    );
  }
  ctx.globalAlpha = 1;

  // Draw original on top
  ctx.drawImage(source, 0, 0);
  return out;
}

// ---------------------------------------------------------------------------
// Rim Light (directional edge highlight)
// ---------------------------------------------------------------------------
function applyRimLight(
  source: HTMLCanvasElement,
  color: string,
  angle: number,
  intensity: number,
  width: number,
): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  if (w === 0 || h === 0) return source;

  const out = createOffscreen(w, h);
  const ctx = out.getContext('2d')!;

  // Create a blurred light-colored silhouette
  const silhouette = createOffscreen(w, h);
  const sCtx = silhouette.getContext('2d')!;
  sCtx.drawImage(source, 0, 0);
  sCtx.globalCompositeOperation = 'source-in';
  sCtx.fillStyle = color;
  sCtx.fillRect(0, 0, w, h);

  const blurred = createOffscreen(w, h);
  const bCtx = blurred.getContext('2d')!;
  bCtx.filter = `blur(${Math.max(1, width)}px)`;
  bCtx.drawImage(silhouette, 0, 0);
  bCtx.filter = 'none';

  // Draw original
  ctx.drawImage(source, 0, 0);

  // Offset light from one direction using additive blending
  const rad = (angle * Math.PI) / 180;
  const offsetX = Math.cos(rad) * width;
  const offsetY = Math.sin(rad) * width;

  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, intensity / 100);
  ctx.drawImage(blurred, offsetX, offsetY);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // Clip to original alpha so light doesn't bleed outside
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  return out;
}

// ---------------------------------------------------------------------------
// Split Toning (highlight / shadow colour grading)
// ---------------------------------------------------------------------------
function applySplitToning(
  source: HTMLCanvasElement,
  highlightColor: string,
  shadowColor: string,
  balance: number,
): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  if (w === 0 || h === 0) return source;

  const out = createOffscreen(w, h);
  const ctx = out.getContext('2d')!;
  ctx.drawImage(source, 0, 0);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const hc = parseHexColor(highlightColor);
  const sc = parseHexColor(shadowColor);

  // Balance shifts the luminance midpoint (-100..100 => 64..192)
  const midpoint = 128 + (balance / 100) * 64;

  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

    if (lum > midpoint) {
      // Tint highlights
      const t = Math.min(1, (lum - midpoint) / (255 - midpoint)) * 0.3;
      data[i] = Math.max(0, Math.min(255, data[i] + (hc.r - 128) * t));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + (hc.g - 128) * t));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + (hc.b - 128) * t));
    } else {
      // Tint shadows
      const t = Math.min(1, (midpoint - lum) / midpoint) * 0.3;
      data[i] = Math.max(0, Math.min(255, data[i] + (sc.r - 128) * t));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + (sc.g - 128) * t));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + (sc.b - 128) * t));
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return out;
}

// ---------------------------------------------------------------------------
// Blend Overlay (composite an overlay image with a blend mode)
// ---------------------------------------------------------------------------
const overlayImageCache = new Map<string, HTMLImageElement>();

function applyBlendOverlay(
  source: HTMLCanvasElement,
  imageUrl: string,
  opacity: number,
  mode: BlendMode,
): HTMLCanvasElement {
  // Use cached image if available; otherwise trigger async load for next frame
  let img = overlayImageCache.get(imageUrl);
  if (!img) {
    img = new Image();
    img.src = imageUrl;
    overlayImageCache.set(imageUrl, img);
  }
  if (!img.complete || img.naturalWidth === 0) return source;

  const w = source.width;
  const h = source.height;
  const out = createOffscreen(w, h);
  const ctx = out.getContext('2d')!;

  ctx.drawImage(source, 0, 0);

  ctx.globalCompositeOperation = getCompositeOperation(mode);
  ctx.globalAlpha = Math.min(1, opacity / 100);
  ctx.drawImage(img, 0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  return out;
}
