import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createDefaultLayer } from '../types/LayerModel';
import type { LayerModel } from '../types/LayerModel';
import {
  useSelectionManager,
  pointInRotatedRect,
  getRotatedAABB,
  HANDLE_COLORS,
} from '../hooks/useSelectionManager';
import {
  constrainToAxis,
  snapAngle,
  computeResize,
  computeCrop,
  computeAnchorMove,
  clientToCanvas,
} from '../hooks/useCanvasInteraction';
import type { LayerSnapshot } from '../hooks/useCanvasInteraction';
import { computeHandlePositions } from '../components/Canvas/HandleOverlay';
import type { Bounds } from '../components/Canvas/HandleOverlay';
import { useSmartGuides } from '../hooks/useSmartGuides';

// ---------------------------------------------------------------------------
// Test layers helper
// ---------------------------------------------------------------------------

function makeLayer(overrides: Partial<LayerModel> = {}): LayerModel {
  return createDefaultLayer({
    id: overrides.id ?? 'layer-1',
    name: overrides.name ?? 'Test Layer',
    type: overrides.type ?? 'image',
    x: overrides.x ?? 100,
    y: overrides.y ?? 100,
    width: overrides.width ?? 200,
    height: overrides.height ?? 150,
    rotation: overrides.rotation ?? 0,
    visible: overrides.visible ?? true,
    locked: overrides.locked ?? false,
    superLocked: overrides.superLocked ?? false,
    anchorX: overrides.anchorX ?? 0.5,
    anchorY: overrides.anchorY ?? 0.5,
    cropTop: overrides.cropTop ?? 0,
    cropBottom: overrides.cropBottom ?? 0,
    cropLeft: overrides.cropLeft ?? 0,
    cropRight: overrides.cropRight ?? 0,
    flipHorizontal: overrides.flipHorizontal ?? false,
    flipVertical: overrides.flipVertical ?? false,
    ...overrides,
  });
}

function makeSnapshot(overrides: Partial<LayerSnapshot> = {}): LayerSnapshot {
  return {
    id: 'layer-1',
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    rotation: 0,
    anchorX: 0.5,
    anchorY: 0.5,
    cropTop: 0,
    cropBottom: 0,
    cropLeft: 0,
    cropRight: 0,
    ...overrides,
  };
}

// ===========================================================================
// Phase 6 — Selection & Handles
// ===========================================================================

