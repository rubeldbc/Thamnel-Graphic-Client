import { useCallback, useMemo, useRef, useState } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { LayerItem, type LayerData } from './LayerItem';
import { LayerTreeConnector } from './LayerTreeConnector';
import { LayerFooterBar, type LayerFooterBarProps } from './LayerFooterBar';
import { GroupContextMenu } from '../../ContextMenus/GroupContextMenu';
import { useGroupContextMenuAction } from '../../ContextMenus/useContextMenuActions';
import { useDocumentStore } from '../../../stores/documentStore';
import { useUndoRedoStore } from '../../../stores/undoRedoStore';
import { createDefaultLayer, cloneLayer, getUniqueLayerName } from '../../../types/LayerModel';
import type { LayerModel } from '../../../types/LayerModel';

// ---------------------------------------------------------------------------
// Props (still accepted for backward-compat, but now mostly wired internally)
// ---------------------------------------------------------------------------

export interface LayersTabProps {
  /** @deprecated Layers are now read from documentStore. */
  layers?: LayerData[];
  /** @deprecated Selection is now managed by documentStore. */
  selectedLayerId?: string | null;
  onSelectLayer?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onToggleExpand?: (id: string) => void;
  onRenameLayer?: (id: string, newName: string) => void;
  footerActions?: LayerFooterBarProps;
}

// ---------------------------------------------------------------------------
// Helpers: LayerModel -> LayerData for LayerItem rendering
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

/**
 * Filter layers for tree display: hide children of collapsed groups.
 */
