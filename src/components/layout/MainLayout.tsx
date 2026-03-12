import { useCallback, useMemo, useState } from 'react';
import { ResizableSplitter } from './ResizableSplitter';
import { MenuBar } from '../MenuBar/MenuBar';
import { TopToolbar } from '../TopToolbar/TopToolbar';
import { LeftToolbar } from '../LeftToolbar/LeftToolbar';
import { LeftTabPanel } from '../LeftTabPanel/LeftTabPanel';
import { CanvasViewport } from '../Canvas/CanvasViewport';
import { FrameGallery } from '../FrameGallery/FrameGallery';
import { RightPanel } from '../RightPanel/RightPanel';
import { StatusBar } from '../StatusBar/StatusBar';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import type { KeyboardShortcutActions } from '../../hooks/useKeyboardShortcuts';
import { getCommand } from '../../commands/useCommand';
import { useUiStore } from '../../stores/uiStore';
import { useDocumentStore } from '../../stores/documentStore';

/**
 * Clamp a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Root application layout shell.
 *
 * 4-row grid:
 *   1. Menu Bar          (32 px)
 *   2. Top Toolbar       (40 px)
 *   3. Main Content      (flex-1)
 *   4. Status Bar        (28 px)
 *
 * Main Content columns:
 *   Left side (flex-1)  |  splitter  |  Right panel (resizable, default 310 px)
 *
 * Left Side rows:
 *   Main area (flex-1)  /  splitter  /  Frame Gallery (resizable, default 130 px)
 *
 * Main Area columns:
 *   Left toolbar (48 px)  |  Left tab panel (collapsible, 0–400 px)  |  splitter  |  Canvas (flex-1)
 */
function exec(commandName: string, ...args: unknown[]) {
  const cmd = getCommand(commandName);
  if (cmd && cmd.canExecute()) {
    cmd.execute(...args);
  }
}

