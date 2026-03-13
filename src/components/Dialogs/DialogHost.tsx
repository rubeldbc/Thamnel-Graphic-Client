import { useCallback, useRef } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useDocumentStore } from '../../stores/documentStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { useDialogStore } from '../../stores/dialogStore';
import { SettingsWindow } from './SettingsWindow';
import { AboutWindow } from './AboutWindow';
import { DebugWindow } from './DebugWindow';
import { BatchProducerWindow } from './BatchProducerWindow';
import { ExportListWindow } from './ExportListWindow';
import { ColorPickerWindow } from './ColorPickerWindow';
import { CanvasSizeWindow } from './CanvasSizeWindow';
import { NewDocumentDialog } from './NewDocumentDialog';
import { FillPickerWindow } from './FillPickerWindow';
import { ShapeDrawingWindow } from './ShapeDrawingWindow';
import { TextPropertiesWindow } from './TextPropertiesWindow';
import { InputDialog } from './InputDialog';
import { NotificationDialog } from './NotificationDialog';
import { ProgressWindow } from './ProgressWindow';
import { EnhanceSettingsDialog } from './EnhanceSettingsDialog';
import { EraserSettingsWindow } from './EraserSettingsWindow';
import { BlurBrushSettingsWindow } from './BlurBrushSettingsWindow';
import { BgStudioBrushSettingsWindow } from './BgStudioBrushSettingsWindow';
import { BgFillFramePickerWindow } from './BgFillFramePickerWindow';
import { FramePreviewWindow } from './FramePreviewWindow';
import { ImageGalleryDialog } from './ImageGalleryDialog';
import { GalleryWindow } from './GalleryWindow';
import { InstantTextEditorWindow } from './InstantTextEditorWindow';
import { LinkedTextEditorWindow } from './LinkedTextEditorWindow';
import { TextLinkConfigWindow } from './TextLinkConfigWindow';
import { DateStampWindow } from './DateStampWindow';
import { TransparencyManagerWindow } from './TransparencyManagerWindow';
import { FaceBlurWindow } from './FaceBlurWindow';
import { LogoRemovalWindow } from './LogoRemovalWindow';
import { ProjectImportWindow } from './ProjectImportWindow';
import type { LayerModel } from '../../types/LayerModel';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get fill color from a layer (shape or text). */
function getLayerFillColor(layer: LayerModel): string | null {
  if (layer.type === 'shape' && layer.shapeProperties) return layer.shapeProperties.fillColor;
  if (layer.type === 'text' && layer.textProperties) return layer.textProperties.color;
  return null;
}

/** Get stroke color from a layer (shape or text). */
function getLayerStrokeColor(layer: LayerModel): string | null {
  if (layer.type === 'shape' && layer.shapeProperties) return layer.shapeProperties.borderColor;
  if (layer.type === 'text' && layer.textProperties) return layer.textProperties.strokeColor;
  return null;
}

/** Apply fill color to a layer in the store. */
function applyFillColor(layerId: string, layer: LayerModel, color: string) {
  const store = useDocumentStore.getState();
  if (layer.type === 'shape' && layer.shapeProperties) {
    store.updateLayer(layerId, {
      shapeProperties: { ...layer.shapeProperties, fillColor: color },
    });
  } else if (layer.type === 'text' && layer.textProperties) {
    store.updateLayer(layerId, {
      textProperties: { ...layer.textProperties, color },
    });
  }
}

/** Apply stroke color to a layer in the store. */
function applyStrokeColor(layerId: string, layer: LayerModel, color: string) {
  const store = useDocumentStore.getState();
  if (layer.type === 'shape' && layer.shapeProperties) {
    store.updateLayer(layerId, {
      shapeProperties: { ...layer.shapeProperties, borderColor: color },
    });
  } else if (layer.type === 'text' && layer.textProperties) {
    store.updateLayer(layerId, {
      textProperties: { ...layer.textProperties, strokeColor: color },
    });
  }
}

// ---------------------------------------------------------------------------
// Saved layer color state for live-preview revert
// ---------------------------------------------------------------------------

