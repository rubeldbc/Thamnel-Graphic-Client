// Barrel export for the canvas rendering engine.

export { BLEND_MODE_MAP, getCompositeOperation } from './blendModes';
export { renderShapePath, fillShape, pointInShapePath, getShapeTightBounds } from './shapeRenderer';
export { renderText } from './textRenderer';
export { applyEffects, applyColorAdjustments } from './effectsEngine';
export {
  renderLayerToCanvas,
  renderLayerCache,
  clearLayerCache,
  invalidateLayer,
} from './layerRenderer';
export { compositeAllLayers } from './compositor';
