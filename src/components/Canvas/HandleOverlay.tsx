import React, { useMemo } from 'react';
import type { LayerModel } from '../../types/LayerModel';
import { getEffectiveLock } from '../../types/LayerModel';
import { HANDLE_COLORS } from '../../hooks/useSelectionManager';

/**
 * Per-corner rotation cursor SVGs — quarter-circle arc with arrowheads at both ends.
 * Arc opens away from the bounding box corner. White fill + white outline for dark bg visibility.
 *
 *   NW: ↗ arc ↙  (concave faces bottom-right, toward bbox)
 *   NE: ↖ arc ↘  (concave faces bottom-left)
 *   SW: ↗ arc ↙  (concave faces top-right)
 *   SE: ↖ arc ↘  (concave faces top-left)
 */
const S = "xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'";
const O = "stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'"; // outline
const I = "stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'"; // inner

// NW: arc from right-end curving up-left to bottom-end — concave toward bottom-right
const NW_P = "M15 4A11 11 0 0 0 4 15";
const NW_A1 = "M13 2L15 4L13 6";   // right arrowhead
const NW_A2 = "M2 13L4 15L6 13";   // bottom arrowhead
const ROTATE_NW_SVG = `<svg ${S}><path d='${NW_P}' fill='none' ${O}/><path d='${NW_A1}' fill='white' ${O}/><path d='${NW_A2}' fill='white' ${O}/><path d='${NW_P}' fill='none' ${I}/><path d='${NW_A1}' fill='white' ${I}/><path d='${NW_A2}' fill='white' ${I}/></svg>`;

// NE: arc from left-end curving up-right to bottom-end — concave toward bottom-left
const NE_P = "M9 4A11 11 0 0 1 20 15";
const NE_A1 = "M11 2L9 4L11 6";    // left arrowhead
const NE_A2 = "M22 13L20 15L18 13"; // bottom arrowhead
const ROTATE_NE_SVG = `<svg ${S}><path d='${NE_P}' fill='none' ${O}/><path d='${NE_A1}' fill='white' ${O}/><path d='${NE_A2}' fill='white' ${O}/><path d='${NE_P}' fill='none' ${I}/><path d='${NE_A1}' fill='white' ${I}/><path d='${NE_A2}' fill='white' ${I}/></svg>`;

// SE: arc from left-end curving down-right to top-end — concave toward top-left
const SE_P = "M9 20A11 11 0 0 0 20 9";
const SE_A1 = "M11 22L9 20L11 18";  // left arrowhead
const SE_A2 = "M22 11L20 9L18 11";  // top arrowhead
const ROTATE_SE_SVG = `<svg ${S}><path d='${SE_P}' fill='none' ${O}/><path d='${SE_A1}' fill='white' ${O}/><path d='${SE_A2}' fill='white' ${O}/><path d='${SE_P}' fill='none' ${I}/><path d='${SE_A1}' fill='white' ${I}/><path d='${SE_A2}' fill='white' ${I}/></svg>`;

// SW: arc from right-end curving down-left to top-end — concave toward top-right
const SW_P = "M15 20A11 11 0 0 1 4 9";
const SW_A1 = "M13 22L15 20L13 18"; // right arrowhead
const SW_A2 = "M2 11L4 9L6 11";    // top arrowhead
const ROTATE_SW_SVG = `<svg ${S}><path d='${SW_P}' fill='none' ${O}/><path d='${SW_A1}' fill='white' ${O}/><path d='${SW_A2}' fill='white' ${O}/><path d='${SW_P}' fill='none' ${I}/><path d='${SW_A1}' fill='white' ${I}/><path d='${SW_A2}' fill='white' ${I}/></svg>`;

