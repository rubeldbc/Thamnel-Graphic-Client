import type { Command } from './types';
import { useDocumentStore } from '../stores/documentStore';

function hasSelection(): boolean {
  return useDocumentStore.getState().selectedLayerIds.length > 0;
}

function selectedCount(): number {
  return useDocumentStore.getState().selectedLayerIds.length;
}

function getSelectedLayers() {
  const state = useDocumentStore.getState();
  return state.project.layers.filter((l) =>
    state.selectedLayerIds.includes(l.id),
  );
}

// ---------------------------------------------------------------------------
// Align commands (6) – canExecute: hasSelection
// ---------------------------------------------------------------------------

export const alignLeft: Command = {
  name: 'alignLeft',
  category: 'align',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const selected = getSelectedLayers();
    const minX = Math.min(...selected.map((l) => l.x));
    for (const l of selected) {
      state.updateLayer(l.id, { x: minX });
    }
  },
};

export const alignCenter: Command = {
  name: 'alignCenter',
  category: 'align',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const selected = getSelectedLayers();
    const centers = selected.map((l) => l.x + l.width / 2);
    const avgCenter =
      centers.reduce((sum, c) => sum + c, 0) / centers.length;
    for (const l of selected) {
      state.updateLayer(l.id, { x: avgCenter - l.width / 2 });
    }
  },
};

export const alignRight: Command = {
  name: 'alignRight',
  category: 'align',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const selected = getSelectedLayers();
    const maxRight = Math.max(...selected.map((l) => l.x + l.width));
    for (const l of selected) {
      state.updateLayer(l.id, { x: maxRight - l.width });
    }
  },
};

export const alignTop: Command = {
  name: 'alignTop',
  category: 'align',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const selected = getSelectedLayers();
    const minY = Math.min(...selected.map((l) => l.y));
    for (const l of selected) {
      state.updateLayer(l.id, { y: minY });
    }
  },
};

export const alignMiddle: Command = {
  name: 'alignMiddle',
  category: 'align',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const selected = getSelectedLayers();
    const middles = selected.map((l) => l.y + l.height / 2);
    const avgMiddle =
      middles.reduce((sum, m) => sum + m, 0) / middles.length;
    for (const l of selected) {
      state.updateLayer(l.id, { y: avgMiddle - l.height / 2 });
    }
  },
};

export const alignBottom: Command = {
  name: 'alignBottom',
  category: 'align',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const selected = getSelectedLayers();
    const maxBottom = Math.max(...selected.map((l) => l.y + l.height));
    for (const l of selected) {
      state.updateLayer(l.id, { y: maxBottom - l.height });
    }
  },
};

// ---------------------------------------------------------------------------
// Distribute commands (6) – canExecute: selectedCount >= 3
// ---------------------------------------------------------------------------

export const distributeHorizontally: Command = {
  name: 'distributeHorizontally',
  category: 'align',
  canExecute: () => selectedCount() >= 3,
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const selected = [...getSelectedLayers()].sort((a, b) => a.x - b.x);
    const first = selected[0];
    const last = selected[selected.length - 1];
    const totalSpace =
      last.x + last.width - first.x -
      selected.reduce((s, l) => s + l.width, 0);
    const gap = totalSpace / (selected.length - 1);
    let currentX = first.x + first.width + gap;
    for (let i = 1; i < selected.length - 1; i++) {
      state.updateLayer(selected[i].id, { x: currentX });
      currentX += selected[i].width + gap;
    }
  },
};

export const distributeVertically: Command = {
  name: 'distributeVertically',
  category: 'align',
  canExecute: () => selectedCount() >= 3,
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const selected = [...getSelectedLayers()].sort((a, b) => a.y - b.y);
    const first = selected[0];
    const last = selected[selected.length - 1];
    const totalSpace =
      last.y + last.height - first.y -
      selected.reduce((s, l) => s + l.height, 0);
    const gap = totalSpace / (selected.length - 1);
    let currentY = first.y + first.height + gap;
    for (let i = 1; i < selected.length - 1; i++) {
      state.updateLayer(selected[i].id, { y: currentY });
      currentY += selected[i].height + gap;
    }
  },
};

