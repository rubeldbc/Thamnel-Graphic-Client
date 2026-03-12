import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  DEFAULT_SETTINGS,
  createDefaultSettings,
} from '../settings/AppSettings';
import type { AppSettings } from '../settings/AppSettings';
import {
  useSettingsStore,
  MemoryStorageBackend,
  setStorageBackend,
} from '../settings/settingsStore';
import { useSettings, useSetting, useSettingsActions } from '../settings/useSettings';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const memoryStorage = new MemoryStorageBackend();

// Install memory storage backend for all tests.
setStorageBackend(memoryStorage);

function resetStore() {
  useSettingsStore.setState({
    settings: createDefaultSettings(),
    version: 1,
  });
  memoryStorage.clear();
}

// ---------------------------------------------------------------------------
// 1. DEFAULT_SETTINGS has all categories
// ---------------------------------------------------------------------------
describe('DEFAULT_SETTINGS completeness', () => {
  const expectedCategories: (keyof AppSettings)[] = [
    'windowState',
    'filePaths',
    'autoSave',
    'export',
    'canvas',
    'video',
    'ai',
    'inpainting',
    'uiPanels',
    'nudge',
    'eraser',
    'blurBrush',
    'selection',
    'handleSizes',
    'textServer',
    'renderServer',
    'undoRedo',
    'silentExport',
    'dateStamp',
    'imageStudio',
    'groupColors',
    'performance',
    'accessibility',
    'recentFiles',
    'customCanvasPresets',
  ];

  it('has all 25 categories', () => {
    for (const cat of expectedCategories) {
      expect(DEFAULT_SETTINGS).toHaveProperty(cat);
      expect(DEFAULT_SETTINGS[cat]).toBeDefined();
    }
    expect(Object.keys(DEFAULT_SETTINGS).length).toBe(expectedCategories.length);
  });

  it('has 160+ total properties', () => {
    let count = 0;
    for (const cat of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
      const sub = DEFAULT_SETTINGS[cat];
      if (typeof sub === 'object' && sub !== null) {
        count += Object.keys(sub).length;
      }
    }
    expect(count).toBeGreaterThanOrEqual(160);
  });
});

