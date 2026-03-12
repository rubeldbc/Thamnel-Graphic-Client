import { create } from 'zustand';
import type { ActiveTool } from '../types/index';
import type { ShapeType } from '../types/enums';

export type LeftPanelTab = 'VIDEO' | 'IMAGE' | 'AUDIO' | null;

export interface UiState {
  activeTool: ActiveTool;
  /** When shape tool is active, which shape type to draw. */
  selectedShapeType: ShapeType;
  /** Default fill color for newly drawn shapes. */
  drawFillColor: string;
  /** Default stroke color for newly drawn shapes. */
  drawStrokeColor: string;
  /** Live polygon sides count during shape drawing (adjusted by up/down arrow). */
  drawPolygonSides: number;
  zoom: number;
  gridVisible: boolean;
  isEditingText: boolean;
  leftPanelVisible: boolean;
  rightPanelVisible: boolean;
  leftPanelTab: LeftPanelTab;
  canvasQuality: number;
  framePanelHeight: number;
  statusMessage: string;
  activeDialog: string | null;
}

export interface UiActions {
  setActiveTool: (tool: ActiveTool) => void;
  setSelectedShapeType: (shape: ShapeType) => void;
  setDrawFillColor: (color: string) => void;
  setDrawStrokeColor: (color: string) => void;
  setDrawPolygonSides: (sides: number) => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
  setEditingText: (editing: boolean) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelTab: (tab: LeftPanelTab) => void;
  toggleLeftPanelTab: (tab: Exclude<LeftPanelTab, null>) => void;
  setCanvasQuality: (quality: number) => void;
  setFramePanelHeight: (height: number) => void;
  setStatusMessage: (message: string) => void;
  setActiveDialog: (dialog: string | null) => void;
}

export type UiStore = UiState & UiActions;

export const useUiStore = create<UiStore>((set) => ({
  activeTool: 'select',
  selectedShapeType: 'rectangle',
  drawFillColor: '#3b82f6',
  drawStrokeColor: '#000000',
  drawPolygonSides: 4,
  zoom: 1,
  gridVisible: false,
  isEditingText: false,
  leftPanelVisible: true,
  rightPanelVisible: true,
  leftPanelTab: null,
  canvasQuality: 100,
  framePanelHeight: 150,
  statusMessage: '',
  activeDialog: null,

  setActiveTool: (tool) => set({ activeTool: tool }),

  setSelectedShapeType: (shape) => set({ selectedShapeType: shape }),

  setDrawFillColor: (color) => set({ drawFillColor: color }),

  setDrawStrokeColor: (color) => set({ drawStrokeColor: color }),

  setDrawPolygonSides: (sides) => set({ drawPolygonSides: Math.max(3, sides) }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(zoom, 32)) }),

  toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),

  setEditingText: (editing) => set({ isEditingText: editing }),

  toggleLeftPanel: () =>
    set((state) => ({ leftPanelVisible: !state.leftPanelVisible })),

  toggleRightPanel: () =>
    set((state) => ({ rightPanelVisible: !state.rightPanelVisible })),

  setLeftPanelTab: (tab) => set({ leftPanelTab: tab, leftPanelVisible: true }),

  toggleLeftPanelTab: (tab) =>
    set((state) => {
      if (state.leftPanelTab === tab) {
        return { leftPanelTab: null };
      }
      return { leftPanelTab: tab, leftPanelVisible: true };
    }),

  setCanvasQuality: (quality) =>
    set({ canvasQuality: Math.max(10, Math.min(quality, 100)) }),

  setFramePanelHeight: (height) => set({ framePanelHeight: height }),

  setStatusMessage: (message) => set({ statusMessage: message }),

  setActiveDialog: (dialog) => set({ activeDialog: dialog }),
}));
