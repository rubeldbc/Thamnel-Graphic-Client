import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentStore } from '../stores/documentStore';
import { useUiStore } from '../stores/uiStore';
import { createDefaultLayer, createDefaultProject } from '../types/index';
import { getCommandRegistry, getCommand, useCommand } from '../commands/useCommand';
import { clearClipboard } from '../commands/editCommands';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  });
  clearClipboard();
}

function addTestLayer(overrides?: Partial<ReturnType<typeof createDefaultLayer>>) {
  const layer = createDefaultLayer(overrides);
  useDocumentStore.getState().addLayer(layer);
  return layer;
}

// ---------------------------------------------------------------------------
// 1. Command registry has all 70+ commands
// ---------------------------------------------------------------------------
describe('Command Registry', () => {
  it('contains at least 70 commands', () => {
    const registry = getCommandRegistry();
    expect(registry.size).toBeGreaterThanOrEqual(70);
  });

  it('all entries have required fields', () => {
    const registry = getCommandRegistry();
    for (const [name, cmd] of registry) {
      expect(cmd.name).toBe(name);
      expect(typeof cmd.execute).toBe('function');
      expect(typeof cmd.canExecute).toBe('function');
      expect(typeof cmd.category).toBe('string');
    }
  });

  it('has expected categories', () => {
    const registry = getCommandRegistry();
    const categories = new Set<string>();
    for (const cmd of registry.values()) {
      categories.add(cmd.category);
    }
    expect(categories).toContain('file');
    expect(categories).toContain('edit');
    expect(categories).toContain('layer');
    expect(categories).toContain('arrange');
    expect(categories).toContain('group');
    expect(categories).toContain('transform');
    expect(categories).toContain('align');
    expect(categories).toContain('view');
    expect(categories).toContain('ai');
    expect(categories).toContain('video');
  });
});

