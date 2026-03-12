import type { Command } from './types';
import { useDocumentStore } from '../stores/documentStore';
import { createDefaultLayer } from '../types/index';

// Module-level clipboard for layer data.
let clipboard: import('../types/index').LayerModel[] = [];

function hasSelection(): boolean {
  return useDocumentStore.getState().selectedLayerIds.length > 0;
}

function hasLayers(): boolean {
  return useDocumentStore.getState().project.layers.length > 0;
}

function clipboardHasData(): boolean {
  return clipboard.length > 0;
}

/** Exposed for testing – returns current clipboard contents. */
export function getClipboard() {
  return clipboard;
}

/** Exposed for testing – resets clipboard. */
export function clearClipboard() {
  clipboard = [];
}

export const undo: Command = {
  name: 'undo',
  shortcut: 'Ctrl+Z',
  category: 'edit',
  canExecute: () => useDocumentStore.getState().undoStack.length > 0,
  execute: () => {
    useDocumentStore.getState().undo();
  },
};

export const redo: Command = {
  name: 'redo',
  shortcut: 'Ctrl+Y',
  category: 'edit',
  canExecute: () => useDocumentStore.getState().redoStack.length > 0,
  execute: () => {
    useDocumentStore.getState().redo();
  },
};

export const copyLayer: Command = {
  name: 'copyLayer',
  shortcut: 'Ctrl+C',
  category: 'edit',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    clipboard = state.project.layers.filter((l) =>
      state.selectedLayerIds.includes(l.id),
    );
  },
};

export const pasteLayer: Command = {
  name: 'pasteLayer',
  shortcut: 'Ctrl+V',
  category: 'edit',
  canExecute: () => clipboardHasData(),
  execute: () => {
    const store = useDocumentStore.getState();
    store.pushUndo();
    const newIds: string[] = [];
    for (const layer of clipboard) {
      // Insert above the source layer position
      const sourceIdx = store.project.layers.findIndex((l) => l.id === layer.id);
      const insertIdx = sourceIdx !== -1 ? sourceIdx : store.project.layers.length;
      const pasted = createDefaultLayer({
        ...layer,
        id: undefined, // generate new id
        x: layer.x + 10,
        y: layer.y + 10,
        name: `${layer.name} (copy)`,
      });
      store.addLayerAtIndex(pasted, insertIdx);
      newIds.push(pasted.id);
    }
    // Select pasted layers
    if (newIds.length > 0) {
      useDocumentStore.setState({ selectedLayerIds: newIds });
    }
  },
};

export const deleteLayer: Command = {
  name: 'deleteLayer',
  shortcut: 'Delete',
  category: 'edit',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    for (const id of [...state.selectedLayerIds]) {
      state.removeLayer(id);
    }
  },
};

export const duplicateLayer: Command = {
  name: 'duplicateLayer',
  shortcut: 'Ctrl+D',
  category: 'edit',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const selected = state.project.layers.filter((l) =>
      state.selectedLayerIds.includes(l.id),
    );
    const newIds: string[] = [];
    for (const layer of selected) {
      // Insert above the source layer
      const sourceIdx = useDocumentStore.getState().project.layers.findIndex((l) => l.id === layer.id);
      const insertIdx = sourceIdx !== -1 ? sourceIdx : useDocumentStore.getState().project.layers.length;
      const dup = createDefaultLayer({
        ...layer,
        id: undefined,
        x: layer.x + 10,
        y: layer.y + 10,
        name: `${layer.name} (copy)`,
      });
      useDocumentStore.getState().addLayerAtIndex(dup, insertIdx);
      newIds.push(dup.id);
    }
    if (newIds.length > 0) {
      useDocumentStore.setState({ selectedLayerIds: newIds });
    }
  },
};

export const selectAll: Command = {
  name: 'selectAll',
  shortcut: 'Ctrl+A',
  category: 'edit',
  canExecute: () => hasLayers(),
  execute: () => {
    useDocumentStore.getState().selectAll();
  },
};

export const cutLayer: Command = {
  name: 'cutLayer',
  shortcut: 'Ctrl+X',
  category: 'edit',
  canExecute: () => hasSelection(),
  execute: () => {
    // Copy to clipboard first
    const state = useDocumentStore.getState();
    clipboard = state.project.layers.filter((l) =>
      state.selectedLayerIds.includes(l.id),
    );
    // Then delete
    state.pushUndo();
    for (const id of [...state.selectedLayerIds]) {
      state.removeLayer(id);
    }
  },
};

export const deselect: Command = {
  name: 'deselect',
  shortcut: 'Escape',
  category: 'edit',
  canExecute: () => hasSelection(),
  execute: () => {
    useDocumentStore.getState().deselectAll();
  },
};

export const editCommands: Command[] = [
  undo,
  redo,
  copyLayer,
  cutLayer,
  pasteLayer,
  deleteLayer,
  duplicateLayer,
  selectAll,
  deselect,
];
