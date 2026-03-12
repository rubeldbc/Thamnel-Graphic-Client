import type { Command } from './types';
import type { ActiveTool } from '../types/enums';
import { useUiStore } from '../stores/uiStore';
import { useDocumentStore } from '../stores/documentStore';

const MAX_ZOOM = 32;
const MIN_ZOOM = 0.1;

export const zoomIn: Command = {
  name: 'zoomIn',
  shortcut: 'Ctrl+=',
  category: 'view',
  canExecute: () => useUiStore.getState().zoom < MAX_ZOOM,
  execute: () => {
    const store = useUiStore.getState();
    store.setZoom(store.zoom + 0.1);
  },
};

export const zoomOut: Command = {
  name: 'zoomOut',
  shortcut: 'Ctrl+-',
  category: 'view',
  canExecute: () => useUiStore.getState().zoom > MIN_ZOOM,
  execute: () => {
    const store = useUiStore.getState();
    store.setZoom(store.zoom - 0.1);
  },
};

export const originalSize: Command = {
  name: 'originalSize',
  shortcut: 'Ctrl+0',
  category: 'view',
  canExecute: () => true,
  execute: () => {
    useUiStore.getState().setZoom(1.0);
  },
};

export const toggleGrid: Command = {
  name: 'toggleGrid',
  shortcut: "Ctrl+'",
  category: 'view',
  canExecute: () => true,
  execute: () => {
    useUiStore.getState().toggleGrid();
  },
};

export const setTool: Command = {
  name: 'setTool',
  category: 'view',
  canExecute: () => true,
  execute: (tool: ActiveTool) => {
    useUiStore.getState().setActiveTool(tool);
  },
};

export const setCanvasPreset: Command = {
  name: 'setCanvasPreset',
  category: 'view',
  canExecute: () => true,
  execute: (width: number, height: number) => {
    const store = useDocumentStore.getState();
    store.pushUndo();
    store.setCanvasSize(width, height);
  },
};

export const viewCommands: Command[] = [
  zoomIn,
  zoomOut,
  originalSize,
  toggleGrid,
  setTool,
  setCanvasPreset,
];
