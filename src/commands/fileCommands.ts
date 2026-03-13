import type { Command } from './types';
import { useDocumentStore } from '../stores/documentStore';
import { useUiStore } from '../stores/uiStore';
import { createDefaultProject, createDefaultLayer } from '../types/index';
import { documentToLegacyProject } from '../types/compat';
import type { DocumentModel } from '../types/document-model';
import { compositeAllLayers } from '../engine/compositor';

// ---------------------------------------------------------------------------
// Tauri API helpers (lazy imports – gracefully degrade in browser/test)
// ---------------------------------------------------------------------------

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  } catch {
    console.warn(`[fileCommands] Tauri invoke unavailable for: ${cmd}`);
    throw new Error('Tauri runtime not available');
  }
}

async function tauriDialogSave(filters: { name: string; extensions: string[] }[]): Promise<string | null> {
  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    return save({ filters });
  } catch {
    console.warn('[fileCommands] Tauri dialog unavailable');
    return null;
  }
}

async function tauriDialogOpen(
  filters: { name: string; extensions: string[] }[],
  multiple = false,
): Promise<string | string[] | null> {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    return open({ filters, multiple });
  } catch {
    console.warn('[fileCommands] Tauri dialog unavailable');
    return null;
  }
}

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

/** Serialize using the legacy ProjectModel format (backward compatible). */
function serializeProject(): string {
  const { project } = useDocumentStore.getState();
  return JSON.stringify(project, null, 2);
}

/**
 * Detect whether parsed JSON is the new DocumentModel format.
 * New format has `nodes` array and `canvasSize` object.
 * Old format has `layers` array and flat `canvasWidth`/`canvasHeight`.
 */
function isDocumentModel(data: Record<string, unknown>): boolean {
  return Array.isArray(data.nodes) && typeof data.canvasSize === 'object';
}

/**
 * Load a project from JSON string. Supports both:
 * - Old format (ProjectModel with layers[])
 * - New format (DocumentModel with nodes[])
 */
function loadProjectFromJson(json: string): void {
  try {
    const data = JSON.parse(json);
    if (isDocumentModel(data)) {
      // New format: convert DocumentModel → ProjectModel for the store
      const project = documentToLegacyProject(data as DocumentModel);
      useDocumentStore.getState().setProject(project);
    } else {
      // Old format: use as-is
      useDocumentStore.getState().setProject(data);
    }
    useDocumentStore.getState().markClean();
  } catch (e) {
    console.error('[fileCommands] Failed to parse project JSON:', e);
  }
}

// ---------------------------------------------------------------------------
// Guard helpers
// ---------------------------------------------------------------------------

function hasLayers(): boolean {
  return useDocumentStore.getState().project.layers.length > 0;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export const newProject: Command = {
  name: 'newProject',
  shortcut: 'Ctrl+N',
  category: 'file',
  canExecute: () => true,
  execute: () => {
    useDocumentStore.getState().setProject(createDefaultProject());
    useDocumentStore.getState().markClean();
    useDocumentStore.getState().setCurrentProjectPath(null);
    useDocumentStore.getState().setWindowTitle('Thamnel');
    useUiStore.getState().setStatusMessage('New project created');
  },
};

export const openProject: Command = {
  name: 'openProject',
  shortcut: 'Ctrl+O',
  category: 'file',
  canExecute: () => true,
  execute: async () => {
    const result = await tauriDialogOpen([
      { name: 'Thamnel Project', extensions: ['rbl', 'json'] },
    ]);
    if (!result || Array.isArray(result)) return;
    const path = result;
    try {
      const json = await tauriInvoke<string>('load_project', { path });
      loadProjectFromJson(json);
      useDocumentStore.getState().setCurrentProjectPath(path);
      const name = path.split(/[/\\]/).pop() ?? 'Untitled';
      useDocumentStore.getState().setWindowTitle(`Thamnel - ${name}`);
      useUiStore.getState().setStatusMessage(`Opened: ${name}`);
    } catch (e) {
      console.error('[fileCommands] openProject failed:', e);
      useUiStore.getState().setStatusMessage('Failed to open project');
    }
  },
};

export const saveProject: Command = {
  name: 'saveProject',
  shortcut: 'Ctrl+S',
  category: 'file',
  canExecute: () => true,
  execute: async () => {
    let path = useDocumentStore.getState().currentProjectPath;
    if (!path) {
      path = await tauriDialogSave([
        { name: 'Thamnel Project', extensions: ['rbl'] },
      ]);
      if (!path) return;
    }
    try {
      const data = serializeProject();
      await tauriInvoke('save_project', { path, data });
      useDocumentStore.getState().setCurrentProjectPath(path);
      useDocumentStore.getState().markClean();
      const name = path.split(/[/\\]/).pop() ?? 'Project';
      useDocumentStore.getState().setWindowTitle(`Thamnel - ${name}`);
      useUiStore.getState().setStatusMessage(`Saved: ${name}`);
    } catch (e) {
      console.error('[fileCommands] saveProject failed:', e);
      useUiStore.getState().setStatusMessage('Failed to save project');
    }
  },
};

export const saveProjectAs: Command = {
  name: 'saveProjectAs',
  shortcut: 'Ctrl+Shift+S',
  category: 'file',
  canExecute: () => true,
  execute: async () => {
    const path = await tauriDialogSave([
      { name: 'Thamnel Project', extensions: ['rbl'] },
    ]);
    if (!path) return;
    try {
      const data = serializeProject();
      await tauriInvoke('save_project', { path, data });
      useDocumentStore.getState().setCurrentProjectPath(path);
      useDocumentStore.getState().markClean();
      const name = path.split(/[/\\]/).pop() ?? 'Project';
      useDocumentStore.getState().setWindowTitle(`Thamnel - ${name}`);
      useUiStore.getState().setStatusMessage(`Saved as: ${name}`);
    } catch (e) {
      console.error('[fileCommands] saveProjectAs failed:', e);
    }
  },
};

export const saveCopy: Command = {
  name: 'saveCopy',
  category: 'file',
  canExecute: () => true,
  execute: async () => {
    const path = await tauriDialogSave([
      { name: 'Thamnel Project', extensions: ['rbl'] },
    ]);
    if (!path) return;
    try {
      const data = serializeProject();
      await tauriInvoke('save_project', { path, data });
      // Don't update currentProjectPath for save copy
      useUiStore.getState().setStatusMessage('Copy saved');
    } catch (e) {
      console.error('[fileCommands] saveCopy failed:', e);
    }
  },
};

export const exportImage: Command = {
  name: 'exportImage',
  shortcut: 'Ctrl+E',
  category: 'file',
  canExecute: () => hasLayers(),
  execute: async () => {
    const path = await tauriDialogSave([
      { name: 'PNG Image', extensions: ['png'] },
      { name: 'JPEG Image', extensions: ['jpg', 'jpeg'] },
      { name: 'BMP Image', extensions: ['bmp'] },
      { name: 'WebP Image', extensions: ['webp'] },
    ]);
    if (!path) return;

    try {
      useUiStore.getState().setStatusMessage('Exporting image...');
      const { project } = useDocumentStore.getState();
      const { canvasWidth, canvasHeight, backgroundColor, layers } = project;

      // Render at full resolution
      const canvas = compositeAllLayers(
        layers,
        canvasWidth,
        canvasHeight,
        backgroundColor,
        1, // zoom=1 for export
        100, // full quality
        false,
      );

      // Determine format from file extension
      const ext = path.split('.').pop()?.toLowerCase() ?? 'png';
      const mimeMap: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        bmp: 'image/bmp',
        webp: 'image/webp',
      };
      const mime = mimeMap[ext] ?? 'image/png';

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mime, 0.95),
      );
      if (!blob) throw new Error('Failed to create image blob');

      const arrayBuffer = await blob.arrayBuffer();
      const bytes = Array.from(new Uint8Array(arrayBuffer));

      await tauriInvoke('export_image_data', {
        path,
        data: bytes,
        format: ext,
      });

      useUiStore.getState().setStatusMessage(`Exported: ${path.split(/[/\\]/).pop()}`);
    } catch (e) {
      console.error('[fileCommands] exportImage failed:', e);
      useUiStore.getState().setStatusMessage('Failed to export image');
    }
  },
};

