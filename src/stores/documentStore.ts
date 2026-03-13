import { create } from 'zustand';
import type { ProjectModel, LayerModel } from '../types/index';
import { createDefaultProject } from '../types/index';
import type { DocumentModel } from '../types/document-model';
import type { Node } from '../types/node';
import { legacyProjectToDocument } from '../types/compat';
import { setDocument as rustSetDocument } from '../bridge/documentBridge';

export interface DocumentState {
  project: ProjectModel;
  /** Mirror of project as DocumentModel (Node-based), kept in sync. */
  document: DocumentModel;
  selectedLayerIds: string[];
  undoStack: ProjectModel[];
  redoStack: ProjectModel[];
  isDirty: boolean;
  currentProjectPath: string | null;
  windowTitle: string;
  suppressRender: boolean;
}

export interface DocumentActions {
  setProject: (project: ProjectModel) => void;
  addLayer: (layer: LayerModel) => void;
  addLayerAtIndex: (layer: LayerModel, index: number) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, changes: Partial<LayerModel>) => void;
  moveLayer: (layerId: string, newIndex: number) => void;
  moveLayerSubtree: (layerId: string, newIndex: number) => void;
  selectLayer: (layerId: string) => void;
  setSelectedLayerIds: (ids: string[]) => void;
  toggleSelection: (layerId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  undo: () => void;
  redo: () => void;
  pushUndo: () => void;
  setCanvasSize: (width: number, height: number) => void;
  setBackgroundColor: (color: string) => void;
  markDirty: () => void;
  markClean: () => void;
  setCurrentProjectPath: (path: string | null) => void;
  setWindowTitle: (title: string) => void;
  setSuppressRender: (suppress: boolean) => void;
  // Derived selectors
  hasSelectedLayer: () => boolean;
  isTextSelected: () => boolean;
  isImageSelected: () => boolean;
  isShapeSelected: () => boolean;
  // Node-based accessors (read from document mirror)
  getNodes: () => Node[];
  getNodeById: (id: string) => Node | undefined;
  getDocument: () => DocumentModel;
}

export type DocumentStore = DocumentState & DocumentActions;

const MAX_UNDO = 50;

// ---------------------------------------------------------------------------
// Rust document sync (fire-and-forget, debounced)
// ---------------------------------------------------------------------------

let syncTimer: ReturnType<typeof setTimeout> | null = null;

/** Monotonic counter incremented each time Rust document sync completes. */
let _rustSyncVersion = 0;

/** Get the current Rust sync version (used by GPU renderer to detect fresh data). */
export function getRustSyncVersion(): number {
  return _rustSyncVersion;
}

/** Derive DocumentModel from ProjectModel and push to Rust. */
function syncProjectToRust(project: ProjectModel): void {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  syncTimer = setTimeout(() => {
    try {
      const doc = legacyProjectToDocument(project);
      rustSetDocument(doc)
        .then(() => {
          _rustSyncVersion += 1;
        })
        .catch(() => {
          // Silently ignore — Tauri runtime may not be available in dev/test
        });
    } catch {
      // Conversion error — non-fatal
    }
  }, 16); // reduced from 50ms to ~1 frame for faster GPU sync
}

