import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import {
  ShortcutManager,
  normalizeCombo,
  shortcutManager,
} from '../hooks/ShortcutManager';

import {
  useKeyboardShortcuts,
  eventToCombo,
} from '../hooks/useKeyboardShortcuts';
import type { KeyboardShortcutActions } from '../hooks/useKeyboardShortcuts';

// ===========================================================================
// normalizeCombo helper
// ===========================================================================

describe('normalizeCombo', () => {
  it('normalises single letter to uppercase', () => {
    expect(normalizeCombo('v')).toBe('V');
    expect(normalizeCombo('V')).toBe('V');
  });

  it('normalises Ctrl combo', () => {
    expect(normalizeCombo('Ctrl+S')).toBe('Ctrl+S');
    expect(normalizeCombo('ctrl+s')).toBe('Ctrl+S');
  });

  it('normalises modifier order to Ctrl+Shift+Alt', () => {
    expect(normalizeCombo('Shift+Ctrl+A')).toBe('Ctrl+Shift+A');
    expect(normalizeCombo('Alt+Ctrl+Shift+X')).toBe('Ctrl+Shift+Alt+X');
  });

  it('handles special key names', () => {
    expect(normalizeCombo('Delete')).toBe('Delete');
    expect(normalizeCombo('Space')).toBe('Space');
    expect(normalizeCombo('ArrowUp')).toBe('ArrowUp');
  });
});

// ===========================================================================
// ShortcutManager
// ===========================================================================

