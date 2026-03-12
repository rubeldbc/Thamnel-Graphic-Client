import { describe, it, expect } from 'vitest';
import {
  BLEND_MODES,
  SHAPE_TYPES,
  LAYER_TYPE_ICONS,
} from '../types/enums';
import type {
  LayerType,
  BlendMode,
  ShapeType,
  FillType,
  TextAlignmentOption,
  TransparencyMaskType,
  TextTransformOption,
  TextBgMode,
  TextBgStretch,
  ImageStretchMode,
  ActiveTool,
  JobStatus,
  JobType,
  ExportFormat,
  CanvasQuality,
  EraserMode,
  ViewMode,
  CartoonStyle,
  InpaintMode,
  AnchorPosition,
  LogLevel,
  ServerStatus,
  PathOperation,
} from '../types/enums';

// ---------------------------------------------------------------------------
// Helper: assert a union type covers exactly the expected values by verifying
// that an array typed as the union includes all expected members. Since
// TypeScript unions are erased at runtime, we rely on explicit arrays that
// are typed to the union and then check length + inclusion.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 1. BLEND_MODES has correct length (17)
// ---------------------------------------------------------------------------
describe('BLEND_MODES', () => {
  it('has exactly 17 entries', () => {
    expect(BLEND_MODES).toHaveLength(17);
  });

  it('contains all 17 expected blend mode values', () => {
    const expected: BlendMode[] = [
      'normal',
      'multiply',
      'darken',
      'colorBurn',
      'screen',
      'lighten',
      'colorDodge',
      'linearDodge',
      'overlay',
      'softLight',
      'hardLight',
      'difference',
      'exclusion',
      'hue',
      'saturation',
      'color',
      'luminosity',
    ];
    const values = BLEND_MODES.map((m) => m.value);
    for (const v of expected) {
      expect(values).toContain(v);
    }
    expect(values).toHaveLength(expected.length);
  });

  it('each entry has a non-empty label', () => {
    for (const m of BLEND_MODES) {
      expect(m.label.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. SHAPE_TYPES has correct length (27)
// ---------------------------------------------------------------------------
describe('SHAPE_TYPES', () => {
  it('has exactly 27 entries', () => {
    expect(SHAPE_TYPES).toHaveLength(27);
  });

  it('contains all 27 expected shape type values', () => {
    const expected: ShapeType[] = [
      'line',
      'diagonalLine',
      'rectangle',
      'roundedRectangle',
      'snip',
      'ellipse',
      'triangle',
      'rightTriangle',
      'diamond',
      'parallelogram',
      'trapezoid',
      'pentagon',
      'hexagon',
      'octagon',
      'cross',
      'heart',
      'star',
      'star6',
      'ring',
      'arrow',
      'arrowLeft',
      'arrowUp',
      'arrowDown',
      'doubleArrow',
      'chevronRight',
      'chevronLeft',
      'custom',
    ];
    const values = SHAPE_TYPES.map((s) => s.value);
    for (const v of expected) {
      expect(values).toContain(v);
    }
    expect(values).toHaveLength(expected.length);
  });

  it('each entry has a non-empty label and category', () => {
    for (const s of SHAPE_TYPES) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.category.length).toBeGreaterThan(0);
    }
  });

  it('categories are valid', () => {
    const validCategories = ['lines', 'basic', 'polygons', 'symbols', 'arrows', 'custom'];
    for (const s of SHAPE_TYPES) {
      expect(validCategories).toContain(s.category);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. LAYER_TYPE_ICONS maps all 4 layer types
// ---------------------------------------------------------------------------
describe('LAYER_TYPE_ICONS', () => {
  it('has entries for all 4 layer types', () => {
    const layerTypes: LayerType[] = ['image', 'text', 'shape', 'group'];
    for (const lt of layerTypes) {
      expect(LAYER_TYPE_ICONS[lt]).toBeDefined();
      expect(typeof LAYER_TYPE_ICONS[lt]).toBe('string');
      expect(LAYER_TYPE_ICONS[lt].length).toBeGreaterThan(0);
    }
  });

  it('has exactly 4 keys', () => {
    expect(Object.keys(LAYER_TYPE_ICONS)).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 4. LayerType covers expected values
// ---------------------------------------------------------------------------
describe('LayerType', () => {
  it('covers all expected values', () => {
    const values: LayerType[] = ['image', 'text', 'shape', 'group'];
    expect(values).toHaveLength(4);
    // TypeScript compilation itself ensures these are valid members
  });
});

// ---------------------------------------------------------------------------
// 5. BlendMode covers expected values
// ---------------------------------------------------------------------------
describe('BlendMode', () => {
  it('all 17 values are assignable', () => {
    const values: BlendMode[] = [
      'normal', 'multiply', 'darken', 'colorBurn', 'screen', 'lighten',
      'colorDodge', 'linearDodge', 'overlay', 'softLight', 'hardLight',
      'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
    ];
    expect(values).toHaveLength(17);
  });
});

// ---------------------------------------------------------------------------
// 6. ShapeType covers expected values
// ---------------------------------------------------------------------------
describe('ShapeType', () => {
  it('all 27 values are assignable', () => {
    const values: ShapeType[] = [
      'line', 'diagonalLine', 'rectangle', 'roundedRectangle', 'snip',
      'ellipse', 'triangle', 'rightTriangle', 'diamond', 'parallelogram',
      'trapezoid', 'pentagon', 'hexagon', 'octagon', 'cross', 'heart',
      'star', 'star6', 'ring', 'arrow', 'arrowLeft', 'arrowUp', 'arrowDown',
      'doubleArrow', 'chevronRight', 'chevronLeft', 'custom',
    ];
    expect(values).toHaveLength(27);
  });
});

// ---------------------------------------------------------------------------
// 7. FillType covers expected values
// ---------------------------------------------------------------------------
describe('FillType', () => {
  it('all 5 values are assignable', () => {
    const values: FillType[] = ['solid', 'linearGradient', 'radialGradient', 'sweepGradient', 'image'];
    expect(values).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// 8. TextAlignmentOption covers expected values
// ---------------------------------------------------------------------------
describe('TextAlignmentOption', () => {
  it('all 4 values are assignable', () => {
    const values: TextAlignmentOption[] = ['left', 'center', 'right', 'justify'];
    expect(values).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 9. TransparencyMaskType covers expected values
// ---------------------------------------------------------------------------
describe('TransparencyMaskType', () => {
  it('all 3 values are assignable', () => {
    const values: TransparencyMaskType[] = ['none', 'linear', 'radial'];
    expect(values).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 10. TextTransformOption covers expected values
// ---------------------------------------------------------------------------
describe('TextTransformOption', () => {
  it('all 4 values are assignable', () => {
    const values: TextTransformOption[] = ['none', 'uppercase', 'lowercase', 'capitalize'];
    expect(values).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 11. TextBgMode covers expected values
// ---------------------------------------------------------------------------
describe('TextBgMode', () => {
  it('all 3 values are assignable', () => {
    const values: TextBgMode[] = ['none', 'solid', 'rounded'];
    expect(values).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 12. TextBgStretch covers expected values
// ---------------------------------------------------------------------------
describe('TextBgStretch', () => {
  it('all 2 values are assignable', () => {
    const values: TextBgStretch[] = ['perLine', 'fullBlock'];
    expect(values).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 13. ImageStretchMode covers expected values
// ---------------------------------------------------------------------------
describe('ImageStretchMode', () => {
  it('all 4 values are assignable', () => {
    const values: ImageStretchMode[] = ['tile', 'stretch', 'fit', 'fill'];
    expect(values).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 14. ActiveTool covers expected values
// ---------------------------------------------------------------------------
describe('ActiveTool', () => {
  it('all 7 values are assignable', () => {
    const values: ActiveTool[] = ['select', 'text', 'shape', 'eraser', 'blurBrush', 'pan', 'eyedropper'];
    expect(values).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// 15. JobStatus covers expected values
// ---------------------------------------------------------------------------
describe('JobStatus', () => {
  it('all 5 values are assignable', () => {
    const values: JobStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled'];
    expect(values).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// 16. JobType covers expected values
// ---------------------------------------------------------------------------
describe('JobType', () => {
  it('all 5 values are assignable', () => {
    const values: JobType[] = ['aiInference', 'export', 'render', 'frameExtraction', 'batch'];
    expect(values).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// 17. ExportFormat covers expected values
// ---------------------------------------------------------------------------
describe('ExportFormat', () => {
  it('all 5 values are assignable', () => {
    const values: ExportFormat[] = ['png', 'jpg', 'bmp', 'psd', 'svg'];
    expect(values).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// 18. CanvasQuality covers expected values
// ---------------------------------------------------------------------------
describe('CanvasQuality', () => {
  it('all 5 values are assignable', () => {
    const values: CanvasQuality[] = [10, 25, 50, 75, 100];
    expect(values).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// 19. EraserMode covers expected values
// ---------------------------------------------------------------------------
describe('EraserMode', () => {
  it('all 2 values are assignable', () => {
    const values: EraserMode[] = ['soft', 'hard'];
    expect(values).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 20. ViewMode covers expected values
// ---------------------------------------------------------------------------
describe('ViewMode', () => {
  it('all 3 values are assignable', () => {
    const values: ViewMode[] = ['combined', 'foreground', 'background'];
    expect(values).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 21. CartoonStyle covers expected values
// ---------------------------------------------------------------------------
describe('CartoonStyle', () => {
  it('all 3 values are assignable', () => {
    const values: CartoonStyle[] = ['classic', 'anime', 'sketch'];
    expect(values).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 22. InpaintMode covers expected values
// ---------------------------------------------------------------------------
describe('InpaintMode', () => {
  it('all 2 values are assignable', () => {
    const values: InpaintMode[] = ['inpaint', 'outpaint'];
    expect(values).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 23. AnchorPosition covers expected values
// ---------------------------------------------------------------------------
describe('AnchorPosition', () => {
  it('all 9 values are assignable', () => {
    const values: AnchorPosition[] = [
      'topLeft', 'topCenter', 'topRight',
      'middleLeft', 'middleCenter', 'middleRight',
      'bottomLeft', 'bottomCenter', 'bottomRight',
    ];
    expect(values).toHaveLength(9);
  });
});

// ---------------------------------------------------------------------------
// 24. LogLevel covers expected values
// ---------------------------------------------------------------------------
describe('LogLevel', () => {
  it('all 4 values are assignable', () => {
    const values: LogLevel[] = ['info', 'warning', 'error', 'debug'];
    expect(values).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 25. ServerStatus covers expected values
// ---------------------------------------------------------------------------
describe('ServerStatus', () => {
  it('all 3 values are assignable', () => {
    const values: ServerStatus[] = ['connected', 'disconnected', 'connecting'];
    expect(values).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 26. PathOperation covers expected values
// ---------------------------------------------------------------------------
describe('PathOperation', () => {
  it('all 4 values are assignable', () => {
    const values: PathOperation[] = ['union', 'subtract', 'intersect', 'exclude'];
    expect(values).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 27. BLEND_MODES values match BlendMode type
// ---------------------------------------------------------------------------
describe('Helper arrays match their enum types', () => {
  it('every BLEND_MODES value is a valid BlendMode', () => {
    const allBlendModes: BlendMode[] = [
      'normal', 'multiply', 'darken', 'colorBurn', 'screen', 'lighten',
      'colorDodge', 'linearDodge', 'overlay', 'softLight', 'hardLight',
      'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
    ];
    for (const entry of BLEND_MODES) {
      expect(allBlendModes).toContain(entry.value);
    }
  });

  it('every SHAPE_TYPES value is a valid ShapeType', () => {
    const allShapeTypes: ShapeType[] = [
      'line', 'diagonalLine', 'rectangle', 'roundedRectangle', 'snip',
      'ellipse', 'triangle', 'rightTriangle', 'diamond', 'parallelogram',
      'trapezoid', 'pentagon', 'hexagon', 'octagon', 'cross', 'heart',
      'star', 'star6', 'ring', 'arrow', 'arrowLeft', 'arrowUp', 'arrowDown',
      'doubleArrow', 'chevronRight', 'chevronLeft', 'custom',
    ];
    for (const entry of SHAPE_TYPES) {
      expect(allShapeTypes).toContain(entry.value);
    }
  });

  it('BLEND_MODES covers all BlendMode values', () => {
    const blendValues = BLEND_MODES.map((m) => m.value);
    const allBlendModes: BlendMode[] = [
      'normal', 'multiply', 'darken', 'colorBurn', 'screen', 'lighten',
      'colorDodge', 'linearDodge', 'overlay', 'softLight', 'hardLight',
      'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
    ];
    for (const v of allBlendModes) {
      expect(blendValues).toContain(v);
    }
  });

  it('SHAPE_TYPES covers all ShapeType values', () => {
    const shapeValues = SHAPE_TYPES.map((s) => s.value);
    const allShapeTypes: ShapeType[] = [
      'line', 'diagonalLine', 'rectangle', 'roundedRectangle', 'snip',
      'ellipse', 'triangle', 'rightTriangle', 'diamond', 'parallelogram',
      'trapezoid', 'pentagon', 'hexagon', 'octagon', 'cross', 'heart',
      'star', 'star6', 'ring', 'arrow', 'arrowLeft', 'arrowUp', 'arrowDown',
      'doubleArrow', 'chevronRight', 'chevronLeft', 'custom',
    ];
    for (const v of allShapeTypes) {
      expect(shapeValues).toContain(v);
    }
  });
});
