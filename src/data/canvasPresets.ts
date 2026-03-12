// ---------------------------------------------------------------------------
// Canvas Presets Data
// All canvas size presets organized by category.
// ---------------------------------------------------------------------------

export type CanvasPresetCategory = 'social' | 'paper' | 'display';

export interface CanvasPreset {
  name: string;
  width: number;
  height: number;
  category: CanvasPresetCategory;
}

// ---------------------------------------------------------------------------
// Social Media presets (20)
// ---------------------------------------------------------------------------
const socialPresets: CanvasPreset[] = [
  { name: 'YouTube Thumbnail', width: 1280, height: 720, category: 'social' },
  { name: 'YouTube Channel Art', width: 2560, height: 1440, category: 'social' },
  { name: 'Facebook Post', width: 1200, height: 630, category: 'social' },
  { name: 'Facebook Cover', width: 820, height: 312, category: 'social' },
  { name: 'Facebook Story', width: 1080, height: 1920, category: 'social' },
  { name: 'Facebook Event', width: 1920, height: 1080, category: 'social' },
  { name: 'TikTok Video', width: 1080, height: 1920, category: 'social' },
  { name: 'TikTok Profile', width: 200, height: 200, category: 'social' },
  { name: 'Instagram Post', width: 1080, height: 1080, category: 'social' },
  { name: 'Instagram Story', width: 1080, height: 1920, category: 'social' },
  { name: 'Instagram Reel', width: 1080, height: 1920, category: 'social' },
  { name: 'Instagram Profile', width: 320, height: 320, category: 'social' },
  { name: 'X/Twitter Post', width: 1200, height: 675, category: 'social' },
  { name: 'X/Twitter Header', width: 1500, height: 500, category: 'social' },
  { name: 'LinkedIn Post', width: 1200, height: 627, category: 'social' },
  { name: 'LinkedIn Cover', width: 1584, height: 396, category: 'social' },
  { name: 'Twitch Banner', width: 1200, height: 480, category: 'social' },
  { name: 'Twitch Offline', width: 1920, height: 1080, category: 'social' },
  { name: 'Pinterest Pin', width: 1000, height: 1500, category: 'social' },
  { name: 'Discord Server Icon', width: 512, height: 512, category: 'social' },
];

// ---------------------------------------------------------------------------
// Paper presets at 300 DPI (9)
// ---------------------------------------------------------------------------
const paperPresets: CanvasPreset[] = [
  { name: 'A0', width: 9933, height: 14043, category: 'paper' },
  { name: 'A1', width: 7016, height: 9933, category: 'paper' },
  { name: 'A2', width: 4961, height: 7016, category: 'paper' },
  { name: 'A3', width: 3508, height: 4961, category: 'paper' },
  { name: 'A4', width: 2480, height: 3508, category: 'paper' },
  { name: 'A5', width: 1748, height: 2480, category: 'paper' },
  { name: 'US Letter', width: 2550, height: 3300, category: 'paper' },
  { name: 'US Legal', width: 2550, height: 4200, category: 'paper' },
  { name: 'Tabloid', width: 3300, height: 5100, category: 'paper' },
];

// ---------------------------------------------------------------------------
// Display & Video presets (6)
// ---------------------------------------------------------------------------
const displayPresets: CanvasPreset[] = [
  { name: 'VGA', width: 640, height: 480, category: 'display' },
  { name: 'HD (720p)', width: 1280, height: 720, category: 'display' },
  { name: 'Full HD (1080p)', width: 1920, height: 1080, category: 'display' },
  { name: '2K (1440p)', width: 2560, height: 1440, category: 'display' },
  { name: '4K (2160p)', width: 3840, height: 2160, category: 'display' },
  { name: '8K (4320p)', width: 7680, height: 4320, category: 'display' },
];

// ---------------------------------------------------------------------------
// Exported arrays
// ---------------------------------------------------------------------------

/** Flat array of all 35 presets. */
export const ALL_PRESETS: readonly CanvasPreset[] = [
  ...socialPresets,
  ...paperPresets,
  ...displayPresets,
];

/** Social-media presets only. */
export const SOCIAL_PRESETS: readonly CanvasPreset[] = ALL_PRESETS.filter(
  (p) => p.category === 'social',
);

/** Paper presets only. */
export const PAPER_PRESETS: readonly CanvasPreset[] = ALL_PRESETS.filter(
  (p) => p.category === 'paper',
);

/** Display & video presets only. */
export const DISPLAY_PRESETS: readonly CanvasPreset[] = ALL_PRESETS.filter(
  (p) => p.category === 'display',
);

/** Category descriptors for UI dropdowns / tabs. */
export const PRESET_CATEGORIES: readonly { value: CanvasPresetCategory; label: string }[] = [
  { value: 'social', label: 'Social Media' },
  { value: 'paper', label: 'Paper' },
  { value: 'display', label: 'Display & Video' },
];

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Return all presets that belong to a given category. */
export function getPresetsByCategory(category: CanvasPresetCategory): CanvasPreset[] {
  return ALL_PRESETS.filter((p) => p.category === category);
}

/** Find a preset whose width and height match exactly, or `undefined`. */
export function findPreset(width: number, height: number): CanvasPreset | undefined {
  return ALL_PRESETS.find((p) => p.width === width && p.height === height);
}

/** Format a human-readable label, e.g. "YouTube Thumbnail (1280 x 720)". */
export function getPresetLabel(preset: CanvasPreset): string {
  return `${preset.name} (${preset.width} x ${preset.height})`;
}

/** Group all presets by category key. */
export function getGroupedPresets(): Record<string, CanvasPreset[]> {
  const grouped: Record<string, CanvasPreset[]> = {};
  for (const preset of ALL_PRESETS) {
    if (!grouped[preset.category]) {
      grouped[preset.category] = [];
    }
    grouped[preset.category].push(preset);
  }
  return grouped;
}
