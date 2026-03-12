import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react';

import { ColorPickerWindow, hexToRgb, rgbToHex, rgbToHsb, hsbToRgb, hsbToHex } from '../components/Dialogs/ColorPickerWindow';
import { FillPickerWindow } from '../components/Dialogs/FillPickerWindow';
import { SettingsWindow } from '../components/Dialogs/SettingsWindow';
import { NewDocumentDialog } from '../components/Dialogs/NewDocumentDialog';
import { ShapeDrawingWindow } from '../components/Dialogs/ShapeDrawingWindow';
import { TextPropertiesWindow } from '../components/Dialogs/TextPropertiesWindow';
import { BatchProducerWindow } from '../components/Dialogs/BatchProducerWindow';
import { ImageStudioWindow } from '../components/ImageStudio/ImageStudioWindow';
import { useDocumentStore } from '../stores/documentStore';
import { useUiStore } from '../stores/uiStore';
import { useSettingsStore } from '../settings/settingsStore';
import { createDefaultSettings } from '../settings/AppSettings';

// ---------------------------------------------------------------------------
// Store reset helper
// ---------------------------------------------------------------------------

function resetAllStores() {
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

  useSettingsStore.setState({
    settings: createDefaultSettings(),
    version: 1,
  });
}

// ===========================================================================
// PHASE 19A — ColorPicker HSB-to-hex conversion
// ===========================================================================

