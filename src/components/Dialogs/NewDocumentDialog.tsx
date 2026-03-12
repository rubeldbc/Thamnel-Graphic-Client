import { useState, useCallback, useRef } from 'react';
import { DialogBase } from './DialogBase';
import { useDocumentStore } from '../../stores/documentStore';
import { useUiStore } from '../../stores/uiStore';
import { useSettingsStore } from '../../settings/settingsStore';
import type { CustomCanvasPreset } from '../../settings/AppSettings';
import {
  ALL_PRESETS,
  PRESET_CATEGORIES,
  type CanvasPreset,
} from '../../data/canvasPresets';
import { Icon } from '../common/Icon';
import {
  mdiFileDocumentOutline,
  mdiMonitor,
  mdiFileDocument,
  mdiStar,
  mdiCheck,
} from '@mdi/js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NewDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate?: (width: number, height: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MIN_SIZE = 50;
const MAX_SIZE = 14043;

/** Category icon mapping */
function getCategoryIcon(category: string): string {
  switch (category) {
    case 'social':
      return mdiMonitor;
    case 'paper':
      return mdiFileDocument;
    case 'display':
      return mdiMonitor;
    default:
      return mdiFileDocumentOutline;
  }
}

/** Category display label */
function getCategoryLabel(category: string): string {
  const found = PRESET_CATEGORIES.find((c) => c.value === category);
  return found ? found.label : category;
}