// ---------------------------------------------------------------------------
// 2. createDefaultSettings returns deep clone
// ---------------------------------------------------------------------------
describe('createDefaultSettings deep clone', () => {
  it('returns a new object each time', () => {
    const a = createDefaultSettings();
    const b = createDefaultSettings();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('modifying clone does not affect DEFAULT_SETTINGS', () => {
    const clone = createDefaultSettings();
    clone.canvas.gridSize = 999;
    expect(DEFAULT_SETTINGS.canvas.gridSize).toBe(50);
  });

  it('modifying one clone does not affect another', () => {
    const a = createDefaultSettings();
    const b = createDefaultSettings();
    a.groupColors.palette[0] = '#000000';
    expect(b.groupColors.palette[0]).toBe('#FF6B6B');
  });
});

// ---------------------------------------------------------------------------
// 3. settingsStore: getSetting returns correct defaults
// ---------------------------------------------------------------------------
describe('settingsStore getSetting', () => {
  beforeEach(resetStore);

  it('returns correct default for canvas.gridSize', () => {
    expect(useSettingsStore.getState().getSetting('canvas.gridSize')).toBe(50);
  });

  it('returns correct default for autoSave.enabled', () => {
    expect(useSettingsStore.getState().getSetting('autoSave.enabled')).toBe(true);
  });

  it('returns correct default for export.defaultFormat', () => {
    expect(useSettingsStore.getState().getSetting('export.defaultFormat')).toBe('png');
  });

  it('returns correct default for ai.inferenceDevice', () => {
    expect(useSettingsStore.getState().getSetting('ai.inferenceDevice')).toBe('gpu');
  });

  it('returns correct default for undoRedo.maxSteps', () => {
    expect(useSettingsStore.getState().getSetting('undoRedo.maxSteps')).toBe(30);
  });

  it('returns correct default for eraser.defaultMode', () => {
    expect(useSettingsStore.getState().getSetting('eraser.defaultMode')).toBe('soft');
  });
});

// ---------------------------------------------------------------------------
// 4. settingsStore: setSetting updates value
// ---------------------------------------------------------------------------
describe('settingsStore setSetting', () => {
  beforeEach(resetStore);

  it('sets a simple numeric value', () => {
    useSettingsStore.getState().setSetting('canvas.gridSize', 100);
    expect(useSettingsStore.getState().getSetting('canvas.gridSize')).toBe(100);
  });

  it('sets a string value', () => {
    useSettingsStore.getState().setSetting('export.outputNamePattern', '{name}_output');
    expect(useSettingsStore.getState().getSetting('export.outputNamePattern')).toBe('{name}_output');
  });

  it('sets a boolean value', () => {
    useSettingsStore.getState().setSetting('autoSave.enabled', false);
    expect(useSettingsStore.getState().getSetting('autoSave.enabled')).toBe(false);
  });

  it('sets a deeply nested value', () => {
    useSettingsStore.getState().setSetting('ai.bgRemovalModel', 'u2net');
    expect(useSettingsStore.getState().getSetting('ai.bgRemovalModel')).toBe('u2net');
  });
});

// ---------------------------------------------------------------------------
// 5. settingsStore: resetCategory resets only that category
// ---------------------------------------------------------------------------
describe('settingsStore resetCategory', () => {
  beforeEach(resetStore);

  it('resets only the specified category', () => {
    useSettingsStore.getState().setSetting('canvas.gridSize', 999);
    useSettingsStore.getState().setSetting('autoSave.intervalSeconds', 60);

    useSettingsStore.getState().resetCategory('canvas');

    // canvas should be reset
    expect(useSettingsStore.getState().getSetting('canvas.gridSize')).toBe(50);
    // autoSave should still be changed
    expect(useSettingsStore.getState().getSetting('autoSave.intervalSeconds')).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// 6. settingsStore: resetAll resets everything
// ---------------------------------------------------------------------------
describe('settingsStore resetAll', () => {
  beforeEach(resetStore);

  it('resets all settings to defaults', () => {
    useSettingsStore.getState().setSetting('canvas.gridSize', 999);
    useSettingsStore.getState().setSetting('autoSave.intervalSeconds', 60);
    useSettingsStore.getState().setSetting('ai.inferenceDevice', 'cpu');

    useSettingsStore.getState().resetAll();

    expect(useSettingsStore.getState().getSetting('canvas.gridSize')).toBe(50);
    expect(useSettingsStore.getState().getSetting('autoSave.intervalSeconds')).toBe(300);
    expect(useSettingsStore.getState().getSetting('ai.inferenceDevice')).toBe('gpu');
  });
});

// ---------------------------------------------------------------------------
// 7. Auto-save interval range validation (10-3600)
// ---------------------------------------------------------------------------
describe('Range validation', () => {
  beforeEach(resetStore);

  it('clamps autoSave.intervalSeconds below minimum to 10', () => {
    useSettingsStore.getState().setSetting('autoSave.intervalSeconds', 1);
    expect(useSettingsStore.getState().getSetting('autoSave.intervalSeconds')).toBe(10);
  });

  it('clamps autoSave.intervalSeconds above maximum to 3600', () => {
    useSettingsStore.getState().setSetting('autoSave.intervalSeconds', 9999);
    expect(useSettingsStore.getState().getSetting('autoSave.intervalSeconds')).toBe(3600);
  });

  it('accepts autoSave.intervalSeconds within range', () => {
    useSettingsStore.getState().setSetting('autoSave.intervalSeconds', 120);
    expect(useSettingsStore.getState().getSetting('autoSave.intervalSeconds')).toBe(120);
  });
});

// ---------------------------------------------------------------------------
// 8. Undo max steps range (5-200)
// ---------------------------------------------------------------------------
describe('UndoRedo range validation', () => {
  beforeEach(resetStore);

  it('clamps undoRedo.maxSteps below minimum to 5', () => {
    useSettingsStore.getState().setSetting('undoRedo.maxSteps', 1);
    expect(useSettingsStore.getState().getSetting('undoRedo.maxSteps')).toBe(5);
  });

  it('clamps undoRedo.maxSteps above maximum to 200', () => {
    useSettingsStore.getState().setSetting('undoRedo.maxSteps', 500);
    expect(useSettingsStore.getState().getSetting('undoRedo.maxSteps')).toBe(200);
  });

  it('accepts undoRedo.maxSteps within range', () => {
    useSettingsStore.getState().setSetting('undoRedo.maxSteps', 100);
    expect(useSettingsStore.getState().getSetting('undoRedo.maxSteps')).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// 9. GroupColors palette has 8 colors
// ---------------------------------------------------------------------------
describe('GroupColors palette', () => {
  it('has exactly 8 colors', () => {
    expect(DEFAULT_SETTINGS.groupColors.palette).toHaveLength(8);
  });

  it('all entries are hex color strings', () => {
    for (const color of DEFAULT_SETTINGS.groupColors.palette) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

// ---------------------------------------------------------------------------
// 10. All file path defaults are strings
// ---------------------------------------------------------------------------
describe('FilePaths defaults', () => {
  it('all file path defaults are strings', () => {
    const fp = DEFAULT_SETTINGS.filePaths;
    for (const key of Object.keys(fp) as (keyof typeof fp)[]) {
      expect(typeof fp[key]).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// 11. All numeric defaults are within valid ranges
// ---------------------------------------------------------------------------
describe('Numeric defaults within valid ranges', () => {
  it('autoSave.intervalSeconds default is in range 10-3600', () => {
    expect(DEFAULT_SETTINGS.autoSave.intervalSeconds).toBeGreaterThanOrEqual(10);
    expect(DEFAULT_SETTINGS.autoSave.intervalSeconds).toBeLessThanOrEqual(3600);
  });

  it('export.jpegQuality default is in range 1-100', () => {
    expect(DEFAULT_SETTINGS.export.jpegQuality).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_SETTINGS.export.jpegQuality).toBeLessThanOrEqual(100);
  });

  it('export.pngCompression default is in range 0-9', () => {
    expect(DEFAULT_SETTINGS.export.pngCompression).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_SETTINGS.export.pngCompression).toBeLessThanOrEqual(9);
  });

  it('undoRedo.maxSteps default is in range 5-200', () => {
    expect(DEFAULT_SETTINGS.undoRedo.maxSteps).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_SETTINGS.undoRedo.maxSteps).toBeLessThanOrEqual(200);
  });

  it('undoRedo.diskLimitGB default is in range 1-100', () => {
    expect(DEFAULT_SETTINGS.undoRedo.diskLimitGB).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_SETTINGS.undoRedo.diskLimitGB).toBeLessThanOrEqual(100);
  });

  it('canvas.defaultWidth is positive', () => {
    expect(DEFAULT_SETTINGS.canvas.defaultWidth).toBeGreaterThan(0);
  });

  it('canvas.defaultHeight is positive', () => {
    expect(DEFAULT_SETTINGS.canvas.defaultHeight).toBeGreaterThan(0);
  });

  it('nudge values are positive and ordered', () => {
    const { small, medium, large, extraLarge } = DEFAULT_SETTINGS.nudge;
    expect(small).toBeGreaterThan(0);
    expect(medium).toBeGreaterThan(small);
    expect(large).toBeGreaterThan(medium);
    expect(extraLarge).toBeGreaterThan(large);
  });
});

// ---------------------------------------------------------------------------
// 12. Settings version exists
// ---------------------------------------------------------------------------
describe('Settings version', () => {
  it('store has a version number', () => {
    expect(useSettingsStore.getState().version).toBeDefined();
    expect(typeof useSettingsStore.getState().version).toBe('number');
    expect(useSettingsStore.getState().version).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 13. useSetting hook returns value and setter
// ---------------------------------------------------------------------------
describe('useSetting hook', () => {
  beforeEach(resetStore);

  it('returns current value and a setter function', () => {
    const { result } = renderHook(() => useSetting<number>('canvas.gridSize'));

    const [value, setter] = result.current;
    expect(value).toBe(50);
    expect(typeof setter).toBe('function');
  });

  it('setter updates the value in the store', () => {
    const { result } = renderHook(() => useSetting<number>('canvas.gridSize'));

    act(() => {
      result.current[1](200);
    });

    expect(useSettingsStore.getState().getSetting('canvas.gridSize')).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 14. Persistence: saveSettings / loadSettings roundtrip
// ---------------------------------------------------------------------------
describe('Persistence roundtrip', () => {
  beforeEach(resetStore);

  it('saveSettings then loadSettings restores values', () => {
    // Modify some settings.
    useSettingsStore.getState().setSetting('canvas.gridSize', 77);
    useSettingsStore.getState().setSetting('ai.inferenceDevice', 'cpu');
    useSettingsStore.getState().setSetting('export.jpegQuality', 42);

    // Save to storage.
    useSettingsStore.getState().saveSettings();

    // Reset to defaults.
    useSettingsStore.getState().resetAll();
    expect(useSettingsStore.getState().getSetting('canvas.gridSize')).toBe(50);

    // Load from storage.
    useSettingsStore.getState().loadSettings();

    expect(useSettingsStore.getState().getSetting('canvas.gridSize')).toBe(77);
    expect(useSettingsStore.getState().getSetting('ai.inferenceDevice')).toBe('cpu');
    expect(useSettingsStore.getState().getSetting('export.jpegQuality')).toBe(42);
  });

  it('loadSettings with empty storage keeps defaults', () => {
    memoryStorage.clear();
    useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().getSetting('canvas.gridSize')).toBe(50);
  });

  it('loadSettings with corrupted data keeps defaults', () => {
    memoryStorage.setItem('thamnel-app-settings', 'not json!!!');
    useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().getSetting('canvas.gridSize')).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// 15. useSettings hook
// ---------------------------------------------------------------------------
describe('useSettings hook', () => {
  beforeEach(resetStore);

  it('returns the full settings object', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.canvas.gridSize).toBe(50);
    expect(result.current.autoSave.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 16. useSettingsActions hook
// ---------------------------------------------------------------------------
describe('useSettingsActions hook', () => {
  beforeEach(resetStore);

  it('returns action functions', () => {
    const { result } = renderHook(() => useSettingsActions());
    expect(typeof result.current.resetCategory).toBe('function');
    expect(typeof result.current.resetAll).toBe('function');
    expect(typeof result.current.loadSettings).toBe('function');
    expect(typeof result.current.saveSettings).toBe('function');
  });

  it('resetAll via hook works', () => {
    useSettingsStore.getState().setSetting('canvas.gridSize', 999);

    const { result } = renderHook(() => useSettingsActions());
    act(() => {
      result.current.resetAll();
    });

    expect(useSettingsStore.getState().getSetting('canvas.gridSize')).toBe(50);
  });
});
