import type { ShapeType } from '../types/enums';
import type { ShapeProperties } from '../types/ShapeProperties';
import type { FillDefinition } from '../types/FillDefinition';

// ---------------------------------------------------------------------------
// Helper: draw a regular polygon centred in the bounding box
// ---------------------------------------------------------------------------
function regularPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  startAngle: number = -Math.PI / 2,
): void {
  for (let i = 0; i <= sides; i++) {
    const angle = startAngle + (i * 2 * Math.PI) / sides;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

// ---------------------------------------------------------------------------
// Helper: star polygon (alternating inner/outer vertices)
// ---------------------------------------------------------------------------
function starPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points: number,
): void {
  const step = Math.PI / points;
  let angle = -Math.PI / 2;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    angle += step;
  }
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// renderShapePath – builds ctx path for each of the 27 shape types
// ---------------------------------------------------------------------------
export function renderShapePath(
  ctx: CanvasRenderingContext2D,
  shapeType: ShapeType,
  width: number,
  height: number,
  polygonSides?: number,
  starInnerRatio?: number,
): void {
  const w = width;
  const h = height;
  const cx = w / 2;
  const cy = h / 2;

  ctx.beginPath();

  switch (shapeType) {
    // ---- Lines -----------------------------------------------------------
    case 'line':
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      break;

    case 'diagonalLine':
      ctx.moveTo(0, 0);
      ctx.lineTo(w, h);
      break;

    // ---- Basic -----------------------------------------------------------
    case 'rectangle':
      ctx.rect(0, 0, w, h);
      break;

    case 'roundedRectangle': {
      const r = Math.min(w, h) * 0.15;
      ctx.moveTo(r, 0);
      ctx.lineTo(w - r, 0);
      ctx.arcTo(w, 0, w, r, r);
      ctx.lineTo(w, h - r);
      ctx.arcTo(w, h, w - r, h, r);
      ctx.lineTo(r, h);
      ctx.arcTo(0, h, 0, h - r, r);
      ctx.lineTo(0, r);
      ctx.arcTo(0, 0, r, 0, r);
      ctx.closePath();
      break;
    }

    case 'snip': {
      const s = Math.min(w, h) * 0.15;
      ctx.moveTo(s, 0);
      ctx.lineTo(w - s, 0);
      ctx.lineTo(w, s);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.lineTo(0, s);
      ctx.closePath();
      break;
    }

    case 'ellipse':
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;

    case 'triangle':
      ctx.moveTo(cx, 0);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      break;

    case 'rightTriangle':
      ctx.moveTo(0, 0);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      break;

    case 'diamond':
      ctx.moveTo(cx, 0);
      ctx.lineTo(w, cy);
      ctx.lineTo(cx, h);
      ctx.lineTo(0, cy);
      ctx.closePath();
      break;

    case 'parallelogram': {
      const off = w * 0.2;
      ctx.moveTo(off, 0);
      ctx.lineTo(w, 0);
      ctx.lineTo(w - off, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      break;
    }

    case 'trapezoid': {
      const inset = w * 0.2;
      ctx.moveTo(inset, 0);
      ctx.lineTo(w - inset, 0);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      break;
    }

    // ---- Polygons --------------------------------------------------------
    case 'pentagon':
      regularPolygon(ctx, cx, cy, Math.min(cx, cy), 5);
      ctx.closePath();
      break;

    case 'hexagon':
      regularPolygon(ctx, cx, cy, Math.min(cx, cy), 6);
      ctx.closePath();
      break;

    case 'octagon':
      regularPolygon(ctx, cx, cy, Math.min(cx, cy), 8);
      ctx.closePath();
      break;

    // ---- Symbols ---------------------------------------------------------
    case 'cross': {
      const armW = w / 3;
      const armH = h / 3;
      ctx.moveTo(armW, 0);
      ctx.lineTo(2 * armW, 0);
      ctx.lineTo(2 * armW, armH);
      ctx.lineTo(w, armH);
      ctx.lineTo(w, 2 * armH);
      ctx.lineTo(2 * armW, 2 * armH);
      ctx.lineTo(2 * armW, h);
      ctx.lineTo(armW, h);
      ctx.lineTo(armW, 2 * armH);
      ctx.lineTo(0, 2 * armH);
      ctx.lineTo(0, armH);
      ctx.lineTo(armW, armH);
      ctx.closePath();
      break;
    }

    case 'heart': {
      // Heart shape approximated with bezier curves
      ctx.moveTo(cx, h * 0.3);
      ctx.bezierCurveTo(cx, 0, 0, 0, 0, h * 0.35);
      ctx.bezierCurveTo(0, h * 0.65, cx, h * 0.8, cx, h);
      ctx.bezierCurveTo(cx, h * 0.8, w, h * 0.65, w, h * 0.35);
      ctx.bezierCurveTo(w, 0, cx, 0, cx, h * 0.3);
      ctx.closePath();
      break;
    }

    case 'star': {
      const outerR = Math.min(cx, cy);
      const ratio = starInnerRatio ?? 0.4;
      const pts = polygonSides ?? 5;
      starPolygon(ctx, cx, cy, outerR, outerR * ratio, pts);
      break;
    }

    case 'star6':
      starPolygon(ctx, cx, cy, Math.min(cx, cy), Math.min(cx, cy) * 0.5, 6);
      break;

    case 'ring': {
      const outerR = Math.min(cx, cy);
      const innerR = outerR * 0.6;
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.moveTo(cx + innerR, cy);
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
      ctx.closePath();
      break;
    }

    // ---- Arrows ----------------------------------------------------------
    case 'arrow': {
      const shaftH = h * 0.35;
      const headStart = w * 0.55;
      ctx.moveTo(0, cy - shaftH / 2);
      ctx.lineTo(headStart, cy - shaftH / 2);
      ctx.lineTo(headStart, 0);
      ctx.lineTo(w, cy);
      ctx.lineTo(headStart, h);
      ctx.lineTo(headStart, cy + shaftH / 2);
      ctx.lineTo(0, cy + shaftH / 2);
      ctx.closePath();
      break;
    }

    case 'arrowLeft': {
      const shaftH = h * 0.35;
      const headEnd = w * 0.45;
      ctx.moveTo(w, cy - shaftH / 2);
      ctx.lineTo(headEnd, cy - shaftH / 2);
      ctx.lineTo(headEnd, 0);
      ctx.lineTo(0, cy);
      ctx.lineTo(headEnd, h);
      ctx.lineTo(headEnd, cy + shaftH / 2);
      ctx.lineTo(w, cy + shaftH / 2);
      ctx.closePath();
      break;
    }

    case 'arrowUp': {
      const shaftW = w * 0.35;
      const headEnd = h * 0.45;
      ctx.moveTo(cx - shaftW / 2, h);
      ctx.lineTo(cx - shaftW / 2, headEnd);
      ctx.lineTo(0, headEnd);
      ctx.lineTo(cx, 0);
      ctx.lineTo(w, headEnd);
      ctx.lineTo(cx + shaftW / 2, headEnd);
      ctx.lineTo(cx + shaftW / 2, h);
      ctx.closePath();
      break;
    }

    case 'arrowDown': {
      const shaftW = w * 0.35;
      const headStart = h * 0.55;
      ctx.moveTo(cx - shaftW / 2, 0);
      ctx.lineTo(cx - shaftW / 2, headStart);
      ctx.lineTo(0, headStart);
      ctx.lineTo(cx, h);
      ctx.lineTo(w, headStart);
      ctx.lineTo(cx + shaftW / 2, headStart);
      ctx.lineTo(cx + shaftW / 2, 0);
      ctx.closePath();
      break;
    }

    case 'doubleArrow': {
      const shaftH = h * 0.35;
      const leftHead = w * 0.25;
      const rightHead = w * 0.75;
      ctx.moveTo(0, cy);
      ctx.lineTo(leftHead, 0);
      ctx.lineTo(leftHead, cy - shaftH / 2);
      ctx.lineTo(rightHead, cy - shaftH / 2);
      ctx.lineTo(rightHead, 0);
      ctx.lineTo(w, cy);
      ctx.lineTo(rightHead, h);
      ctx.lineTo(rightHead, cy + shaftH / 2);
      ctx.lineTo(leftHead, cy + shaftH / 2);
      ctx.lineTo(leftHead, h);
      ctx.closePath();
      break;
    }

    case 'chevronRight': {
      const thickness = w * 0.35;
      ctx.moveTo(0, 0);
      ctx.lineTo(w - thickness, cy);
      ctx.lineTo(0, h);
      ctx.lineTo(thickness, h);
      ctx.lineTo(w, cy);
      ctx.lineTo(thickness, 0);
      ctx.closePath();
      break;
    }

    case 'chevronLeft': {
      const thickness = w * 0.35;
      ctx.moveTo(w, 0);
      ctx.lineTo(thickness, cy);
      ctx.lineTo(w, h);
      ctx.lineTo(w - thickness, h);
      ctx.lineTo(0, cy);
      ctx.lineTo(w - thickness, 0);
      ctx.closePath();
      break;
    }

    // ---- Dynamic polygon (N sides via polygonSides) ----------------------
    case 'polygon': {
      const sides = Math.max(3, polygonSides ?? 4);
      const r = Math.min(cx, cy);
      regularPolygon(ctx, cx, cy, r, sides);
      ctx.closePath();
      break;
    }

    // ---- Custom (use points array, handled externally) -------------------
    case 'custom':
      // For custom shapes the caller should provide explicit path data.
      // Draw a placeholder rectangle.
      ctx.rect(0, 0, w, h);
      break;

    default: {
      // Exhaustive fallback – draw a rectangle
      ctx.rect(0, 0, w, h);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// applyFill – apply a FillDefinition as the ctx fill style
// ---------------------------------------------------------------------------
function applyFillStyle(
  ctx: CanvasRenderingContext2D,
  fill: FillDefinition,
  width: number,
  height: number,
): void {
  switch (fill.type) {
    case 'linearGradient': {
      const angleRad = (fill.gradientAngle * Math.PI) / 180;
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      const half = Math.max(width, height) / 2;
      const cx = width / 2;
      const cy = height / 2;
      const grad = ctx.createLinearGradient(
        cx - cos * half,
        cy - sin * half,
        cx + cos * half,
        cy + sin * half,
      );
      for (const stop of fill.gradientStops) {
        grad.addColorStop(stop.position, stop.color);
      }
      ctx.fillStyle = grad;
      break;
    }
    case 'radialGradient': {
      const gcx = fill.gradientCenterX * width;
      const gcy = fill.gradientCenterY * height;
      const gr = fill.gradientRadius * Math.max(width, height);
      const grad = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, gr);
      for (const stop of fill.gradientStops) {
        grad.addColorStop(stop.position, stop.color);
      }
      ctx.fillStyle = grad;
      break;
    }
    case 'sweepGradient': {
      // Canvas 2D does not natively support conic/sweep gradients.
      // Fall back to the first stop colour.
      ctx.fillStyle = fill.gradientStops.length > 0 ? fill.gradientStops[0].color : fill.solidColor;
      break;
    }
    case 'solid':
    default:
      ctx.fillStyle = fill.solidColor;
      break;
  }
  ctx.globalAlpha *= fill.globalAlpha;
}

// ---------------------------------------------------------------------------
// fillShape – fill & stroke the current shape path
// ---------------------------------------------------------------------------
export function fillShape(
  ctx: CanvasRenderingContext2D,
  shapeProps: ShapeProperties,
  width: number,
  height: number,
): void {
  const prevAlpha = ctx.globalAlpha;

  // Draw the path
  renderShapePath(ctx, shapeProps.shapeType, width, height, shapeProps.polygonSides, shapeProps.starInnerRatio);

  // Fill
  if (shapeProps.fill) {
    applyFillStyle(ctx, shapeProps.fill, width, height);
  } else {
    ctx.fillStyle = shapeProps.fillColor;
  }
  ctx.globalAlpha = prevAlpha * shapeProps.opacity;

  // Lines don't get filled
  if (shapeProps.shapeType !== 'line' && shapeProps.shapeType !== 'diagonalLine') {
    ctx.fill('evenodd');
  }

  // Stroke
  if (shapeProps.borderWidth > 0) {
    ctx.strokeStyle = shapeProps.borderColor;
    ctx.lineWidth = shapeProps.borderWidth;
    ctx.stroke();
  } else if (shapeProps.shapeType === 'line' || shapeProps.shapeType === 'diagonalLine') {
    // Lines always need a stroke to be visible
    ctx.strokeStyle = shapeProps.borderColor || shapeProps.fillColor;
    ctx.lineWidth = shapeProps.borderWidth || 2;
    ctx.stroke();
  }

  ctx.globalAlpha = prevAlpha;
}

// ---------------------------------------------------------------------------
// getShapeTightBounds – axis-aligned tight bounding box of shape geometry
// ---------------------------------------------------------------------------

/**
 * Compute the tight axis-aligned bounding box of the actual shape geometry
 * in local layer space (0,0 = layer top-left). For shapes inscribed in a
 * circle (polygons, stars, ring) the tight box can be significantly smaller
 * than the layer rectangle.
 */
export function getShapeTightBounds(
  shapeType: ShapeType,
  width: number,
  height: number,
  polygonSides?: number,
  starInnerRatio?: number,
): { x: number; y: number; width: number; height: number } {
  const w = width;
  const h = height;
  const cx = w / 2;
  const cy = h / 2;

  function polyBounds(
    pcx: number,
    pcy: number,
    radius: number,
    sides: number,
    startAngle = -Math.PI / 2,
  ) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (let i = 0; i < sides; i++) {
      const angle = startAngle + (i * 2 * Math.PI) / sides;
      const vx = pcx + radius * Math.cos(angle);
      const vy = pcy + radius * Math.sin(angle);
      minX = Math.min(minX, vx);
      minY = Math.min(minY, vy);
      maxX = Math.max(maxX, vx);
      maxY = Math.max(maxY, vy);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  function starBounds(
    scx: number,
    scy: number,
    outerR: number,
    innerR: number,
    points: number,
  ) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const step = Math.PI / points;
    let angle = -Math.PI / 2;
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const vx = scx + r * Math.cos(angle);
      const vy = scy + r * Math.sin(angle);
      minX = Math.min(minX, vx);
      minY = Math.min(minY, vy);
      maxX = Math.max(maxX, vx);
      maxY = Math.max(maxY, vy);
      angle += step;
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  switch (shapeType) {
    case 'pentagon':
      return polyBounds(cx, cy, Math.min(cx, cy), 5);
    case 'hexagon':
      return polyBounds(cx, cy, Math.min(cx, cy), 6);
    case 'octagon':
      return polyBounds(cx, cy, Math.min(cx, cy), 8);
    case 'polygon': {
      const sides = Math.max(3, polygonSides ?? 4);
      return polyBounds(cx, cy, Math.min(cx, cy), sides);
    }
    case 'star': {
      const sr = Math.min(cx, cy);
      const sRatio = starInnerRatio ?? 0.4;
      const sPts = polygonSides ?? 5;
      return starBounds(cx, cy, sr, sr * sRatio, sPts);
    }
    case 'star6':
      return starBounds(cx, cy, Math.min(cx, cy), Math.min(cx, cy) * 0.5, 6);
    case 'ring': {
      const outerR = Math.min(cx, cy);
      return {
        x: cx - outerR,
        y: cy - outerR,
        width: outerR * 2,
        height: outerR * 2,
      };
    }
    case 'line':
      // Horizontal line at cy — give minimal height for handle visibility
      return { x: 0, y: Math.max(0, cy - 1), width: w, height: Math.min(h, 2) };
    default:
      // All other shapes (rectangle, ellipse, triangle, diamond, arrows, etc.)
      // fill their full bounding box.
      return { x: 0, y: 0, width: w, height: h };
  }
}

// ---------------------------------------------------------------------------
// pointInShapePath – test if a local-space point is inside the shape geometry
// ---------------------------------------------------------------------------

let _hitCtx: CanvasRenderingContext2D | null = null;

/** Lazily create a reusable offscreen context for hit testing. */
function getHitCtx(): CanvasRenderingContext2D {
  if (!_hitCtx) {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    _hitCtx = c.getContext('2d')!;
  }
  return _hitCtx;
}

/**
 * Test if a point (in local layer space, 0,0 = layer top-left) falls inside
 * the actual shape geometry. For lines, uses a proximity threshold.
 */
export function pointInShapePath(
  localX: number,
  localY: number,
  width: number,
  height: number,
  shapeType: ShapeType,
  polygonSides?: number,
  starInnerRatio?: number,
): boolean {
  const ctx = getHitCtx();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Build the path at origin
  renderShapePath(ctx, shapeType, width, height, polygonSides, starInnerRatio);

  // For line shapes use stroke proximity
  if (shapeType === 'line' || shapeType === 'diagonalLine') {
    ctx.lineWidth = 6; // generous hit zone for lines
    return ctx.isPointInStroke(localX, localY);
  }

  return ctx.isPointInPath(localX, localY, 'evenodd');
}
