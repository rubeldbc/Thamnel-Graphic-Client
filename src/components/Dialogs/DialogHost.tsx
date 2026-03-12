import { useCallback } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { useDocumentStore } from '../../stores/documentStore';
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

      {/* Eraser Settings (reuse Settings with placeholder) */}
      <DebugWindow
        open={activeDialog === 'eraserSettings'}
        onOpenChange={handleOpenChange}
      />

      {/* Blur Brush Settings (reuse Debug as placeholder) */}
      <DebugWindow
        open={activeDialog === 'blurBrushSettings'}
        onOpenChange={handleOpenChange}
      />
    </>
  );
}

export default DialogHost;
