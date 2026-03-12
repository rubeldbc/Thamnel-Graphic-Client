import { useState, useEffect, useCallback, useRef } from 'react';
import { DialogBase } from './DialogBase';
import { NumericUpDown } from '../common/NumericUpDown';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FaceItem {
  id: string;
  label: string;
  thumbnailSrc?: string;
}

export interface FaceBlurWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faces?: FaceItem[];
  initialBlurStrength?: number;
  initialThreshold?: number;
  initialFeather?: number;
  onPreview?: (
    selectedFaceIds: string[],
    strength: number,
    threshold: number,
    feather: number,
  ) => void;
  onApply?: (
    selectedFaceIds: string[],
    strength: number,
    threshold: number,
    feather: number,
  ) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FaceBlurWindow({
  open,
  onOpenChange,
  faces = [],
  initialBlurStrength = 25,
  initialThreshold = 20,
  initialFeather = 10,
  onPreview,
  onApply,
}: FaceBlurWindowProps) {
  const [selectedFaceIds, setSelectedFaceIds] = useState<Set<string>>(
    new Set(faces.map((f) => f.id)),
  );
  const [blurStrength, setBlurStrength] = useState(initialBlurStrength);
  const [threshold, setThreshold] = useState(initialThreshold);
  const [feather, setFeather] = useState(initialFeather);

  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset selection when faces change or dialog opens
  useEffect(() => {
    if (open) {
      setSelectedFaceIds(new Set(faces.map((f) => f.id)));
      setBlurStrength(initialBlurStrength);
      setThreshold(initialThreshold);
      setFeather(initialFeather);
    }
  }, [open, faces, initialBlurStrength, initialThreshold, initialFeather]);

  // Debounced preview callback
  const triggerPreview = useCallback(
    (ids: Set<string>, str: number, thr: number, fea: number) => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
      previewTimer.current = setTimeout(() => {
        onPreview?.(Array.from(ids), str, thr, fea);
      }, 200);
    },
    [onPreview],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, []);

  const handleStrengthChange = useCallback(
    (v: number) => {
      setBlurStrength(v);
      triggerPreview(selectedFaceIds, v, threshold, feather);
    },
    [selectedFaceIds, threshold, feather, triggerPreview],
  );

  const handleThresholdChange = useCallback(
    (v: number) => {
      setThreshold(v);
      triggerPreview(selectedFaceIds, blurStrength, v, feather);
    },
    [selectedFaceIds, blurStrength, feather, triggerPreview],
  );

  const handleFeatherChange = useCallback(
    (v: number) => {
      setFeather(v);
      triggerPreview(selectedFaceIds, blurStrength, threshold, v);
    },
    [selectedFaceIds, blurStrength, threshold, triggerPreview],
  );

  const toggleFace = useCallback(
    (id: string) => {
      setSelectedFaceIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        triggerPreview(next, blurStrength, threshold, feather);
        return next;
      });
    },
    [blurStrength, threshold, feather, triggerPreview],
  );

  const selectAll = useCallback(() => {
    const all = new Set(faces.map((f) => f.id));
    setSelectedFaceIds(all);
    triggerPreview(all, blurStrength, threshold, feather);
  }, [faces, blurStrength, threshold, feather, triggerPreview]);

  const deselectAll = useCallback(() => {
    const none = new Set<string>();
    setSelectedFaceIds(none);
    triggerPreview(none, blurStrength, threshold, feather);
  }, [blurStrength, threshold, feather, triggerPreview]);

  const handleApply = useCallback(() => {
    onApply?.(Array.from(selectedFaceIds), blurStrength, threshold, feather);
    onOpenChange(false);
  }, [selectedFaceIds, blurStrength, threshold, feather, onApply, onOpenChange]);

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={() => onOpenChange(false)}
        data-testid="face-blur-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={handleApply}
        data-testid="face-blur-apply"
      >
        Apply Blur
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Face Blur"
      width={580}
      height={560}
      footer={footer}
    >
      <div className="flex h-full flex-col gap-3 p-4" data-testid="face-blur-content">
        {/* Status text */}
        <span
          className="text-xs"
          style={{ color: 'var(--text-secondary)' }}
          data-testid="face-blur-status"
        >
          Detected {faces.length} face(s)
        </span>

        {/* Toolbar */}
        <div
          className="flex shrink-0 items-center gap-1"
          data-testid="face-blur-toolbar"
        >
          <button
            type="button"
            className="rounded px-2 py-1 text-xs hover:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)', border: '1px solid var(--border-color)' }}
            onClick={selectAll}
            data-testid="face-blur-select-all"
          >
            Select All
          </button>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs hover:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)', border: '1px solid var(--border-color)' }}
            onClick={deselectAll}
            data-testid="face-blur-deselect-all"
          >
            Deselect All
          </button>
        </div>

        {/* Scrollable face list */}
        <div
          className="flex-1 overflow-auto rounded border"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--toolbar-bg)',
            minHeight: 120,
          }}
          data-testid="face-blur-face-list"
        >
          {faces.length === 0 ? (
            <div
              className="flex items-center justify-center p-4 text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              No faces detected
            </div>
          ) : (
            faces.map((face) => (
              <div
                key={face.id}
                className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-[var(--hover-bg)]"
                style={{
                  borderBottom: '1px solid var(--border-color)',
                }}
                onClick={() => toggleFace(face.id)}
                data-testid={`face-blur-face-${face.id}`}
              >
                <input
                  type="checkbox"
                  checked={selectedFaceIds.has(face.id)}
                  onChange={() => toggleFace(face.id)}
                  style={{ accentColor: 'var(--accent-orange)' }}
                  data-testid={`face-blur-face-${face.id}-checkbox`}
                />
                <div
                  className="shrink-0 overflow-hidden rounded border"
                  style={{
                    width: 60,
                    height: 60,
                    borderColor: 'var(--border-color)',
                    backgroundColor: '#1a1a1a',
                  }}
                >
                  {face.thumbnailSrc ? (
                    <img
                      src={face.thumbnailSrc}
                      alt={face.label}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      ?
                    </div>
                  )}
                </div>
                <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                  {face.label}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Settings panel */}
        <div className="flex flex-col gap-3" data-testid="face-blur-settings">
          <span
            className="text-xs font-semibold"
            style={{ color: 'var(--accent-orange)' }}
          >
            SETTINGS
          </span>

          {/* Blur Strength */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)', minWidth: 90 }}>
              Blur Strength
            </span>
            <NumericUpDown
              value={blurStrength}
              onChange={handleStrengthChange}
              min={5}
              max={80}
              step={1}
              width={60}
              label=""
            />
            <input
              type="range"
              min={5}
              max={80}
              step={1}
              value={blurStrength}
              onChange={(e) => handleStrengthChange(Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: 'var(--accent-orange)' }}
              data-testid="face-blur-strength-slider"
            />
          </div>

          {/* Threshold */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)', minWidth: 90 }}>
              Threshold
            </span>
            <NumericUpDown
              value={threshold}
              onChange={handleThresholdChange}
              min={0}
              max={100}
              step={1}
              width={60}
              suffix="%"
              label=""
            />
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={threshold}
              onChange={(e) => handleThresholdChange(Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: 'var(--accent-orange)' }}
              data-testid="face-blur-threshold-slider"
            />
          </div>

          {/* Feather */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)', minWidth: 90 }}>
              Feather
            </span>
            <NumericUpDown
              value={feather}
              onChange={handleFeatherChange}
              min={0}
              max={50}
              step={1}
              width={60}
              label=""
            />
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={feather}
              onChange={(e) => handleFeatherChange(Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: 'var(--accent-orange)' }}
              data-testid="face-blur-feather-slider"
            />
          </div>
        </div>
      </div>
    </DialogBase>
  );
}

export default FaceBlurWindow;
