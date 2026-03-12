import { useEffect, useCallback, useRef } from 'react';
import { shortcutManager, normalizeCombo } from './ShortcutManager';
import type { ShortcutCategory } from './ShortcutManager';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeyboardShortcutActions {
  // File
  onNewProject?: () => void;
  onOpenProject?: () => void;
  onSave?: () => void;
  onSaveAs?: () => void;
  onExportPNG?: () => void;
  onQuickExport?: () => void;
  onImportImage?: () => void;
  onImportSvg?: () => void;
  onExportSvg?: () => void;
  onExportPsd?: () => void;

  // Edit
  onUndo?: () => void;
  onRedo?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onDeselect?: () => void;

  // Layer
  onGroup?: () => void;
  onUngroup?: () => void;
  onReleaseFromGroup?: () => void;
  onNewLayer?: () => void;
  onLockLayer?: () => void;
  onMergeDown?: () => void;

  // Arrange
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;

  // Transform
  onFlipHorizontal?: () => void;
  onFlipVertical?: () => void;
  onRotate90?: () => void;
  onFitToCanvas?: () => void;
  onFitWidth?: () => void;
  onFitHeight?: () => void;

  // Autosize
  onMatchWidth?: () => void;
  onMatchHeight?: () => void;
  onMatchSize?: () => void;

  // Tool (single-key)
  onSelectTool?: () => void;
  onTextTool?: () => void;
  onShapeTool?: () => void;
  onEraserTool?: () => void;
  onBlurBrushTool?: () => void;
  onAntiBlurTool?: () => void;

  // View (single-key)
  onToggleGallery?: () => void;
  onToggleGrid?: () => void;
  onToggleVisibility?: () => void;
  onPanModeStart?: () => void;
  onPanModeEnd?: () => void;

  // Brush size
  onBrushSizeDecrease?: () => void;
  onBrushSizeIncrease?: () => void;

  // Nudge — receives (dx, dy) in pixels
  onNudge?: (dx: number, dy: number) => void;

  // Zoom
  onZoom100?: () => void;
  onZoomFit?: () => void;
  onZoom200?: () => void;
  onZoom300?: () => void;
  onZoom400?: () => void;
  onZoom500?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export interface UseKeyboardShortcutsOptions {
  /** When true, single-key shortcuts are blocked (modifier combos still work). */
  isEditingText?: boolean;
  /** All action callbacks. */
  actions: KeyboardShortcutActions;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a combo string from a DOM KeyboardEvent. */
export function eventToCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');

  let key = e.key;

  // Normalise special key names
  if (key === ' ') key = 'Space';
  if (key === 'Escape') key = 'Escape';
  if (key === 'F2') key = 'F2';

  // Don't add modifier keys themselves as the "key" portion
  const modifierKeys = ['Control', 'Shift', 'Alt', 'Meta'];
  if (modifierKeys.includes(key)) return '';

  // Upper-case single alpha characters
  if (key.length === 1 && /^[a-zA-Z]$/.test(key)) {
    key = key.toUpperCase();
  }

  // Normalize bracket keys
  if (key === '[') key = '[';
  if (key === ']') key = ']';

  parts.push(key);
  return parts.join('+');
}

/** Returns true when the combo string has NO modifiers (single key only). */
function isSingleKey(combo: string): boolean {
  const normalized = normalizeCombo(combo);
  return !normalized.includes('+');
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * React hook that wires up all keyboard shortcuts via the ShortcutManager.
 *
 * - Registers every shortcut on mount, cleans up on unmount.
 * - Converts native KeyboardEvent to combo string.
 * - Guards single-key shortcuts when text is being edited.
 * - Handles Space key hold (pan mode) with keyup listener.
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void {
  const { isEditingText = false, actions } = options;

  // Keep a stable ref to the latest actions so the keydown listener always
  // sees the freshest callbacks without re-attaching the listener.
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const isEditingRef = useRef(isEditingText);
  isEditingRef.current = isEditingText;

  // ------------------------------------------------------------------
  // Register shortcuts into the manager on mount; clean up on unmount.
  // ------------------------------------------------------------------
  useEffect(() => {
    type Def = [string, () => void, string, ShortcutCategory];
    const defs: Def[] = [
      // ---- File (Ctrl combos) ----
      ['Ctrl+N', () => actionsRef.current.onNewProject?.(), 'New Project', 'file'],
      ['Ctrl+O', () => actionsRef.current.onOpenProject?.(), 'Open Project', 'file'],
      ['Ctrl+S', () => actionsRef.current.onSave?.(), 'Save', 'file'],
      ['Ctrl+Shift+S', () => actionsRef.current.onSaveAs?.(), 'Save As', 'file'],
      ['Ctrl+E', () => actionsRef.current.onExportPNG?.(), 'Export PNG', 'file'],
      ['Ctrl+Shift+E', () => actionsRef.current.onQuickExport?.(), 'Quick Export Layer', 'file'],
      ['Ctrl+I', () => actionsRef.current.onImportImage?.(), 'Import Image', 'file'],
      ['Ctrl+Shift+I', () => actionsRef.current.onImportSvg?.(), 'Import SVG', 'file'],
      ['Ctrl+Alt+S', () => actionsRef.current.onExportSvg?.(), 'Export SVG', 'file'],
      ['Ctrl+Alt+P', () => actionsRef.current.onExportPsd?.(), 'Export PSD', 'file'],

      // ---- Edit (Ctrl combos + Delete + Escape) ----
      ['Ctrl+Z', () => actionsRef.current.onUndo?.(), 'Undo', 'edit'],
      ['Ctrl+Y', () => actionsRef.current.onRedo?.(), 'Redo', 'edit'],
      ['Ctrl+Shift+Z', () => actionsRef.current.onRedo?.(), 'Redo (alt)', 'edit'],
      ['Ctrl+X', () => actionsRef.current.onCut?.(), 'Cut', 'edit'],
      ['Ctrl+C', () => actionsRef.current.onCopy?.(), 'Copy', 'edit'],
      ['Ctrl+V', () => actionsRef.current.onPaste?.(), 'Paste', 'edit'],
      ['Ctrl+D', () => actionsRef.current.onDuplicate?.(), 'Duplicate', 'edit'],
      ['Delete', () => actionsRef.current.onDelete?.(), 'Delete Layer', 'edit'],
      ['Ctrl+A', () => actionsRef.current.onSelectAll?.(), 'Select All', 'edit'],
      ['Escape', () => actionsRef.current.onDeselect?.(), 'Deselect', 'edit'],

      // ---- Layer (Ctrl combos) ----
      ['Ctrl+G', () => actionsRef.current.onGroup?.(), 'Group', 'layer'],
      ['Ctrl+Shift+G', () => actionsRef.current.onUngroup?.(), 'Ungroup', 'layer'],
      ['Ctrl+Shift+R', () => actionsRef.current.onReleaseFromGroup?.(), 'Release from Group', 'layer'],
      ['Ctrl+Shift+N', () => actionsRef.current.onNewLayer?.(), 'New Layer', 'layer'],
      ['Ctrl+L', () => actionsRef.current.onLockLayer?.(), 'Lock Layer', 'layer'],
      ['Ctrl+M', () => actionsRef.current.onMergeDown?.(), 'Merge Down', 'layer'],

      // ---- Arrange (Ctrl+brackets) ----
      ['Ctrl+]', () => actionsRef.current.onBringForward?.(), 'Bring Forward', 'layer'],
      ['Ctrl+[', () => actionsRef.current.onSendBackward?.(), 'Send Backward', 'layer'],
      ['Ctrl+Shift+]', () => actionsRef.current.onBringToFront?.(), 'Bring to Front', 'layer'],
      ['Ctrl+Shift+[', () => actionsRef.current.onSendToBack?.(), 'Send to Back', 'layer'],

      // ---- Transform (Ctrl combos) ----
      ['Ctrl+H', () => actionsRef.current.onFlipHorizontal?.(), 'Flip Horizontal', 'layer'],
      ['Ctrl+Shift+H', () => actionsRef.current.onFlipVertical?.(), 'Flip Vertical', 'layer'],
      ['Ctrl+R', () => actionsRef.current.onRotate90?.(), 'Rotate 90°', 'layer'],
      ['Ctrl+F', () => actionsRef.current.onFitToCanvas?.(), 'Fit to Canvas', 'layer'],
      ['Ctrl+Shift+F', () => actionsRef.current.onFitWidth?.(), 'Fit Width', 'layer'],
      ['Ctrl+Alt+Shift+F', () => actionsRef.current.onFitHeight?.(), 'Fit Height', 'layer'],

      // ---- Autosize (Ctrl+Alt combos) ----
      ['Ctrl+Alt+W', () => actionsRef.current.onMatchWidth?.(), 'Match Width', 'layer'],
      ['Ctrl+Alt+H', () => actionsRef.current.onMatchHeight?.(), 'Match Height', 'layer'],
      ['Ctrl+Alt+B', () => actionsRef.current.onMatchSize?.(), 'Match Size', 'layer'],

      // ---- Tool (single-key) ----
      ['V', () => actionsRef.current.onSelectTool?.(), 'Select tool', 'tool'],
      ['T', () => actionsRef.current.onTextTool?.(), 'Text tool', 'tool'],
      // Note: R is single-key for Shape tool. Ctrl+R is Rotate 90°.
      ['R', () => actionsRef.current.onShapeTool?.(), 'Shape tool', 'tool'],
      ['B', () => actionsRef.current.onEraserTool?.(), 'Eraser tool', 'tool'],
      ['J', () => actionsRef.current.onBlurBrushTool?.(), 'Blur brush tool', 'tool'],
      ['Shift+J', () => actionsRef.current.onAntiBlurTool?.(), 'Anti-blur tool', 'tool'],

      // ---- View (single-key) ----
      ['G', () => actionsRef.current.onToggleGallery?.(), 'Toggle gallery', 'view'],
      ['F', () => actionsRef.current.onToggleGrid?.(), 'Toggle grid', 'view'],
      ['H', () => actionsRef.current.onToggleVisibility?.(), 'Toggle visibility', 'view'],
      ['Space', () => actionsRef.current.onPanModeStart?.(), 'Pan mode', 'navigation'],

      // ---- Brush size (single-key) ----
      ['[', () => actionsRef.current.onBrushSizeDecrease?.(), 'Decrease brush size', 'tool'],
      [']', () => actionsRef.current.onBrushSizeIncrease?.(), 'Increase brush size', 'tool'],

      // ---- Arrow key nudging ----
      ['ArrowUp',    () => actionsRef.current.onNudge?.(0, -1), 'Nudge up 1px', 'edit'],
      ['ArrowDown',  () => actionsRef.current.onNudge?.(0, 1),  'Nudge down 1px', 'edit'],
      ['ArrowLeft',  () => actionsRef.current.onNudge?.(-1, 0), 'Nudge left 1px', 'edit'],
      ['ArrowRight', () => actionsRef.current.onNudge?.(1, 0),  'Nudge right 1px', 'edit'],

      ['Shift+ArrowUp',    () => actionsRef.current.onNudge?.(0, -5), 'Nudge up 5px', 'edit'],
      ['Shift+ArrowDown',  () => actionsRef.current.onNudge?.(0, 5),  'Nudge down 5px', 'edit'],
      ['Shift+ArrowLeft',  () => actionsRef.current.onNudge?.(-5, 0), 'Nudge left 5px', 'edit'],
      ['Shift+ArrowRight', () => actionsRef.current.onNudge?.(5, 0),  'Nudge right 5px', 'edit'],

      ['Ctrl+Shift+ArrowUp',    () => actionsRef.current.onNudge?.(0, -10), 'Nudge up 10px', 'edit'],
      ['Ctrl+Shift+ArrowDown',  () => actionsRef.current.onNudge?.(0, 10),  'Nudge down 10px', 'edit'],
      ['Ctrl+Shift+ArrowLeft',  () => actionsRef.current.onNudge?.(-10, 0), 'Nudge left 10px', 'edit'],
      ['Ctrl+Shift+ArrowRight', () => actionsRef.current.onNudge?.(10, 0),  'Nudge right 10px', 'edit'],

      ['Ctrl+Shift+Alt+ArrowUp',    () => actionsRef.current.onNudge?.(0, -50), 'Nudge up 50px', 'edit'],
      ['Ctrl+Shift+Alt+ArrowDown',  () => actionsRef.current.onNudge?.(0, 50),  'Nudge down 50px', 'edit'],
      ['Ctrl+Shift+Alt+ArrowLeft',  () => actionsRef.current.onNudge?.(-50, 0), 'Nudge left 50px', 'edit'],
      ['Ctrl+Shift+Alt+ArrowRight', () => actionsRef.current.onNudge?.(50, 0),  'Nudge right 50px', 'edit'],

      // ---- Zoom (Ctrl combos) ----
      ['Ctrl+0', () => actionsRef.current.onZoom100?.(), 'Zoom to 100%', 'view'],
      ['Ctrl+1', () => actionsRef.current.onZoomFit?.(), 'Fit to screen', 'view'],
      ['Ctrl+2', () => actionsRef.current.onZoom200?.(), 'Zoom to 200%', 'view'],
      ['Ctrl+3', () => actionsRef.current.onZoom300?.(), 'Zoom to 300%', 'view'],
      ['Ctrl+4', () => actionsRef.current.onZoom400?.(), 'Zoom to 400%', 'view'],
      ['Ctrl+5', () => actionsRef.current.onZoom500?.(), 'Zoom to 500%', 'view'],
      ['Ctrl+=', () => actionsRef.current.onZoomIn?.(), 'Zoom in', 'view'],
      ['Ctrl+-', () => actionsRef.current.onZoomOut?.(), 'Zoom out', 'view'],
    ];

    for (const [combo, action, desc, cat] of defs) {
      shortcutManager.register(combo, action, { description: desc, category: cat });
    }

    return () => {
      for (const [combo] of defs) {
        shortcutManager.unregister(combo);
      }
    };
  }, []); // register once

  // ------------------------------------------------------------------
  // Keyboard listener
  // ------------------------------------------------------------------
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const combo = eventToCombo(e);
    if (!combo) return; // bare modifier press

    // Text-editing guard: block single-key shortcuts, allow modifier combos
    if (isEditingRef.current && isSingleKey(combo)) {
      return;
    }

    const handled = shortcutManager.trigger(combo);
    if (handled) {
      e.preventDefault();
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === ' ') {
      actionsRef.current.onPanModeEnd?.();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}