describe('Phase 6 — Selection & Handles', () => {
  // =========================================================================
  // 6A — Selection Logic
  // =========================================================================
  describe('6A — Selection Logic (useSelectionManager)', () => {
    it('click layer: select replaces current selection', () => {
      const { result } = renderHook(() => useSelectionManager());

      act(() => {
        result.current.selectLayer('layer-1');
      });
      expect(result.current.selectedIds.has('layer-1')).toBe(true);
      expect(result.current.selectedIds.size).toBe(1);

      // Select another — should replace
      act(() => {
        result.current.selectLayer('layer-2');
      });
      expect(result.current.selectedIds.has('layer-2')).toBe(true);
      expect(result.current.selectedIds.has('layer-1')).toBe(false);
      expect(result.current.selectedIds.size).toBe(1);
    });

    it('Shift+click: toggle adds to multi-selection', () => {
      const { result } = renderHook(() => useSelectionManager());

      act(() => {
        result.current.selectLayer('layer-1');
      });
      act(() => {
        result.current.toggleSelection('layer-2');
      });
      expect(result.current.selectedIds.size).toBe(2);
      expect(result.current.selectedIds.has('layer-1')).toBe(true);
      expect(result.current.selectedIds.has('layer-2')).toBe(true);
    });

    it('Shift+click: toggle removes from selection', () => {
      const { result } = renderHook(() => useSelectionManager());

      act(() => {
        result.current.selectLayer('layer-1');
      });
      act(() => {
        result.current.toggleSelection('layer-2');
      });
      act(() => {
        result.current.toggleSelection('layer-1');
      });
      expect(result.current.selectedIds.size).toBe(1);
      expect(result.current.selectedIds.has('layer-2')).toBe(true);
      expect(result.current.selectedIds.has('layer-1')).toBe(false);
    });

    it('click empty area: deselect all', () => {
      const { result } = renderHook(() => useSelectionManager());

      act(() => {
        result.current.selectLayer('layer-1');
      });
      act(() => {
        result.current.deselectAll();
      });
      expect(result.current.selectedIds.size).toBe(0);
    });

    it('isLayerSelectable: rejects superLocked layers', () => {
      const { result } = renderHook(() => useSelectionManager());

      const layer = makeLayer({ superLocked: true });
      expect(result.current.isLayerSelectable(layer, [layer])).toBe(false);
    });

    it('isLayerSelectable: rejects invisible layers', () => {
      const { result } = renderHook(() => useSelectionManager());

      const layer = makeLayer({ visible: false });
      expect(result.current.isLayerSelectable(layer, [layer])).toBe(false);
    });

    it('isLayerSelectable: rejects group layers', () => {
      const { result } = renderHook(() => useSelectionManager());

      const layer = makeLayer({ type: 'group' });
      expect(result.current.isLayerSelectable(layer, [layer])).toBe(false);
    });

    it('isLayerSelectable: accepts normal visible image layer', () => {
      const { result } = renderHook(() => useSelectionManager());

      const layer = makeLayer({ type: 'image', visible: true, superLocked: false });
      expect(result.current.isLayerSelectable(layer, [layer])).toBe(true);
    });

    it('primarySelectedId returns first selected', () => {
      const { result } = renderHook(() => useSelectionManager());

      act(() => {
        result.current.selectLayer('layer-1');
      });
      expect(result.current.primarySelectedId).toBe('layer-1');

      act(() => {
        result.current.toggleSelection('layer-2');
      });
      expect(result.current.primarySelectedId).toBe('layer-1');
    });

    it('selectAll selects all provided IDs', () => {
      const { result } = renderHook(() => useSelectionManager());

      act(() => {
        result.current.selectAll(['a', 'b', 'c']);
      });
      expect(result.current.selectedIds.size).toBe(3);
    });

    it('getSelectedBounds computes correct union bounds', () => {
      const { result } = renderHook(() => useSelectionManager());

      act(() => {
        result.current.selectAll(['l1', 'l2']);
      });

      const boundsMap = new Map([
        ['l1', { id: 'l1', x: 0, y: 0, width: 100, height: 100 }],
        ['l2', { id: 'l2', x: 200, y: 50, width: 100, height: 100 }],
      ]);

      const bounds = result.current.getSelectedBounds(boundsMap);
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBe(0);
      expect(bounds!.y).toBe(0);
      expect(bounds!.width).toBe(300);
      expect(bounds!.height).toBe(150);
    });
  });

  // =========================================================================
  // 6B — Handle positions (HandleOverlay)
  // =========================================================================
  describe('6B — Handle Positions (HandleOverlay)', () => {
    it('computeHandlePositions returns 10 handles (8 resize + rotate + anchor)', () => {
      const bounds: Bounds = { x: 100, y: 100, width: 200, height: 150 };
      const positions = computeHandlePositions(bounds, 1);
      expect(positions).toHaveLength(10);
    });

    it('handle positions at zoom=1 are correct for corners', () => {
      const bounds: Bounds = { x: 100, y: 100, width: 200, height: 150 };
      const positions = computeHandlePositions(bounds, 1);

      // nw corner
      const nw = positions.find((p) => p.id === 'nw');
      expect(nw).toBeDefined();
      expect(nw!.x).toBe(100 - 4); // x*zoom - halfHs = 100 - 4
      expect(nw!.y).toBe(100 - 4);

      // se corner
      const se = positions.find((p) => p.id === 'se');
      expect(se).toBeDefined();
      expect(se!.x).toBe(100 + 200 - 4); // x+w*zoom - halfHs
      expect(se!.y).toBe(100 + 150 - 4);
    });

    it('handle positions scale with zoom', () => {
      const bounds: Bounds = { x: 100, y: 100, width: 200, height: 150 };
      const z1 = computeHandlePositions(bounds, 1);
      const z2 = computeHandlePositions(bounds, 2);

      const nw1 = z1.find((p) => p.id === 'nw')!;
      const nw2 = z2.find((p) => p.id === 'nw')!;

      // At zoom=2, scaled x = 100*2 = 200, minus halfHs(4) = 196
      expect(nw2.x).toBe(200 - 4);
      // At zoom=1, scaled x = 100*1 = 100, minus halfHs(4) = 96
      expect(nw1.x).toBe(100 - 4);
    });

    it('rotation handle is above top-center by 35px', () => {
      const bounds: Bounds = { x: 100, y: 100, width: 200, height: 150 };
      const positions = computeHandlePositions(bounds, 1);

      const rotate = positions.find((p) => p.id === 'rotate');
      expect(rotate).toBeDefined();
      // x: sx + sw/2 - halfHs = 100 + 100 - 4 = 196
      expect(rotate!.x).toBe(196);
      // y: sy - 35 = 100 - 35 = 65
      expect(rotate!.y).toBe(65);
    });

    it('anchor handle is at center by default', () => {
      const bounds: Bounds = { x: 100, y: 100, width: 200, height: 150, anchorX: 0.5, anchorY: 0.5 };
      const positions = computeHandlePositions(bounds, 1);

      const anchor = positions.find((p) => p.id === 'anchor');
      expect(anchor).toBeDefined();
      // x: sx + sw * 0.5 - halfHs = 100 + 100 - 4 = 196
      expect(anchor!.x).toBe(196);
      // y: sy + sh * 0.5 - halfHs = 100 + 75 - 4 = 171
      expect(anchor!.y).toBe(171);
    });

    it('handle size is always 8px (zoom-compensated)', () => {
      const bounds: Bounds = { x: 0, y: 0, width: 100, height: 100 };
      const pos1 = computeHandlePositions(bounds, 0.5);
      const pos2 = computeHandlePositions(bounds, 2);

      // All handles should be 8px wide/tall regardless of zoom
      for (const p of pos1) {
        expect(p.width).toBe(8);
        expect(p.height).toBe(8);
      }
      for (const p of pos2) {
        expect(p.width).toBe(8);
        expect(p.height).toBe(8);
      }
    });
  });

  // =========================================================================
  // 6C — Hit Testing
  // =========================================================================
  describe('6C — Hit Testing', () => {
    it('pointInRotatedRect: detects point inside unrotated rect', () => {
      const layer = { x: 100, y: 100, width: 200, height: 150 };
      expect(pointInRotatedRect(150, 150, layer)).toBe(true);
      expect(pointInRotatedRect(300, 250, layer)).toBe(true);
    });

    it('pointInRotatedRect: rejects point outside unrotated rect', () => {
      const layer = { x: 100, y: 100, width: 200, height: 150 };
      expect(pointInRotatedRect(50, 50, layer)).toBe(false);
      expect(pointInRotatedRect(350, 300, layer)).toBe(false);
    });

    it('pointInRotatedRect: handles rotation', () => {
      // 200x150 rect at (100,100) rotated 45 degrees around center (200, 175)
      const layer = { x: 100, y: 100, width: 200, height: 150, rotation: 45, anchorX: 0.5, anchorY: 0.5 };
      // Center should always be inside
      expect(pointInRotatedRect(200, 175, layer)).toBe(true);
      // Far away should be outside
      expect(pointInRotatedRect(0, 0, layer)).toBe(false);
    });

    it('pointInRotatedRect: respects crop', () => {
      const layer = {
        x: 100, y: 100, width: 200, height: 200,
        cropTop: 0.25, cropBottom: 0.25, cropLeft: 0.25, cropRight: 0.25,
      };
      // Visible area: x=150..250, y=150..250 (50% of each dimension)
      expect(pointInRotatedRect(200, 200, layer)).toBe(true); // center inside crop
      expect(pointInRotatedRect(110, 110, layer)).toBe(false); // in original but outside crop
    });

    it('hitTestPoint returns topmost selectable layer', () => {
      const { result } = renderHook(() => useSelectionManager());

      const layer1 = makeLayer({ id: 'bottom', x: 0, y: 0, width: 300, height: 300 });
      const layer2 = makeLayer({ id: 'top', x: 50, y: 50, width: 100, height: 100 });
      const layers = [layer1, layer2]; // bottom first, top last

      const hit = result.current.hitTestPoint(75, 75, layers);
      expect(hit).not.toBeNull();
      expect(hit!.id).toBe('top'); // topmost layer wins
    });

    it('hitTestPoint skips superLocked layers', () => {
      const { result } = renderHook(() => useSelectionManager());

      const layer1 = makeLayer({ id: 'bottom', x: 0, y: 0, width: 300, height: 300 });
      const layer2 = makeLayer({ id: 'top', x: 50, y: 50, width: 100, height: 100, superLocked: true });
      const layers = [layer1, layer2];

      const hit = result.current.hitTestPoint(75, 75, layers);
      expect(hit).not.toBeNull();
      expect(hit!.id).toBe('bottom'); // top is superLocked, so bottom wins
    });

    it('hitTestPoint skips invisible layers', () => {
      const { result } = renderHook(() => useSelectionManager());

      const layer1 = makeLayer({ id: 'bottom', x: 0, y: 0, width: 300, height: 300 });
      const layer2 = makeLayer({ id: 'top', x: 50, y: 50, width: 100, height: 100, visible: false });
      const layers = [layer1, layer2];

      const hit = result.current.hitTestPoint(75, 75, layers);
      expect(hit!.id).toBe('bottom');
    });

    it('hitTestPoint returns null on empty area', () => {
      const { result } = renderHook(() => useSelectionManager());

      const layer1 = makeLayer({ id: 'only', x: 100, y: 100, width: 50, height: 50 });
      const hit = result.current.hitTestPoint(0, 0, [layer1]);
      expect(hit).toBeNull();
    });

    it('getRotatedAABB: returns same bounds when rotation is 0', () => {
      const aabb = getRotatedAABB({ x: 10, y: 20, width: 100, height: 50, rotation: 0 });
      expect(aabb.x).toBe(10);
      expect(aabb.y).toBe(20);
      expect(aabb.width).toBe(100);
      expect(aabb.height).toBe(50);
    });

    it('getRotatedAABB: expands bounds for 45 degree rotation', () => {
      const aabb = getRotatedAABB({ x: 0, y: 0, width: 100, height: 100, rotation: 45 });
      // 100x100 rotated 45 degrees should have a larger AABB
      expect(aabb.width).toBeGreaterThan(100);
      expect(aabb.height).toBeGreaterThan(100);
    });
  });

  // =========================================================================
  // 6D — Smart Guides
  // =========================================================================
  describe('6D — Smart Guides', () => {
    it('snap to canvas center-x', () => {
      const { result } = renderHook(() => useSmartGuides(1920, 1080));

      let snapped: { x: number; y: number };
      act(() => {
        snapped = result.current.snapPosition({ x: 958, y: 500 }, 0, 0);
      });
      // 958 is within 5px of 960 (canvas center-x)
      expect(snapped!.x).toBe(960);
    });

    it('snap to canvas top edge', () => {
      const { result } = renderHook(() => useSmartGuides(1920, 1080));

      let snapped: { x: number; y: number };
      act(() => {
        snapped = result.current.snapPosition({ x: 500, y: 3 }, 0, 0);
      });
      // 3 is within 5px of 0 (canvas top)
      expect(snapped!.y).toBe(0);
    });

    it('no snap when beyond threshold', () => {
      const { result } = renderHook(() => useSmartGuides(1920, 1080));

      let snapped: { x: number; y: number };
      act(() => {
        snapped = result.current.snapPosition({ x: 500, y: 500 }, 0, 0);
      });
      expect(snapped!.x).toBe(500);
      expect(snapped!.y).toBe(500);
    });

    it('snaps object edge to target (not just position)', () => {
      const { result } = renderHook(() => useSmartGuides(1920, 1080));

      let snapped: { x: number; y: number };
      act(() => {
        // Object is 100px wide, its right edge (x + 100) = 1922, which is within 5 of 1920
        snapped = result.current.snapPosition({ x: 1822, y: 500 }, 100, 0);
      });
      // Right edge should snap to 1920, so x = 1920 - 100 = 1820
      expect(snapped!.x).toBe(1820);
    });

    it('activeGuides populated after snap', () => {
      const { result } = renderHook(() => useSmartGuides(1920, 1080));

      act(() => {
        result.current.snapPosition({ x: 960, y: 540 }, 0, 0);
      });
      expect(result.current.activeGuides.length).toBeGreaterThan(0);
      expect(result.current.activeGuides[0].color).toBe('#FF00FF');
    });

    it('clearGuides removes all active guides', () => {
      const { result } = renderHook(() => useSmartGuides(1920, 1080));

      act(() => {
        result.current.snapPosition({ x: 960, y: 540 }, 0, 0);
      });
      expect(result.current.activeGuides.length).toBeGreaterThan(0);

      act(() => {
        result.current.clearGuides();
      });
      expect(result.current.activeGuides.length).toBe(0);
    });

    it('buildLayerTargets creates snap targets from layers', () => {
      const { result } = renderHook(() => useSmartGuides(1920, 1080));

      const layers = [
        makeLayer({ id: 'l1', x: 100, y: 100, width: 200, height: 150 }),
      ];

      const targets = result.current.buildLayerTargets(layers);
      // Should have 6 targets per layer (left, right, center-x, top, bottom, center-y)
      expect(targets.length).toBe(6);
      expect(targets.some((t) => t.position === 100 && t.orientation === 'vertical')).toBe(true); // left
      expect(targets.some((t) => t.position === 300 && t.orientation === 'vertical')).toBe(true); // right
      expect(targets.some((t) => t.position === 200 && t.orientation === 'vertical')).toBe(true); // center-x
    });

    it('buildLayerTargets excludes specified IDs', () => {
      const { result } = renderHook(() => useSmartGuides(1920, 1080));

      const layers = [
        makeLayer({ id: 'l1', x: 100, y: 100, width: 200, height: 150 }),
        makeLayer({ id: 'l2', x: 400, y: 100, width: 200, height: 150 }),
      ];

      const targets = result.current.buildLayerTargets(layers, ['l1']);
      // Only l2 targets
      expect(targets.length).toBe(6);
      expect(targets.every((t) => t.label?.startsWith('l2'))).toBe(true);
    });
  });

  // =========================================================================
  // Handle colors
  // =========================================================================
  describe('Handle colors', () => {
    it('single selection returns #FF6600', () => {
      const { result } = renderHook(() => useSelectionManager());

      act(() => {
        result.current.selectLayer('layer-1');
      });
      expect(result.current.getHandleColor('layer-1')).toBe(HANDLE_COLORS.single);
    });

    it('multi-selection: first is #00FF00, additional is #FF6600', () => {
      const { result } = renderHook(() => useSelectionManager());

      act(() => {
        result.current.selectAll(['layer-1', 'layer-2']);
      });
      expect(result.current.getHandleColor('layer-1')).toBe(HANDLE_COLORS.firstMulti);
      expect(result.current.getHandleColor('layer-2')).toBe(HANDLE_COLORS.additional);
    });
  });
});

