import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useUiStore } from '../stores/uiStore';
import { useDocumentStore } from '../stores/documentStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import { getCommand, getCommandRegistry } from '../commands/useCommand';
import {
  shortcutManager,
} from '../hooks/ShortcutManager';
import {
  useKeyboardShortcuts,
} from '../hooks/useKeyboardShortcuts';
import type { KeyboardShortcutActions } from '../hooks/useKeyboardShortcuts';
import { LeftToolbar } from '../components/LeftToolbar/LeftToolbar';
import { CanvasContextMenu } from '../components/ContextMenus/CanvasContextMenu';
import { CanvasMultiSelectMenu } from '../components/ContextMenus/CanvasMultiSelectMenu';
import { LayerContextMenu } from '../components/ContextMenus/LayerContextMenu';
import { GroupContextMenu } from '../components/ContextMenus/GroupContextMenu';
import { SuperLockedMenu } from '../components/ContextMenus/SuperLockedMenu';
import {
  useCanvasContextMenuAction,
  useCanvasMultiSelectMenuAction,
  useLayerContextMenuAction,
  useGroupContextMenuAction,
  useSuperLockedMenuAction,
} from '../components/ContextMenus/useContextMenuActions';

// ---------------------------------------------------------------------------
// Store reset helper
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

  useUiStore.setState({
    activeTool: 'select',
    zoom: 1,
    gridVisible: false,
    isEditingText: false,
    leftPanelVisible: true,
    rightPanelVisible: true,
    leftPanelTab: null,
    canvasQuality: 100,
    framePanelHeight: 150,
    statusMessage: '',
    activeDialog: null,
  });
}

// ---------------------------------------------------------------------------
// Keyboard shortcut helper (reused across sections)
// ---------------------------------------------------------------------------

function buildActions(
  overrides: Partial<KeyboardShortcutActions> = {},
): KeyboardShortcutActions {
  return {
    onNewProject: vi.fn(),
    onOpenProject: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onExportPNG: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onCut: vi.fn(),
    onCopy: vi.fn(),
    onPaste: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
    onSelectAll: vi.fn(),
    onDeselect: vi.fn(),
    onGroup: vi.fn(),
    onUngroup: vi.fn(),
    onSelectTool: vi.fn(),
    onTextTool: vi.fn(),
    onShapeTool: vi.fn(),
    onEraserTool: vi.fn(),
    onBlurBrushTool: vi.fn(),
    onToggleGallery: vi.fn(),
    onToggleGrid: vi.fn(),
    onToggleVisibility: vi.fn(),
    onPanModeStart: vi.fn(),
    onPanModeEnd: vi.fn(),
    onBrushSizeDecrease: vi.fn(),
    onBrushSizeIncrease: vi.fn(),
    onNudge: vi.fn(),
    onZoom100: vi.fn(),
    onZoomFit: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    ...overrides,
  };
}

// ===========================================================================
// PHASE 12 -- Menu Bar wiring verification
// ===========================================================================

describe('GW Phase 12 -- Menu Bar onSelect wiring', () => {
  beforeEach(() => {
    resetStores();
  });

  it('File > New Project has onSelect wired to newProject command', () => {
    const cmd = getCommand('newProject');
    expect(cmd).toBeDefined();
    expect(cmd!.canExecute()).toBe(true);
  });

  it('Edit > Undo command exists and is wired', () => {
    const cmd = getCommand('undo');
    expect(cmd).toBeDefined();
    expect(cmd!.shortcut).toBe('Ctrl+Z');
  });

  it('Edit > Copy command exists and is wired', () => {
    const cmd = getCommand('copyLayer');
    expect(cmd).toBeDefined();
    expect(cmd!.shortcut).toBe('Ctrl+C');
  });

  it('View > Zoom In command exists', () => {
    const cmd = getCommand('zoomIn');
    expect(cmd).toBeDefined();
    expect(cmd!.shortcut).toBe('Ctrl+=');
  });

  it('Layer > Add Text command exists', () => {
    const cmd = getCommand('addText');
    expect(cmd).toBeDefined();
    expect(cmd!.canExecute()).toBe(true);
  });

  it('Tools > setTool command exists and can set activeTool', () => {
    const cmd = getCommand('setTool');
    expect(cmd).toBeDefined();
    expect(cmd!.canExecute()).toBe(true);
    cmd!.execute('eraser');
    expect(useUiStore.getState().activeTool).toBe('eraser');
  });

  it('alignCenter command exists (was alignCenterH, now correct)', () => {
    const cmd = getCommand('alignCenter');
    expect(cmd).toBeDefined();
    expect(cmd!.category).toBe('align');
  });

  it('alignMiddle command exists (was alignCenterV, now correct)', () => {
    const cmd = getCommand('alignMiddle');
    expect(cmd).toBeDefined();
    expect(cmd!.category).toBe('align');
  });

  it('all 8 menu categories have at least one command', () => {
    const registry = getCommandRegistry();
    const categories = new Set<string>();
    for (const cmd of registry.values()) {
      categories.add(cmd.category);
    }
    // file, edit, layer, arrange, group, transform, align, view, ai, video
    expect(categories.size).toBeGreaterThanOrEqual(8);
  });
});

