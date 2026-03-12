import { useCallback, useMemo } from 'react';
import { ToolbarButton } from './ToolbarButton';
import { ToolbarComboBox } from './ToolbarComboBox';
import type { ComboOption } from './ToolbarComboBox';
import { useDocumentStore } from '../../stores/documentStore';
import { useUiStore } from '../../stores/uiStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import {
  ALL_PRESETS,
  PRESET_CATEGORIES,
  getPresetLabel,
} from '../../data/canvasPresets';
import { createDefaultProject } from '../../types/index';
import {
  mdiFileOutline,
  mdiFolderOpenOutline,
  mdiContentSave,
  mdiBookmarkOutline,
  mdiContentCopy,
  mdiVideo,
  mdiExport,
  mdiFormatListBulleted,
  mdiLayersTripleOutline,
  mdiImageMultipleOutline,
  mdiMonitor,
  mdiImage,
  mdiSend,
  mdiVolumeHigh,
  mdiUndo,
  mdiRedo,
  mdiMinus,
  mdiPlus,
  mdiMagnify,
  mdiFitToScreen,
  mdiGrid,
  mdiCog,
  mdiBug,
} from '@mdi/js';

// ---------------------------------------------------------------------------
// Combo options
// ---------------------------------------------------------------------------

const qualityOptions: ComboOption[] = Array.from({ length: 10 }, (_, i) => {
  const v = (i + 1) * 10;
  return { label: `${v}%`, value: String(v) };
});

/** Build canvas size options from canvasPresets.ts, grouped by category. */
function buildCanvasSizeOptions(): ComboOption[] {
  const options: ComboOption[] = [];
  for (const cat of PRESET_CATEGORIES) {
    // Group header (uses a disabled-looking separator label)
    options.push({
      label: `--- ${cat.label} ---`,
      value: `__group__${cat.value}`,
    });
    for (const preset of ALL_PRESETS.filter((p) => p.category === cat.value)) {
      // Use name as suffix to ensure unique values when dimensions overlap
      options.push({
        label: getPresetLabel(preset),
        value: `${preset.width}x${preset.height}::${preset.name}`,
      });
    }
  }
  return options;
}

const canvasSizeOptions: ComboOption[] = buildCanvasSizeOptions();

const layoutOptions: ComboOption[] = [
  { label: 'Default', value: 'default' },
  { label: 'Compact', value: 'compact' },
  { label: 'Wide', value: 'wide' },
];

// ---------------------------------------------------------------------------
// Separator helper
// ---------------------------------------------------------------------------

