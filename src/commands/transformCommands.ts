import type { Command } from './types';
import { useDocumentStore } from '../stores/documentStore';

function hasSelection(): boolean {
  return useDocumentStore.getState().selectedLayerIds.length > 0;
}

export const flipHorizontal: Command = {
  name: 'flipHorizontal',
  shortcut: 'Ctrl+H',
  category: 'transform',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    for (const id of state.selectedLayerIds) {
      const layer = state.project.layers.find((l) => l.id === id);
      if (layer) {
        state.updateLayer(id, { flipHorizontal: !layer.flipHorizontal });
      }
    }
  },
};

export const flipVertical: Command = {
  name: 'flipVertical',
  shortcut: 'Ctrl+Shift+H',
  category: 'transform',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    for (const id of state.selectedLayerIds) {
      const layer = state.project.layers.find((l) => l.id === id);
      if (layer) {
        state.updateLayer(id, { flipVertical: !layer.flipVertical });
      }
    }
  },
};

export const rotate90: Command = {
  name: 'rotate90',
  shortcut: 'Ctrl+R',
  category: 'transform',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    for (const id of state.selectedLayerIds) {
      const layer = state.project.layers.find((l) => l.id === id);
      if (layer) {
        state.updateLayer(id, { rotation: (layer.rotation + 90) % 360 });
      }
    }
  },
};

export const fitToCanvas: Command = {
  name: 'fitToCanvas',
  shortcut: 'Ctrl+F',
  category: 'transform',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const { canvasWidth, canvasHeight } = state.project;
    for (const id of state.selectedLayerIds) {
      state.updateLayer(id, { x: 0, y: 0, width: canvasWidth, height: canvasHeight });
    }
  },
};

export const fitWidth: Command = {
  name: 'fitWidth',
  shortcut: 'Ctrl+Shift+F',
  category: 'transform',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const { canvasWidth } = state.project;
    for (const id of state.selectedLayerIds) {
      const layer = state.project.layers.find((l) => l.id === id);
      if (layer) {
        const aspect = layer.height / (layer.width || 1);
        state.updateLayer(id, { x: 0, width: canvasWidth, height: canvasWidth * aspect });
      }
    }
  },
};

export const fitHeight: Command = {
  name: 'fitHeight',
  shortcut: 'Ctrl+Alt+Shift+F',
  category: 'transform',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const { canvasHeight } = state.project;
    for (const id of state.selectedLayerIds) {
      const layer = state.project.layers.find((l) => l.id === id);
      if (layer) {
        const aspect = layer.width / (layer.height || 1);
        state.updateLayer(id, { y: 0, width: canvasHeight * aspect, height: canvasHeight });
      }
    }
  },
};

export const transformCommands: Command[] = [
  flipHorizontal,
  flipVertical,
  rotate90,
  fitToCanvas,
  fitWidth,
  fitHeight,
];