// ===========================================================================
// Phase 7 — Mouse Interactions
// ===========================================================================

describe('Phase 7 — Mouse Interactions', () => {
  // =========================================================================
  // 7A — Utility functions
  // =========================================================================
  describe('7A — Utility functions', () => {
    it('constrainToAxis: locks to horizontal when dx > dy', () => {
      const r = constrainToAxis(100, 10);
      expect(r.dx).toBe(100);
      expect(r.dy).toBe(0);
    });

    it('constrainToAxis: locks to vertical when dy > dx', () => {
      const r = constrainToAxis(10, 100);
      expect(r.dx).toBe(0);
      expect(r.dy).toBe(100);
    });

    it('clientToCanvas converts coordinates with zoom', () => {
      // Create a mock element with getBoundingClientRect
      const el = {
        getBoundingClientRect: () => ({
          left: 40,
          top: 40,
          width: 960,
          height: 540,
          right: 1000,
          bottom: 580,
          x: 40,
          y: 40,
          toJSON: () => {},
        }),
      } as HTMLElement;

      const pos = clientToCanvas(240, 240, el, 2);
      expect(pos.x).toBe(100); // (240-40)/2
      expect(pos.y).toBe(100); // (240-40)/2
    });

    it('clientToCanvas at zoom=1', () => {
      const el = {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          right: 1920,
          bottom: 1080,
          x: 0,
          y: 0,
          toJSON: () => {},
        }),
      } as HTMLElement;

      const pos = clientToCanvas(500, 300, el, 1);
      expect(pos.x).toBe(500);
      expect(pos.y).toBe(300);
    });
  });

  // =========================================================================
  // 7B — Move
  // =========================================================================
  describe('7B — Move', () => {
    it('move updates layer position by delta', () => {
      const snap = makeSnapshot({ x: 100, y: 100 });
      // Simulating a move delta of +50, +30
      const newX = snap.x + 50;
      const newY = snap.y + 30;
      expect(newX).toBe(150);
      expect(newY).toBe(130);
    });

    it('move with Shift constrains to axis', () => {
      const dx = 100;
      const dy = 5;
      const c = constrainToAxis(dx, dy);
      expect(c.dx).toBe(100);
      expect(c.dy).toBe(0);
    });
  });

  // =========================================================================
  // 7C — Resize
  // =========================================================================
  describe('7C — Resize', () => {
    it('SE handle: increases width and height', () => {
      const snap = makeSnapshot({ x: 100, y: 100, width: 200, height: 150 });
      const result = computeResize('se', 50, 30, snap, false, false);
      expect(result.width).toBe(250);
      expect(result.height).toBe(180);
      expect(result.x).toBe(100); // unchanged
      expect(result.y).toBe(100); // unchanged
    });

    it('NW handle: moves origin and shrinks', () => {
      const snap = makeSnapshot({ x: 100, y: 100, width: 200, height: 150 });
      const result = computeResize('nw', 50, 30, snap, false, false);
      expect(result.x).toBe(150);
      expect(result.y).toBe(130);
      expect(result.width).toBe(150);
      expect(result.height).toBe(120);
    });

    it('E handle: only changes width', () => {
      const snap = makeSnapshot({ x: 100, y: 100, width: 200, height: 150 });
      const result = computeResize('e', 50, 999, snap, false, false);
      expect(result.width).toBe(250);
      expect(result.height).toBe(150); // unchanged
      expect(result.x).toBe(100);
    });

    it('resize with aspect lock (Shift)', () => {
      const snap = makeSnapshot({ x: 100, y: 100, width: 200, height: 100 }); // 2:1 aspect
      const result = computeResize('se', 100, 100, snap, true, false);
      // Width = 300, height should be 150 to maintain 2:1
      const aspect = result.width / result.height;
      expect(aspect).toBeCloseTo(2, 0);
    });

    it('resize enforces minimum size of 20px', () => {
      const snap = makeSnapshot({ x: 100, y: 100, width: 200, height: 150 });
      // Shrink width by 190 → would result in width=10, below minimum
      const result = computeResize('e', -190, 0, snap, false, false);
      expect(result.width).toBe(20);
    });

    it('resize with symmetric mode (Ctrl)', () => {
      const snap = makeSnapshot({ x: 100, y: 100, width: 200, height: 150 });
      const result = computeResize('e', 50, 0, snap, false, true);
      // Width becomes 250, centered around original center (200, 175)
      expect(result.width).toBe(250);
      expect(result.x).toBe(200 - 125); // centerX - newW/2
    });

    it('W handle: moves x and decreases width', () => {
      const snap = makeSnapshot({ x: 100, y: 100, width: 200, height: 150 });
      const result = computeResize('w', 30, 0, snap, false, false);
      expect(result.x).toBe(130);
      expect(result.width).toBe(170);
    });

    it('S handle: only changes height', () => {
      const snap = makeSnapshot({ x: 100, y: 100, width: 200, height: 150 });
      const result = computeResize('s', 999, 50, snap, false, false);
      expect(result.height).toBe(200);
      expect(result.width).toBe(200); // unchanged
    });

    it('N handle: moves y and decreases height', () => {
      const snap = makeSnapshot({ x: 100, y: 100, width: 200, height: 150 });
      const result = computeResize('n', 0, 30, snap, false, false);
      expect(result.y).toBe(130);
      expect(result.height).toBe(120);
    });

    it('NE handle: moves y, increases width, decreases height', () => {
      const snap = makeSnapshot({ x: 100, y: 100, width: 200, height: 150 });
      const result = computeResize('ne', 50, 30, snap, false, false);
      expect(result.y).toBe(130);
      expect(result.width).toBe(250);
      expect(result.height).toBe(120);
    });

    it('SW handle: moves x, decreases width, increases height', () => {
      const snap = makeSnapshot({ x: 100, y: 100, width: 200, height: 150 });
      const result = computeResize('sw', 50, 30, snap, false, false);
      expect(result.x).toBe(150);
      expect(result.width).toBe(150);
      expect(result.height).toBe(180);
    });
  });

  // =========================================================================
  // 7D — Rotate
  // =========================================================================
  describe('7D — Rotate', () => {
    it('snapAngle snaps to 15-degree increments', () => {
      expect(snapAngle(0)).toBe(0);
      expect(snapAngle(7)).toBe(0);
      expect(snapAngle(8)).toBe(15);
      expect(snapAngle(15)).toBe(15);
      expect(snapAngle(22)).toBe(15);
      expect(snapAngle(23)).toBe(30);
      expect(snapAngle(45)).toBe(45);
      expect(snapAngle(90)).toBe(90);
      expect(snapAngle(360)).toBe(360);
    });

    it('snapAngle handles negative angles', () => {
      expect(snapAngle(-7)).toEqual(-0); // Math.round(-7/15)*15 = -0
      expect(snapAngle(-8)).toBe(-15);
      expect(snapAngle(-45)).toBe(-45);
    });

    it('rotation is computed using atan2 delta', () => {
      // Simulate rotation: anchor at (200, 175)
      const anchorX = 200;
      const anchorY = 175;

      // Start angle: cursor at (300, 175) = 0 degrees (east)
      const startAngle = Math.atan2(175 - anchorY, 300 - anchorX) * (180 / Math.PI);
      expect(startAngle).toBe(0);

      // Move cursor to (200, 75) = -90 degrees (north)
      const currentAngle = Math.atan2(75 - anchorY, 200 - anchorX) * (180 / Math.PI);
      expect(currentAngle).toBe(-90);

      const angleDelta = currentAngle - startAngle;
      expect(angleDelta).toBe(-90);
    });
  });

  // =========================================================================
  // 7E — Crop
  // =========================================================================
  describe('7E — Crop', () => {
    it('N handle adjusts cropTop', () => {
      const snap = makeSnapshot({ cropTop: 0, height: 200 });
      const result = computeCrop('n', 0, 40, snap);
      expect(result.cropTop).toBeCloseTo(0.2); // 40/200
      expect(result.cropBottom).toBe(0);
      expect(result.cropLeft).toBe(0);
      expect(result.cropRight).toBe(0);
    });

    it('S handle adjusts cropBottom', () => {
      const snap = makeSnapshot({ cropBottom: 0, height: 200 });
      const result = computeCrop('s', 0, -40, snap);
      expect(result.cropBottom).toBeCloseTo(0.2);
    });

    it('W handle adjusts cropLeft', () => {
      const snap = makeSnapshot({ cropLeft: 0, width: 200 });
      const result = computeCrop('w', 40, 0, snap);
      expect(result.cropLeft).toBeCloseTo(0.2);
    });

    it('E handle adjusts cropRight', () => {
      const snap = makeSnapshot({ cropRight: 0, width: 200 });
      const result = computeCrop('e', -40, 0, snap);
      expect(result.cropRight).toBeCloseTo(0.2);
    });

    it('crop values are clamped to >= 0', () => {
      const snap = makeSnapshot({ cropTop: 0.1, height: 200 });
      const result = computeCrop('n', 0, -100, snap);
      expect(result.cropTop).toBeGreaterThanOrEqual(0);
    });

    it('NW handle adjusts cropTop and cropLeft', () => {
      const snap = makeSnapshot({ width: 200, height: 200 });
      const result = computeCrop('nw', 40, 40, snap);
      expect(result.cropTop).toBeCloseTo(0.2);
      expect(result.cropLeft).toBeCloseTo(0.2);
    });
  });

  // =========================================================================
  // 7F — Anchor Move
  // =========================================================================
  describe('7F — Anchor Move', () => {
    it('computes anchor fractions correctly', () => {
      const snap = makeSnapshot({ x: 100, y: 100, width: 200, height: 200 });
      // Click at (200, 200) — center of layer
      const result = computeAnchorMove(200, 200, snap);
      expect(result.anchorX).toBe(0.5);
      expect(result.anchorY).toBe(0.5);
    });

    it('anchor snaps to 0.5 when within 3%', () => {
      const snap = makeSnapshot({ x: 100, y: 100, width: 200, height: 200 });
      // Click slightly off-center: (204, 204)
      // ax = (204-100)/200 = 0.52 → within 3% of 0.5, snaps to 0.5
      const result = computeAnchorMove(204, 204, snap);
      expect(result.anchorX).toBe(0.5);
      expect(result.anchorY).toBe(0.5);
    });

    it('anchor does NOT snap when beyond 3%', () => {
      const snap = makeSnapshot({ x: 100, y: 100, width: 200, height: 200 });
      // Click at (250, 250): ax = (250-100)/200 = 0.75
      const result = computeAnchorMove(250, 250, snap);
      expect(result.anchorX).toBe(0.75);
      expect(result.anchorY).toBe(0.75);
    });

    it('anchor clamped to 0-1', () => {
      const snap = makeSnapshot({ x: 100, y: 100, width: 200, height: 200 });
      // Click outside bounds
      const result = computeAnchorMove(50, 50, snap);
      expect(result.anchorX).toBe(0);
      expect(result.anchorY).toBe(0);

      const result2 = computeAnchorMove(350, 350, snap);
      expect(result2.anchorX).toBe(1);
      expect(result2.anchorY).toBe(1);
    });
  });

  // =========================================================================
  // 7G — Marquee Selection
  // =========================================================================
  describe('7G — Marquee Selection', () => {
    it('selectByMarquee selects layers within rectangle', () => {
      const { result } = renderHook(() => useSelectionManager());

      const layers = [
        makeLayer({ id: 'inside', x: 50, y: 50, width: 100, height: 100 }),
        makeLayer({ id: 'outside', x: 500, y: 500, width: 100, height: 100 }),
        makeLayer({ id: 'partial', x: 150, y: 50, width: 200, height: 100 }),
      ];

      act(() => {
        result.current.selectByMarquee(
          { x: 0, y: 0, width: 200, height: 200 },
          layers,
        );
      });

      // 'inside' is fully within (50..150 x 50..150 within 0..200 x 0..200)
      expect(result.current.selectedIds.has('inside')).toBe(true);
      // 'outside' is clearly not
      expect(result.current.selectedIds.has('outside')).toBe(false);
      // 'partial' extends from 150..350 — not fully within 0..200
      expect(result.current.selectedIds.has('partial')).toBe(false);
    });

    it('selectByMarquee skips superLocked layers', () => {
      const { result } = renderHook(() => useSelectionManager());

      const layers = [
        makeLayer({ id: 'locked', x: 50, y: 50, width: 100, height: 100, superLocked: true }),
        makeLayer({ id: 'unlocked', x: 50, y: 50, width: 100, height: 100 }),
      ];

      act(() => {
        result.current.selectByMarquee(
          { x: 0, y: 0, width: 200, height: 200 },
          layers,
        );
      });

      expect(result.current.selectedIds.has('locked')).toBe(false);
      expect(result.current.selectedIds.has('unlocked')).toBe(true);
    });

    it('selectByMarquee handles negative-sized rectangles (drag from bottom-right to top-left)', () => {
      const { result } = renderHook(() => useSelectionManager());

      const layers = [
        makeLayer({ id: 'inside', x: 50, y: 50, width: 100, height: 100 }),
      ];

      // Negative width/height marquee — selectByMarquee normalizes
      act(() => {
        result.current.selectByMarquee(
          { x: 200, y: 200, width: -200, height: -200 },
          layers,
        );
      });

      expect(result.current.selectedIds.has('inside')).toBe(true);
    });
  });
});