describe('ShortcutManager', () => {
  let manager: ShortcutManager;

  beforeEach(() => {
    manager = new ShortcutManager();
  });

  it('registers and retrieves shortcuts', () => {
    const action = vi.fn();
    manager.register('Ctrl+S', action, { description: 'Save', category: 'file' });

    const all = manager.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]!.combo).toBe('Ctrl+S');
    expect(all[0]!.description).toBe('Save');
    expect(all[0]!.category).toBe('file');
    expect(all[0]!.enabled).toBe(true);
  });

  it('triggers correct action', () => {
    const saveFn = vi.fn();
    const undoFn = vi.fn();
    manager.register('Ctrl+S', saveFn, { description: 'Save', category: 'file' });
    manager.register('Ctrl+Z', undoFn, { description: 'Undo', category: 'edit' });

    const handled = manager.trigger('Ctrl+S');
    expect(handled).toBe(true);
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(undoFn).not.toHaveBeenCalled();
  });

  it('returns false when triggering unregistered combo', () => {
    expect(manager.trigger('Ctrl+Q')).toBe(false);
  });

  it('categorises shortcuts correctly', () => {
    manager.register('Ctrl+S', vi.fn(), { description: 'Save', category: 'file' });
    manager.register('Ctrl+O', vi.fn(), { description: 'Open', category: 'file' });
    manager.register('Ctrl+Z', vi.fn(), { description: 'Undo', category: 'edit' });
    manager.register('V', vi.fn(), { description: 'Select', category: 'tool' });

    expect(manager.getByCategory('file')).toHaveLength(2);
    expect(manager.getByCategory('edit')).toHaveLength(1);
    expect(manager.getByCategory('tool')).toHaveLength(1);
    expect(manager.getByCategory('view')).toHaveLength(0);
  });

  it('unregisters a shortcut', () => {
    manager.register('Ctrl+S', vi.fn(), { description: 'Save', category: 'file' });
    expect(manager.getAll()).toHaveLength(1);

    manager.unregister('Ctrl+S');
    expect(manager.getAll()).toHaveLength(0);
  });

  it('disableGroup prevents triggering shortcuts in that category', () => {
    const action = vi.fn();
    manager.register('Ctrl+S', action, { description: 'Save', category: 'file' });

    manager.disableGroup('file');
    expect(manager.trigger('Ctrl+S')).toBe(false);
    expect(action).not.toHaveBeenCalled();

    manager.enableGroup('file');
    expect(manager.trigger('Ctrl+S')).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('reset clears everything', () => {
    manager.register('Ctrl+S', vi.fn(), { description: 'Save', category: 'file' });
    manager.disableGroup('file');

    manager.reset();
    expect(manager.getAll()).toHaveLength(0);
    expect(manager.isGroupEnabled('file')).toBe(true);
  });

  it('overwrites existing binding on re-register', () => {
    const first = vi.fn();
    const second = vi.fn();
    manager.register('Ctrl+S', first, { description: 'Save v1', category: 'file' });
    manager.register('Ctrl+S', second, { description: 'Save v2', category: 'file' });

    expect(manager.getAll()).toHaveLength(1);
    manager.trigger('Ctrl+S');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// eventToCombo helper
// ===========================================================================

describe('eventToCombo', () => {
  it('produces Ctrl+S for ctrl+s keydown', () => {
    const combo = eventToCombo(
      new KeyboardEvent('keydown', { key: 's', ctrlKey: true }),
    );
    expect(combo).toBe('Ctrl+S');
  });

  it('produces Ctrl+Shift+A', () => {
    const combo = eventToCombo(
      new KeyboardEvent('keydown', { key: 'A', ctrlKey: true, shiftKey: true }),
    );
    expect(combo).toBe('Ctrl+Shift+A');
  });

  it('returns empty string for bare modifier press', () => {
    const combo = eventToCombo(
      new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true }),
    );
    expect(combo).toBe('');
  });

  it('produces single letter for plain key', () => {
    const combo = eventToCombo(new KeyboardEvent('keydown', { key: 'v' }));
    expect(combo).toBe('V');
  });

  it('maps space bar to Space', () => {
    const combo = eventToCombo(new KeyboardEvent('keydown', { key: ' ' }));
    expect(combo).toBe('Space');
  });
});

// ===========================================================================
// useKeyboardShortcuts -- integration tests
// ===========================================================================

describe('useKeyboardShortcuts', () => {
  // Clean the singleton between tests so shortcut registrations don't leak
  beforeEach(() => {
    shortcutManager.reset();
  });

  function buildActions(overrides: Partial<KeyboardShortcutActions> = {}): KeyboardShortcutActions {
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

  // ---- Single-key blocked during text editing ----

  it('blocks single-key shortcuts when isEditingText is true', () => {
    const actions = buildActions();
    renderHook(() =>
      useKeyboardShortcuts({ isEditingText: true, actions }),
    );

    // V = Select tool (single key) — should be blocked
    fireEvent.keyDown(document, { key: 'v' });
    expect(actions.onSelectTool).not.toHaveBeenCalled();

    // T = Text tool — should also be blocked
    fireEvent.keyDown(document, { key: 't' });
    expect(actions.onTextTool).not.toHaveBeenCalled();
  });

  it('allows Ctrl combos even when isEditingText is true', () => {
    const actions = buildActions();
    renderHook(() =>
      useKeyboardShortcuts({ isEditingText: true, actions }),
    );

    fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    expect(actions.onSave).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true });
    expect(actions.onUndo).toHaveBeenCalledTimes(1);
  });

  // ---- Modifier shortcut tests ----

  it('fires Ctrl+N for New Project', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));
    fireEvent.keyDown(document, { key: 'n', ctrlKey: true });
    expect(actions.onNewProject).toHaveBeenCalledTimes(1);
  });

  it('fires Ctrl+Shift+S for Save As', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));
    fireEvent.keyDown(document, { key: 'S', ctrlKey: true, shiftKey: true });
    expect(actions.onSaveAs).toHaveBeenCalledTimes(1);
  });

  it('fires Delete for Delete Layer', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));
    fireEvent.keyDown(document, { key: 'Delete' });
    expect(actions.onDelete).toHaveBeenCalledTimes(1);
  });

  it('fires Ctrl+G for Group and Ctrl+Shift+G for Ungroup', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));

    fireEvent.keyDown(document, { key: 'g', ctrlKey: true });
    expect(actions.onGroup).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'G', ctrlKey: true, shiftKey: true });
    expect(actions.onUngroup).toHaveBeenCalledTimes(1);
  });

  // ---- Single-key tool shortcuts ----

  it('fires V for Select tool', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));
    fireEvent.keyDown(document, { key: 'v' });
    expect(actions.onSelectTool).toHaveBeenCalledTimes(1);
  });

  it('fires T for Text tool', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));
    fireEvent.keyDown(document, { key: 't' });
    expect(actions.onTextTool).toHaveBeenCalledTimes(1);
  });

  it('fires Space for Pan mode start, keyup for end', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));

    fireEvent.keyDown(document, { key: ' ' });
    expect(actions.onPanModeStart).toHaveBeenCalledTimes(1);

    fireEvent.keyUp(document, { key: ' ' });
    expect(actions.onPanModeEnd).toHaveBeenCalledTimes(1);
  });

  // ---- Brush size shortcuts ----

  it('[ decreases brush size', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));
    fireEvent.keyDown(document, { key: '[' });
    expect(actions.onBrushSizeDecrease).toHaveBeenCalledTimes(1);
  });

  it('] increases brush size', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));
    fireEvent.keyDown(document, { key: ']' });
    expect(actions.onBrushSizeIncrease).toHaveBeenCalledTimes(1);
  });

  // ---- Arrow key nudging with different modifier combinations ----

  it('arrow keys nudge by 1px', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));

    fireEvent.keyDown(document, { key: 'ArrowUp' });
    expect(actions.onNudge).toHaveBeenCalledWith(0, -1);

    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(actions.onNudge).toHaveBeenCalledWith(0, 1);

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(actions.onNudge).toHaveBeenCalledWith(-1, 0);

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(actions.onNudge).toHaveBeenCalledWith(1, 0);
  });

  it('Shift+Arrow nudges by 5px', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));

    fireEvent.keyDown(document, { key: 'ArrowUp', shiftKey: true });
    expect(actions.onNudge).toHaveBeenCalledWith(0, -5);

    fireEvent.keyDown(document, { key: 'ArrowRight', shiftKey: true });
    expect(actions.onNudge).toHaveBeenCalledWith(5, 0);
  });

  it('Ctrl+Shift+Arrow nudges by 10px', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));

    fireEvent.keyDown(document, { key: 'ArrowLeft', ctrlKey: true, shiftKey: true });
    expect(actions.onNudge).toHaveBeenCalledWith(-10, 0);

    fireEvent.keyDown(document, { key: 'ArrowDown', ctrlKey: true, shiftKey: true });
    expect(actions.onNudge).toHaveBeenCalledWith(0, 10);
  });

  it('Ctrl+Shift+Alt+Arrow nudges by 50px', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));

    fireEvent.keyDown(document, {
      key: 'ArrowUp',
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
    });
    expect(actions.onNudge).toHaveBeenCalledWith(0, -50);

    fireEvent.keyDown(document, {
      key: 'ArrowRight',
      ctrlKey: true,
      shiftKey: true,
      altKey: true,
    });
    expect(actions.onNudge).toHaveBeenCalledWith(50, 0);
  });

  // ---- Zoom shortcuts ----

  it('Ctrl+0 triggers Zoom to 100%', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));
    fireEvent.keyDown(document, { key: '0', ctrlKey: true });
    expect(actions.onZoom100).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+1 triggers Fit to screen', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));
    fireEvent.keyDown(document, { key: '1', ctrlKey: true });
    expect(actions.onZoomFit).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+= triggers Zoom in', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));
    fireEvent.keyDown(document, { key: '=', ctrlKey: true });
    expect(actions.onZoomIn).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+- triggers Zoom out', () => {
    const actions = buildActions();
    renderHook(() => useKeyboardShortcuts({ actions }));
    fireEvent.keyDown(document, { key: '-', ctrlKey: true });
    expect(actions.onZoomOut).toHaveBeenCalledTimes(1);
  });
});
