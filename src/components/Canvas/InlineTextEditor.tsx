import { useState, useRef, useEffect, useCallback } from 'react';
import { useDocumentStore } from '../../stores/documentStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { useUiStore } from '../../stores/uiStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TextLayerData {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

export interface InlineTextEditorProps {
  /** The text layer being edited. */
  layer: TextLayerData;
  /** Position offset (viewport coordinates). */
  position: { x: number; y: number };
  /** Current zoom level. */
  zoom: number;
  /** Called when the user commits the edit (Ctrl+Enter). */
  onCommit: (layerId: string, newText: string) => void;
  /** Called when the user cancels the edit (Escape). */
  onCancel: () => void;
}

const DEBOUNCE_MS = 150;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Inline text editing overlay positioned over a text layer on the canvas.
 *
 * - Activated by double-click, F2, or after text draw.
 * - Orange border (#FF6600, 1.5px) indicator.
 * - Rotation-aware positioning via CSS transform.
 * - 150ms debounce: updates layer textProperties.text in real-time.
 * - Ctrl+Enter commits the edit; Escape cancels.
 * - Hides original layer element during editing.
 */
export function InlineTextEditor({
  layer,
  position,
  zoom,
  onCommit,
  onCancel,
}: InlineTextEditorProps) {
  const [text, setText] = useState(layer.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const originalTextRef = useRef(layer.text);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus on mount
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.focus();
      ta.select();
    }

    // Mark text editing active
    useUiStore.getState().setEditingText(true);

    // Hide the original layer element during editing
    hideLayerElement(layer.id, true);

    return () => {
      // Clean up: show layer again, mark editing done
      hideLayerElement(layer.id, false);
      useUiStore.getState().setEditingText(false);

      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced text update to layer
  const debouncedUpdateLayer = useCallback(
    (newText: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        // Update layer textProperties.text in real time
        const docStore = useDocumentStore.getState();
        const currentLayer = docStore.project.layers.find((l) => l.id === layer.id);
        if (currentLayer && currentLayer.textProperties) {
          docStore.updateLayer(layer.id, {
            textProperties: { ...currentLayer.textProperties, text: newText },
          });
        }
      }, DEBOUNCE_MS);
    },
    [layer.id],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setText(newText);
      debouncedUpdateLayer(newText);
    },
    [debouncedUpdateLayer],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        // Cancel: restore original text
        const docStore = useDocumentStore.getState();
        const currentLayer = docStore.project.layers.find((l) => l.id === layer.id);
        if (currentLayer && currentLayer.textProperties) {
          docStore.updateLayer(layer.id, {
            textProperties: { ...currentLayer.textProperties, text: originalTextRef.current },
          });
        }
        onCancel();
        return;
      }

      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        // Commit: save text, take undo snapshot
        useUndoRedoStore.getState().takeSnapshot();

        // Ensure final text is saved (clear any pending debounce)
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        const docStore = useDocumentStore.getState();
        const currentLayer = docStore.project.layers.find((l) => l.id === layer.id);
        if (currentLayer && currentLayer.textProperties) {
          docStore.updateLayer(layer.id, {
            textProperties: { ...currentLayer.textProperties, text },
          });
        }

        onCommit(layer.id, text);
        return;
      }
    },
    [layer.id, text, onCommit, onCancel],
  );

  const rotation = layer.rotation ?? 0;
  const scaledX = position.x + layer.x * zoom;
  const scaledY = position.y + layer.y * zoom;
  const scaledW = layer.width * zoom;
  const scaledH = layer.height * zoom;

  return (
    <div
      data-testid="inline-text-editor"
      style={{
        position: 'absolute',
        left: scaledX,
        top: scaledY,
        width: scaledW,
        height: scaledH,
        transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: 'top left',
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
    >
      <textarea
        ref={textareaRef}
        data-testid="inline-text-textarea"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          height: '100%',
          border: '1.5px solid #FF6600',
          outline: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          color: layer.color ?? '#000000',
          fontSize: (layer.fontSize ?? 16) * zoom,
          fontFamily: layer.fontFamily ?? 'sans-serif',
          resize: 'none',
          padding: 4,
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      />
    </div>
  );
}

/**
 * Toggle visibility of the original layer DOM element during inline editing.
 */
function hideLayerElement(layerId: string, hide: boolean): void {
  const el = document.querySelector(`[data-layer-id="${layerId}"]`) as HTMLElement | null;
  if (el) {
    el.style.visibility = hide ? 'hidden' : 'visible';
  }
}

export default InlineTextEditor;