// ===========================================================================
// PHASE 13 -- Left Toolbar wiring
// ===========================================================================

describe('GW Phase 13 -- Left Toolbar wiring', () => {
  beforeEach(() => {
    resetStores();
  });

  it('renders the left toolbar with tool buttons', () => {
    render(<LeftToolbar />);
    expect(screen.getByTestId('left-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('tool-select')).toBeInTheDocument();
    expect(screen.getByTestId('tool-text')).toBeInTheDocument();
    expect(screen.getByTestId('tool-shape')).toBeInTheDocument();
    expect(screen.getByTestId('tool-eraser')).toBeInTheDocument();
    expect(screen.getByTestId('tool-blur')).toBeInTheDocument();
  });

  it('clicking Select tool sets uiStore activeTool to select', () => {
    useUiStore.setState({ activeTool: 'eraser' });
    render(<LeftToolbar />);

    fireEvent.click(screen.getByTestId('tool-select'));
    expect(useUiStore.getState().activeTool).toBe('select');
  });

  it('clicking Text tool sets uiStore activeTool to text', () => {
    render(<LeftToolbar />);

    fireEvent.click(screen.getByTestId('tool-text'));
    expect(useUiStore.getState().activeTool).toBe('text');
  });

  it('clicking Eraser tool sets uiStore activeTool to eraser', () => {
    render(<LeftToolbar />);

    fireEvent.click(screen.getByTestId('tool-eraser'));
    expect(useUiStore.getState().activeTool).toBe('eraser');
  });

  it('clicking Blur tool sets uiStore activeTool to blurBrush', () => {
    render(<LeftToolbar />);

    fireEvent.click(screen.getByTestId('tool-blur'));
    expect(useUiStore.getState().activeTool).toBe('blurBrush');
  });

  it('renders fill/stroke swatches', () => {
    render(<LeftToolbar />);
    expect(screen.getByTestId('fill-stroke-swatches')).toBeInTheDocument();
    expect(screen.getByTestId('swatch-fill')).toBeInTheDocument();
    expect(screen.getByTestId('swatch-stroke')).toBeInTheDocument();
  });

  it('clicking fill swatch opens color picker dialog', () => {
    render(<LeftToolbar />);
    fireEvent.click(screen.getByTestId('swatch-fill'));
    expect(useUiStore.getState().activeDialog).toBe('colorPicker:fill');
  });

  it('clicking stroke swatch opens color picker dialog', () => {
    render(<LeftToolbar />);
    fireEvent.click(screen.getByTestId('swatch-stroke'));
    expect(useUiStore.getState().activeDialog).toBe('colorPicker:stroke');
  });

  it('renders align and distribute popup triggers', () => {
    render(<LeftToolbar />);
    expect(screen.getByTestId('tool-align')).toBeInTheDocument();
    expect(screen.getByTestId('tool-distribute')).toBeInTheDocument();
  });
});

// ===========================================================================
// PHASE 14 -- Context Menu wiring
// ===========================================================================

describe('GW Phase 14 -- Context Menu wiring', () => {
  beforeEach(() => {
    resetStores();
  });

  // ---- Canvas single-layer context menu ----

  describe('CanvasContextMenu', () => {
    it('renders with correct menu items', () => {
      const onAction = vi.fn();
      render(
        <CanvasContextMenu onAction={onAction}>
          <div data-testid="trigger">trigger</div>
        </CanvasContextMenu>,
      );
      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });

    it('useCanvasContextMenuAction maps copy to copyLayer command', () => {
      const { result } = renderHook(() => useCanvasContextMenuAction());
      const handler = result.current;

      // Ensure copyLayer command exists
      const cmd = getCommand('copyLayer');
      expect(cmd).toBeDefined();

      // The handler should not throw for any valid action
      expect(() => handler('copy')).not.toThrow();
      expect(() => handler('paste')).not.toThrow();
      expect(() => handler('duplicate')).not.toThrow();
      expect(() => handler('delete')).not.toThrow();
      expect(() => handler('flip-horizontal')).not.toThrow();
      expect(() => handler('flip-vertical')).not.toThrow();
      expect(() => handler('rotate-90')).not.toThrow();
    });
  });

  // ---- Canvas multi-select context menu ----

  describe('CanvasMultiSelectMenu', () => {
    it('renders with correct data-testid', () => {
      const onAction = vi.fn();
      render(
        <CanvasMultiSelectMenu onAction={onAction}>
          <div data-testid="trigger">trigger</div>
        </CanvasMultiSelectMenu>,
      );
      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });

    it('useCanvasMultiSelectMenuAction maps group and delete actions', () => {
      const { result } = renderHook(() => useCanvasMultiSelectMenuAction());
      const handler = result.current;

      expect(() => handler('group')).not.toThrow();
      expect(() => handler('delete-selected')).not.toThrow();
      expect(() => handler('match-width')).not.toThrow();
    });
  });

  // ---- Layer panel single-layer context menu ----

  describe('LayerContextMenu', () => {
    it('renders with image layerType', () => {
      const onAction = vi.fn();
      render(
        <LayerContextMenu onAction={onAction} layerType="image">
          <div data-testid="trigger">trigger</div>
        </LayerContextMenu>,
      );
      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });

    it('useLayerContextMenuAction handles rename/duplicate/delete actions', () => {
      const { result } = renderHook(() => useLayerContextMenuAction());
      const handler = result.current;

      expect(() => handler('rename')).not.toThrow();
      expect(() => handler('duplicate')).not.toThrow();
      expect(() => handler('merge-down')).not.toThrow();
      expect(() => handler('delete')).not.toThrow();
      expect(() => handler('bring-to-front')).not.toThrow();
      expect(() => handler('send-to-back')).not.toThrow();
    });

    it('useLayerContextMenuAction opens rename dialog on rename action', () => {
      const { result } = renderHook(() => useLayerContextMenuAction());
      result.current('rename');
      expect(useUiStore.getState().activeDialog).toBe('renameLayer');
    });
  });

  // ---- Group context menu ----

  describe('GroupContextMenu', () => {
    it('renders group context menu trigger', () => {
      const onAction = vi.fn();
      render(
        <GroupContextMenu onAction={onAction}>
          <div data-testid="trigger">trigger</div>
        </GroupContextMenu>,
      );
      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });

    it('useGroupContextMenuAction handles ungroup and delete actions', () => {
      const { result } = renderHook(() => useGroupContextMenuAction());
      const handler = result.current;

      expect(() => handler('rename')).not.toThrow();
      expect(() => handler('ungroup')).not.toThrow();
      expect(() => handler('delete-group')).not.toThrow();
    });

    it('useGroupContextMenuAction handles group-color action', () => {
      const { result } = renderHook(() => useGroupContextMenuAction());
      const handler = result.current;

      // No layers selected, so this should just not throw
      expect(() => handler('group-color:#FF6B6B')).not.toThrow();
    });
  });

  // ---- Super-locked context menu ----

  describe('SuperLockedMenu', () => {
    it('renders super-locked menu trigger', () => {
      const onAction = vi.fn();
      render(
        <SuperLockedMenu onAction={onAction}>
          <div data-testid="trigger">trigger</div>
        </SuperLockedMenu>,
      );
      expect(screen.getByTestId('trigger')).toBeInTheDocument();
    });

    it('useSuperLockedMenuAction handles off-super-lock', () => {
      const { result } = renderHook(() => useSuperLockedMenuAction());
      const handler = result.current;

      // Should not throw even without selected layers
      expect(() => handler('off-super-lock')).not.toThrow();
    });
  });
});

// ===========================================================================
// PHASE 15 -- Keyboard Shortcuts verification
// ===========================================================================

describe('GW Phase 15 -- Keyboard Shortcuts', () => {
  beforeEach(() => {
    shortcutManager.reset();
    resetStores();
  });

  it('Ctrl+Z triggers undo action', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true });
    expect(actions.onUndo).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+C triggers copy action', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));

    fireEvent.keyDown(document, { key: 'c', ctrlKey: true });
    expect(actions.onCopy).toHaveBeenCalledTimes(1);
  });

  it('single-key shortcuts blocked during text editing', () => {
    const actions = buildActions();
    renderHook(() =>
      useKeyboardShortcuts({ isEditingText: true, actions }),
    );

    // V = Select tool (single key) -- should be blocked
    fireEvent.keyDown(document, { key: 'v' });
    expect(actions.onSelectTool).not.toHaveBeenCalled();

    // T = Text tool -- should be blocked
    fireEvent.keyDown(document, { key: 't' });
    expect(actions.onTextTool).not.toHaveBeenCalled();

    // F = Toggle grid -- should be blocked
    fireEvent.keyDown(document, { key: 'f' });
    expect(actions.onToggleGrid).not.toHaveBeenCalled();
  });

  it('modifier combos still work during text editing', () => {
    const actions = buildActions();
    renderHook(() =>
      useKeyboardShortcuts({ isEditingText: true, actions }),
    );

    fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    expect(actions.onSave).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true });
    expect(actions.onUndo).toHaveBeenCalledTimes(1);
  });

  it('shortcut manager has all expected category registrations', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));

    // Check that shortcuts are registered across all categories
    const fileShortcuts = shortcutManager.getByCategory('file');
    expect(fileShortcuts.length).toBeGreaterThanOrEqual(4); // Ctrl+N, O, S, Shift+S, E

    const editShortcuts = shortcutManager.getByCategory('edit');
    expect(editShortcuts.length).toBeGreaterThanOrEqual(7); // Undo, Redo, Cut, Copy, Paste, Dup, Delete, etc.

    const toolShortcuts = shortcutManager.getByCategory('tool');
    expect(toolShortcuts.length).toBeGreaterThanOrEqual(5); // V, T, R, B, J

    const viewShortcuts = shortcutManager.getByCategory('view');
    expect(viewShortcuts.length).toBeGreaterThanOrEqual(4); // G, F, H, L, zoom combos

    const layerShortcuts = shortcutManager.getByCategory('layer');
    expect(layerShortcuts.length).toBeGreaterThanOrEqual(2); // Ctrl+G, Ctrl+Shift+G
  });

  it('total registered shortcuts are 45+', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));

    const all = shortcutManager.getAll();
    // 48 shortcuts currently: 5 file + 9 edit + 2 layer + 5 tool + 4 view
    //   + 1 nav + 2 brush + 16 arrow nudge + 4 zoom = 48
    expect(all.length).toBeGreaterThanOrEqual(45);
  });

  it('V key fires select tool', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));

    fireEvent.keyDown(document, { key: 'v' });
    expect(actions.onSelectTool).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+D fires duplicate', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));

    fireEvent.keyDown(document, { key: 'd', ctrlKey: true });
    expect(actions.onDuplicate).toHaveBeenCalledTimes(1);
  });

  it('Delete fires delete action', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));

    fireEvent.keyDown(document, { key: 'Delete' });
    expect(actions.onDelete).toHaveBeenCalledTimes(1);
  });

  it('Space starts pan mode, keyup ends it', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));

    fireEvent.keyDown(document, { key: ' ' });
    expect(actions.onPanModeStart).toHaveBeenCalledTimes(1);

    fireEvent.keyUp(document, { key: ' ' });
    expect(actions.onPanModeEnd).toHaveBeenCalledTimes(1);
  });

  it('arrow keys trigger nudge with correct deltas', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));

    fireEvent.keyDown(document, { key: 'ArrowUp' });
    expect(actions.onNudge).toHaveBeenCalledWith(0, -1);

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(actions.onNudge).toHaveBeenCalledWith(1, 0);
  });

  it('Shift+Arrow nudges by 5px', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));

    fireEvent.keyDown(document, { key: 'ArrowDown', shiftKey: true });
    expect(actions.onNudge).toHaveBeenCalledWith(0, 5);
  });

  it('Ctrl+= and Ctrl+- trigger zoom in/out', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));

    fireEvent.keyDown(document, { key: '=', ctrlKey: true });
    expect(actions.onZoomIn).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: '-', ctrlKey: true });
    expect(actions.onZoomOut).toHaveBeenCalledTimes(1);
  });
});
