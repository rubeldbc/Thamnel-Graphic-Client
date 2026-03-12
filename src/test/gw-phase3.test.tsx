import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useDocumentStore } from '../stores/documentStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import { useClipboard } from '../hooks/useClipboard';
import { createDefaultLayer } from '../types/index';
import type { ClipboardLayer } from '../hooks/useClipboard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset both stores to a clean state before each test. */
function resetStores() {
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

  useUndoRedoStore.setState({
    undoStack: [],
    redoStack: [],
    lastHash: '',
    maxSnapshotCount: 30,
  });
}

/** Convert a LayerModel to a ClipboardLayer for testing. */
function toClipboardLayer(layer: ReturnType<typeof createDefaultLayer>): ClipboardLayer {
  return {
    ...layer,
    type: layer.type as string,
  } as unknown as ClipboardLayer;
}
void toClipboardLayer;

// ===========================================================================
// UNDO/REDO STORE TESTS
// ===========================================================================

describe('UndoRedoStore', () => {
  beforeEach(() => {
    resetStores();
  });

  // -----------------------------------------------------------------------
  // TakeSnapshot
  // -----------------------------------------------------------------------
  describe('takeSnapshot', () => {
    it('stores serialized state onto the undo stack', () => {
      const layer = createDefaultLayer({ id: 'layer1', name: 'Test Layer' });
      act(() => {
        useDocumentStore.getState().addLayer(layer);
      });

      act(() => {
        useUndoRedoStore.getState().takeSnapshot();
      });

      const { undoStack } = useUndoRedoStore.getState();
      expect(undoStack).toHaveLength(1);

      // The snapshot should be a JSON string containing the layer
      const parsed = JSON.parse(undoStack[0]);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('layer1');
      expect(parsed[0].name).toBe('Test Layer');
    });

    it('clears the redo stack when a new snapshot is taken', () => {
      // Set up a redo stack manually
      useUndoRedoStore.setState({ redoStack: ['["fake"]'] });

      act(() => {
        useUndoRedoStore.getState().takeSnapshot();
      });

      expect(useUndoRedoStore.getState().redoStack).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Dedup
  // -----------------------------------------------------------------------
  describe('dedup', () => {
    it('does not create duplicate snapshot when state has not changed', () => {
      const layer = createDefaultLayer({ id: 'layer1', name: 'Same' });
      act(() => {
        useDocumentStore.getState().addLayer(layer);
      });

      act(() => {
        useUndoRedoStore.getState().takeSnapshot();
      });
      act(() => {
        useUndoRedoStore.getState().takeSnapshot();
      });
      act(() => {
        useUndoRedoStore.getState().takeSnapshot();
      });

      expect(useUndoRedoStore.getState().undoStack).toHaveLength(1);
    });

    it('does create new snapshot when state changes', () => {
      const layer1 = createDefaultLayer({ id: 'layer1', name: 'First' });
      act(() => {
        useDocumentStore.getState().addLayer(layer1);
      });
      act(() => {
        useUndoRedoStore.getState().takeSnapshot();
      });

      const layer2 = createDefaultLayer({ id: 'layer2', name: 'Second' });
      act(() => {
        useDocumentStore.getState().addLayer(layer2);
      });
      act(() => {
        useUndoRedoStore.getState().takeSnapshot();
      });

      expect(useUndoRedoStore.getState().undoStack).toHaveLength(2);
    });
  });

  // -----------------------------------------------------------------------
  // Stack limits
  // -----------------------------------------------------------------------
  describe('stack limits', () => {
    it('enforces maxSnapshotCount (over 30 drops oldest)', () => {
      // Set a low limit for test speed
      useUndoRedoStore.setState({ maxSnapshotCount: 5 });

      for (let i = 0; i < 8; i++) {
        // Modify the state each time to avoid dedup
        const layer = createDefaultLayer({ id: `layer-${i}`, name: `Layer ${i}` });
        act(() => {
          useDocumentStore.getState().addLayer(layer);
        });
        act(() => {
          useUndoRedoStore.getState().takeSnapshot();
        });
      }

      expect(useUndoRedoStore.getState().undoStack).toHaveLength(5);

      // The oldest snapshots should have been dropped - verify the first
      // snapshot in the stack contains layers beyond the first ones
      const firstSnapshot = JSON.parse(useUndoRedoStore.getState().undoStack[0]);
      // After 8 additions with limit 5, the 3 oldest are dropped.
      // The first remaining snapshot should have layers 0..3 (4 layers)
      expect(firstSnapshot.length).toBeGreaterThanOrEqual(4);
    });

    it('enforces default limit of 30', () => {
      for (let i = 0; i < 35; i++) {
        const layer = createDefaultLayer({ id: `l-${i}`, name: `L ${i}` });
        act(() => {
          useDocumentStore.getState().addLayer(layer);
        });
        act(() => {
          useUndoRedoStore.getState().takeSnapshot();
        });
      }

      expect(useUndoRedoStore.getState().undoStack).toHaveLength(30);
    });
  });

  // -----------------------------------------------------------------------
  // Undo
  // -----------------------------------------------------------------------
  describe('undo', () => {
    it('restores previous state', () => {
      // Add first layer
      const layer1 = createDefaultLayer({ id: 'layer1', name: 'First' });
      act(() => {
        useDocumentStore.getState().addLayer(layer1);
      });

      // Snapshot BEFORE adding second layer (captures state: [layer1])
      act(() => {
        useUndoRedoStore.getState().takeSnapshot();
      });

      // Add second layer (current state: [layer1, layer2])
      const layer2 = createDefaultLayer({ id: 'layer2', name: 'Second' });
      act(() => {
        useDocumentStore.getState().addLayer(layer2);
      });

      // Now undo should restore [layer1]
      act(() => {
        useUndoRedoStore.getState().undo();
      });

      const layers = useDocumentStore.getState().project.layers;
      expect(layers).toHaveLength(1);
      expect(layers[0].id).toBe('layer1');
      expect(layers[0].name).toBe('First');
    });

    it('does nothing when undo stack is empty', () => {
      const layer = createDefaultLayer({ id: 'layer1', name: 'Only' });
      act(() => {
        useDocumentStore.getState().addLayer(layer);
      });

      act(() => {
        useUndoRedoStore.getState().undo();
      });

      // State unchanged
      expect(useDocumentStore.getState().project.layers).toHaveLength(1);
    });

    it('canUndo returns true when stack has entries', () => {
      act(() => {
        useUndoRedoStore.getState().takeSnapshot();
      });
      expect(useUndoRedoStore.getState().canUndo()).toBe(true);
    });

    it('canUndo returns false when stack is empty', () => {
      expect(useUndoRedoStore.getState().canUndo()).toBe(false);
    });

    it('preserves selection for layers that still exist after undo', () => {
      // State: [layer1]
      const layer1 = createDefaultLayer({ id: 'layer1', name: 'First' });
      act(() => {
        useDocumentStore.getState().addLayer(layer1);
      });

      // Snapshot before adding layer2 (captures: [layer1])
      act(() => {
        useUndoRedoStore.getState().takeSnapshot();
      });

      // Add layer2 and select it
      const layer2 = createDefaultLayer({ id: 'layer2', name: 'Second' });
      act(() => {
        useDocumentStore.getState().addLayer(layer2);
        useDocumentStore.getState().selectLayer('layer2');
      });

      // Undo: restores [layer1], layer2 is gone
      act(() => {
        useUndoRedoStore.getState().undo();
      });

      // layer2 no longer exists, so selectedLayerIds should not contain it
      expect(useDocumentStore.getState().selectedLayerIds).not.toContain('layer2');
    });
  });

  // -----------------------------------------------------------------------
  // Redo
  // -----------------------------------------------------------------------
  describe('redo', () => {
    it('re-applies undone state', () => {
      // State: [layer1]
      const layer1 = createDefaultLayer({ id: 'layer1', name: 'First' });
      act(() => {
        useDocumentStore.getState().addLayer(layer1);
      });

      // Snapshot before adding layer2 (captures: [layer1])
      act(() => {
        useUndoRedoStore.getState().takeSnapshot();
      });

      // Add layer2 (current state: [layer1, layer2])
      const layer2 = createDefaultLayer({ id: 'layer2', name: 'Second' });
      act(() => {
        useDocumentStore.getState().addLayer(layer2);
      });

      // Undo (back to [layer1])
      act(() => {
        useUndoRedoStore.getState().undo();
      });
      expect(useDocumentStore.getState().project.layers).toHaveLength(1);

      // Redo (back to [layer1, layer2])
      act(() => {
        useUndoRedoStore.getState().redo();
      });
      const layers = useDocumentStore.getState().project.layers;
      expect(layers).toHaveLength(2);
      expect(layers[0].id).toBe('layer1');
      expect(layers[1].id).toBe('layer2');
    });

    it('does nothing when redo stack is empty', () => {
      const layer = createDefaultLayer({ id: 'layer1', name: 'Only' });
      act(() => {
        useDocumentStore.getState().addLayer(layer);
      });

      act(() => {
        useUndoRedoStore.getState().redo();
      });

      expect(useDocumentStore.getState().project.layers).toHaveLength(1);
    });

    it('canRedo returns true after an undo', () => {
      act(() => {
        useUndoRedoStore.getState().takeSnapshot();
      });
      act(() => {
        useUndoRedoStore.getState().undo();
      });
      expect(useUndoRedoStore.getState().canRedo()).toBe(true);
    });

    it('canRedo returns false when stack is empty', () => {
      expect(useUndoRedoStore.getState().canRedo()).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Clear
  // -----------------------------------------------------------------------
  describe('clear', () => {
    it('resets both stacks', () => {
      // Build up some state
      const layer1 = createDefaultLayer({ id: 'l1' });
      act(() => {
        useDocumentStore.getState().addLayer(layer1);
      });
      act(() => {
        useUndoRedoStore.getState().takeSnapshot();
      });

      const layer2 = createDefaultLayer({ id: 'l2' });
      act(() => {
        useDocumentStore.getState().addLayer(layer2);
      });
      act(() => {
        useUndoRedoStore.getState().takeSnapshot();
      });

      act(() => {
        useUndoRedoStore.getState().undo();
      });

      // Both stacks should have entries
      expect(useUndoRedoStore.getState().undoStack.length).toBeGreaterThan(0);
      expect(useUndoRedoStore.getState().redoStack.length).toBeGreaterThan(0);

      // Clear
      act(() => {
        useUndoRedoStore.getState().clear();
      });

      expect(useUndoRedoStore.getState().undoStack).toHaveLength(0);
      expect(useUndoRedoStore.getState().redoStack).toHaveLength(0);
      expect(useUndoRedoStore.getState().lastHash).toBe('');
    });
  });
});

// ===========================================================================
// CLIPBOARD TESTS
// ===========================================================================

describe('useClipboard', () => {
  beforeEach(() => {
    resetStores();
  });

  // -----------------------------------------------------------------------
  // Copy / Paste ID remapping
  // -----------------------------------------------------------------------
  describe('copy and paste', () => {
    it('remaps all IDs on paste', () => {
      const { result } = renderHook(() => useClipboard());

      const layers: ClipboardLayer[] = [
        { id: 'orig-1', type: 'image', name: 'Image 1', x: 10, y: 20, width: 100, height: 100 },
        { id: 'orig-2', type: 'text', name: 'Text 1', x: 30, y: 40, width: 200, height: 50 },
      ];

      act(() => {
        result.current.copy(layers);
      });

      let pasted: ClipboardLayer[] = [];
      act(() => {
        pasted = result.current.paste();
      });

      expect(pasted).toHaveLength(2);
      // IDs should be new
      expect(pasted[0].id).not.toBe('orig-1');
      expect(pasted[1].id).not.toBe('orig-2');
      // IDs should be unique
      expect(pasted[0].id).not.toBe(pasted[1].id);
    });

    it('offsets position by +20,+20 on first paste', () => {
      const { result } = renderHook(() => useClipboard());

      const layers: ClipboardLayer[] = [
        { id: 'orig-1', type: 'image', name: 'Image 1', x: 10, y: 20, width: 100, height: 100 },
      ];

      act(() => {
        result.current.copy(layers);
      });

      let pasted: ClipboardLayer[] = [];
      act(() => {
        pasted = result.current.paste();
      });

      expect(pasted[0].x).toBe(30); // 10 + 20
      expect(pasted[0].y).toBe(40); // 20 + 20
    });

    it('cascades offset on successive pastes', () => {
      const { result } = renderHook(() => useClipboard());

      const layers: ClipboardLayer[] = [
        { id: 'orig-1', type: 'image', name: 'Image 1', x: 0, y: 0, width: 100, height: 100 },
      ];

      act(() => {
        result.current.copy(layers);
      });

      let paste1: ClipboardLayer[] = [];
      let paste2: ClipboardLayer[] = [];
      act(() => {
        paste1 = result.current.paste();
      });
      act(() => {
        paste2 = result.current.paste();
      });

      expect(paste1[0].x).toBe(20); // 0 + 20*1
      expect(paste2[0].x).toBe(40); // 0 + 20*2
    });

    it('guards against super-locked layers', () => {
      const { result } = renderHook(() => useClipboard());

      const layers: ClipboardLayer[] = [
        { id: 'locked-1', type: 'image', name: 'Locked', x: 0, y: 0, width: 100, height: 100, superLocked: true },
      ];

      act(() => {
        result.current.copy(layers);
      });

      // Should not have any pasteable content
      expect(result.current.canPaste).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Group paste with parentGroupId remapping
  // -----------------------------------------------------------------------
  describe('group paste', () => {
    it('remaps parentGroupId hierarchy on paste', () => {
      const { result } = renderHook(() => useClipboard());

      const groupLayer: ClipboardLayer = {
        id: 'group-1',
        type: 'group',
        name: 'Group',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        childIds: ['child-1', 'child-2'],
        parentGroupId: null,
        depth: 0,
      };
      const child1: ClipboardLayer = {
        id: 'child-1',
        type: 'image',
        name: 'Child 1',
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        parentGroupId: 'group-1',
        depth: 1,
      };
      const child2: ClipboardLayer = {
        id: 'child-2',
        type: 'text',
        name: 'Child 2',
        x: 60,
        y: 60,
        width: 80,
        height: 30,
        parentGroupId: 'group-1',
        depth: 1,
      };

      const allLayers = [groupLayer, child1, child2];

      act(() => {
        result.current.copy([groupLayer], allLayers);
      });

      let pasted: ClipboardLayer[] = [];
      act(() => {
        pasted = result.current.paste();
      });

      // Should have 3 layers (group + 2 children)
      expect(pasted).toHaveLength(3);

      // Find the pasted group and children
      const pastedGroup = pasted.find((l) => l.type === 'group')!;
      const pastedChildren = pasted.filter((l) => l.type !== 'group');

      // All IDs should be new
      expect(pastedGroup.id).not.toBe('group-1');
      expect(pastedChildren[0].id).not.toBe('child-1');
      expect(pastedChildren[1].id).not.toBe('child-2');

      // parentGroupId should point to new group ID
      for (const child of pastedChildren) {
        expect(child.parentGroupId).toBe(pastedGroup.id);
      }

      // Group's childIds should reference new child IDs
      const pastedChildIds = pastedGroup.childIds as string[];
      expect(pastedChildIds).toContain(pastedChildren[0].id);
      expect(pastedChildIds).toContain(pastedChildren[1].id);
    });
  });

  // -----------------------------------------------------------------------
  // Max depth enforcement
  // -----------------------------------------------------------------------
  describe('max depth enforcement', () => {
    it('enforces max depth 2 on paste', () => {
      const { result } = renderHook(() => useClipboard());

      const layers: ClipboardLayer[] = [
        { id: 'deep-1', type: 'image', name: 'Deep', x: 0, y: 0, width: 100, height: 100, depth: 5, parentGroupId: null },
      ];

      act(() => {
        result.current.copy(layers);
      });

      let pasted: ClipboardLayer[] = [];
      act(() => {
        pasted = result.current.paste();
      });

      expect(pasted[0].depth).toBeLessThanOrEqual(2);
    });
  });

  // -----------------------------------------------------------------------
  // Paste image
  // -----------------------------------------------------------------------
  describe('pasteImage', () => {
    it('creates a new image layer from clipboard image data', () => {
      const { result } = renderHook(() => useClipboard());

      let imageLayer: ClipboardLayer | undefined;
      act(() => {
        imageLayer = result.current.pasteImage('base64data', 800, 600);
      });

      expect(imageLayer).toBeDefined();
      expect(imageLayer!.type).toBe('image');
      expect(imageLayer!.name).toBe('Pasted Image');
      expect(imageLayer!.width).toBe(800);
      expect(imageLayer!.height).toBe(600);
      expect(imageLayer!.imageData).toBe('base64data');
      expect(imageLayer!.id).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // Duplicate
  // -----------------------------------------------------------------------
  describe('duplicate', () => {
    it('creates independent copy above original', () => {
      const { result } = renderHook(() => useClipboard());

      const original: ClipboardLayer = {
        id: 'orig-1',
        type: 'image',
        name: 'My Image',
        x: 100,
        y: 200,
        width: 300,
        height: 400,
      };

      let duplicated: ClipboardLayer[] = [];
      act(() => {
        duplicated = result.current.duplicate([original], [original]);
      });

      expect(duplicated).toHaveLength(1);
      // New ID
      expect(duplicated[0].id).not.toBe('orig-1');
      // Offset by +20,+20
      expect(duplicated[0].x).toBe(120); // 100 + 20
      expect(duplicated[0].y).toBe(220); // 200 + 20
      // Unique name
      expect(duplicated[0].name).toContain('Copy');
      expect(duplicated[0].name).not.toBe('My Image');
    });

    it('duplicates group with descendants and remaps parentGroupId', () => {
      const { result } = renderHook(() => useClipboard());

      const group: ClipboardLayer = {
        id: 'grp-1',
        type: 'group',
        name: 'Group',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        childIds: ['ch-1'],
        parentGroupId: null,
        depth: 0,
      };
      const child: ClipboardLayer = {
        id: 'ch-1',
        type: 'image',
        name: 'Child',
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        parentGroupId: 'grp-1',
        depth: 1,
      };

      const allLayers = [group, child];

      let duplicated: ClipboardLayer[] = [];
      act(() => {
        duplicated = result.current.duplicate([group], allLayers);
      });

      // Should have group + child
      expect(duplicated).toHaveLength(2);

      const dupGroup = duplicated.find((l) => l.type === 'group')!;
      const dupChild = duplicated.find((l) => l.type !== 'group')!;

      // New IDs
      expect(dupGroup.id).not.toBe('grp-1');
      expect(dupChild.id).not.toBe('ch-1');

      // Child's parentGroupId should point to new group
      expect(dupChild.parentGroupId).toBe(dupGroup.id);

      // Group's childIds should reference new child
      expect(dupGroup.childIds).toContain(dupChild.id);
    });

    it('creates truly independent copy (mutations do not affect original)', () => {
      const { result } = renderHook(() => useClipboard());

      const original: ClipboardLayer = {
        id: 'orig-1',
        type: 'image',
        name: 'Original',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        someNestedData: { value: 42 },
      };

      let duplicated: ClipboardLayer[] = [];
      act(() => {
        duplicated = result.current.duplicate([original], [original]);
      });

      // Mutate the duplicate
      duplicated[0].x = 999;
      (duplicated[0].someNestedData as { value: number }).value = 0;

      // Original should be unchanged
      expect(original.x).toBe(50);
      expect((original.someNestedData as { value: number }).value).toBe(42);
    });
  });
});
