import { useEffect } from 'react';
import { useUiStore } from '../../stores/uiStore';

/**
 * Invisible component that wires F12 to toggle the Debug dialog.
 * The actual debug UI is in DebugWindow.tsx (opened via DialogHost).
 */
export function DebugPanel() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F12' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        const ui = useUiStore.getState();
        if (ui.activeDialog === 'debugLog' || ui.activeDialog === 'debug') {
          ui.setActiveDialog(null);
        } else {
          ui.setActiveDialog('debugLog');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return null;
}

export default DebugPanel;
