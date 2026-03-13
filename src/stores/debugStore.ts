import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Log categories & levels
// ---------------------------------------------------------------------------

/** Debug log categories. Each can be toggled on/off independently. */
export type DebugCategory = 'render' | 'imageEditing' | 'general' | 'documentSync';

/** Log severity levels. */
export type LogLevel = 'info' | 'warning' | 'error';

/** Display labels for categories. */
export const CATEGORY_LABELS: Record<DebugCategory, string> = {
  render: 'Render',
  imageEditing: 'Image Editing',
  general: 'General',
  documentSync: 'Document Sync',
};

/** All available categories in display order. */
export const ALL_CATEGORIES: DebugCategory[] = [
  'render',
  'imageEditing',
  'general',
  'documentSync',
];

// ---------------------------------------------------------------------------
// Log entry
// ---------------------------------------------------------------------------

let _nextLogId = 1;

export interface LogEntry {
  /** Unique monotonic ID. */
  id: number;
  /** Timestamp string (HH:MM:SS.mmm). */
  timestamp: string;
  /** Severity level. */
  level: LogLevel;
  /** Category this entry belongs to. */
  category: DebugCategory;
  /** Human-readable log message. */
  message: string;
  /** Optional structured detail data (shown on expand / included in copy). */
  detail?: string;
}

// ---------------------------------------------------------------------------
// Frame metrics (kept from Fix 1)
// ---------------------------------------------------------------------------

