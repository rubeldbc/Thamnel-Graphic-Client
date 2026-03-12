import { describe, it, expect } from 'vitest';

import {
  boolToVisibility,
  inverseBoolToVisibility,
  nullToVisibility,
  stringToColor,
  layerTypeToIcon,
  timespanToString,
  toPercentage,
  filePathToName,
  groupIndent,
  progressWidth,
  equalityToVisibility,
  layerTypeToGroupVisibility,
  boolToLockIcon,
  boolToVisibilityIcon,
  boolToExpandIcon,
  boolToFrameReceiverBorder,
  boolToExtractedColor,
  activeToolToBool,
  equalityMulti,
} from '../utils/converters';

import {
  formatDimensions,
  formatFileSize,
  formatZoom,
  formatDuration,
  formatLayerCount,
  truncateText,
  clamp,
  lerp,
  hexToRgb,
  rgbToHex,
} from '../utils/formatters';

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

// ===========================================================================
// converters.ts
// ===========================================================================

// ---------------------------------------------------------------------------
// 1. boolToVisibility
// ---------------------------------------------------------------------------
describe('boolToVisibility', () => {
  it('returns "visible" for true', () => {
    expect(boolToVisibility(true)).toBe('visible');
  });

  it('returns "hidden" for false', () => {
    expect(boolToVisibility(false)).toBe('hidden');
  });
});

// ---------------------------------------------------------------------------
// 2. inverseBoolToVisibility
// ---------------------------------------------------------------------------
describe('inverseBoolToVisibility', () => {
  it('returns "hidden" for true', () => {
    expect(inverseBoolToVisibility(true)).toBe('hidden');
  });

  it('returns "visible" for false', () => {
    expect(inverseBoolToVisibility(false)).toBe('visible');
  });
});

// ---------------------------------------------------------------------------
// 3. nullToVisibility
// ---------------------------------------------------------------------------
describe('nullToVisibility', () => {
  it('returns "hidden" for null', () => {
    expect(nullToVisibility(null)).toBe('hidden');
  });

  it('returns "hidden" for undefined', () => {
    expect(nullToVisibility(undefined)).toBe('hidden');
  });

  it('returns "visible" for an object', () => {
    expect(nullToVisibility({ a: 1 })).toBe('visible');
  });

  it('returns "visible" for a non-null primitive', () => {
    expect(nullToVisibility(0)).toBe('visible');
    expect(nullToVisibility('')).toBe('visible');
    expect(nullToVisibility(false)).toBe('visible');
  });
});

// ---------------------------------------------------------------------------
// 4. layerTypeToIcon maps all 4 types
// ---------------------------------------------------------------------------
describe('layerTypeToIcon', () => {
  it('maps "image" to mdiImage', () => {
    expect(layerTypeToIcon('image')).toBe(mdiImage);
  });

  it('maps "text" to mdiFormatText', () => {
    expect(layerTypeToIcon('text')).toBe(mdiFormatText);
  });

  it('maps "shape" to mdiShapeOutline', () => {
    expect(layerTypeToIcon('shape')).toBe(mdiShapeOutline);
  });

  it('maps "group" to mdiFolderOutline', () => {
    expect(layerTypeToIcon('group')).toBe(mdiFolderOutline);
  });
});

// ---------------------------------------------------------------------------
// 5. timespanToString formats correctly
// ---------------------------------------------------------------------------
describe('timespanToString', () => {
  it('formats 0 seconds as "00:00"', () => {
    expect(timespanToString(0)).toBe('00:00');
  });

  it('formats 65 seconds as "01:05"', () => {
    expect(timespanToString(65)).toBe('01:05');
  });

  it('formats 3661 seconds as "61:01"', () => {
    expect(timespanToString(3661)).toBe('61:01');
  });

  it('handles negative values as "00:00"', () => {
    expect(timespanToString(-10)).toBe('00:00');
  });
});