function getVisibleTreeLayers(layers: LayerModel[]): LayerModel[] {
  const collapsedGroupIds = new Set<string>();
  const result: LayerModel[] = [];

  for (const layer of layers) {
    // Skip if any ancestor is collapsed
    if (layer.parentGroupId && collapsedGroupIds.has(layer.parentGroupId)) {
      // Mark this as collapsed too if it's a group (so its children are also hidden)
      if (layer.type === 'group') {
        collapsedGroupIds.add(layer.id);
      }
      continue;
    }

    result.push(layer);

    // If this is a collapsed group, mark it so children are hidden
    if (layer.type === 'group' && !layer.isExpanded) {
      collapsedGroupIds.add(layer.id);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Sortable layer row wrapper
// ---------------------------------------------------------------------------

interface SortableLayerRowProps {
  layer: LayerModel;
  allLayers: LayerModel[];
  isSelected: boolean;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  isLast: boolean;
  nextDepth: number;
}

function SortableLayerRow({
  layer,
  allLayers: _allLayers,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onToggleExpand,
  onRename,
  isLast,
  nextDepth,
}: SortableLayerRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
  };

  const layerData = toLayerData(layer);
  const groupAction = useGroupContextMenuAction();

  const rowContent = (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {/* Tree connector for nested items */}
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

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function LayersTab(_props: LayersTabProps) {
  const project = useDocumentStore((s) => s.project);
  const selectedLayerIds = useDocumentStore((s) => s.selectedLayerIds);
  const selectLayer = useDocumentStore((s) => s.selectLayer);
  const toggleSelection = useDocumentStore((s) => s.toggleSelection);
  const updateLayer = useDocumentStore((s) => s.updateLayer);
  const addLayer = useDocumentStore((s) => s.addLayer);
  const removeLayer = useDocumentStore((s) => s.removeLayer);
  const moveLayer = useDocumentStore((s) => s.moveLayer);
  const takeSnapshot = useUndoRedoStore((s) => s.takeSnapshot);

  const [activeId, setActiveId] = useState<string | null>(null);
  const lastSelectedRef = useRef<string | null>(null);

  const layers = project.layers;

  // Filter tree for display (collapsed groups hide children)
  const visibleLayers = useMemo(() => getVisibleTreeLayers(layers), [layers]);
  const layerIds = useMemo(() => visibleLayers.map((l) => l.id), [visibleLayers]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // ---- Selection handler (click / shift+click) ----
  const handleSelect = useCallback(
    (id: string, event: React.MouseEvent) => {
      if (event.shiftKey) {
        // Shift+click: range select between lastSelected and current
        if (lastSelectedRef.current) {
          const lastIdx = visibleLayers.findIndex((l) => l.id === lastSelectedRef.current);
          const currentIdx = visibleLayers.findIndex((l) => l.id === id);
          if (lastIdx !== -1 && currentIdx !== -1) {
            const start = Math.min(lastIdx, currentIdx);
            const end = Math.max(lastIdx, currentIdx);
            const idsToSelect = visibleLayers.slice(start, end + 1).map((l) => l.id);
            useDocumentStore.setState({ selectedLayerIds: idsToSelect });
            return;
          }
        }
        toggleSelection(id);
      } else if (event.ctrlKey || event.metaKey) {
        toggleSelection(id);
      } else {
        selectLayer(id);
      }
      lastSelectedRef.current = id;
    },
    [visibleLayers, selectLayer, toggleSelection],
  );

  // ---- Visibility toggle (group: toggle all descendants) ----
  const handleToggleVisibility = useCallback(
    (id: string) => {
      takeSnapshot();
      const layer = layers.find((l) => l.id === id);
      if (!layer) return;
      const newVisible = !layer.visible;
      updateLayer(id, { visible: newVisible });

      // If group, toggle all descendants too
      if (layer.type === 'group') {
        const toggleDescendants = (parentId: string) => {
          for (const child of layers) {
            if (child.parentGroupId === parentId) {
              updateLayer(child.id, { visible: newVisible });
              if (child.type === 'group') {
                toggleDescendants(child.id);
              }
            }
          }
        };
        toggleDescendants(id);
      }
    },
    [layers, updateLayer, takeSnapshot],
  );

  // ---- Lock toggle ----
  const handleToggleLock = useCallback(
    (id: string) => {
      takeSnapshot();
      const layer = layers.find((l) => l.id === id);
      if (!layer) return;
      updateLayer(id, { locked: !layer.locked });
    },
    [layers, updateLayer, takeSnapshot],
  );

  // ---- Expand/collapse toggle ----
  const handleToggleExpand = useCallback(
    (id: string) => {
      const layer = layers.find((l) => l.id === id);
      if (!layer) return;
      updateLayer(id, { isExpanded: !layer.isExpanded });
    },
    [layers, updateLayer],
  );

  // ---- Inline rename ----
  const handleRename = useCallback(
    (id: string, newName: string) => {
      takeSnapshot();
      updateLayer(id, { name: newName });
    },
    [updateLayer, takeSnapshot],
  );

  // ---- Drag-and-drop ----
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      takeSnapshot();

      const oldIndex = layers.findIndex((l) => l.id === active.id);
      const overIndex = layers.findIndex((l) => l.id === over.id);

      if (oldIndex === -1 || overIndex === -1) return;

      // Check max depth (2) enforcement
      const movingLayer = layers[oldIndex];
      const targetLayer = layers[overIndex];

      // If dropping into a group (and target is at depth < 2), reparent
      if (
        targetLayer.type === 'group' &&
        targetLayer.depth < 2 &&
        movingLayer.depth <= 2
      ) {
        // Reparent: set parentGroupId to target, update depth
        const newDepth = targetLayer.depth + 1;
        if (newDepth <= 2) {
          updateLayer(movingLayer.id, {
            parentGroupId: targetLayer.id,
            depth: newDepth,
          });
          // Add to group's childIds
          if (!targetLayer.childIds.includes(movingLayer.id)) {
            updateLayer(targetLayer.id, {
              childIds: [...targetLayer.childIds, movingLayer.id],
            });
          }
        }
      }

      // Always reorder by index
      moveLayer(active.id as string, overIndex);
    },
    [layers, moveLayer, updateLayer, takeSnapshot],
  );

  // ---- Footer button actions ----
  const handleNewLayer = useCallback(() => {
    takeSnapshot();
    const name = getUniqueLayerName('Layer', layers);
    const newLayer = createDefaultLayer({ name, type: 'image' });
    addLayer(newLayer);
    selectLayer(newLayer.id);
  }, [layers, addLayer, selectLayer, takeSnapshot]);

  const handleNewGroup = useCallback(() => {
    takeSnapshot();
    const name = getUniqueLayerName('Group', layers);
    const newGroup = createDefaultLayer({
      name,
      type: 'group',
      groupColor: '#888888',
    });
    addLayer(newGroup);
    selectLayer(newGroup.id);
  }, [layers, addLayer, selectLayer, takeSnapshot]);

  const handleDuplicate = useCallback(() => {
    if (selectedLayerIds.length === 0) return;
    takeSnapshot();

    for (const selectedId of selectedLayerIds) {
      const layer = layers.find((l) => l.id === selectedId);
      if (!layer) continue;
      const clone = cloneLayer(layer);
      clone.name = getUniqueLayerName(layer.name, layers);
      clone.x += 20;
      clone.y += 20;
      addLayer(clone);
    }
  }, [selectedLayerIds, layers, addLayer, takeSnapshot]);

  const handleDelete = useCallback(() => {
    if (selectedLayerIds.length === 0) return;
    takeSnapshot();
    for (const id of [...selectedLayerIds]) {
      removeLayer(id);
    }
  }, [selectedLayerIds, removeLayer, takeSnapshot]);

  const handleBringForward = useCallback(() => {
    if (selectedLayerIds.length !== 1) return;
    const id = selectedLayerIds[0];
    const idx = layers.findIndex((l) => l.id === id);
    if (idx <= 0) return;
    takeSnapshot();
    moveLayer(id, idx - 1);
  }, [selectedLayerIds, layers, moveLayer, takeSnapshot]);

  const handleSendBackward = useCallback(() => {
    if (selectedLayerIds.length !== 1) return;
    const id = selectedLayerIds[0];
    const idx = layers.findIndex((l) => l.id === id);
    if (idx === -1 || idx >= layers.length - 1) return;
    takeSnapshot();
    moveLayer(id, idx + 1);
  }, [selectedLayerIds, layers, moveLayer, takeSnapshot]);

  const handleGroup = useCallback(() => {
    if (selectedLayerIds.length < 2) return;
    takeSnapshot();
    const name = getUniqueLayerName('Group', layers);
    const newGroup = createDefaultLayer({
      name,
      type: 'group',
      groupColor: '#888888',
      isExpanded: true,
      childIds: [...selectedLayerIds],
    });

    // Set parentGroupId and depth on selected layers
    for (const id of selectedLayerIds) {
      updateLayer(id, { parentGroupId: newGroup.id, depth: 1 });
    }

    addLayer(newGroup);
    selectLayer(newGroup.id);
  }, [selectedLayerIds, layers, addLayer, selectLayer, updateLayer, takeSnapshot]);

  const handleUngroup = useCallback(() => {
    if (selectedLayerIds.length !== 1) return;
    const groupId = selectedLayerIds[0];
    const group = layers.find((l) => l.id === groupId);
    if (!group || group.type !== 'group') return;
    takeSnapshot();

    // Detach all children
    for (const childId of group.childIds) {
      updateLayer(childId, { parentGroupId: null, depth: 0 });
    }

    removeLayer(groupId);
  }, [selectedLayerIds, layers, updateLayer, removeLayer, takeSnapshot]);

  const handleExport = useCallback(() => {
    // Placeholder: export functionality to be wired later
  }, []);

  // Active drag layer for overlay
  const activeLayer = activeId ? layers.find((l) => l.id === activeId) : null;

  return (
    <div
      data-testid="layers-tab"
      className="flex h-full flex-col"
      style={{ backgroundColor: 'var(--panel-bg)' }}
    >
      {/* ---- Scrollable layer list with DnD ---- */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea.Root className="min-h-0 flex-1" type="auto">
          <ScrollArea.Viewport className="h-full w-full">
            {visibleLayers.length === 0 ? (
              <div
                data-testid="layers-empty"
                className="flex h-full items-center justify-center"
                style={{ color: 'var(--text-disabled)', fontSize: 12, minHeight: 60 }}
              >
                No layers
              </div>
            ) : (
              <SortableContext
                items={layerIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col py-0.5">
                  {visibleLayers.map((layer, index) => (
                    <SortableLayerRow
                      key={layer.id}
                      layer={layer}
                      allLayers={layers}
                      isSelected={selectedLayerIds.includes(layer.id)}
                      onSelect={handleSelect}
                      onToggleVisibility={handleToggleVisibility}
                      onToggleLock={handleToggleLock}
                      onToggleExpand={handleToggleExpand}
                      onRename={handleRename}
                      isLast={index === visibleLayers.length - 1}
                      nextDepth={visibleLayers[index + 1]?.depth ?? 0}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar
            orientation="vertical"
            className="flex w-2 touch-none p-[1px] select-none"
          >
            <ScrollArea.Thumb
              className="relative flex-1 rounded-full"
              style={{ backgroundColor: 'var(--border-color)' }}
            />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>

        {/* Drag overlay */}
        <DragOverlay>
          {activeLayer ? (
            <div
              style={{
                opacity: 0.8,
                backgroundColor: 'var(--panel-bg)',
                border: '1px solid #FF6600',
                borderRadius: 2,
              }}
            >
              <LayerItem
                layer={toLayerData(activeLayer)}
                isSelected={true}
                onSelect={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ---- Footer bar ---- */}
      <LayerFooterBar
        onExport={handleExport}
        onNewLayer={handleNewLayer}
        onNewGroup={handleNewGroup}
        onDuplicate={handleDuplicate}
        onBringForward={handleBringForward}
        onSendBackward={handleSendBackward}
        onGroup={handleGroup}
        onUngroup={handleUngroup}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default LayersTab;