// ---------------------------------------------------------------------------
// 2. File commands
// ---------------------------------------------------------------------------
describe('File commands', () => {
  beforeEach(resetStores);

  it('newProject creates a fresh project', () => {
    addTestLayer({ name: 'Old' });
    expect(useDocumentStore.getState().project.layers.length).toBe(1);

    const cmd = getCommand('newProject')!;
    expect(cmd.canExecute()).toBe(true);
    cmd.execute();

    expect(useDocumentStore.getState().project.layers.length).toBe(0);
  });

  it('newProject canExecute is always true', () => {
    expect(getCommand('newProject')!.canExecute()).toBe(true);
  });

  it('exportImage canExecute requires layers', () => {
    expect(getCommand('exportImage')!.canExecute()).toBe(false);
    addTestLayer();
    expect(getCommand('exportImage')!.canExecute()).toBe(true);
  });

  it('exportPsd canExecute requires layers', () => {
    expect(getCommand('exportPsd')!.canExecute()).toBe(false);
    addTestLayer();
    expect(getCommand('exportPsd')!.canExecute()).toBe(true);
  });

  it('exportSvg canExecute requires layers', () => {
    expect(getCommand('exportSvg')!.canExecute()).toBe(false);
    addTestLayer();
    expect(getCommand('exportSvg')!.canExecute()).toBe(true);
  });

  it('openProject, saveProject, saveProjectAs, saveCopy always canExecute', () => {
    for (const name of ['openProject', 'saveProject', 'saveProjectAs', 'saveCopy']) {
      expect(getCommand(name)!.canExecute()).toBe(true);
    }
  });

  it('import commands always canExecute', () => {
    for (const name of ['importImage', 'importVideo', 'importSvg', 'importLayersFromProject']) {
      expect(getCommand(name)!.canExecute()).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Edit commands
// ---------------------------------------------------------------------------
describe('Edit commands', () => {
  beforeEach(resetStores);

  it('undo canExecute based on undoStack', () => {
    expect(getCommand('undo')!.canExecute()).toBe(false);
    useDocumentStore.getState().pushUndo();
    expect(getCommand('undo')!.canExecute()).toBe(true);
  });

  it('redo canExecute based on redoStack', () => {
    expect(getCommand('redo')!.canExecute()).toBe(false);
    useDocumentStore.getState().pushUndo();
    useDocumentStore.getState().undo();
    expect(getCommand('redo')!.canExecute()).toBe(true);
  });

  it('undo calls documentStore.undo()', () => {
    const layer = addTestLayer({ name: 'A' });
    useDocumentStore.getState().pushUndo();
    useDocumentStore.getState().removeLayer(layer.id);
    expect(useDocumentStore.getState().project.layers.length).toBe(0);

    getCommand('undo')!.execute();
    expect(useDocumentStore.getState().project.layers.length).toBe(1);
  });

  it('deleteLayer removes selected layers', () => {
    const layer = addTestLayer({ name: 'ToDelete' });
    useDocumentStore.setState({ selectedLayerIds: [layer.id] });
    expect(getCommand('deleteLayer')!.canExecute()).toBe(true);

    getCommand('deleteLayer')!.execute();
    expect(useDocumentStore.getState().project.layers.length).toBe(0);
  });

  it('deleteLayer canExecute requires selection', () => {
    expect(getCommand('deleteLayer')!.canExecute()).toBe(false);
  });

  it('duplicateLayer duplicates selected with offset', () => {
    const layer = addTestLayer({ name: 'Original', x: 50, y: 50 });
    useDocumentStore.setState({ selectedLayerIds: [layer.id] });

    getCommand('duplicateLayer')!.execute();
    const layers = useDocumentStore.getState().project.layers;
    expect(layers.length).toBe(2);
    const dup = layers.find((l) => l.id !== layer.id)!;
    expect(dup.name).toBe('Original (copy)');
    expect(dup.x).toBe(60);
    expect(dup.y).toBe(60);
  });

  it('copyLayer + pasteLayer roundtrip', () => {
    const layer = addTestLayer({ name: 'CopyMe', x: 100, y: 100 });
    useDocumentStore.setState({ selectedLayerIds: [layer.id] });

    getCommand('copyLayer')!.execute();
    expect(getCommand('pasteLayer')!.canExecute()).toBe(true);

    getCommand('pasteLayer')!.execute();
    const layers = useDocumentStore.getState().project.layers;
    expect(layers.length).toBe(2);
    const pasted = layers.find((l) => l.id !== layer.id)!;
    expect(pasted.name).toBe('CopyMe (copy)');
    expect(pasted.x).toBe(110);
  });

  it('pasteLayer canExecute is false when clipboard is empty', () => {
    expect(getCommand('pasteLayer')!.canExecute()).toBe(false);
  });

  it('selectAll selects all layers', () => {
    const l1 = addTestLayer({ name: 'A' });
    const l2 = addTestLayer({ name: 'B' });
    expect(getCommand('selectAll')!.canExecute()).toBe(true);

    getCommand('selectAll')!.execute();
    const ids = useDocumentStore.getState().selectedLayerIds;
    expect(ids).toContain(l1.id);
    expect(ids).toContain(l2.id);
  });

  it('deselect clears selection', () => {
    const layer = addTestLayer();
    useDocumentStore.setState({ selectedLayerIds: [layer.id] });
    expect(getCommand('deselect')!.canExecute()).toBe(true);

    getCommand('deselect')!.execute();
    expect(useDocumentStore.getState().selectedLayerIds.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Layer commands
// ---------------------------------------------------------------------------
describe('Layer commands', () => {
  beforeEach(resetStores);

  it('addText adds a text layer', () => {
    getCommand('addText')!.execute();
    const layers = useDocumentStore.getState().project.layers;
    expect(layers.length).toBe(1);
    expect(layers[0].type).toBe('text');
    expect(layers[0].textProperties).not.toBeNull();
  });

  it('addShape adds a shape layer with given type', () => {
    getCommand('addShape')!.execute('ellipse');
    const layers = useDocumentStore.getState().project.layers;
    expect(layers.length).toBe(1);
    expect(layers[0].type).toBe('shape');
    expect(layers[0].shapeProperties!.shapeType).toBe('ellipse');
  });

  it('addShape defaults to rectangle', () => {
    getCommand('addShape')!.execute();
    const layers = useDocumentStore.getState().project.layers;
    expect(layers[0].shapeProperties!.shapeType).toBe('rectangle');
  });

  it('addNewLayer adds an image layer', () => {
    getCommand('addNewLayer')!.execute();
    const layers = useDocumentStore.getState().project.layers;
    expect(layers.length).toBe(1);
    expect(layers[0].type).toBe('image');
  });

  it('addNewGroup adds a group layer', () => {
    getCommand('addNewGroup')!.execute();
    const layers = useDocumentStore.getState().project.layers;
    expect(layers.length).toBe(1);
    expect(layers[0].type).toBe('group');
  });

  it('lockLayer toggles lock on selected', () => {
    const layer = addTestLayer({ locked: false });
    useDocumentStore.setState({ selectedLayerIds: [layer.id] });

    getCommand('lockLayer')!.execute();
    expect(useDocumentStore.getState().project.layers[0].locked).toBe(true);

    getCommand('lockLayer')!.execute();
    expect(useDocumentStore.getState().project.layers[0].locked).toBe(false);
  });

  it('toggleVisibility toggles visible on selected', () => {
    const layer = addTestLayer({ visible: true });
    useDocumentStore.setState({ selectedLayerIds: [layer.id] });

    getCommand('toggleVisibility')!.execute();
    expect(useDocumentStore.getState().project.layers[0].visible).toBe(false);

    getCommand('toggleVisibility')!.execute();
    expect(useDocumentStore.getState().project.layers[0].visible).toBe(true);
  });

  it('lockLayer canExecute requires selection', () => {
    expect(getCommand('lockLayer')!.canExecute()).toBe(false);
    const layer = addTestLayer();
    useDocumentStore.setState({ selectedLayerIds: [layer.id] });
    expect(getCommand('lockLayer')!.canExecute()).toBe(true);
  });

  it('mergeDown canExecute requires selection and not first layer', () => {
    expect(getCommand('mergeDown')!.canExecute()).toBe(false);

    const l1 = addTestLayer({ name: 'Bottom' });
    const l2 = addTestLayer({ name: 'Top' });
    useDocumentStore.setState({ selectedLayerIds: [l1.id] });
    // l1 is index 0 => notFirstLayer is false
    expect(getCommand('mergeDown')!.canExecute()).toBe(false);

    useDocumentStore.setState({ selectedLayerIds: [l2.id] });
    // l2 is index 1 => notFirstLayer is true
    expect(getCommand('mergeDown')!.canExecute()).toBe(true);
  });

  it('rasterize canExecute requires text or shape', () => {
    const imgLayer = addTestLayer({ type: 'image' });
    useDocumentStore.setState({ selectedLayerIds: [imgLayer.id] });
    expect(getCommand('rasterize')!.canExecute()).toBe(false);

    const textLayer = addTestLayer({ type: 'text' });
    useDocumentStore.setState({ selectedLayerIds: [textLayer.id] });
    expect(getCommand('rasterize')!.canExecute()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Arrange commands
// ---------------------------------------------------------------------------
describe('Arrange commands', () => {
  beforeEach(resetStores);

  it('bringToFront moves selected to last position', () => {
    const l1 = addTestLayer({ name: 'A' });
    addTestLayer({ name: 'B' });
    addTestLayer({ name: 'C' });
    useDocumentStore.setState({ selectedLayerIds: [l1.id] });

    getCommand('bringToFront')!.execute();
    const layers = useDocumentStore.getState().project.layers;
    expect(layers[layers.length - 1].id).toBe(l1.id);
  });

  it('sendToBack moves selected to first position', () => {
    addTestLayer({ name: 'A' });
    addTestLayer({ name: 'B' });
    const l3 = addTestLayer({ name: 'C' });
    useDocumentStore.setState({ selectedLayerIds: [l3.id] });

    getCommand('sendToBack')!.execute();
    const layers = useDocumentStore.getState().project.layers;
    expect(layers[0].id).toBe(l3.id);
  });

  it('bringForward moves selected up one position', () => {
    const l1 = addTestLayer({ name: 'A' });
    addTestLayer({ name: 'B' });
    useDocumentStore.setState({ selectedLayerIds: [l1.id] });

    expect(getCommand('bringForward')!.canExecute()).toBe(true);
    getCommand('bringForward')!.execute();
    const layers = useDocumentStore.getState().project.layers;
    expect(layers[1].id).toBe(l1.id);
  });

  it('sendBackward moves selected down one position', () => {
    addTestLayer({ name: 'A' });
    const l2 = addTestLayer({ name: 'B' });
    useDocumentStore.setState({ selectedLayerIds: [l2.id] });

    expect(getCommand('sendBackward')!.canExecute()).toBe(true);
    getCommand('sendBackward')!.execute();
    const layers = useDocumentStore.getState().project.layers;
    expect(layers[0].id).toBe(l2.id);
  });

  it('bringForward canExecute false when at top', () => {
    addTestLayer({ name: 'A' });
    const l2 = addTestLayer({ name: 'B' });
    useDocumentStore.setState({ selectedLayerIds: [l2.id] });
    expect(getCommand('bringForward')!.canExecute()).toBe(false);
  });

  it('sendBackward canExecute false when at bottom', () => {
    const l1 = addTestLayer({ name: 'A' });
    addTestLayer({ name: 'B' });
    useDocumentStore.setState({ selectedLayerIds: [l1.id] });
    expect(getCommand('sendBackward')!.canExecute()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Group commands
// ---------------------------------------------------------------------------
describe('Group commands', () => {
  beforeEach(resetStores);

  it('group canExecute needs 2+ selected', () => {
    expect(getCommand('group')!.canExecute()).toBe(false);

    const l1 = addTestLayer({ name: 'A' });
    useDocumentStore.setState({ selectedLayerIds: [l1.id] });
    expect(getCommand('group')!.canExecute()).toBe(false);

    const l2 = addTestLayer({ name: 'B' });
    useDocumentStore.setState({ selectedLayerIds: [l1.id, l2.id] });
    expect(getCommand('group')!.canExecute()).toBe(true);
  });

  it('group creates a group layer and assigns parentGroupId', () => {
    const l1 = addTestLayer({ name: 'A' });
    const l2 = addTestLayer({ name: 'B' });
    useDocumentStore.setState({ selectedLayerIds: [l1.id, l2.id] });

    getCommand('group')!.execute();
    const layers = useDocumentStore.getState().project.layers;
    const groupLayer = layers.find((l) => l.type === 'group');
    expect(groupLayer).toBeDefined();

    const childA = layers.find((l) => l.id === l1.id)!;
    const childB = layers.find((l) => l.id === l2.id)!;
    expect(childA.parentGroupId).toBe(groupLayer!.id);
    expect(childB.parentGroupId).toBe(groupLayer!.id);
  });

  it('ungroup canExecute requires selected group', () => {
    expect(getCommand('ungroup')!.canExecute()).toBe(false);

    const layer = addTestLayer({ type: 'image' });
    useDocumentStore.setState({ selectedLayerIds: [layer.id] });
    expect(getCommand('ungroup')!.canExecute()).toBe(false);

    const groupLayer = addTestLayer({ type: 'group', name: 'Group' });
    useDocumentStore.setState({ selectedLayerIds: [groupLayer.id] });
    expect(getCommand('ungroup')!.canExecute()).toBe(true);
  });

  it('releaseFromGroup canExecute when selected layer has parentGroupId', () => {
    const layer = addTestLayer({ parentGroupId: null });
    useDocumentStore.setState({ selectedLayerIds: [layer.id] });
    expect(getCommand('releaseFromGroup')!.canExecute()).toBe(false);

    useDocumentStore.getState().updateLayer(layer.id, { parentGroupId: 'some-group' });
    expect(getCommand('releaseFromGroup')!.canExecute()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Transform commands
// ---------------------------------------------------------------------------
describe('Transform commands', () => {
  beforeEach(resetStores);

  it('flipHorizontal toggles', () => {
    const layer = addTestLayer({ flipHorizontal: false });
    useDocumentStore.setState({ selectedLayerIds: [layer.id] });

    getCommand('flipHorizontal')!.execute();
    expect(useDocumentStore.getState().project.layers[0].flipHorizontal).toBe(true);

    getCommand('flipHorizontal')!.execute();
    expect(useDocumentStore.getState().project.layers[0].flipHorizontal).toBe(false);
  });

  it('flipVertical toggles', () => {
    const layer = addTestLayer({ flipVertical: false });
    useDocumentStore.setState({ selectedLayerIds: [layer.id] });

    getCommand('flipVertical')!.execute();
    expect(useDocumentStore.getState().project.layers[0].flipVertical).toBe(true);
  });

  it('rotate90 adds 90 degrees', () => {
    const layer = addTestLayer({ rotation: 0 });
    useDocumentStore.setState({ selectedLayerIds: [layer.id] });

    getCommand('rotate90')!.execute();
    expect(useDocumentStore.getState().project.layers[0].rotation).toBe(90);

    getCommand('rotate90')!.execute();
    expect(useDocumentStore.getState().project.layers[0].rotation).toBe(180);
  });

  it('rotate90 wraps at 360', () => {
    const layer = addTestLayer({ rotation: 270 });
    useDocumentStore.setState({ selectedLayerIds: [layer.id] });

    getCommand('rotate90')!.execute();
    expect(useDocumentStore.getState().project.layers[0].rotation).toBe(0);
  });

  it('transform commands canExecute requires selection', () => {
    expect(getCommand('flipHorizontal')!.canExecute()).toBe(false);
    expect(getCommand('flipVertical')!.canExecute()).toBe(false);
    expect(getCommand('rotate90')!.canExecute()).toBe(false);

    const layer = addTestLayer();
    useDocumentStore.setState({ selectedLayerIds: [layer.id] });
    expect(getCommand('flipHorizontal')!.canExecute()).toBe(true);
    expect(getCommand('flipVertical')!.canExecute()).toBe(true);
    expect(getCommand('rotate90')!.canExecute()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Align commands canExecute checks
// ---------------------------------------------------------------------------
describe('Align commands', () => {
  beforeEach(resetStores);

  it('align commands require selection', () => {
    for (const name of [
      'alignLeft', 'alignCenter', 'alignRight',
      'alignTop', 'alignMiddle', 'alignBottom',
    ]) {
      expect(getCommand(name)!.canExecute()).toBe(false);
    }

    const layer = addTestLayer();
    useDocumentStore.setState({ selectedLayerIds: [layer.id] });
    for (const name of [
      'alignLeft', 'alignCenter', 'alignRight',
      'alignTop', 'alignMiddle', 'alignBottom',
    ]) {
      expect(getCommand(name)!.canExecute()).toBe(true);
    }
  });

  it('distribute commands require 3+ selected', () => {
    for (const name of [
      'distributeHorizontally', 'distributeVertically',
      'distributeLeftEdges', 'distributeRightEdges',
      'distributeTopEdges', 'distributeBottomEdges',
    ]) {
      expect(getCommand(name)!.canExecute()).toBe(false);
    }

    const l1 = addTestLayer();
    const l2 = addTestLayer();
    useDocumentStore.setState({ selectedLayerIds: [l1.id, l2.id] });
    expect(getCommand('distributeHorizontally')!.canExecute()).toBe(false);

    const l3 = addTestLayer();
    useDocumentStore.setState({ selectedLayerIds: [l1.id, l2.id, l3.id] });
    expect(getCommand('distributeHorizontally')!.canExecute()).toBe(true);
  });

  it('match commands require 2+ selected', () => {
    for (const name of ['matchWidth', 'matchHeight', 'matchSize']) {
      expect(getCommand(name)!.canExecute()).toBe(false);
    }

    const l1 = addTestLayer();
    useDocumentStore.setState({ selectedLayerIds: [l1.id] });
    expect(getCommand('matchWidth')!.canExecute()).toBe(false);

    const l2 = addTestLayer();
    useDocumentStore.setState({ selectedLayerIds: [l1.id, l2.id] });
    expect(getCommand('matchWidth')!.canExecute()).toBe(true);
    expect(getCommand('matchHeight')!.canExecute()).toBe(true);
    expect(getCommand('matchSize')!.canExecute()).toBe(true);
  });

  it('alignLeft aligns all selected to leftmost x', () => {
    const l1 = addTestLayer({ x: 10, width: 50 });
    const l2 = addTestLayer({ x: 100, width: 50 });
    useDocumentStore.setState({ selectedLayerIds: [l1.id, l2.id] });

    getCommand('alignLeft')!.execute();
    const layers = useDocumentStore.getState().project.layers;
    expect(layers.find((l) => l.id === l1.id)!.x).toBe(10);
    expect(layers.find((l) => l.id === l2.id)!.x).toBe(10);
  });

  it('matchWidth sets all to max width', () => {
    const l1 = addTestLayer({ width: 50 });
    const l2 = addTestLayer({ width: 200 });
    useDocumentStore.setState({ selectedLayerIds: [l1.id, l2.id] });

    getCommand('matchWidth')!.execute();
    const layers = useDocumentStore.getState().project.layers;
    expect(layers.find((l) => l.id === l1.id)!.width).toBe(200);
    expect(layers.find((l) => l.id === l2.id)!.width).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 9. View commands
// ---------------------------------------------------------------------------
describe('View commands', () => {
  beforeEach(resetStores);

  it('zoomIn increases zoom by 0.1', () => {
    expect(useUiStore.getState().zoom).toBe(1);
    getCommand('zoomIn')!.execute();
    expect(useUiStore.getState().zoom).toBeCloseTo(1.1, 5);
  });

  it('zoomOut decreases zoom by 0.1', () => {
    expect(useUiStore.getState().zoom).toBe(1);
    getCommand('zoomOut')!.execute();
    expect(useUiStore.getState().zoom).toBeCloseTo(0.9, 5);
  });

  it('originalSize resets zoom to 1', () => {
    useUiStore.getState().setZoom(2.5);
    getCommand('originalSize')!.execute();
    expect(useUiStore.getState().zoom).toBe(1);
  });

  it('toggleGrid toggles grid visibility', () => {
    expect(useUiStore.getState().gridVisible).toBe(false);
    getCommand('toggleGrid')!.execute();
    expect(useUiStore.getState().gridVisible).toBe(true);
    getCommand('toggleGrid')!.execute();
    expect(useUiStore.getState().gridVisible).toBe(false);
  });

  it('setTool sets active tool', () => {
    getCommand('setTool')!.execute('text');
    expect(useUiStore.getState().activeTool).toBe('text');
    getCommand('setTool')!.execute('eraser');
    expect(useUiStore.getState().activeTool).toBe('eraser');
  });

  it('setCanvasPreset sets canvas size', () => {
    getCommand('setCanvasPreset')!.execute(3840, 2160);
    const p = useDocumentStore.getState().project;
    expect(p.canvasWidth).toBe(3840);
    expect(p.canvasHeight).toBe(2160);
  });

  it('zoomIn canExecute false at max zoom', () => {
    useUiStore.getState().setZoom(32);
    expect(getCommand('zoomIn')!.canExecute()).toBe(false);
  });

  it('zoomOut canExecute false at min zoom', () => {
    useUiStore.getState().setZoom(0.1);
    expect(getCommand('zoomOut')!.canExecute()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 10. AI commands
// ---------------------------------------------------------------------------
describe('AI commands', () => {
  beforeEach(resetStores);

  it('AI commands canExecute require selected image layer', () => {
    for (const name of [
      'removeBackground', 'enhanceImage', 'upscaleRealEsrgan',
      'logoRemoval', 'faceRestore',
    ]) {
      expect(getCommand(name)!.canExecute()).toBe(false);
    }
  });

  it('AI commands canExecute true with image layer selected', () => {
    const layer = addTestLayer({ type: 'image' });
    useDocumentStore.setState({ selectedLayerIds: [layer.id] });

    for (const name of [
      'removeBackground', 'enhanceImage', 'upscaleRealEsrgan',
      'logoRemoval', 'faceRestore',
    ]) {
      expect(getCommand(name)!.canExecute()).toBe(true);
    }
  });

  it('AI commands canExecute false with text layer selected', () => {
    const layer = addTestLayer({ type: 'text' });
    useDocumentStore.setState({ selectedLayerIds: [layer.id] });

    expect(getCommand('removeBackground')!.canExecute()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 11. Video commands
// ---------------------------------------------------------------------------
describe('Video commands', () => {
  beforeEach(resetStores);

  it('video commands canExecute false with no videos', () => {
    for (const name of [
      'removeVideo', 'selectVideo', 'playFile',
      'openFileLocation', 'extractFrameAtTime',
    ]) {
      expect(getCommand(name)!.canExecute()).toBe(false);
    }
  });

  it('video commands canExecute true with videos', () => {
    useDocumentStore.setState({
      project: {
        ...useDocumentStore.getState().project,
        videoPaths: ['/path/to/video.mp4'],
      },
    });

    for (const name of [
      'removeVideo', 'selectVideo', 'playFile',
      'openFileLocation', 'extractFrameAtTime',
    ]) {
      expect(getCommand(name)!.canExecute()).toBe(true);
    }
  });

  it('randomizeFrames canExecute requires frame receiver layers', () => {
    expect(getCommand('randomizeFrames')!.canExecute()).toBe(false);

    addTestLayer({ isFrameReceiver: true });
    expect(getCommand('randomizeFrames')!.canExecute()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 12. useCommand hook
// ---------------------------------------------------------------------------
describe('useCommand hook', () => {
  beforeEach(resetStores);

  it('returns correct command properties', () => {
    const { result } = renderHook(() => useCommand('zoomIn'));
    expect(typeof result.current.execute).toBe('function');
    expect(typeof result.current.canExecute).toBe('function');
    expect(result.current.shortcut).toBe('Ctrl+=');
  });

  it('throws for unknown command', () => {
    expect(() => {
      renderHook(() => useCommand('nonExistentCommand'));
    }).toThrow('[useCommand] unknown command: "nonExistentCommand"');
  });

  it('execute works through hook', () => {
    const { result } = renderHook(() => useCommand('toggleGrid'));
    expect(useUiStore.getState().gridVisible).toBe(false);
    result.current.execute();
    expect(useUiStore.getState().gridVisible).toBe(true);
  });
});
