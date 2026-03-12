import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Ruler, RulerCorner } from './Ruler';
import { GridOverlay } from './GridOverlay';
import { MarkerGuideOverlay } from './MarkerGuideOverlay';
import type { Guide } from './MarkerGuideOverlay';
import { MarqueeOverlay } from './MarqueeOverlay';
import { ShapePreviewOverlay } from './ShapePreviewOverlay';
import type { MarqueeRect } from './MarqueeOverlay';
import { HandleOverlay } from './HandleOverlay';
import type { Bounds } from './HandleOverlay';
import { useUiStore } from '../../stores/uiStore';
import { useDocumentStore } from '../../stores/documentStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { compositeAllLayers } from '../../engine/compositor';
import { getShapeTightBounds } from '../../engine/shapeRenderer';
import { useSelectionManager } from '../../hooks/useSelectionManager';
import { useSmartGuides } from '../../hooks/useSmartGuides';
import { useCanvasInteraction, clientToCanvas } from '../../hooks/useCanvasInteraction';
import type { ActiveTool } from '../../types/index';
import {
  createDefaultLayer,
  createDefaultShapeProperties,
  cloneLayer,
  getUniqueLayerName,
} from '../../types/index';
import type { ShapeType } from '../../types/enums';
import type { LayerModel } from '../../types/LayerModel';

export interface CanvasViewportProps {
  /** Optional initial zoom level. */
  initialZoom?: number;
  /** Optional canvas width (default 1920). */
  canvasWidth?: number;
  /** Optional canvas height (default 1080). */
  canvasHeight?: number;
  /** Guides for the marker guide overlay. */
  guides?: Guide[];
  /** Active marquee selection rectangle. */
  marqueeRect?: MarqueeRect | null;
  /** Selected object bounds for handle overlay. */
  selectedBounds?: Bounds | null;
  /** Active tool name for the indicator. */
  activeTool?: string;
}

const CANVAS_MARGIN = 40;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5.0;
const ZOOM_STEP = 0.1;

/** Human-readable labels for active tools. */
const TOOL_LABELS: Record<ActiveTool, string> = {
  select: 'Select Tool',
  text: 'Text Tool',
  shape: 'Shape Tool',
  eraser: 'Eraser Tool',
  blurBrush: 'Blur Brush',
  pan: 'Pan Tool',
  eyedropper: 'Eyedropper',
};

