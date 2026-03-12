// ---------------------------------------------------------------------------
// useSettings – React hooks for consuming the settings store.
// ---------------------------------------------------------------------------

import { useCallback } from 'react';
import { useSettingsStore } from './settingsStore';
import type { AppSettings } from './AppSettings';

// ---------------------------------------------------------------------------
// useSettings – returns the full AppSettings object.
// ---------------------------------------------------------------------------

export function useSettings(): AppSettings {
  return useSettingsStore((s) => s.settings);
}

// ---------------------------------------------------------------------------
// useSetting – returns a [value, setter] pair for a single setting by path.
//
// Usage:
//   const [gridSize, setGridSize] = useSetting<number>('canvas.gridSize');
// ---------------------------------------------------------------------------

export function useSetting<T>(path: string): [T, (value: T) => void] {
  const value = useSettingsStore((s) => s.getSetting(path)) as T;
  const setSetting = useSettingsStore((s) => s.setSetting);

  const setter = useCallback(
    (newValue: T) => {
      setSetting(path, newValue);
    },
    [setSetting, path],
  );

  return [value, setter];
}

// ---------------------------------------------------------------------------
// useSettingsActions – returns action functions without subscribing to state.
// ---------------------------------------------------------------------------

export interface SettingsActionHooks {
  resetCategory: (category: keyof AppSettings) => void;
  resetAll: () => void;
  loadSettings: () => void;
  saveSettings: () => void;
}

export function useSettingsActions(): SettingsActionHooks {
  const resetCategory = useSettingsStore((s) => s.resetCategory);
  const resetAll = useSettingsStore((s) => s.resetAll);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);

  return { resetCategory, resetAll, loadSettings, saveSettings };
}
