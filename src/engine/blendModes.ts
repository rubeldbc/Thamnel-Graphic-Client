import type { BlendMode } from '../types/enums';

/**
 * Maps each of the 17 application BlendMode values to the corresponding
 * CanvasRenderingContext2D `globalCompositeOperation` string.
 */
export const BLEND_MODE_MAP: Record<BlendMode, GlobalCompositeOperation> = {
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

/**
 * Resolves a BlendMode to a canvas composite operation string.
 * Falls back to `'source-over'` for unknown values.
 */
export function getCompositeOperation(mode: BlendMode): GlobalCompositeOperation {
  return BLEND_MODE_MAP[mode] ?? 'source-over';
}