export interface FrameMetrics {
  frameNumber: number;
  timestamp: number;
  ipcMs: number;
  paintMs: number;
  totalMs: number;
  rustRenderMs: number;
  rustPrepareMs: number;
  rustReadbackMs: number;
  frameSizeBytes: number;
  nodeCount: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface DebugState {
  /** Whether the debug window is open. */
  visible: boolean;
  /** Which categories are enabled (checked). */
  enabledCategories: Record<DebugCategory, boolean>;
  /** Current level filter tab. */
  levelFilter: 'all' | LogLevel;
  /** Auto-scroll to bottom. */
  autoScroll: boolean;
  /** All log entries (capped at MAX_LOGS). */
  logs: LogEntry[];
  /** Rolling window of recent frame metrics (last 120 frames). */
  recentFrames: FrameMetrics[];
  /** Computed FPS. */
  fps: number;
  /** Whether GPU rendering is active. */
  gpuActive: boolean;
  /** Current Rust sync version. */
  syncVersion: number;
  /** Total frames rendered since app start. */
  totalFrames: number;
  /** Last error message. */
  lastError: string | null;
}

export interface DebugActions {
  toggleVisible: () => void;
  setVisible: (visible: boolean) => void;
  setCategoryEnabled: (cat: DebugCategory, enabled: boolean) => void;
  setLevelFilter: (filter: 'all' | LogLevel) => void;
  setAutoScroll: (on: boolean) => void;
  /** Push a new log entry. */
  pushLog: (level: LogLevel, category: DebugCategory, message: string, detail?: string) => void;
  /** Clear all logs. */
  clearLogs: () => void;
  /** Push a frame metric snapshot. */
  pushFrame: (metrics: FrameMetrics) => void;
  setGpuActive: (active: boolean) => void;
  setSyncVersion: (version: number) => void;
  setLastError: (error: string | null) => void;
  resetMetrics: () => void;
}

export type DebugStore = DebugState & DebugActions;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_LOGS = 2000;
const MAX_RECENT_FRAMES = 120;
const FPS_WINDOW_MS = 2000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nowTimestamp(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useDebugStore = create<DebugStore>((set, get) => ({
  // State
  visible: false,
  enabledCategories: {
    render: true,
    imageEditing: true,
    general: true,
    documentSync: true,
  },
  levelFilter: 'all',
  autoScroll: true,
  logs: [],
  recentFrames: [],
  fps: 0,
  gpuActive: false,
  syncVersion: 0,
  totalFrames: 0,
  lastError: null,

  // Actions
  toggleVisible: () => set((s) => ({ visible: !s.visible })),
  setVisible: (visible) => set({ visible }),

  setCategoryEnabled: (cat, enabled) =>
    set((s) => ({
      enabledCategories: { ...s.enabledCategories, [cat]: enabled },
    })),

  setLevelFilter: (filter) => set({ levelFilter: filter }),
  setAutoScroll: (on) => set({ autoScroll: on }),

  pushLog: (level, category, message, detail) => {
    const entry: LogEntry = {
      id: _nextLogId++,
      timestamp: nowTimestamp(),
      level,
      category,
      message,
      detail,
    };
    set((s) => {
      const logs = [...s.logs, entry];
      if (logs.length > MAX_LOGS) {
        logs.splice(0, logs.length - MAX_LOGS);
      }
      return { logs };
    });
  },

  clearLogs: () => set({ logs: [] }),

  pushFrame: (metrics) => {
    const state = get();
    const updated = [...state.recentFrames, metrics];
    if (updated.length > MAX_RECENT_FRAMES) {
      updated.splice(0, updated.length - MAX_RECENT_FRAMES);
    }
    const now = metrics.timestamp;
    const windowStart = now - FPS_WINDOW_MS;
    const framesInWindow = updated.filter((f) => f.timestamp >= windowStart);
    const fps =
      framesInWindow.length > 1
        ? framesInWindow.length / ((now - framesInWindow[0].timestamp) / 1000)
        : 0;

    set({
      recentFrames: updated,
      fps: Math.round(fps * 10) / 10,
      totalFrames: state.totalFrames + 1,
    });
  },

  setGpuActive: (active) => set({ gpuActive: active }),
  setSyncVersion: (version) => set({ syncVersion: version }),
  setLastError: (error) => set({ lastError: error }),

  resetMetrics: () =>
    set({
      recentFrames: [],
      fps: 0,
      totalFrames: 0,
      lastError: null,
    }),
}));

// ---------------------------------------------------------------------------
// Convenience log helpers — call from anywhere
// ---------------------------------------------------------------------------

export function debugLog(
  level: LogLevel,
  category: DebugCategory,
  message: string,
  detail?: string,
) {
  useDebugStore.getState().pushLog(level, category, message, detail);
}

export const dlog = {
  // Render
  renderInfo: (msg: string, detail?: string) => debugLog('info', 'render', msg, detail),
  renderWarn: (msg: string, detail?: string) => debugLog('warning', 'render', msg, detail),
  renderError: (msg: string, detail?: string) => debugLog('error', 'render', msg, detail),
  // Image Editing
  imageInfo: (msg: string, detail?: string) => debugLog('info', 'imageEditing', msg, detail),
  imageWarn: (msg: string, detail?: string) => debugLog('warning', 'imageEditing', msg, detail),
  imageError: (msg: string, detail?: string) => debugLog('error', 'imageEditing', msg, detail),
  // General
  generalInfo: (msg: string, detail?: string) => debugLog('info', 'general', msg, detail),
  generalWarn: (msg: string, detail?: string) => debugLog('warning', 'general', msg, detail),
  generalError: (msg: string, detail?: string) => debugLog('error', 'general', msg, detail),
  // Document Sync
  syncInfo: (msg: string, detail?: string) => debugLog('info', 'documentSync', msg, detail),
  syncWarn: (msg: string, detail?: string) => debugLog('warning', 'documentSync', msg, detail),
  syncError: (msg: string, detail?: string) => debugLog('error', 'documentSync', msg, detail),
};

// ---------------------------------------------------------------------------
// Format debug report for clipboard
// ---------------------------------------------------------------------------

export function formatDebugReport(): string {
  const s = useDebugStore.getState();
  const recent = s.recentFrames;
  const last = recent.length > 0 ? recent[recent.length - 1] : null;

  const avg = (fn: (f: FrameMetrics) => number) =>
    recent.length > 0
      ? (recent.reduce((sum, f) => sum + fn(f), 0) / recent.length).toFixed(2)
      : 'N/A';

  const lines = [
    '=== Thamnel Graphics Debug Report ===',
    `Date: ${new Date().toISOString()}`,
    '',
    '--- Renderer ---',
    `GPU Active: ${s.gpuActive}`,
    `FPS: ${s.fps}`,
    `Total Frames: ${s.totalFrames}`,
    `Sync Version: ${s.syncVersion}`,
    `Last Error: ${s.lastError ?? 'None'}`,
    '',
    '--- Last Frame ---',
    last
      ? [
          `  Frame #${last.frameNumber}`,
          `  Viewport: ${last.width}x${last.height}`,
          `  Node Count: ${last.nodeCount}`,
          `  Frame Size: ${(last.frameSizeBytes / 1024).toFixed(1)} KB`,
          `  Rust Prepare: ${last.rustPrepareMs.toFixed(2)} ms`,
          `  Rust Render: ${last.rustRenderMs.toFixed(2)} ms`,
          `  Rust Readback: ${last.rustReadbackMs.toFixed(2)} ms`,
          `  IPC Round-trip: ${last.ipcMs.toFixed(2)} ms`,
          `  Canvas Paint: ${last.paintMs.toFixed(2)} ms`,
          `  Total Frame: ${last.totalMs.toFixed(2)} ms`,
        ].join('\n')
      : '  No frames rendered yet',
    '',
    `--- Averages (last ${recent.length} frames) ---`,
    `  Rust Prepare: ${avg((f) => f.rustPrepareMs)} ms`,
    `  Rust Render: ${avg((f) => f.rustRenderMs)} ms`,
    `  Rust Readback: ${avg((f) => f.rustReadbackMs)} ms`,
    `  IPC Round-trip: ${avg((f) => f.ipcMs)} ms`,
    `  Canvas Paint: ${avg((f) => f.paintMs)} ms`,
    `  Total Frame: ${avg((f) => f.totalMs)} ms`,
    '',
    `--- Recent Logs (last 50) ---`,
    ...s.logs.slice(-50).map(
      (l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${CATEGORY_LABELS[l.category]}] ${l.message}${l.detail ? '\n  ' + l.detail : ''}`,
    ),
    '',
    '=== End Debug Report ===',
  ];

  return lines.join('\n');
}