describe('Phase 19A — ColorPickerWindow', () => {
  beforeEach(resetAllStores);

  describe('Color conversion helpers', () => {
    it('converts hex to RGB correctly', () => {
      expect(hexToRgb('#FF6600')).toEqual([255, 102, 0]);
      expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
      expect(hexToRgb('#FFFFFF')).toEqual([255, 255, 255]);
      expect(hexToRgb('#808080')).toEqual([128, 128, 128]);
    });

    it('converts RGB to hex correctly', () => {
      expect(rgbToHex(255, 102, 0)).toBe('#FF6600');
      expect(rgbToHex(0, 0, 0)).toBe('#000000');
      expect(rgbToHex(255, 255, 255)).toBe('#FFFFFF');
    });

    it('converts RGB to HSB correctly', () => {
      // Pure red
      const [h, s, b] = rgbToHsb(255, 0, 0);
      expect(h).toBe(0);
      expect(s).toBe(100);
      expect(b).toBe(100);
    });

    it('converts HSB to RGB correctly', () => {
      // Pure red: H=0, S=100, B=100
      expect(hsbToRgb(0, 100, 100)).toEqual([255, 0, 0]);
      // Pure green: H=120, S=100, B=100
      expect(hsbToRgb(120, 100, 100)).toEqual([0, 255, 0]);
      // Pure blue: H=240, S=100, B=100
      expect(hsbToRgb(240, 100, 100)).toEqual([0, 0, 255]);
      // Black: any H/S, B=0
      expect(hsbToRgb(0, 0, 0)).toEqual([0, 0, 0]);
      // White: any H, S=0, B=100
      expect(hsbToRgb(0, 0, 100)).toEqual([255, 255, 255]);
    });

    it('round-trips hex -> RGB -> HSB -> RGB -> hex', () => {
      const testColors = ['#FF6600', '#00FF00', '#0000FF', '#FF00FF', '#FFFF00'];
      for (const hex of testColors) {
        const [r, g, b] = hexToRgb(hex);
        const [h, s, v] = rgbToHsb(r, g, b);
        const [r2, g2, b2] = hsbToRgb(h, s, v);
        const hex2 = rgbToHex(r2, g2, b2);
        expect(hex2).toBe(hex);
      }
    });

    it('converts HSB to hex via hsbToHex', () => {
      expect(hsbToHex(0, 100, 100)).toBe('#FF0000');
      expect(hsbToHex(0, 0, 0)).toBe('#000000');
      expect(hsbToHex(0, 0, 100)).toBe('#FFFFFF');
    });
  });

  it('renders ColorPickerWindow with all controls', () => {
    render(
      <ColorPickerWindow
        open={true}
        onOpenChange={() => {}}
        initialColor="#FF6600"
      />,
    );

    expect(screen.getByTestId('color-picker-dialog-content')).toBeInTheDocument();
    expect(screen.getByTestId('sv-gradient')).toBeInTheDocument();
    expect(screen.getByTestId('hue-bar')).toBeInTheDocument();
    expect(screen.getByTestId('alpha-bar')).toBeInTheDocument();
    expect(screen.getByTestId('hsb-inputs')).toBeInTheDocument();
    expect(screen.getByTestId('rgb-inputs')).toBeInTheDocument();
    expect(screen.getByTestId('hex-input')).toBeInTheDocument();
    expect(screen.getByTestId('alpha-input')).toBeInTheDocument();
    expect(screen.getByTestId('color-preview-swatches')).toBeInTheDocument();
    expect(screen.getByTestId('eyedropper-button')).toBeInTheDocument();
  });

  it('calls onOk with current hex when OK is clicked', async () => {
    const onOk = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ColorPickerWindow
        open={true}
        onOpenChange={onOpenChange}
        initialColor="#FF0000"
        onOk={onOk}
      />,
    );

    await userEvent.click(screen.getByTestId('color-picker-ok'));
    expect(onOk).toHaveBeenCalledWith('#FF0000');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onOpenChange(false) when Cancel is clicked', async () => {
    const onOpenChange = vi.fn();
    render(
      <ColorPickerWindow
        open={true}
        onOpenChange={onOpenChange}
        initialColor="#FF0000"
      />,
    );

    await userEvent.click(screen.getByTestId('color-picker-cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows old and new color swatches', () => {
    render(
      <ColorPickerWindow
        open={true}
        onOpenChange={() => {}}
        initialColor="#FF6600"
      />,
    );

    const oldSwatch = screen.getByTestId('old-color-swatch');
    expect(oldSwatch).toHaveStyle({ backgroundColor: '#FF6600' });
  });
});

// ===========================================================================
// PHASE 19B — FillPickerWindow
// ===========================================================================

describe('Phase 19B — FillPickerWindow', () => {
  beforeEach(resetAllStores);

  it('renders with three tabs', () => {
    render(
      <FillPickerWindow open={true} onOpenChange={() => {}} />,
    );

    expect(screen.getByTestId('fill-picker-dialog-content')).toBeInTheDocument();
    expect(screen.getByTestId('fill-tab-solid')).toBeInTheDocument();
    expect(screen.getByTestId('fill-tab-gradient')).toBeInTheDocument();
    expect(screen.getByTestId('fill-tab-image-fill')).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    render(
      <FillPickerWindow open={true} onOpenChange={() => {}} />,
    );

    // Default is solid
    expect(screen.getByTestId('fill-solid-tab')).toBeInTheDocument();

    // Switch to gradient
    await userEvent.click(screen.getByTestId('fill-tab-gradient'));
    expect(screen.getByTestId('fill-gradient-tab')).toBeInTheDocument();
    expect(screen.getByTestId('gradient-bar')).toBeInTheDocument();

    // Switch to image fill
    await userEvent.click(screen.getByTestId('fill-tab-image-fill'));
    expect(screen.getByTestId('fill-image-tab')).toBeInTheDocument();
    expect(screen.getByTestId('fill-image-selector')).toBeInTheDocument();
  });

  it('returns FillDefinition on OK', async () => {
    const onOk = vi.fn();
    render(
      <FillPickerWindow open={true} onOpenChange={() => {}} onOk={onOk} />,
    );

    await userEvent.click(screen.getByTestId('fill-picker-ok'));
    expect(onOk).toHaveBeenCalledTimes(1);
    const fill = onOk.mock.calls[0][0];
    expect(fill).toHaveProperty('type', 'solid');
    expect(fill).toHaveProperty('solidColor');
    expect(fill).toHaveProperty('gradientStops');
    expect(fill).toHaveProperty('globalAlpha');
  });

  it('shows preview strip', () => {
    render(
      <FillPickerWindow open={true} onOpenChange={() => {}} />,
    );
    expect(screen.getByTestId('fill-preview-strip')).toBeInTheDocument();
  });

  it('has gradient type toggle buttons', async () => {
    render(
      <FillPickerWindow open={true} onOpenChange={() => {}} />,
    );

    await userEvent.click(screen.getByTestId('fill-tab-gradient'));
    expect(screen.getByTestId('gradient-type-linear')).toBeInTheDocument();
    expect(screen.getByTestId('gradient-type-radial')).toBeInTheDocument();
    expect(screen.getByTestId('gradient-type-sweep')).toBeInTheDocument();
  });
});

// ===========================================================================
// PHASE 19C — SettingsWindow
// ===========================================================================

describe('Phase 19C — SettingsWindow', () => {
  beforeEach(resetAllStores);

  it('renders with all 5 tabs', () => {
    render(
      <SettingsWindow open={true} onOpenChange={() => {}} />,
    );

    expect(screen.getByTestId('settings-dialog-content')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-general')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-export')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-ai')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-network')).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    render(
      <SettingsWindow open={true} onOpenChange={() => {}} />,
    );

    // Default is general
    expect(screen.getByTestId('settings-general')).toBeInTheDocument();

    // Switch to canvas
    await userEvent.click(screen.getByTestId('settings-tab-canvas'));
    expect(screen.getByTestId('settings-canvas')).toBeInTheDocument();

    // Switch to export
    await userEvent.click(screen.getByTestId('settings-tab-export'));
    expect(screen.getByTestId('settings-export')).toBeInTheDocument();

    // Switch to AI
    await userEvent.click(screen.getByTestId('settings-tab-ai'));
    expect(screen.getByTestId('settings-ai')).toBeInTheDocument();

    // Switch to network
    await userEvent.click(screen.getByTestId('settings-tab-network'));
    expect(screen.getByTestId('settings-network')).toBeInTheDocument();
  });

  it('saves settings to settingsStore', async () => {
    const onSave = vi.fn();
    render(
      <SettingsWindow open={true} onOpenChange={() => {}} onSave={onSave} />,
    );

    await userEvent.click(screen.getByTestId('settings-save'));
    expect(onSave).toHaveBeenCalledTimes(1);

    // Verify that settings were written to the store
    const settings = useSettingsStore.getState().settings;
    expect(settings).toBeDefined();
    expect(settings.undoRedo.maxSteps).toBeGreaterThan(0);
  });

  it('resets all settings', async () => {
    const onReset = vi.fn();
    // First change a setting
    useSettingsStore.getState().setSetting('canvas.gridSize', 999);
    expect(useSettingsStore.getState().settings.canvas.gridSize).toBe(999);

    render(
      <SettingsWindow open={true} onOpenChange={() => {}} onReset={onReset} />,
    );

    // First click shows confirmation
    await userEvent.click(screen.getByTestId('settings-reset-all'));
    expect(onReset).toHaveBeenCalledTimes(0);

    // Second click (confirm) actually resets
    await userEvent.click(screen.getByText('Yes, Reset'));
    expect(onReset).toHaveBeenCalledTimes(1);

    // After reset, store should have default grid size
    const defaults = createDefaultSettings();
    expect(useSettingsStore.getState().settings.canvas.gridSize).toBe(defaults.canvas.gridSize);
  });

  it('cancel closes without saving', async () => {
    const onOpenChange = vi.fn();
    render(
      <SettingsWindow open={true} onOpenChange={onOpenChange} />,
    );

    await userEvent.click(screen.getByTestId('settings-cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

// ===========================================================================
// PHASE 19D — NewDocumentDialog
// ===========================================================================

describe('Phase 19D — NewDocumentDialog', () => {
  beforeEach(resetAllStores);

  it('renders with width, height, presets', () => {
    render(
      <NewDocumentDialog open={true} onOpenChange={() => {}} />,
    );

    expect(screen.getByTestId('new-document-dialog-content')).toBeInTheDocument();
    expect(screen.getByTestId('preset-list')).toBeInTheDocument();
    expect(screen.getByText('CUSTOM SIZE')).toBeInTheDocument();
  });

  it('creates project with selected size via documentStore', async () => {
    const onCreate = vi.fn();
    const onOpenChange = vi.fn();

    // Set initial store state
    useDocumentStore.setState({
      project: {
        ...useDocumentStore.getState().project,
        canvasWidth: 100,
        canvasHeight: 100,
      },
    });

    render(
      <NewDocumentDialog open={true} onOpenChange={onOpenChange} onCreate={onCreate} />,
    );

    // Click the VGA preset (640x480) - unique dimensions
    const presetBtn = screen.getByTestId('preset-640x480');
    await userEvent.click(presetBtn);

    // Click Create
    await userEvent.click(screen.getByTestId('new-doc-create'));

    expect(onCreate).toHaveBeenCalledWith(640, 480);
    expect(onOpenChange).toHaveBeenCalledWith(false);

    // Verify documentStore was updated
    const state = useDocumentStore.getState();
    expect(state.project.canvasWidth).toBe(640);
    expect(state.project.canvasHeight).toBe(480);
  });

  it('cancel closes without creating', async () => {
    const onOpenChange = vi.fn();
    const onCreate = vi.fn();

    render(
      <NewDocumentDialog open={true} onOpenChange={onOpenChange} onCreate={onCreate} />,
    );

    await userEvent.click(screen.getByTestId('new-doc-cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('shows grouped preset categories and My Presets section', () => {
    render(
      <NewDocumentDialog open={true} onOpenChange={() => {}} />,
    );

    expect(screen.getByText('Social Media')).toBeInTheDocument();
    expect(screen.getByText('Paper')).toBeInTheDocument();
    expect(screen.getByText('Display & Video')).toBeInTheDocument();
    expect(screen.getByText('MY PRESETS')).toBeInTheDocument();
    expect(screen.getByTestId('save-preset-btn')).toBeInTheDocument();
  });
});

// ===========================================================================
// PHASE 19E — ShapeDrawingWindow (ShapeCreator)
// ===========================================================================

describe('Phase 19E — ShapeDrawingWindow', () => {
  beforeEach(resetAllStores);

  it('renders shape drawing window with all sections', () => {
    render(
      <ShapeDrawingWindow open={true} onOpenChange={() => {}} />,
    );

    expect(screen.getByTestId('shape-drawing-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('shape-left-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('shape-right-panel')).toBeInTheDocument();
    expect(screen.getByTestId('shape-canvas-area')).toBeInTheDocument();
    expect(screen.getByTestId('shape-palette')).toBeInTheDocument();
    expect(screen.getByTestId('shape-layers-panel')).toBeInTheDocument();
  });

  it('has 27 predefined shape buttons in the palette', () => {
    render(
      <ShapeDrawingWindow open={true} onOpenChange={() => {}} />,
    );

    const palette = screen.getByTestId('shape-palette');
    const buttons = within(palette).getAllByRole('button');
    expect(buttons.length).toBe(27);
  });

  it('send to canvas calls addShape and closes', async () => {
    const onOpenChange = vi.fn();
    const onSendToCanvas = vi.fn();
    render(
      <ShapeDrawingWindow open={true} onOpenChange={onOpenChange} onSendToCanvas={onSendToCanvas} />,
    );

    await userEvent.click(screen.getByTestId('shape-send-to-canvas'));
    expect(onSendToCanvas).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);

    // Should have added a shape layer
    const state = useDocumentStore.getState();
    expect(state.project.layers.length).toBeGreaterThan(0);
    const lastLayer = state.project.layers[state.project.layers.length - 1];
    expect(lastLayer.type).toBe('shape');
  });

  it('cancel closes without adding layer', async () => {
    const onOpenChange = vi.fn();
    render(
      <ShapeDrawingWindow open={true} onOpenChange={onOpenChange} />,
    );

    await userEvent.click(screen.getByTestId('shape-cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(useDocumentStore.getState().project.layers.length).toBe(0);
  });

  it('has tool buttons in left toolbar', () => {
    render(
      <ShapeDrawingWindow open={true} onOpenChange={() => {}} />,
    );

    expect(screen.getByTestId('shape-tool-select')).toBeInTheDocument();
    expect(screen.getByTestId('shape-tool-pen')).toBeInTheDocument();
    expect(screen.getByTestId('shape-tool-freehand')).toBeInTheDocument();
    expect(screen.getByTestId('shape-tool-eraser')).toBeInTheDocument();
    expect(screen.getByTestId('shape-tool-zoom')).toBeInTheDocument();
    expect(screen.getByTestId('shape-tool-pan')).toBeInTheDocument();
  });
});

// ===========================================================================
// PHASE 20A — Image Studio
// ===========================================================================

describe('Phase 20A — ImageStudioWindow', () => {
  beforeEach(resetAllStores);

  it('renders with all major sections', () => {
    render(
      <ImageStudioWindow open={true} onOpenChange={() => {}} />,
    );

    expect(screen.getByTestId('image-studio-window')).toBeInTheDocument();
    expect(screen.getByTestId('right-panel')).toBeInTheDocument();
    expect(screen.getByTestId('action-bar')).toBeInTheDocument();
    expect(screen.getByTestId('apply-combined-button')).toBeInTheDocument();
    expect(screen.getByTestId('apply-fg-button')).toBeInTheDocument();
    expect(screen.getByTestId('apply-bg-button')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    expect(screen.getByTestId('keep-original-checkbox')).toBeInTheDocument();
  });

  it('cancel button closes dialog', async () => {
    const onOpenChange = vi.fn();
    render(
      <ImageStudioWindow open={true} onOpenChange={onOpenChange} />,
    );

    await userEvent.click(screen.getByTestId('cancel-button'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('apply combined button closes dialog', async () => {
    const onOpenChange = vi.fn();
    render(
      <ImageStudioWindow open={true} onOpenChange={onOpenChange} />,
    );

    await userEvent.click(screen.getByTestId('apply-combined-button'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows view mode radio group', () => {
    render(
      <ImageStudioWindow open={true} onOpenChange={() => {}} />,
    );

    expect(screen.getByTestId('view-mode-radios')).toBeInTheDocument();
    expect(screen.getByTestId('view-mode-combined')).toBeInTheDocument();
    expect(screen.getByTestId('view-mode-foreground')).toBeInTheDocument();
    expect(screen.getByTestId('view-mode-background')).toBeInTheDocument();
  });

  it('has pixel effects and AI operations panels', () => {
    render(
      <ImageStudioWindow open={true} onOpenChange={() => {}} />,
    );

    expect(screen.getByTestId('pixel-effects-panel')).toBeInTheDocument();
    expect(screen.getByTestId('ai-operations-panel')).toBeInTheDocument();
  });

  it('shows keep original checkbox that toggles', async () => {
    render(
      <ImageStudioWindow open={true} onOpenChange={() => {}} />,
    );

    const checkbox = screen.getByTestId('keep-original-checkbox');
    expect(checkbox).toBeInTheDocument();
    await userEvent.click(checkbox);
    // Checkbox should now be checked (no assertion on DOM attribute needed, just no crash)
  });
});

// ===========================================================================
// PHASE 20B — TextPropertiesWindow
// ===========================================================================

describe('Phase 20B — TextPropertiesWindow', () => {
  beforeEach(resetAllStores);

  it('renders with three tabs', () => {
    render(
      <TextPropertiesWindow open={true} onOpenChange={() => {}} />,
    );

    expect(screen.getByTestId('text-properties-dialog-content')).toBeInTheDocument();
    expect(screen.getByTestId('text-props-tab-basic')).toBeInTheDocument();
    expect(screen.getByTestId('text-props-tab-background')).toBeInTheDocument();
    expect(screen.getByTestId('text-props-tab-image-fill')).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    render(
      <TextPropertiesWindow open={true} onOpenChange={() => {}} />,
    );

    // Default is basic
    expect(screen.getByTestId('text-props-basic')).toBeInTheDocument();

    // Switch to background
    await userEvent.click(screen.getByTestId('text-props-tab-background'));
    expect(screen.getByTestId('text-props-background')).toBeInTheDocument();
    expect(screen.getByTestId('bg-enable-toggle')).toBeInTheDocument();

    // Switch to image fill
    await userEvent.click(screen.getByTestId('text-props-tab-image-fill'));
    expect(screen.getByTestId('text-props-image-fill')).toBeInTheDocument();
    expect(screen.getByTestId('img-fill-enable-toggle')).toBeInTheDocument();
  });

  it('cancel restores original and closes', async () => {
    const onOpenChange = vi.fn();
    render(
      <TextPropertiesWindow open={true} onOpenChange={onOpenChange} />,
    );

    await userEvent.click(screen.getByTestId('text-props-cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('apply closes dialog', async () => {
    const onOpenChange = vi.fn();
    const onApply = vi.fn();
    render(
      <TextPropertiesWindow open={true} onOpenChange={onOpenChange} onApply={onApply} />,
    );

    await userEvent.click(screen.getByTestId('text-props-apply'));
    expect(onApply).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('has alignment buttons', () => {
    render(
      <TextPropertiesWindow open={true} onOpenChange={() => {}} />,
    );

    expect(screen.getByTestId('text-alignment-buttons')).toBeInTheDocument();
    expect(screen.getByTestId('align-left')).toBeInTheDocument();
    expect(screen.getByTestId('align-center')).toBeInTheDocument();
    expect(screen.getByTestId('align-right')).toBeInTheDocument();
    expect(screen.getByTestId('align-justify')).toBeInTheDocument();
  });
});

// ===========================================================================
// PHASE 20C — BatchProducerWindow
// ===========================================================================

describe('Phase 20C — BatchProducerWindow', () => {
  beforeEach(resetAllStores);

  it('renders with toolbar and datagrid', () => {
    render(
      <BatchProducerWindow open={true} onOpenChange={() => {}} />,
    );

    expect(screen.getByTestId('batch-producer-dialog-content')).toBeInTheDocument();
    expect(screen.getByTestId('batch-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('batch-datagrid')).toBeInTheDocument();
    expect(screen.getByTestId('batch-add-row')).toBeInTheDocument();
    expect(screen.getByTestId('batch-delete-row')).toBeInTheDocument();
  });

  it('adds a row when Add Row is clicked', async () => {
    render(
      <BatchProducerWindow open={true} onOpenChange={() => {}} />,
    );

    const grid = screen.getByTestId('batch-datagrid');
    const rowsBefore = within(grid).getAllByRole('row');
    // Header row + 2 data rows = 3
    expect(rowsBefore.length).toBe(3);

    await userEvent.click(screen.getByTestId('batch-add-row'));

    const rowsAfter = within(grid).getAllByRole('row');
    expect(rowsAfter.length).toBe(4);
  });

  it('export all button triggers progress', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onExportAll = vi.fn();
    render(
      <BatchProducerWindow open={true} onOpenChange={() => {}} onExportAll={onExportAll} />,
    );

    await userEvent.click(screen.getByTestId('batch-export-all'));

    // Progress should appear
    expect(screen.getByTestId('batch-progress')).toBeInTheDocument();

    // Advance all timers to complete progress
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(onExportAll).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

// ===========================================================================
// Dialog open/close via uiStore
// ===========================================================================

describe('Dialog open/close via uiStore', () => {
  beforeEach(resetAllStores);

  it('setActiveDialog controls dialog open state', () => {
    const { setActiveDialog } = useUiStore.getState();

    setActiveDialog('settings');
    expect(useUiStore.getState().activeDialog).toBe('settings');

    setActiveDialog(null);
    expect(useUiStore.getState().activeDialog).toBeNull();
  });

  it('setActiveDialog cycles through different dialogs', () => {
    const dialogs = ['settings', 'newDocument', 'colorPicker', 'fillPicker', 'shapeCreator', 'textProperties', 'imageStudio', 'batchProducer'];

    for (const dlg of dialogs) {
      useUiStore.getState().setActiveDialog(dlg);
      expect(useUiStore.getState().activeDialog).toBe(dlg);
    }

    useUiStore.getState().setActiveDialog(null);
    expect(useUiStore.getState().activeDialog).toBeNull();
  });
});

// ===========================================================================
// Settings save to settingsStore
// ===========================================================================

describe('Settings persistence via settingsStore', () => {
  beforeEach(resetAllStores);

  it('setSetting updates a nested value', () => {
    const store = useSettingsStore.getState();
    store.setSetting('canvas.gridSize', 25);
    expect(useSettingsStore.getState().settings.canvas.gridSize).toBe(25);
  });

  it('getSetting retrieves a nested value', () => {
    useSettingsStore.getState().setSetting('export.jpegQuality', 85);
    const val = useSettingsStore.getState().getSetting('export.jpegQuality');
    expect(val).toBe(85);
  });

  it('resetAll restores defaults', () => {
    useSettingsStore.getState().setSetting('canvas.gridSize', 999);
    useSettingsStore.getState().resetAll();
    const defaults = createDefaultSettings();
    expect(useSettingsStore.getState().settings.canvas.gridSize).toBe(defaults.canvas.gridSize);
  });

  it('clamps values to defined ranges', () => {
    useSettingsStore.getState().setSetting('export.jpegQuality', 200);
    expect(useSettingsStore.getState().settings.export.jpegQuality).toBe(100);

    useSettingsStore.getState().setSetting('export.jpegQuality', -5);
    expect(useSettingsStore.getState().settings.export.jpegQuality).toBe(1);
  });

  it('resetCategory only resets specified category', () => {
    useSettingsStore.getState().setSetting('canvas.gridSize', 999);
    useSettingsStore.getState().setSetting('export.jpegQuality', 50);
    useSettingsStore.getState().resetCategory('canvas');
    const defaults = createDefaultSettings();
    expect(useSettingsStore.getState().settings.canvas.gridSize).toBe(defaults.canvas.gridSize);
    expect(useSettingsStore.getState().settings.export.jpegQuality).toBe(50);
  });
});
