import type { TextAlignmentOption, TextTransformOption } from './enums';
import type { FillDefinition } from './FillDefinition';

export interface StyledRun {
  startIndex: number;
  length: number;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  color?: string;
  underline?: boolean;
  strikethrough?: boolean;
}

export interface TextProperties {
  text: string;
  fontFamily: string;
  fontSize: number;
  /** 100-900 */
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  color: string;
  strokeColor: string;
  strokeWidth: number;
  letterSpacing: number;
  lineHeight: number;
  alignment: TextAlignmentOption;
  underline: boolean;
  strikethrough: boolean;
  hasBackground: boolean;
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundPadding: number;
  backgroundCornerRadius: number;
  widthSqueeze: number;
  heightSqueeze: number;
  transform: TextTransformOption;
  fill: FillDefinition;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  shadowColor: string;
  runs: StyledRun[];
}

export function createDefaultTextProperties(): TextProperties {
  return {
    text: '',
    fontFamily: 'Arial',
    fontSize: 24,
    fontWeight: 400,
    fontStyle: 'normal',
    color: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 0,
    letterSpacing: 0,
    lineHeight: 1.2,
    alignment: 'left',
    underline: false,
    strikethrough: false,
    hasBackground: false,
    backgroundColor: '#000000',
    backgroundOpacity: 0.5,
    backgroundPadding: 4,
    backgroundCornerRadius: 0,
    widthSqueeze: 1,
    heightSqueeze: 1,
    transform: 'none',
    fill: {
      type: 'solid',
      solidColor: '#ffffff',
      gradientStops: [
        { color: '#ffffff', position: 0 },
        { color: '#000000', position: 1 },
      ],
      gradientAngle: 0,
      gradientCenterX: 0.5,
      gradientCenterY: 0.5,
      gradientRadius: 0.5,
      imagePath: null,
      imageStretch: 'fill',
      globalAlpha: 1,
    },
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    shadowColor: 'rgba(0,0,0,0.5)',
    runs: [],
  };
}
