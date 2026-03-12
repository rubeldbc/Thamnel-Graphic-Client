import { useState, useRef, useEffect, useCallback } from 'react';
import { DialogBase } from './DialogBase';
import { NumericUpDown } from '../common/NumericUpDown';
import { Icon } from '../common/Icon';
import { mdiLinkVariant, mdiChevronDown, mdiChevronUp } from '@mdi/js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LinkedLayerEntry {
  id: string;
  name: string;
  fontFamily?: string;
  fontSize?: number;
  lineNumber?: number;
  text?: string;
}

export interface LinkedTextEditorWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layers?: LinkedLayerEntry[];
  onTextChange?: (texts: string[]) => void;
  onAccept?: (texts: string[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LinkedTextEditorWindow({
  open,
  onOpenChange,
  layers = [],
  onTextChange,
  onAccept,
}: LinkedTextEditorWindowProps) {
  const [text, setText] = useState('');
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  const [layerFontSizes, setLayerFontSizes] = useState<Record<string, number>>({});
  const [layerWSqueeze, setLayerWSqueeze] = useState<Record<string, number>>({});

  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync from props when dialog opens
  useEffect(() => {
    if (open && layers.length > 0) {
      const initialText = layers.map((l) => l.text ?? '').join('\n');
      setText(initialText);

      const sizes: Record<string, number> = {};
      const squeezes: Record<string, number> = {};
      for (const l of layers) {
        sizes[l.id] = l.fontSize ?? 24;
        squeezes[l.id] = 0;
      }
      setLayerFontSizes(sizes);
      setLayerWSqueeze(squeezes);
      setExpandedLayers(new Set());
    }
  }, [open]); // intentionally only trigger on open change

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
    };
  }, []);

  // Focus textarea when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open]);

  const getTexts = useCallback(
    (rawText: string): string[] => {
      const lines = rawText.split('\n');
      // Pad or truncate to match layer count
      return layers.map((_, i) => lines[i] ?? '');
    },
    [layers],
  );

  const handleChange = useCallback(
    (newText: string) => {
      setText(newText);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onTextChange?.(getTexts(newText)), 150);
    },
    [onTextChange, getTexts],
  );

  const handleAccept = useCallback(() => {
    clearTimeout(timerRef.current);
    onAccept?.(getTexts(text));
    onOpenChange(false);
  }, [text, onAccept, onOpenChange, getTexts]);

  const handleCancel = useCallback(() => {
    clearTimeout(timerRef.current);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleAccept();
      }
    },
    [handleCancel, handleAccept],
  );

  const toggleLayerExpanded = useCallback((layerId: string) => {
    setExpandedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) {
        next.delete(layerId);
      } else {
        next.add(layerId);
      }
      return next;
    });
  }, []);

  const updateLayerFontSize = useCallback((layerId: string, value: number) => {
    setLayerFontSizes((prev) => ({ ...prev, [layerId]: value }));
  }, []);

  const updateLayerWSqueeze = useCallback((layerId: string, value: number) => {
    setLayerWSqueeze((prev) => ({ ...prev, [layerId]: value }));
  }, []);

  // Compute stats
  const lines = text.split('\n');
  const lineCount = lines.length;
  const charCount = text.length;

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={handleCancel}
        data-testid="linked-text-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={handleAccept}
        data-testid="linked-text-accept"
      >
        Accept All
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="LINKED TEXT EDITOR"
      width={600}
      height={500}
      footer={footer}
    >
      <div
        className="flex h-full flex-col"
        onKeyDown={handleKeyDown}
        data-testid="linked-text-editor-content"
      >
        {/* ---- Header bar ---- */}
        <div
          className="flex shrink-0 items-center gap-3 border-b px-3"
          style={{
            height: 32,
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--toolbar-bg)',
          }}
          data-testid="linked-text-header"
        >
          <Icon path={mdiLinkVariant} size="sm" color="var(--accent-orange)" />
          <span
            className="select-none text-xs font-semibold"
            style={{ color: 'var(--accent-orange)' }}
          >
            LINKED TEXT EDITOR
          </span>
          <div className="ml-auto">
            <NumericUpDown
              value={editorFontSize}
              onChange={setEditorFontSize}
              min={8}
              max={72}
              label="Editor Size"
              width={50}
            />
          </div>
        </div>

        {/* ---- Legend panel (scrollable) ---- */}
        <div
          className="shrink-0 overflow-auto border-b"
          style={{
            maxHeight: 150,
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--panel-bg)',
          }}
          data-testid="linked-text-legend"
        >
          {layers.map((layer, index) => {
            const isExpanded = expandedLayers.has(layer.id);
            return (
              <div key={layer.id}>
                <div
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-[var(--hover-bg)]"
                  onClick={() => toggleLayerExpanded(layer.id)}
                  data-testid={`linked-text-legend-entry-${index}`}
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
                    data-testid={`linked-text-line-badge-${index}`}
                  >
                    {layer.lineNumber ?? index + 1}
                  </span>

                  {/* Layer name */}
                  <span
                    className="flex-1 truncate text-xs"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {layer.name}
                  </span>

                  {/* Font info */}
                  <span
                    className="shrink-0 text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {layer.fontFamily ?? 'Roboto'} {layerFontSizes[layer.id] ?? layer.fontSize ?? 24}px
                  </span>

                  {/* Expand/collapse toggle */}
                  <Icon
                    path={isExpanded ? mdiChevronUp : mdiChevronDown}
                    size={14}
                    color="var(--text-secondary)"
                  />
                </div>

                {/* Per-layer sliders */}
                {isExpanded && (
                  <div
                    className="flex flex-col gap-1.5 border-t px-3 py-2"
                    style={{
                      borderColor: 'var(--border-color)',
                      backgroundColor: 'var(--toolbar-bg)',
                    }}
                    data-testid={`linked-text-layer-sliders-${index}`}
                  >
                    {/* Font Size */}
                    <div className="flex items-center gap-2">
                      <span
                        className="select-none text-xs"
                        style={{ color: 'var(--text-secondary)', minWidth: 65 }}
                      >
                        Font Size
                      </span>
                      <input
                        type="range"
                        min={6}
                        max={300}
                        step={1}
                        value={layerFontSizes[layer.id] ?? layer.fontSize ?? 24}
                        onChange={(e) =>
                          updateLayerFontSize(layer.id, parseFloat(e.target.value))
                        }
                        className="flex-1"
                        style={{ accentColor: 'var(--accent-orange)' }}
                        data-testid={`linked-text-font-size-slider-${index}`}
                      />
                      <NumericUpDown
                        value={layerFontSizes[layer.id] ?? layer.fontSize ?? 24}
                        onChange={(v) => updateLayerFontSize(layer.id, v)}
                        min={6}
                        max={300}
                        label=""
                        width={55}
                      />
                    </div>

                    {/* W Squeeze */}
                    <div className="flex items-center gap-2">
                      <span
                        className="select-none text-xs"
                        style={{ color: 'var(--text-secondary)', minWidth: 65 }}
                      >
                        W Squeeze
                      </span>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        step={0.1}
                        value={layerWSqueeze[layer.id] ?? 0}
                        onChange={(e) =>
                          updateLayerWSqueeze(layer.id, parseFloat(e.target.value))
                        }
                        className="flex-1"
                        style={{ accentColor: 'var(--accent-orange)' }}
                        data-testid={`linked-text-wsqueeze-slider-${index}`}
                      />
                      <NumericUpDown
                        value={layerWSqueeze[layer.id] ?? 0}
                        onChange={(v) => updateLayerWSqueeze(layer.id, v)}
                        min={-100}
                        max={100}
                        step={0.1}
                        label=""
                        width={55}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ---- Textarea ---- */}
        <div className="flex-1 overflow-hidden p-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            className="h-full w-full resize-none rounded border p-2 outline-none"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#000000',
              fontSize: editorFontSize,
              borderColor: 'var(--border-color)',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
            data-testid="linked-text-textarea"
          />
        </div>

        {/* ---- Status bar ---- */}
        <div
          className="flex shrink-0 items-center gap-4 border-t px-3"
          style={{
            height: 24,
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--toolbar-bg)',
          }}
          data-testid="linked-text-status"
        >
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Lines: {lineCount}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Characters: {charCount}
          </span>
        </div>
      </div>
    </DialogBase>
  );
}

export default LinkedTextEditorWindow;
