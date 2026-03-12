import { useState } from 'react';
import * as Progress from '@radix-ui/react-progress';
import { DialogBase } from './DialogBase';
import { Icon } from '../common/Icon';
import {
  mdiPlus,
  mdiDelete,
  mdiFileImport,
  mdiFileExport,
} from '@mdi/js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BatchProducerWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExportAll?: () => void;
}

interface DataRow {
  id: string;
  [key: string]: string;
}

const COLUMNS = ['binding_key', 'value_1', 'value_2', 'value_3', 'image_path'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BatchProducerWindow({ open, onOpenChange, onExportAll }: BatchProducerWindowProps) {
  const [rows, setRows] = useState<DataRow[]>([
    { id: '1', binding_key: 'title', value_1: 'Sample 1', value_2: 'Sample 2', value_3: 'Sample 3', image_path: '' },
    { id: '2', binding_key: 'subtitle', value_1: 'Sub 1', value_2: 'Sub 2', value_3: 'Sub 3', image_path: '' },
  ]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [exporting, setExporting] = useState(false);

  const addRow = () => {
    const newId = String(Date.now());
    const newRow: DataRow = { id: newId, binding_key: '', value_1: '', value_2: '', value_3: '', image_path: '' };
    setRows((prev) => [...prev, newRow]);
  };

  const deleteRow = () => {
    if (!selectedRowId) return;
    setRows((prev) => prev.filter((r) => r.id !== selectedRowId));
    setSelectedRowId(null);
  };

  const handleCellChange = (rowId: string, col: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [col]: value } : r)),
    );
  };

  const handleExportAll = () => {
    setExporting(true);
    setProgress(0);
    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setExporting(false);
          onExportAll?.();
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  const footer = (
    <>
      {exporting && (
        <div className="mr-auto flex items-center gap-2" style={{ minWidth: 200 }}>
          <Progress.Root
            className="relative overflow-hidden rounded-full"
            style={{ height: 8, flex: 1, backgroundColor: 'var(--border-color)' }}
            value={progress}
            data-testid="batch-progress"
          >
            <Progress.Indicator
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: 'var(--accent-orange)' }}
            />
          </Progress.Root>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{progress}%</span>
        </div>
      )}
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={() => onOpenChange(false)}
        data-testid="batch-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={handleExportAll}
        disabled={exporting}
        data-testid="batch-export-all"
      >
        Export All
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Batch Producer"
      width={1350}
      height={600}
      footer={footer}
    >
      <div className="flex h-full flex-col" data-testid="batch-producer-dialog-content">
        {/* Toolbar */}
        <div
          className="flex shrink-0 items-center gap-1 border-b px-3 py-1"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--toolbar-bg)' }}
          data-testid="batch-toolbar"
        >
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-secondary)' }}
            onClick={addRow}
            data-testid="batch-add-row"
          >
            <Icon path={mdiPlus} size={14} /> Add Row
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-secondary)', opacity: selectedRowId ? 1 : 0.4 }}
            onClick={deleteRow}
            disabled={!selectedRowId}
            data-testid="batch-delete-row"
          >
            <Icon path={mdiDelete} size={14} /> Delete Row
          </button>
          <div className="mx-1 h-4" style={{ width: 1, backgroundColor: 'var(--border-color)' }} />
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-secondary)' }}
            data-testid="batch-import-csv"
          >
            <Icon path={mdiFileImport} size={14} /> Import CSV
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-secondary)' }}
            data-testid="batch-export-csv"
          >
            <Icon path={mdiFileExport} size={14} /> Export CSV
          </button>
        </div>

        {/* DataGrid */}
        <div className="flex-1 overflow-auto" data-testid="batch-datagrid">
          <table className="w-full border-collapse text-xs" style={{ color: 'var(--text-primary)' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--toolbar-bg)' }}>
                {COLUMNS.map((col) => (
                  <th
                    key={col}
                    className="border px-2 py-1 text-left font-medium"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer"
                  style={{
                    backgroundColor: selectedRowId === row.id ? 'rgba(255,102,0,0.15)' : 'transparent',
                  }}
                  onClick={() => setSelectedRowId(row.id)}
                  data-testid={`batch-row-${row.id}`}
                >
                  {COLUMNS.map((col) => (
                    <td key={col} className="border px-1 py-0.5" style={{ borderColor: 'var(--border-color)' }}>
                      <input
                        type="text"
                        value={row[col] ?? ''}
                        onChange={(e) => handleCellChange(row.id, col, e.target.value)}
                        className="w-full border-none bg-transparent px-1 py-0.5 text-xs outline-none"
                        style={{ color: 'var(--text-primary)' }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DialogBase>
  );
}

export default BatchProducerWindow;
