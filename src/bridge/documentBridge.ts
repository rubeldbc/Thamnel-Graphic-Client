// TypeScript IPC wrapper for the Rust document bridge.
//
// These functions call the Tauri commands registered in document_bridge.rs.
// During Phase 1, these are used alongside the existing Zustand store.
// Components can gradually migrate to use these instead of direct store mutations.

import type { DocumentModel } from '../types/document-model';

// ---------------------------------------------------------------------------
// Tauri invoke helper
// ---------------------------------------------------------------------------

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

// ---------------------------------------------------------------------------
// Document bridge commands
// ---------------------------------------------------------------------------

/** Get the current document state from Rust. */
export async function getDocument(): Promise<DocumentModel> {
  return invoke<DocumentModel>('get_document');
}

/** Replace the entire document in Rust state (used when loading). */
export async function setDocument(document: DocumentModel): Promise<void> {
  return invoke<void>('set_document', { document });
}

/** Apply a document command and get the updated document. */
export async function applyCommand(cmd: unknown): Promise<DocumentModel> {
  return invoke<DocumentModel>('apply_command', { cmd });
}

/** Undo the most recent document change. */
export async function undoDocument(): Promise<DocumentModel> {
  return invoke<DocumentModel>('undo_document');
}

/** Redo the most recently undone change. */
export async function redoDocument(): Promise<DocumentModel> {
  return invoke<DocumentModel>('redo_document');
}

/** Get undo/redo availability state. */
export interface HistoryInfo {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
}

export async function getHistoryState(): Promise<HistoryInfo> {
  return invoke<HistoryInfo>('get_history_state');
}

/** Load a legacy .rbl file (old ProjectModel format) via Rust migration converter. */
export async function loadLegacyRbl(path: string): Promise<DocumentModel> {
  return invoke<DocumentModel>('load_legacy_rbl', { path });
}