function makeRotateCursor(svg: string) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, pointer`;
}

export const ROTATE_CURSORS: Record<string, string> = {
  'rotate-nw': makeRotateCursor(ROTATE_NW_SVG),
  'rotate-ne': makeRotateCursor(ROTATE_NE_SVG),
  'rotate-se': makeRotateCursor(ROTATE_SE_SVG),
  'rotate-sw': makeRotateCursor(ROTATE_SW_SVG),
};

/** Default rotation cursor (used for the top-center rotate handle). */
export const ROTATE_CURSOR = ROTATE_CURSORS['rotate-nw'];

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  anchorX?: number;
  anchorY?: number;
}

export interface HandleOverlayProps {
  /** Bounding rectangle of the selected object(s), or null. */
  selectedBounds: Bounds | null;
  /** Current zoom level. */
  zoom: number;
  /** Selected layers — used for color and locked checks. */
  selectedLayers?: LayerModel[];
  /** All layers — needed for effective lock check. */
  allLayers?: LayerModel[];
  /** Whether the selection is multi-selection. */
  isMultiSelect?: boolean;
}

/** Handle size in screen pixels (zoom-compensated). */
const BASE_HANDLE_SIZE = 8;
const ROTATION_HANDLE_OFFSET = 35; // px above center in screen space

interface HandleDef {
  id: string;
  /** Fractional position along the bounding box (0=left/top, 1=right/bottom). */
  fx: number;
  fy: number;
  cursor: string;
}

const HANDLES: HandleDef[] = [
  { id: 'nw', fx: 0, fy: 0, cursor: 'nw-resize' },
  { id: 'n', fx: 0.5, fy: 0, cursor: 'n-resize' },
  { id: 'ne', fx: 1, fy: 0, cursor: 'ne-resize' },
  { id: 'e', fx: 1, fy: 0.5, cursor: 'e-resize' },
  { id: 'se', fx: 1, fy: 1, cursor: 'se-resize' },
  { id: 's', fx: 0.5, fy: 1, cursor: 's-resize' },
  { id: 'sw', fx: 0, fy: 1, cursor: 'sw-resize' },
  { id: 'w', fx: 0, fy: 0.5, cursor: 'w-resize' },
];

/**
 * Selection/transform handles overlay with 8 resize handles, rotation indicator,
 * and anchor crosshair. Zoom-compensated handle sizes.
 *
 * Colors:
 * - Single selection: #FF6600
 * - Multi-selection first: #00FF00
 * - Multi-selection additional: #FF6600
 * - Group: #00BCD4
 * - Locked: dashed border only, no handles
 */
export function HandleOverlay({
  selectedBounds,
  zoom,
  selectedLayers = [],
  allLayers = [],
  isMultiSelect = false,
}: HandleOverlayProps) {
  if (!selectedBounds) return null;

  const { x, y, width, height } = selectedBounds;
  const rotation = selectedBounds.rotation ?? 0;
  const anchorX = selectedBounds.anchorX ?? 0.5;
  const anchorY = selectedBounds.anchorY ?? 0.5;

  // Scaled coordinates for positioning in CSS
  const sx = x * zoom;
  const sy = y * zoom;
  const sw = width * zoom;
  const sh = height * zoom;

  // Zoom-compensated handle size — stays constant on screen
  const hs = BASE_HANDLE_SIZE * (1 / zoom) * zoom; // = BASE_HANDLE_SIZE (in screen px)
  const halfHs = hs / 2;

  // Rotation handle offset — compensated for zoom
  const rotateOffset = ROTATION_HANDLE_OFFSET;

  // Determine if selection is locked
  const isLocked = useMemo(() => {
    if (selectedLayers.length === 0) return false;
    return selectedLayers.every((l) => getEffectiveLock(l, allLayers));
  }, [selectedLayers, allLayers]);

  // Determine border color
  const borderColor = useMemo(() => {
    if (selectedLayers.length === 0) {
      return isMultiSelect ? HANDLE_COLORS.firstMulti : HANDLE_COLORS.single;
    }
    if (selectedLayers.length === 1) {
      const layer = selectedLayers[0];
      if (layer.type === 'group') return HANDLE_COLORS.group;
      return HANDLE_COLORS.single;
    }
    return HANDLE_COLORS.firstMulti;
  }, [selectedLayers, isMultiSelect]);

  // Dashed border for locked or multi-select
  const borderStyle = isLocked || isMultiSelect ? 'dashed' : 'solid';
  const dashArray = isMultiSelect ? '6,3' : undefined;

  // Compute transform origin for rotation
  const transformOriginX = sx + sw * anchorX;
  const transformOriginY = sy + sh * anchorY;

  // Wrap all handles in a group that rotates around the anchor
  const groupStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    transform: rotation !== 0
      ? `rotate(${rotation}deg)`
      : undefined,
    transformOrigin: `${transformOriginX}px ${transformOriginY}px`,
  };

  return (
    <div
      data-testid="handle-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <div style={groupStyle}>
        {/* Selection bounding box */}
        <div
          data-testid="selection-box"
          style={{
            position: 'absolute',
            left: sx,
            top: sy,
            width: sw,
            height: sh,
            border: `1px ${borderStyle} ${borderColor}`,
            pointerEvents: 'none',
            ...(dashArray
              ? {
                  borderStyle: 'dashed',
                  // SVG-style dash array applied via border
                }
              : {}),
          }}
        />

        {/* Only show handles if not locked */}
        {!isLocked && (
          <>
            {/* 8 resize handles */}
            {HANDLES.map((h) => (
              <div
                key={h.id}
                data-testid={`handle-${h.id}`}
                data-handle-id={h.id}
                style={{
                  position: 'absolute',
                  left: sx + sw * h.fx - halfHs,
                  top: sy + sh * h.fy - halfHs,
                  width: hs,
                  height: hs,
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${borderColor}`,
                  boxSizing: 'border-box',
                  cursor: h.cursor,
                  pointerEvents: 'auto',
                }}
              />
            ))}

            {/* Corner rotation zones — invisible hit areas outside corners */}
            {[
              { id: 'rotate-nw', fx: 0, fy: 0, ox: -1, oy: -1 },
              { id: 'rotate-ne', fx: 1, fy: 0, ox: 0, oy: -1 },
              { id: 'rotate-se', fx: 1, fy: 1, ox: 0, oy: 0 },
              { id: 'rotate-sw', fx: 0, fy: 1, ox: -1, oy: 0 },
            ].map((rz) => {
              const rzSize = 16;
              return (
                <div
                  key={rz.id}
                  data-handle-id={rz.id}
                  style={{
                    position: 'absolute',
                    left: sx + sw * rz.fx + rz.ox * rzSize,
                    top: sy + sh * rz.fy + rz.oy * rzSize,
                    width: rzSize,
                    height: rzSize,
                    cursor: ROTATE_CURSORS[rz.id] ?? ROTATE_CURSOR,
                    pointerEvents: 'auto',
                  }}
                />
              );
            })}

            {/* Rotation handle (above top-center) */}
            <div
              data-testid="handle-rotate"
              data-handle-id="rotate"
              style={{
                position: 'absolute',
                left: sx + sw / 2 - halfHs,
                top: sy - rotateOffset,
                width: hs,
                height: hs,
                borderRadius: '50%',
                backgroundColor: borderColor,
                border: `1px solid #333333`,
                boxSizing: 'border-box',
                cursor: ROTATE_CURSOR,
                pointerEvents: 'auto',
              }}
            />

            {/* Line connecting rotation handle to top-center */}
            <div
              style={{
                position: 'absolute',
                left: sx + sw / 2,
                top: sy - rotateOffset + hs,
                width: 1,
                height: rotateOffset - hs,
                backgroundColor: borderColor,
                pointerEvents: 'none',
              }}
            />

            {/* Anchor crosshair */}
            <div
              data-testid="handle-anchor"
              data-handle-id="anchor"
              style={{
                position: 'absolute',
                left: sx + sw * anchorX - halfHs,
                top: sy + sh * anchorY - halfHs,
                width: hs,
                height: hs,
                pointerEvents: 'auto',
                cursor: 'crosshair',
              }}
            >
              {/* Horizontal line */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: halfHs - 0.5,
                  width: hs,
                  height: 1,
                  backgroundColor: borderColor,
                  pointerEvents: 'none',
                }}
              />
              {/* Vertical line */}
              <div
                style={{
                  position: 'absolute',
                  left: halfHs - 0.5,
                  top: 0,
                  width: 1,
                  height: hs,
                  backgroundColor: borderColor,
                  pointerEvents: 'none',
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility: compute handle positions for testing
// ---------------------------------------------------------------------------

export interface HandlePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute the positions of all 8 resize handles + rotation + anchor
 * for a given bounds and zoom level.
 */
export function computeHandlePositions(
  bounds: Bounds,
  zoom: number,
): HandlePosition[] {
  const sx = bounds.x * zoom;
  const sy = bounds.y * zoom;
  const sw = bounds.width * zoom;
  const sh = bounds.height * zoom;
  const hs = BASE_HANDLE_SIZE;
  const halfHs = hs / 2;
  const anchorX = bounds.anchorX ?? 0.5;
  const anchorY = bounds.anchorY ?? 0.5;

  const positions: HandlePosition[] = HANDLES.map((h) => ({
    id: h.id,
    x: sx + sw * h.fx - halfHs,
    y: sy + sh * h.fy - halfHs,
    width: hs,
    height: hs,
  }));

  // Rotation handle
  positions.push({
    id: 'rotate',
    x: sx + sw / 2 - halfHs,
    y: sy - ROTATION_HANDLE_OFFSET,
    width: hs,
    height: hs,
  });

  // Anchor
  positions.push({
    id: 'anchor',
    x: sx + sw * anchorX - halfHs,
    y: sy + sh * anchorY - halfHs,
    width: hs,
    height: hs,
  });

  return positions;
}

export default HandleOverlay;
