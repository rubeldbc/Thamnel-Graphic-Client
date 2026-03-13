import type { Command } from './types';
import { useDocumentStore } from '../stores/documentStore';

function hasSelection(): boolean {
  return useDocumentStore.getState().selectedLayerIds.length > 0;
}

function selectedIndex(): number {
  const state = useDocumentStore.getState();
  if (state.selectedLayerIds.length === 0) return -1;
  return state.project.layers.findIndex(
    (l) => l.id === state.selectedLayerIds[0],
  );
}

// Convention: index 0 = topmost (front), last index = bottommost (back)
function notAtFront(): boolean {
  const idx = selectedIndex();
  return idx > 0;
}

function notAtBack(): boolean {
  const state = useDocumentStore.getState();
  const idx = selectedIndex();
  return idx >= 0 && idx < state.project.layers.length - 1;
}

export const bringToFront: Command = {
  name: 'bringToFront',
  shortcut: 'Ctrl+Shift+]',
  category: 'arrange',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const id = state.selectedLayerIds[0];
    if (id) {
      state.moveLayer(id, 0); // index 0 = topmost
    }
  },
};

export const sendToBack: Command = {
  name: 'sendToBack',
  shortcut: 'Ctrl+Shift+[',
  category: 'arrange',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const id = state.selectedLayerIds[0];
    if (id) {
      state.moveLayer(id, state.project.layers.length - 1); // last index = bottommost
    }
  },
};

export const bringForward: Command = {
  name: 'bringForward',
  shortcut: 'Ctrl+]',
  category: 'arrange',
  canExecute: () => hasSelection() && notAtFront(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const id = state.selectedLayerIds[0];
    const idx = selectedIndex();
    if (id && idx > 0) {
      state.moveLayer(id, idx - 1); // lower index = closer to front
    }
  },
};

export const sendBackward: Command = {
  name: 'sendBackward',
  shortcut: 'Ctrl+[',
  category: 'arrange',
  canExecute: () => hasSelection() && notAtBack(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const id = state.selectedLayerIds[0];
    const idx = selectedIndex();
    if (id && idx >= 0) {
      state.moveLayer(id, idx + 1); // higher index = closer to back
    }
  },
};

export const arrangeCommands: Command[] = [
  bringToFront,
  sendToBack,
  bringForward,
  sendBackward,
];
