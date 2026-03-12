import { useState } from 'react';
import { DialogBase } from './DialogBase';
import { Icon } from '../common/Icon';
import {
  mdiPlus,
  mdiDelete,
  mdiDeleteSweep,
} from '@mdi/js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportListWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExportAll?: () => void;
}

interface ExportItem {
  id: string;
  format: string;
  quality: number;
  path: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExportListWindow({ open, onOpenChange, onExportAll }: ExportListWindowProps) {
  const [items, setItems] = useState<ExportItem[]>([
    { id: '1', format: 'PNG', quality: 100, path: 'output/image_01.png' },
    { id: '2', format: 'JPEG', quality: 90, path: 'output/image_02.jpg' },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const addItem = () => {
    const newId = String(Date.now());
    setItems((prev) => [...prev, { id: newId, format: 'PNG', quality: 100, path: '' }]);
  };

  const removeItem = () => {
    if (!selectedId) return;
    setItems((prev) => prev.filter((i) => i.id !== selectedId));
    setSelectedId(null);
  };

  const clearAll = () => {
    setItems([]);
    setSelectedId(null);
  };

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={() => onOpenChange(false)}
        data-testid="export-list-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={() => {
          onExportAll?.();
          onOpenChange(false);
        }}
        data-testid="export-list-export-all"
      >
        Export All
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Export List"
      width={600}
      height={500}
      footer={footer}
    >
      <div className="flex h-full flex-col" data-testid="export-list-dialog-content">
        {/* Toolbar */}
        <div
          className="flex shrink-0 items-center gap-1 border-b px-3 py-1"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--toolbar-bg)' }}
          data-testid="export-list-toolbar"
        >
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-secondary)' }}
            onClick={addItem}
            data-testid="export-add"
          >
            <Icon path={mdiPlus} size={14} /> Add
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-secondary)', opacity: selectedId ? 1 : 0.4 }}
            onClick={removeItem}
            disabled={!selectedId}
            data-testid="export-remove"
          >
            <Icon path={mdiDelete} size={14} /> Remove
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-secondary)' }}
            onClick={clearAll}
            data-testid="export-clear"
          >
            <Icon path={mdiDeleteSweep} size={14} /> Clear
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto" data-testid="export-item-list">
          <table className="w-full border-collapse text-xs" style={{ color: 'var(--text-primary)' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--toolbar-bg)' }}>
                <th className="border px-2 py-1 text-left font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Format</th>
                <th className="border px-2 py-1 text-left font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Quality</th>
                <th className="border px-2 py-1 text-left font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Path</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="cursor-pointer"
                  style={{ backgroundColor: selectedId === item.id ? 'rgba(255,102,0,0.15)' : 'transparent' }}
                  onClick={() => setSelectedId(item.id)}
                  data-testid={`export-item-${item.id}`}
                >
                  <td className="border px-2 py-1" style={{ borderColor: 'var(--border-color)' }}>{item.format}</td>
                  <td className="border px-2 py-1" style={{ borderColor: 'var(--border-color)' }}>{item.quality}%</td>
                  <td className="border px-2 py-1" style={{ borderColor: 'var(--border-color)' }}>{item.path}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} className="border px-2 py-4 text-center" style={{ borderColor: 'var(--border-color)', color: 'var(--text-disabled)' }}>
                    No export items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DialogBase>
  );
}

export default ExportListWindow;
