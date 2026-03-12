import { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '../../common/Icon';
import {
  mdiChevronRight,
  mdiChevronDown,
  mdiEye,
  mdiEyeOff,
  mdiImage,
  mdiFormatText,
  mdiShapeOutline,
  mdiFolderOutline,
  mdiShieldLock,
  mdiLock,
  mdiLockOpenVariant,
} from '@mdi/js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LayerType = 'image' | 'text' | 'shape' | 'group';

export interface LayerData {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  superLocked: boolean;
  isGroup: boolean;
  expanded: boolean;
  depth: number;
  groupColor: string;
  isFrameReceiver: boolean;
  thumbnailUrl?: string;
}

export interface LayerItemProps {
  layer: LayerData;
  isSelected: boolean;
  onSelect?: (id: string, event: React.MouseEvent) => void;
  onToggleVisibility?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onToggleExpand?: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_ICONS: Record<LayerType, string> = {
  image: mdiImage,
  text: mdiFormatText,
  shape: mdiShapeOutline,
  group: mdiFolderOutline,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LayerItem({
  layer,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onToggleExpand,
  onRename,
}: LayerItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(layer.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commitRename = useCallback(() => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== layer.name) {
      onRename?.(layer.id, trimmed);
    } else {
      setEditValue(layer.name);
    }
  }, [editValue, layer.id, layer.name, onRename]);

  const handleDoubleClick = useCallback(() => {
    setEditValue(layer.name);
    setIsEditing(true);
  }, [layer.name]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Stop all keyboard events from bubbling to the global shortcut handler
      // so that e.g. Ctrl+G doesn't trigger "group" while renaming.
      e.stopPropagation();
      if (e.key === 'Enter') {
        commitRename();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        setEditValue(layer.name);
      }
    },
    [commitRename, layer.name],
  );

  // Background: selected = semi-transparent orange, or group tint
  let rowBg = 'transparent';
  if (isSelected) {
    rowBg = '#FF660033';
  } else if (layer.isGroup) {
    // 15% opacity of groupColor
    rowBg = `${layer.groupColor}26`;
  }

  return (
    <div
      data-testid="layer-item"
      className="flex items-center gap-0.5 px-1"
      style={{
        height: 30,
        marginLeft: layer.depth * 28,
        backgroundColor: rowBg,
        cursor: 'pointer',
        fontSize: 12,
      }}
      onClick={(e) => onSelect?.(layer.id, e)}
    >
      {/* Col 0: Expand / Collapse arrow (groups only) */}
      <div className="flex shrink-0 items-center justify-center" style={{ width: 16, height: 16 }}>
        {layer.isGroup && (
          <button
            type="button"
            data-testid="layer-expand-toggle"
            className="flex cursor-pointer items-center justify-center border-none bg-transparent p-0 outline-none"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.(layer.id);
            }}
          >
            <Icon
              path={layer.expanded ? mdiChevronDown : mdiChevronRight}
              size={16}
              color="var(--text-secondary)"
            />
          </button>
        )}
      </div>

      {/* Col 1: Visibility toggle */}
      <button
        type="button"
        data-testid="layer-visibility-toggle"
        className="flex shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-0 outline-none"
        style={{ width: 24, height: 24 }}
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility?.(layer.id);
        }}
      >
        <Icon
          path={layer.visible ? mdiEye : mdiEyeOff}
          size={16}
          color={layer.visible ? 'var(--text-primary)' : 'var(--text-disabled)'}
        />
      </button>

      {/* Col 2: Type icon */}
      <div
        data-testid="layer-type-icon"
        className="flex shrink-0 items-center justify-center"
        style={{ width: 22, height: 22 }}
      >
        <Icon
          path={TYPE_ICONS[layer.type]}
          size={16}
          color="var(--text-secondary)"
          title={layer.type}
        />
      </div>

      {/* Col 3: Layer name (editable on double-click) */}
      <div className="min-w-0 flex-1 overflow-hidden" onDoubleClick={handleDoubleClick}>
        {isEditing ? (
          <input
            ref={inputRef}
            data-testid="layer-name-input"
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            className="w-full rounded-sm border px-1 outline-none"
            style={{
              height: 20,
              fontSize: 12,
              backgroundColor: 'var(--dark-bg)',
              borderColor: 'var(--accent-orange)',
              color: 'var(--text-primary)',
            }}
          />
        ) : (
          <span
            data-testid="layer-name"
            className="block truncate"
            style={{ color: 'var(--text-primary)', fontSize: 12 }}
          >
            {layer.name}
          </span>
        )}
      </div>

      {/* Col 4: Super lock icon (if superLocked) */}
      {layer.superLocked && (
        <div
          data-testid="layer-super-lock"
          className="flex shrink-0 items-center justify-center"
          style={{ width: 14, height: 14 }}
        >
          <Icon path={mdiShieldLock} size={14} color="#FF6B6B" />
        </div>
      )}

      {/* Col 5: Thumbnail */}
      <div
        data-testid="layer-thumbnail"
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-sm"
        style={{
          width: 22,
          height: 22,
          border: layer.isFrameReceiver
            ? '1.5px solid var(--accent-orange)'
            : '1px solid var(--border-color)',
          backgroundColor: '#333',
        }}
      >
        {layer.thumbnailUrl ? (
          <img
            src={layer.thumbnailUrl}
            alt={layer.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Icon path={TYPE_ICONS[layer.type]} size={12} color="var(--text-disabled)" />
        )}
      </div>

      {/* Col 6: Lock toggle */}
      <button
        type="button"
        data-testid="layer-lock-toggle"
        className="flex shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-0 outline-none"
        style={{ width: 24, height: 24 }}
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock?.(layer.id);
        }}
      >
        <Icon
          path={layer.locked ? mdiLock : mdiLockOpenVariant}
          size={16}
          color={layer.locked ? 'var(--text-primary)' : 'var(--text-disabled)'}
        />
      </button>
    </div>
  );
}

export default LayerItem;
