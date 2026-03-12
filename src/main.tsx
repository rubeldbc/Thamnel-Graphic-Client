import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App.tsx';

// Disable the default browser/webview context menu globally.
// Custom context menus (e.g. Radix ContextMenu) use preventDefault
// on their own triggers, so they will still work.
document.addEventListener('contextmenu', (e) => e.preventDefault());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
