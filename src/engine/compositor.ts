import type { LayerModel } from '../types/LayerModel';
import type { BlendMode } from '../types/enums';
import { getEffectiveVisibility, getEffectiveOpacity } from '../types/LayerModel';
import { getCompositeOperation } from './blendModes';
import { renderLayerToCanvas } from './layerRenderer';
import { fillShape } from './shapeRenderer';
import { applyEffects, applyColorAdjustments } from './effectsEngine';

// ---------------------------------------------------------------------------
// hasActiveEffects – check if a layer has any active post-processing effects
// ---------------------------------------------------------------------------
function hasActiveEffects(layer: LayerModel): boolean {
  const e = layer.effects;
  if (
    (e.brightnessEnabled && e.brightness !== 0) ||
    (e.contrastEnabled && e.contrast !== 0) ||
    (e.saturationEnabled && e.saturation !== 0) ||
    (e.hueEnabled && e.hue !== 0) ||
    e.grayscale ||
    (e.sharpenEnabled && e.sharpen > 0) ||
    (e.vignetteEnabled && e.vignette > 0) ||
    (e.pixelateEnabled && e.pixelate > 0) ||
    (e.noiseEnabled && e.noise > 0) ||
    (e.gaussianBlurEnabled && e.gaussianBlur > 0) ||
    (e.dropShadowEnabled && e.dropShadowBlur > 0) ||
    e.outerGlowEnabled ||
    e.cutStrokeEnabled ||
    e.rimLightEnabled ||
    e.splitToningEnabled ||
    e.smoothStrokeEnabled ||
    e.blendOverlayEnabled
  ) {
    return true;
  }
  const a = layer.colorAdjustments;
  if (a.temperature !== 0 || a.tint !== 0 || a.exposure !== 0 || a.highlights !== 0 || a.shadows !== 0) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// compositeAllLayers – produce the final rendered canvas
// ---------------------------------------------------------------------------
export function compositeAllLayers(
  layers: LayerModel[],
  canvasWidth: number,
  canvasHeight: number,
  backgroundColor: string,
  zoom: number,
  quality: number,
  interactiveMode: boolean = false,
): HTMLCanvasElement {
  const scale = zoom * (quality / 100);
  const displayWidth = Math.max(1, Math.round(canvasWidth * scale));
  const displayHeight = Math.max(1, Math.round(canvasHeight * scale));

  const surface = document.createElement('canvas');
  surface.width = displayWidth;
  surface.height = displayHeight;

  const ctx = surface.getContext('2d');
  if (!ctx) return surface;

  // Draw background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, displayWidth, displayHeight);

  // Collect visible non-group layers in bottom-to-top order (array order = bottom first)
  const visibleLayers = layers.filter(
    (l) => l.type !== 'group' && getEffectiveVisibility(l, layers),
  );

  for (const layer of visibleLayers) {
    // Set blend mode
    ctx.globalCompositeOperation = getCompositeOperation(layer.blendMode as BlendMode);

    // Set effective opacity (product of ancestor chain)
    ctx.globalAlpha = getEffectiveOpacity(layer, layers);

    // -------------------------------------------------------------------
    // VECTOR PATH: Render shapes directly on compositor for crisp output
    //              at any zoom level (true vector rendering).
    // -------------------------------------------------------------------
    if (layer.type === 'shape' && layer.shapeProperties && !hasActiveEffects(layer)) {
      ctx.save();

      const posX = layer.x * scale;
      const posY = layer.y * scale;
      const drawW = layer.width * scale;
      const drawH = layer.height * scale;

      const anchorPxX = layer.anchorX * drawW;
      const anchorPxY = layer.anchorY * drawH;

      ctx.translate(posX + anchorPxX, posY + anchorPxY);

      if (layer.rotation !== 0) {
        ctx.rotate((layer.rotation * Math.PI) / 180);
      }

      const flipX = layer.flipHorizontal ? -1 : 1;
      const flipY = layer.flipVertical ? -1 : 1;
      if (flipX !== 1 || flipY !== 1) {
        ctx.scale(flipX, flipY);
      }

      // Move to layer top-left (relative to anchor), then scale to display size
      ctx.translate(-anchorPxX, -anchorPxY);

      // Apply crop clipping
      const hasCrop = layer.cropLeft > 0 || layer.cropTop > 0 || layer.cropRight > 0 || layer.cropBottom > 0;
      if (hasCrop) {
        const cropL = layer.cropLeft * drawW;
        const cropT = layer.cropTop * drawH;
        const cropR = layer.cropRight * drawW;
        const cropB = layer.cropBottom * drawH;
        ctx.beginPath();
        ctx.rect(cropL, cropT, drawW - cropL - cropR, drawH - cropT - cropB);
        ctx.clip();
      }

      // Scale so shape drawing functions work in logical (layer) coordinates
      ctx.scale(scale, scale);

      // Render shape path and fill/stroke directly
      fillShape(ctx, layer.shapeProperties, layer.width, layer.height);

      ctx.restore();
    }
    // -------------------------------------------------------------------
    // BITMAP PATH: Render to offscreen canvas, apply effects, then draw
    // -------------------------------------------------------------------
    else {
      let layerCanvas = renderLayerToCanvas(layer);
      if (!layerCanvas) continue;

      // Apply effects (skip expensive ones in interactive mode)
      if (!interactiveMode) {
        layerCanvas = applyEffects(layerCanvas, layer.effects);
        layerCanvas = applyColorAdjustments(layerCanvas, layer.colorAdjustments);
      }

      ctx.save();

      const posX = layer.x * scale;
      const posY = layer.y * scale;
      const drawW = layer.width * scale;
      const drawH = layer.height * scale;

      const anchorPxX = layer.anchorX * drawW;
      const anchorPxY = layer.anchorY * drawH;

      ctx.translate(posX + anchorPxX, posY + anchorPxY);

      if (layer.rotation !== 0) {
        ctx.rotate((layer.rotation * Math.PI) / 180);
      }

      const flipX = layer.flipHorizontal ? -1 : 1;
      const flipY = layer.flipVertical ? -1 : 1;
      if (flipX !== 1 || flipY !== 1) {
        ctx.scale(flipX, flipY);
      }

      ctx.drawImage(layerCanvas, -anchorPxX, -anchorPxY, drawW, drawH);

      ctx.restore();
    }

    // Reset composite state
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  return surface;
}
