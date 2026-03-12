import { create } from 'zustand';
import { useDocumentStore } from './documentStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UndoRedoState {
  undoStack: string[];
  redoStack: string[];
  lastHash: string;
  maxSnapshotCount: number;
}

export interface UndoRedoActions {
  takeSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export type UndoRedoStore = UndoRedoState & UndoRedoActions;

// ---------------------------------------------------------------------------
// Hash helper
// ---------------------------------------------------------------------------

/**
 * Simple hash: length + first 3 chars + last 3 chars of the JSON string.
 * Fast enough for dedup without crypto overhead.
 */
function computeSimpleHash(json: string): string {
  const len = json.length;
  const first = json.substring(0, 3);
  const last = json.substring(Math.max(0, len - 3));
  return `${len}:${first}:${last}`;
}

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

/**
 * Serialize layers from the document store into a JSON snapshot string.
 * Converts Uint8Array fields to regular arrays for JSON compatibility.
 */
function serializeLayers(): string {
  const { project } = useDocumentStore.getState();
  const layers = project.layers.map((layer) => ({
    ...layer,
    blurMaskData: layer.blurMaskData ? Array.from(layer.blurMaskData) : null,
  }));
  return JSON.stringify(layers);
}

/**
 * Deserialize a snapshot JSON string back into the document store layers.
 * Restores Uint8Array fields from regular arrays.
 */
function deserializeLayers(json: string): void {
  const parsed = JSON.parse(json) as Array<Record<string, unknown>>;
  const layers = parsed.map((raw) => ({
    ...raw,
    blurMaskData: raw.blurMaskData
      ? new Uint8Array(raw.blurMaskData as number[])
      : null,
  }));

  const docStore = useDocumentStore.getState();
  const currentSelectedIds = docStore.selectedLayerIds;

  // Replace layers in document store
  useDocumentStore.setState((state) => ({
    project: {
      ...state.project,
      layers: layers as typeof state.project.layers,
    },
  }));

  // Re-select layers that still exist
  const layerIds = new Set(layers.map((l) => (l as Record<string, unknown>).id as string));
  const validSelectedIds = currentSelectedIds.filter((id) => layerIds.has(id));
  useDocumentStore.setState({ selectedLayerIds: validSelectedIds });
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUndoRedoStore = create<UndoRedoStore>((set, get) => ({
  undoStack: [],
  redoStack: [],
  lastHash: '',
  maxSnapshotCount: 30,

  takeSnapshot: () => {
    const json = serializeLayers();
    const hash = computeSimpleHash(json);

    const { lastHash, undoStack, maxSnapshotCount } = get();

    // Dedup: skip if the hash matches the last snapshot
    if (hash === lastHash && lastHash !== '') return;

    // Enforce max stack size — drop oldest if over limit
    const newStack = undoStack.length >= maxSnapshotCount
      ? [...undoStack.slice(undoStack.length - (maxSnapshotCount - 1)), json]
      : [...undoStack, json];

    set({
      undoStack: newStack,
      redoStack: [],
      lastHash: hash,
    });
  },

  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return;

    // Save current state to redo stack
    const currentJson = serializeLayers();
    const prev = undoStack[undoStack.length - 1];

    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, currentJson],
      lastHash: computeSimpleHash(prev),
    });

    // Restore layers from the snapshot
    deserializeLayers(prev);
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return;

    // Save current state to undo stack
    const currentJson = serializeLayers();
    const next = redoStack[redoStack.length - 1];

    set({
      undoStack: [...undoStack, currentJson],
      redoStack: redoStack.slice(0, -1),
      lastHash: computeSimpleHash(next),
    });

    // Restore layers from the snapshot
    deserializeLayers(next);
  },

  clear: () => {
    set({
      undoStack: [],
      redoStack: [],
      lastHash: '',
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
}));
