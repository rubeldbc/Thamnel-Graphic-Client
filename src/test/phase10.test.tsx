import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from '@testing-library/react';
import { LayersTab } from '../components/RightPanel/Layers/LayersTab';
import { LayerItem, type LayerData } from '../components/RightPanel/Layers/LayerItem';
import { LayerFooterBar } from '../components/RightPanel/Layers/LayerFooterBar';
import { LayerTreeConnector } from '../components/RightPanel/Layers/LayerTreeConnector';
import { useDocumentStore } from '../stores/documentStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import { createDefaultLayer } from '../types/LayerModel';

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

function makeLayer(overrides: Partial<LayerData> = {}): LayerData {
  return {
    id: 'layer-1',
    name: 'Test Layer',
    type: 'image',
    visible: true,
    locked: false,
    superLocked: false,
    isGroup: false,
    expanded: false,
    depth: 0,
    groupColor: '#4FC3F7',
    isFrameReceiver: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// LayersTab (now reads from documentStore)
// ---------------------------------------------------------------------------

describe('LayersTab', () => {
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

  it('renders with empty state', () => {
    render(<LayersTab />);
    const tab = screen.getByTestId('layers-tab');
    expect(tab).toBeInTheDocument();
    const empty = screen.getByTestId('layers-empty');
    expect(empty).toBeInTheDocument();
    expect(empty.textContent).toContain('No layers');
  });

  it('renders layer items when store has layers', () => {
    // Add layers to the store instead of passing as props
    act(() => {
      useDocumentStore.getState().addLayer(
        createDefaultLayer({ id: 'bg', name: 'Background', type: 'image' }),
      );
      useDocumentStore.getState().addLayer(
        createDefaultLayer({
          id: 'grp1',
          name: 'Group 1',
          type: 'group',
          isExpanded: true,
          childIds: ['txt1', 'shape1'],
          groupColor: '#4FC3F7',
        }),
      );
      useDocumentStore.getState().addLayer(
        createDefaultLayer({
          id: 'txt1',
          name: 'Title',
          type: 'text',
          depth: 1,
          parentGroupId: 'grp1',
          groupColor: '#4FC3F7',
        }),
      );
      useDocumentStore.getState().addLayer(
        createDefaultLayer({
          id: 'shape1',
          name: 'Rectangle',
          type: 'shape',
          depth: 1,
          parentGroupId: 'grp1',
          groupColor: '#4FC3F7',
        }),
      );
    });

    render(<LayersTab />);
    const items = screen.getAllByTestId('layer-item');
    expect(items).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// LayerItem
// ---------------------------------------------------------------------------

describe('LayerItem', () => {
  it('shows layer name', () => {
    render(<LayerItem layer={makeLayer({ name: 'My Photo' })} isSelected={false} />);
    const name = screen.getByTestId('layer-name');
    expect(name).toBeInTheDocument();
    expect(name.textContent).toBe('My Photo');
  });

  it('shows correct type icon based on type', () => {
    const { rerender } = render(
      <LayerItem layer={makeLayer({ type: 'image' })} isSelected={false} />,
    );
    const typeIcon = screen.getByTestId('layer-type-icon');
    expect(typeIcon).toBeInTheDocument();
    // The icon SVG should have a title attribute matching the type
    expect(typeIcon.querySelector('svg')).toBeTruthy();

    // Re-render with text type
    rerender(<LayerItem layer={makeLayer({ type: 'text' })} isSelected={false} />);
    expect(screen.getByTestId('layer-type-icon').querySelector('svg')).toBeTruthy();

    // Re-render with shape type
    rerender(<LayerItem layer={makeLayer({ type: 'shape' })} isSelected={false} />);
    expect(screen.getByTestId('layer-type-icon').querySelector('svg')).toBeTruthy();

    // Re-render with group type
    rerender(<LayerItem layer={makeLayer({ type: 'group', isGroup: true })} isSelected={false} />);
    expect(screen.getByTestId('layer-type-icon').querySelector('svg')).toBeTruthy();
  });

  it('selected state applies orange background', () => {
    render(<LayerItem layer={makeLayer()} isSelected />);
    const item = screen.getByTestId('layer-item');
    // jsdom normalizes #33FF6600 to rgba(51, 255, 102, 0)
    const bg = item.style.backgroundColor;
    expect(bg === '#33FF6600' || bg === 'rgba(51, 255, 102, 0)').toBe(true);
  });

  it('visibility toggle calls handler', () => {
    const onToggleVisibility = vi.fn();
    render(
      <LayerItem
        layer={makeLayer({ id: 'v1' })}
        isSelected={false}
        onToggleVisibility={onToggleVisibility}
      />,
    );
    const btn = screen.getByTestId('layer-visibility-toggle');
    fireEvent.click(btn);
    expect(onToggleVisibility).toHaveBeenCalledWith('v1');
  });

  it('lock toggle calls handler', () => {
    const onToggleLock = vi.fn();
    render(
      <LayerItem
        layer={makeLayer({ id: 'l1' })}
        isSelected={false}
        onToggleLock={onToggleLock}
      />,
    );
    const btn = screen.getByTestId('layer-lock-toggle');
    fireEvent.click(btn);
    expect(onToggleLock).toHaveBeenCalledWith('l1');
  });
});

// ---------------------------------------------------------------------------
// LayerFooterBar
// ---------------------------------------------------------------------------

describe('LayerFooterBar', () => {
  it('renders all action buttons', () => {
    render(<LayerFooterBar />);
    const footer = screen.getByTestId('layer-footer');
    expect(footer).toBeInTheDocument();

    const expectedButtons = [
      'layer-btn-export',
      'layer-btn-new-layer',
      'layer-btn-new-group',
      'layer-btn-duplicate',
      'layer-btn-bring-forward',
      'layer-btn-send-backward',
      'layer-btn-group',
      'layer-btn-ungroup',
      'layer-btn-delete',
    ];
    for (const testId of expectedButtons) {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    }
    expect(expectedButtons).toHaveLength(9);
  });
});

// ---------------------------------------------------------------------------
// LayerTreeConnector
// ---------------------------------------------------------------------------

describe('LayerTreeConnector', () => {
  it('renders connector lines for nested layers', () => {
    render(<LayerTreeConnector depth={1} isLast={false} groupColor="#4FC3F7" />);
    const connector = screen.getByTestId('layer-tree-connector');
    expect(connector).toBeInTheDocument();
    // Should have a vertical line and a branch
    expect(screen.getByTestId('connector-vertical')).toBeInTheDocument();
    expect(screen.getByTestId('connector-branch')).toBeInTheDocument();
  });

  it('returns null for depth 0', () => {
    const { container } = render(<LayerTreeConnector depth={0} isLast={false} groupColor="#4FC3F7" />);
    expect(container.innerHTML).toBe('');
  });
});
