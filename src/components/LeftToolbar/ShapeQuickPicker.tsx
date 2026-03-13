import { useState, useCallback, useRef, useEffect } from 'react';
import {
  mdiRectangleOutline,
  mdiCircleOutline,
  mdiStarOutline,
  mdiMinus,
} from '@mdi/js';
import { Icon } from '../common/Icon';
import { StarSettingsDialog } from '../Dialogs/StarSettingsDialog';
import { useSettingsStore } from '../../settings/settingsStore';

// ---------------------------------------------------------------------------
// Quick shape definitions
// ---------------------------------------------------------------------------

export interface QuickShape {
  id: string;
  label: string;
  icon: string;
}

export const QUICK_SHAPES: QuickShape[] = [
  { id: 'rectangle', label: 'Rectangle', icon: mdiRectangleOutline },
  { id: 'ellipse', label: 'Circle', icon: mdiCircleOutline },
  { id: 'star', label: 'Star', icon: mdiStarOutline },
  { id: 'line', label: 'Line', icon: mdiMinus },
];

/** Map quick shape ID to its icon path. */
export function getShapeIcon(shapeId: string): string {
  return QUICK_SHAPES.find((s) => s.id === shapeId)?.icon ?? mdiRectangleOutline;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ShapeQuickPickerProps {
  /** Called when a shape is selected from the quick picker. */
  onSelect: (shapeId: string) => void;
  /** Position relative to the shape button. */
  anchorRect: DOMRect | null;
  /** Whether the popup is visible. */
  open: boolean;
  /** Called to close the popup. */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShapeQuickPicker({ onSelect, anchorRect, open, onClose }: ShapeQuickPickerProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [starSettingsOpen, setStarSettingsOpen] = useState(false);

  // Close on outside click (but not when star settings dialog is open)
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (starSettingsOpen) return;
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose, starSettingsOpen]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      // Persist last used shape type
      useSettingsStore.getState().setSetting('shapeTool.lastShapeType', id);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleStarRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStarSettingsOpen(true);
  }, []);

  if (!open || !anchorRect) return null;

  // Position popup to the right of the anchor
  const top = anchorRect.top;
  const left = anchorRect.right + 6;

  return (
    <>
      <div
        ref={popupRef}
        style={{
          position: 'fixed',
          top,
          left,
          zIndex: 9999,
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 6,
          padding: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
        data-testid="shape-quick-picker"
      >
        {QUICK_SHAPES.map((shape) => (
          <button
            key={shape.id}
            type="button"
            data-testid={`quick-shape-${shape.id}`}
            title={shape.id === 'star' ? `${shape.label} (Right-click for settings)` : shape.label}
            onClick={() => handleSelect(shape.id)}
            onContextMenu={shape.id === 'star' ? handleStarRightClick : undefined}
            className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-xs outline-none hover:bg-[var(--hover-bg)]"
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              minWidth: 100,
            }}
          >
            <Icon path={shape.icon} size={16} color="var(--text-secondary)" />
            {shape.label}
          </button>
        ))}
      </div>

      {/* Star Settings Dialog */}
      <StarSettingsDialog
        open={starSettingsOpen}
        onOpenChange={setStarSettingsOpen}
      />
    </>
  );
}

export default ShapeQuickPicker;
