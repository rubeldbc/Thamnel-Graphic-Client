import type { Command } from './types';
import { useDocumentStore } from '../stores/documentStore';
import { createDefaultLayer } from '../types/index';

function selectedCount(): number {
  return useDocumentStore.getState().selectedLayerIds.length;
}

function selectedIsGroup(): boolean {
  const state = useDocumentStore.getState();
  if (state.selectedLayerIds.length !== 1) return false;
  const layer = state.project.layers.find(
    (l) => l.id === state.selectedLayerIds[0],
  );
  return layer?.type === 'group';
}

function hasSelectionInGroup(): boolean {
  const state = useDocumentStore.getState();
  if (state.selectedLayerIds.length === 0) return false;
  return state.project.layers.some(
    (l) =>
      state.selectedLayerIds.includes(l.id) && l.parentGroupId !== null,
  );
}

export const group: Command = {
  name: 'group',
  shortcut: 'Ctrl+G',
  category: 'group',
  canExecute: () => selectedCount() >= 2,
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const groupLayer = createDefaultLayer({
      type: 'group',
      name: 'Group',
      width: 0,
      height: 0,
    });
    state.addLayer(groupLayer);
    for (const id of state.selectedLayerIds) {
      state.updateLayer(id, { parentGroupId: groupLayer.id, depth: 1 });
    }
    useDocumentStore.setState({ selectedLayerIds: [groupLayer.id] });
  },
};

export const ungroup: Command = {
  name: 'ungroup',
  shortcut: 'Ctrl+Shift+G',
  category: 'group',
  canExecute: () => selectedIsGroup(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const groupId = state.selectedLayerIds[0];
    // Remove parentGroupId from children
    for (const layer of state.project.layers) {
      if (layer.parentGroupId === groupId) {
        state.updateLayer(layer.id, { parentGroupId: null, depth: 0 });
      }
    }
    // Remove group layer itself
    state.removeLayer(groupId);
  },
};

export const releaseFromGroup: Command = {
  name: 'releaseFromGroup',
  category: 'group',
  canExecute: () => hasSelectionInGroup(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    for (const id of state.selectedLayerIds) {
      const layer = state.project.layers.find((l) => l.id === id);
      if (layer && layer.parentGroupId !== null) {
        state.updateLayer(id, { parentGroupId: null, depth: 0 });
      }
    }
  },
};

export const groupCommands: Command[] = [group, ungroup, releaseFromGroup];
