import type { LayerModel } from '../../../types/LayerModel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DropZone = 'top' | 'center' | 'bottom';

export interface LayerDropData {
  layerId: string;
  isGroup: boolean;
  isExpanded: boolean;
  parentGroupId: string | null;
  depth: number;
}

export interface DropIntent {
  type: 'insert-before' | 'insert-after' | 'into-group';
  targetLayerId: string;
  targetParentGroupId: string | null;
  targetDepth: number;
}

// ---------------------------------------------------------------------------
// Drop zone computation
// ---------------------------------------------------------------------------

export function computeDropZone(
  pointerY: number,
  rect: { top: number; bottom: number },
  isGroup: boolean,
  isExpanded?: boolean,
): DropZone {
  const height = rect.bottom - rect.top;
  if (height === 0) return 'top';
  const ratio = (pointerY - rect.top) / height;

  if (isGroup) {
    const edge = isExpanded ? 0.25 : 0.2;
    if (ratio < edge) return 'top';
    if (ratio > 1 - edge) return 'bottom';
    return 'center';
  }
  return ratio < 0.5 ? 'top' : 'bottom';
}

// ---------------------------------------------------------------------------
// Ancestry helpers
// ---------------------------------------------------------------------------

export function isDescendantOf(
  layerId: string,
  potentialAncestorId: string,
  allLayers: LayerModel[],
): boolean {
  let currentId: string | null = layerId;
  while (currentId) {
    const layer = allLayers.find((l) => l.id === currentId);
    if (!layer || !layer.parentGroupId) return false;
    if (layer.parentGroupId === potentialAncestorId) return true;
    currentId = layer.parentGroupId;
  }
  return false;
}

export function getSubtreeIds(layerId: string, allLayers: LayerModel[]): string[] {
  const result = [layerId];
  for (const l of allLayers) {
    if (l.parentGroupId === layerId) {
      result.push(...getSubtreeIds(l.id, allLayers));
    }
  }
  return result;
}

/**
 * Find the index of the last layer in a contiguous subtree block in the flat array.
 */
export function findEndOfSubtree(layerId: string, allLayers: LayerModel[]): number {
  const idx = allLayers.findIndex((l) => l.id === layerId);
  if (idx === -1) return -1;
  const baseDepth = allLayers[idx].depth;
  let end = idx;
  for (let i = idx + 1; i < allLayers.length; i++) {
    if (allLayers[i].depth > baseDepth) {
      end = i;
    } else {
      break;
    }
  }
  return end;
}

// ---------------------------------------------------------------------------
// Resolve drop intent
// ---------------------------------------------------------------------------

export function resolveDropIntent(
  activeLayer: LayerModel,
  overLayer: LayerModel,
  zone: DropZone,
  allLayers: LayerModel[],
): DropIntent | null {
  if (activeLayer.id === overLayer.id) return null;

  // Prevent dropping a group onto its own descendant
  if (isDescendantOf(overLayer.id, activeLayer.id, allLayers)) return null;

  switch (zone) {
    case 'top':
      return {
        type: 'insert-before',
        targetLayerId: overLayer.id,
        targetParentGroupId: overLayer.parentGroupId,
        targetDepth: overLayer.depth,
      };
    case 'bottom':
      return {
        type: 'insert-after',
        targetLayerId: overLayer.id,
        targetParentGroupId: overLayer.parentGroupId,
        targetDepth: overLayer.depth,
      };
    case 'center':
      if (overLayer.type !== 'group') return null;
      if (overLayer.depth + 1 > 2) return null;
      return {
        type: 'into-group',
        targetLayerId: overLayer.id,
        targetParentGroupId: overLayer.id,
        targetDepth: overLayer.depth + 1,
      };
  }
}

// ---------------------------------------------------------------------------
// Execute drop intent
// ---------------------------------------------------------------------------

export function executeDropIntent(
  intent: DropIntent,
  activeLayer: LayerModel,
  allLayers: LayerModel[],
  updateLayer: (id: string, changes: Partial<LayerModel>) => void,
  moveLayerSubtree: (layerId: string, newIndex: number) => void,
) {
  // 1. Remove from old parent's childIds
  if (activeLayer.parentGroupId) {
    const oldParent = allLayers.find((l) => l.id === activeLayer.parentGroupId);
    if (oldParent) {
      updateLayer(oldParent.id, {
        childIds: oldParent.childIds.filter((cid) => cid !== activeLayer.id),
      });
    }
  }

  // 2. Update parentGroupId and depth
  updateLayer(activeLayer.id, {
    parentGroupId: intent.targetParentGroupId,
    depth: intent.targetDepth,
  });

  // 3. Add to new parent's childIds if entering a group
  if (intent.targetParentGroupId) {
    const newParent = allLayers.find(
      (l) => l.id === intent.targetParentGroupId,
    );
    if (newParent && !newParent.childIds.includes(activeLayer.id)) {
      updateLayer(newParent.id, {
        childIds: [...newParent.childIds, activeLayer.id],
      });
    }
  }

  // 4. Move in the flat array
  const targetIndex = allLayers.findIndex((l) => l.id === intent.targetLayerId);
  if (targetIndex === -1) return;

  if (intent.type === 'insert-before') {
    moveLayerSubtree(activeLayer.id, targetIndex);
  } else if (intent.type === 'insert-after') {
    const endIdx = findEndOfSubtree(intent.targetLayerId, allLayers);
    moveLayerSubtree(activeLayer.id, endIdx + 1);
  } else if (intent.type === 'into-group') {
    // Insert right after the group header
    moveLayerSubtree(activeLayer.id, targetIndex + 1);
  }

  // 5. Update descendants' depth if the active layer is a group
  if (activeLayer.type === 'group') {
    updateDescendantDepths(activeLayer.id, intent.targetDepth + 1, allLayers, updateLayer);
  }
}

function updateDescendantDepths(
  groupId: string,
  newChildDepth: number,
  allLayers: LayerModel[],
  updateLayer: (id: string, changes: Partial<LayerModel>) => void,
) {
  for (const layer of allLayers) {
    if (layer.parentGroupId === groupId) {
      updateLayer(layer.id, { depth: newChildDepth });
      if (layer.type === 'group') {
        updateDescendantDepths(layer.id, newChildDepth + 1, allLayers, updateLayer);
      }
    }
  }
}