export const distributeLeftEdges: Command = {
  name: 'distributeLeftEdges',
  category: 'align',
  canExecute: () => selectedCount() >= 3,
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const selected = [...getSelectedLayers()].sort((a, b) => a.x - b.x);
    const first = selected[0];
    const last = selected[selected.length - 1];
    const step = (last.x - first.x) / (selected.length - 1);
    for (let i = 1; i < selected.length - 1; i++) {
      state.updateLayer(selected[i].id, { x: first.x + step * i });
    }
  },
};

export const distributeRightEdges: Command = {
  name: 'distributeRightEdges',
  category: 'align',
  canExecute: () => selectedCount() >= 3,
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const selected = [...getSelectedLayers()].sort(
      (a, b) => a.x + a.width - (b.x + b.width),
    );
    const firstRight = selected[0].x + selected[0].width;
    const lastRight =
      selected[selected.length - 1].x +
      selected[selected.length - 1].width;
    const step = (lastRight - firstRight) / (selected.length - 1);
    for (let i = 1; i < selected.length - 1; i++) {
      const targetRight = firstRight + step * i;
      state.updateLayer(selected[i].id, {
        x: targetRight - selected[i].width,
      });
    }
  },
};

export const distributeTopEdges: Command = {
  name: 'distributeTopEdges',
  category: 'align',
  canExecute: () => selectedCount() >= 3,
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const selected = [...getSelectedLayers()].sort((a, b) => a.y - b.y);
    const first = selected[0];
    const last = selected[selected.length - 1];
    const step = (last.y - first.y) / (selected.length - 1);
    for (let i = 1; i < selected.length - 1; i++) {
      state.updateLayer(selected[i].id, { y: first.y + step * i });
    }
  },
};

export const distributeBottomEdges: Command = {
  name: 'distributeBottomEdges',
  category: 'align',
  canExecute: () => selectedCount() >= 3,
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const selected = [...getSelectedLayers()].sort(
      (a, b) => a.y + a.height - (b.y + b.height),
    );
    const firstBottom = selected[0].y + selected[0].height;
    const lastBottom =
      selected[selected.length - 1].y +
      selected[selected.length - 1].height;
    const step = (lastBottom - firstBottom) / (selected.length - 1);
    for (let i = 1; i < selected.length - 1; i++) {
      const targetBottom = firstBottom + step * i;
      state.updateLayer(selected[i].id, {
        y: targetBottom - selected[i].height,
      });
    }
  },
};

// ---------------------------------------------------------------------------
// Match commands (3) – canExecute: selectedCount >= 2
// ---------------------------------------------------------------------------

export const matchWidth: Command = {
  name: 'matchWidth',
  category: 'align',
  canExecute: () => selectedCount() >= 2,
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const selected = getSelectedLayers();
    const maxWidth = Math.max(...selected.map((l) => l.width));
    for (const l of selected) {
      state.updateLayer(l.id, { width: maxWidth });
    }
  },
};

export const matchHeight: Command = {
  name: 'matchHeight',
  category: 'align',
  canExecute: () => selectedCount() >= 2,
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const selected = getSelectedLayers();
    const maxHeight = Math.max(...selected.map((l) => l.height));
    for (const l of selected) {
      state.updateLayer(l.id, { height: maxHeight });
    }
  },
};

export const matchSize: Command = {
  name: 'matchSize',
  category: 'align',
  canExecute: () => selectedCount() >= 2,
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    const selected = getSelectedLayers();
    const maxWidth = Math.max(...selected.map((l) => l.width));
    const maxHeight = Math.max(...selected.map((l) => l.height));
    for (const l of selected) {
      state.updateLayer(l.id, { width: maxWidth, height: maxHeight });
    }
  },
};

export const alignCommands: Command[] = [
  alignLeft,
  alignCenter,
  alignRight,
  alignTop,
  alignMiddle,
  alignBottom,
  distributeHorizontally,
  distributeVertically,
  distributeLeftEdges,
  distributeRightEdges,
  distributeTopEdges,
  distributeBottomEdges,
  matchWidth,
  matchHeight,
  matchSize,
];