// ---------------------------------------------------------------------------
// 6. toPercentage formats correctly
// ---------------------------------------------------------------------------
describe('toPercentage', () => {
  it('converts 0.75 to "75%"', () => {
    expect(toPercentage(0.75)).toBe('75%');
  });

  it('converts 1.5 to "150%"', () => {
    expect(toPercentage(1.5)).toBe('150%');
  });

  it('converts 0 to "0%"', () => {
    expect(toPercentage(0)).toBe('0%');
  });

  it('supports decimal places', () => {
    expect(toPercentage(0.3333, 1)).toBe('33.3%');
    expect(toPercentage(0.3333, 2)).toBe('33.33%');
  });
});

// ---------------------------------------------------------------------------
// 7. filePathToName extracts names correctly
// ---------------------------------------------------------------------------
describe('filePathToName', () => {
  it('extracts name from a Windows path', () => {
    expect(filePathToName('C:\\Users\\photo.png')).toBe('photo');
  });

  it('extracts name from a Unix path', () => {
    expect(filePathToName('/home/user/image.jpg')).toBe('image');
  });

  it('handles filenames without extension', () => {
    expect(filePathToName('/home/user/README')).toBe('README');
  });

  it('returns empty string for empty input', () => {
    expect(filePathToName('')).toBe('');
  });

  it('handles file with multiple dots', () => {
    expect(filePathToName('/home/user/my.file.name.txt')).toBe('my.file.name');
  });
});

// ---------------------------------------------------------------------------
// 8. groupIndent calculates correctly
// ---------------------------------------------------------------------------
describe('groupIndent', () => {
  it('returns 0 for depth 0', () => {
    expect(groupIndent(0)).toBe(0);
  });

  it('returns 28 for depth 1', () => {
    expect(groupIndent(1)).toBe(28);
  });

  it('returns 84 for depth 3', () => {
    expect(groupIndent(3)).toBe(84);
  });
});

