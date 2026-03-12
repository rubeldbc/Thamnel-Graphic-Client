import { useCallback } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

import { LayerItem, type LayerData } from './LayerItem';
import { LayerTreeConnector } from './LayerTreeConnector';
import { GroupContextMenu } from '../../ContextMenus/GroupContextMenu';
import { useGroupContextMenuAction } from '../../ContextMenus/useContextMenuActions';
import type { LayerModel } from '../../../types/LayerModel';
import type { LayerDropData } from './layerDndUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toLayerData(layer: LayerModel): LayerData {
  return {
    id: layer.id,
    name: layer.name,
    type: layer.type,
    visible: layer.visible,
    locked: layer.locked,
    superLocked: layer.superLocked,
    isGroup: layer.type === 'group',
    expanded: layer.isExpanded,
    depth: layer.depth,
    groupColor: layer.groupColor ?? '#888888',
    isFrameReceiver: layer.isFrameReceiver,
    thumbnailUrl: layer.thumbnailData ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DraggableLayerRowProps {
  layer: LayerModel;
  isSelected: boolean;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  isLast: boolean;
  nextDepth: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DraggableLayerRow({
  layer,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onToggleExpand,
  onRename,
  isLast,
  nextDepth,
}: DraggableLayerRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({ id: layer.id });

  const dropData: LayerDropData = {
    layerId: layer.id,
    isGroup: layer.type === 'group',
    isExpanded: layer.isExpanded,
    parentGroupId: layer.parentGroupId,
    depth: layer.depth,
  };

  const { setNodeRef: setDropRef } = useDroppable({
    id: `drop-${layer.id}`,
    data: dropData,
  });

  const mergedRef = useCallback(
    (node: HTMLElement | null) => {
      setDragRef(node);
      setDropRef(node);
    },
    [setDragRef, setDropRef],
  );

  const groupAction = useGroupContextMenuAction();
  const layerData = toLayerData(layer);

  const rowContent = (
    <div
      ref={mergedRef}
      style={{
        opacity: isDragging ? 0.3 : 1,
        position: 'relative',
      }}
      {...attributes}
      {...listeners}
    >
      {layer.depth > 0 && (
        <LayerTreeConnector
          depth={layer.depth}
          isLast={isLast || nextDepth < layer.depth}
          groupColor={layer.groupColor ?? '#888888'}
        />
      )}
      <LayerItem
        layer={layerData}
        isSelected={isSelected}
        onSelect={onSelect}
        onToggleVisibility={onToggleVisibility}
        onToggleLock={onToggleLock}
        onToggleExpand={onToggleExpand}
        onRename={onRename}
      />
    </div>
  );

  if (layer.type === 'group') {
    return (
      <GroupContextMenu onAction={groupAction} groupName={layer.name}>
        {rowContent}
      </GroupContextMenu>
    );
  }

  return rowContent;
}
