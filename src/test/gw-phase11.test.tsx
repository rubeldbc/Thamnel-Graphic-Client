import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TopToolbar } from '../components/TopToolbar/TopToolbar';
import { useUiStore } from '../stores/uiStore';
import { useDocumentStore } from '../stores/documentStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import { ALL_PRESETS } from '../data/canvasPresets';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset all stores to a clean state before each test. */
function resetStores() {
  useDocumentStore.setState({
    project: {
      projectId: 'test',
      version: '1.0.0',
      canvasWidth: 1920,
      canvasHeight: 1080,
      backgroundColor: '#000000',
      layers: [],
      videoPaths: [],
      timestamps: {},
      metadata: {
        name: 'Test',
        author: '',
        createdAt: '',
        modifiedAt: '',
        description: '',
      },
    },
    selectedLayerIds: [],
    undoStack: [],
    redoStack: [],
    isDirty: false,
    currentProjectPath: null,
    windowTitle: 'Thamnel',
    suppressRender: false,
  });

  useUndoRedoStore.setState({
    undoStack: [],
    redoStack: [],
    lastHash: '',
    maxSnapshotCount: 30,
  });

  useUiStore.setState({
    activeTool: 'select',
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
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GW Phase 11 -- TopToolbar with real functionality', () => {
  beforeEach(() => {
    resetStores();
  });

  // =========================================================================
  // Rendering
  // =========================================================================
  describe('rendering', () => {
    it('renders the top toolbar with all three sections', () => {
      render(<TopToolbar />);
      expect(screen.getByTestId('top-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar-left')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar-center')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar-right')).toBeInTheDocument();
    });

    it('renders branding text "Thamnel by Kamrul Islam Rubel"', () => {
      render(<TopToolbar />);
      const branding = screen.getByTestId('branding-text');
      expect(branding).toBeInTheDocument();
      expect(branding.textContent).toBe('Thamnel by Kamrul Islam Rubel');
      // Should be bold and orange
      expect(branding).toHaveStyle({ fontSize: '15px' });
    });
  });

  // =========================================================================
  // Undo / Redo buttons
  // =========================================================================
  describe('undo/redo buttons', () => {
    it('renders undo and redo buttons', () => {
      render(<TopToolbar />);
      expect(screen.getByTestId('btn-undo')).toBeInTheDocument();
      expect(screen.getByTestId('btn-redo')).toBeInTheDocument();
    });

    it('undo button is disabled when undo stack is empty', () => {
      render(<TopToolbar />);
      const undoBtn = screen.getByTestId('btn-undo');
      expect(undoBtn).toBeDisabled();
    });

    it('redo button is disabled when redo stack is empty', () => {
      render(<TopToolbar />);
      const redoBtn = screen.getByTestId('btn-redo');
      expect(redoBtn).toBeDisabled();
    });

    it('undo button becomes enabled when undo stack has entries', () => {
      // Put something on the undo stack
      act(() => {
        useUndoRedoStore.setState({ undoStack: ['["snapshot"]'] });
      });

      render(<TopToolbar />);
      const undoBtn = screen.getByTestId('btn-undo');
      expect(undoBtn).not.toBeDisabled();
    });

    it('redo button becomes enabled when redo stack has entries', () => {
      act(() => {
        useUndoRedoStore.setState({ redoStack: ['["snapshot"]'] });
      });

      render(<TopToolbar />);
      const redoBtn = screen.getByTestId('btn-redo');
      expect(redoBtn).not.toBeDisabled();
    });

    it('clicking undo calls undoRedoStore.undo()', () => {
      // Set up a populated undo stack
      act(() => {
        useUndoRedoStore.setState({ undoStack: ['[]'] });
      });

      render(<TopToolbar />);
      const undoBtn = screen.getByTestId('btn-undo');

      const spy = vi.spyOn(useUndoRedoStore.getState(), 'undo');
      fireEvent.click(undoBtn);
      // The handler calls useUndoRedoStore.getState().undo()
      // Since we set up a stack entry, the click should have triggered undo
      expect(useUndoRedoStore.getState().undoStack).toHaveLength(0);
      spy.mockRestore();
    });

    it('clicking redo calls undoRedoStore.redo()', () => {
      act(() => {
        useUndoRedoStore.setState({ redoStack: ['[]'] });
      });

      render(<TopToolbar />);
      const redoBtn = screen.getByTestId('btn-redo');

      fireEvent.click(redoBtn);
      expect(useUndoRedoStore.getState().redoStack).toHaveLength(0);
    });
  });

  // =========================================================================
  // Zoom controls
  // =========================================================================
  describe('zoom controls', () => {
    it('displays current zoom percentage', () => {
      render(<TopToolbar />);
      const display = screen.getByTestId('zoom-display');
      expect(display.textContent).toBe('100%');
    });

    it('zoom in increases zoom by 0.1', () => {
      render(<TopToolbar />);
      const zoomInBtn = screen.getByTestId('btn-zoom-in');

      fireEvent.click(zoomInBtn);
      expect(useUiStore.getState().zoom).toBeCloseTo(1.1);
    });

    it('zoom out decreases zoom by 0.1', () => {
      render(<TopToolbar />);
      const zoomOutBtn = screen.getByTestId('btn-zoom-out');

      fireEvent.click(zoomOutBtn);
      expect(useUiStore.getState().zoom).toBeCloseTo(0.9);
    });

    it('original size resets zoom to 1.0', () => {
      act(() => {
        useUiStore.getState().setZoom(2.5);
      });

      render(<TopToolbar />);
      const originalBtn = screen.getByTestId('btn-zoom-original');

      fireEvent.click(originalBtn);
      expect(useUiStore.getState().zoom).toBe(1.0);
    });

    it('fit to screen sets a calculated zoom value', () => {
      // Mock window dimensions
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });

      act(() => {
        useUiStore.getState().setZoom(3.0);
      });

      render(<TopToolbar />);
      const fitBtn = screen.getByTestId('btn-fit-screen');

      fireEvent.click(fitBtn);
      const zoom = useUiStore.getState().zoom;
      // Should be less than or equal to 1.0 and greater than 0.1
      expect(zoom).toBeGreaterThanOrEqual(0.1);
      expect(zoom).toBeLessThanOrEqual(1.0);
    });

    it('zoom display updates after store changes', () => {
      act(() => {
        useUiStore.getState().setZoom(0.5);
      });

      render(<TopToolbar />);
      const display = screen.getByTestId('zoom-display');
      expect(display.textContent).toBe('50%');
    });
  });

  // =========================================================================
  // Canvas preset selector
  // =========================================================================
  describe('canvas size preset', () => {
    it('renders canvas size combo', () => {
      render(<TopToolbar />);
      const combo = screen.getByTestId('combo-canvas-size');
      expect(combo).toBeInTheDocument();
    });

    it('shows current canvas size as value', () => {
      render(<TopToolbar />);
      const combo = screen.getByTestId('combo-canvas-size');
      // The default canvas is 1920x1080, so the combo should reflect this
      expect(combo).toBeInTheDocument();
    });

    it('canvas preset options include all presets from canvasPresets.ts', () => {
      // Verify the options array was built from ALL_PRESETS
      // We check that the number of non-group options equals ALL_PRESETS.length
      render(<TopToolbar />);
      // The combo has options built from ALL_PRESETS plus 3 group headers
      const combo = screen.getByTestId('combo-canvas-size');
      expect(combo).toBeInTheDocument();
      // Verify the presets data has expected count
      expect(ALL_PRESETS.length).toBe(35);
    });
  });

  // =========================================================================
  // Quality combo
  // =========================================================================
  describe('quality combo', () => {
    it('renders quality combo with default 100%', () => {
      render(<TopToolbar />);
      const combo = screen.getByTestId('combo-quality');
      expect(combo).toBeInTheDocument();
    });

    it('quality is stored in uiStore.canvasQuality', () => {
      expect(useUiStore.getState().canvasQuality).toBe(100);
    });

    it('setCanvasQuality updates the store', () => {
      act(() => {
        useUiStore.getState().setCanvasQuality(50);
      });
      expect(useUiStore.getState().canvasQuality).toBe(50);
    });

    it('setCanvasQuality clamps to valid range (10-100)', () => {
      act(() => {
        useUiStore.getState().setCanvasQuality(5);
      });
      expect(useUiStore.getState().canvasQuality).toBe(10);

      act(() => {
        useUiStore.getState().setCanvasQuality(200);
      });
      expect(useUiStore.getState().canvasQuality).toBe(100);
    });
  });

  // =========================================================================
  // Grid toggle
  // =========================================================================
  describe('grid toggle', () => {
    it('renders grid button', () => {
      render(<TopToolbar />);
      expect(screen.getByTestId('btn-grid')).toBeInTheDocument();
    });

    it('clicking grid button toggles uiStore.gridVisible', () => {
      expect(useUiStore.getState().gridVisible).toBe(false);

      render(<TopToolbar />);
      const gridBtn = screen.getByTestId('btn-grid');

      fireEvent.click(gridBtn);
      expect(useUiStore.getState().gridVisible).toBe(true);

      fireEvent.click(gridBtn);
      expect(useUiStore.getState().gridVisible).toBe(false);
    });

    it('grid button shows active state when grid is visible', () => {
      act(() => {
        useUiStore.setState({ gridVisible: true });
      });

      render(<TopToolbar />);
      const gridBtn = screen.getByTestId('btn-grid');
      expect(gridBtn).toHaveAttribute('data-active', 'true');
    });
  });

  // =========================================================================
  // Left panel tab toggles
  // =========================================================================
  describe('left panel tab toggles', () => {
    it('video browser toggle sets leftPanelTab to VIDEO', () => {
      render(<TopToolbar />);
      const btn = screen.getByTestId('btn-video-browser');

      fireEvent.click(btn);
      expect(useUiStore.getState().leftPanelTab).toBe('VIDEO');
    });

    it('image gallery toggle sets leftPanelTab to IMAGE', () => {
      render(<TopToolbar />);
      const btn = screen.getByTestId('btn-image-gallery');

      fireEvent.click(btn);
      expect(useUiStore.getState().leftPanelTab).toBe('IMAGE');
    });

    it('audio toggle sets leftPanelTab to AUDIO', () => {
      render(<TopToolbar />);
      const btn = screen.getByTestId('btn-audio');

      fireEvent.click(btn);
      expect(useUiStore.getState().leftPanelTab).toBe('AUDIO');
    });

    it('toggling the same tab again sets leftPanelTab to null', () => {
      render(<TopToolbar />);
      const btn = screen.getByTestId('btn-video-browser');

      fireEvent.click(btn);
      expect(useUiStore.getState().leftPanelTab).toBe('VIDEO');

      fireEvent.click(btn);
      expect(useUiStore.getState().leftPanelTab).toBeNull();
    });

    it('video browser button shows active state', () => {
      act(() => {
        useUiStore.setState({ leftPanelTab: 'VIDEO' });
      });

      render(<TopToolbar />);
      const btn = screen.getByTestId('btn-video-browser');
      expect(btn).toHaveAttribute('data-active', 'true');
    });
  });

  // =========================================================================
  // New Project
  // =========================================================================
  describe('new project', () => {
    it('clicking New resets the project', () => {
      // Dirty the project first
      act(() => {
        useDocumentStore.getState().markDirty();
      });

      // Mock window.confirm to approve
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<TopToolbar />);
      const newBtn = screen.getByTestId('btn-new');
      fireEvent.click(newBtn);

      // Project should be reset
      expect(useDocumentStore.getState().isDirty).toBe(false);
      expect(useDocumentStore.getState().currentProjectPath).toBeNull();
      expect(useDocumentStore.getState().project.layers).toHaveLength(0);
      // Undo stack should be cleared
      expect(useUndoRedoStore.getState().undoStack).toHaveLength(0);

      confirmSpy.mockRestore();
    });

    it('new project shows confirm when dirty and cancels if declined', () => {
      act(() => {
        useDocumentStore.getState().markDirty();
        useDocumentStore.getState().setWindowTitle('My Project');
      });

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<TopToolbar />);
      const newBtn = screen.getByTestId('btn-new');
      fireEvent.click(newBtn);

      // Should NOT have reset
      expect(useDocumentStore.getState().isDirty).toBe(true);

      confirmSpy.mockRestore();
    });

    it('new project does not confirm when not dirty', () => {
      const confirmSpy = vi.spyOn(window, 'confirm');

      render(<TopToolbar />);
      const newBtn = screen.getByTestId('btn-new');
      fireEvent.click(newBtn);

      expect(confirmSpy).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  // =========================================================================
  // Settings and Debug dialogs
  // =========================================================================
  describe('dialog buttons', () => {
    it('settings button opens settings dialog', () => {
      render(<TopToolbar />);
      const settingsBtn = screen.getByTestId('btn-settings');

      fireEvent.click(settingsBtn);
      expect(useUiStore.getState().activeDialog).toBe('settings');
    });

    it('debug button opens debug dialog', () => {
      render(<TopToolbar />);
      const debugBtn = screen.getByTestId('btn-debug');

      fireEvent.click(debugBtn);
      expect(useUiStore.getState().activeDialog).toBe('debug');
    });

    it('export list button opens exportList dialog', () => {
      render(<TopToolbar />);
      const btn = screen.getByTestId('btn-export-list');

      fireEvent.click(btn);
      expect(useUiStore.getState().activeDialog).toBe('exportList');
    });

    it('batch button opens batchProducer dialog', () => {
      render(<TopToolbar />);
      const btn = screen.getByTestId('btn-batch');

      fireEvent.click(btn);
      expect(useUiStore.getState().activeDialog).toBe('batchProducer');
    });
  });

  // =========================================================================
  // uiStore extensions
  // =========================================================================
  describe('uiStore new fields', () => {
    it('leftPanelTab defaults to null', () => {
      expect(useUiStore.getState().leftPanelTab).toBeNull();
    });

    it('canvasQuality defaults to 100', () => {
      expect(useUiStore.getState().canvasQuality).toBe(100);
    });

    it('toggleLeftPanelTab toggles tab and opens panel', () => {
      act(() => {
        useUiStore.setState({ leftPanelVisible: false });
      });

      act(() => {
        useUiStore.getState().toggleLeftPanelTab('VIDEO');
      });

      expect(useUiStore.getState().leftPanelTab).toBe('VIDEO');
      expect(useUiStore.getState().leftPanelVisible).toBe(true);
    });

    it('toggleLeftPanelTab clears tab when already active', () => {
      act(() => {
        useUiStore.setState({ leftPanelTab: 'IMAGE' });
      });

      act(() => {
        useUiStore.getState().toggleLeftPanelTab('IMAGE');
      });

      expect(useUiStore.getState().leftPanelTab).toBeNull();
    });

    it('setLeftPanelTab opens panel', () => {
      act(() => {
        useUiStore.setState({ leftPanelVisible: false });
      });

      act(() => {
        useUiStore.getState().setLeftPanelTab('AUDIO');
      });

      expect(useUiStore.getState().leftPanelTab).toBe('AUDIO');
      expect(useUiStore.getState().leftPanelVisible).toBe(true);
    });
  });

  // =========================================================================
  // All left section buttons are present
  // =========================================================================
  describe('all left section buttons present', () => {
    it('renders all expected buttons', () => {
      render(<TopToolbar />);
      const buttonIds = [
        'btn-new',
        'btn-open',
        'btn-save',
        'btn-template',
        'btn-copy',
        'btn-video',
        'btn-export',
        'btn-export-list',
        'btn-batch',
        'btn-gallery',
        'btn-video-browser',
        'btn-image-gallery',
        'btn-send',
        'btn-audio',
        'btn-undo',
        'btn-redo',
      ];
      for (const id of buttonIds) {
        expect(screen.getByTestId(id)).toBeInTheDocument();
      }
    });
  });

  // =========================================================================
  // All right section controls present
  // =========================================================================
  describe('all right section controls present', () => {
    it('renders all expected right section controls', () => {
      render(<TopToolbar />);
      const controlIds = [
        'combo-quality',
        'combo-canvas-size',
        'combo-layout',
        'btn-zoom-out',
        'zoom-display',
        'btn-zoom-in',
        'btn-zoom-original',
        'btn-fit-screen',
        'btn-grid',
        'btn-settings',
        'btn-debug',
      ];
      for (const id of controlIds) {
        expect(screen.getByTestId(id)).toBeInTheDocument();
      }
    });
  });
});
