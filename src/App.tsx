import { useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { DialogHost } from './components/Dialogs/DialogHost';
import { useSettingsStore } from './settings/settingsStore';
import { useUiStore } from './stores/uiStore';
import { useDocumentStore } from './stores/documentStore';
import { dlog } from './stores/debugStore';

function App() {
  // Load persisted settings on startup and restore last zoom
  useEffect(() => {
    const project = useDocumentStore.getState().project;
    dlog.generalInfo(
      'Application started',
      `Canvas: ${project.canvasWidth}x${project.canvasHeight} | Layers: ${project.layers.length}`,
    );

    const settingsStore = useSettingsStore.getState();
    // Load from localStorage first (sync, immediate)
    settingsStore.loadSettings();
    dlog.generalInfo('Settings loaded (localStorage)');

    // Then try loading from Tauri AppData file (async, overrides localStorage)
    settingsStore.loadSettingsFromFile().then(() => {
      dlog.generalInfo('Settings loaded (Tauri file)');
      // Restore last canvas zoom from settings (may have been updated by file load)
      const lastZoom = settingsStore.getSetting('canvas.lastZoom') as number;
      if (lastZoom && lastZoom > 0) {
        useUiStore.getState().setZoom(lastZoom);
      }
      // Restore last shape type and settings to uiStore
      const lastShape = settingsStore.getSetting('shapeTool.lastShapeType') as string;
      if (lastShape) {
        useUiStore.getState().setSelectedShapeType(lastShape as any);
      }
      const starSpikeCount = settingsStore.getSetting('shapeTool.starSpikeCount') as number;
      if (starSpikeCount) {
        useUiStore.getState().setDrawPolygonSides(starSpikeCount);
      }
      const starSpikeHigh = settingsStore.getSetting('shapeTool.starSpikeHigh') as number;
      const starSpikeLow = settingsStore.getSetting('shapeTool.starSpikeLow') as number;
      if (starSpikeHigh > 0) {
        useUiStore.getState().setStarInnerRatio(starSpikeLow / starSpikeHigh);
      }
      // Restore canvas background color
      const bgColor = settingsStore.getSetting('canvas.defaultBackground') as string;
      if (bgColor) {
        useDocumentStore.getState().setBackgroundColor(bgColor);
      }
    }).catch(() => {/* ignore */});

    // Also restore from sync load immediately
    const lastZoom = settingsStore.getSetting('canvas.lastZoom') as number;
    if (lastZoom && lastZoom > 0) {
      useUiStore.getState().setZoom(lastZoom);
    }
    const bgColor = settingsStore.getSetting('canvas.defaultBackground') as string;
    if (bgColor) {
      useDocumentStore.getState().setBackgroundColor(bgColor);
    }

    // Save zoom to settings when the window is closing
    const handleBeforeUnload = () => {
      const currentZoom = useUiStore.getState().zoom;
      const store = useSettingsStore.getState();
      store.setSetting('canvas.lastZoom', currentZoom);
      store.saveSettings(); // Force immediate save (bypass debounce)
      // Also save to Tauri file synchronously (best effort)
      store.saveSettingsToFile().catch(() => {/* ignore */});
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <>
      <MainLayout />
      <DialogHost />
    </>
  );
}

export default App;