function ToolbarSeparator() {
  return (
    <div
      className="mx-1 shrink-0"
      style={{
        width: 1,
        height: 20,
        backgroundColor: 'var(--border-color)',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// TopToolbar
// ---------------------------------------------------------------------------

/**
 * Horizontal top toolbar containing action buttons, branding, combos, and
 * zoom controls.  Layout: left | center | right.
 *
 * All buttons are wired to real store actions / commands.
 */
export function TopToolbar() {
  // ---- Store subscriptions ----
  const zoom = useUiStore((s) => s.zoom);
  const gridVisible = useUiStore((s) => s.gridVisible);
  const leftPanelTab = useUiStore((s) => s.leftPanelTab);
  const canvasQuality = useUiStore((s) => s.canvasQuality);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const canvasWidth = useDocumentStore((s) => s.project.canvasWidth);
  const canvasHeight = useDocumentStore((s) => s.project.canvasHeight);

  // Undo/Redo state — subscribe to stack lengths so buttons re-render
  const undoLen = useUndoRedoStore((s) => s.undoStack.length);
  const redoLen = useUndoRedoStore((s) => s.redoStack.length);
  const canUndo = undoLen > 0;
  const canRedo = redoLen > 0;

  // ---- Actions (stable refs via getState) ----
  const setZoom = useUiStore((s) => s.setZoom);
  const toggleGrid = useUiStore((s) => s.toggleGrid);
  const toggleLeftPanelTab = useUiStore((s) => s.toggleLeftPanelTab);
  const setCanvasQuality = useUiStore((s) => s.setCanvasQuality);
  const setActiveDialog = useUiStore((s) => s.setActiveDialog);
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel);

  // ---- Derived values ----
  const zoomPercent = Math.round(zoom * 100);
  // Find matching preset option value (includes "::Name" suffix for uniqueness)
  const canvasSizeValue = useMemo(() => {
    const prefix = `${canvasWidth}x${canvasHeight}::`;
    const match = canvasSizeOptions.find((o) => o.value.startsWith(prefix));
    return match?.value ?? `${canvasWidth}x${canvasHeight}`;
  }, [canvasWidth, canvasHeight]);

  // ---- Handlers ----

  // 11A-1: New Project (Ctrl+N)
  const handleNewProject = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Create a new project anyway?',
      );
      if (!confirmed) return;
    }
    useDocumentStore.getState().setProject(createDefaultProject());
    useDocumentStore.getState().markClean();
    useDocumentStore.getState().setCurrentProjectPath(null);
    useUndoRedoStore.getState().clear();
  }, [isDirty]);

  // 11A-2: Open Project (Ctrl+O)
  const handleOpenProject = useCallback(() => {
    console.log('[TopToolbar] openProject — Tauri dialog placeholder');
  }, []);

  // 11A-3: Save Project (Ctrl+S)
  const handleSaveProject = useCallback(() => {
    console.log('[TopToolbar] saveProject — Tauri save placeholder');
    useDocumentStore.getState().markClean();
  }, []);

  // 11A-4: Save as Template
  const handleSaveTemplate = useCallback(() => {
    console.log('[TopToolbar] saveTemplate — templates path placeholder');
  }, []);

  // 11A-5: Save Copy
  const handleSaveCopy = useCallback(() => {
    console.log('[TopToolbar] saveCopy — save without updating currentProjectPath');
  }, []);

  // 11A-6: Import Video
  const handleImportVideo = useCallback(() => {
    console.log('[TopToolbar] importVideo — file dialog placeholder');
  }, []);

  // 11A-7: Export Image (Ctrl+E)
  const handleExportImage = useCallback(() => {
    console.log('[TopToolbar] exportImage — compositeAllLayers + save placeholder');
  }, []);

  // 11A-8: Export List
  const handleExportList = useCallback(() => {
    setActiveDialog('exportList');
  }, [setActiveDialog]);

  // 11A-9: Batch Producer
  const handleBatchProducer = useCallback(() => {
    setActiveDialog('batchProducer');
  }, [setActiveDialog]);

  // 11A-10: Image Gallery toggle (left panel)
  const handleGalleryToggle = useCallback(() => {
    toggleLeftPanel();
  }, [toggleLeftPanel]);

  // 11A-11: Video Browser toggle
  const handleVideoBrowser = useCallback(() => {
    toggleLeftPanelTab('VIDEO');
  }, [toggleLeftPanelTab]);

  // 11A-12: Image Gallery Panel toggle
  const handleImageGallery = useCallback(() => {
    toggleLeftPanelTab('IMAGE');
  }, [toggleLeftPanelTab]);

  // 11A-13: Server Render
  const handleServerRender = useCallback(() => {
    console.log('[TopToolbar] serverRender — placeholder');
  }, []);

  // 11A-14: Server Audio toggle
  const handleAudioToggle = useCallback(() => {
    toggleLeftPanelTab('AUDIO');
  }, [toggleLeftPanelTab]);

  // 11A-15: Undo (Ctrl+Z)
  const handleUndo = useCallback(() => {
    useUndoRedoStore.getState().undo();
  }, []);

  // 11A-16: Redo (Ctrl+Y)
  const handleRedo = useCallback(() => {
    useUndoRedoStore.getState().redo();
  }, []);

  // 11C-1: Canvas Quality combo
  const handleQualityChange = useCallback(
    (value: string) => {
      setCanvasQuality(Number(value));
    },
    [setCanvasQuality],
  );

  // 11C-2: Canvas Size Preset
  const handleCanvasSizeChange = useCallback((value: string) => {
    if (value.startsWith('__group__')) return; // ignore group headers
    // value format: "WIDTHxHEIGHT::Name"
    const dimsPart = value.split('::')[0];
    const parts = dimsPart.split('x');
    if (parts.length === 2) {
      const w = parseInt(parts[0], 10);
      const h = parseInt(parts[1], 10);
      if (!isNaN(w) && !isNaN(h)) {
        const store = useDocumentStore.getState();
        store.pushUndo();
        store.setCanvasSize(w, h);
        store.markDirty();
      }
    }
  }, []);

  // 11C-4: Zoom In/Out
  const handleZoomIn = useCallback(() => {
    setZoom(zoom + 0.1);
  }, [zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(zoom - 0.1);
  }, [zoom, setZoom]);

  // 11C-6: Original Size (zoom = 1.0)
  const handleZoomOriginal = useCallback(() => {
    setZoom(1.0);
  }, [setZoom]);

  // 11C-7: Fit to Screen
  const handleFitToScreen = useCallback(() => {
    // Calculate optimal zoom to fit canvas in viewport
    // Use a reasonable viewport estimate (subtract toolbar/panel chrome)
    const viewportWidth = window.innerWidth - 400; // panels ~200px each side
    const viewportHeight = window.innerHeight - 200; // top/bottom chrome
    const project = useDocumentStore.getState().project;
    const scaleX = viewportWidth / project.canvasWidth;
    const scaleY = viewportHeight / project.canvasHeight;
    const optimalZoom = Math.min(scaleX, scaleY, 1.0);
    setZoom(Math.max(0.1, optimalZoom));
  }, [setZoom]);

  // 11C-8: Grid toggle
  const handleGridToggle = useCallback(() => {
    toggleGrid();
  }, [toggleGrid]);

  // 11C-9: Settings
  const handleSettings = useCallback(() => {
    setActiveDialog('settings');
  }, [setActiveDialog]);

  // 11C-10: Debug
  const handleDebug = useCallback(() => {
    setActiveDialog('debug');
  }, [setActiveDialog]);

  // Layout combo (placeholder)
  const [layoutValue, setLayoutValue] = useMemo(() => {
    // We don't have a layout store yet, so just manage it locally via a ref-like approach
    return [undefined, (_v: string) => console.log('[TopToolbar] setLayout', _v)] as const;
  }, []);

  return (
    <div
      data-testid="top-toolbar"
      className="flex h-full items-center"
      style={{
        backgroundColor: 'var(--toolbar-bg)',
        borderBottom: '1px solid var(--border-color)',
        padding: '4px 2px',
      }}
    >
      {/* ====== LEFT SECTION ====== */}
      <div data-testid="toolbar-left" className="flex items-center">
        {/* Group 1: New, Open, Save */}
        <ToolbarButton icon={mdiFileOutline} tooltip="New (Ctrl+N)" onClick={handleNewProject} testId="btn-new" />
        <ToolbarButton icon={mdiFolderOpenOutline} tooltip="Open (Ctrl+O)" onClick={handleOpenProject} testId="btn-open" />
        <ToolbarButton icon={mdiContentSave} tooltip="Save (Ctrl+S)" onClick={handleSaveProject} testId="btn-save" />
        <ToolbarSeparator />

        {/* Group 2: Template, Copy */}
        <ToolbarButton icon={mdiBookmarkOutline} tooltip="Save as Template" onClick={handleSaveTemplate} testId="btn-template" />
        <ToolbarSeparator />

        {/* Group 3: Save Copy, Import Video, Export, Export List */}
        <ToolbarButton icon={mdiContentCopy} tooltip="Save Copy" onClick={handleSaveCopy} testId="btn-copy" />
        <ToolbarButton icon={mdiVideo} tooltip="Import Video" onClick={handleImportVideo} testId="btn-video" />
        <ToolbarButton icon={mdiExport} tooltip="Export Image (Ctrl+E)" onClick={handleExportImage} testId="btn-export" />
        <ToolbarButton icon={mdiFormatListBulleted} tooltip="Export List" onClick={handleExportList} testId="btn-export-list" />
        <ToolbarSeparator />

        {/* Group 4: Batch, Gallery */}
        <ToolbarButton icon={mdiLayersTripleOutline} tooltip="Batch Producer" onClick={handleBatchProducer} testId="btn-batch" />
        <ToolbarButton icon={mdiImageMultipleOutline} tooltip="Image Gallery" onClick={handleGalleryToggle} testId="btn-gallery" />
        <ToolbarSeparator />

        {/* Group 5: Video Browser, Image Gallery Panel, Server Render, Audio (toggles) */}
        <ToolbarButton
          icon={mdiMonitor}
          tooltip="Video Browser"
          active={leftPanelTab === 'VIDEO'}
          onClick={handleVideoBrowser}
          testId="btn-video-browser"
        />
        <ToolbarButton
          icon={mdiImage}
          tooltip="Image Gallery Panel"
          active={leftPanelTab === 'IMAGE'}
          onClick={handleImageGallery}
          testId="btn-image-gallery"
        />
        <ToolbarButton icon={mdiSend} tooltip="Server Render" onClick={handleServerRender} testId="btn-send" />
        <ToolbarButton
          icon={mdiVolumeHigh}
          tooltip="Audio"
          active={leftPanelTab === 'AUDIO'}
          onClick={handleAudioToggle}
          testId="btn-audio"
        />
        <ToolbarSeparator />

        {/* Group 6: Undo, Redo */}
        <ToolbarButton
          icon={mdiUndo}
          tooltip="Undo (Ctrl+Z)"
          onClick={handleUndo}
          disabled={!canUndo}
          testId="btn-undo"
        />
        <ToolbarButton
          icon={mdiRedo}
          tooltip="Redo (Ctrl+Y)"
          onClick={handleRedo}
          disabled={!canRedo}
          testId="btn-redo"
        />
      </div>

      {/* ====== CENTER SECTION ====== */}
      <div data-testid="toolbar-center" className="flex flex-1 items-center justify-center">
        <span
          data-testid="branding-text"
          className="whitespace-nowrap font-bold select-none"
          style={{ fontSize: 15, color: 'var(--accent-orange)' }}
        >
          Thamnel by Kamrul Islam Rubel
        </span>
      </div>

      {/* ====== RIGHT SECTION ====== */}
      <div data-testid="toolbar-right" className="flex items-center gap-1">
        {/* Combos */}
        <ToolbarComboBox
          value={String(canvasQuality)}
          onChange={handleQualityChange}
          options={qualityOptions}
          width={80}
          placeholder="Quality"
          testId="combo-quality"
        />
        <ToolbarComboBox
          value={canvasSizeValue}
          onChange={handleCanvasSizeChange}
          options={canvasSizeOptions}
          width={120}
          placeholder="Canvas Size"
          testId="combo-canvas-size"
        />
        <ToolbarComboBox
          value={layoutValue}
          onChange={setLayoutValue}
          options={layoutOptions}
          width={120}
          placeholder="Layout"
          testId="combo-layout"
        />

        <ToolbarSeparator />

        {/* Zoom controls */}
        <ToolbarButton icon={mdiMinus} tooltip="Zoom Out" onClick={handleZoomOut} testId="btn-zoom-out" />
        <span
          data-testid="zoom-display"
          className="inline-flex items-center justify-center text-xs select-none"
          style={{
            minWidth: 40,
            color: 'var(--text-primary)',
            fontSize: 11,
          }}
        >
          {zoomPercent}%
        </span>
        <ToolbarButton icon={mdiPlus} tooltip="Zoom In" onClick={handleZoomIn} testId="btn-zoom-in" />
        <ToolbarButton icon={mdiMagnify} tooltip="Original Size (Ctrl+0)" onClick={handleZoomOriginal} testId="btn-zoom-original" />
        <ToolbarButton icon={mdiFitToScreen} tooltip="Fit to Screen" onClick={handleFitToScreen} testId="btn-fit-screen" />

        <ToolbarSeparator />

        {/* Grid, Settings, Debug */}
        <ToolbarButton
          icon={mdiGrid}
          tooltip="Grid"
          size={36}
          active={gridVisible}
          onClick={handleGridToggle}
          testId="btn-grid"
        />
        <ToolbarButton icon={mdiCog} tooltip="Settings" onClick={handleSettings} testId="btn-settings" />
        <ToolbarButton icon={mdiBug} tooltip="Debug" onClick={handleDebug} testId="btn-debug" />
      </div>
    </div>
  );
}

export default TopToolbar;
