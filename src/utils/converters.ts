// Phase 21 – Value Converters & Utilities
// All converter functions used for mapping data-model values to UI representations.

import {
  mdiImage,
  mdiFormatText,
  mdiShapeOutline,
  mdiFolderOutline,
  mdiLock,
  mdiLockOpenVariant,
  mdiEye,
  mdiEyeOff,
  mdiChevronDown,
  mdiChevronRight,
} from '@mdi/js';

import type { LayerType } from '../types/enums';

// ---------------------------------------------------------------------------
// Visibility converters
// ---------------------------------------------------------------------------

/** true -> 'visible', false -> 'hidden' */
export function boolToVisibility(value: boolean): 'visible' | 'hidden' {
  return value ? 'visible' : 'hidden';
}

/** Inverse: true -> 'hidden', false -> 'visible' */
export function inverseBoolToVisibility(value: boolean): 'visible' | 'hidden' {
  return value ? 'hidden' : 'visible';
}

/** Non-null/non-undefined -> 'visible', otherwise 'hidden' */
export function nullToVisibility(value: unknown): 'visible' | 'hidden' {
  return value != null ? 'visible' : 'hidden';
}

/** value === target -> 'visible', else 'hidden' */
export function equalityToVisibility(value: unknown, target: unknown): 'visible' | 'hidden' {
  return value === target ? 'visible' : 'hidden';
}

/** 'group' -> 'visible', everything else -> 'hidden' */
export function layerTypeToGroupVisibility(type: LayerType): 'visible' | 'hidden' {
  return type === 'group' ? 'visible' : 'hidden';
}

// ---------------------------------------------------------------------------
// Color / styling converters
// ---------------------------------------------------------------------------

const HEX_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

/** Validates a hex color string and returns it if valid, otherwise 'transparent'. */
export function stringToColor(hex: string): string {
  return HEX_REGEX.test(hex) ? hex : 'transparent';
}

/** Returns '#FF6600' when isReceiver is true, 'transparent' otherwise. */
export function boolToFrameReceiverBorder(isReceiver: boolean): string {
  return isReceiver ? '#FF6600' : 'transparent';
}

/** Returns green (#81C784) when extracted, gray (#666) otherwise. */
export function boolToExtractedColor(extracted: boolean): string {
  return extracted ? '#81C784' : '#666';
}

// ---------------------------------------------------------------------------
// Image converters
// ---------------------------------------------------------------------------

/** Converts a Uint8Array to an object URL (image/png). Returns '' for null/empty. */
export function byteArrayToImageUrl(bytes: Uint8Array | null): string {
  if (!bytes || bytes.length === 0) return '';
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'image/png' });
  return URL.createObjectURL(blob);
}

/**
 * Converts a file path to a displayable URL.
 * For Tauri apps this would use the asset protocol; here we return a
 * placeholder protocol URL so consumers can swap in the real resolver.
 */
export function filePathToImageUrl(path: string): string {
  if (!path) return '';
  // Tauri asset protocol placeholder
  return `asset://localhost/${encodeURIComponent(path)}`;
}

// ---------------------------------------------------------------------------
// Icon converters
// ---------------------------------------------------------------------------

const LAYER_TYPE_ICON_MAP: Record<LayerType, string> = {
  image: mdiImage,
  text: mdiFormatText,
  shape: mdiShapeOutline,
  group: mdiFolderOutline,
};

/** Returns the MDI icon SVG path for a given LayerType. */
export function layerTypeToIcon(type: LayerType): string {
  return LAYER_TYPE_ICON_MAP[type] ?? mdiImage;
}

/** Returns mdiLock or mdiLockOpenVariant based on locked state. */
export function boolToLockIcon(locked: boolean): string {
  return locked ? mdiLock : mdiLockOpenVariant;
}

/** Returns mdiEye or mdiEyeOff based on visibility state. */
export function boolToVisibilityIcon(visible: boolean): string {
  return visible ? mdiEye : mdiEyeOff;
}

/** Returns mdiChevronDown (expanded) or mdiChevronRight (collapsed). */
export function boolToExpandIcon(expanded: boolean): string {
  return expanded ? mdiChevronDown : mdiChevronRight;
}

// ---------------------------------------------------------------------------
// Formatting / math converters
// ---------------------------------------------------------------------------

/** Converts total seconds to "mm:ss" format. */
export function timespanToString(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Converts a 0-1 (or any) ratio to a percentage string, e.g. 0.75 -> "75%". */
export function toPercentage(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Extracts the filename (without extension) from a file path. */
export function filePathToName(path: string): string {
  if (!path) return '';
  // Handle both forward-slash and backslash separators
  const name = path.split(/[\\/]/).pop() ?? '';
  const dotIndex = name.lastIndexOf('.');
  return dotIndex > 0 ? name.substring(0, dotIndex) : name;
}

/** Returns a left-margin in px for a given group depth (depth * 28). */
export function groupIndent(depth: number): number {
  return depth * 28;
}

/** Maps a 0-100 percentage to a 0-maxWidth pixel value. */
export function progressWidth(percent: number, maxWidth = 80): number {
  const clamped = Math.max(0, Math.min(100, percent));
  return (clamped / 100) * maxWidth;
}

// ---------------------------------------------------------------------------
// Equality helpers
// ---------------------------------------------------------------------------

/** Returns true when activeTool matches targetTool. */
export function activeToolToBool(activeTool: string, targetTool: string): boolean {
  return activeTool === targetTool;
}

/** Strict equality check between two values. */
export function equalityMulti(value1: unknown, value2: unknown): boolean {
  return value1 === value2;
}