// ---------------------------------------------------------------------------
// 9. progressWidth maps correctly
// ---------------------------------------------------------------------------
describe('progressWidth', () => {
  it('maps 0% to 0', () => {
    expect(progressWidth(0)).toBe(0);
  });

  it('maps 100% to default maxWidth (80)', () => {
    expect(progressWidth(100)).toBe(80);
  });

  it('maps 50% to 40 with default maxWidth', () => {
    expect(progressWidth(50)).toBe(40);
  });

  it('maps 50% to 100 with maxWidth 200', () => {
    expect(progressWidth(50, 200)).toBe(100);
  });

  it('clamps values above 100', () => {
    expect(progressWidth(150)).toBe(80);
  });

  it('clamps values below 0', () => {
    expect(progressWidth(-10)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 10. stringToColor validates hex
// ---------------------------------------------------------------------------
describe('stringToColor', () => {
  it('accepts valid 6-digit hex', () => {
    expect(stringToColor('#FF6600')).toBe('#FF6600');
  });

  it('accepts valid 3-digit hex', () => {
    expect(stringToColor('#F60')).toBe('#F60');
  });

  it('accepts 8-digit hex (with alpha)', () => {
    expect(stringToColor('#FF660080')).toBe('#FF660080');
  });

  it('returns "transparent" for invalid input', () => {
    expect(stringToColor('not-a-color')).toBe('transparent');
    expect(stringToColor('#GGG')).toBe('transparent');
    expect(stringToColor('')).toBe('transparent');
  });
});

// ---------------------------------------------------------------------------
// 11. equalityToVisibility
// ---------------------------------------------------------------------------
describe('equalityToVisibility', () => {
  it('returns "visible" when values are equal', () => {
    expect(equalityToVisibility('a', 'a')).toBe('visible');
  });

  it('returns "hidden" when values differ', () => {
    expect(equalityToVisibility('a', 'b')).toBe('hidden');
  });
});

// ---------------------------------------------------------------------------
// 12. layerTypeToGroupVisibility
// ---------------------------------------------------------------------------
describe('layerTypeToGroupVisibility', () => {
  it('returns "visible" for group', () => {
    expect(layerTypeToGroupVisibility('group')).toBe('visible');
  });

  it('returns "hidden" for non-group types', () => {
    expect(layerTypeToGroupVisibility('image')).toBe('hidden');
    expect(layerTypeToGroupVisibility('text')).toBe('hidden');
    expect(layerTypeToGroupVisibility('shape')).toBe('hidden');
  });
});

// ---------------------------------------------------------------------------
// 13. Icon converters
// ---------------------------------------------------------------------------
describe('boolToLockIcon', () => {
  it('returns mdiLock when locked', () => {
    expect(boolToLockIcon(true)).toBe(mdiLock);
  });

  it('returns mdiLockOpenVariant when unlocked', () => {
    expect(boolToLockIcon(false)).toBe(mdiLockOpenVariant);
  });
});

describe('boolToVisibilityIcon', () => {
  it('returns mdiEye when visible', () => {
    expect(boolToVisibilityIcon(true)).toBe(mdiEye);
  });

  it('returns mdiEyeOff when hidden', () => {
    expect(boolToVisibilityIcon(false)).toBe(mdiEyeOff);
  });
});

describe('boolToExpandIcon', () => {
  it('returns mdiChevronDown when expanded', () => {
    expect(boolToExpandIcon(true)).toBe(mdiChevronDown);
  });

  it('returns mdiChevronRight when collapsed', () => {
    expect(boolToExpandIcon(false)).toBe(mdiChevronRight);
  });
});

// ---------------------------------------------------------------------------
// 14. boolToFrameReceiverBorder / boolToExtractedColor
// ---------------------------------------------------------------------------
describe('boolToFrameReceiverBorder', () => {
  it('returns orange when receiver', () => {
    expect(boolToFrameReceiverBorder(true)).toBe('#FF6600');
  });

  it('returns transparent when not receiver', () => {
    expect(boolToFrameReceiverBorder(false)).toBe('transparent');
  });
});

describe('boolToExtractedColor', () => {
  it('returns green when extracted', () => {
    expect(boolToExtractedColor(true)).toBe('#81C784');
  });

  it('returns gray when not extracted', () => {
    expect(boolToExtractedColor(false)).toBe('#666');
  });
});

// ---------------------------------------------------------------------------
// 15. activeToolToBool / equalityMulti
// ---------------------------------------------------------------------------
describe('activeToolToBool', () => {
  it('returns true for matching tools', () => {
    expect(activeToolToBool('select', 'select')).toBe(true);
  });

  it('returns false for non-matching tools', () => {
    expect(activeToolToBool('select', 'text')).toBe(false);
  });
});

describe('equalityMulti', () => {
  it('returns true for strictly equal values', () => {
    expect(equalityMulti(42, 42)).toBe(true);
  });

  it('returns false for loosely equal but not strict values', () => {
    expect(equalityMulti(0, false)).toBe(false);
  });
});

// ===========================================================================
// formatters.ts
// ===========================================================================

// ---------------------------------------------------------------------------
// 16. formatDimensions
// ---------------------------------------------------------------------------
describe('formatDimensions', () => {
  it('formats correctly', () => {
    expect(formatDimensions(1920, 1080)).toBe('1920 x 1080');
  });

  it('handles zero dimensions', () => {
    expect(formatDimensions(0, 0)).toBe('0 x 0');
  });
});

// ---------------------------------------------------------------------------
// 17. formatFileSize handles bytes/KB/MB/GB
// ---------------------------------------------------------------------------
describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(128)).toBe('128 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(320 * 1024)).toBe('320.0 KB');
  });

  it('formats megabytes', () => {
    const mb15 = 1.5 * 1024 * 1024;
    expect(formatFileSize(mb15)).toBe('1.5 MB');
  });

  it('formats gigabytes', () => {
    const gb2 = 2 * 1024 * 1024 * 1024;
    expect(formatFileSize(gb2)).toBe('2.0 GB');
  });

  it('handles 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('handles negative bytes', () => {
    expect(formatFileSize(-100)).toBe('0 B');
  });
});

