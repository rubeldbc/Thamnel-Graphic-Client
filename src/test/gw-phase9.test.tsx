import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from '@testing-library/react';
import { useDocumentStore } from '../stores/documentStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import { createDefaultLayer } from '../types/LayerModel';
import { LayersTab } from '../components/RightPanel/Layers/LayersTab';
import type { LayerModel } from '../types/LayerModel';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function addLayerToStore(overrides?: Partial<LayerModel>): LayerModel {
  const layer = createDefaultLayer(overrides);
  act(() => {
    useDocumentStore.getState().addLayer(layer);
  });
  return layer;
}

// ---------------------------------------------------------------------------
// Mock pointer event methods required by @dnd-kit PointerSensor
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetStores();
  // jsdom does not implement setPointerCapture / releasePointerCapture
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn();
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn();
  }
});

// ===========================================================================
// Tests
// ===========================================================================

describe('GW Phase 9 -- Layer Panel (Layers Tab)', () => {
  // =========================================================================
  // 9A -- Layer list renders layers from store
  // =========================================================================
  describe('Layer list renders layers from store', () => {
    it('shows "No layers" when store is empty', () => {
      render(<LayersTab />);
      expect(screen.getByTestId('layers-empty')).toBeInTheDocument();
      expect(screen.getByText('No layers')).toBeInTheDocument();
    });

    it('renders layer items when store has layers', () => {
      addLayerToStore({ id: 'layer-1', name: 'Background', type: 'image' });
      addLayerToStore({ id: 'layer-2', name: 'Text Overlay', type: 'text' });
      addLayerToStore({ id: 'layer-3', name: 'Logo Shape', type: 'shape' });

      render(<LayersTab />);

      const items = screen.getAllByTestId('layer-item');
      expect(items).toHaveLength(3);

      // Check names are displayed
      expect(screen.getByText('Background')).toBeInTheDocument();
      expect(screen.getByText('Text Overlay')).toBeInTheDocument();
      expect(screen.getByText('Logo Shape')).toBeInTheDocument();
    });

    it('renders correct number of layers after adding/removing', () => {
      addLayerToStore({ id: 'a', name: 'A' });
      addLayerToStore({ id: 'b', name: 'B' });

      const { rerender } = render(<LayersTab />);
      expect(screen.getAllByTestId('layer-item')).toHaveLength(2);

      // Remove one
      act(() => {
        useDocumentStore.getState().removeLayer('a');
      });
      rerender(<LayersTab />);
      expect(screen.getAllByTestId('layer-item')).toHaveLength(1);
      expect(screen.getByText('B')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Click selects a layer
  // =========================================================================
  describe('Click selects a layer', () => {
    it('single click selects one layer', () => {
      addLayerToStore({ id: 'sel-1', name: 'Layer 1' });
      addLayerToStore({ id: 'sel-2', name: 'Layer 2' });

      render(<LayersTab />);

      const items = screen.getAllByTestId('layer-item');
      fireEvent.click(items[0]);

      expect(useDocumentStore.getState().selectedLayerIds).toEqual(['sel-1']);
    });

    it('clicking a different layer deselects previous', () => {
      addLayerToStore({ id: 'sel-1', name: 'Layer 1' });
      addLayerToStore({ id: 'sel-2', name: 'Layer 2' });

      render(<LayersTab />);

      const items = screen.getAllByTestId('layer-item');
      fireEvent.click(items[0]);
      expect(useDocumentStore.getState().selectedLayerIds).toEqual(['sel-1']);

      fireEvent.click(items[1]);
      expect(useDocumentStore.getState().selectedLayerIds).toEqual(['sel-2']);
    });

    it('shift+click multi-selects a range', () => {
      addLayerToStore({ id: 'r-1', name: 'L1' });
      addLayerToStore({ id: 'r-2', name: 'L2' });
      addLayerToStore({ id: 'r-3', name: 'L3' });

      render(<LayersTab />);

      const items = screen.getAllByTestId('layer-item');

      // Click first
      fireEvent.click(items[0]);
      expect(useDocumentStore.getState().selectedLayerIds).toEqual(['r-1']);

      // Shift+click third
      fireEvent.click(items[2], { shiftKey: true });
      const selected = useDocumentStore.getState().selectedLayerIds;
      expect(selected).toHaveLength(3);
      expect(selected).toContain('r-1');
      expect(selected).toContain('r-2');
      expect(selected).toContain('r-3');
    });
  });

  // =========================================================================
  // Visibility toggle works
  // =========================================================================
  describe('Visibility toggle works', () => {
    it('toggles layer visibility on click', () => {
      addLayerToStore({ id: 'vis-1', name: 'Visible Layer', visible: true });

      render(<LayersTab />);

      const visBtn = screen.getByTestId('layer-visibility-toggle');
      fireEvent.click(visBtn);

      const layer = useDocumentStore.getState().project.layers.find((l) => l.id === 'vis-1');
      expect(layer?.visible).toBe(false);
    });

    it('toggling group visibility toggles all descendants', () => {
      addLayerToStore({
        id: 'grp-1',
        name: 'Group',
        type: 'group',
        visible: true,
        isExpanded: true,
        childIds: ['child-1', 'child-2'],
      });
      addLayerToStore({
        id: 'child-1',
        name: 'Child 1',
        type: 'image',
        visible: true,
        parentGroupId: 'grp-1',
        depth: 1,
      });
      addLayerToStore({
        id: 'child-2',
        name: 'Child 2',
        type: 'text',
        visible: true,
        parentGroupId: 'grp-1',
        depth: 1,
      });

      render(<LayersTab />);

      // Click the group's visibility toggle (first one is the group)
      const visBtns = screen.getAllByTestId('layer-visibility-toggle');
      fireEvent.click(visBtns[0]); // Group toggle

      const layers = useDocumentStore.getState().project.layers;
      expect(layers.find((l) => l.id === 'grp-1')?.visible).toBe(false);
      expect(layers.find((l) => l.id === 'child-1')?.visible).toBe(false);
      expect(layers.find((l) => l.id === 'child-2')?.visible).toBe(false);
    });
  });

  // =========================================================================
  // Lock toggle works
  // =========================================================================
  describe('Lock toggle works', () => {
    it('toggles layer locked state', () => {
      addLayerToStore({ id: 'lock-1', name: 'Lockable', locked: false });

      render(<LayersTab />);

      const lockBtn = screen.getByTestId('layer-lock-toggle');
      fireEvent.click(lockBtn);

      const layer = useDocumentStore.getState().project.layers.find((l) => l.id === 'lock-1');
      expect(layer?.locked).toBe(true);
    });

    it('toggling lock again unlocks', () => {
      addLayerToStore({ id: 'lock-2', name: 'Locked', locked: true });

      render(<LayersTab />);

      const lockBtn = screen.getByTestId('layer-lock-toggle');
      fireEvent.click(lockBtn);

      const layer = useDocumentStore.getState().project.layers.find((l) => l.id === 'lock-2');
      expect(layer?.locked).toBe(false);
    });
  });

  // =========================================================================
  // Footer buttons work
  // =========================================================================
  describe('Footer buttons', () => {
    it('New Layer button adds a layer to the store', () => {
      render(<LayersTab />);

      const btn = screen.getByTestId('layer-btn-new-layer');
      fireEvent.click(btn);

      const layers = useDocumentStore.getState().project.layers;
      expect(layers).toHaveLength(1);
      expect(layers[0].type).toBe('image');
    });

    it('New Group button adds a group layer', () => {
      render(<LayersTab />);

      const btn = screen.getByTestId('layer-btn-new-group');
      fireEvent.click(btn);

      const layers = useDocumentStore.getState().project.layers;
      expect(layers).toHaveLength(1);
      expect(layers[0].type).toBe('group');
    });

    it('Delete button removes selected layer', () => {
      addLayerToStore({ id: 'del-1', name: 'To Delete' });
      act(() => {
        useDocumentStore.getState().selectLayer('del-1');
      });

      render(<LayersTab />);

      const btn = screen.getByTestId('layer-btn-delete');
      fireEvent.click(btn);

      const layers = useDocumentStore.getState().project.layers;
      expect(layers).toHaveLength(0);
    });

    it('Duplicate button clones the selected layer', () => {
      addLayerToStore({ id: 'dup-1', name: 'Original' });
      act(() => {
        useDocumentStore.getState().selectLayer('dup-1');
      });

      render(<LayersTab />);

      const btn = screen.getByTestId('layer-btn-duplicate');
      fireEvent.click(btn);

      const layers = useDocumentStore.getState().project.layers;
      expect(layers).toHaveLength(2);
      // The duplicate should have a different id
      expect(layers[1].id).not.toBe('dup-1');
      // The duplicate should have an offset position
      expect(layers[1].x).toBe(layers[0].x + 20);
      expect(layers[1].y).toBe(layers[0].y + 20);
    });

    it('Bring Forward button moves selected layer up', () => {
      addLayerToStore({ id: 'fwd-1', name: 'First' });
      addLayerToStore({ id: 'fwd-2', name: 'Second' });
      act(() => {
        useDocumentStore.getState().selectLayer('fwd-2');
      });

      render(<LayersTab />);

      const btn = screen.getByTestId('layer-btn-bring-forward');
      fireEvent.click(btn);

      const layers = useDocumentStore.getState().project.layers;
      expect(layers[0].id).toBe('fwd-2');
      expect(layers[1].id).toBe('fwd-1');
    });

    it('Send Backward button moves selected layer down', () => {
      addLayerToStore({ id: 'bwd-1', name: 'First' });
      addLayerToStore({ id: 'bwd-2', name: 'Second' });
      act(() => {
        useDocumentStore.getState().selectLayer('bwd-1');
      });

      render(<LayersTab />);

      const btn = screen.getByTestId('layer-btn-send-backward');
      fireEvent.click(btn);

      const layers = useDocumentStore.getState().project.layers;
      expect(layers[0].id).toBe('bwd-2');
      expect(layers[1].id).toBe('bwd-1');
    });

    it('all 9 footer buttons are rendered', () => {
      render(<LayersTab />);

      expect(screen.getByTestId('layer-btn-export')).toBeInTheDocument();
      expect(screen.getByTestId('layer-btn-new-layer')).toBeInTheDocument();
      expect(screen.getByTestId('layer-btn-new-group')).toBeInTheDocument();
      expect(screen.getByTestId('layer-btn-duplicate')).toBeInTheDocument();
      expect(screen.getByTestId('layer-btn-bring-forward')).toBeInTheDocument();
      expect(screen.getByTestId('layer-btn-send-backward')).toBeInTheDocument();
      expect(screen.getByTestId('layer-btn-group')).toBeInTheDocument();
      expect(screen.getByTestId('layer-btn-ungroup')).toBeInTheDocument();
      expect(screen.getByTestId('layer-btn-delete')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Layer name rendering
  // =========================================================================
  describe('Layer name rendering', () => {
    it('displays layer names correctly', () => {
      addLayerToStore({ id: 'n-1', name: 'My Background' });
      addLayerToStore({ id: 'n-2', name: 'Title Text' });

      render(<LayersTab />);

      const names = screen.getAllByTestId('layer-name');
      expect(names).toHaveLength(2);
      expect(names[0].textContent).toBe('My Background');
      expect(names[1].textContent).toBe('Title Text');
    });

    it('shows layer type icons', () => {
      addLayerToStore({ id: 'ti-1', name: 'Image', type: 'image' });
      addLayerToStore({ id: 'ti-2', name: 'Text', type: 'text' });
      addLayerToStore({ id: 'ti-3', name: 'Shape', type: 'shape' });

      render(<LayersTab />);

      const typeIcons = screen.getAllByTestId('layer-type-icon');
      expect(typeIcons).toHaveLength(3);
    });

    it('shows super lock icon when layer is superLocked', () => {
      addLayerToStore({ id: 'sl-1', name: 'Super Locked', superLocked: true });
      addLayerToStore({ id: 'sl-2', name: 'Normal', superLocked: false });

      render(<LayersTab />);

      const superLockIcons = screen.getAllByTestId('layer-super-lock');
      expect(superLockIcons).toHaveLength(1);
    });

    it('shows thumbnail placeholders', () => {
      addLayerToStore({ id: 'th-1', name: 'Layer 1' });

      render(<LayersTab />);

      const thumbnails = screen.getAllByTestId('layer-thumbnail');
      expect(thumbnails).toHaveLength(1);
    });
  });

  // =========================================================================
  // Group expand/collapse
  // =========================================================================
  describe('Group expand/collapse', () => {
    it('shows expand toggle for group layers', () => {
      addLayerToStore({
        id: 'grp-e1',
        name: 'My Group',
        type: 'group',
        isExpanded: false,
        childIds: ['ch-e1'],
      });
      addLayerToStore({
        id: 'ch-e1',
        name: 'Child',
        type: 'image',
        parentGroupId: 'grp-e1',
        depth: 1,
      });

      render(<LayersTab />);

      const expandToggle = screen.getByTestId('layer-expand-toggle');
      expect(expandToggle).toBeInTheDocument();
    });

    it('hides children when group is collapsed', () => {
      addLayerToStore({
        id: 'grp-c1',
        name: 'Collapsed Group',
        type: 'group',
        isExpanded: false,
        childIds: ['ch-c1'],
      });
      addLayerToStore({
        id: 'ch-c1',
        name: 'Hidden Child',
        type: 'image',
        parentGroupId: 'grp-c1',
        depth: 1,
      });

      render(<LayersTab />);

      // Only the group should be visible, child is hidden
      const items = screen.getAllByTestId('layer-item');
      expect(items).toHaveLength(1);
      expect(screen.getByText('Collapsed Group')).toBeInTheDocument();
      expect(screen.queryByText('Hidden Child')).not.toBeInTheDocument();
    });

    it('shows children when group is expanded', () => {
      addLayerToStore({
        id: 'grp-x1',
        name: 'Expanded Group',
        type: 'group',
        isExpanded: true,
        childIds: ['ch-x1'],
      });
      addLayerToStore({
        id: 'ch-x1',
        name: 'Visible Child',
        type: 'image',
        parentGroupId: 'grp-x1',
        depth: 1,
      });

      render(<LayersTab />);

      const items = screen.getAllByTestId('layer-item');
      expect(items).toHaveLength(2);
      expect(screen.getByText('Expanded Group')).toBeInTheDocument();
      expect(screen.getByText('Visible Child')).toBeInTheDocument();
    });

    it('clicking expand toggle changes isExpanded in store', () => {
      addLayerToStore({
        id: 'grp-t1',
        name: 'Toggle Group',
        type: 'group',
        isExpanded: false,
        childIds: [],
      });

      render(<LayersTab />);

      const expandToggle = screen.getByTestId('layer-expand-toggle');
      fireEvent.click(expandToggle);

      const layer = useDocumentStore.getState().project.layers.find((l) => l.id === 'grp-t1');
      expect(layer?.isExpanded).toBe(true);
    });
  });

  // =========================================================================
  // Undo snapshots are taken
  // =========================================================================
  describe('Undo snapshots', () => {
    it('takes snapshot before visibility toggle', () => {
      addLayerToStore({ id: 'snap-1', name: 'Layer', visible: true });

      render(<LayersTab />);

      const visBtn = screen.getByTestId('layer-visibility-toggle');
      fireEvent.click(visBtn);

      // Undo stack should have an entry
      expect(useUndoRedoStore.getState().undoStack.length).toBeGreaterThan(0);
    });

    it('takes snapshot before lock toggle', () => {
      addLayerToStore({ id: 'snap-2', name: 'Layer', locked: false });

      render(<LayersTab />);

      const lockBtn = screen.getByTestId('layer-lock-toggle');
      fireEvent.click(lockBtn);

      expect(useUndoRedoStore.getState().undoStack.length).toBeGreaterThan(0);
    });

    it('takes snapshot before adding new layer', () => {
      render(<LayersTab />);

      const btn = screen.getByTestId('layer-btn-new-layer');
      fireEvent.click(btn);

      expect(useUndoRedoStore.getState().undoStack.length).toBeGreaterThan(0);
    });

    it('takes snapshot before delete', () => {
      addLayerToStore({ id: 'snap-3', name: 'Layer' });
      act(() => {
        useDocumentStore.getState().selectLayer('snap-3');
      });

      render(<LayersTab />);

      const btn = screen.getByTestId('layer-btn-delete');
      fireEvent.click(btn);

      expect(useUndoRedoStore.getState().undoStack.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Selection highlighting
  // =========================================================================
  describe('Selection highlighting', () => {
    it('selected layer has orange background style', () => {
      addLayerToStore({ id: 'hl-1', name: 'Highlighted' });
      act(() => {
        useDocumentStore.getState().selectLayer('hl-1');
      });

      render(<LayersTab />);

      const item = screen.getByTestId('layer-item');
      // jsdom normalizes hex to rgba, so check for both formats
      const bg = item.style.backgroundColor;
      expect(
        bg === '#33FF6600' || bg === 'rgba(51, 255, 102, 0)',
      ).toBe(true);
    });

    it('non-selected layer has transparent background', () => {
      addLayerToStore({ id: 'nhl-1', name: 'Not selected' });
      // Do not select

      render(<LayersTab />);

      const item = screen.getByTestId('layer-item');
      expect(item.style.backgroundColor).toBe('transparent');
    });
  });

  // =========================================================================
  // Tree indentation
  // =========================================================================
  describe('Tree indentation', () => {
    it('nested layers have left margin based on depth', () => {
      addLayerToStore({
        id: 'indent-g',
        name: 'Parent',
        type: 'group',
        isExpanded: true,
        childIds: ['indent-c'],
      });
      addLayerToStore({
        id: 'indent-c',
        name: 'Child',
        type: 'image',
        parentGroupId: 'indent-g',
        depth: 1,
      });

      render(<LayersTab />);

      const items = screen.getAllByTestId('layer-item');
      // Parent (depth 0): marginLeft = 0
      expect(items[0].style.marginLeft).toBe('0px');
      // Child (depth 1): marginLeft = 28px
      expect(items[1].style.marginLeft).toBe('28px');
    });
  });
});