export const exportPsd: Command = {
  name: 'exportPsd',
  category: 'file',
  canExecute: () => hasLayers(),
  execute: () => {
    useUiStore.getState().setStatusMessage('PSD export not yet implemented');
  },
};

export const exportSvg: Command = {
  name: 'exportSvg',
  category: 'file',
  canExecute: () => hasLayers(),
  execute: () => {
    useUiStore.getState().setStatusMessage('SVG export not yet implemented');
  },
};

export const importImage: Command = {
  name: 'importImage',
  shortcut: 'Ctrl+I',
  category: 'file',
  canExecute: () => true,
  execute: async () => {
    const result = await tauriDialogOpen([
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'webp', 'gif'] },
    ]);
    if (!result || Array.isArray(result)) return;
    const path = result;

    try {
      useUiStore.getState().setStatusMessage('Importing image...');

      // Read image as base64 via Tauri
      const base64 = await tauriInvoke<string>('read_image_as_base64', { path });
      const dims = await tauriInvoke<[number, number]>('decode_image_dimensions', { path });

      const ext = path.split('.').pop()?.toLowerCase() ?? 'png';
      const mimeMap: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        bmp: 'image/bmp',
        webp: 'image/webp',
        gif: 'image/gif',
      };
      const mime = mimeMap[ext] ?? 'image/png';
      const dataUrl = `data:${mime};base64,${base64}`;

      const store = useDocumentStore.getState();
      store.pushUndo();

      const name = path.split(/[/\\]/).pop() ?? 'Image';
      const layer = createDefaultLayer({
        type: 'image',
        name,
        width: dims[0],
        height: dims[1],
        imageData: dataUrl,
      });

      store.addLayer(layer);
      store.selectLayer(layer.id);
      store.markDirty();

      useUiStore.getState().setStatusMessage(`Imported: ${name}`);
    } catch (e) {
      console.error('[fileCommands] importImage failed:', e);
      useUiStore.getState().setStatusMessage('Failed to import image');
    }
  },
};

export const importVideo: Command = {
  name: 'importVideo',
  category: 'file',
  canExecute: () => true,
  execute: async () => {
    const result = await tauriDialogOpen([
      { name: 'Video Files', extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv'] },
    ]);
    if (!result || Array.isArray(result)) return;
    useUiStore.getState().setStatusMessage(`Video added: ${result.split(/[/\\]/).pop()}`);
  },
};

export const importSvg: Command = {
  name: 'importSvg',
  category: 'file',
  canExecute: () => true,
  execute: () => {
    useUiStore.getState().setStatusMessage('SVG import not yet implemented');
  },
};

export const importLayersFromProject: Command = {
  name: 'importLayersFromProject',
  category: 'file',
  canExecute: () => true,
  execute: () => {
    useUiStore.getState().setStatusMessage('Layer import not yet implemented');
  },
};

export const fileCommands: Command[] = [
  newProject,
  openProject,
  saveProject,
  saveProjectAs,
  saveCopy,
  exportImage,
  exportPsd,
  exportSvg,
  importImage,
  importVideo,
  importSvg,
  importLayersFromProject,
];
