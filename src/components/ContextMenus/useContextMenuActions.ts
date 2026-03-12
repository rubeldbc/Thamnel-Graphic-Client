import { useCallback } from 'react';
import { getCommand } from '../../commands/useCommand';
import { useDocumentStore } from '../../stores/documentStore';
import { useUiStore } from '../../stores/uiStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function execCommand(name: string, ...args: unknown[]) {
  const cmd = getCommand(name);
  if (cmd && cmd.canExecute()) {
    cmd.execute(...args);
  }
}

// ---------------------------------------------------------------------------
// Canvas single-layer context menu action map
// ---------------------------------------------------------------------------

const CANVAS_ACTION_MAP: Record<string, () => void> = {
  copy: () => execCommand('copyLayer'),
  paste: () => execCommand('pasteLayer'),
  duplicate: () => execCommand('duplicateLayer'),
  delete: () => execCommand('deleteLayer'),
  ungroup: () => execCommand('ungroup'),
  'flip-horizontal': () => execCommand('flipHorizontal'),
  'flip-vertical': () => execCommand('flipVertical'),
  'rotate-90': () => execCommand('rotate90'),
  'fit-to-canvas': () => { /* placeholder: fit layer to canvas */ },
  'fit-to-width': () => { /* placeholder: fit layer width to canvas */ },
  'fit-to-height': () => { /* placeholder: fit layer height to canvas */ },
  'image-studio': () => useUiStore.getState().setActiveDialog('imageStudio'),
  'logo-remover': () => execCommand('logoRemoval'),
  'blur-faces': () => { /* placeholder: blur faces on layer */ },
  'text-properties': () => useUiStore.getState().setActiveDialog('textProperties'),
  'edit-date-stamp': () => useUiStore.getState().setActiveDialog('dateStamp'),
  'convert-to-characters': () => { /* placeholder: convert text to character layers */ },
  'mask-with-image': () => { /* placeholder: mask with image */ },
  'fill-selected': () => { /* placeholder: fill selected area */ },
};

// ---------------------------------------------------------------------------
// Canvas multi-select context menu action map
// ---------------------------------------------------------------------------

const MULTI_SELECT_ACTION_MAP: Record<string, () => void> = {
  group: () => execCommand('group'),
  'delete-selected': () => execCommand('deleteLayer'),
  'match-width': () => execCommand('matchWidth'),
  'match-height': () => execCommand('matchHeight'),
  'match-size': () => execCommand('matchSize'),
};

// ---------------------------------------------------------------------------
// Layer panel single-layer context menu action map
// ---------------------------------------------------------------------------

const LAYER_ACTION_MAP: Record<string, () => void> = {
  rename: () => useUiStore.getState().setActiveDialog('renameLayer'),
  duplicate: () => execCommand('duplicateLayer'),
  'merge-down': () => execCommand('mergeDown'),
  delete: () => execCommand('deleteLayer'),
  'auto-size': () => { /* placeholder: auto-size layer */ },
  'rotate-90-cw': () => execCommand('rotate90'),
  'rotate-90-ccw': () => {
    // Rotate -90 (or +270)
    const state = useDocumentStore.getState();
    state.pushUndo();
    for (const id of state.selectedLayerIds) {
      const layer = state.project.layers.find((l) => l.id === id);
      if (layer) {
        state.updateLayer(id, { rotation: (layer.rotation + 270) % 360 });
      }
    }
  },
  'rotate-180': () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    for (const id of state.selectedLayerIds) {
      const layer = state.project.layers.find((l) => l.id === id);
      if (layer) {
        state.updateLayer(id, { rotation: (layer.rotation + 180) % 360 });
      }
    }
  },
  'fit-to-canvas': () => { /* placeholder: fit layer to canvas */ },
  'fit-to-width': () => { /* placeholder: fit layer to canvas width */ },
  'fit-to-height': () => { /* placeholder: fit layer to canvas height */ },
  'center-horizontally': () => execCommand('alignCenter'),
  'center-vertically': () => execCommand('alignMiddle'),
  'bring-to-front': () => execCommand('bringToFront'),
  'bring-forward': () => execCommand('bringForward'),
  'send-backward': () => execCommand('sendBackward'),
  'send-to-back': () => execCommand('sendToBack'),
  'quick-export-png': () => execCommand('quickExportLayer'),
  'blur-faces': () => { /* placeholder: blur faces */ },
  'get-video-name': () => { /* placeholder: get video name */ },
  'style-presets': () => { /* placeholder: style presets */ },
  'release-from-group': () => execCommand('releaseFromGroup'),
  'clear-blur-mask': () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    for (const id of state.selectedLayerIds) {
      state.updateLayer(id, { blurMaskData: null });
    }
  },
  'super-lock-toggle': () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    for (const id of state.selectedLayerIds) {
      const layer = state.project.layers.find((l) => l.id === id);
      if (layer) {
        state.updateLayer(id, { superLocked: !layer.superLocked });
      }
    }
  },
};

