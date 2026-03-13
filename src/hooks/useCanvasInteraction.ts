import { useState, useCallback, useRef, useEffect } from 'react';
import type { DragMode } from '../types/enums';
import type { ActiveTool } from '../types/enums';
import type { LayerModel } from '../types/LayerModel';
import type { SmartGuidesResult } from './useSmartGuides';
import { ROTATE_CURSOR, ROTATE_CURSORS } from '../components/Canvas/HandleOverlay';
import { useUiStore } from '../stores/uiStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InteractionMode =
  | 'idle'
  | 'select'
  | 'move'
  | 'resize'
  | 'rotate'
  | 'marquee'
  | 'pan'
  | 'draw'
  | 'erase'
  | 'blur'
  | 'crop'
  | 'text-edit'
  | 'color-pick'
  | 'anchor-move';

export type CursorStyle =
  | 'default'
  | 'pointer'
  | 'move'
  | 'crosshair'
  | 'grab'
  | 'grabbing'
  | 'text'
  | 'not-allowed'
  | 'nw-resize'
  | 'ne-resize'
  | 'sw-resize'
  | 'se-resize'
  | 'n-resize'
  | 's-resize'
  | 'e-resize'
  | 'w-resize'
  | (string & {});  // Allow custom cursor values (e.g. url() data URIs)

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate' | 'anchor';

export interface DragDelta {
  x: number;
  y: number;
}

export interface ModifierKeys {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
}

/** State captured at the start of a drag operation. */
export interface DragStartState {
  /** Canvas-space position of the mouse at drag start. */
  canvasX: number;
  canvasY: number;
  /** Client position at drag start. */
  clientX: number;
  clientY: number;
  /** The drag mode determined on mouse-down. */
  dragMode: DragMode;
  /** If resizing, which handle was grabbed. */
  handleId: HandleId | null;
  /** Snapshot of the selected layer(s) positions/sizes at drag start (for delta application). */
  layerSnapshots: LayerSnapshot[];
  /** Original rotation for rotate drag. */
  startAngle: number;
  /** Anchor world position at rotation drag start (for anchor-preserving rotation). */
  rotateAnchorWorldX: number;
  rotateAnchorWorldY: number;
}

export interface LayerSnapshot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  anchorX: number;
  anchorY: number;
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
}

export interface CanvasInteractionResult {
  /** Current interaction mode. */
  interactionMode: InteractionMode;
  /** CSS cursor to apply. */
  cursor: CursorStyle;
  /** Whether a drag operation is in progress. */
  isDragging: boolean;
  /** Accumulated drag delta since mousedown, in canvas coordinates. */
  dragDelta: DragDelta;
  /** Current modifier key states. */
  modifiers: ModifierKeys;
  /** Current drag mode from the DragMode enum. */
  dragMode: DragMode;
  /** Set the interaction mode programmatically. */
  setInteractionMode: (mode: InteractionMode) => void;
  /** Handler for canvas mousedown. */
  handleMouseDown: (e: React.MouseEvent) => void;
  /** Handler for canvas mousemove. */
  handleMouseMove: (e: React.MouseEvent) => void;
  /** Handler for canvas mouseup. */
  handleMouseUp: (e: React.MouseEvent) => void;
  /** Handler for canvas wheel (zoom). */
  handleWheel: (e: React.WheelEvent) => void;
  /** Handler for double-click. */
  handleDoubleClick: (e: React.MouseEvent) => void;
  /** Current zoom level. */
  zoom: number;
  /** Set zoom level. */
  setZoom: (zoom: number) => void;
  /** Active handle being dragged, if any. */
  activeHandle: HandleId | null;
  /** Marquee rectangle in canvas coordinates during marquee drag. */
  marqueeRect: { x: number; y: number; width: number; height: number } | null;
  /** Drag start state for external consumption. */
  dragStartState: DragStartState | null;
  /** Polyline points being drawn (click-to-place mode for lines). */
  polylinePoints: Array<{ x: number; y: number }>;
  /** Current cursor position during polyline drawing (for preview segment). */
  polylinePreviewPoint: { x: number; y: number } | null;
}

/**
 * Mouse interaction priority chain (highest to lowest):
 *  1. Shape fill edit click
 *  2. Double-click: enter fill edit / start inline text
 *  3. Tool action
 *  4. Rotation drag start
 *  5. Resize drag start (Alt = crop mode)
 *  6. Move (Ctrl = duplicate-then-move)
 *  7. Hit-test selection
 *  8. Marquee start
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MIN_SIZE = 20;

/** Handle cursor mapping */
const HANDLE_CURSORS: Record<string, CursorStyle> = {
  nw: 'nw-resize',
  n: 'n-resize',
  ne: 'ne-resize',
  e: 'e-resize',
  se: 'se-resize',
  s: 's-resize',
  sw: 'sw-resize',
  w: 'w-resize',
  rotate: 'grab',
  anchor: 'crosshair',
};

/** Convert client coordinates to canvas coordinates */
export function clientToCanvas(
  clientX: number,
  clientY: number,
  canvasSurfaceEl: HTMLElement | null,
  zoom: number,
): { x: number; y: number } {
  if (!canvasSurfaceEl) return { x: 0, y: 0 };
  const rect = canvasSurfaceEl.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / zoom,
    y: (clientY - rect.top) / zoom,
  };
}

/** Constrain delta to primary axis when Shift is held. */
export function constrainToAxis(dx: number, dy: number): { dx: number; dy: number } {
  if (Math.abs(dx) > Math.abs(dy)) {
    return { dx, dy: 0 };
  }
  return { dx: 0, dy };
}

/** Snap angle to 15-degree increments. */
export function snapAngle(angleDeg: number): number {
  return Math.round(angleDeg / 15) * 15;
}

