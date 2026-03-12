import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DialogBase } from '../components/Dialogs/DialogBase';
import { TextPropertiesWindow } from '../components/Dialogs/TextPropertiesWindow';
import { ColorPickerWindow } from '../components/Dialogs/ColorPickerWindow';
import { SettingsWindow } from '../components/Dialogs/SettingsWindow';
import { ShapeDrawingWindow } from '../components/Dialogs/ShapeDrawingWindow';
import { FillPickerWindow } from '../components/Dialogs/FillPickerWindow';
import { BatchProducerWindow } from '../components/Dialogs/BatchProducerWindow';
import { NewDocumentDialog } from '../components/Dialogs/NewDocumentDialog';
import { AboutWindow } from '../components/Dialogs/AboutWindow';
import { CanvasSizeWindow } from '../components/Dialogs/CanvasSizeWindow';
import { ExportListWindow } from '../components/Dialogs/ExportListWindow';
import { DebugWindow } from '../components/Dialogs/DebugWindow';

// ===========================================================================
// DialogBase
// ===========================================================================

describe('DialogBase', () => {
  it('renders with title and content', () => {
    render(
      <DialogBase open={true} onOpenChange={vi.fn()} title="Test Dialog">
        <div data-testid="test-content">Hello</div>
      </DialogBase>,
    );
    expect(screen.getByTestId('test-dialog-dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('shows close button', () => {
    render(
      <DialogBase open={true} onOpenChange={vi.fn()} title="Test Dialog" />,
    );
    expect(screen.getByTestId('test-dialog-dialog-close')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <DialogBase open={false} onOpenChange={vi.fn()} title="Test Dialog" />,
    );
    expect(screen.queryByTestId('test-dialog-dialog')).not.toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(
      <DialogBase
        open={true}
        onOpenChange={vi.fn()}
        title="Test Dialog"
        footer={<button data-testid="footer-btn">OK</button>}
      />,
    );
    expect(screen.getByTestId('footer-btn')).toBeInTheDocument();
  });
});

// ===========================================================================
// TextPropertiesWindow
// ===========================================================================

describe('TextPropertiesWindow', () => {
  it('renders 3 tabs', () => {
    render(<TextPropertiesWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('text-props-tab-basic')).toBeInTheDocument();
    expect(screen.getByTestId('text-props-tab-background')).toBeInTheDocument();
    expect(screen.getByTestId('text-props-tab-image-fill')).toBeInTheDocument();
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('Background')).toBeInTheDocument();
    expect(screen.getByText('Image Fill')).toBeInTheDocument();
  });

  it('renders Apply and Cancel buttons', () => {
    render(<TextPropertiesWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('text-props-apply')).toBeInTheDocument();
    expect(screen.getByTestId('text-props-cancel')).toBeInTheDocument();
    expect(screen.getByText('Apply')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders font controls on Basic tab', () => {
    render(<TextPropertiesWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('font-family-select')).toBeInTheDocument();
    expect(screen.getByText('Alignment')).toBeInTheDocument();
  });
});

// ===========================================================================
// ColorPickerWindow
// ===========================================================================

describe('ColorPickerWindow', () => {
  it('renders HSB/RGB/Hex inputs', () => {
    render(<ColorPickerWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('hsb-inputs')).toBeInTheDocument();
    expect(screen.getByTestId('rgb-inputs')).toBeInTheDocument();
    expect(screen.getByTestId('hex-input')).toBeInTheDocument();
    expect(screen.getByText('HSB')).toBeInTheDocument();
    expect(screen.getByText('RGB')).toBeInTheDocument();
    expect(screen.getByText('Hex')).toBeInTheDocument();
  });

  it('renders SV gradient and hue bar', () => {
    render(<ColorPickerWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('sv-gradient')).toBeInTheDocument();
    expect(screen.getByTestId('hue-bar')).toBeInTheDocument();
  });

  it('renders alpha input', () => {
    render(<ColorPickerWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('alpha-input')).toBeInTheDocument();
    expect(screen.getByTestId('alpha-bar')).toBeInTheDocument();
  });

  it('renders eyedropper button', () => {
    render(<ColorPickerWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('eyedropper-button')).toBeInTheDocument();
  });

  it('renders preview swatches (old vs new)', () => {
    render(<ColorPickerWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('color-preview-swatches')).toBeInTheDocument();
  });

  it('renders OK and Cancel buttons', () => {
    render(<ColorPickerWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('color-picker-ok')).toBeInTheDocument();
    expect(screen.getByTestId('color-picker-cancel')).toBeInTheDocument();
  });
});

// ===========================================================================
// SettingsWindow
// ===========================================================================

describe('SettingsWindow', () => {
  it('renders 5 tabs', () => {
    render(<SettingsWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('settings-tab-general')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-export')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-ai')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-network')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Canvas')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
  });

  it('renders Save, Cancel, and Reset All buttons', () => {
    render(<SettingsWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('settings-save')).toBeInTheDocument();
    expect(screen.getByTestId('settings-cancel')).toBeInTheDocument();
    expect(screen.getByTestId('settings-reset-all')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Reset All Settings')).toBeInTheDocument();
  });

  it('renders general settings fields', () => {
    render(<SettingsWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('DEFAULT PATHS')).toBeInTheDocument();
    expect(screen.getByText('FILE ASSOCIATION')).toBeInTheDocument();
    expect(screen.getByText('BEHAVIOR')).toBeInTheDocument();
    expect(screen.getByText('Auto-Save Interval (sec)')).toBeInTheDocument();
  });
});

// ===========================================================================
// ShapeDrawingWindow
// ===========================================================================

describe('ShapeDrawingWindow', () => {
  it('renders toolbar and canvas area', () => {
    render(<ShapeDrawingWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('shape-drawing-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('shape-left-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('shape-canvas-area')).toBeInTheDocument();
  });

  it('renders tool buttons', () => {
    render(<ShapeDrawingWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('shape-tool-select')).toBeInTheDocument();
    expect(screen.getByTestId('shape-tool-pen')).toBeInTheDocument();
    expect(screen.getByTestId('shape-tool-freehand')).toBeInTheDocument();
    expect(screen.getByTestId('shape-tool-eraser')).toBeInTheDocument();
  });

  it('renders path operation buttons', () => {
    render(<ShapeDrawingWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('path-op-union')).toBeInTheDocument();
    expect(screen.getByTestId('path-op-subtract')).toBeInTheDocument();
    expect(screen.getByTestId('path-op-intersect')).toBeInTheDocument();
  });

  it('renders right panel with shape properties', () => {
    render(<ShapeDrawingWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('shape-right-panel')).toBeInTheDocument();
    expect(screen.getByText('Shape Properties')).toBeInTheDocument();
    expect(screen.getByTestId('shape-palette')).toBeInTheDocument();
  });

  it('renders layers panel', () => {
    render(<ShapeDrawingWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('shape-layers-panel')).toBeInTheDocument();
    expect(screen.getByText('Layers')).toBeInTheDocument();
  });

  it('renders Send to Canvas, Cancel, Reset buttons', () => {
    render(<ShapeDrawingWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('shape-send-to-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('shape-cancel')).toBeInTheDocument();
    expect(screen.getByTestId('shape-reset')).toBeInTheDocument();
    expect(screen.getByText('Send to Canvas')).toBeInTheDocument();
  });
});

// ===========================================================================
// FillPickerWindow
// ===========================================================================

describe('FillPickerWindow', () => {
  it('renders 3 tabs', () => {
    render(<FillPickerWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('fill-tab-solid')).toBeInTheDocument();
    expect(screen.getByTestId('fill-tab-gradient')).toBeInTheDocument();
    expect(screen.getByTestId('fill-tab-image-fill')).toBeInTheDocument();
    expect(screen.getByText('Solid')).toBeInTheDocument();
    expect(screen.getByText('Gradient')).toBeInTheDocument();
    expect(screen.getByText('Image Fill')).toBeInTheDocument();
  });

  it('renders preview strip', () => {
    render(<FillPickerWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('fill-preview-strip')).toBeInTheDocument();
  });

  it('renders OK and Cancel buttons', () => {
    render(<FillPickerWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('fill-picker-ok')).toBeInTheDocument();
    expect(screen.getByTestId('fill-picker-cancel')).toBeInTheDocument();
  });
});

// ===========================================================================
// BatchProducerWindow
// ===========================================================================

describe('BatchProducerWindow', () => {
  it('renders', () => {
    render(<BatchProducerWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('batch-producer-dialog-content')).toBeInTheDocument();
  });

  it('renders toolbar with Add Row, Delete Row, Import/Export CSV', () => {
    render(<BatchProducerWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('batch-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('batch-add-row')).toBeInTheDocument();
    expect(screen.getByTestId('batch-delete-row')).toBeInTheDocument();
    expect(screen.getByTestId('batch-import-csv')).toBeInTheDocument();
    expect(screen.getByTestId('batch-export-csv')).toBeInTheDocument();
  });

  it('renders datagrid with rows', () => {
    render(<BatchProducerWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('batch-datagrid')).toBeInTheDocument();
    expect(screen.getByTestId('batch-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('batch-row-2')).toBeInTheDocument();
  });

  it('renders Export All button', () => {
    render(<BatchProducerWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('batch-export-all')).toBeInTheDocument();
    expect(screen.getByText('Export All')).toBeInTheDocument();
  });
});

// ===========================================================================
// NewDocumentDialog
// ===========================================================================

describe('NewDocumentDialog', () => {
  it('renders width/height inputs', () => {
    render(<NewDocumentDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('new-document-dialog-content')).toBeInTheDocument();
    expect(screen.getByText('Width:')).toBeInTheDocument();
    expect(screen.getByText('Height:')).toBeInTheDocument();
  });

  it('renders preset list grouped by category', () => {
    render(<NewDocumentDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('preset-list')).toBeInTheDocument();
    expect(screen.getByText('PRESETS')).toBeInTheDocument();
  });

  it('renders My Presets section', () => {
    render(<NewDocumentDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('MY PRESETS')).toBeInTheDocument();
    expect(screen.getByTestId('user-preset-list')).toBeInTheDocument();
    expect(screen.getByTestId('no-presets-text')).toBeInTheDocument();
  });

  it('renders Create and Cancel buttons', () => {
    render(<NewDocumentDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('new-doc-create')).toBeInTheDocument();
    expect(screen.getByTestId('new-doc-cancel')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });
});

// ===========================================================================
// AboutWindow
// ===========================================================================

describe('AboutWindow', () => {
  it('renders app name and author', () => {
    render(<AboutWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('about-app-name')).toBeInTheDocument();
    expect(screen.getByText('Thamnel Graphics Editor')).toBeInTheDocument();
    expect(screen.getByTestId('about-author')).toBeInTheDocument();
    expect(screen.getByText('Author: Kamrul Islam Rubel')).toBeInTheDocument();
  });

  it('renders version and copyright', () => {
    render(<AboutWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('about-version')).toBeInTheDocument();
    expect(screen.getByTestId('about-copyright')).toBeInTheDocument();
  });

  it('renders logo placeholder', () => {
    render(<AboutWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('about-logo')).toBeInTheDocument();
  });

  it('renders Close button', () => {
    render(<AboutWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('about-close-btn')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });
});

// ===========================================================================
// CanvasSizeWindow
// ===========================================================================

describe('CanvasSizeWindow', () => {
  it('renders anchor grid', () => {
    render(<CanvasSizeWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('anchor-grid')).toBeInTheDocument();
    // 9 anchor positions
    expect(screen.getByTestId('anchor-top-left')).toBeInTheDocument();
    expect(screen.getByTestId('anchor-top-center')).toBeInTheDocument();
    expect(screen.getByTestId('anchor-top-right')).toBeInTheDocument();
    expect(screen.getByTestId('anchor-middle-left')).toBeInTheDocument();
    expect(screen.getByTestId('anchor-middle-center')).toBeInTheDocument();
    expect(screen.getByTestId('anchor-middle-right')).toBeInTheDocument();
    expect(screen.getByTestId('anchor-bottom-left')).toBeInTheDocument();
    expect(screen.getByTestId('anchor-bottom-center')).toBeInTheDocument();
    expect(screen.getByTestId('anchor-bottom-right')).toBeInTheDocument();
  });

  it('renders Width/Height inputs and preset', () => {
    render(<CanvasSizeWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Width')).toBeInTheDocument();
    expect(screen.getByText('Height')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-size-preset')).toBeInTheDocument();
  });

  it('renders Apply and Cancel buttons', () => {
    render(<CanvasSizeWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('canvas-size-apply')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-size-cancel')).toBeInTheDocument();
  });
});

// ===========================================================================
// ExportListWindow
// ===========================================================================

describe('ExportListWindow', () => {
  it('renders', () => {
    render(<ExportListWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('export-list-dialog-content')).toBeInTheDocument();
  });

  it('renders toolbar with Add/Remove/Clear', () => {
    render(<ExportListWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('export-add')).toBeInTheDocument();
    expect(screen.getByTestId('export-remove')).toBeInTheDocument();
    expect(screen.getByTestId('export-clear')).toBeInTheDocument();
  });

  it('renders export item list', () => {
    render(<ExportListWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('export-item-list')).toBeInTheDocument();
    expect(screen.getByTestId('export-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('export-item-2')).toBeInTheDocument();
  });

  it('renders Export All button', () => {
    render(<ExportListWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('export-list-export-all')).toBeInTheDocument();
    expect(screen.getByText('Export All')).toBeInTheDocument();
  });
});

// ===========================================================================
// DebugWindow
// ===========================================================================

describe('DebugWindow', () => {
  it('renders log area', () => {
    render(<DebugWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('debug-log-area')).toBeInTheDocument();
  });

  it('renders log level filter buttons', () => {
    render(<DebugWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('debug-filter-all')).toBeInTheDocument();
    expect(screen.getByTestId('debug-filter-info')).toBeInTheDocument();
    expect(screen.getByTestId('debug-filter-warning')).toBeInTheDocument();
    expect(screen.getByTestId('debug-filter-error')).toBeInTheDocument();
  });

  it('renders Clear and Copy All buttons', () => {
    render(<DebugWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('debug-clear')).toBeInTheDocument();
    expect(screen.getByTestId('debug-copy-all')).toBeInTheDocument();
  });

  it('renders auto-scroll toggle', () => {
    render(<DebugWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('debug-auto-scroll')).toBeInTheDocument();
  });

  it('renders sample log entries', () => {
    render(<DebugWindow open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId('log-entry-1')).toBeInTheDocument();
    expect(screen.getByText('Application started')).toBeInTheDocument();
  });
});
