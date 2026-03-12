import { describe, it, expect } from 'vitest';
import {
  ALL_PRESETS,
  SOCIAL_PRESETS,
  PAPER_PRESETS,
  DISPLAY_PRESETS,
  PRESET_CATEGORIES,
  getPresetsByCategory,
  findPreset,
  getPresetLabel,
  getGroupedPresets,
} from '../data/canvasPresets';
import type { CanvasPreset } from '../data/canvasPresets';

// ---------------------------------------------------------------------------
// 1. ALL_PRESETS has 35 total presets
// ---------------------------------------------------------------------------
describe('ALL_PRESETS', () => {
  it('has 35 total presets', () => {
    expect(ALL_PRESETS).toHaveLength(35);
  });
});

// ---------------------------------------------------------------------------
// 2. SOCIAL_PRESETS has 20
// ---------------------------------------------------------------------------
describe('SOCIAL_PRESETS', () => {
  it('has 20 social media presets', () => {
    expect(SOCIAL_PRESETS).toHaveLength(20);
  });

  it('all entries have category "social"', () => {
    for (const p of SOCIAL_PRESETS) {
      expect(p.category).toBe('social');
    }
  });
});

// ---------------------------------------------------------------------------
// 3. PAPER_PRESETS has 9
// ---------------------------------------------------------------------------
describe('PAPER_PRESETS', () => {
  it('has 9 paper presets', () => {
    expect(PAPER_PRESETS).toHaveLength(9);
  });

  it('all entries have category "paper"', () => {
    for (const p of PAPER_PRESETS) {
      expect(p.category).toBe('paper');
    }
  });
});

// ---------------------------------------------------------------------------
// 4. DISPLAY_PRESETS has 6
// ---------------------------------------------------------------------------
describe('DISPLAY_PRESETS', () => {
  it('has 6 display presets', () => {
    expect(DISPLAY_PRESETS).toHaveLength(6);
  });

  it('all entries have category "display"', () => {
    for (const p of DISPLAY_PRESETS) {
      expect(p.category).toBe('display');
    }
  });
});

// ---------------------------------------------------------------------------
// 5. getPresetsByCategory returns correct counts
// ---------------------------------------------------------------------------
describe('getPresetsByCategory', () => {
  it('returns 20 social presets', () => {
    expect(getPresetsByCategory('social')).toHaveLength(20);
  });

  it('returns 9 paper presets', () => {
    expect(getPresetsByCategory('paper')).toHaveLength(9);
  });

  it('returns 6 display presets', () => {
    expect(getPresetsByCategory('display')).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// 6. findPreset finds existing preset
// ---------------------------------------------------------------------------
describe('findPreset', () => {
  it('finds YouTube Thumbnail by 1280x720', () => {
    const result = findPreset(1280, 720);
    expect(result).toBeDefined();
    expect(result!.name).toBe('YouTube Thumbnail');
  });

  it('finds A4 by 2480x3508', () => {
    const result = findPreset(2480, 3508);
    expect(result).toBeDefined();
    expect(result!.name).toBe('A4');
  });

  it('finds Full HD (1080p) by 1920x1080', () => {
    const result = findPreset(1920, 1080);
    expect(result).toBeDefined();
    // First match is Facebook Event (social) since it appears first
    expect(result!.width).toBe(1920);
    expect(result!.height).toBe(1080);
  });

  // ---------------------------------------------------------------------------
  // 7. findPreset returns undefined for non-matching
  // ---------------------------------------------------------------------------
  it('returns undefined for non-matching dimensions', () => {
    const result = findPreset(9999, 9999);
    expect(result).toBeUndefined();
  });

  it('returns undefined when width matches but height does not', () => {
    const result = findPreset(1280, 999);
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 8. getPresetLabel formats correctly
// ---------------------------------------------------------------------------
describe('getPresetLabel', () => {
  it('formats "YouTube Thumbnail (1280 x 720)"', () => {
    const preset: CanvasPreset = {
      name: 'YouTube Thumbnail',
      width: 1280,
      height: 720,
      category: 'social',
    };
    expect(getPresetLabel(preset)).toBe('YouTube Thumbnail (1280 x 720)');
  });

  it('formats "A4 (2480 x 3508)"', () => {
    const preset: CanvasPreset = {
      name: 'A4',
      width: 2480,
      height: 3508,
      category: 'paper',
    };
    expect(getPresetLabel(preset)).toBe('A4 (2480 x 3508)');
  });

  it('formats "Full HD (1080p) (1920 x 1080)"', () => {
    const preset: CanvasPreset = {
      name: 'Full HD (1080p)',
      width: 1920,
      height: 1080,
      category: 'display',
    };
    expect(getPresetLabel(preset)).toBe('Full HD (1080p) (1920 x 1080)');
  });
});

// ---------------------------------------------------------------------------
// 9. getGroupedPresets has 3 categories
// ---------------------------------------------------------------------------
describe('getGroupedPresets', () => {
  it('has exactly 3 category keys', () => {
    const grouped = getGroupedPresets();
    expect(Object.keys(grouped)).toHaveLength(3);
  });

  it('contains "social", "paper", and "display" keys', () => {
    const grouped = getGroupedPresets();
    expect(grouped).toHaveProperty('social');
    expect(grouped).toHaveProperty('paper');
    expect(grouped).toHaveProperty('display');
  });

  it('grouped counts match filtered arrays', () => {
    const grouped = getGroupedPresets();
    expect(grouped['social']).toHaveLength(20);
    expect(grouped['paper']).toHaveLength(9);
    expect(grouped['display']).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// 10. All presets have positive width and height
// ---------------------------------------------------------------------------
describe('All presets have positive dimensions', () => {
  it('every preset has width > 0', () => {
    for (const p of ALL_PRESETS) {
      expect(p.width).toBeGreaterThan(0);
    }
  });

  it('every preset has height > 0', () => {
    for (const p of ALL_PRESETS) {
      expect(p.height).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 11. All preset names are unique
// ---------------------------------------------------------------------------
describe('All preset names are unique', () => {
  it('no duplicate names across ALL_PRESETS', () => {
    const names = ALL_PRESETS.map((p) => p.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});

// ---------------------------------------------------------------------------
// 12. PRESET_CATEGORIES
// ---------------------------------------------------------------------------
describe('PRESET_CATEGORIES', () => {
  it('has 3 entries', () => {
    expect(PRESET_CATEGORIES).toHaveLength(3);
  });

  it('contains the expected category values', () => {
    const values = PRESET_CATEGORIES.map((c) => c.value);
    expect(values).toContain('social');
    expect(values).toContain('paper');
    expect(values).toContain('display');
  });

  it('each entry has a non-empty label', () => {
    for (const c of PRESET_CATEGORIES) {
      expect(c.label.length).toBeGreaterThan(0);
    }
  });
});