const defaultProject = createDefaultProject();

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  project: defaultProject,
  document: legacyProjectToDocument(defaultProject),
  selectedLayerIds: [],
  undoStack: [],
  redoStack: [],
  isDirty: false,
  currentProjectPath: null,
  windowTitle: 'Thamnel',
  suppressRender: false,

  setProject: (project) =>
    set({ project, selectedLayerIds: [], undoStack: [], redoStack: [] }),

  addLayer: (layer) =>
    set((state) => ({
      project: {
        ...state.project,
        layers: [...state.project.layers, layer],
      },
    })),

  addLayerAtIndex: (layer, index) =>
    set((state) => {
      const layers = [...state.project.layers];
      const clamped = Math.max(0, Math.min(index, layers.length));
      layers.splice(clamped, 0, layer);
      return { project: { ...state.project, layers } };
    }),

  removeLayer: (layerId) =>
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.filter((l) => l.id !== layerId),
      },
      selectedLayerIds: state.selectedLayerIds.filter((id) => id !== layerId),
    })),

  updateLayer: (layerId, changes) =>
    set((state) => ({
      project: {
        ...state.project,
        layers: state.project.layers.map((l) =>
          l.id === layerId
            ? { ...l, ...changes, renderVersion: (l.renderVersion ?? 0) + 1 }
            : l,
        ),
      },
    })),

  moveLayer: (layerId, newIndex) =>
    set((state) => {
      const layers = [...state.project.layers];
      const currentIndex = layers.findIndex((l) => l.id === layerId);
      if (currentIndex === -1) return state;
      const [layer] = layers.splice(currentIndex, 1);
      const clampedIndex = Math.max(0, Math.min(newIndex, layers.length));
      layers.splice(clampedIndex, 0, layer);
      return { project: { ...state.project, layers } };
    }),

  moveLayerSubtree: (layerId, newIndex) =>
    set((state) => {
      const layers = [...state.project.layers];
      const idx = layers.findIndex((l) => l.id === layerId);
      if (idx === -1) return state;
      const baseDepth = layers[idx].depth;
      let endIdx = idx;
      for (let i = idx + 1; i < layers.length; i++) {
        if (layers[i].depth > baseDepth) endIdx = i;
        else break;
      }
      const subtree = layers.splice(idx, endIdx - idx + 1);
      const adjusted = newIndex > idx ? newIndex - subtree.length : newIndex;
      const clamped = Math.max(0, Math.min(adjusted, layers.length));
      layers.splice(clamped, 0, ...subtree);
      return { project: { ...state.project, layers } };
    }),

  selectLayer: (layerId) => set({ selectedLayerIds: [layerId] }),

  setSelectedLayerIds: (ids) => set({ selectedLayerIds: ids }),

  toggleSelection: (layerId) =>
    set((state) => {
      const ids = state.selectedLayerIds;
      if (ids.includes(layerId)) {
        return { selectedLayerIds: ids.filter((id) => id !== layerId) };
      }
      return { selectedLayerIds: [...ids, layerId] };
    }),

  selectAll: () =>
    set((state) => ({
      selectedLayerIds: state.project.layers.map((l) => l.id),
    })),

  deselectAll: () => set({ selectedLayerIds: [] }),

  pushUndo: () =>
    set((state) => ({
      undoStack: [...state.undoStack.slice(-(MAX_UNDO - 1)), state.project],
      redoStack: [],
    })),

  undo: () => {
    const { undoStack, project } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    set({
      project: prev,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, project],
    });
  },

  redo: () => {
    const { redoStack, project } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    set({
      project: next,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, project],
    });
  },

  setCanvasSize: (width, height) =>
    set((state) => ({
      project: { ...state.project, canvasWidth: width, canvasHeight: height },
    })),

  setBackgroundColor: (color) =>
    set((state) => ({
      project: { ...state.project, backgroundColor: color },
    })),

  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),
  setCurrentProjectPath: (path) => set({ currentProjectPath: path }),
  setWindowTitle: (title) => set({ windowTitle: title }),
  setSuppressRender: (suppress) => set({ suppressRender: suppress }),

  // Derived selectors
  hasSelectedLayer: () => get().selectedLayerIds.length > 0,

  isTextSelected: () => {
    const { selectedLayerIds, project } = get();
    return selectedLayerIds.some((id) => {
      const layer = project.layers.find((l) => l.id === id);
      return layer?.type === 'text';
    });
  },

  isImageSelected: () => {
    const { selectedLayerIds, project } = get();
    return selectedLayerIds.some((id) => {
      const layer = project.layers.find((l) => l.id === id);
      return layer?.type === 'image';
    });
  },

  isShapeSelected: () => {
    const { selectedLayerIds, project } = get();
    return selectedLayerIds.some((id) => {
      const layer = project.layers.find((l) => l.id === id);
      return layer?.type === 'shape';
    });
  },

  // Node-based accessors (read from the document mirror)
  getNodes: () => get().document.nodes,
  getNodeById: (id: string) =>
    get().document.nodes.find((n) => n.base.identity.id === id),
  getDocument: () => get().document,
}));

// ---------------------------------------------------------------------------
// Auto-sync: keep document mirror and Rust state in sync with project changes
// ---------------------------------------------------------------------------

useDocumentStore.subscribe((state, prevState) => {
  if (state.project !== prevState.project) {
    // Update document mirror
    const doc = legacyProjectToDocument(state.project);
    useDocumentStore.setState({ document: doc });
    // Push to Rust (debounced, fire-and-forget)
    syncProjectToRust(state.project);
  }
});
