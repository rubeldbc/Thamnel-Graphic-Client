import { useCallback } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useDocumentStore } from '../../stores/documentStore';
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

  const close = useCallback(() => {
    useUiStore.getState().setActiveDialog(null);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) close();
  }, [close]);

  // Read fill/stroke color from selected layer for color picker
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

      {/* Debug Log */}
      <DebugWindow
        open={activeDialog === 'debugLog' || activeDialog === 'debug'}
        onOpenChange={handleOpenChange}
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
        onOk={(color) => {
          // Always update the drawing fill color for future shapes
          useUiStore.getState().setDrawFillColor(color);
          if (selectedLayer) {
            const store = useDocumentStore.getState();
            store.pushUndo();
            if (selectedLayer.type === 'shape' && selectedLayer.shapeProperties) {
              store.updateLayer(selectedLayer.id, {
                shapeProperties: { ...selectedLayer.shapeProperties, fillColor: color },
              });
            } else if (selectedLayer.type === 'text' && selectedLayer.textProperties) {
              store.updateLayer(selectedLayer.id, {
                textProperties: { ...selectedLayer.textProperties, color },
              });
            }
          }
          close();
        }}
      />

      {/* Color Picker - Stroke */}
      <ColorPickerWindow
        open={activeDialog === 'colorPicker:stroke'}
        onOpenChange={handleOpenChange}
        initialColor={strokeColor}
        onOk={(color) => {
          // Always update the drawing stroke color for future shapes
          useUiStore.getState().setDrawStrokeColor(color);
          if (selectedLayer) {
            const store = useDocumentStore.getState();
            store.pushUndo();
            if (selectedLayer.type === 'shape' && selectedLayer.shapeProperties) {
              store.updateLayer(selectedLayer.id, {
                shapeProperties: { ...selectedLayer.shapeProperties, borderColor: color },
              });
            } else if (selectedLayer.type === 'text' && selectedLayer.textProperties) {
              store.updateLayer(selectedLayer.id, {
                textProperties: { ...selectedLayer.textProperties, strokeColor: color },
              });
            }
          }
          close();
        }}
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
