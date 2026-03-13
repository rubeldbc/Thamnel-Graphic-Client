import type { BlendMode } from './enums';

export interface LayerEffect {
  // Brightness
  brightness: number;
  brightnessEnabled: boolean;

  // Contrast
  contrast: number;
  contrastEnabled: boolean;

  // Saturation
  saturation: number;
  saturationEnabled: boolean;

  // Hue
  hue: number;
  hueEnabled: boolean;

  // Simple toggles
  grayscale: boolean;
  sepia: boolean;
  invert: boolean;

  // Sharpen
  sharpen: number;
  sharpenEnabled: boolean;

  // Vignette
  vignette: number;
  vignetteEnabled: boolean;

  // Pixelate
  pixelate: number;
  pixelateEnabled: boolean;

  // Color tint
  colorTintColor: string;
  colorTintIntensity: number;
  colorTintEnabled: boolean;

  // Noise
  noise: number;
  noiseEnabled: boolean;

  // Posterize
  posterize: number;
  posterizeEnabled: boolean;

  // Gaussian blur
  gaussianBlur: number;
  gaussianBlurEnabled: boolean;

  // Drop shadow
  dropShadowColor: string;
  dropShadowOffsetX: number;
  dropShadowOffsetY: number;
  dropShadowBlur: number;
  dropShadowOpacity: number;
  dropShadowEnabled: boolean;

  // Outer glow
  outerGlowColor: string;
  outerGlowRadius: number;
  outerGlowIntensity: number;
  outerGlowEnabled: boolean;

  // Cut stroke
  cutStrokeColor: string;
  cutStrokeWidth: number;
  cutStrokeEnabled: boolean;

  // Rim light
  rimLightColor: string;
  rimLightAngle: number;
  rimLightIntensity: number;
  rimLightWidth: number;
  rimLightEnabled: boolean;

  // Split toning
  splitToningHighlightColor: string;
  splitToningShadowColor: string;
  splitToningBalance: number;
  splitToningEnabled: boolean;

  // Smooth stroke
  smoothStrokeWidth: number;
  smoothStrokeColor: string;
  smoothStrokeOpacity: number;
  smoothStrokeEnabled: boolean;

  // Blend overlay
  blendOverlayImage: string | null;
  blendOverlayOpacity: number;
  blendOverlayMode: BlendMode;
  blendOverlayEnabled: boolean;
}

export interface ColorAdjustments {
  temperature: number;
  tint: number;
  exposure: number;
  highlights: number;
  shadows: number;
}

export function createDefaultLayerEffect(): LayerEffect {
  return {
    // Slider effects: enabled by default at neutral (no-op) values
    brightness: 0,
    brightnessEnabled: true,
    contrast: 0,
    contrastEnabled: true,
    saturation: 0,
    saturationEnabled: true,
    hue: 0,
    hueEnabled: true,
    grayscale: false,
    sepia: false,
    invert: false,
    sharpen: 0,
    sharpenEnabled: true,
    vignette: 0,
    vignetteEnabled: true,
    pixelate: 0,
    pixelateEnabled: true,
    colorTintColor: '#ff8800',
    colorTintIntensity: 0,
    colorTintEnabled: true,
    noise: 0,
    noiseEnabled: true,
    posterize: 0,
    posterizeEnabled: true,
    gaussianBlur: 0,
    gaussianBlurEnabled: true,
    // Non-slider effects: disabled by default
    dropShadowColor: '#000000',
    dropShadowOffsetX: 0,
    dropShadowOffsetY: 0,
    dropShadowBlur: 0,
    dropShadowOpacity: 0,
    dropShadowEnabled: false,
    outerGlowColor: '#ffffff',
    outerGlowRadius: 0,
    outerGlowIntensity: 0,
    outerGlowEnabled: false,
    cutStrokeColor: '#000000',
    cutStrokeWidth: 0,
    cutStrokeEnabled: false,
    rimLightColor: '#ffffff',
    rimLightAngle: 0,
    rimLightIntensity: 0,
    rimLightWidth: 0,
    rimLightEnabled: false,
    splitToningHighlightColor: '#ffcc00',
    splitToningShadowColor: '#0044ff',
    splitToningBalance: 0,
    splitToningEnabled: false,
    smoothStrokeWidth: 0,
    smoothStrokeColor: '#000000',
    smoothStrokeOpacity: 0,
    smoothStrokeEnabled: false,
    blendOverlayImage: null,
    blendOverlayOpacity: 0,
    blendOverlayMode: 'normal',
    blendOverlayEnabled: false,
  };
}

export function createDefaultColorAdjustments(): ColorAdjustments {
  return {
    temperature: 0,
    tint: 0,
    exposure: 0,
    highlights: 0,
    shadows: 0,
  };
}
