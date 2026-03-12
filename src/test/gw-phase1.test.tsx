import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import {
  createDefaultLayer,
  getEffectiveVisibility,
  getEffectiveLock,
  getEffectiveSuperLock,
  getEffectiveOpacity,
  cloneLayer,
  getUniqueLayerName,
  DRAG_MODES,
} from '../types/index';
import type { LayerModel, DragMode } from '../types/index';
import { useDocumentStore } from '../stores/documentStore';

// ---------------------------------------------------------------------------
// getEffectiveVisibility
// ---------------------------------------------------------------------------
describe('getEffectiveVisibility', () => {
  it('returns true for a visible root layer', () => {
    const layer = createDefaultLayer({ id: 'a', visible: true });
    expect(getEffectiveVisibility(layer, [layer])).toBe(true);
  });

  it('returns false when the layer itself is hidden', () => {
    const layer = createDefaultLayer({ id: 'a', visible: false });
    expect(getEffectiveVisibility(layer, [layer])).toBe(false);
  });

  it('walks parent chain - hidden parent hides child', () => {
    const parent = createDefaultLayer({ id: 'p', visible: false, type: 'group' });
    const child = createDefaultLayer({ id: 'c', visible: true, parentGroupId: 'p' });
    expect(getEffectiveVisibility(child, [parent, child])).toBe(false);
  });

  it('walks parent chain - all visible = visible', () => {
    const grandparent = createDefaultLayer({ id: 'gp', visible: true, type: 'group' });
    const parent = createDefaultLayer({ id: 'p', visible: true, parentGroupId: 'gp', type: 'group' });
    const child = createDefaultLayer({ id: 'c', visible: true, parentGroupId: 'p' });
    expect(getEffectiveVisibility(child, [grandparent, parent, child])).toBe(true);
  });

  it('walks parent chain - hidden grandparent hides child', () => {
    const grandparent = createDefaultLayer({ id: 'gp', visible: false, type: 'group' });
    const parent = createDefaultLayer({ id: 'p', visible: true, parentGroupId: 'gp', type: 'group' });
    const child = createDefaultLayer({ id: 'c', visible: true, parentGroupId: 'p' });
    expect(getEffectiveVisibility(child, [grandparent, parent, child])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getEffectiveLock
// ---------------------------------------------------------------------------
describe('getEffectiveLock', () => {
  it('returns false for an unlocked root layer', () => {
    const layer = createDefaultLayer({ id: 'a', locked: false });
    expect(getEffectiveLock(layer, [layer])).toBe(false);
  });

  it('returns true when the layer itself is locked', () => {
    const layer = createDefaultLayer({ id: 'a', locked: true });
    expect(getEffectiveLock(layer, [layer])).toBe(true);
  });

  it('detects locked ancestor', () => {
    const parent = createDefaultLayer({ id: 'p', locked: true, type: 'group' });
    const child = createDefaultLayer({ id: 'c', locked: false, parentGroupId: 'p' });
    expect(getEffectiveLock(child, [parent, child])).toBe(true);
  });

  it('returns false when no ancestor is locked', () => {
    const parent = createDefaultLayer({ id: 'p', locked: false, type: 'group' });
    const child = createDefaultLayer({ id: 'c', locked: false, parentGroupId: 'p' });
    expect(getEffectiveLock(child, [parent, child])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getEffectiveSuperLock
// ---------------------------------------------------------------------------
describe('getEffectiveSuperLock', () => {
  it('detects superLocked ancestor', () => {
    const parent = createDefaultLayer({ id: 'p', superLocked: true, type: 'group' });
    const child = createDefaultLayer({ id: 'c', superLocked: false, parentGroupId: 'p' });
    expect(getEffectiveSuperLock(child, [parent, child])).toBe(true);
  });

  it('returns false when no ancestor is superLocked', () => {
    const parent = createDefaultLayer({ id: 'p', superLocked: false, type: 'group' });
    const child = createDefaultLayer({ id: 'c', superLocked: false, parentGroupId: 'p' });
    expect(getEffectiveSuperLock(child, [parent, child])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getEffectiveOpacity
// ---------------------------------------------------------------------------
describe('getEffectiveOpacity', () => {
  it('returns own opacity for a root layer', () => {
    const layer = createDefaultLayer({ id: 'a', opacity: 0.8 });
    expect(getEffectiveOpacity(layer, [layer])).toBeCloseTo(0.8);
  });

  it('multiplies opacity down the chain', () => {
    const parent = createDefaultLayer({ id: 'p', opacity: 0.5, type: 'group' });
    const child = createDefaultLayer({ id: 'c', opacity: 0.5, parentGroupId: 'p' });
    expect(getEffectiveOpacity(child, [parent, child])).toBeCloseTo(0.25);
  });

  it('multiplies through three levels', () => {
    const gp = createDefaultLayer({ id: 'gp', opacity: 0.5, type: 'group' });
    const p = createDefaultLayer({ id: 'p', opacity: 0.4, parentGroupId: 'gp', type: 'group' });
    const c = createDefaultLayer({ id: 'c', opacity: 0.5, parentGroupId: 'p' });
    expect(getEffectiveOpacity(c, [gp, p, c])).toBeCloseTo(0.1);
  });
});

// ---------------------------------------------------------------------------
// cloneLayer
// ---------------------------------------------------------------------------
describe('cloneLayer', () => {
  it('produces an independent deep copy with a new id', () => {
    const original = createDefaultLayer({ id: 'orig', name: 'Original', childIds: ['x', 'y'] });
    const copy = cloneLayer(original);

    // Different id
    expect(copy.id).not.toBe(original.id);
    // Same data
    expect(copy.name).toBe('Original');
    expect(copy.childIds).toEqual(['x', 'y']);

    // Deep independence: mutating clone does not affect original
    copy.childIds.push('z');
    expect(original.childIds).toEqual(['x', 'y']);
    copy.effects.brightness = 99;
    expect(original.effects.brightness).toBe(0);
  });

  it('deep-copies textProperties independently', () => {
    const original = createDefaultLayer({
      id: 'orig',
      type: 'text',
      textProperties: {
        text: 'hello',
        fontFamily: 'Arial',
        fontSize: 24,
        fontWeight: 400,
        fontStyle: 'normal',
        color: '#fff',
        strokeColor: '#000',
        strokeWidth: 0,
        letterSpacing: 0,
        lineHeight: 1.2,
        alignment: 'left',
        underline: false,
        strikethrough: false,
        hasBackground: false,
        backgroundColor: '#000',
        backgroundOpacity: 0.5,
        backgroundPadding: 4,
        backgroundCornerRadius: 0,
        widthSqueeze: 1,
        heightSqueeze: 1,
        transform: 'none',
        fill: {
          type: 'solid',
          solidColor: '#fff',
          gradientStops: [{ color: '#fff', position: 0 }, { color: '#000', position: 1 }],
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
        runs: [{ startIndex: 0, length: 5 }],
      },
    });

    const copy = cloneLayer(original);
    copy.textProperties!.text = 'changed';
    copy.textProperties!.runs[0].length = 99;
    copy.textProperties!.fill.gradientStops[0].color = '#ff0000';

    expect(original.textProperties!.text).toBe('hello');
    expect(original.textProperties!.runs[0].length).toBe(5);
    expect(original.textProperties!.fill.gradientStops[0].color).toBe('#fff');
  });
});

// ---------------------------------------------------------------------------
// getUniqueLayerName
// ---------------------------------------------------------------------------
describe('getUniqueLayerName', () => {
  it('generates sequential names starting at 01', () => {
    const layers: LayerModel[] = [];
    expect(getUniqueLayerName('Text', layers)).toBe('Text 01');
  });

  it('skips existing names', () => {
    const layers = [
      createDefaultLayer({ name: 'Text 01' }),
      createDefaultLayer({ name: 'Text 02' }),
    ];
    expect(getUniqueLayerName('Text', layers)).toBe('Text 03');
  });

  it('fills gaps', () => {
    const layers = [
      createDefaultLayer({ name: 'Shape 01' }),
      createDefaultLayer({ name: 'Shape 03' }),
    ];
    expect(getUniqueLayerName('Shape', layers)).toBe('Shape 02');
  });
});

// ---------------------------------------------------------------------------
// DragMode enum
// ---------------------------------------------------------------------------
describe('DragMode enum', () => {
  it('has all 16 values', () => {
    const expected: DragMode[] = [
      'none',
      'move',
      'resize',
      'rotate',
      'crop',
      'fillMove',
      'fillResize',
      'fillRotate',
      'erase',
      'blurBrush',
      'multiResize',
      'multiRotate',
      'marqueeSelect',
      'drawShape',
      'drawText',
      'anchorMove',
    ];
    expect(DRAG_MODES).toEqual(expected);
    expect(DRAG_MODES).toHaveLength(16);
  });
});

// ---------------------------------------------------------------------------
// Enhanced document store
// ---------------------------------------------------------------------------
describe('Enhanced document store', () => {
  beforeEach(() => {
    // Reset store between tests
    act(() => {
      useDocumentStore.setState({
        project: {
          projectId: 'test',
          version: '1.0.0',
          canvasWidth: 1920,
          canvasHeight: 1080,
          backgroundColor: '#000000',
          layers: [],
          videoPaths: [],
          timestamps: {},
          metadata: {
            name: 'Test',
            author: '',
            createdAt: '',
            modifiedAt: '',
            description: '',
          },
        },
        selectedLayerIds: [],
        undoStack: [],
        redoStack: [],
        isDirty: false,
        currentProjectPath: null,
        windowTitle: 'Thamnel',
        suppressRender: false,
      });
    });
  });

  it('has isDirty flag defaulting to false', () => {
    expect(useDocumentStore.getState().isDirty).toBe(false);
  });

  it('markDirty sets isDirty to true', () => {
    act(() => useDocumentStore.getState().markDirty());
    expect(useDocumentStore.getState().isDirty).toBe(true);
  });

  it('markClean sets isDirty to false', () => {
    act(() => useDocumentStore.getState().markDirty());
    act(() => useDocumentStore.getState().markClean());
    expect(useDocumentStore.getState().isDirty).toBe(false);
  });

  it('windowTitle defaults to "Thamnel"', () => {
    expect(useDocumentStore.getState().windowTitle).toBe('Thamnel');
  });

  it('setWindowTitle updates the title', () => {
    act(() => useDocumentStore.getState().setWindowTitle('My Project'));
    expect(useDocumentStore.getState().windowTitle).toBe('My Project');
  });

  it('suppressRender defaults to false', () => {
    expect(useDocumentStore.getState().suppressRender).toBe(false);
  });

  it('setSuppressRender toggles the flag', () => {
    act(() => useDocumentStore.getState().setSuppressRender(true));
    expect(useDocumentStore.getState().suppressRender).toBe(true);
  });

  it('hasSelectedLayer returns false when nothing selected', () => {
    expect(useDocumentStore.getState().hasSelectedLayer()).toBe(false);
  });

  it('hasSelectedLayer returns true when a layer is selected', () => {
    const layer = createDefaultLayer({ id: 'sel1' });
    act(() => {
      useDocumentStore.getState().addLayer(layer);
      useDocumentStore.getState().selectLayer('sel1');
    });
    expect(useDocumentStore.getState().hasSelectedLayer()).toBe(true);
  });

  it('isTextSelected returns true when a text layer is selected', () => {
    const textLayer = createDefaultLayer({ id: 'txt1', type: 'text' });
    act(() => {
      useDocumentStore.getState().addLayer(textLayer);
      useDocumentStore.getState().selectLayer('txt1');
    });
    expect(useDocumentStore.getState().isTextSelected()).toBe(true);
    expect(useDocumentStore.getState().isImageSelected()).toBe(false);
    expect(useDocumentStore.getState().isShapeSelected()).toBe(false);
  });

  it('isImageSelected returns true when an image layer is selected', () => {
    const imgLayer = createDefaultLayer({ id: 'img1', type: 'image' });
    act(() => {
      useDocumentStore.getState().addLayer(imgLayer);
      useDocumentStore.getState().selectLayer('img1');
    });
    expect(useDocumentStore.getState().isImageSelected()).toBe(true);
  });

  it('isShapeSelected returns true when a shape layer is selected', () => {
    const shapeLayer = createDefaultLayer({ id: 'shp1', type: 'shape' });
    act(() => {
      useDocumentStore.getState().addLayer(shapeLayer);
      useDocumentStore.getState().selectLayer('shp1');
    });
    expect(useDocumentStore.getState().isShapeSelected()).toBe(true);
  });

  it('currentProjectPath defaults to null', () => {
    expect(useDocumentStore.getState().currentProjectPath).toBeNull();
  });

  it('setCurrentProjectPath stores the path', () => {
    act(() => useDocumentStore.getState().setCurrentProjectPath('/home/user/project.tgp'));
    expect(useDocumentStore.getState().currentProjectPath).toBe('/home/user/project.tgp');
  });
});

// ---------------------------------------------------------------------------
// New LayerModel default properties
// ---------------------------------------------------------------------------
describe('LayerModel new default properties', () => {
  it('childIds defaults to empty array', () => {
    const layer = createDefaultLayer();
    expect(layer.childIds).toEqual([]);
  });

  it('blurRadius defaults to 15', () => {
    const layer = createDefaultLayer();
    expect(layer.blurRadius).toBe(15);
  });

  it('isBackground defaults to false', () => {
    const layer = createDefaultLayer();
    expect(layer.isBackground).toBe(false);
  });

  it('isLiveDateTime defaults to false', () => {
    const layer = createDefaultLayer();
    expect(layer.isLiveDateTime).toBe(false);
  });

  it('renderVersion defaults to 0', () => {
    const layer = createDefaultLayer();
    expect(layer.renderVersion).toBe(0);
  });
});
