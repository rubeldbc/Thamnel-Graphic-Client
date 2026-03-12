import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PropertiesTab } from '../components/RightPanel/Properties/PropertiesTab';
import { useDocumentStore } from '../stores/documentStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';
import { createDefaultLayer } from '../types/LayerModel';
import { createDefaultTextProperties } from '../types/TextProperties';
import { createDefaultShapeProperties } from '../types/ShapeProperties';
import { createDefaultLayerEffect } from '../types/LayerEffect';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
}

function addLayerAndSelect(overrides: Parameters<typeof createDefaultLayer>[0] = {}) {
  const layer = createDefaultLayer(overrides);
  const state = useDocumentStore.getState();
  useDocumentStore.setState({
    project: {
      ...state.project,
      layers: [...state.project.layers, layer],
    },
    selectedLayerIds: [layer.id],
  });
  return layer;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GW Phase 10 -- Properties Panel (Right Panel -- Properties Tab)', () => {
  beforeEach(() => {
    resetStores();
  });

  // =========================================================================
  // No selection state
  // =========================================================================
  describe('No layer selected', () => {
    it('shows "No layer selected" when nothing is selected', () => {
      render(<PropertiesTab />);
      expect(screen.getByTestId('properties-tab')).toBeInTheDocument();
      expect(screen.getByText('No layer selected')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 10A -- Opacity + Blend Row
  // =========================================================================
  describe('10A -- Opacity and Blend Mode controls', () => {
    it('shows opacity slider and blend mode dropdown for a selected layer', () => {
      addLayerAndSelect({ id: 'img-1', type: 'image', name: 'Photo' });
      render(<PropertiesTab />);

      expect(screen.getByTestId('blend-mode-select')).toBeInTheDocument();
      expect(screen.getByTestId('opacity-slider')).toBeInTheDocument();
      expect(screen.getByTestId('nud-opacity')).toBeInTheDocument();
    });

    it('updates store when opacity changes via NumericUpDown', () => {
      addLayerAndSelect({ id: 'op-1', type: 'image', name: 'Opacity Test', opacity: 0.5 });
      render(<PropertiesTab />);

      const nudUp = screen.getByTestId('nud-opacity-up');
      fireEvent.click(nudUp);

      const layer = useDocumentStore.getState().project.layers.find((l) => l.id === 'op-1');
      expect(layer).toBeDefined();
      expect(layer!.opacity).toBeCloseTo(0.51, 1);
    });
  });

  // =========================================================================
  // 10B -- Position Expander
  // =========================================================================
  describe('10B -- Position Expander', () => {
    it('shows position expander for any selected layer', () => {
      addLayerAndSelect({ id: 'pos-1', type: 'image', name: 'Position Test' });
      render(<PropertiesTab />);

      expect(screen.getByTestId('position-expander')).toBeInTheDocument();
      expect(screen.getByTestId('position-expander-trigger')).toBeInTheDocument();
    });

    it('position expander is collapsed by default', () => {
      addLayerAndSelect({ id: 'pos-2', type: 'image', name: 'Collapsed' });
      render(<PropertiesTab />);

      // The content should not be visible initially (collapsed)
      const expander = screen.getByTestId('position-expander');
      // Radix Collapsible sets data-state on root
      expect(expander).toHaveAttribute('data-state', 'closed');
    });

    it('opens when trigger is clicked and shows X/Y/W/H controls', () => {
      addLayerAndSelect({ id: 'pos-3', type: 'image', name: 'Open Position', x: 50, y: 100 });
      render(<PropertiesTab />);

      fireEvent.click(screen.getByTestId('position-expander-trigger'));
      expect(screen.getByTestId('position-expander')).toHaveAttribute('data-state', 'open');

      // Scope queries to the position expander content to avoid collisions
      // with similarly-named NUDs in the effects expander (e.g. drop shadow X/Y)
      const posContent = screen.getByTestId('position-expander-content');
      expect(within(posContent).getByTestId('nud-x')).toBeInTheDocument();
      expect(within(posContent).getByTestId('nud-y')).toBeInTheDocument();
      expect(within(posContent).getByTestId('nud-w')).toBeInTheDocument();
      expect(within(posContent).getByTestId('nud-h')).toBeInTheDocument();
      expect(within(posContent).getByTestId('nud-rotation')).toBeInTheDocument();
      expect(within(posContent).getByTestId('nud-padding')).toBeInTheDocument();
    });

    it('updates store when X value changes', () => {
      addLayerAndSelect({ id: 'pos-4', type: 'image', name: 'X Change', x: 100 });
      render(<PropertiesTab />);

      // Open the expander first
      fireEvent.click(screen.getByTestId('position-expander-trigger'));

      // Scope to position expander to avoid collision with drop shadow X NUD
      const posContent = screen.getByTestId('position-expander-content');
      const xUp = within(posContent).getByTestId('nud-x-up');
      fireEvent.click(xUp);

      const layer = useDocumentStore.getState().project.layers.find((l) => l.id === 'pos-4');
      expect(layer).toBeDefined();
      expect(layer!.x).toBe(101);
    });
  });

  // =========================================================================
  // 10C -- Crop Expander (image layers only)
  // =========================================================================
  describe('10C -- Crop Expander', () => {
    it('shows crop expander only for image layers', () => {
      addLayerAndSelect({ id: 'crop-img', type: 'image', name: 'Image Crop' });
      render(<PropertiesTab />);

      expect(screen.getByTestId('crop-expander')).toBeInTheDocument();
    });

    it('does NOT show crop expander for text layers', () => {
      addLayerAndSelect({
        id: 'crop-txt',
        type: 'text',
        name: 'Text No Crop',
        textProperties: createDefaultTextProperties(),
      });
      render(<PropertiesTab />);

      expect(screen.queryByTestId('crop-expander')).not.toBeInTheDocument();
    });

    it('does NOT show crop expander for shape layers', () => {
      addLayerAndSelect({
        id: 'crop-shp',
        type: 'shape',
        name: 'Shape No Crop',
        shapeProperties: createDefaultShapeProperties(),
      });
      render(<PropertiesTab />);

      expect(screen.queryByTestId('crop-expander')).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 10D -- Text Expander (text layers only)
  // =========================================================================
  describe('10D -- Text Expander', () => {
    it('shows text expander only for text layers', () => {
      addLayerAndSelect({
        id: 'txt-1',
        type: 'text',
        name: 'My Text',
        textProperties: createDefaultTextProperties(),
      });
      render(<PropertiesTab />);

      expect(screen.getByTestId('text-expander')).toBeInTheDocument();
    });

    it('text expander is expanded by default', () => {
      addLayerAndSelect({
        id: 'txt-2',
        type: 'text',
        name: 'Expanded Text',
        textProperties: createDefaultTextProperties(),
      });
      render(<PropertiesTab />);

      expect(screen.getByTestId('text-expander')).toHaveAttribute('data-state', 'open');
    });

    it('does NOT show text expander for image layers', () => {
      addLayerAndSelect({ id: 'txt-3', type: 'image', name: 'Image No Text' });
      render(<PropertiesTab />);

      expect(screen.queryByTestId('text-expander')).not.toBeInTheDocument();
    });

    it('shows text controls: textarea, font family, font size, style toggles, alignment', () => {
      addLayerAndSelect({
        id: 'txt-4',
        type: 'text',
        name: 'Controls Test',
        textProperties: { ...createDefaultTextProperties(), text: 'Hello' },
      });
      render(<PropertiesTab />);

      expect(screen.getByTestId('text-content-input')).toBeInTheDocument();
      expect(screen.getByTestId('text-font-family')).toBeInTheDocument();
      expect(screen.getByTestId('nud-size')).toBeInTheDocument();

      // Style toggles
      expect(screen.getByTestId('text-style-fontWeight')).toBeInTheDocument();
      expect(screen.getByTestId('text-style-fontStyle')).toBeInTheDocument();
      expect(screen.getByTestId('text-style-underline')).toBeInTheDocument();
      expect(screen.getByTestId('text-style-strikethrough')).toBeInTheDocument();
      expect(screen.getByTestId('text-style-hasBackground')).toBeInTheDocument();

      // Alignment
      expect(screen.getByTestId('text-align-left')).toBeInTheDocument();
      expect(screen.getByTestId('text-align-center')).toBeInTheDocument();
      expect(screen.getByTestId('text-align-right')).toBeInTheDocument();
      expect(screen.getByTestId('text-align-justify')).toBeInTheDocument();

      // Color swatches
      expect(screen.getByTestId('color-swatch-text-color')).toBeInTheDocument();
      expect(screen.getByTestId('color-swatch-stroke-color')).toBeInTheDocument();
    });

    it('toggles bold when bold button is clicked', () => {
      addLayerAndSelect({
        id: 'txt-bold',
        type: 'text',
        name: 'Bold Toggle',
        textProperties: { ...createDefaultTextProperties(), fontWeight: 400 },
      });
      render(<PropertiesTab />);

      fireEvent.click(screen.getByTestId('text-style-fontWeight'));

      const layer = useDocumentStore.getState().project.layers.find((l) => l.id === 'txt-bold');
      expect(layer!.textProperties!.fontWeight).toBe(700);
    });

    it('toggles italic when italic button is clicked', () => {
      addLayerAndSelect({
        id: 'txt-italic',
        type: 'text',
        name: 'Italic Toggle',
        textProperties: { ...createDefaultTextProperties(), fontStyle: 'normal' },
      });
      render(<PropertiesTab />);

      fireEvent.click(screen.getByTestId('text-style-fontStyle'));

      const layer = useDocumentStore.getState().project.layers.find((l) => l.id === 'txt-italic');
      expect(layer!.textProperties!.fontStyle).toBe('italic');
    });

    it('sets alignment when alignment button is clicked', () => {
      addLayerAndSelect({
        id: 'txt-align',
        type: 'text',
        name: 'Align Test',
        textProperties: { ...createDefaultTextProperties(), alignment: 'left' },
      });
      render(<PropertiesTab />);

      fireEvent.click(screen.getByTestId('text-align-center'));

      const layer = useDocumentStore.getState().project.layers.find((l) => l.id === 'txt-align');
      expect(layer!.textProperties!.alignment).toBe('center');
    });
  });

  // =========================================================================
  // 10E -- Shape Expander (shape layers only)
  // =========================================================================
  describe('10E -- Shape Expander', () => {
    it('shows shape expander only for shape layers', () => {
      addLayerAndSelect({
        id: 'shp-1',
        type: 'shape',
        name: 'My Shape',
        shapeProperties: createDefaultShapeProperties(),
      });
      render(<PropertiesTab />);

      expect(screen.getByTestId('shape-expander')).toBeInTheDocument();
    });

    it('shape expander is expanded by default', () => {
      addLayerAndSelect({
        id: 'shp-2',
        type: 'shape',
        name: 'Expanded Shape',
        shapeProperties: createDefaultShapeProperties(),
      });
      render(<PropertiesTab />);

      expect(screen.getByTestId('shape-expander')).toHaveAttribute('data-state', 'open');
    });

    it('does NOT show shape expander for text layers', () => {
      addLayerAndSelect({
        id: 'shp-3',
        type: 'text',
        name: 'Text No Shape',
        textProperties: createDefaultTextProperties(),
      });
      render(<PropertiesTab />);

      expect(screen.queryByTestId('shape-expander')).not.toBeInTheDocument();
    });

    it('does NOT show shape expander for image layers', () => {
      addLayerAndSelect({ id: 'shp-4', type: 'image', name: 'Image No Shape' });
      render(<PropertiesTab />);

      expect(screen.queryByTestId('shape-expander')).not.toBeInTheDocument();
    });

    it('shows fill/border color swatches and radius NUD', () => {
      addLayerAndSelect({
        id: 'shp-5',
        type: 'shape',
        name: 'Shape Controls',
        shapeProperties: createDefaultShapeProperties(),
      });
      render(<PropertiesTab />);

      expect(screen.getByTestId('color-swatch-fill')).toBeInTheDocument();
      expect(screen.getByTestId('color-swatch-border')).toBeInTheDocument();
      expect(screen.getByTestId('nud-radius')).toBeInTheDocument();
    });

    it('updates store when border width changes', () => {
      addLayerAndSelect({
        id: 'shp-bw',
        type: 'shape',
        name: 'Border Width',
        shapeProperties: { ...createDefaultShapeProperties(), borderWidth: 5 },
      });
      render(<PropertiesTab />);

      // The NUD without a label uses 'nud' as testid base - we need the border width NUD
      // Looking at ShapeExpander, the border NUD has no label prop so its testid is 'nud'
      // Let's use the up button
      const nuds = screen.getAllByTestId('nud');
      // The first unlabeled NUD in ShapeExpander is border width
      const nudUp = within(nuds[0]).getByTestId('nud-up');
      fireEvent.click(nudUp);

      const layer = useDocumentStore.getState().project.layers.find((l) => l.id === 'shp-bw');
      expect(layer!.shapeProperties!.borderWidth).toBe(6);
    });
  });

  // =========================================================================
  // 10F -- Effects Expander
  // =========================================================================
  describe('10F -- Effects Expander', () => {
    it('shows effects expander for any selected layer', () => {
      addLayerAndSelect({ id: 'eff-1', type: 'image', name: 'Effects Test' });
      render(<PropertiesTab />);

      expect(screen.getByTestId('effects-expander')).toBeInTheDocument();
    });

    it('effects expander is expanded by default', () => {
      addLayerAndSelect({ id: 'eff-2', type: 'image', name: 'Effects Default' });
      render(<PropertiesTab />);

      expect(screen.getByTestId('effects-expander')).toHaveAttribute('data-state', 'open');
    });

    it('shows all 21 effect rows with toggle checkboxes', () => {
      addLayerAndSelect({ id: 'eff-3', type: 'image', name: 'All Effects' });
      render(<PropertiesTab />);

      const effectKeys = [
        'brightness', 'contrast', 'saturation', 'hue',
        'grayscale', 'sepia', 'invert',
        'sharpen', 'vignette', 'pixelate',
        'colorTint', 'noise', 'posterize',
        'gaussianBlur', 'dropShadow', 'outerGlow',
        'cutStroke', 'rimLight', 'splitToning',
        'smoothStroke', 'blendOverlay',
      ];

      expect(effectKeys).toHaveLength(21);

      for (const key of effectKeys) {
        expect(screen.getByTestId(`effect-row-${key}`)).toBeInTheDocument();
        expect(screen.getByTestId(`effect-toggle-${key}`)).toBeInTheDocument();
        expect(screen.getByTestId(`effect-name-${key}`)).toBeInTheDocument();
      }
    });

    it('toggles brightness effect when switch is clicked', () => {
      addLayerAndSelect({
        id: 'eff-bright',
        type: 'image',
        name: 'Brightness Toggle',
        effects: { ...createDefaultLayerEffect(), brightnessEnabled: false },
      });
      render(<PropertiesTab />);

      fireEvent.click(screen.getByTestId('effect-toggle-brightness'));

      const layer = useDocumentStore.getState().project.layers.find((l) => l.id === 'eff-bright');
      expect(layer!.effects.brightnessEnabled).toBe(true);
    });

    it('toggles grayscale (toggle-only effect) when switch is clicked', () => {
      addLayerAndSelect({
        id: 'eff-gray',
        type: 'image',
        name: 'Grayscale Toggle',
        effects: { ...createDefaultLayerEffect(), grayscale: false },
      });
      render(<PropertiesTab />);

      fireEvent.click(screen.getByTestId('effect-toggle-grayscale'));

      const layer = useDocumentStore.getState().project.layers.find((l) => l.id === 'eff-gray');
      expect(layer!.effects.grayscale).toBe(true);
    });

    it('toggles sepia (toggle-only effect) when switch is clicked', () => {
      addLayerAndSelect({
        id: 'eff-sepia',
        type: 'image',
        name: 'Sepia Toggle',
        effects: { ...createDefaultLayerEffect(), sepia: false },
      });
      render(<PropertiesTab />);

      fireEvent.click(screen.getByTestId('effect-toggle-sepia'));

      const layer = useDocumentStore.getState().project.layers.find((l) => l.id === 'eff-sepia');
      expect(layer!.effects.sepia).toBe(true);
    });

    it('toggles invert (toggle-only effect) when switch is clicked', () => {
      addLayerAndSelect({
        id: 'eff-invert',
        type: 'image',
        name: 'Invert Toggle',
        effects: { ...createDefaultLayerEffect(), invert: false },
      });
      render(<PropertiesTab />);

      fireEvent.click(screen.getByTestId('effect-toggle-invert'));

      const layer = useDocumentStore.getState().project.layers.find((l) => l.id === 'eff-invert');
      expect(layer!.effects.invert).toBe(true);
    });
  });

  // =========================================================================
  // 10G -- Bottom Sticky
  // =========================================================================
  describe('10G -- Bottom Sticky bar', () => {
    it('shows layer name in orange', () => {
      addLayerAndSelect({ id: 'bot-1', type: 'image', name: 'My Photo Layer' });
      render(<PropertiesTab />);

      const nameEl = screen.getByTestId('layer-name');
      expect(nameEl).toBeInTheDocument();
      expect(nameEl.textContent).toBe('My Photo Layer');
      expect(nameEl.style.color).toBe('var(--accent-orange)');
    });

    it('shows image dimensions', () => {
      addLayerAndSelect({
        id: 'bot-2',
        type: 'image',
        name: 'Sized Layer',
        width: 1920,
        height: 1080,
      });
      render(<PropertiesTab />);

      const dims = screen.getByTestId('image-dimensions');
      expect(dims).toBeInTheDocument();
      expect(dims.textContent).toBe('1920 x 1080');
    });

    it('shows Optimize Memory button', () => {
      addLayerAndSelect({ id: 'bot-3', type: 'image', name: 'Optimize Test' });
      render(<PropertiesTab />);

      expect(screen.getByTestId('optimize-memory-btn')).toBeInTheDocument();
    });

    it('shows bottom bar container', () => {
      addLayerAndSelect({ id: 'bot-4', type: 'image', name: 'Bar Test' });
      render(<PropertiesTab />);

      expect(screen.getByTestId('properties-bottom-bar')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Undo snapshot integration
  // =========================================================================
  describe('Undo/Redo integration', () => {
    it('takes a snapshot before updating layer properties', () => {
      addLayerAndSelect({ id: 'undo-1', type: 'image', name: 'Undo Test', opacity: 0.8 });
      render(<PropertiesTab />);

      // Undo stack should be empty initially
      expect(useUndoRedoStore.getState().undoStack).toHaveLength(0);

      // Click opacity up
      const nudUp = screen.getByTestId('nud-opacity-up');
      fireEvent.click(nudUp);

      // A snapshot should have been taken
      expect(useUndoRedoStore.getState().undoStack.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Type-based section visibility
  // =========================================================================
  describe('Type-based section visibility', () => {
    it('image layer shows: position, crop, effects; no text or shape', () => {
      addLayerAndSelect({ id: 'vis-img', type: 'image', name: 'Image Vis' });
      render(<PropertiesTab />);

      expect(screen.getByTestId('position-expander')).toBeInTheDocument();
      expect(screen.getByTestId('crop-expander')).toBeInTheDocument();
      expect(screen.getByTestId('effects-expander')).toBeInTheDocument();
      expect(screen.queryByTestId('text-expander')).not.toBeInTheDocument();
      expect(screen.queryByTestId('shape-expander')).not.toBeInTheDocument();
    });

    it('text layer shows: position, text, effects; no crop or shape', () => {
      addLayerAndSelect({
        id: 'vis-txt',
        type: 'text',
        name: 'Text Vis',
        textProperties: createDefaultTextProperties(),
      });
      render(<PropertiesTab />);

      expect(screen.getByTestId('position-expander')).toBeInTheDocument();
      expect(screen.getByTestId('text-expander')).toBeInTheDocument();
      expect(screen.getByTestId('effects-expander')).toBeInTheDocument();
      expect(screen.queryByTestId('crop-expander')).not.toBeInTheDocument();
      expect(screen.queryByTestId('shape-expander')).not.toBeInTheDocument();
    });

    it('shape layer shows: position, shape, effects; no crop or text', () => {
      addLayerAndSelect({
        id: 'vis-shp',
        type: 'shape',
        name: 'Shape Vis',
        shapeProperties: createDefaultShapeProperties(),
      });
      render(<PropertiesTab />);

      expect(screen.getByTestId('position-expander')).toBeInTheDocument();
      expect(screen.getByTestId('shape-expander')).toBeInTheDocument();
      expect(screen.getByTestId('effects-expander')).toBeInTheDocument();
      expect(screen.queryByTestId('crop-expander')).not.toBeInTheDocument();
      expect(screen.queryByTestId('text-expander')).not.toBeInTheDocument();
    });
  });
});