export function MainLayout() {
  // ---- resizable state ----
  const [rightPanelWidth, setRightPanelWidth] = useState(310);
  const [frameGalleryHeight, setFrameGalleryHeight] = useState(130);
  const [leftTabPanelWidth, setLeftTabPanelWidth] = useState(220);

  const isEditingText = useUiStore((s) => s.isEditingText);

  // ---- keyboard shortcuts ----
  const actions: KeyboardShortcutActions = useMemo(() => ({
    // File
    onNewProject: () => exec('newProject'),
    onOpenProject: () => exec('openProject'),
    onSave: () => exec('saveProject'),
    onSaveAs: () => exec('saveProjectAs'),
    onExportPNG: () => exec('exportImage'),
    onQuickExport: () => exec('quickExportLayer'),
    onImportImage: () => exec('importImage'),
    onImportSvg: () => exec('importSvg'),
    onExportSvg: () => exec('exportSvg'),
    onExportPsd: () => exec('exportPsd'),
    // Edit
    onUndo: () => exec('undo'),
    onRedo: () => exec('redo'),
    onCut: () => exec('cutLayer'),
    onCopy: () => exec('copyLayer'),
    onPaste: () => exec('pasteLayer'),
    onDuplicate: () => exec('duplicateLayer'),
    onDelete: () => exec('deleteLayer'),
    onSelectAll: () => exec('selectAll'),
    onDeselect: () => exec('deselect'),
    // Layer
    onGroup: () => exec('group'),
    onUngroup: () => exec('ungroup'),
    onReleaseFromGroup: () => exec('releaseFromGroup'),
    onNewLayer: () => exec('addNewLayer'),
    onLockLayer: () => exec('lockLayer'),
    onMergeDown: () => exec('mergeDown'),
    // Arrange
    onBringForward: () => exec('bringForward'),
    onSendBackward: () => exec('sendBackward'),
    onBringToFront: () => exec('bringToFront'),
    onSendToBack: () => exec('sendToBack'),
    // Transform
    onFlipHorizontal: () => exec('flipHorizontal'),
    onFlipVertical: () => exec('flipVertical'),
    onRotate90: () => exec('rotate90'),
    onFitToCanvas: () => exec('fitToCanvas'),
    onFitWidth: () => exec('fitWidth'),
    onFitHeight: () => exec('fitHeight'),
    // Autosize
    onMatchWidth: () => exec('matchWidth'),
    onMatchHeight: () => exec('matchHeight'),
    onMatchSize: () => exec('matchSize'),
    // Tool (single-key)
    onSelectTool: () => exec('setTool', 'select'),
    onTextTool: () => exec('setTool', 'text'),
    onShapeTool: () => exec('setTool', 'shape'),
    onEraserTool: () => exec('setTool', 'eraser'),
    onBlurBrushTool: () => exec('setTool', 'blurBrush'),
    onAntiBlurTool: () => exec('setTool', 'antiBlur'),
    // View
    onToggleGallery: () => useUiStore.getState().toggleLeftPanelTab('IMAGE'),
    onToggleGrid: () => exec('toggleGrid'),
    onToggleVisibility: () => exec('toggleVisibility'),
    onPanModeStart: () => useUiStore.getState().setActiveTool('pan'),
    onPanModeEnd: () => useUiStore.getState().setActiveTool('select'),
    // Brush size
    onBrushSizeDecrease: () => { /* placeholder: decrease brush size */ },
    onBrushSizeIncrease: () => { /* placeholder: increase brush size */ },
    // Zoom
    onZoom100: () => exec('originalSize'),
    onZoomFit: () => {
      const ui = useUiStore.getState();
      const project = useDocumentStore.getState().project;
      const vw = window.innerWidth - 400;
      const vh = window.innerHeight - 200;
      const scale = Math.min(vw / project.canvasWidth, vh / project.canvasHeight, 1.0);
      ui.setZoom(Math.max(0.1, scale));
    },
    onZoom200: () => useUiStore.getState().setZoom(2.0),
    onZoom300: () => useUiStore.getState().setZoom(3.0),
    onZoom400: () => useUiStore.getState().setZoom(4.0),
    onZoom500: () => useUiStore.getState().setZoom(5.0),
    onZoomIn: () => exec('zoomIn'),
    onZoomOut: () => exec('zoomOut'),
    // Nudge
    onNudge: (dx: number, dy: number) => {
      const state = useDocumentStore.getState();
      if (state.selectedLayerIds.length === 0) return;
      state.pushUndo();
      for (const id of state.selectedLayerIds) {
        const layer = state.project.layers.find((l) => l.id === id);
        if (layer) {
          state.updateLayer(id, { x: layer.x + dx, y: layer.y + dy });
        }
      }
    },
  }), []);

  useKeyboardShortcuts({ isEditingText, actions });

  // Right panel: splitter drags adjust width (drag left = wider)
  const handleRightPanelResize = useCallback((delta: number) => {
    setRightPanelWidth((w) => clamp(w - delta, 200, 600));
  }, []);

  // Frame gallery: splitter drags adjust height (drag up = taller)
  const handleFrameGalleryResize = useCallback((delta: number) => {
    setFrameGalleryHeight((h) => clamp(h - delta, 60, 400));
  }, []);

  // Left tab panel: splitter drags adjust width (drag right = wider)
  const handleLeftTabPanelResize = useCallback((delta: number) => {
    setLeftTabPanelWidth((w) => clamp(w + delta, 0, 400));
  }, []);

  return (
    <div
      data-testid="main-layout"
      className="flex h-full w-full flex-col"
      style={{ minWidth: 1000, minHeight: 600 }}
    >
      {/* Row 1 -- Menu Bar (32 px) */}
      <div className="shrink-0" data-testid="panel-menubar" style={{ height: 32 }}>
        <MenuBar />
      </div>

      {/* Row 2 -- Top Toolbar (40 px) */}
      <div className="shrink-0" style={{ height: 40 }} data-testid="panel-top-toolbar">
        <TopToolbar />
      </div>

      {/* Row 3 -- Main Content (flex-1) */}
      <div data-testid="main-content" className="flex min-h-0 flex-1 overflow-hidden">
        {/* ---- Left side (flex-1) ---- */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Main Area (flex-1) */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Left toolbar (48 px) */}
            <div className="shrink-0" style={{ width: 48 }} data-testid="panel-left-toolbar">
              <LeftToolbar />
            </div>

            {/* Left tab panel (collapsible) */}
            {leftTabPanelWidth > 0 && (
              <div className="shrink-0" style={{ width: leftTabPanelWidth }} data-testid="panel-left-tab">
                <LeftTabPanel visible />
              </div>
            )}

            {/* Splitter between left-tab-panel and canvas */}
            <ResizableSplitter
              orientation="horizontal"
              onResize={handleLeftTabPanelResize}
              minSize={0}
              maxSize={400}
              testId="splitter-left-tab"
            />

            {/* Central canvas (flex-1) */}
            <div className="min-w-0 flex-1 overflow-hidden" data-testid="panel-canvas">
              <CanvasViewport />
            </div>
          </div>

          {/* Splitter between main area and frame gallery */}
          <ResizableSplitter
            orientation="vertical"
            onResize={handleFrameGalleryResize}
            minSize={60}
            maxSize={400}
            testId="splitter-frame-gallery"
          />

          {/* Frame Gallery (resizable, default 130 px) */}
          <div className="shrink-0" style={{ height: frameGalleryHeight }} data-testid="panel-frame-gallery">
            <FrameGallery />
          </div>
        </div>

        {/* Splitter between left side and right panel */}
        <ResizableSplitter
          orientation="horizontal"
          onResize={handleRightPanelResize}
          minSize={200}
          maxSize={600}
          testId="splitter-right-panel"
        />

        {/* ---- Right panel (resizable, default 310 px) ---- */}
        <div className="shrink-0" style={{ width: rightPanelWidth }} data-testid="panel-right-panel">
          <RightPanel />
        </div>
      </div>

      {/* Row 4 -- Status Bar (28 px) */}
      <div className="shrink-0" style={{ height: 28 }} data-testid="panel-statusbar">
        <StatusBar />
      </div>
    </div>
  );
}

export default MainLayout;