/** Rotate a point around a center by angleDeg degrees. */
function rotatePoint(px: number, py: number, cx: number, cy: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

/** Get the opposite anchor fractions for a handle (WPF pattern). */
function getOppositeAnchor(handleId: HandleId): { ax: number; ay: number } {
  switch (handleId) {
    case 'nw': return { ax: 1, ay: 1 };
    case 'n':  return { ax: 0.5, ay: 1 };
    case 'ne': return { ax: 0, ay: 1 };
    case 'e':  return { ax: 0, ay: 0.5 };
    case 'se': return { ax: 0, ay: 0 };
    case 's':  return { ax: 0.5, ay: 0 };
    case 'sw': return { ax: 1, ay: 0 };
    case 'w':  return { ax: 1, ay: 0.5 };
    default:   return { ax: 0.5, ay: 0.5 };
  }
}

/** Check if a handle is a corner handle. */
function isCornerHandle(h: HandleId): boolean {
  return h === 'nw' || h === 'ne' || h === 'sw' || h === 'se';
}

/**
 * Compute resize with rotation-aware opposite-corner pinning.
 * Matches WPF DoResize() behaviour: transforms screen deltas to local space,
 * handles Shift (aspect lock) and Ctrl (symmetric from center),
 * and pins the opposite corner/edge in screen space even when rotated.
 */
export function computeResize(
  handleId: HandleId,
  screenDx: number,
  screenDy: number,
  snapshot: LayerSnapshot,
  lockAspect: boolean,
  symmetric: boolean,
): { x: number; y: number; width: number; height: number } {
  const rotation = snapshot.rotation;
  const startW = snapshot.width;
  const startH = snapshot.height;

  // Transform screen-space delta into the layer's local (unrotated) coordinate system
  let dx: number, dy: number;
  if (Math.abs(rotation) > 0.01) {
    const rad = (-rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    dx = screenDx * cos - screenDy * sin;
    dy = screenDx * sin + screenDy * cos;
  } else {
    dx = screenDx;
    dy = screenDy;
  }

  let newW = startW;
  let newH = startH;

  // Calculate new dimensions based on which handle is being dragged
  switch (handleId) {
    case 'nw': newW = startW - dx; newH = startH - dy; break;
    case 'n':  newH = startH - dy; break;
    case 'ne': newW = startW + dx; newH = startH - dy; break;
    case 'e':  newW = startW + dx; break;
    case 'se': newW = startW + dx; newH = startH + dy; break;
    case 's':  newH = startH + dy; break;
    case 'sw': newW = startW - dx; newH = startH + dy; break;
    case 'w':  newW = startW - dx; break;
  }

  // Ctrl: symmetric resize from center — double the delta
  if (symmetric) {
    newW = startW + (newW - startW) * 2;
    newH = startH + (newH - startH) * 2;
  }

  // Shift: lock aspect ratio
  if (lockAspect) {
    const aspect = startW / (startH || 1);
    if (isCornerHandle(handleId)) {
      if (Math.abs(newW - startW) > Math.abs(newH - startH)) {
        newH = newW / aspect;
      } else {
        newW = newH * aspect;
      }
    } else if (handleId === 'e' || handleId === 'w') {
      newH = newW / aspect;
    } else {
      // Top or Bottom
      newW = newH * aspect;
    }
  }

  // Enforce minimum size
  if (newW < MIN_SIZE) newW = MIN_SIZE;
  if (newH < MIN_SIZE) newH = MIN_SIZE;

  // Compute new position
  const startCx = snapshot.x + startW / 2;
  const startCy = snapshot.y + startH / 2;
  let newX: number, newY: number;

  if (symmetric) {
    // Ctrl: center stays fixed
    newX = startCx - newW / 2;
    newY = startCy - newH / 2;
  } else {
    // Default: opposite corner/edge stays fixed in screen space (WPF/Photoshop standard)
    const opp = getOppositeAnchor(handleId);

    // Compute the screen position of the opposite point at drag start
    const oppLocalX = (opp.ax - 0.5) * startW;
    const oppLocalY = (opp.ay - 0.5) * startH;
    let oppScreenX: number, oppScreenY: number;
    if (Math.abs(rotation) > 0.01) {
      const rad = (rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      oppScreenX = startCx + oppLocalX * cos - oppLocalY * sin;
      oppScreenY = startCy + oppLocalX * sin + oppLocalY * cos;
    } else {
      oppScreenX = startCx + oppLocalX;
      oppScreenY = startCy + oppLocalY;
    }

    // Position new layer so opposite point stays at same screen pos
    const newOppLocalX = (opp.ax - 0.5) * newW;
    const newOppLocalY = (opp.ay - 0.5) * newH;
    let newCx: number, newCy: number;
    if (Math.abs(rotation) > 0.01) {
      const rad = (rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      newCx = oppScreenX - (newOppLocalX * cos - newOppLocalY * sin);
      newCy = oppScreenY - (newOppLocalX * sin + newOppLocalY * cos);
    } else {
      newCx = oppScreenX - newOppLocalX;
      newCy = oppScreenY - newOppLocalY;
    }
    newX = newCx - newW / 2;
    newY = newCy - newH / 2;
  }

  return { x: newX, y: newY, width: newW, height: newH };
}

/**
 * Compute crop adjustments from a resize-handle drag with Alt held.
 * Returns new cropTop/Bottom/Left/Right values.
 */
export function computeCrop(
  handleId: HandleId,
  dx: number,
  dy: number,
  snapshot: LayerSnapshot,
): { cropTop: number; cropBottom: number; cropLeft: number; cropRight: number } {
  let { cropTop, cropBottom, cropLeft, cropRight } = snapshot;

  switch (handleId) {
    case 'n': case 'nw': case 'ne':
      cropTop = Math.max(0, snapshot.cropTop + dy);
      break;
  }
  switch (handleId) {
    case 's': case 'sw': case 'se':
      cropBottom = Math.max(0, snapshot.cropBottom - dy);
      break;
  }
  switch (handleId) {
    case 'w': case 'nw': case 'sw':
      cropLeft = Math.max(0, snapshot.cropLeft + dx);
      break;
  }
  switch (handleId) {
    case 'e': case 'ne': case 'se':
      cropRight = Math.max(0, snapshot.cropRight - dx);
      break;
  }

  return { cropTop, cropBottom, cropLeft, cropRight };
}

/**
 * Compute the anchor fractions from a drag on the anchor crosshair.
 * Returns normalized (0-1) anchor values, snapping to 0.5 if within 3%.
 */
export function computeAnchorMove(
  canvasX: number,
  canvasY: number,
  snapshot: LayerSnapshot,
): { anchorX: number; anchorY: number } {
  const w = snapshot.width || 1;
  const h = snapshot.height || 1;
  let ax = (canvasX - snapshot.x) / w;
  let ay = (canvasY - snapshot.y) / h;

  // Clamp to 0-1
  ax = Math.max(0, Math.min(1, ax));
  ay = Math.max(0, Math.min(1, ay));

  // Snap to center
  if (Math.abs(ax - 0.5) < 0.03) ax = 0.5;
  if (Math.abs(ay - 0.5) < 0.03) ay = 0.5;

  return { anchorX: ax, anchorY: ay };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseCanvasInteractionOptions {
  /** Function to get selected layers for drag operations. */
  getSelectedLayers?: () => LayerModel[];
  /** Function to update a layer during/after drag. */
  updateLayer?: (id: string, changes: Partial<LayerModel>) => void;
  /** Function to hit-test a point against layers. */
  hitTestPoint?: (px: number, py: number) => LayerModel | null;
  /** Function to select a layer. */
  selectLayer?: (id: string) => void;
  /** Function to toggle selection. */
  toggleSelection?: (id: string) => void;
  /** Function to deselect all. */
  deselectAll?: () => void;
  /** Function to select by marquee. */
  selectByMarquee?: (rect: { x: number; y: number; width: number; height: number }) => void;
  /** Function to take an undo snapshot. */
  takeSnapshot?: () => void;
  /** Smart guides hook result for snapping. */
  smartGuides?: SmartGuidesResult;
  /** Reference to the canvas surface element for coordinate conversion. */
  canvasSurfaceRef?: React.RefObject<HTMLElement | null>;
  /** Whether grid is visible (enables grid snapping). */
  gridVisible?: boolean;
  /** Grid spacing for snapping. */
  gridSpacing?: number;
  /** Currently selected layer IDs. */
  selectedLayerIds?: string[];
  /** Current zoom level from the store (used for coordinate conversion). */
  zoom?: number;
  /** Currently active tool from uiStore. */
  activeTool?: ActiveTool;
  /** Callback when a shape is drawn via marquee (drawShape mode). Rect in canvas coords. */
  onShapeDrawn?: (rect: { x: number; y: number; width: number; height: number }, startPt?: { x: number; y: number }, endPt?: { x: number; y: number }) => void;
  /** Callback when a polyline is finished (click-to-place line drawing). */
  onPolylineDrawn?: (points: Array<{ x: number; y: number }>) => void;
  /** Callback to duplicate a layer. Returns the new cloned layer. */
  onDuplicateLayer?: (layer: LayerModel) => LayerModel | null;
}

/**
 * Canvas-level mouse interaction manager.
 *
 * Tracks mouse state, modifier keys, drag deltas, and determines the current
 * interaction mode from the priority chain.
 * Matches WPF MainWindow.Interaction.cs behaviour.
 */
export function useCanvasInteraction(
  options: UseCanvasInteractionOptions = {},
): CanvasInteractionResult {
  const {
    getSelectedLayers,
    updateLayer,
    hitTestPoint: externalHitTest,
    selectLayer,
    toggleSelection,
    deselectAll,
    selectByMarquee,
    takeSnapshot,
    smartGuides,
    canvasSurfaceRef,
    gridVisible = false,
    gridSpacing = 50,
    selectedLayerIds = [],
    zoom: externalZoom,
    activeTool,
    onShapeDrawn,
    onPolylineDrawn,
    onDuplicateLayer,
  } = options;

  const [interactionMode, setInteractionMode] = useState<InteractionMode>('idle');
  const [cursor, setCursor] = useState<CursorStyle>('default');
  const [isDragging, setIsDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState<DragDelta>({ x: 0, y: 0 });
  const [modifiers, setModifiers] = useState<ModifierKeys>({ shift: false, ctrl: false, alt: false });
  const [internalZoom, setInternalZoom] = useState(1);
  // Use external zoom from store if provided; otherwise fall back to internal state
  const zoom = externalZoom ?? internalZoom;
  const setZoom = setInternalZoom;
  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [activeHandle, setActiveHandle] = useState<HandleId | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [dragStartState, setDragStartState] = useState<DragStartState | null>(null);

  // Refs mirror state for the global mouseup handler so it never sees stale closures
  const isDraggingRef = useRef(false);
  const interactionModeRef = useRef<InteractionMode>('idle');

  const dragStartRef = useRef<DragStartState | null>(null);
  // Store the raw end point for line drawing (before normalization)
  const lineEndRef = useRef<{ x: number; y: number } | null>(null);
  // Polyline drawing state (click-to-place line mode)
  const [polylinePoints, setPolylinePoints] = useState<Array<{ x: number; y: number }>>([]);
  const [polylinePreviewPoint, setPolylinePreviewPoint] = useState<{ x: number; y: number } | null>(null);

  // Keep refs in sync with state (read by global mouseup handler)
  isDraggingRef.current = isDragging;
  interactionModeRef.current = interactionMode;

  const updateModifiers = useCallback((e: React.MouseEvent | React.WheelEvent) => {
    setModifiers({ shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey });
  }, []);

  /** Get canvas coords from a mouse event. */
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent) => {
      return clientToCanvas(
        e.clientX,
        e.clientY,
        canvasSurfaceRef?.current ?? null,
        zoom,
      );
    },
    [canvasSurfaceRef, zoom],
  );

  /** Create layer snapshots from currently selected layers. */
  const createLayerSnapshots = useCallback((): LayerSnapshot[] => {
    if (!getSelectedLayers) return [];
    return getSelectedLayers().map((l) => ({
      id: l.id,
      x: l.x,
      y: l.y,
      width: l.width,
      height: l.height,
      rotation: l.rotation,
      anchorX: l.anchorX,
      anchorY: l.anchorY,
      cropTop: l.cropTop,
      cropBottom: l.cropBottom,
      cropLeft: l.cropLeft,
      cropRight: l.cropRight,
    }));
  }, [getSelectedLayers]);

  /** Build a DragStartState helper. */
  const buildDragStart = useCallback(
    (
      canvasPos: { x: number; y: number },
      clientX: number,
      clientY: number,
      mode: DragMode,
      handleId: HandleId | null,
      snapshots: LayerSnapshot[],
      startAngle = 0,
      anchorWorldX = 0,
      anchorWorldY = 0,
    ): DragStartState => ({
      canvasX: canvasPos.x,
      canvasY: canvasPos.y,
      clientX,
      clientY,
      dragMode: mode,
      handleId,
      layerSnapshots: snapshots,
      startAngle,
      rotateAnchorWorldX: anchorWorldX,
      rotateAnchorWorldY: anchorWorldY,
    }),
    [],
  );

  // -------------------------------------------------------------------------
  // Mouse Down
  // -------------------------------------------------------------------------
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      updateModifiers(e);
      const canvasPos = getCanvasCoords(e);

      // Middle-button -> pan
      if (e.button === 1) {
        setInteractionMode('pan');
        setCursor('grabbing');
        setIsDragging(true);
        setDragMode('none');
        const startState = buildDragStart(canvasPos, e.clientX, e.clientY, 'none', null, []);
        dragStartRef.current = startState;
        setDragStartState(startState);
        return;
      }

      // Right-click finishes polyline drawing
      if (e.button === 2 && polylinePoints.length >= 2) {
        e.preventDefault();
        onPolylineDrawn?.(polylinePoints);
        setPolylinePoints([]);
        setPolylinePreviewPoint(null);
        setDragMode('none');
        setInteractionMode('idle');
        setCursor('default');
        return;
      }

      if (e.button !== 0) return;

      // Priority 0: Shape tool or Text tool — enter draw mode immediately
      if (activeTool === 'shape' || activeTool === 'text') {
        const currentShapeType = useUiStore.getState().selectedShapeType;

        // Polyline mode: line tool uses click-to-place points
        if (activeTool === 'shape' && currentShapeType === 'line') {
          // Snap point with Shift (45° relative to last point)
          let px = canvasPos.x;
          let py = canvasPos.y;
          if (e.shiftKey && polylinePoints.length > 0) {
            const last = polylinePoints[polylinePoints.length - 1];
            const dx = px - last.x;
            const dy = py - last.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const rawAngle = Math.atan2(dy, dx);
            const snapped = Math.round(rawAngle / (Math.PI / 4)) * (Math.PI / 4);
            px = last.x + dist * Math.cos(snapped);
            py = last.y + dist * Math.sin(snapped);
          }

          setPolylinePoints((prev) => [...prev, { x: px, y: py }]);
          setPolylinePreviewPoint({ x: px, y: py });
          setDragMode('drawPolyline');
          setInteractionMode('draw');
          setCursor('crosshair');
          return;
        }

        const drawMode: DragMode = 'drawShape';
        const startState = buildDragStart(
          canvasPos, e.clientX, e.clientY, activeTool === 'text' ? 'drawText' : drawMode, null, [],
        );
        dragStartRef.current = startState;
        setDragStartState(startState);
        setDragMode(activeTool === 'text' ? 'drawText' : drawMode);
        setInteractionMode('draw');
        setCursor('crosshair');
        setIsDragging(true);
        setMarqueeRect({ x: canvasPos.x, y: canvasPos.y, width: 0, height: 0 });
        return;
      }

      // Check if clicking on a handle (rotation, resize, anchor)
      const target = e.target as HTMLElement;
      const handleTestId = target.getAttribute?.('data-testid') ?? '';
      const handleDataId = target.getAttribute?.('data-handle-id') ?? '';

      // Priority 4: Rotation drag (top handle or corner rotation zones)
      if (handleTestId === 'handle-rotate' || handleDataId === 'rotate' || handleDataId.startsWith('rotate-')) {
        takeSnapshot?.();
        const snapshots = createLayerSnapshots();

        // Compute pivot point for rotation
        let anchorWorldX: number, anchorWorldY: number;
        if (snapshots.length > 1) {
          // Multi-select: use center of combined bounding box as pivot
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const snap of snapshots) {
            minX = Math.min(minX, snap.x);
            minY = Math.min(minY, snap.y);
            maxX = Math.max(maxX, snap.x + snap.width);
            maxY = Math.max(maxY, snap.y + snap.height);
          }
          anchorWorldX = (minX + maxX) / 2;
          anchorWorldY = (minY + maxY) / 2;
        } else if (snapshots.length === 1) {
          // Single select: use layer's anchor point
          const firstSnap = snapshots[0];
          const anchorLocalX = firstSnap.x + firstSnap.width * firstSnap.anchorX;
          const anchorLocalY = firstSnap.y + firstSnap.height * firstSnap.anchorY;
          const geoCenter = {
            x: firstSnap.x + firstSnap.width / 2,
            y: firstSnap.y + firstSnap.height / 2,
          };
          if (Math.abs(firstSnap.rotation) > 0.01) {
            const rotated = rotatePoint(anchorLocalX, anchorLocalY, geoCenter.x, geoCenter.y, firstSnap.rotation);
            anchorWorldX = rotated.x;
            anchorWorldY = rotated.y;
          } else {
            anchorWorldX = anchorLocalX;
            anchorWorldY = anchorLocalY;
          }
        } else {
          anchorWorldX = canvasPos.x;
          anchorWorldY = canvasPos.y;
        }

        const startAngle = Math.atan2(canvasPos.y - anchorWorldY, canvasPos.x - anchorWorldX) * (180 / Math.PI);

        const startState = buildDragStart(
          canvasPos, e.clientX, e.clientY, 'rotate', 'rotate', snapshots, startAngle, anchorWorldX, anchorWorldY,
        );
        dragStartRef.current = startState;
        setDragStartState(startState);
        setDragMode('rotate');
        setActiveHandle('rotate');
        setInteractionMode('rotate');
        setCursor(ROTATE_CURSORS[handleDataId] ?? ROTATE_CURSOR);
        setIsDragging(true);
        return;
      }

      // Priority 6.5: Anchor move
      if (handleTestId === 'handle-anchor' || handleDataId === 'anchor') {
        takeSnapshot?.();
        const startState = buildDragStart(
          canvasPos, e.clientX, e.clientY, 'anchorMove', 'anchor', createLayerSnapshots(),
        );
        dragStartRef.current = startState;
        setDragStartState(startState);
        setDragMode('anchorMove');
        setActiveHandle('anchor');
        setInteractionMode('anchor-move');
        setCursor('crosshair');
        setIsDragging(true);
        return;
      }

      // Priority 5: Resize or Crop (Alt + resize = crop)
      const resizeHandleMatch = handleTestId.match(/^handle-(nw|n|ne|e|se|s|sw|w)$/);
      const resizeDataId = handleDataId as HandleId;
      const isResizeHandle = resizeHandleMatch || ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].includes(resizeDataId);
      const resizeHandleId = (resizeHandleMatch?.[1] ?? (isResizeHandle ? resizeDataId : null)) as HandleId | null;

      if (resizeHandleId) {
        takeSnapshot?.();
        const mode: DragMode = e.altKey ? 'crop' : 'resize';
        const startState = buildDragStart(
          canvasPos, e.clientX, e.clientY, mode, resizeHandleId, createLayerSnapshots(),
        );
        dragStartRef.current = startState;
        setDragStartState(startState);
        setDragMode(mode);
        setActiveHandle(resizeHandleId);
        setInteractionMode(mode === 'crop' ? 'crop' : 'resize');
        setCursor(HANDLE_CURSORS[resizeHandleId] ?? 'default');
        setIsDragging(true);
        return;
      }

      // Priority 7: Hit-test for selection / Priority 6: Move
      const hitLayer = externalHitTest?.(canvasPos.x, canvasPos.y);

      if (hitLayer) {
        // Alt+drag: duplicate layer then move the clone
        if (e.altKey) {
          const cloned = onDuplicateLayer?.(hitLayer);
          if (cloned) {
            takeSnapshot?.();
            selectLayer?.(cloned.id);
            const snapshots: LayerSnapshot[] = [{
              id: cloned.id,
              x: cloned.x,
              y: cloned.y,
              width: cloned.width,
              height: cloned.height,
              rotation: cloned.rotation,
              anchorX: cloned.anchorX,
              anchorY: cloned.anchorY,
              cropTop: cloned.cropTop,
              cropBottom: cloned.cropBottom,
              cropLeft: cloned.cropLeft,
              cropRight: cloned.cropRight,
            }];
            const startState = buildDragStart(
              canvasPos, e.clientX, e.clientY, 'move', null, snapshots,
            );
            dragStartRef.current = startState;
            setDragStartState(startState);
            setDragMode('move');
            setInteractionMode('move');
            setCursor('move');
            setIsDragging(true);
          }
          return;
        }

        if (e.shiftKey) {
          // Shift+click: toggle selection
          toggleSelection?.(hitLayer.id);
          return;
        }

        if (!selectedLayerIds.includes(hitLayer.id)) {
          // Click on unselected layer — select it and allow immediate drag-move
          selectLayer?.(hitLayer.id);
        }
        // Selected (or just selected) — prepare for move drag

        takeSnapshot?.();
        // If multiple layers are selected and the hit layer is one of them,
        // create snapshots for ALL selected layers so they move together.
        let snapshots: LayerSnapshot[];
        if (selectedLayerIds.includes(hitLayer.id) && selectedLayerIds.length > 1) {
          snapshots = createLayerSnapshots();
        } else {
          // Single select or just-selected: use hit layer directly
          snapshots = [{
            id: hitLayer.id,
            x: hitLayer.x,
            y: hitLayer.y,
            width: hitLayer.width,
            height: hitLayer.height,
            rotation: hitLayer.rotation,
            anchorX: hitLayer.anchorX,
            anchorY: hitLayer.anchorY,
            cropTop: hitLayer.cropTop,
            cropBottom: hitLayer.cropBottom,
            cropLeft: hitLayer.cropLeft,
            cropRight: hitLayer.cropRight,
          }];
        }

        const startState = buildDragStart(
          canvasPos, e.clientX, e.clientY, 'move', null, snapshots,
        );
        dragStartRef.current = startState;
        setDragStartState(startState);
        setDragMode('move');
        setInteractionMode('move');
        setCursor('move');
        setIsDragging(true);
        return;
      }

      // Priority 8: Click empty area — deselect, begin marquee
      deselectAll?.();

      const startState = buildDragStart(
        canvasPos, e.clientX, e.clientY, 'marqueeSelect', null, [],
      );
      dragStartRef.current = startState;
      setDragStartState(startState);
      setDragMode('marqueeSelect');
      setInteractionMode('marquee');
      setCursor('crosshair');
      setIsDragging(true);
      setMarqueeRect({ x: canvasPos.x, y: canvasPos.y, width: 0, height: 0 });
    },
    [
      updateModifiers,
      getCanvasCoords,
      buildDragStart,
      createLayerSnapshots,
      externalHitTest,
      selectLayer,
      toggleSelection,
      deselectAll,
      takeSnapshot,
      selectedLayerIds,
      activeTool,
      onDuplicateLayer,
      polylinePoints,
      onPolylineDrawn,
      dragMode,
    ],
  );

  // -------------------------------------------------------------------------
  // Mouse Move
  // -------------------------------------------------------------------------
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      updateModifiers(e);
      const canvasPos = getCanvasCoords(e);

      // Polyline preview: update cursor position when in polyline drawing mode
      if (polylinePoints.length > 0 && dragMode === 'drawPolyline') {
        let px = canvasPos.x;
        let py = canvasPos.y;
        // Shift: snap to 45° relative to last point
        if (e.shiftKey) {
          const last = polylinePoints[polylinePoints.length - 1];
          const dx = px - last.x;
          const dy = py - last.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const rawAngle = Math.atan2(dy, dx);
          const snapped = Math.round(rawAngle / (Math.PI / 4)) * (Math.PI / 4);
          px = last.x + dist * Math.cos(snapped);
          py = last.y + dist * Math.sin(snapped);
        }
        setPolylinePreviewPoint({ x: px, y: py });
        setCursor('crosshair');
        return;
      }

      // Not dragging — update hover cursor based on handle proximity
      if (!isDragging || !dragStartRef.current) {
        // Check if hovering over a handle element
        const target = e.target as HTMLElement;
        const handleTestId = target.getAttribute?.('data-testid') ?? '';
        const handleDataId = target.getAttribute?.('data-handle-id') ?? '';

        if (handleTestId === 'handle-rotate' || handleDataId === 'rotate' || handleDataId.startsWith('rotate-')) {
          setCursor(ROTATE_CURSORS[handleDataId] ?? ROTATE_CURSOR);
        } else if (handleTestId === 'handle-anchor' || handleDataId === 'anchor') {
          setCursor('crosshair');
        } else {
          const resizeMatch = handleTestId.match(/^handle-(nw|n|ne|e|se|s|sw|w)$/);
          const resizeId = resizeMatch?.[1] ?? (['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].includes(handleDataId) ? handleDataId : null);
          if (resizeId) {
            setCursor(HANDLE_CURSORS[resizeId] ?? 'default');
          } else if (activeTool === 'shape' || activeTool === 'text') {
            // Shape/text draw mode — always show crosshair
            setCursor('crosshair');
          } else {
            // Check if hovering over a layer (show move cursor)
            const hit = externalHitTest?.(canvasPos.x, canvasPos.y);
            setCursor(hit ? 'move' : 'default');
          }
        }
        return;
      }

      const start = dragStartRef.current;

      const screenDx = canvasPos.x - start.canvasX;
      const screenDy = canvasPos.y - start.canvasY;

      // Shift constrains to axis (for move)
      let dx = screenDx;
      let dy = screenDy;
      if (e.shiftKey && start.dragMode === 'move') {
        const constrained = constrainToAxis(dx, dy);
        dx = constrained.dx;
        dy = constrained.dy;
      }

      setDragDelta({ x: dx, y: dy });

      // =======================================================================
      // MOVE
      // =======================================================================
      if (start.dragMode === 'move') {
        setCursor('move');
        setInteractionMode('move');

        for (const snap of start.layerSnapshots) {
          let newX = snap.x + dx;
          let newY = snap.y + dy;

          // Grid snap
          if (gridVisible && gridSpacing > 0) {
            newX = Math.round(newX / gridSpacing) * gridSpacing;
            newY = Math.round(newY / gridSpacing) * gridSpacing;
          }

          // Smart guide snap
          if (smartGuides) {
            const snapped = smartGuides.snapPosition(
              { x: newX, y: newY },
              snap.width,
              snap.height,
            );
            newX = snapped.x;
            newY = snapped.y;
          }

          updateLayer?.(snap.id, { x: newX, y: newY });
        }
      }

      // =======================================================================
      // RESIZE (rotation-aware, WPF-matching)
      // =======================================================================
      else if (start.dragMode === 'resize' && start.handleId) {
        setCursor(HANDLE_CURSORS[start.handleId] ?? 'default');
        for (const snap of start.layerSnapshots) {
          const result = computeResize(
            start.handleId,
            screenDx,
            screenDy,
            snap,
            e.shiftKey,       // Shift = aspect lock
            e.ctrlKey || e.metaKey,  // Ctrl = symmetric from center
          );
          updateLayer?.(snap.id, {
            x: result.x,
            y: result.y,
            width: result.width,
            height: result.height,
          });
        }
      }

      // =======================================================================
      // ROTATE (anchor-preserving, WPF-matching)
      // =======================================================================
      else if (start.dragMode === 'rotate') {
        setCursor(ROTATE_CURSOR);
        const ax = start.rotateAnchorWorldX;
        const ay = start.rotateAnchorWorldY;

        const currentAngle = Math.atan2(canvasPos.y - ay, canvasPos.x - ax) * (180 / Math.PI);
        let angleDelta = currentAngle - start.startAngle;

        // Snap to 15-degree increments with Shift
        if (e.shiftKey) {
          angleDelta = snapAngle(angleDelta);
        }

        const isMulti = start.layerSnapshots.length > 1;
        const radDelta = (angleDelta * Math.PI) / 180;
        const cosDelta = Math.cos(radDelta);
        const sinDelta = Math.sin(radDelta);

        // Ctrl + multi-select: each object rotates on its own center (no orbit)
        const individualRotate = isMulti && (e.ctrlKey || e.metaKey);

        for (const snap of start.layerSnapshots) {
          const newRotation = snap.rotation + angleDelta;

          if (isMulti && !individualRotate) {
            // Multi-select: orbit each layer's center around the group pivot
            const cx = snap.x + snap.width / 2;
            const cy = snap.y + snap.height / 2;
            const dx = cx - ax;
            const dy = cy - ay;
            const newCx = ax + dx * cosDelta - dy * sinDelta;
            const newCy = ay + dx * sinDelta + dy * cosDelta;
            const newX = newCx - snap.width / 2;
            const newY = newCy - snap.height / 2;
            updateLayer?.(snap.id, { rotation: newRotation, x: newX, y: newY });
          } else if (individualRotate) {
            // Ctrl + multi: rotate each object around its own center, no repositioning
            updateLayer?.(snap.id, { rotation: newRotation });
          } else {
            // Single select: anchor-preserving rotation (WPF DoRotate)
            const offsetX = snap.anchorX * snap.width - snap.width / 2;
            const offsetY = snap.anchorY * snap.height - snap.height / 2;
            const radNew = (newRotation * Math.PI) / 180;
            const cosNew = Math.cos(radNew);
            const sinNew = Math.sin(radNew);
            const rotOffX = offsetX * cosNew - offsetY * sinNew;
            const rotOffY = offsetX * sinNew + offsetY * cosNew;
            const newX = ax - rotOffX - snap.width / 2;
            const newY = ay - rotOffY - snap.height / 2;
            updateLayer?.(snap.id, { rotation: newRotation, x: newX, y: newY });
          }
        }
      }

      // =======================================================================
      // CROP
      // =======================================================================
      else if (start.dragMode === 'crop' && start.handleId) {
        setCursor('crosshair');
        for (const snap of start.layerSnapshots) {
          const cropResult = computeCrop(start.handleId, dx, dy, snap);
          updateLayer?.(snap.id, cropResult);
        }
      }

      // =======================================================================
      // ANCHOR MOVE
      // =======================================================================
      else if (start.dragMode === 'anchorMove') {
        setCursor('crosshair');
        for (const snap of start.layerSnapshots) {
          const anchorResult = computeAnchorMove(canvasPos.x, canvasPos.y, snap);
          updateLayer?.(snap.id, anchorResult);
        }
      }

      // =======================================================================
      // MARQUEE
      // =======================================================================
      else if (start.dragMode === 'marqueeSelect') {
        setCursor('crosshair');
        setInteractionMode('marquee');
        setMarqueeRect({
          x: Math.min(start.canvasX, canvasPos.x),
          y: Math.min(start.canvasY, canvasPos.y),
          width: Math.abs(canvasPos.x - start.canvasX),
          height: Math.abs(canvasPos.y - start.canvasY),
        });
      }

      // =======================================================================
      // DRAW SHAPE / DRAW TEXT
      // =======================================================================
      else if (start.dragMode === 'drawShape' || start.dragMode === 'drawText') {
        setCursor('crosshair');
        setInteractionMode('draw');
        let w = canvasPos.x - start.canvasX;
        let h = canvasPos.y - start.canvasY;

        // Check if we're drawing a line shape
        const currentShapeType = useUiStore.getState().selectedShapeType;
        const isLineDraw = start.dragMode === 'drawShape' && currentShapeType === 'line';

        if (isLineDraw) {
          // Line drawing: compute angle and length from start to end
          let endX = canvasPos.x;
          let endY = canvasPos.y;

          // Shift: snap angle to nearest 45° increment
          if (e.shiftKey) {
            const dx = endX - start.canvasX;
            const dy = endY - start.canvasY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const rawAngle = Math.atan2(dy, dx);
            const snapped = Math.round(rawAngle / (Math.PI / 4)) * (Math.PI / 4);
            endX = start.canvasX + dist * Math.cos(snapped);
            endY = start.canvasY + dist * Math.sin(snapped);
          }

          // Store the raw end point for handleShapeDrawn
          lineEndRef.current = { x: endX, y: endY };

          // Marquee rect = bounding box of the line
          const minX = Math.min(start.canvasX, endX);
          const minY = Math.min(start.canvasY, endY);
          const maxX = Math.max(start.canvasX, endX);
          const maxY = Math.max(start.canvasY, endY);
          setMarqueeRect({
            x: minX,
            y: minY,
            width: Math.max(maxX - minX, 1),
            height: Math.max(maxY - minY, 1),
          });
        } else {
          // Normal shape: Shift constrains to equal sides (square / regular polygon)
          if (e.shiftKey) {
            const side = Math.max(Math.abs(w), Math.abs(h));
            w = w >= 0 ? side : -side;
            h = h >= 0 ? side : -side;
          }

          lineEndRef.current = null;

          const rect = {
            x: w >= 0 ? start.canvasX : start.canvasX + w,
            y: h >= 0 ? start.canvasY : start.canvasY + h,
            width: Math.abs(w),
            height: Math.abs(h),
          };
          setMarqueeRect(rect);
        }
      }

      // Pan
      else if (interactionMode === 'pan') {
        setCursor('grabbing');
      }
    },
    [
      isDragging,
      interactionMode,
      updateModifiers,
      getCanvasCoords,
      updateLayer,
      externalHitTest,
      smartGuides,
      gridVisible,
      gridSpacing,
      activeTool,
      polylinePoints,
      dragMode,
    ],
  );

  // -------------------------------------------------------------------------
  // Mouse Up
  // -------------------------------------------------------------------------
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      updateModifiers(e);

      const start = dragStartRef.current;

      // Finalize marquee selection (only if drag was meaningful > 3px)
      if (start?.dragMode === 'marqueeSelect' && marqueeRect) {
        if (marqueeRect.width > 3 && marqueeRect.height > 3) {
          selectByMarquee?.(marqueeRect);
        }
      }

      // Finalize drawShape — create shape if drag > 5px (WPF threshold)
      if (start?.dragMode === 'drawShape' && marqueeRect) {
        const startPt = { x: start.canvasX, y: start.canvasY };
        const endPt = lineEndRef.current;
        // For lines, check distance instead of rect dimensions
        if (endPt) {
          const dx = endPt.x - startPt.x;
          const dy = endPt.y - startPt.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 5) {
            onShapeDrawn?.(marqueeRect, startPt, endPt);
          }
        } else if (marqueeRect.width > 5 && marqueeRect.height > 5) {
          onShapeDrawn?.(marqueeRect, startPt);
        }
      }

      // Clear smart guides
      smartGuides?.clearGuides();

      // Preserve polyline drawing mode across individual clicks
      const inPolyline = polylinePoints.length > 0;

      setIsDragging(false);
      dragStartRef.current = null;
      lineEndRef.current = null;
      setDragStartState(null);
      setDragDelta({ x: 0, y: 0 });
      setActiveHandle(null);
      setMarqueeRect(null);
      if (!inPolyline) {
        setDragMode('none');
        setInteractionMode('idle');
        setCursor('default');
      }
    },
    [updateModifiers, marqueeRect, selectByMarquee, smartGuides, onShapeDrawn, polylinePoints],
  );

  // -------------------------------------------------------------------------
  // Double-click
  // -------------------------------------------------------------------------
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      updateModifiers(e);

      // Check if double-clicking on anchor handle — reset to center
      const target = e.target as HTMLElement;
      const handleTestId = target.getAttribute?.('data-testid') ?? '';
      const handleDataId = target.getAttribute?.('data-handle-id') ?? '';

      if (handleTestId === 'handle-anchor' || handleDataId === 'anchor') {
        takeSnapshot?.();
        const layers = getSelectedLayers?.() ?? [];
        for (const layer of layers) {
          updateLayer?.(layer.id, { anchorX: 0.5, anchorY: 0.5 });
        }
        return;
      }

      // Could trigger inline text edit or fill edit
      const canvasPos = getCanvasCoords(e);
      const hitLayer = externalHitTest?.(canvasPos.x, canvasPos.y);
      if (hitLayer?.type === 'text') {
        setInteractionMode('text-edit');
      }
    },
    [updateModifiers, getCanvasCoords, externalHitTest, takeSnapshot, updateLayer, getSelectedLayers],
  );

  // -------------------------------------------------------------------------
  // Wheel (zoom)
  // -------------------------------------------------------------------------
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      updateModifiers(e);

      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const direction = e.deltaY < 0 ? 1 : -1;
        const factor = 0.1;
        setZoom((prev) => {
          const next = prev + direction * factor;
          return Math.max(0.1, Math.min(10, Math.round(next * 100) / 100));
        });
      }
    },
    [updateModifiers],
  );

  // Cancel polyline on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && polylinePoints.length > 0) {
        setPolylinePoints([]);
        setPolylinePreviewPoint(null);
        setDragMode('none');
        setInteractionMode('idle');
        setCursor('default');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [polylinePoints.length]);

  // Reset polyline when tool changes away from line drawing
  useEffect(() => {
    if (polylinePoints.length > 0) {
      const shapeType = useUiStore.getState().selectedShapeType;
      if (activeTool !== 'shape' || shapeType !== 'line') {
        setPolylinePoints([]);
        setPolylinePreviewPoint(null);
        setDragMode('none');
        setInteractionMode('idle');
      }
    }
  }, [activeTool, polylinePoints.length]);

  // Prevent context menu during polyline drawing
  useEffect(() => {
    if (polylinePoints.length === 0) return;
    const preventCtx = (e: Event) => { e.preventDefault(); };
    window.addEventListener('contextmenu', preventCtx);
    return () => window.removeEventListener('contextmenu', preventCtx);
  }, [polylinePoints.length]);

  // Clean up drag state if mouse leaves window.
  // Uses refs instead of state in the dependency array so the listener is
  // registered once and always reads the latest values — avoids stale-closure
  // race conditions that caused stuck drags and phantom movement.
  const smartGuidesRef = useRef(smartGuides);
  smartGuidesRef.current = smartGuides;

  useEffect(() => {
    const handleGlobalUp = () => {
      if (isDraggingRef.current) {
        smartGuidesRef.current?.clearGuides();
        setIsDragging(false);
        dragStartRef.current = null;
        setDragStartState(null);
        setDragDelta({ x: 0, y: 0 });
        setDragMode('none');
        setActiveHandle(null);
        setMarqueeRect(null);
        setCursor('default');
        const mode = interactionModeRef.current;
        if (mode === 'pan' || mode === 'crop') {
          setInteractionMode('idle');
        }
      }
    };
    window.addEventListener('mouseup', handleGlobalUp);
    return () => window.removeEventListener('mouseup', handleGlobalUp);
  }, []); // stable — reads from refs

  return {
    interactionMode,
    cursor,
    isDragging,
    dragDelta,
    modifiers,
    dragMode,
    setInteractionMode,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleDoubleClick,
    zoom,
    setZoom,
    activeHandle,
    marqueeRect,
    dragStartState,
    polylinePoints,
    polylinePreviewPoint,
  };
}
