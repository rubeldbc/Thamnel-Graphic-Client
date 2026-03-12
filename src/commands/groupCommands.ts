import type { Command } from './types';
import { useDocumentStore } from '../stores/documentStore';
import { createDefaultLayer } from '../types/index';

function selectedCount(): number {
  return useDocumentStore.getState().selectedLayerIds.length;
}

/**
 * Returns the group ID to ungroup, or null if not applicable.
 * Works when either:
 * - A group layer itself is selected (e.g. from the Layers panel), OR
 * - One or more children of the same group are selected (from canvas).
 */
function findGroupToUngroup(): string | null {
  const state = useDocumentStore.getState();
  if (state.selectedLayerIds.length === 0) return null;

  // Case 1: a group layer is directly selected
  if (state.selectedLayerIds.length === 1) {
    const layer = state.project.layers.find(
      (l) => l.id === state.selectedLayerIds[0],
    );
    if (layer?.type === 'group') return layer.id;
  }

  // Case 2: selected layers share a common parent group
  const selectedLayers = state.project.layers.filter((l) =>
    state.selectedLayerIds.includes(l.id),
  );
  const parentIds = new Set(
    selectedLayers.map((l) => l.parentGroupId).filter(Boolean),
  );
  if (parentIds.size === 1) {
    const parentId = [...parentIds][0]!;
    const parent = state.project.layers.find((l) => l.id === parentId);
    if (parent?.type === 'group') return parent.id;
  }

  // Case 3: single child of a group is selected
  if (state.selectedLayerIds.length === 1) {
    const layer = state.project.layers.find(
      (l) => l.id === state.selectedLayerIds[0],
    );
    if (layer?.parentGroupId) {
      const parent = state.project.layers.find(
        (l) => l.id === layer.parentGroupId,
      );
      if (parent?.type === 'group') return parent.id;
    }
  }

  return null;
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
  canExecute: () => findGroupToUngroup() !== null,
  execute: () => {
    const groupId = findGroupToUngroup();
    if (!groupId) return;

    const state = useDocumentStore.getState();
    state.pushUndo();

    // Collect child IDs before ungrouping
    const childIds: string[] = [];
    for (const layer of state.project.layers) {
      if (layer.parentGroupId === groupId) {
        childIds.push(layer.id);
        state.updateLayer(layer.id, { parentGroupId: null, depth: 0 });
      }
    }

    // Remove group layer itself
    state.removeLayer(groupId);

    // Select the former children
    if (childIds.length > 0) {
      useDocumentStore.setState({ selectedLayerIds: childIds });
    }
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
