import { useState, useEffect, useCallback, useMemo } from 'react';
import { DialogBase } from './DialogBase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportLayer {
  id: string;
  name: string;
  type: string;
  parentGroupId?: string | null;
  groupColor?: string | null;
  depth?: number;
}

export interface ProjectImportWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  layers?: ImportLayer[];
  onImport?: (selectedLayerIds: string[]) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_ICONS: Record<string, string> = {
  image: '[I]',
  text: '[T]',
  shape: '[S]',
  group: '[G]',
};

function getTypeIcon(type: string): string {
  return TYPE_ICONS[type.toLowerCase()] ?? '[?]';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectImportWindow({
  open,
  onOpenChange,
  projectName = 'Untitled',
  canvasWidth = 0,
  canvasHeight = 0,
  layers = [],
  onImport,
}: ProjectImportWindowProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Build a map of parentGroupId -> child layer ids for cascade logic
  const childrenMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const layer of layers) {
      if (layer.parentGroupId) {
        const existing = map.get(layer.parentGroupId) ?? [];
        existing.push(layer.id);
        map.set(layer.parentGroupId, existing);
      }
    }
    return map;
  }, [layers]);

  // Get all descendant ids of a group recursively
  const getDescendants = useCallback(
    (groupId: string): string[] => {
      const children = childrenMap.get(groupId) ?? [];
      const result: string[] = [];
      for (const childId of children) {
        result.push(childId);
        result.push(...getDescendants(childId));
      }
      return result;
    },
    [childrenMap],
  );

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
    }
  }, [open]);

  const toggleLayer = useCallback(
    (layer: ImportLayer) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        const wasSelected = next.has(layer.id);

        if (wasSelected) {
          // Uncheck this layer
          next.delete(layer.id);
          // If it's a group, also uncheck all descendants
          if (layer.type.toLowerCase() === 'group') {
            for (const descendantId of getDescendants(layer.id)) {
              next.delete(descendantId);
            }
          }
        } else {
          // Check this layer
          next.add(layer.id);
          // If it's a group, also check all descendants
          if (layer.type.toLowerCase() === 'group') {
            for (const descendantId of getDescendants(layer.id)) {
              next.add(descendantId);
            }
          }
        }

        return next;
      });
    },
    [getDescendants],
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(layers.map((l) => l.id)));
  }, [layers]);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const invertSelection = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const layer of layers) {
        if (!prev.has(layer.id)) next.add(layer.id);
      }
      return next;
    });
  }, [layers]);

  const handleImport = useCallback(() => {
    onImport?.(Array.from(selectedIds));
    onOpenChange(false);
  }, [selectedIds, onImport, onOpenChange]);

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={() => onOpenChange(false)}
        data-testid="project-import-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{
          backgroundColor: selectedIds.size > 0 ? 'var(--accent-orange)' : 'var(--border-color)',
          cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
        }}
        onClick={handleImport}
        disabled={selectedIds.size === 0}
        data-testid="project-import-apply"
      >
        Import
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Import Layers"
      width={450}
      height={520}
      footer={footer}
    >
      <div className="flex h-full flex-col gap-2 p-4" data-testid="project-import-content">
        {/* Header info */}
        <div
          className="flex flex-col gap-1 rounded border px-3 py-2"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--toolbar-bg)',
          }}
          data-testid="project-import-header"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)', minWidth: 60 }}>
              Project:
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              {projectName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)', minWidth: 60 }}>
              Canvas:
            </span>
            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
              {canvasWidth}x{canvasHeight}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)', minWidth: 60 }}>
              Layers:
            </span>
            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
              {layers.length}
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div
          className="flex shrink-0 items-center gap-1"
          data-testid="project-import-toolbar"
        >
          <button
            type="button"
            className="rounded px-2 py-1 text-xs hover:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)', border: '1px solid var(--border-color)' }}
            onClick={selectAll}
            data-testid="project-import-select-all"
          >
            Select All
          </button>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs hover:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)', border: '1px solid var(--border-color)' }}
            onClick={selectNone}
            data-testid="project-import-select-none"
          >
            Select None
          </button>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs hover:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)', border: '1px solid var(--border-color)' }}
            onClick={invertSelection}
            data-testid="project-import-invert"
          >
            Invert
          </button>
        </div>

        {/* Scrollable layer list */}
        <div
          className="flex-1 overflow-auto rounded border"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--toolbar-bg)',
          }}
          data-testid="project-import-layer-list"
        >
          {layers.length === 0 ? (
            <div
              className="flex items-center justify-center p-4 text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              No layers in project
            </div>
          ) : (
            layers.map((layer) => {
              const depth = layer.depth ?? 0;
              const typeIcon = getTypeIcon(layer.type);
              const isSelected = selectedIds.has(layer.id);

              return (
                <div
                  key={layer.id}
                  className="flex cursor-pointer items-center gap-1 px-2 py-1.5 hover:bg-[var(--hover-bg)]"
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: isSelected ? 'rgba(255,102,0,0.08)' : 'transparent',
                  }}
                  onClick={() => toggleLayer(layer)}
                  data-testid={`project-import-layer-${layer.id}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleLayer(layer)}
                    style={{ accentColor: 'var(--accent-orange)', flexShrink: 0 }}
                    data-testid={`project-import-layer-${layer.id}-checkbox`}
                  />

                  {/* Indent spacer */}
                  {depth > 0 && (
                    <div style={{ width: 28 * depth, flexShrink: 0 }} />
                  )}

                  {/* Group color bar */}
                  {layer.groupColor && (
                    <div
                      style={{
                        width: 4,
                        height: 20,
                        backgroundColor: layer.groupColor,
                        borderRadius: 1,
                        flexShrink: 0,
                      }}
                      data-testid={`project-import-layer-${layer.id}-color-bar`}
                    />
                  )}

                  {/* Type icon */}
                  <span
                    className="text-xs font-mono"
                    style={{
                      color: 'var(--accent-orange)',
                      fontSize: 10,
                      flexShrink: 0,
                      minWidth: 20,
                      textAlign: 'center',
                    }}
                  >
                    {typeIcon}
                  </span>

                  {/* Layer name */}
                  <span
                    className="flex-1 truncate text-xs"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {layer.name}
                  </span>

                  {/* Type label */}
                  <span
                    className="text-xs"
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: 10,
                      flexShrink: 0,
                    }}
                  >
                    {layer.type}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Summary */}
        <div
          className="flex items-center justify-between"
          data-testid="project-import-summary"
        >
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Selected: {selectedIds.size} / {layers.length} layers
          </span>
        </div>
      </div>
    </DialogBase>
  );
}

export default ProjectImportWindow;
