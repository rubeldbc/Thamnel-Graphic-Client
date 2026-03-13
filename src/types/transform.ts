// Animation-ready transform matching Rust thamnel_core::transform serde output.

import type { Point } from './geometry';

export interface Transform {
  anchor: Point;
  position: Point;
  scale: Point;
  rotation: number;
  skew: Point;
}

export function createDefaultTransform(): Transform {
  return {
    anchor: { x: 0.5, y: 0.5 },
    position: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    skew: { x: 0, y: 0 },
  };
}
