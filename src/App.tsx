import { useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { DialogHost } from './components/Dialogs/DialogHost';
import { useSettingsStore } from './settings/settingsStore';
import { useUiStore } from './stores/uiStore';

function App() {
  // Load persisted settings on startup and restore last zoom
  useEffect(() => {
    const settingsStore = useSettingsStore.getState();
    settingsStore.loadSettings();

    // Restore last canvas zoom from settings
    const lastZoom = settingsStore.getSetting('canvas.lastZoom') as number;
    if (lastZoom && lastZoom > 0) {
      useUiStore.getState().setZoom(lastZoom);
    }

    // Save zoom to settings when the window is closing
    const handleBeforeUnload = () => {
      const currentZoom = useUiStore.getState().zoom;
      const store = useSettingsStore.getState();
      store.setSetting('canvas.lastZoom', currentZoom);
      store.saveSettings(); // Force immediate save (bypass debounce)
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
