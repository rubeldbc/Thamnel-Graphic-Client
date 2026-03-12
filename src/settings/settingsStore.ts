// ---------------------------------------------------------------------------
// settingsStore – Zustand store for application settings with persistence,
// dot-path access, range validation, and auto-save via debounce.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type { AppSettings } from './AppSettings';
import { createDefaultSettings } from './AppSettings';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'thamnel-app-settings';
const SETTINGS_VERSION = 1;
const DEBOUNCE_MS = 500;

// ---------------------------------------------------------------------------
// Storage abstraction – safe wrapper around localStorage that gracefully
// handles environments where the Storage API is absent or incomplete.
// ---------------------------------------------------------------------------

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Default storage backend using localStorage when available. */
class LocalStorageBackend implements StorageBackend {
  getItem(key: string): string | null {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        return localStorage.getItem(key);
      }
    } catch { /* ignore */ }
    return null;
  }

  setItem(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(key, value);
      }
    } catch { /* ignore */ }
  }

  removeItem(key: string): void {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
        localStorage.removeItem(key);
      }
    } catch { /* ignore */ }
  }
}

/** In-memory storage backend for testing or environments without localStorage. */
export class MemoryStorageBackend implements StorageBackend {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

let storageBackend: StorageBackend = new LocalStorageBackend();

/** Replace the storage backend (useful for testing). */
export function setStorageBackend(backend: StorageBackend): void {
  storageBackend = backend;
}

// ---------------------------------------------------------------------------
// Range constraints for numeric settings that have documented limits.
// ---------------------------------------------------------------------------

interface RangeConstraint {
  min: number;
  max: number;
}

const RANGE_CONSTRAINTS: Record<string, RangeConstraint> = {
  'autoSave.intervalSeconds': { min: 10, max: 3600 },
  'undoRedo.maxSteps': { min: 5, max: 200 },
  'undoRedo.diskLimitGB': { min: 1, max: 100 },
  'export.jpegQuality': { min: 1, max: 100 },
  'export.pngCompression': { min: 0, max: 9 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get a nested value from an object by dot-separated path. */
function getByPath(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Set a nested value in an object by dot-separated path. Returns a shallow-cloned tree. */
function setByPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.');
  if (keys.length === 0) return obj;

  // Deep-clone the path so we return a new reference at every level.
  const root = { ...obj } as Record<string, unknown>;
  let current: Record<string, unknown> = root;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    current[key] = { ...(current[key] as Record<string, unknown>) };
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];

  // Apply range clamping if applicable.
  let finalValue = value;
  const constraint = RANGE_CONSTRAINTS[path];
  if (constraint && typeof value === 'number') {
    finalValue = Math.max(constraint.min, Math.min(constraint.max, value));
  }

  current[lastKey] = finalValue;
  return root as T;
}

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------

export interface SettingsState {
  settings: AppSettings;
  version: number;
}

export interface SettingsActions {
  getSetting: (path: string) => unknown;
  setSetting: (path: string, value: unknown) => void;
  resetCategory: (category: keyof AppSettings) => void;
  resetAll: () => void;
  loadSettings: () => void;
  saveSettings: () => void;
}

export type SettingsStore = SettingsState & SettingsActions;

// ---------------------------------------------------------------------------
// Debounce timer (module-level so it persists across calls)
// ---------------------------------------------------------------------------

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(store: SettingsStore) {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    store.saveSettings();
    debounceTimer = null;
  }, DEBOUNCE_MS);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: createDefaultSettings(),
  version: SETTINGS_VERSION,

  // ---- getSetting ---------------------------------------------------------
  getSetting: (path: string): unknown => {
    return getByPath(get().settings, path);
  },

  // ---- setSetting ---------------------------------------------------------
  setSetting: (path: string, value: unknown): void => {
    set((state) => {
      const newSettings = setByPath(state.settings, path, value);
      return { settings: newSettings };
    });
    // Schedule debounced persist.
    debouncedSave(get());
  },

  // ---- resetCategory ------------------------------------------------------
  resetCategory: (category: keyof AppSettings): void => {
    const defaults = createDefaultSettings();
    set((state) => ({
      settings: {
        ...state.settings,
        [category]: defaults[category],
      },
    }));
    debouncedSave(get());
  },

  // ---- resetAll -----------------------------------------------------------
  resetAll: (): void => {
    set({ settings: createDefaultSettings(), version: SETTINGS_VERSION });
    debouncedSave(get());
  },

  // ---- loadSettings -------------------------------------------------------
  loadSettings: (): void => {
    try {
      const raw = storageBackend.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        version?: number;
        settings?: Partial<AppSettings>;
      };

      // Start from defaults and merge saved values on top so that newly added
      // properties always have a sane value.
      const defaults = createDefaultSettings();
      const merged = deepMerge(
        defaults as unknown as Record<string, unknown>,
        ((parsed.settings ?? {}) as unknown) as Record<string, unknown>,
      );

      set({
        settings: merged as unknown as AppSettings,
        version: parsed.version ?? SETTINGS_VERSION,
      });
    } catch {
      // Corrupted data – silently fall back to defaults.
    }
  },

  // ---- saveSettings -------------------------------------------------------
  saveSettings: (): void => {
    try {
      const { settings, version } = get();
      const payload = JSON.stringify({ version, settings });
      storageBackend.setItem(STORAGE_KEY, payload);
    } catch {
      // Storage full or unavailable – ignore silently.
    }
  },
}));

// ---------------------------------------------------------------------------
// Deep merge helper – merges `source` into `target`, returning a new object.
// Only merges plain objects; arrays and primitives are taken from source.
// ---------------------------------------------------------------------------

function deepMerge<T extends Record<string, unknown>>(target: T, source: T): T {
  const result = { ...target } as Record<string, unknown>;

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (
      sourceVal != null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal != null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else {
      result[key] = sourceVal;
    }
  }

  return result as T;
}