// ---------------------------------------------------------------------------
// 18. formatZoom
// ---------------------------------------------------------------------------
describe('formatZoom', () => {
  it('formats 1 as "100%"', () => {
    expect(formatZoom(1)).toBe('100%');
  });

  it('formats 0.5 as "50%"', () => {
    expect(formatZoom(0.5)).toBe('50%');
  });

  it('formats 2 as "200%"', () => {
    expect(formatZoom(2)).toBe('200%');
  });
});

// ---------------------------------------------------------------------------
// 19. formatDuration handles hours/minutes/seconds
// ---------------------------------------------------------------------------
describe('formatDuration', () => {
  it('formats seconds only (5 seconds)', () => {
    expect(formatDuration(5)).toBe('0:05');
  });

  it('formats minutes and seconds (330 = 5:30)', () => {
    expect(formatDuration(330)).toBe('5:30');
  });

  it('formats hours, minutes and seconds (5025 = 1:23:45)', () => {
    expect(formatDuration(5025)).toBe('1:23:45');
  });

  it('formats 0 seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('handles negative values gracefully', () => {
    expect(formatDuration(-10)).toBe('0:00');
  });
});

// ---------------------------------------------------------------------------
// 20. formatLayerCount handles singular/plural
// ---------------------------------------------------------------------------
describe('formatLayerCount', () => {
  it('returns singular for 1', () => {
    expect(formatLayerCount(1)).toBe('1 layer');
  });

  it('returns plural for 0', () => {
    expect(formatLayerCount(0)).toBe('0 layers');
  });

  it('returns plural for 5', () => {
    expect(formatLayerCount(5)).toBe('5 layers');
  });
});

// ---------------------------------------------------------------------------
// 21. truncateText
// ---------------------------------------------------------------------------
describe('truncateText', () => {
  it('leaves short text unchanged', () => {
    expect(truncateText('Hello', 10)).toBe('Hello');
  });

  it('truncates long text and appends "..."', () => {
    expect(truncateText('Hello World, this is long', 10)).toBe('Hello Worl...');
  });

  it('handles exact-length text without truncation', () => {
    expect(truncateText('12345', 5)).toBe('12345');
  });
});

// ---------------------------------------------------------------------------
// 22. clamp
// ---------------------------------------------------------------------------
describe('clamp', () => {
  it('clamps below min', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it('clamps above max', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it('returns value within range unchanged', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it('works at boundaries', () => {
    expect(clamp(0, 0, 100)).toBe(0);
    expect(clamp(100, 0, 100)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// 23. lerp
// ---------------------------------------------------------------------------
describe('lerp', () => {
  it('returns a when t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('returns b when t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('interpolates midpoint at t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });

  it('handles t=0.25', () => {
    expect(lerp(0, 100, 0.25)).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// 24. hexToRgb / rgbToHex roundtrip
// ---------------------------------------------------------------------------
describe('hexToRgb', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRgb('#ff8800')).toEqual({ r: 255, g: 136, b: 0 });
  });

  it('parses 3-digit hex', () => {
    expect(hexToRgb('#f80')).toEqual({ r: 255, g: 136, b: 0 });
  });

  it('returns null for invalid hex', () => {
    expect(hexToRgb('not-hex')).toBeNull();
    expect(hexToRgb('#GGGGGG')).toBeNull();
  });

  it('handles uppercase', () => {
    expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
  });
});

describe('rgbToHex', () => {
  it('converts rgb to hex', () => {
    expect(rgbToHex(255, 136, 0)).toBe('#ff8800');
  });

  it('clamps out-of-range values', () => {
    expect(rgbToHex(300, -10, 128)).toBe('#ff0080');
  });
});

describe('hexToRgb / rgbToHex roundtrip', () => {
  it('roundtrips correctly', () => {
    const hex = '#3a7f10';
    const rgb = hexToRgb(hex);
    expect(rgb).not.toBeNull();
    expect(rgbToHex(rgb!.r, rgb!.g, rgb!.b)).toBe(hex);
  });
});
