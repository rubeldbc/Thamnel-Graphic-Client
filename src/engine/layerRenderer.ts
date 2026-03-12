import type { LayerModel } from '../types/LayerModel';
import { fillShape } from './shapeRenderer';
import { renderText } from './textRenderer';

// ---------------------------------------------------------------------------
// Render cache: Map<layerId, { canvas, version }>
// ---------------------------------------------------------------------------
export const renderLayerCache = new Map<
  string,
  { canvas: HTMLCanvasElement; version: number }
>();

/** Clear the entire render cache. */
export function clearLayerCache(): void {
  renderLayerCache.clear();
}

/** Remove a single layer from the cache. */
export function invalidateLayer(layerId: string): void {
  renderLayerCache.delete(layerId);
}

// ---------------------------------------------------------------------------
// renderLayerToCanvas – render a single layer into its own canvas
// ---------------------------------------------------------------------------
export function renderLayerToCanvas(layer: LayerModel): HTMLCanvasElement | null {
  // Groups have no visual content – children are rendered individually
  if (layer.type === 'group') return null;

  // Check cache
  const cached = renderLayerCache.get(layer.id);
  if (cached && cached.version === layer.renderVersion) {
    return cached.canvas;
  }

  const w = Math.max(1, Math.round(layer.width));
  const h = Math.max(1, Math.round(layer.height));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Apply crop clipping
  const cropLeft = layer.cropLeft * w;
  const cropTop = layer.cropTop * h;
  const cropRight = layer.cropRight * w;
  const cropBottom = layer.cropBottom * h;
  const hasCrop = cropLeft > 0 || cropTop > 0 || cropRight > 0 || cropBottom > 0;

  if (hasCrop) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(cropLeft, cropTop, w - cropLeft - cropRight, h - cropTop - cropBottom);
    ctx.clip();
  }

  // Render by type
  switch (layer.type) {
    case 'image':
      renderImageLayer(ctx, layer, w, h);
      break;
    case 'text':
      if (layer.textProperties) {
        renderText(ctx, layer.textProperties, w, h);
      }
      break;
    case 'shape':
      if (layer.shapeProperties) {
        fillShape(ctx, layer.shapeProperties, w, h);
      }
      break;
  }

  if (hasCrop) {
    ctx.restore();
  }

  // Store in cache
  renderLayerCache.set(layer.id, { canvas, version: layer.renderVersion });

  return canvas;
}

// ---------------------------------------------------------------------------
// Image layer rendering
// ---------------------------------------------------------------------------
function renderImageLayer(
  ctx: CanvasRenderingContext2D,
  layer: LayerModel,
  width: number,
  height: number,
): void {
  if (!layer.imageData) return;

  // imageData is a data URL or base64 string. We create an Image to draw it.
  // Since Canvas 2D drawImage with an HTMLImageElement requires the image to
  // be loaded, and this is a synchronous render call, we attempt to use a
  // cached image if available. For the initial render the image may not be
  // loaded yet – in that case we store the promise and the next render pass
  // will pick it up via the renderVersion cache mechanism.
  const img = getOrLoadImage(layer.imageData);
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, 0, 0, width, height);
  }
}

// ---------------------------------------------------------------------------
// Simple image loading cache (keyed by data URL / src)
// ---------------------------------------------------------------------------
const imageCache = new Map<string, HTMLImageElement>();

function getOrLoadImage(src: string): HTMLImageElement | null {
  const existing = imageCache.get(src);
  if (existing) return existing;

  try {
    const img = new Image();
    img.src = src;
    imageCache.set(src, img);
    return img;
  } catch {
    return null;
  }
}
