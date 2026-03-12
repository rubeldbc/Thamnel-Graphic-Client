import type { FillType, ImageStretchMode } from './enums';

export interface GradientStop {
  color: string;
  /** Position along the gradient, 0 to 1. */
  position: number;
}

export interface FillDefinition {
  type: FillType;
  solidColor: string;
  gradientStops: GradientStop[];
  gradientAngle: number;
  gradientCenterX: number;
  gradientCenterY: number;
  gradientRadius: number;
  imagePath: string | null;
  imageStretch: ImageStretchMode;
  globalAlpha: number;
}

export function createDefaultFillDefinition(): FillDefinition {
  return {
    type: 'solid',
    solidColor: '#000000',
    gradientStops: [
      { color: '#000000', position: 0 },
      { color: '#ffffff', position: 1 },
    ],
    gradientAngle: 0,
    gradientCenterX: 0.5,
    gradientCenterY: 0.5,
    gradientRadius: 0.5,
    imagePath: null,
    imageStretch: 'fill',
    globalAlpha: 1,
  };
}
