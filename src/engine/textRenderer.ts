import type { TextProperties, StyledRun } from '../types/TextProperties';
import type { TextTransformOption } from '../types/enums';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Apply text-transform to a string. */
function applyTransform(text: string, transform: TextTransformOption): string {
  switch (transform) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'capitalize':
      return text.replace(/\b\w/g, (c) => c.toUpperCase());
    default:
      return text;
  }
}

/** Build a CSS font string. */
function buildFont(
  family: string,
  size: number,
  weight: number,
  style: 'normal' | 'italic',
): string {
  return `${style} ${weight} ${size}px ${family}`;
}

// ---------------------------------------------------------------------------
// Word-wrap helper
// ---------------------------------------------------------------------------

interface WrappedLine {
  text: string;
  /** Character index offset within the full (transformed) text */
  startIndex: number;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
): WrappedLine[] {
  ctx.font = font;
  const lines: WrappedLine[] = [];
  const paragraphs = text.split('\n');
  let charOffset = 0;

  for (const para of paragraphs) {
    if (para === '') {
      lines.push({ text: '', startIndex: charOffset });
      charOffset += 1; // the newline character
      continue;
    }

    const words = para.split(' ');
    let currentLine = '';
    let lineStart = charOffset;

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push({ text: currentLine, startIndex: lineStart });
        currentLine = words[i];
        lineStart = charOffset + (testLine.length - words[i].length);
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push({ text: currentLine, startIndex: lineStart });
    }

    charOffset += para.length + 1; // +1 for newline
  }

  if (lines.length === 0) {
    lines.push({ text: '', startIndex: 0 });
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Resolve styled runs for a specific character range
// ---------------------------------------------------------------------------

interface ResolvedSegment {
  text: string;
  font: string;
  color: string;
  underline: boolean;
  strikethrough: boolean;
}

function resolveSegments(
  lineText: string,
  lineStartInFullText: number,
  runs: StyledRun[],
  baseFont: string,
  baseFontFamily: string,
  baseFontSize: number,
  baseFontWeight: number,
  baseFontStyle: 'normal' | 'italic',
  baseColor: string,
  baseUnderline: boolean,
  baseStrikethrough: boolean,
): ResolvedSegment[] {
  if (runs.length === 0 || lineText.length === 0) {
    return [
      {
        text: lineText,
        font: baseFont,
        color: baseColor,
        underline: baseUnderline,
        strikethrough: baseStrikethrough,
      },
    ];
  }

  // Build per-character style overrides
  const len = lineText.length;
  const charStyles: {
    weight: number;
    style: 'normal' | 'italic';
    color: string;
    underline: boolean;
    strikethrough: boolean;
  }[] = Array.from({ length: len }, () => ({
    weight: baseFontWeight,
    style: baseFontStyle,
    color: baseColor,
    underline: baseUnderline,
    strikethrough: baseStrikethrough,
  }));

  for (const run of runs) {
    const runEnd = run.startIndex + run.length;
    for (let ci = 0; ci < len; ci++) {
      const globalIdx = lineStartInFullText + ci;
      if (globalIdx >= run.startIndex && globalIdx < runEnd) {
        if (run.fontWeight !== undefined) charStyles[ci].weight = run.fontWeight;
        if (run.fontStyle !== undefined) charStyles[ci].style = run.fontStyle;
        if (run.color !== undefined) charStyles[ci].color = run.color;
        if (run.underline !== undefined) charStyles[ci].underline = run.underline;
        if (run.strikethrough !== undefined) charStyles[ci].strikethrough = run.strikethrough;
      }
    }
  }

  // Merge contiguous characters with same style into segments
  const segments: ResolvedSegment[] = [];
  let segStart = 0;
  for (let i = 1; i <= len; i++) {
    const same =
      i < len &&
      charStyles[i].weight === charStyles[segStart].weight &&
      charStyles[i].style === charStyles[segStart].style &&
      charStyles[i].color === charStyles[segStart].color &&
      charStyles[i].underline === charStyles[segStart].underline &&
      charStyles[i].strikethrough === charStyles[segStart].strikethrough;

    if (!same) {
      const s = charStyles[segStart];
      segments.push({
        text: lineText.slice(segStart, i),
        font: buildFont(baseFontFamily, baseFontSize, s.weight, s.style),
        color: s.color,
        underline: s.underline,
        strikethrough: s.strikethrough,
      });
      segStart = i;
    }
  }

  return segments;
}

// ---------------------------------------------------------------------------
// renderText – main entry point
// ---------------------------------------------------------------------------
export function renderText(
  ctx: CanvasRenderingContext2D,
  textProps: TextProperties,
  width: number,
  _height: number,
): void {
  const {
    text,
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    color,
    strokeColor,
    strokeWidth,
    letterSpacing,
    lineHeight,
    alignment,
    underline,
    strikethrough,
    hasBackground,
    backgroundColor,
    backgroundOpacity,
    backgroundPadding,
    backgroundCornerRadius,
    transform,
    fill,
    shadowOffsetX,
    shadowOffsetY,
    shadowBlur,
    shadowColor,
    runs,
  } = textProps;

  // Apply text transform
  const displayText = applyTransform(text, transform);

  // Base font
  const baseFont = buildFont(fontFamily, fontSize, fontWeight, fontStyle);
  ctx.font = baseFont;

  // Letter spacing
  if (letterSpacing !== 0) {
    (ctx as any).letterSpacing = `${letterSpacing}px`;
  }

  // Word-wrap
  const lines = wrapText(ctx, displayText, width, baseFont);
  const lineHeightPx = fontSize * lineHeight;

  // Determine alignment x-offset helper
  function alignX(lineWidth: number): number {
    switch (alignment) {
      case 'center':
        return (width - lineWidth) / 2;
      case 'right':
        return width - lineWidth;
      case 'justify':
      case 'left':
      default:
        return 0;
    }
  }

  // Shadow setup
  if (shadowBlur > 0 || shadowOffsetX !== 0 || shadowOffsetY !== 0) {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = shadowOffsetX;
    ctx.shadowOffsetY = shadowOffsetY;
  }

  // Draw each line
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const yBase = li * lineHeightPx + fontSize; // baseline y

    // Resolve styled segments
    const segments = resolveSegments(
      line.text,
      line.startIndex,
      runs,
      baseFont,
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle,
      color,
      underline,
      strikethrough,
    );

    // Measure full line width for alignment
    let fullLineWidth = 0;
    for (const seg of segments) {
      ctx.font = seg.font;
      fullLineWidth += ctx.measureText(seg.text).width;
    }

    const xStart = alignX(fullLineWidth);

    // Background box (per-line)
    if (hasBackground) {
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = prevAlpha * backgroundOpacity;
      ctx.fillStyle = backgroundColor;
      const bgX = xStart - backgroundPadding;
      const bgY = yBase - fontSize;
      const bgW = fullLineWidth + backgroundPadding * 2;
      const bgH = lineHeightPx + backgroundPadding;

      if (backgroundCornerRadius > 0) {
        const r = Math.min(backgroundCornerRadius, bgW / 2, bgH / 2);
        ctx.beginPath();
        ctx.moveTo(bgX + r, bgY);
        ctx.lineTo(bgX + bgW - r, bgY);
        ctx.arcTo(bgX + bgW, bgY, bgX + bgW, bgY + r, r);
        ctx.lineTo(bgX + bgW, bgY + bgH - r);
        ctx.arcTo(bgX + bgW, bgY + bgH, bgX + bgW - r, bgY + bgH, r);
        ctx.lineTo(bgX + r, bgY + bgH);
        ctx.arcTo(bgX, bgY + bgH, bgX, bgY + bgH - r, r);
        ctx.lineTo(bgX, bgY + r);
        ctx.arcTo(bgX, bgY, bgX + r, bgY, r);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(bgX, bgY, bgW, bgH);
      }
      ctx.globalAlpha = prevAlpha;
    }

    // Draw each segment
    let xCursor = xStart;
    for (const seg of segments) {
      ctx.font = seg.font;

      // Determine fill style from fill definition or segment color
      if (fill.type === 'solid') {
        ctx.fillStyle = seg.color;
      } else {
        // For gradient text, use the fill definition colour
        ctx.fillStyle = seg.color;
      }

      ctx.fillText(seg.text, xCursor, yBase);

      // Stroke text
      if (strokeWidth > 0) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.strokeText(seg.text, xCursor, yBase);
      }

      const segWidth = ctx.measureText(seg.text).width;

      // Underline
      if (seg.underline) {
        ctx.beginPath();
        ctx.moveTo(xCursor, yBase + 2);
        ctx.lineTo(xCursor + segWidth, yBase + 2);
        ctx.strokeStyle = seg.color;
        ctx.lineWidth = Math.max(1, fontSize / 16);
        ctx.stroke();
      }

      // Strikethrough
      if (seg.strikethrough) {
        ctx.beginPath();
        const stY = yBase - fontSize * 0.3;
        ctx.moveTo(xCursor, stY);
        ctx.lineTo(xCursor + segWidth, stY);
        ctx.strokeStyle = seg.color;
        ctx.lineWidth = Math.max(1, fontSize / 16);
        ctx.stroke();
      }

      xCursor += segWidth;
    }
  }

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Reset letter spacing
  if (letterSpacing !== 0) {
    (ctx as any).letterSpacing = '0px';
  }
}