/** Group presets by category */
function groupPresets(): { category: string; presets: CanvasPreset[] }[] {
  const groups: { category: string; presets: CanvasPreset[] }[] = [];
  const seen = new Set<string>();
  for (const p of ALL_PRESETS) {
    if (!seen.has(p.category)) {
      seen.add(p.category);
      groups.push({ category: p.category, presets: [] });
    }
    groups.find((g) => g.category === p.category)!.presets.push(p);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewDocumentDialog({ open, onOpenChange, onCreate }: NewDocumentDialogProps) {
  // Current canvas size for initialization
  const storeWidth = useDocumentStore((s) => s.project.canvasWidth);
  const storeHeight = useDocumentStore((s) => s.project.canvasHeight);

  const [width, setWidth] = useState(() => String(storeWidth ?? 1920));
  const [height, setHeight] = useState(() => String(storeHeight ?? 1080));
  const [selectedPresetKey, setSelectedPresetKey] = useState<string | null>(null);
  const [selectedUserPresetKey, setSelectedUserPresetKey] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');

  const saveInputRef = useRef<HTMLInputElement>(null);

  const setCanvasSize = useDocumentStore((s) => s.setCanvasSize);
  const setBackgroundColor = useDocumentStore((s) => s.setBackgroundColor);
  const pushUndo = useDocumentStore((s) => s.pushUndo);
  const setActiveDialog = useUiStore((s) => s.setActiveDialog);

  // User presets from settings
  const customPresets = useSettingsStore(
    (s) => (s.settings.customCanvasPresets ?? []) as CustomCanvasPreset[],
  );
  const setSetting = useSettingsStore((s) => s.setSetting);

  const groupedPresets = groupPresets();

  // ---- Validation ----

  function tryParseSize(): { w: number; h: number } | null {
    const w = parseInt(width, 10);
    const h = parseInt(height, 10);
    if (isNaN(w) || isNaN(h)) {
      setValidationError('Please enter valid numbers for width and height.');
      return null;
    }
    if (w < MIN_SIZE || h < MIN_SIZE || w > MAX_SIZE || h > MAX_SIZE) {
      setValidationError(`Width and height must be between ${MIN_SIZE} and ${MAX_SIZE} pixels.`);
      return null;
    }
    setValidationError(null);
    return { w, h };
  }

  // ---- Actions ----

  const handleCreate = useCallback(() => {
    const size = tryParseSize();
    if (!size) return;
    pushUndo();
    setCanvasSize(size.w, size.h);
    setBackgroundColor('#FFFFFF');
    onCreate?.(size.w, size.h);
    onOpenChange(false);
    setActiveDialog(null);
  }, [width, height, pushUndo, setCanvasSize, setBackgroundColor, onCreate, onOpenChange, setActiveDialog]);

  function selectBuiltInPreset(p: CanvasPreset) {
    setWidth(String(p.width));
    setHeight(String(p.height));
    setSelectedPresetKey(`${p.width}x${p.height}`);
    setSelectedUserPresetKey(null);
    setValidationError(null);
  }

  function selectUserPreset(p: CustomCanvasPreset) {
    setWidth(String(p.width));
    setHeight(String(p.height));
    setSelectedUserPresetKey(`${p.name}-${p.width}x${p.height}`);
    setSelectedPresetKey(null);
    setValidationError(null);
  }

  function handleDoubleClickBuiltIn(p: CanvasPreset) {
    pushUndo();
    setCanvasSize(p.width, p.height);
    setBackgroundColor('#FFFFFF');
    onCreate?.(p.width, p.height);
    onOpenChange(false);
    setActiveDialog(null);
  }

  function handleDoubleClickUser(p: CustomCanvasPreset) {
    pushUndo();
    setCanvasSize(p.width, p.height);
    setBackgroundColor('#FFFFFF');
    onCreate?.(p.width, p.height);
    onOpenChange(false);
    setActiveDialog(null);
  }

  function handleSaveAsPreset() {
    const size = tryParseSize();
    if (!size) return;
    setShowSaveInput(true);
    setSavePresetName('');
    setTimeout(() => saveInputRef.current?.focus(), 50);
  }

  function confirmSavePreset() {
    const name = savePresetName.trim();
    if (!name) return;
    const size = tryParseSize();
    if (!size) return;
    const newPreset: CustomCanvasPreset = { name, width: size.w, height: size.h };
    const updated = [...customPresets, newPreset];
    setSetting('customCanvasPresets', updated);
    setShowSaveInput(false);
    setSavePresetName('');
  }

  function cancelSavePreset() {
    setShowSaveInput(false);
    setSavePresetName('');
  }

  function deleteUserPreset(p: CustomCanvasPreset) {
    const updated = customPresets.filter(
      (cp) => !(cp.name === p.name && cp.width === p.width && cp.height === p.height),
    );
    setSetting('customCanvasPresets', updated);
    if (selectedUserPresetKey === `${p.name}-${p.width}x${p.height}`) {
      setSelectedUserPresetKey(null);
    }
  }

  // ---- Footer ----

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={() => onOpenChange(false)}
        data-testid="new-doc-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={handleCreate}
        data-testid="new-doc-create"
      >
        <Icon path={mdiCheck} size={16} color="#fff" />
        Create
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="New Document"
      width={460}
      height={620}
      footer={footer}
    >
      <div className="flex flex-col gap-0 p-4" data-testid="new-document-dialog-content">
        {/* ---- PRESETS section ---- */}
        <div
          className="text-[11px] font-semibold"
          style={{ color: 'var(--text-secondary)', marginBottom: 6 }}
        >
          PRESETS
        </div>

        <div
          data-testid="preset-list"
          className="overflow-y-auto rounded border"
          style={{
            borderColor: '#333',
            maxHeight: 240,
            minHeight: 120,
            marginBottom: 10,
          }}
        >
          {groupedPresets.map((group) => (
            <div key={group.category}>
              {/* Category header */}
              <div
                className="text-[10px] font-bold"
                style={{
                  color: 'var(--accent-orange)',
                  padding: '8px 8px 2px 8px',
                }}
              >
                {getCategoryLabel(group.category)}
              </div>
              {/* Preset rows */}
              {group.presets.map((p) => {
                const key = `${p.width}x${p.height}`;
                const isSelected = selectedPresetKey === key;
                return (
                  <div
                    key={`${p.name}-${key}`}
                    className="flex cursor-pointer items-center px-2 py-1 hover:bg-[var(--hover-bg)]"
                    style={{
                      backgroundColor: isSelected ? 'rgba(255,102,0,0.15)' : 'transparent',
                    }}
                    data-testid={`preset-${key}`}
                    onClick={() => selectBuiltInPreset(p)}
                    onDoubleClick={() => handleDoubleClickBuiltIn(p)}
                  >
                    <Icon
                      path={getCategoryIcon(p.category)}
                      size={16}
                      color="var(--text-secondary)"
                    />
                    <span
                      className="ml-2 flex-1 text-xs"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {p.name}
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {p.width} x {p.height}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* ---- MY PRESETS section ---- */}
        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
          <span
            className="text-[11px] font-semibold"
            style={{ color: 'var(--text-secondary)' }}
          >
            MY PRESETS
          </span>
          <button
            type="button"
            className="text-[11px] font-medium"
            style={{
              color: 'var(--accent-orange)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 4px',
            }}
            onClick={handleSaveAsPreset}
            data-testid="save-preset-btn"
          >
            + Save As
          </button>
        </div>

        {/* Save preset input row */}
        {showSaveInput && (
          <div
            className="flex items-center gap-2"
            style={{ marginBottom: 6 }}
          >
            <input
              ref={saveInputRef}
              type="text"
              value={savePresetName}
              onChange={(e) => setSavePresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmSavePreset();
                if (e.key === 'Escape') cancelSavePreset();
              }}
              placeholder="Preset name..."
              className="flex-1 rounded border px-2 py-1 text-xs"
              style={{
                backgroundColor: '#2A2A2A',
                color: 'white',
                borderColor: '#555',
              }}
              data-testid="save-preset-name-input"
            />
            <button
              type="button"
              className="rounded px-2 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: 'var(--accent-orange)' }}
              onClick={confirmSavePreset}
              data-testid="save-preset-confirm"
            >
              Save
            </button>
            <button
              type="button"
              className="rounded px-2 py-0.5 text-[10px]"
              style={{ color: 'var(--text-secondary)' }}
              onClick={cancelSavePreset}
            >
              Cancel
            </button>
          </div>
        )}

        <div
          className="relative overflow-y-auto rounded border"
          data-testid="user-preset-list"
          style={{
            borderColor: '#333',
            minHeight: 50,
            maxHeight: 120,
            marginBottom: 10,
          }}
        >
          {customPresets.length === 0 && (
            <div
              className="flex items-center justify-center text-[11px] italic"
              style={{
                color: '#555',
                height: 50,
              }}
              data-testid="no-presets-text"
            >
              No saved presets
            </div>
          )}
          {customPresets.map((p) => {
            const key = `${p.name}-${p.width}x${p.height}`;
            const isSelected = selectedUserPresetKey === key;
            return (
              <div
                key={key}
                className="flex cursor-pointer items-center px-2 py-1 hover:bg-[var(--hover-bg)]"
                style={{
                  backgroundColor: isSelected ? 'rgba(255,102,0,0.15)' : 'transparent',
                }}
                data-testid={`user-preset-${p.width}x${p.height}`}
                onClick={() => selectUserPreset(p)}
                onDoubleClick={() => handleDoubleClickUser(p)}
              >
                <Icon
                  path={mdiStar}
                  size={16}
                  color="var(--accent-orange)"
                />
                <span
                  className="ml-2 flex-1 text-xs"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {p.name}
                </span>
                <span
                  className="mr-1 text-[11px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {p.width} x {p.height}
                </span>
                <button
                  type="button"
                  className="rounded text-xs"
                  style={{
                    color: '#888',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    width: 22,
                    height: 22,
                    padding: 0,
                    minWidth: 0,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteUserPreset(p);
                  }}
                  data-testid={`delete-preset-${p.width}x${p.height}`}
                >
                  x
                </button>
              </div>
            );
          })}
        </div>

        {/* ---- CUSTOM SIZE section ---- */}
        <div
          className="text-[11px] font-semibold"
          style={{ color: 'var(--text-secondary)', marginBottom: 8 }}
        >
          CUSTOM SIZE
        </div>

        <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
          <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
            Width:
          </span>
          <input
            type="text"
            value={width}
            onChange={(e) => {
              setWidth(e.target.value);
              setSelectedPresetKey(null);
              setSelectedUserPresetKey(null);
              setValidationError(null);
            }}
            className="rounded border px-1.5 py-1 text-center text-[13px]"
            style={{
              width: 70,
              backgroundColor: '#2A2A2A',
              color: 'white',
              borderColor: '#555',
            }}
            data-testid="new-doc-width"
          />
          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            px
          </span>

          <span className="ml-3 text-xs" style={{ color: 'var(--text-primary)' }}>
            Height:
          </span>
          <input
            type="text"
            value={height}
            onChange={(e) => {
              setHeight(e.target.value);
              setSelectedPresetKey(null);
              setSelectedUserPresetKey(null);
              setValidationError(null);
            }}
            className="rounded border px-1.5 py-1 text-center text-[13px]"
            style={{
              width: 70,
              backgroundColor: '#2A2A2A',
              color: 'white',
              borderColor: '#555',
            }}
            data-testid="new-doc-height"
          />
          <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            px
          </span>
        </div>

        {/* Validation error */}
        {validationError && (
          <div
            className="mt-1 text-[11px]"
            style={{ color: '#EF5350' }}
            data-testid="validation-error"
          >
            {validationError}
          </div>
        )}
      </div>
    </DialogBase>
  );
}

export default NewDocumentDialog;
