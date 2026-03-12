import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import {
  DndContext,
  pointerWithin,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
} from '@dnd-kit/core';

import { LayerItem, type LayerData } from './LayerItem';
import { LayerFooterBar, type LayerFooterBarProps } from './LayerFooterBar';
import { DraggableLayerRow } from './DraggableLayerRow';
import { DropIndicator } from './DropIndicator';
import {
  computeDropZone,
  resolveDropIntent,
  executeDropIntent,
  type DropZone,
  type LayerDropData,
} from './layerDndUtils';
import { useDocumentStore } from '../../../stores/documentStore';
import { useUndoRedoStore } from '../../../stores/undoRedoStore';
import { createDefaultLayer, cloneLayer, getUniqueLayerName } from '../../../types/LayerModel';
import type { LayerModel } from '../../../types/LayerModel';

// ---------------------------------------------------------------------------
// Props
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

function getVisibleTreeLayers(layers: LayerModel[]): LayerModel[] {
  const collapsedGroupIds = new Set<string>();
  const result: LayerModel[] = [];

  for (const layer of layers) {
    if (layer.parentGroupId && collapsedGroupIds.has(layer.parentGroupId)) {
      if (layer.type === 'group') {
        collapsedGroupIds.add(layer.id);
      }
      continue;
    }

    result.push(layer);

    if (layer.type === 'group' && !layer.isExpanded) {
      collapsedGroupIds.add(layer.id);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Bottom drop zone — always inserts at the very bottom, outside any group
// ---------------------------------------------------------------------------

const BOTTOM_DROP_ID = '__bottom_drop_zone__';

function BottomDropZone({ isActive }: { isActive: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: BOTTOM_DROP_ID,
    data: { layerId: BOTTOM_DROP_ID, isGroup: false, isExpanded: false, parentGroupId: null, depth: 0 },
  });

  if (!isActive) return null;

  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 40,
        flex: 1,
        borderTop: isOver ? '2px solid #2196F3' : '2px solid transparent',
      }}
    />
  );
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
  const addLayerAtIndex = useDocumentStore((s) => s.addLayerAtIndex);
  const removeLayer = useDocumentStore((s) => s.removeLayer);
  const moveLayer = useDocumentStore((s) => s.moveLayer);
  const moveLayerSubtree = useDocumentStore((s) => s.moveLayerSubtree);
  const takeSnapshot = useUndoRedoStore((s) => s.takeSnapshot);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropFeedback, setDropFeedback] = useState<{
    layerId: string;
    zone: DropZone;
    rect: { top: number; bottom: number; left: number; right: number };
  } | null>(null);
  const lastSelectedRef = useRef<string | null>(null);
  const pointerYRef = useRef(0);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const layers = project.layers;

  const visibleLayers = useMemo(() => getVisibleTreeLayers(layers), [layers]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // Track pointer Y during drag for zone computation
  useEffect(() => {
    if (!activeId) return;
    const handler = (e: PointerEvent) => {
      pointerYRef.current = e.clientY;
    };
    document.addEventListener('pointermove', handler);
    return () => document.removeEventListener('pointermove', handler);
  }, [activeId]);

  // ---- Helper: get all leaf (non-group) descendants of a group recursively ----
  const getGroupChildIds = useCallback(
    (groupId: string): string[] => {
      const result: string[] = [];
      for (const l of layers) {
        if (l.parentGroupId === groupId) {
          if (l.type === 'group') {
            result.push(...getGroupChildIds(l.id));
          } else {
            result.push(l.id);
          }
        }
      }
      return result;
    },
    [layers],
  );

  // ---- Selection handler ----
  const handleSelect = useCallback(
    (id: string, event: React.MouseEvent) => {
      // Check if clicking a group — expand to children
      const clickedLayer = layers.find((l) => l.id === id);
      const resolveId = (layerId: string): string[] => {
        const layer = layers.find((l) => l.id === layerId);
        if (layer?.type === 'group') {
          const childIds = getGroupChildIds(layerId);
          return childIds.length > 0 ? childIds : [layerId];
        }
        return [layerId];
      };

      if (event.shiftKey) {
        if (lastSelectedRef.current) {
          const lastIdx = visibleLayers.findIndex((l) => l.id === lastSelectedRef.current);
          const currentIdx = visibleLayers.findIndex((l) => l.id === id);
          if (lastIdx !== -1 && currentIdx !== -1) {
            const start = Math.min(lastIdx, currentIdx);
            const end = Math.max(lastIdx, currentIdx);
            const idsToSelect: string[] = [];
            for (const l of visibleLayers.slice(start, end + 1)) {
              idsToSelect.push(...resolveId(l.id));
            }
            useDocumentStore.setState({ selectedLayerIds: [...new Set(idsToSelect)] });
            return;
          }
        }
        toggleSelection(id);
      } else if (event.ctrlKey || event.metaKey) {
        // For ctrl+click on group, toggle all children
        if (clickedLayer?.type === 'group') {
          const childIds = getGroupChildIds(id);
          const currentIds = useDocumentStore.getState().selectedLayerIds;
          const allSelected = childIds.every((cid) => currentIds.includes(cid));
          if (allSelected) {
            // Remove all children from selection
            useDocumentStore.setState({
              selectedLayerIds: currentIds.filter((sid) => !childIds.includes(sid)),
            });
          } else {
            // Add all children to selection
            useDocumentStore.setState({
              selectedLayerIds: [...new Set([...currentIds, ...childIds])],
            });
          }
        } else {
          toggleSelection(id);
        }
      } else {
        const resolved = resolveId(id);
        useDocumentStore.setState({ selectedLayerIds: resolved });
      }
      lastSelectedRef.current = id;
    },
    [layers, visibleLayers, toggleSelection, getGroupChildIds],
  );

  // ---- Visibility toggle ----
  const handleToggleVisibility = useCallback(
    (id: string) => {
      takeSnapshot();
      const layer = layers.find((l) => l.id === id);
      if (!layer) return;
      const newVisible = !layer.visible;
      updateLayer(id, { visible: newVisible });
      if (layer.type === 'group') {
        const toggleDescendants = (parentId: string) => {
          for (const child of layers) {
            if (child.parentGroupId === parentId) {
              updateLayer(child.id, { visible: newVisible });
              if (child.type === 'group') toggleDescendants(child.id);
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

  // ---- Drag-and-drop (Photoshop-style) ----
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) {
        setDropFeedback(null);
        return;
      }

      const data = over.data.current as LayerDropData | undefined;
      if (!data || data.layerId === BOTTOM_DROP_ID) {
        setDropFeedback(null);
        return;
      }

      const zone = computeDropZone(
        pointerYRef.current,
        over.rect,
        data.isGroup,
        data.isExpanded,
      );

      setDropFeedback({
        layerId: data.layerId,
        zone,
        rect: over.rect,
      });
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setDropFeedback(null);

      if (!over) return;

      const data = over.data.current as LayerDropData | undefined;
      if (!data) return;

      const activeLayer = layers.find((l) => l.id === active.id);
      if (!activeLayer) return;

      // Bottom drop zone: move to the very end, outside any group
      if (data.layerId === BOTTOM_DROP_ID) {
        takeSnapshot();
        if (activeLayer.parentGroupId) {
          const oldParent = layers.find((l) => l.id === activeLayer.parentGroupId);
          if (oldParent) {
            updateLayer(oldParent.id, {
              childIds: oldParent.childIds.filter((cid) => cid !== activeLayer.id),
            });
          }
          updateLayer(activeLayer.id, { parentGroupId: null, depth: 0 });
        }
        moveLayerSubtree(activeLayer.id, layers.length);
        return;
      }

      const overLayer = layers.find((l) => l.id === data.layerId);
      if (!overLayer) return;
      if (activeLayer.id === overLayer.id) return;

      const zone = computeDropZone(
        pointerYRef.current,
        over.rect,
        data.isGroup,
        data.isExpanded,
      );

      const intent = resolveDropIntent(activeLayer, overLayer, zone, layers);
      if (!intent) return;

      takeSnapshot();
      executeDropIntent(intent, activeLayer, layers, updateLayer, moveLayerSubtree);
    },
    [layers, updateLayer, moveLayerSubtree, takeSnapshot],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setDropFeedback(null);
  }, []);

  // ---- Insert context (above selected layer) ----
  const getInsertContext = useCallback(() => {
    if (selectedLayerIds.length === 0)
      return { index: layers.length, parentGroupId: null as string | null, depth: 0 };
    const selId = selectedLayerIds[0];
    const selIdx = layers.findIndex((l) => l.id === selId);
    const selLayer = layers[selIdx];
    if (!selLayer)
      return { index: layers.length, parentGroupId: null as string | null, depth: 0 };
    return {
      index: selIdx,
      parentGroupId: selLayer.parentGroupId,
      depth: selLayer.depth,
    };
  }, [selectedLayerIds, layers]);

  // ---- Footer button actions ----
  const handleNewLayer = useCallback(() => {
    takeSnapshot();
    const name = getUniqueLayerName('Layer', layers);
    const ctx = getInsertContext();
    const newLayer = createDefaultLayer({
      name,
      type: 'image',
      parentGroupId: ctx.parentGroupId,
      depth: ctx.depth,
    });
    addLayerAtIndex(newLayer, ctx.index);
    if (ctx.parentGroupId) {
      const parentGroup = layers.find((l) => l.id === ctx.parentGroupId);
      if (parentGroup && !parentGroup.childIds.includes(newLayer.id)) {
        updateLayer(ctx.parentGroupId, {
          childIds: [...parentGroup.childIds, newLayer.id],
        });
      }
    }
    selectLayer(newLayer.id);
  }, [layers, addLayerAtIndex, selectLayer, updateLayer, takeSnapshot, getInsertContext]);

  const handleNewGroup = useCallback(() => {
    takeSnapshot();
    const name = getUniqueLayerName('Group', layers);
    const ctx = getInsertContext();
    const newGroup = createDefaultLayer({
      name,
      type: 'group',
      groupColor: '#888888',
      parentGroupId: ctx.parentGroupId,
      depth: ctx.depth,
    });
    addLayerAtIndex(newGroup, ctx.index);
    if (ctx.parentGroupId) {
      const parentGroup = layers.find((l) => l.id === ctx.parentGroupId);
      if (parentGroup && !parentGroup.childIds.includes(newGroup.id)) {
        updateLayer(ctx.parentGroupId, {
          childIds: [...parentGroup.childIds, newGroup.id],
        });
      }
    }
    selectLayer(newGroup.id);
  }, [layers, addLayerAtIndex, selectLayer, updateLayer, takeSnapshot, getInsertContext]);

  const handleDuplicate = useCallback(() => {
    if (selectedLayerIds.length === 0) return;
    takeSnapshot();
    const currentLayers = useDocumentStore.getState().project.layers;
    for (const selectedId of selectedLayerIds) {
      const layer = currentLayers.find((l) => l.id === selectedId);
      if (!layer) continue;
      const clone = cloneLayer(layer);
      clone.name = getUniqueLayerName(layer.name, currentLayers);
      clone.x += 20;
      clone.y += 20;
      // Insert above the source layer
      const sourceIdx = useDocumentStore.getState().project.layers.findIndex((l) => l.id === layer.id);
      if (sourceIdx !== -1) {
        addLayerAtIndex(clone, sourceIdx);
      } else {
        addLayer(clone);
      }
    }
  }, [selectedLayerIds, addLayer, addLayerAtIndex, takeSnapshot]);

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
    for (const childId of group.childIds) {
      updateLayer(childId, { parentGroupId: null, depth: 0 });
    }
    removeLayer(groupId);
  }, [selectedLayerIds, layers, updateLayer, removeLayer, takeSnapshot]);

  const handleExport = useCallback(() => {}, []);

  // Active drag layer for overlay
  const activeLayer = activeId ? layers.find((l) => l.id === activeId) : null;

  // Compute drop indicator position relative to the list container
  const indicatorPos = useMemo(() => {
    if (!dropFeedback || !listContainerRef.current) return null;
    const containerRect = listContainerRef.current.getBoundingClientRect();
    return {
      top: dropFeedback.rect.top - containerRect.top,
      width: containerRect.width,
      height: dropFeedback.rect.bottom - dropFeedback.rect.top,
      zone: dropFeedback.zone,
    };
  }, [dropFeedback]);

  return (
    <div
      data-testid="layers-tab"
      className="flex h-full flex-col"
      style={{ backgroundColor: 'var(--panel-bg)' }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
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
              <div ref={listContainerRef} className="relative flex flex-col py-0.5">
                {visibleLayers.map((layer, index) => {
                  // Group is "selected" if any of its children are selected
                  const isLayerSelected = layer.type === 'group'
                    ? getGroupChildIds(layer.id).some((cid) => selectedLayerIds.includes(cid))
                    : selectedLayerIds.includes(layer.id);
                  return (
                  <DraggableLayerRow
                    key={layer.id}
                    layer={layer}
                    isSelected={isLayerSelected}
                    onSelect={handleSelect}
                    onToggleVisibility={handleToggleVisibility}
                    onToggleLock={handleToggleLock}
                    onToggleExpand={handleToggleExpand}
                    onRename={handleRename}
                    isLast={index === visibleLayers.length - 1}
                    nextDepth={visibleLayers[index + 1]?.depth ?? 0}
                  />
                  );
                })}
                {/* Bottom drop zone — drop here to place at the very bottom */}
                <BottomDropZone isActive={activeId !== null} />
                {/* Drop indicator overlay */}
                {activeId && indicatorPos && (
                  <DropIndicator
                    top={indicatorPos.top}
                    width={indicatorPos.width}
                    height={indicatorPos.height}
                    zone={indicatorPos.zone}
                  />
                )}
              </div>
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

        {/* Drag overlay (floating preview) */}
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

      {/* Footer bar */}
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