// ---------------------------------------------------------------------------
// Group context menu action map
// ---------------------------------------------------------------------------

const GROUP_ACTION_MAP: Record<string, () => void> = {
  rename: () => useUiStore.getState().setActiveDialog('renameLayer'),
  'duplicate-group': () => execCommand('duplicateLayer'),
  'new-sub-group': () => execCommand('addNewGroup'),
  'release-all-items': () => {
    const state = useDocumentStore.getState();
    if (state.selectedLayerIds.length !== 1) return;
    const groupId = state.selectedLayerIds[0];
    const group = state.project.layers.find((l) => l.id === groupId);
    if (!group || group.type !== 'group') return;
    state.pushUndo();
    // Detach all children from the group
    for (const layer of state.project.layers) {
      if (layer.parentGroupId === groupId) {
        state.updateLayer(layer.id, { parentGroupId: null, depth: 0 });
      }
    }
    // Remove the now-empty group
    state.removeLayer(groupId);
  },
  'delete-group': () => execCommand('deleteLayer'),
  'super-lock-toggle': () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    for (const id of state.selectedLayerIds) {
      const layer = state.project.layers.find((l) => l.id === id);
      if (layer) {
        state.updateLayer(id, { superLocked: !layer.superLocked });
      }
    }
  },
};

// ---------------------------------------------------------------------------
// Super-locked context menu action map
// ---------------------------------------------------------------------------

const SUPER_LOCKED_ACTION_MAP: Record<string, () => void> = {
  'off-super-lock': () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    for (const id of state.selectedLayerIds) {
      state.updateLayer(id, { superLocked: false });
    }
  },
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Returns an action handler for the canvas single-layer context menu.
 */
export function useCanvasContextMenuAction() {
  return useCallback((action: string) => {
    const handler = CANVAS_ACTION_MAP[action];
    if (handler) handler();
  }, []);
}

/**
 * Returns an action handler for the canvas multi-select context menu.
 */
export function useCanvasMultiSelectMenuAction() {
  return useCallback((action: string) => {
    const handler = MULTI_SELECT_ACTION_MAP[action];
    if (handler) handler();
  }, []);
}

/**
 * Returns an action handler for the layer panel single-layer context menu.
 */
export function useLayerContextMenuAction() {
  return useCallback((action: string) => {
    // Handle group-color action specially (dynamic key)
    if (action.startsWith('group-color:')) {
      const hex = action.split(':')[1];
      const state = useDocumentStore.getState();
      state.pushUndo();
      for (const id of state.selectedLayerIds) {
        state.updateLayer(id, { groupColor: hex });
      }
      return;
    }
    const handler = LAYER_ACTION_MAP[action];
    if (handler) handler();
  }, []);
}

/**
 * Returns an action handler for the group context menu.
 */
export function useGroupContextMenuAction() {
  return useCallback((action: string) => {
    // Handle group-color action specially (dynamic key)
    if (action.startsWith('group-color:')) {
      const hex = action.split(':')[1];
      const state = useDocumentStore.getState();
      state.pushUndo();
      for (const id of state.selectedLayerIds) {
        state.updateLayer(id, { groupColor: hex });
      }
      return;
    }
    const handler = GROUP_ACTION_MAP[action];
    if (handler) handler();
  }, []);
}

/**
 * Returns an action handler for the super-locked context menu.
 */
export function useSuperLockedMenuAction() {
  return useCallback((action: string) => {
    const handler = SUPER_LOCKED_ACTION_MAP[action];
    if (handler) handler();
  }, []);
}