function clampZoom(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

/**
 * Main canvas viewport container.
 *
 * Assembles rulers, corner piece, and all overlays into a unified canvas area
 * with scroll support. Wired to uiStore and documentStore for live state.
 */
export function CanvasViewport({
  initialZoom,
  canvasWidth: propCanvasWidth,
  canvasHeight: propCanvasHeight,
  guides = [],
  marqueeRect: propMarqueeRect = null,
  selectedBounds: propSelectedBounds = null,
  activeTool: propActiveTool,
}: CanvasViewportProps) {
  // ---------------------------------------------------------------------------
  // Store subscriptions
  // ---------------------------------------------------------------------------
  const storeZoom = useUiStore((s) => s.zoom);
  const setStoreZoom = useUiStore((s) => s.setZoom);
  const gridVisible = useUiStore((s) => s.gridVisible);
  const storeActiveTool = useUiStore((s) => s.activeTool);

  const project = useDocumentStore((s) => s.project);
  const layers = project.layers;
  const storeCanvasWidth = project.canvasWidth;
  const storeCanvasHeight = project.canvasHeight;
  const backgroundColor = project.backgroundColor;
  const storeSelectedLayerIds = useDocumentStore((s) => s.selectedLayerIds);
  const storeSelectLayer = useDocumentStore((s) => s.selectLayer);
  const storeSetSelectedLayerIds = useDocumentStore((s) => s.setSelectedLayerIds);
  const storeToggleSelection = useDocumentStore((s) => s.toggleSelection);
  const storeDeselectAll = useDocumentStore((s) => s.deselectAll);
  const storeUpdateLayer = useDocumentStore((s) => s.updateLayer);

  const storeAddLayer = useDocumentStore((s) => s.addLayer);
  const storeAddLayerAtIndex = useDocumentStore((s) => s.addLayerAtIndex);
  const storePushUndo = useDocumentStore((s) => s.pushUndo);

  const takeSnapshot = useUndoRedoStore((s) => s.takeSnapshot);

  // Shape drawing state
  const selectedShapeType = useUiStore((s) => s.selectedShapeType);
  const drawFillColor = useUiStore((s) => s.drawFillColor);
  const drawStrokeColor = useUiStore((s) => s.drawStrokeColor);
  const setActiveTool = useUiStore((s) => s.setActiveTool);

  // Prefer store values; fall back to props for backwards-compat / tests
  const zoom = initialZoom !== undefined ? initialZoom : storeZoom;
  const canvasWidth = propCanvasWidth ?? storeCanvasWidth;
  const canvasHeight = propCanvasHeight ?? storeCanvasHeight;
  const activeToolId = storeActiveTool;
  const activeToolLabel =
    propActiveTool ?? TOOL_LABELS[activeToolId] ?? activeToolId;

  // ---------------------------------------------------------------------------
  // Selection manager
  // ---------------------------------------------------------------------------
  const selectionManager = useSelectionManager();

  // ---------------------------------------------------------------------------
  // Smart guides
  // ---------------------------------------------------------------------------
  const smartGuides = useSmartGuides(canvasWidth, canvasHeight);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasSurfaceRef = useRef<HTMLDivElement>(null);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // ---------------------------------------------------------------------------
  // Get selected layers helper
  // ---------------------------------------------------------------------------
  const getSelectedLayers = useCallback((): import('../../types/LayerModel').LayerModel[] => {
    const selectedSet = new Set(storeSelectedLayerIds);
    return layers.filter((l) => selectedSet.has(l.id));
  }, [layers, storeSelectedLayerIds]);

  // ---------------------------------------------------------------------------
  // Hit test wrapper using selection manager
  // ---------------------------------------------------------------------------
  const hitTestPoint = useCallback(
    (px: number, py: number) => {
      // Read layers fresh from store to avoid stale closure after layer creation
      const currentLayers = useDocumentStore.getState().project.layers;
      return selectionManager.hitTestPoint(px, py, currentLayers);
    },
    [selectionManager],
  );

  // ---------------------------------------------------------------------------
  // Select by marquee wrapper
  // ---------------------------------------------------------------------------
  const handleSelectByMarquee = useCallback(
    (rect: { x: number; y: number; width: number; height: number }) => {
      // Read layers fresh from store to avoid stale closure after layer creation
      const currentLayers = useDocumentStore.getState().project.layers;
      // Use returned ids directly (React state setter is async, so selectedIds would be stale)
      const ids = selectionManager.selectByMarquee(rect, currentLayers);
      storeSetSelectedLayerIds(ids);
    },
    [selectionManager, storeSetSelectedLayerIds],
  );

  // ---------------------------------------------------------------------------
  // Shape drawn callback: creates shape layer at drawn rect, switches to select
  // ---------------------------------------------------------------------------
  const handleShapeDrawn = useCallback(
    (rect: { x: number; y: number; width: number; height: number }) => {
      storePushUndo();
      const sides = useUiStore.getState().drawPolygonSides;
      const isPolygon = selectedShapeType === 'rectangle' && sides !== 4;

      const props = createDefaultShapeProperties();
      props.shapeType = isPolygon ? 'polygon' : (selectedShapeType as ShapeType);
      props.polygonSides = sides;
      props.fillColor = drawFillColor;
      props.borderColor = drawStrokeColor;

      // Auto-name by polygon sides
      const POLYGON_NAMES: Record<number, string> = {
        3: 'Triangle', 4: 'Rectangle', 5: 'Pentagon', 6: 'Hexagon',
        7: 'Heptagon', 8: 'Octagon', 9: 'Nonagon', 10: 'Decagon',
        11: 'Hendecagon', 12: 'Dodecagon',
      };
      const baseName = isPolygon
        ? (POLYGON_NAMES[sides] ?? `Polygon (${sides})`)
        : `Shape (${selectedShapeType})`;
      const layers = useDocumentStore.getState().project.layers;
      const shapeName = getUniqueLayerName(baseName, layers);

      const layer = createDefaultLayer({
        type: 'shape',
        name: shapeName,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        shapeProperties: props,
      });
      storeAddLayer(layer);
      storeSelectLayer(layer.id);
      // Reset polygon sides for next drawing and switch to select tool
      useUiStore.getState().setDrawPolygonSides(4);
      setActiveTool('select');
    },
    [selectedShapeType, drawFillColor, drawStrokeColor, storePushUndo, storeAddLayer, storeSelectLayer, setActiveTool],
  );

  // ---------------------------------------------------------------------------
  // Ctrl+drag duplicate callback: clones the layer and adds it to the store
  // ---------------------------------------------------------------------------
  const handleDuplicateLayer = useCallback(
    (layer: LayerModel): LayerModel | null => {
      storePushUndo();
      const clone = cloneLayer(layer);
      // Insert above the source layer
      const layers = useDocumentStore.getState().project.layers;
      const sourceIdx = layers.findIndex((l) => l.id === layer.id);
      if (sourceIdx !== -1) {
        storeAddLayerAtIndex(clone, sourceIdx);
      } else {
        storeAddLayer(clone);
      }
      return clone;
    },
    [storePushUndo, storeAddLayer, storeAddLayerAtIndex],
  );

  // ---------------------------------------------------------------------------
  // Canvas interaction hook
  // ---------------------------------------------------------------------------
  const interaction = useCanvasInteraction({
    getSelectedLayers,
    updateLayer: storeUpdateLayer,
    hitTestPoint,
    selectLayer: storeSelectLayer,
    toggleSelection: storeToggleSelection,
    deselectAll: storeDeselectAll,
    selectByMarquee: handleSelectByMarquee,
    takeSnapshot,
    smartGuides,
    canvasSurfaceRef: canvasSurfaceRef as React.RefObject<HTMLElement | null>,
    gridVisible,
    selectedLayerIds: storeSelectedLayerIds,
    zoom,
    activeTool: activeToolId,
    onShapeDrawn: handleShapeDrawn,
    onDuplicateLayer: handleDuplicateLayer,
  });

  // ---------------------------------------------------------------------------
  // Keyboard: up/down arrow to adjust polygon sides during shape drawing
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // Only during active shape drawing with rectangle tool
      if (interaction.dragMode !== 'drawShape') return;
      const shapeType = useUiStore.getState().selectedShapeType;
      if (shapeType !== 'rectangle') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const current = useUiStore.getState().drawPolygonSides;
        useUiStore.getState().setDrawPolygonSides(current - 1); // min 3 enforced in store
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const current = useUiStore.getState().drawPolygonSides;
        useUiStore.getState().setDrawPolygonSides(current + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [interaction.dragMode]);

  // ---------------------------------------------------------------------------
  // Compute selection bounds
  // ---------------------------------------------------------------------------
  const computedSelectedBounds = useMemo((): Bounds | null => {
    if (storeSelectedLayerIds.length === 0) return null;

    // Expand group selections: replace group IDs with their children's bounds
    const effectiveIds = new Set<string>();
    for (const id of storeSelectedLayerIds) {
      const layer = layers.find((l) => l.id === id);
      if (!layer) continue;
      if (layer.type === 'group') {
        // Add all children (recursively) instead of the group itself
        const addChildren = (parentId: string) => {
          for (const child of layers) {
            if (child.parentGroupId === parentId) {
              if (child.type === 'group') {
                addChildren(child.id);
              } else {
                effectiveIds.add(child.id);
              }
            }
          }
        };
        addChildren(id);
      } else {
        effectiveIds.add(id);
      }
    }

    // Empty group(s) with no children → no handles
    if (effectiveIds.size === 0) return null;

    const boundsMap = new Map<string, import('../../hooks/useSelectionManager').LayerBounds>();
    for (const layer of layers) {
      if (effectiveIds.has(layer.id)) {
        boundsMap.set(layer.id, {
          id: layer.id,
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: layer.height,
          rotation: layer.rotation,
        });
      }
    }

    const bounds = selectionManager.getSelectedBounds(boundsMap);
    if (!bounds) return null;

    // For single non-group selection, include rotation and anchor
    if (storeSelectedLayerIds.length === 1 && effectiveIds.size === 1) {
      const layer = layers.find((l) => l.id === [...effectiveIds][0]);
      if (layer) {
        const ax = layer.anchorX ?? 0.5;
        const ay = layer.anchorY ?? 0.5;

        // For shape layers, use tight bounds around actual geometry
        if (layer.type === 'shape' && layer.shapeProperties) {
          const tight = getShapeTightBounds(
            layer.shapeProperties.shapeType,
            layer.width,
            layer.height,
            layer.shapeProperties.polygonSides,
          );
          if (
            tight.x > 0 ||
            tight.y > 0 ||
            tight.width < layer.width ||
            tight.height < layer.height
          ) {
            return {
              ...bounds,
              x: layer.x + tight.x,
              y: layer.y + tight.y,
              width: tight.width,
              height: tight.height,
              rotation: layer.rotation,
              anchorX: (layer.width * ax - tight.x) / tight.width,
              anchorY: (layer.height * ay - tight.y) / tight.height,
            };
          }
        }

        return {
          ...bounds,
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: layer.height,
          rotation: layer.rotation,
          anchorX: layer.anchorX,
          anchorY: layer.anchorY,
        };
      }
    }

    return bounds;
  }, [storeSelectedLayerIds, layers, selectionManager]);

  const effectiveSelectedBounds = propSelectedBounds ?? computedSelectedBounds;
  const effectiveMarqueeRect = propMarqueeRect ?? interaction.marqueeRect;

  // Selected layers for HandleOverlay
  const selectedLayersForOverlay = useMemo(() => {
    const selectedSet = new Set(storeSelectedLayerIds);
    return layers.filter((l) => selectedSet.has(l.id));
  }, [layers, storeSelectedLayerIds]);

  // ---------------------------------------------------------------------------
  // Scroll position state (for rulers)
  // ---------------------------------------------------------------------------
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      setScrollPosition({ x: el.scrollLeft, y: el.scrollTop });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Pan with Space+Drag
  // ---------------------------------------------------------------------------
  const [isPanning, setIsPanning] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const panStart = useRef({ x: 0, y: 0, scrollX: 0, scrollY: 0 });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        setSpaceDown(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (spaceDown) {
        setIsPanning(true);
        const el = scrollRef.current;
        if (el) {
          panStart.current = {
            x: e.clientX,
            y: e.clientY,
            scrollX: el.scrollLeft,
            scrollY: el.scrollTop,
          };
        }
        return;
      }
      // Delegate to interaction handler
      interaction.handleMouseDown(e);
    },
    [spaceDown, interaction],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const el = scrollRef.current;
        if (el) {
          const dx = e.clientX - panStart.current.x;
          const dy = e.clientY - panStart.current.y;
          el.scrollLeft = panStart.current.scrollX - dx;
          el.scrollTop = panStart.current.scrollY - dy;
        }
        return;
      }
      // Delegate to interaction handler
      interaction.handleMouseMove(e);
    },
    [isPanning, interaction],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      setIsPanning(false);
      if (!spaceDown) {
        interaction.handleMouseUp(e);
      }
    },
    [spaceDown, interaction],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      interaction.handleDoubleClick(e);
    },
    [interaction],
  );

  // ---------------------------------------------------------------------------
  // Ctrl+Scroll Wheel zoom
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();

      const direction = e.deltaY < 0 ? 1 : -1;
      const currentZoom = useUiStore.getState().zoom;
      const newZoom = clampZoom(currentZoom + direction * ZOOM_STEP);

      // Zoom towards mouse position as anchor
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + el.scrollLeft;
      const mouseY = e.clientY - rect.top + el.scrollTop;

      const ratio = newZoom / currentZoom;
      setStoreZoom(newZoom);

      // Adjust scroll to keep mouse position stable
      requestAnimationFrame(() => {
        el.scrollLeft = mouseX * ratio - (e.clientX - rect.left);
        el.scrollTop = mouseY * ratio - (e.clientY - rect.top);
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setStoreZoom]);

  // ---------------------------------------------------------------------------
  // Mouse wheel layer cycling (plain scroll over objects)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheelCycle = (e: WheelEvent) => {
      // Only act on plain wheel (no Ctrl = zoom, no Shift, no Alt)
      if (e.ctrlKey || e.metaKey) return;

      const currentZoom = useUiStore.getState().zoom;
      const canvasPos = clientToCanvas(e.clientX, e.clientY, canvasSurfaceRef.current, currentZoom);
      const currentLayers = useDocumentStore.getState().project.layers;
      const hits = selectionManager.hitTestAll(canvasPos.x, canvasPos.y, currentLayers);

      // Only cycle if there are objects under the cursor
      if (hits.length === 0) return;

      e.preventDefault();

      const currentSelectedIds = useDocumentStore.getState().selectedLayerIds;
      // Find which hit layer is currently selected (if any)
      const currentIdx = hits.findIndex((l) => currentSelectedIds.includes(l.id));

      let nextLayer: typeof hits[0];
      if (e.deltaY > 0) {
        // Scroll down = deeper layer
        if (currentIdx === -1) {
          nextLayer = hits[0]; // Select topmost
        } else {
          nextLayer = hits[(currentIdx + 1) % hits.length]; // Next deeper, wrap
        }
      } else {
        // Scroll up = higher layer
        if (currentIdx === -1) {
          nextLayer = hits[hits.length - 1]; // Select bottommost
        } else {
          nextLayer = hits[(currentIdx - 1 + hits.length) % hits.length]; // Next higher, wrap
        }
      }

      storeSelectLayer(nextLayer.id);
    };

    el.addEventListener('wheel', onWheelCycle, { passive: false });
    return () => el.removeEventListener('wheel', onWheelCycle);
  }, [selectionManager, storeSelectLayer]);

  // ---------------------------------------------------------------------------
  // Render loop: composite layers onto <canvas>
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const renderFrame = () => {
      if (!mounted) return;

      const displayCanvas = renderCanvasRef.current;
      if (displayCanvas) {
        const offscreen = compositeAllLayers(
          layers,
          canvasWidth,
          canvasHeight,
          backgroundColor,
          1, // render at 1x scale; CSS zoom handles display scaling
          100,
          false, // apply all effects including filters
        );

        displayCanvas.width = offscreen.width;
        displayCanvas.height = offscreen.height;
        const ctx = displayCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
          ctx.drawImage(offscreen, 0, 0);
        }
      }

      rafRef.current = requestAnimationFrame(renderFrame);
    };

    rafRef.current = requestAnimationFrame(renderFrame);

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [layers, canvasWidth, canvasHeight, backgroundColor]);

  // ---------------------------------------------------------------------------
  // Derived layout values
  // ---------------------------------------------------------------------------
  const scaledWidth = canvasWidth * zoom;
  const scaledHeight = canvasHeight * zoom;

  const cursorStyle = spaceDown
    ? isPanning
      ? 'grabbing'
      : 'grab'
    : interaction.cursor;

  // ---------------------------------------------------------------------------
  // Fit-to-screen helper (exposed via data attribute for external access)
  // ---------------------------------------------------------------------------
  const fitToScreen = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    const fitZoom = clampZoom(
      Math.min(vw / canvasWidth, vh / canvasHeight) * 0.95,
    );
    setStoreZoom(fitZoom);
  }, [canvasWidth, canvasHeight, setStoreZoom]);

  // Store fitToScreen on the scroll element for external triggering
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      (el as any).__fitToScreen = fitToScreen;
    }
  }, [fitToScreen]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      data-testid="canvas-viewport"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#1A1A1A',
        overflow: 'hidden',
      }}
    >
      {/* Top row: Corner + Horizontal ruler */}
      <div style={{ display: 'flex', flexShrink: 0 }}>
        <RulerCorner />
        <Ruler
          orientation="horizontal"
          zoom={zoom}
          scrollOffset={scrollPosition.x / zoom}
          canvasSize={canvasWidth}
        />
      </div>

      {/* Bottom row: Vertical ruler + Scrollable viewport */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Ruler
          orientation="vertical"
          zoom={zoom}
          scrollOffset={scrollPosition.y / zoom}
          canvasSize={canvasHeight}
        />

        {/* Scrollable viewport area */}
        <div
          ref={scrollRef}
          data-testid="canvas-scroll-area"
          style={{
            flex: 1,
            overflow: 'auto',
            position: 'relative',
            backgroundColor: '#1A1A1A',
            cursor: cursorStyle,
          }}
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        >
          {/* Inner sizer — provides scrollable extent */}
          <div
            style={{
              position: 'relative',
              width: scaledWidth + CANVAS_MARGIN * 2,
              height: scaledHeight + CANVAS_MARGIN * 2,
            }}
          >
            {/* Canvas surface with shadow — positioned with margin */}
            <div
              ref={canvasSurfaceRef}
              data-testid="canvas-surface"
              style={{
                position: 'absolute',
                left: CANVAS_MARGIN,
                top: CANVAS_MARGIN,
                width: scaledWidth,
                height: scaledHeight,
              }}
            >
              {/* Layer 1: DesignCanvas (background) */}
              <div
                data-testid="design-canvas"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: backgroundColor,
                  filter: 'drop-shadow(0 0 20px rgba(0, 0, 0, 0.5))',
                }}
              />

              {/* Layer 2: Rendered layer bitmap */}
              <canvas
                ref={renderCanvasRef}
                data-testid="render-canvas"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              />

              {/* Layer 3: GridOverlay */}
              <GridOverlay
                visible={gridVisible}
                zoom={zoom}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
              />

              {/* Layer 4: DimOverlay */}
              <div
                data-testid="dim-overlay"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0, 0, 0, 0)',
                  pointerEvents: 'none',
                }}
              />

              {/* Layer 5: PaddingOverlay (placeholder) */}
              <div
                data-testid="padding-overlay"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              />

              {/* Layer 6: MarkerGuideOverlay */}
              <MarkerGuideOverlay guides={guides} zoom={zoom} />

              {/* Layer 7: MarqueeOverlay (hidden during shape draw — preview replaces it) */}
              {interaction.dragMode !== 'drawShape' && (
                <MarqueeOverlay rect={effectiveMarqueeRect} zoom={zoom} />
              )}

              {/* Layer 7b: Live shape preview during drawing */}
              <ShapePreviewOverlay
                rect={effectiveMarqueeRect}
                zoom={zoom}
                isDrawing={interaction.dragMode === 'drawShape'}
              />

              {/* Layer 8: HandleOverlay */}
              <HandleOverlay
                selectedBounds={effectiveSelectedBounds}
                zoom={zoom}
                selectedLayers={selectedLayersForOverlay}
                allLayers={layers}
                isMultiSelect={storeSelectedLayerIds.length > 1}
              />

              {/* Layer 9: Smart Guide lines */}
              {smartGuides.activeGuides.map((guide, i) => (
                <div
                  key={`guide-${i}`}
                  data-testid="smart-guide"
                  style={{
                    position: 'absolute',
                    ...(guide.orientation === 'vertical'
                      ? {
                          left: guide.position * zoom,
                          top: 0,
                          width: guide.thickness ?? 0.5,
                          height: '100%',
                        }
                      : {
                          left: 0,
                          top: guide.position * zoom,
                          width: '100%',
                          height: guide.thickness ?? 0.5,
                        }),
                    backgroundColor: guide.color,
                    pointerEvents: 'none',
                    opacity: 0.8,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Active tool indicator (bottom-left of scroll area) */}
          <div
            data-testid="active-tool-indicator"
            style={{
              position: 'sticky',
              bottom: 4,
              left: 8,
              fontSize: 11,
              opacity: 0.6,
              color: '#A0A0A0',
              pointerEvents: 'none',
              userSelect: 'none',
              padding: '2px 6px',
              width: 'fit-content',
            }}
          >
            {activeToolLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CanvasViewport;