interface SavedColorState {
  /** Map of layerId → original color value. */
  originalColors: Map<string, string>;
  /** Whether undo snapshot has been taken. */
  snapshotTaken: boolean;
}

/**
 * Centralised dialog host that subscribes to `activeDialog` in the UI store
 * and conditionally renders the matching dialog component.
 *
 * This component should be rendered once at the top level (in App.tsx or MainLayout.tsx).
 */
export function DialogHost() {
  const activeDialog = useUiStore((s) => s.activeDialog);
  const canvasWidth = useDocumentStore((s) => s.project.canvasWidth);
  const canvasHeight = useDocumentStore((s) => s.project.canvasHeight);

  // Callback-based dialog stores
  const inputConfig = useDialogStore((s) => s.inputConfig);
  const closeInput = useDialogStore((s) => s.closeInput);
  const notificationConfig = useDialogStore((s) => s.notificationConfig);
  const closeNotification = useDialogStore((s) => s.closeNotification);
  const progressConfig = useDialogStore((s) => s.progressConfig);
  const closeProgress = useDialogStore((s) => s.closeProgress);

  // Refs for live-preview state (fill and stroke)
  const fillStateRef = useRef<SavedColorState>({ originalColors: new Map(), snapshotTaken: false });
  const strokeStateRef = useRef<SavedColorState>({ originalColors: new Map(), snapshotTaken: false });

  const close = useCallback(() => {
    useUiStore.getState().setActiveDialog(null);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) close();
  }, [close]);

  // Get all selected layers that support color (shapes and text, not groups)
  const getColorLayers = useCallback((): LayerModel[] => {
    const state = useDocumentStore.getState();
    return state.selectedLayerIds
      .map((id) => state.project.layers.find((l) => l.id === id))
      .filter((l): l is LayerModel => l != null && (l.type === 'shape' || l.type === 'text'));
  }, []);

  // Read fill/stroke color from first selected layer for color picker initial value
  const selectedLayer = useDocumentStore((s) => {
    if (s.selectedLayerIds.length === 0) return null;
    return s.project.layers.find((l) => l.id === s.selectedLayerIds[0]) ?? null;
  });

  const fillColor = selectedLayer?.shapeProperties?.fillColor
    ?? selectedLayer?.textProperties?.color
    ?? '#FFFFFF';

  const strokeColor = selectedLayer?.shapeProperties?.borderColor
    ?? selectedLayer?.textProperties?.strokeColor
    ?? '#000000';

  // ---- Fill color picker callbacks ----

  const handleFillColorChange = useCallback((color: string) => {
    const state = fillStateRef.current;
    const layers = getColorLayers();
    // Save originals on first change
    if (!state.snapshotTaken) {
      useUndoRedoStore.getState().takeSnapshot();
      state.snapshotTaken = true;
      for (const layer of layers) {
        const original = getLayerFillColor(layer);
        if (original != null) {
          state.originalColors.set(layer.id, original);
        }
      }
    }
    // Apply live color to all selected layers
    for (const layer of layers) {
      applyFillColor(layer.id, layer, color);
    }
    useUiStore.getState().setDrawFillColor(color);
  }, [getColorLayers]);

  const handleFillOk = useCallback((color: string) => {
    const state = fillStateRef.current;
    const layers = getColorLayers();
    // If no live changes were made, take snapshot now
    if (!state.snapshotTaken) {
      useUndoRedoStore.getState().takeSnapshot();
    }
    // Apply final color
    for (const layer of layers) {
      applyFillColor(layer.id, layer, color);
    }
    useUiStore.getState().setDrawFillColor(color);
    // Reset state
    fillStateRef.current = { originalColors: new Map(), snapshotTaken: false };
    close();
  }, [getColorLayers, close]);

  const handleFillCancel = useCallback(() => {
    const state = fillStateRef.current;
    if (state.snapshotTaken) {
      // Revert: undo the snapshot we took
      useUndoRedoStore.getState().undo();
    }
    fillStateRef.current = { originalColors: new Map(), snapshotTaken: false };
    close();
  }, [close]);

  // ---- Stroke color picker callbacks ----

  const handleStrokeColorChange = useCallback((color: string) => {
    const state = strokeStateRef.current;
    const layers = getColorLayers();
    if (!state.snapshotTaken) {
      useUndoRedoStore.getState().takeSnapshot();
      state.snapshotTaken = true;
      for (const layer of layers) {
        const original = getLayerStrokeColor(layer);
        if (original != null) {
          state.originalColors.set(layer.id, original);
        }
      }
    }
    for (const layer of layers) {
      applyStrokeColor(layer.id, layer, color);
    }
    useUiStore.getState().setDrawStrokeColor(color);
  }, [getColorLayers]);

  const handleStrokeOk = useCallback((color: string) => {
    const state = strokeStateRef.current;
    const layers = getColorLayers();
    if (!state.snapshotTaken) {
      useUndoRedoStore.getState().takeSnapshot();
    }
    for (const layer of layers) {
      applyStrokeColor(layer.id, layer, color);
    }
    useUiStore.getState().setDrawStrokeColor(color);
    strokeStateRef.current = { originalColors: new Map(), snapshotTaken: false };
    close();
  }, [getColorLayers, close]);

  const handleStrokeCancel = useCallback(() => {
    const state = strokeStateRef.current;
    if (state.snapshotTaken) {
      useUndoRedoStore.getState().undo();
    }
    strokeStateRef.current = { originalColors: new Map(), snapshotTaken: false };
    close();
  }, [close]);

  return (
    <>
      {/* Settings */}
      <SettingsWindow
        open={activeDialog === 'settings'}
        onOpenChange={handleOpenChange}
      />

      {/* About */}
      <AboutWindow
        open={activeDialog === 'about'}
        onOpenChange={handleOpenChange}
      />

      {/* Debug Log (self-managed overlay, not DialogBase) */}
      <DebugWindow
        open={activeDialog === 'debugLog' || activeDialog === 'debug'}
        onOpenChange={(open) => {
          if (!open) close();
          else useUiStore.getState().setActiveDialog('debugLog');
        }}
      />

      {/* Batch Producer */}
      <BatchProducerWindow
        open={activeDialog === 'batchProducer'}
        onOpenChange={handleOpenChange}
      />

      {/* Export List */}
      <ExportListWindow
        open={activeDialog === 'exportList'}
        onOpenChange={handleOpenChange}
      />

      {/* Color Picker - Fill */}
      <ColorPickerWindow
        open={activeDialog === 'colorPicker:fill'}
        onOpenChange={handleOpenChange}
        initialColor={fillColor}
        onColorChange={handleFillColorChange}
        onOk={handleFillOk}
        onCancel={handleFillCancel}
      />

      {/* Color Picker - Stroke */}
      <ColorPickerWindow
        open={activeDialog === 'colorPicker:stroke'}
        onOpenChange={handleOpenChange}
        initialColor={strokeColor}
        onColorChange={handleStrokeColorChange}
        onOk={handleStrokeOk}
        onCancel={handleStrokeCancel}
      />

      {/* Canvas Size */}
      <CanvasSizeWindow
        open={activeDialog === 'canvasSize'}
        onOpenChange={handleOpenChange}
        currentWidth={canvasWidth}
        currentHeight={canvasHeight}
        onApply={(w, h, _anchor) => {
          const store = useDocumentStore.getState();
          store.pushUndo();
          store.setCanvasSize(w, h);
          store.markDirty();
          close();
        }}
      />

      {/* New Document */}
      <NewDocumentDialog
        open={activeDialog === 'newDocument'}
        onOpenChange={handleOpenChange}
        onCreate={(w, h) => {
          const store = useDocumentStore.getState();
          store.setCanvasSize(w, h);
          close();
        }}
      />

      {/* Fill Picker */}
      <FillPickerWindow
        open={activeDialog === 'fillPicker'}
        onOpenChange={handleOpenChange}
      />

      {/* Shape Drawing */}
      <ShapeDrawingWindow
        open={activeDialog === 'shapeDrawing'}
        onOpenChange={handleOpenChange}
      />

      {/* Text Properties */}
      <TextPropertiesWindow
        open={activeDialog === 'textProperties'}
        onOpenChange={handleOpenChange}
      />

      {/* --- New dialogs --- */}

      {/* Input Dialog (callback-based via dialogStore) */}
      <InputDialog
        open={inputConfig !== null}
        onOpenChange={(open) => { if (!open) closeInput(); }}
        title={inputConfig?.title}
        prompt={inputConfig?.prompt}
        defaultValue={inputConfig?.defaultValue}
        onOk={inputConfig?.onOk}
      />

      {/* Notification Dialog (callback-based via dialogStore) */}
      <NotificationDialog
        open={notificationConfig !== null}
        onOpenChange={(open) => { if (!open) closeNotification(); }}
        title={notificationConfig?.title}
        message={notificationConfig?.message}
        icon={notificationConfig?.icon}
        buttons={notificationConfig?.buttons}
        onResult={notificationConfig?.onResult}
      />

      {/* Progress Window (callback-based via dialogStore) */}
      <ProgressWindow
        open={progressConfig !== null}
        onOpenChange={(open) => { if (!open) closeProgress(); }}
        title={progressConfig?.title}
        statusText={progressConfig?.statusText}
        progressPercent={progressConfig?.progressPercent}
        stepText={progressConfig?.stepText}
        modelName={progressConfig?.modelName}
        description={progressConfig?.description}
        onCancel={progressConfig?.onCancel}
      />

      {/* Enhance Settings */}
      <EnhanceSettingsDialog
        open={activeDialog === 'enhanceSettings'}
        onOpenChange={handleOpenChange}
      />

      {/* Eraser Settings */}
      <EraserSettingsWindow
        open={activeDialog === 'eraserSettings'}
        onOpenChange={handleOpenChange}
      />

      {/* Blur Brush Settings */}
      <BlurBrushSettingsWindow
        open={activeDialog === 'blurBrushSettings'}
        onOpenChange={handleOpenChange}
      />

      {/* BG Studio Brush Settings */}
      <BgStudioBrushSettingsWindow
        open={activeDialog === 'bgStudioBrushSettings'}
        onOpenChange={handleOpenChange}
      />

      {/* BG Fill Frame Picker */}
      <BgFillFramePickerWindow
        open={activeDialog === 'bgFillFramePicker'}
        onOpenChange={handleOpenChange}
      />

      {/* Frame Preview */}
      <FramePreviewWindow
        open={activeDialog === 'framePreview'}
        onOpenChange={handleOpenChange}
      />

      {/* Image Gallery */}
      <ImageGalleryDialog
        open={activeDialog === 'imageGallery'}
        onOpenChange={handleOpenChange}
      />

      {/* Gallery */}
      <GalleryWindow
        open={activeDialog === 'gallery'}
        onOpenChange={handleOpenChange}
      />

      {/* Instant Text Editor */}
      <InstantTextEditorWindow
        open={activeDialog === 'instantTextEditor'}
        onOpenChange={handleOpenChange}
      />

      {/* Linked Text Editor */}
      <LinkedTextEditorWindow
        open={activeDialog === 'linkedTextEditor'}
        onOpenChange={handleOpenChange}
      />

      {/* Text Link Config */}
      <TextLinkConfigWindow
        open={activeDialog === 'textLinkConfig'}
        onOpenChange={handleOpenChange}
      />

      {/* Date Stamp */}
      <DateStampWindow
        open={activeDialog === 'dateStamp'}
        onOpenChange={handleOpenChange}
      />

      {/* Transparency Manager */}
      <TransparencyManagerWindow
        open={activeDialog === 'transparencyManager'}
        onOpenChange={handleOpenChange}
      />

      {/* Face Blur */}
      <FaceBlurWindow
        open={activeDialog === 'faceBlur'}
        onOpenChange={handleOpenChange}
      />

      {/* Logo Removal */}
      <LogoRemovalWindow
        open={activeDialog === 'logoRemoval'}
        onOpenChange={handleOpenChange}
      />

      {/* Project Import */}
      <ProjectImportWindow
        open={activeDialog === 'projectImport'}
        onOpenChange={handleOpenChange}
      />
    </>
  );
}

export default DialogHost;
