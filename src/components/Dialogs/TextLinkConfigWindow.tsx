import { useState, useCallback } from 'react';
import { DialogBase } from './DialogBase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvailableGroup {
  id: string;
  name: string;
  color?: string;
  textLayers: Array<{ id: string; name: string }>;
}

export interface LinkedGroupEntry {
  layerId: string;
  layerName: string;
  lineNumber: number;
}

export interface LinkedGroup {
  groupId: string;
  groupName: string;
  entries: LinkedGroupEntry[];
}

export interface TextLinkConfigWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableGroups?: AvailableGroup[];
  existingLinkedGroups?: LinkedGroup[];
  onSave?: (groups: LinkedGroup[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TextLinkConfigWindow({
  open,
  onOpenChange,
  availableGroups = [],
  existingLinkedGroups = [],
  onSave,
}: TextLinkConfigWindowProps) {
  const [linkedGroups, setLinkedGroups] = useState<LinkedGroup[]>(existingLinkedGroups);
  const [selectedAvailableId, setSelectedAvailableId] = useState<string | null>(null);
  const [selectedLinkedId, setSelectedLinkedId] = useState<string | null>(null);

  // Sync from props when dialog opens
  // Using a key pattern: reset state when open changes to true
  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    setLinkedGroups(existingLinkedGroups);
    setSelectedAvailableId(null);
    setSelectedLinkedId(null);
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
  }

  // Derived: groups not yet linked
  const linkedGroupIds = new Set(linkedGroups.map((g) => g.groupId));
  const availableUnlinked = availableGroups.filter((g) => !linkedGroupIds.has(g.id));

  // Currently selected linked group's entries
  const selectedLinkedGroup = linkedGroups.find((g) => g.groupId === selectedLinkedId);

  const handleAddGroup = useCallback(() => {
    if (!selectedAvailableId) return;
    const group = availableGroups.find((g) => g.id === selectedAvailableId);
    if (!group) return;

    const newLinked: LinkedGroup = {
      groupId: group.id,
      groupName: group.name,
      entries: group.textLayers.map((l, i) => ({
        layerId: l.id,
        layerName: l.name,
        lineNumber: i + 1,
      })),
    };

    setLinkedGroups((prev) => [...prev, newLinked]);
    setSelectedLinkedId(group.id);
    setSelectedAvailableId(null);
  }, [selectedAvailableId, availableGroups]);

  const handleRemoveGroup = useCallback(() => {
    if (!selectedLinkedId) return;
    setLinkedGroups((prev) => prev.filter((g) => g.groupId !== selectedLinkedId));
    setSelectedLinkedId(null);
  }, [selectedLinkedId]);

  const handleEditLineNumber = useCallback(
    (layerId: string) => {
      if (!selectedLinkedId) return;
      const group = linkedGroups.find((g) => g.groupId === selectedLinkedId);
      if (!group) return;
      const entry = group.entries.find((e) => e.layerId === layerId);
      if (!entry) return;

      const result = window.prompt('Enter line number:', String(entry.lineNumber));
      if (result === null) return;
      const num = parseInt(result, 10);
      if (isNaN(num) || num < 1) return;

      setLinkedGroups((prev) =>
        prev.map((g) => {
          if (g.groupId !== selectedLinkedId) return g;
          return {
            ...g,
            entries: g.entries.map((e) =>
              e.layerId === layerId ? { ...e, lineNumber: num } : e,
            ),
          };
        }),
      );
    },
    [selectedLinkedId, linkedGroups],
  );

  const handleSave = useCallback(() => {
    onSave?.(linkedGroups);
    onOpenChange(false);
  }, [linkedGroups, onSave, onOpenChange]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={handleCancel}
        data-testid="text-link-config-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={handleSave}
        data-testid="text-link-config-save"
      >
        Save
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Text Link Configuration"
      width={700}
      height={520}
      footer={footer}
    >
      <div
        className="flex h-full gap-0"
        data-testid="text-link-config-content"
      >
        {/* ---- Left column: Available Groups ---- */}
        <div
          className="flex flex-1 flex-col border-r"
          style={{ borderColor: 'var(--border-color)' }}
          data-testid="text-link-available-panel"
        >
          <div
            className="shrink-0 border-b px-3 py-2"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <span
              className="select-none text-xs font-bold"
              style={{ color: 'var(--accent-orange)' }}
            >
              Available Groups
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            {availableUnlinked.map((group) => (
              <div
                key={group.id}
                className="flex cursor-pointer items-center gap-2 px-2 py-1.5"
                style={{
                  backgroundColor:
                    selectedAvailableId === group.id
                      ? 'var(--hover-bg)'
                      : 'transparent',
                }}
                onClick={() => setSelectedAvailableId(group.id)}
                data-testid={`available-group-${group.id}`}
              >
                {/* Color bar */}
                <div
                  className="shrink-0 rounded-sm"
                  style={{
                    width: 4,
                    height: 24,
                    backgroundColor: group.color ?? 'var(--accent-orange)',
                  }}
                />
                <span
                  className="truncate text-xs"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {group.name}
                </span>
              </div>
            ))}
            {availableUnlinked.length === 0 && (
              <div
                className="px-3 py-4 text-center text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                No available groups
              </div>
            )}
          </div>
        </div>

        {/* ---- Center column: Action buttons ---- */}
        <div
          className="flex shrink-0 flex-col items-center justify-center gap-2"
          style={{ width: 60, backgroundColor: 'var(--toolbar-bg)' }}
          data-testid="text-link-action-buttons"
        >
          <button
            type="button"
            className="rounded border px-2 py-1.5 text-xs font-bold"
            style={{
              borderColor: 'var(--border-color)',
              color: selectedAvailableId ? 'var(--text-primary)' : 'var(--text-secondary)',
              backgroundColor: 'var(--panel-bg)',
              opacity: selectedAvailableId ? 1 : 0.5,
            }}
            disabled={!selectedAvailableId}
            onClick={handleAddGroup}
            data-testid="text-link-add-btn"
            title="Add group"
          >
            &gt;&gt;
          </button>
          <button
            type="button"
            className="rounded border px-2 py-1.5 text-xs font-bold"
            style={{
              borderColor: 'var(--border-color)',
              color: selectedLinkedId ? 'var(--text-primary)' : 'var(--text-secondary)',
              backgroundColor: 'var(--panel-bg)',
              opacity: selectedLinkedId ? 1 : 0.5,
            }}
            disabled={!selectedLinkedId}
            onClick={handleRemoveGroup}
            data-testid="text-link-remove-btn"
            title="Remove group"
          >
            &lt;&lt;
          </button>
        </div>

        {/* ---- Right column: Linked Groups + Text Layers ---- */}
        <div
          className="flex flex-col"
          style={{ flex: 1.5 }}
          data-testid="text-link-right-panel"
        >
          {/* Top: Linked Groups */}
          <div
            className="flex flex-1 flex-col border-b"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div
              className="shrink-0 border-b px-3 py-2"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <span
                className="select-none text-xs font-bold"
                style={{ color: 'var(--accent-orange)' }}
              >
                Linked Groups
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              {linkedGroups.map((group) => {
                const sourceGroup = availableGroups.find((g) => g.id === group.groupId);
                const groupColor = sourceGroup?.color ?? 'var(--accent-orange)';
                return (
                  <div
                    key={group.groupId}
                    className="flex cursor-pointer items-center gap-2 px-2 py-1.5"
                    style={{
                      backgroundColor:
                        selectedLinkedId === group.groupId
                          ? 'var(--hover-bg)'
                          : 'transparent',
                    }}
                    onClick={() => setSelectedLinkedId(group.groupId)}
                    data-testid={`linked-group-${group.groupId}`}
                  >
                    {/* Color bar */}
                    <div
                      className="shrink-0 rounded-sm"
                      style={{
                        width: 4,
                        height: 24,
                        backgroundColor: groupColor,
                      }}
                    />
                    <span
                      className="truncate text-xs"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {group.groupName}
                    </span>
                  </div>
                );
              })}
              {linkedGroups.length === 0 && (
                <div
                  className="px-3 py-4 text-center text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  No linked groups
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Text Layers of selected linked group */}
          <div className="flex flex-1 flex-col">
            <div
              className="shrink-0 border-b px-3 py-2"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <span
                className="select-none text-xs font-bold"
                style={{ color: 'var(--accent-orange)' }}
              >
                Text Layers
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              {selectedLinkedGroup ? (
                selectedLinkedGroup.entries.map((entry) => (
                  <div
                    key={entry.layerId}
                    className="flex cursor-pointer items-center gap-2 px-2 py-1.5 hover:bg-[var(--hover-bg)]"
                    onDoubleClick={() => handleEditLineNumber(entry.layerId)}
                    data-testid={`text-layer-entry-${entry.layerId}`}
                    title="Double-click to edit line number"
                  >
                    {/* Line number badge */}
                    <span
                      className="flex shrink-0 items-center justify-center rounded text-xs font-bold"
                      style={{
                        width: 22,
                        height: 22,
                        backgroundColor: 'var(--accent-orange)',
                        color: '#FFFFFF',
                      }}
                      data-testid={`text-layer-line-badge-${entry.layerId}`}
                    >
                      {entry.lineNumber}
                    </span>
                    <span
                      className="truncate text-xs"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {entry.layerName}
                    </span>
                  </div>
                ))
              ) : (
                <div
                  className="px-3 py-4 text-center text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {linkedGroups.length > 0
                    ? 'Select a linked group to view layers'
                    : 'No layers to display'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DialogBase>
  );
}

export default TextLinkConfigWindow;
