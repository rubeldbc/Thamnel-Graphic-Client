import type { Command } from './types';
import type { ShapeType } from '../types/enums';
import { useDocumentStore } from '../stores/documentStore';
import {
  createDefaultLayer,
  createDefaultTextProperties,
  createDefaultShapeProperties,
  getUniqueLayerName,
} from '../types/index';

function hasSelection(): boolean {
  return useDocumentStore.getState().selectedLayerIds.length > 0;
}

function getSelectedLayers() {
  const state = useDocumentStore.getState();
  return state.project.layers.filter((l) =>
    state.selectedLayerIds.includes(l.id),
  );
}

function notFirstLayer(): boolean {
  const state = useDocumentStore.getState();
  if (state.selectedLayerIds.length === 0) return false;
  const idx = state.project.layers.findIndex(
    (l) => l.id === state.selectedLayerIds[0],
  );
  return idx > 0;
}

function isTextOrShape(): boolean {
  const selected = getSelectedLayers();
  return selected.some((l) => l.type === 'text' || l.type === 'shape');
}

export const addText: Command = {
  name: 'addText',
  shortcut: 'T',
  category: 'layer',
  canExecute: () => true,
  execute: () => {
    const store = useDocumentStore.getState();
    store.pushUndo();
    const layer = createDefaultLayer({
      type: 'text',
      name: getUniqueLayerName('Text Layer', store.project.layers),
      width: 200,
      height: 50,
      textProperties: createDefaultTextProperties(),
    });
    store.addLayer(layer);
    store.selectLayer(layer.id);
  },
};

export const addShape: Command = {
  name: 'addShape',
  shortcut: 'S',
  category: 'layer',
  canExecute: () => true,
  execute: (shapeType: ShapeType = 'rectangle') => {
    const store = useDocumentStore.getState();
    store.pushUndo();
    const props = createDefaultShapeProperties();
    props.shapeType = shapeType;
    const layer = createDefaultLayer({
      type: 'shape',
      name: getUniqueLayerName(`Shape (${shapeType})`, store.project.layers),
      width: 100,
      height: 100,
      shapeProperties: props,
    });
    store.addLayer(layer);
    store.selectLayer(layer.id);
  },
};

export const addNewLayer: Command = {
  name: 'addNewLayer',
  shortcut: 'Ctrl+Shift+N',
  category: 'layer',
  canExecute: () => true,
  execute: () => {
    const store = useDocumentStore.getState();
    store.pushUndo();
    const layer = createDefaultLayer({
      type: 'image',
      name: getUniqueLayerName('New Layer', store.project.layers),
    });
    store.addLayer(layer);
    store.selectLayer(layer.id);
  },
};

export const addNewGroup: Command = {
  name: 'addNewGroup',
  shortcut: 'Ctrl+G',
  category: 'layer',
  canExecute: () => true,
  execute: () => {
    const store = useDocumentStore.getState();
    store.pushUndo();
    const layer = createDefaultLayer({
      type: 'group',
      name: getUniqueLayerName('New Group', store.project.layers),
      width: 0,
      height: 0,
    });
    store.addLayer(layer);
    store.selectLayer(layer.id);
  },
};

export const mergeDown: Command = {
  name: 'mergeDown',
  shortcut: 'Ctrl+M',
  category: 'layer',
  canExecute: () => hasSelection() && notFirstLayer(),
  execute: () => {
    console.log('[layerCommands] mergeDown');
  },
};

export const rasterize: Command = {
  name: 'rasterize',
  category: 'layer',
  canExecute: () => hasSelection() && isTextOrShape(),
  execute: () => {
    console.log('[layerCommands] rasterize');
  },
};

export const quickExportLayer: Command = {
  name: 'quickExportLayer',
  category: 'layer',
  canExecute: () => hasSelection(),
  execute: () => {
    console.log('[layerCommands] quickExportLayer');
  },
};

export const lockLayer: Command = {
  name: 'lockLayer',
  shortcut: 'Ctrl+L',
  category: 'layer',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    for (const id of state.selectedLayerIds) {
      const layer = state.project.layers.find((l) => l.id === id);
      if (layer) {
        state.updateLayer(id, { locked: !layer.locked });
      }
    }
  },
};

export const toggleVisibility: Command = {
  name: 'toggleVisibility',
  category: 'layer',
  canExecute: () => hasSelection(),
  execute: () => {
    const state = useDocumentStore.getState();
    state.pushUndo();
    for (const id of state.selectedLayerIds) {
      const layer = state.project.layers.find((l) => l.id === id);
      if (layer) {
        state.updateLayer(id, { visible: !layer.visible });
      }
    }
  },
};

export const addDateStamp: Command = {
  name: 'addDateStamp',
  category: 'layer',
  canExecute: () => true,
  execute: () => {
    const store = useDocumentStore.getState();
    store.pushUndo();
    const now = new Date();
    const stamp = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    const textProps = createDefaultTextProperties();
    textProps.text = stamp;
    const layer = createDefaultLayer({
      type: 'text',
      name: getUniqueLayerName('Date Stamp', store.project.layers),
      width: 200,
      height: 40,
      textProperties: textProps,
    });
    store.addLayer(layer);
    store.selectLayer(layer.id);
  },
};

export const layerCommands: Command[] = [
  addText,
  addShape,
  addNewLayer,
  addNewGroup,
  addDateStamp,
  mergeDown,
  rasterize,
  quickExportLayer,
  lockLayer,
  toggleVisibility,
];
