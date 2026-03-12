import type { LayerModel } from '../types/LayerModel';
import type { BlendMode } from '../types/enums';
import { getEffectiveVisibility, getEffectiveOpacity } from '../types/LayerModel';
import { getCompositeOperation } from './blendModes';
import { renderLayerToCanvas } from './layerRenderer';
import { applyEffects, applyColorAdjustments } from './effectsEngine';

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
    // Render layer bitmap
    let layerCanvas = renderLayerToCanvas(layer);
    if (!layerCanvas) continue;

    // Apply effects (skip expensive ones in interactive mode)
    if (!interactiveMode) {
      layerCanvas = applyEffects(layerCanvas, layer.effects);
      layerCanvas = applyColorAdjustments(layerCanvas, layer.colorAdjustments);
    }

    // Set blend mode
    ctx.globalCompositeOperation = getCompositeOperation(layer.blendMode as BlendMode);

    // Set effective opacity (product of ancestor chain)
    ctx.globalAlpha = getEffectiveOpacity(layer, layers);

    ctx.save();

    // Transform: translate to position + rotation centre
    const posX = layer.x * scale;
    const posY = layer.y * scale;
    const drawW = layer.width * scale;
    const drawH = layer.height * scale;

    const anchorPxX = layer.anchorX * drawW;
    const anchorPxY = layer.anchorY * drawH;

    ctx.translate(posX + anchorPxX, posY + anchorPxY);

    // Rotation (degrees -> radians)
    if (layer.rotation !== 0) {
      ctx.rotate((layer.rotation * Math.PI) / 180);
    }

    // Flip
    const flipX = layer.flipHorizontal ? -1 : 1;
    const flipY = layer.flipVertical ? -1 : 1;
    if (flipX !== 1 || flipY !== 1) {
      ctx.scale(flipX, flipY);
    }

    // Draw the layer bitmap, centred on the anchor point
    ctx.drawImage(layerCanvas, -anchorPxX, -anchorPxY, drawW, drawH);

    ctx.restore();

    // Reset composite state
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  return surface;
}
