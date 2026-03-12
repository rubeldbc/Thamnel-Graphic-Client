import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';
import {
  createDefaultLayer,
  createDefaultProject,
  createDefaultTextProperties,
  createDefaultShapeProperties,
  createDefaultLayerEffect,
  createDefaultColorAdjustments,
  createDefaultFillDefinition,
} from '../types/index';
import { useDocumentStore } from '../stores/documentStore';
import { useUiStore } from '../stores/uiStore';
import { useJobStore } from '../stores/jobStore';
import type { LayerModel } from '../types/index';
import type { Job } from '../stores/jobStore';

// Helper to reset Zustand stores between tests
function resetStores() {
  useDocumentStore.setState({
    project: createDefaultProject(),
    selectedLayerIds: [],
    undoStack: [],
    redoStack: [],
  });
  useUiStore.setState({
    activeTool: 'select',
    zoom: 1,
    gridVisible: false,
    isEditingText: false,
    leftPanelVisible: true,
    rightPanelVisible: true,
    framePanelHeight: 150,
    statusMessage: '',
    activeDialog: null,
  });
  useJobStore.setState({
    jobs: [],
    activeJobId: null,
  });
}

// ---------------------------------------------------------------------------
// 1. Default layer factory creates valid layer
// ---------------------------------------------------------------------------
describe('createDefaultLayer', () => {
  it('creates a layer with all required fields', () => {
    const layer = createDefaultLayer();
    expect(layer.id).toBeTruthy();
    expect(layer.name).toBe('New Layer');
    expect(layer.type).toBe('image');
    expect(layer.opacity).toBe(1);
    expect(layer.visible).toBe(true);
    expect(layer.locked).toBe(false);
    expect(layer.superLocked).toBe(false);
    expect(layer.blendMode).toBe('normal');
    expect(layer.flipHorizontal).toBe(false);
    expect(layer.flipVertical).toBe(false);
    expect(layer.imageData).toBeNull();
    expect(layer.textProperties).toBeNull();
    expect(layer.shapeProperties).toBeNull();
    expect(layer.effects).toBeDefined();
    expect(layer.colorAdjustments).toBeDefined();
    expect(layer.parentGroupId).toBeNull();
    expect(layer.blurMaskData).toBeNull();
    expect(layer.anchorX).toBe(0.5);
    expect(layer.anchorY).toBe(0.5);
    expect(layer.bindingKey).toBe('');
    expect(layer.displayName).toBe('');
    expect(layer.width).toBe(100);
    expect(layer.height).toBe(100);
    expect(layer.rotation).toBe(0);
    expect(layer.cropTop).toBe(0);
    expect(layer.cropBottom).toBe(0);
    expect(layer.cropLeft).toBe(0);
    expect(layer.cropRight).toBe(0);
  });

  it('generates unique IDs for each layer', () => {
    const a = createDefaultLayer();
    const b = createDefaultLayer();
    expect(a.id).not.toBe(b.id);
  });

  it('accepts overrides', () => {
    const layer = createDefaultLayer({ name: 'My Layer', type: 'text', x: 42 });
    expect(layer.name).toBe('My Layer');
    expect(layer.type).toBe('text');
    expect(layer.x).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// 2. Default project factory creates valid project
// ---------------------------------------------------------------------------
describe('createDefaultProject', () => {
  it('creates a project with all required fields', () => {
    const project = createDefaultProject();
    expect(project.projectId).toBeTruthy();
    expect(project.version).toBe('1.0.0');
    expect(project.canvasWidth).toBe(1920);
    expect(project.canvasHeight).toBe(1080);
    expect(project.backgroundColor).toBe('#000000');
    expect(project.layers).toEqual([]);
    expect(project.videoPaths).toEqual([]);
    expect(project.timestamps).toEqual({});
    expect(project.metadata).toBeDefined();
    expect(project.metadata.name).toBe('Untitled Project');
    expect(project.metadata.createdAt).toBeTruthy();
    expect(project.metadata.modifiedAt).toBeTruthy();
  });

  it('accepts overrides', () => {
    const project = createDefaultProject({ canvasWidth: 3840, canvasHeight: 2160 });
    expect(project.canvasWidth).toBe(3840);
    expect(project.canvasHeight).toBe(2160);
  });
});

// ---------------------------------------------------------------------------
// 3. documentStore: add/remove/update layer
// ---------------------------------------------------------------------------
describe('documentStore – layer CRUD', () => {
  beforeEach(resetStores);

  it('adds a layer to the project', () => {
    const layer = createDefaultLayer({ name: 'Layer 1' });
    act(() => useDocumentStore.getState().addLayer(layer));
    const state = useDocumentStore.getState();
    expect(state.project.layers).toHaveLength(1);
    expect(state.project.layers[0].name).toBe('Layer 1');
  });

  it('removes a layer from the project', () => {
    const layer = createDefaultLayer({ id: 'rm-1' });
    act(() => useDocumentStore.getState().addLayer(layer));
    act(() => useDocumentStore.getState().removeLayer('rm-1'));
    expect(useDocumentStore.getState().project.layers).toHaveLength(0);
  });

  it('updates a layer in the project', () => {
    const layer = createDefaultLayer({ id: 'upd-1', name: 'Before' });
    act(() => useDocumentStore.getState().addLayer(layer));
    act(() => useDocumentStore.getState().updateLayer('upd-1', { name: 'After', x: 55 }));
    const updated = useDocumentStore.getState().project.layers[0];
    expect(updated.name).toBe('After');
    expect(updated.x).toBe(55);
  });

  it('moves a layer to a new index', () => {
    const a = createDefaultLayer({ id: 'a', name: 'A' });
    const b = createDefaultLayer({ id: 'b', name: 'B' });
    const c = createDefaultLayer({ id: 'c', name: 'C' });
    act(() => {
      useDocumentStore.getState().addLayer(a);
      useDocumentStore.getState().addLayer(b);
      useDocumentStore.getState().addLayer(c);
    });
    act(() => useDocumentStore.getState().moveLayer('c', 0));
    const ids = useDocumentStore.getState().project.layers.map((l: LayerModel) => l.id);
    expect(ids).toEqual(['c', 'a', 'b']);
  });
});

// ---------------------------------------------------------------------------
// 4. documentStore: select/deselect layers
// ---------------------------------------------------------------------------
describe('documentStore – selection', () => {
  beforeEach(resetStores);

  it('selects a single layer', () => {
    const layer = createDefaultLayer({ id: 'sel-1' });
    act(() => useDocumentStore.getState().addLayer(layer));
    act(() => useDocumentStore.getState().selectLayer('sel-1'));
    expect(useDocumentStore.getState().selectedLayerIds).toEqual(['sel-1']);
  });

  it('toggles selection on and off', () => {
    const layer = createDefaultLayer({ id: 'tog-1' });
    act(() => useDocumentStore.getState().addLayer(layer));
    act(() => useDocumentStore.getState().toggleSelection('tog-1'));
    expect(useDocumentStore.getState().selectedLayerIds).toContain('tog-1');
    act(() => useDocumentStore.getState().toggleSelection('tog-1'));
    expect(useDocumentStore.getState().selectedLayerIds).not.toContain('tog-1');
  });

  it('selectAll selects every layer', () => {
    act(() => {
      useDocumentStore.getState().addLayer(createDefaultLayer({ id: 'x1' }));
      useDocumentStore.getState().addLayer(createDefaultLayer({ id: 'x2' }));
    });
    act(() => useDocumentStore.getState().selectAll());
    expect(useDocumentStore.getState().selectedLayerIds).toEqual(['x1', 'x2']);
  });

  it('deselectAll clears selection', () => {
    act(() => {
      useDocumentStore.getState().addLayer(createDefaultLayer({ id: 'd1' }));
      useDocumentStore.getState().selectLayer('d1');
    });
    act(() => useDocumentStore.getState().deselectAll());
    expect(useDocumentStore.getState().selectedLayerIds).toEqual([]);
  });

  it('removeLayer also removes the layer from selection', () => {
    const layer = createDefaultLayer({ id: 'rsel-1' });
    act(() => {
      useDocumentStore.getState().addLayer(layer);
      useDocumentStore.getState().selectLayer('rsel-1');
    });
    act(() => useDocumentStore.getState().removeLayer('rsel-1'));
    expect(useDocumentStore.getState().selectedLayerIds).not.toContain('rsel-1');
  });
});

// ---------------------------------------------------------------------------
// 5. documentStore: undo/redo
// ---------------------------------------------------------------------------
describe('documentStore – undo/redo', () => {
  beforeEach(resetStores);

  it('pushUndo saves current state and undo restores it', () => {
    // Initial canvas is 1920x1080
    act(() => useDocumentStore.getState().pushUndo());
    act(() => useDocumentStore.getState().setCanvasSize(800, 600));
    expect(useDocumentStore.getState().project.canvasWidth).toBe(800);

    act(() => useDocumentStore.getState().undo());
    expect(useDocumentStore.getState().project.canvasWidth).toBe(1920);
  });

  it('redo restores a previously undone state', () => {
    act(() => useDocumentStore.getState().pushUndo());
    act(() => useDocumentStore.getState().setCanvasSize(800, 600));
    act(() => useDocumentStore.getState().undo());
    expect(useDocumentStore.getState().project.canvasWidth).toBe(1920);

    act(() => useDocumentStore.getState().redo());
    expect(useDocumentStore.getState().project.canvasWidth).toBe(800);
  });

  it('undo on empty stack is a no-op', () => {
    const before = useDocumentStore.getState().project;
    act(() => useDocumentStore.getState().undo());
    expect(useDocumentStore.getState().project).toBe(before);
  });

  it('redo on empty stack is a no-op', () => {
    const before = useDocumentStore.getState().project;
    act(() => useDocumentStore.getState().redo());
    expect(useDocumentStore.getState().project).toBe(before);
  });

  it('pushUndo clears the redo stack', () => {
    act(() => useDocumentStore.getState().pushUndo());
    act(() => useDocumentStore.getState().setCanvasSize(800, 600));
    act(() => useDocumentStore.getState().undo());
    expect(useDocumentStore.getState().redoStack.length).toBeGreaterThan(0);

    act(() => useDocumentStore.getState().pushUndo());
    expect(useDocumentStore.getState().redoStack).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. documentStore: setCanvasSize and setBackgroundColor
// ---------------------------------------------------------------------------
describe('documentStore – canvas helpers', () => {
  beforeEach(resetStores);

  it('setCanvasSize updates width and height', () => {
    act(() => useDocumentStore.getState().setCanvasSize(3840, 2160));
    const p = useDocumentStore.getState().project;
    expect(p.canvasWidth).toBe(3840);
    expect(p.canvasHeight).toBe(2160);
  });

  it('setBackgroundColor updates the color', () => {
    act(() => useDocumentStore.getState().setBackgroundColor('#ff0000'));
    expect(useDocumentStore.getState().project.backgroundColor).toBe('#ff0000');
  });
});

// ---------------------------------------------------------------------------
// 7. uiStore: tool switching
// ---------------------------------------------------------------------------
describe('uiStore – tool switching', () => {
  beforeEach(resetStores);

  it('default tool is select', () => {
    expect(useUiStore.getState().activeTool).toBe('select');
  });

  it('setActiveTool changes the active tool', () => {
    act(() => useUiStore.getState().setActiveTool('text'));
    expect(useUiStore.getState().activeTool).toBe('text');
    act(() => useUiStore.getState().setActiveTool('pan'));
    expect(useUiStore.getState().activeTool).toBe('pan');
  });
});

// ---------------------------------------------------------------------------
// 8. uiStore: zoom
// ---------------------------------------------------------------------------
describe('uiStore – zoom', () => {
  beforeEach(resetStores);

  it('setZoom changes zoom level', () => {
    act(() => useUiStore.getState().setZoom(2));
    expect(useUiStore.getState().zoom).toBe(2);
  });

  it('zoom is clamped to minimum 0.1', () => {
    act(() => useUiStore.getState().setZoom(0.01));
    expect(useUiStore.getState().zoom).toBe(0.1);
  });

  it('zoom is clamped to maximum 32', () => {
    act(() => useUiStore.getState().setZoom(100));
    expect(useUiStore.getState().zoom).toBe(32);
  });
});

// ---------------------------------------------------------------------------
// 9. uiStore: toggles and other setters
// ---------------------------------------------------------------------------
describe('uiStore – toggles', () => {
  beforeEach(resetStores);

  it('toggleGrid flips gridVisible', () => {
    expect(useUiStore.getState().gridVisible).toBe(false);
    act(() => useUiStore.getState().toggleGrid());
    expect(useUiStore.getState().gridVisible).toBe(true);
    act(() => useUiStore.getState().toggleGrid());
    expect(useUiStore.getState().gridVisible).toBe(false);
  });

  it('toggleLeftPanel flips leftPanelVisible', () => {
    expect(useUiStore.getState().leftPanelVisible).toBe(true);
    act(() => useUiStore.getState().toggleLeftPanel());
    expect(useUiStore.getState().leftPanelVisible).toBe(false);
  });

  it('toggleRightPanel flips rightPanelVisible', () => {
    expect(useUiStore.getState().rightPanelVisible).toBe(true);
    act(() => useUiStore.getState().toggleRightPanel());
    expect(useUiStore.getState().rightPanelVisible).toBe(false);
  });

  it('setEditingText sets isEditingText', () => {
    act(() => useUiStore.getState().setEditingText(true));
    expect(useUiStore.getState().isEditingText).toBe(true);
  });

  it('setStatusMessage sets the message', () => {
    act(() => useUiStore.getState().setStatusMessage('Saving...'));
    expect(useUiStore.getState().statusMessage).toBe('Saving...');
  });

  it('setActiveDialog sets the dialog', () => {
    act(() => useUiStore.getState().setActiveDialog('settings'));
    expect(useUiStore.getState().activeDialog).toBe('settings');
    act(() => useUiStore.getState().setActiveDialog(null));
    expect(useUiStore.getState().activeDialog).toBeNull();
  });

  it('setFramePanelHeight sets the height', () => {
    act(() => useUiStore.getState().setFramePanelHeight(250));
    expect(useUiStore.getState().framePanelHeight).toBe(250);
  });
});

// ---------------------------------------------------------------------------
// 10. jobStore: add/update/remove jobs
// ---------------------------------------------------------------------------
describe('jobStore', () => {
  beforeEach(resetStores);

  it('starts with no jobs', () => {
    expect(useJobStore.getState().jobs).toEqual([]);
    expect(useJobStore.getState().activeJobId).toBeNull();
  });

  it('addJob adds a job', () => {
    const job: Job = {
      id: 'j1',
      type: 'render',
      status: 'pending',
      progress: 0,
      message: 'Queued',
    };
    act(() => useJobStore.getState().addJob(job));
    expect(useJobStore.getState().jobs).toHaveLength(1);
    expect(useJobStore.getState().jobs[0].id).toBe('j1');
  });

  it('updateJob updates a job', () => {
    const job: Job = {
      id: 'j2',
      type: 'export',
      status: 'running',
      progress: 0.5,
      message: 'Exporting...',
    };
    act(() => useJobStore.getState().addJob(job));
    act(() =>
      useJobStore.getState().updateJob('j2', { progress: 1, status: 'completed', message: 'Done' }),
    );
    const updated = useJobStore.getState().jobs[0];
    expect(updated.progress).toBe(1);
    expect(updated.status).toBe('completed');
    expect(updated.message).toBe('Done');
  });

  it('removeJob removes a job', () => {
    const job: Job = {
      id: 'j3',
      type: 'aiInference',
      status: 'pending',
      progress: 0,
      message: '',
    };
    act(() => useJobStore.getState().addJob(job));
    act(() => useJobStore.getState().removeJob('j3'));
    expect(useJobStore.getState().jobs).toHaveLength(0);
  });

  it('removeJob clears activeJobId if it matches', () => {
    const job: Job = {
      id: 'j4',
      type: 'render',
      status: 'running',
      progress: 0.3,
      message: 'Processing',
    };
    act(() => {
      useJobStore.getState().addJob(job);
      useJobStore.getState().setActiveJob('j4');
    });
    expect(useJobStore.getState().activeJobId).toBe('j4');
    act(() => useJobStore.getState().removeJob('j4'));
    expect(useJobStore.getState().activeJobId).toBeNull();
  });

  it('setActiveJob sets the active job ID', () => {
    act(() => useJobStore.getState().setActiveJob('j5'));
    expect(useJobStore.getState().activeJobId).toBe('j5');
  });
});

// ---------------------------------------------------------------------------
// 11. LayerEffect defaults are all zeroed/disabled
// ---------------------------------------------------------------------------
describe('createDefaultLayerEffect', () => {
  it('all numeric effects are 0', () => {
    const fx = createDefaultLayerEffect();
    expect(fx.brightness).toBe(0);
    expect(fx.contrast).toBe(0);
    expect(fx.saturation).toBe(0);
    expect(fx.hue).toBe(0);
    expect(fx.sharpen).toBe(0);
    expect(fx.vignette).toBe(0);
    expect(fx.pixelate).toBe(0);
    expect(fx.noise).toBe(0);
    expect(fx.posterize).toBe(0);
    expect(fx.gaussianBlur).toBe(0);
    expect(fx.dropShadowOffsetX).toBe(0);
    expect(fx.dropShadowOffsetY).toBe(0);
    expect(fx.dropShadowBlur).toBe(0);
    expect(fx.dropShadowOpacity).toBe(0);
    expect(fx.outerGlowRadius).toBe(0);
    expect(fx.outerGlowIntensity).toBe(0);
    expect(fx.smoothStrokeWidth).toBe(0);
    expect(fx.smoothStrokeOpacity).toBe(0);
    expect(fx.blendOverlayOpacity).toBe(0);
  });

  it('all enabled flags are false', () => {
    const fx = createDefaultLayerEffect();
    expect(fx.brightnessEnabled).toBe(false);
    expect(fx.contrastEnabled).toBe(false);
    expect(fx.saturationEnabled).toBe(false);
    expect(fx.hueEnabled).toBe(false);
    expect(fx.grayscale).toBe(false);
    expect(fx.sepia).toBe(false);
    expect(fx.invert).toBe(false);
    expect(fx.sharpenEnabled).toBe(false);
    expect(fx.vignetteEnabled).toBe(false);
    expect(fx.pixelateEnabled).toBe(false);
    expect(fx.colorTintEnabled).toBe(false);
    expect(fx.noiseEnabled).toBe(false);
    expect(fx.posterizeEnabled).toBe(false);
    expect(fx.gaussianBlurEnabled).toBe(false);
    expect(fx.dropShadowEnabled).toBe(false);
    expect(fx.outerGlowEnabled).toBe(false);
    expect(fx.cutStrokeEnabled).toBe(false);
    expect(fx.rimLightEnabled).toBe(false);
    expect(fx.splitToningEnabled).toBe(false);
    expect(fx.smoothStrokeEnabled).toBe(false);
    expect(fx.blendOverlayEnabled).toBe(false);
  });

  it('blendOverlayImage is null', () => {
    const fx = createDefaultLayerEffect();
    expect(fx.blendOverlayImage).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 12. ColorAdjustments defaults are all zeroed
// ---------------------------------------------------------------------------
describe('createDefaultColorAdjustments', () => {
  it('all values are 0', () => {
    const adj = createDefaultColorAdjustments();
    expect(adj.temperature).toBe(0);
    expect(adj.tint).toBe(0);
    expect(adj.exposure).toBe(0);
    expect(adj.highlights).toBe(0);
    expect(adj.shadows).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 13. TextProperties defaults are sensible
// ---------------------------------------------------------------------------
describe('createDefaultTextProperties', () => {
  it('has sensible default values', () => {
    const tp = createDefaultTextProperties();
    expect(tp.text).toBe('');
    expect(tp.fontFamily).toBe('Arial');
    expect(tp.fontSize).toBe(24);
    expect(tp.fontWeight).toBe(400);
    expect(tp.fontStyle).toBe('normal');
    expect(tp.color).toBeTruthy();
    expect(tp.alignment).toBe('left');
    expect(tp.underline).toBe(false);
    expect(tp.strikethrough).toBe(false);
    expect(tp.hasBackground).toBe(false);
    expect(tp.widthSqueeze).toBe(1);
    expect(tp.heightSqueeze).toBe(1);
    expect(tp.transform).toBe('none');
    expect(tp.runs).toEqual([]);
    expect(tp.lineHeight).toBeGreaterThan(0);
    expect(tp.letterSpacing).toBe(0);
    expect(tp.strokeWidth).toBe(0);
    expect(tp.shadowBlur).toBe(0);
    expect(tp.fill).toBeDefined();
    expect(tp.fill.type).toBe('solid');
  });
});

// ---------------------------------------------------------------------------
// 14. ShapeProperties defaults
// ---------------------------------------------------------------------------
describe('createDefaultShapeProperties', () => {
  it('has sensible default values', () => {
    const sp = createDefaultShapeProperties();
    expect(sp.shapeType).toBe('rectangle');
    expect(sp.fillColor).toBeTruthy();
    expect(sp.fillType).toBe('solid');
    expect(sp.fill).toBeNull();
    expect(sp.borderWidth).toBe(0);
    expect(sp.cornerRadius).toBe(0);
    expect(sp.imageFillPath).toBeNull();
    expect(sp.maskMode).toBe(false);
    expect(sp.pathData).toBeNull();
    expect(sp.points).toEqual([]);
    expect(sp.isClosed).toBe(true);
    expect(sp.opacity).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 15. FillDefinition defaults
// ---------------------------------------------------------------------------
describe('createDefaultFillDefinition', () => {
  it('has sensible default values', () => {
    const fd = createDefaultFillDefinition();
    expect(fd.type).toBe('solid');
    expect(fd.solidColor).toBe('#000000');
    expect(fd.gradientStops).toHaveLength(2);
    expect(fd.gradientStops[0].position).toBe(0);
    expect(fd.gradientStops[1].position).toBe(1);
    expect(fd.gradientAngle).toBe(0);
    expect(fd.gradientCenterX).toBe(0.5);
    expect(fd.gradientCenterY).toBe(0.5);
    expect(fd.gradientRadius).toBe(0.5);
    expect(fd.imagePath).toBeNull();
    expect(fd.imageStretch).toBe('fill');
    expect(fd.globalAlpha).toBe(1);
  });
});
