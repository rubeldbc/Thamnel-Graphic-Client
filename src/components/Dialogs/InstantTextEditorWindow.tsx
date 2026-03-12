import { useState, useRef, useEffect, useCallback } from 'react';
import { DialogBase } from './DialogBase';
import { NumericUpDown } from '../common/NumericUpDown';
import { Icon } from '../common/Icon';
import { mdiChevronDown, mdiChevronUp } from '@mdi/js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InstantTextEditorWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layerId?: string;
  initialText?: string;
  fontFamily?: string;
  fontSize?: number;
  onTextChange?: (text: string) => void;
  onAccept?: (text: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InstantTextEditorWindow({
  open,
  onOpenChange,
  layerId,
  initialText = '',
  fontFamily = 'Roboto',
  fontSize: initialFontSize = 24,
  onTextChange,
  onAccept,
}: InstantTextEditorWindowProps) {
  const [text, setText] = useState(initialText);
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [sliderFontSize, setSliderFontSize] = useState(initialFontSize);
  const [wSqueeze, setWSqueeze] = useState(0);
  const [showSliders, setShowSliders] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync from props when dialog opens
  useEffect(() => {
    if (open) {
      setText(initialText);
      setSliderFontSize(initialFontSize);
      setWSqueeze(0);
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

  const handleChange = useCallback(
    (newText: string) => {
      setText(newText);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onTextChange?.(newText), 150);
    },
    [onTextChange],
  );

  const handleAccept = useCallback(() => {
    clearTimeout(timerRef.current);
    onAccept?.(text);
    onOpenChange(false);
  }, [text, onAccept, onOpenChange]);

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

  // Compute stats
  const charCount = text.length;
  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={handleCancel}
        data-testid="instant-text-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={handleAccept}
        data-testid="instant-text-accept"
      >
        Accept
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="INSTANT TEXT EDITOR"
      width={500}
      height={400}
      footer={footer}
    >
      <div
        className="flex h-full flex-col"
        onKeyDown={handleKeyDown}
        data-testid="instant-text-editor-content"
      >
        {/* ---- Header bar ---- */}
        <div
          className="flex shrink-0 items-center gap-3 border-b px-3"
          style={{
            height: 32,
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--toolbar-bg)',
          }}
          data-testid="instant-text-header"
        >
          <span
            className="select-none text-xs"
            style={{ color: 'var(--text-secondary)' }}
            data-testid="instant-text-font-name"
          >
            {fontFamily}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <NumericUpDown
              value={editorFontSize}
              onChange={setEditorFontSize}
              min={8}
              max={72}
              label="Editor Size"
              width={50}
            />
            <button
              type="button"
              className="rounded p-0.5 hover:bg-[var(--hover-bg)]"
              onClick={() => setShowSliders((v) => !v)}
              data-testid="instant-text-toggle-sliders"
              title={showSliders ? 'Hide sliders' : 'Show sliders'}
            >
              <Icon
                path={showSliders ? mdiChevronUp : mdiChevronDown}
                size="sm"
                color="var(--text-secondary)"
              />
            </button>
          </div>
        </div>

        {/* ---- Slider panel (collapsible) ---- */}
        {showSliders && (
          <div
            className="flex shrink-0 flex-col gap-2 border-b px-3 py-2"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--panel-bg)',
            }}
            data-testid="instant-text-slider-panel"
          >
            {/* Font Size slider */}
            <div className="flex items-center gap-2">
              <span
                className="select-none text-xs"
                style={{ color: 'var(--text-secondary)', minWidth: 70 }}
              >
                Font Size
              </span>
              <input
                type="range"
                min={6}
                max={300}
                step={0.5}
                value={sliderFontSize}
                onChange={(e) => setSliderFontSize(parseFloat(e.target.value))}
                className="flex-1"
                style={{ accentColor: 'var(--accent-orange)' }}
                data-testid="instant-text-font-size-slider"
              />
              <NumericUpDown
                value={sliderFontSize}
                onChange={setSliderFontSize}
                min={6}
                max={300}
                step={0.5}
                label=""
                width={60}
              />
            </div>

            {/* W Squeeze slider */}
            <div className="flex items-center gap-2">
              <span
                className="select-none text-xs"
                style={{ color: 'var(--text-secondary)', minWidth: 70 }}
              >
                W Squeeze
              </span>
              <input
                type="range"
                min={-100}
                max={100}
                step={0.1}
                value={wSqueeze}
                onChange={(e) => setWSqueeze(parseFloat(e.target.value))}
                className="flex-1"
                style={{ accentColor: 'var(--accent-orange)' }}
                data-testid="instant-text-wsqueeze-slider"
              />
              <NumericUpDown
                value={wSqueeze}
                onChange={setWSqueeze}
                min={-100}
                max={100}
                step={0.1}
                label=""
                width={60}
              />
            </div>
          </div>
        )}

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
              fontFamily,
              fontSize: editorFontSize,
              borderColor: 'var(--border-color)',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
            data-testid="instant-text-textarea"
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
          data-testid="instant-text-status"
        >
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Characters: {charCount}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Words: {wordCount}
          </span>
        </div>
      </div>
    </DialogBase>
  );
}

export default InstantTextEditorWindow;
