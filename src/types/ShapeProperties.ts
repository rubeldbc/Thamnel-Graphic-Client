import type { ShapeType, FillType, TransparencyMaskType } from './enums';
import type { FillDefinition } from './FillDefinition';

export interface ShapeProperties {
  shapeType: ShapeType;
  fillColor: string;
  fillType: FillType;
  fill: FillDefinition | null;
  borderColor: string;
  borderWidth: number;
  cornerRadius: number;
  imageFillPath: string | null;
  imageFillStretch: string;
  maskMode: boolean;
  pathData: string | null;
  points: Array<{ x: number; y: number }>;
  isClosed: boolean;
  opacity: number;
  isImageFilled: boolean;
  imageFillData: string | null;
  imageFillOffsetX: number;
  imageFillOffsetY: number;
  imageFillScaleX: number;
  imageFillScaleY: number;
  imageFillRotation: number;
  imageFillCropTop: number;
  imageFillCropBottom: number;
  imageFillCropLeft: number;
  imageFillCropRight: number;
  maskType: TransparencyMaskType;
  maskAngle: number;
  maskTop: number;
  maskBottom: number;
  maskLeft: number;
  maskRight: number;
  maskCenterX: number;
  maskCenterY: number;
  /** Number of sides for polygon shapes (3 = triangle, 4 = rectangle, 5 = pentagon, etc.). */
  polygonSides: number;
  /** Star inner radius ratio (0–1). innerR = outerR * starInnerRatio. */
  starInnerRatio: number;
}

export function createDefaultShapeProperties(): ShapeProperties {
  return {
    shapeType: 'rectangle',
    fillColor: '#3b82f6',
    fillType: 'solid',
    fill: null,
    borderColor: '#000000',
    borderWidth: 0,
    cornerRadius: 0,
    imageFillPath: null,
    imageFillStretch: 'fill',
    maskMode: false,
    pathData: null,
    points: [],
    isClosed: true,
    opacity: 1,
    isImageFilled: false,
    imageFillData: null,
    imageFillOffsetX: 0,
    imageFillOffsetY: 0,
    imageFillScaleX: 1,
    imageFillScaleY: 1,
    imageFillRotation: 0,
    imageFillCropTop: 0,
    imageFillCropBottom: 0,
    imageFillCropLeft: 0,
    imageFillCropRight: 0,
    maskType: 'none',
    maskAngle: 0,
    maskTop: 0,
    maskBottom: 0,
    maskLeft: 0,
    maskRight: 0,
    maskCenterX: 0.5,
    maskCenterY: 0.5,
    polygonSides: 4,
    starInnerRatio: 0.5,
  };
}
