import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NumericUpDown } from '../components/common/NumericUpDown';
import { ColorSwatch } from '../components/common/ColorSwatch';
import { PropertiesTab } from '../components/RightPanel/Properties/PropertiesTab';
import { PositionExpander } from '../components/RightPanel/Properties/PositionExpander';
import { EffectsExpander } from '../components/RightPanel/Properties/EffectsExpander';
import { useDocumentStore } from '../stores/documentStore';
import { createDefaultLayer } from '../types/LayerModel';
// LayerEffect utilities available if needed
// import { createDefaultLayerEffect, createDefaultColorAdjustments } from '../types/LayerEffect';

// ---------------------------------------------------------------------------
// NumericUpDown
// ---------------------------------------------------------------------------

describe('NumericUpDown', () => {
  it('renders with value and label', () => {
    render(<NumericUpDown value={42} label="X" />);
    const nud = screen.getByTestId('nud-x');
    expect(nud).toBeInTheDocument();
    const input = screen.getByTestId('nud-x-input');
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe('42');
  });

  it('responds to increment button click', () => {
    const onChange = vi.fn();
    render(<NumericUpDown value={10} onChange={onChange} label="Test" step={1} min={0} max={100} />);
    const upBtn = screen.getByTestId('nud-test-up');
    fireEvent.click(upBtn);
    expect(onChange).toHaveBeenCalledWith(11);
  });

  it('responds to decrement button click', () => {
    const onChange = vi.fn();
    render(<NumericUpDown value={10} onChange={onChange} label="Val" step={1} min={0} max={100} />);
    const downBtn = screen.getByTestId('nud-val-down');
    fireEvent.click(downBtn);
    expect(onChange).toHaveBeenCalledWith(9);
  });

  it('clamps to min/max bounds', () => {
    const onChange = vi.fn();
    render(<NumericUpDown value={0} onChange={onChange} label="Clamped" step={1} min={0} max={10} />);
    const downBtn = screen.getByTestId('nud-clamped-down');
    fireEvent.click(downBtn);
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('displays suffix', () => {
    render(<NumericUpDown value={90} label="Angle" suffix="°" />);
    const input = screen.getByTestId('nud-angle-input');
    expect((input as HTMLInputElement).value).toContain('°');
  });
});

// ---------------------------------------------------------------------------
// ColorSwatch
// ---------------------------------------------------------------------------

describe('ColorSwatch', () => {
  it('renders with given color', () => {
    render(<ColorSwatch color="#FF6600" label="test" />);
    const swatch = screen.getByTestId('color-swatch-test');
    expect(swatch).toBeInTheDocument();
  });

  it('renders fill element with background color', () => {
    render(<ColorSwatch color="#00FF00" label="green" />);
    const fill = screen.getByTestId('color-swatch-green-fill');
    expect(fill).toBeInTheDocument();
    expect(fill.style.backgroundColor).toBeTruthy();
  });

  it('responds to click', () => {
    const onClick = vi.fn();
    render(<ColorSwatch color="#FF0000" label="clickable" onClick={onClick} />);
    const swatch = screen.getByTestId('color-swatch-clickable');
    fireEvent.click(swatch);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// PropertiesTab
// ---------------------------------------------------------------------------

describe('PropertiesTab', () => {
  function setupSelectedLayer(overrides?: Partial<ReturnType<typeof createDefaultLayer>>) {
    const layer = createDefaultLayer({ name: 'Layer 1', width: 1920, height: 1080, ...overrides });
    useDocumentStore.setState({
      project: {
        ...useDocumentStore.getState().project,
        layers: [layer],
      },
      selectedLayerIds: [layer.id],
    });
    return layer;
  }

  beforeEach(() => {
    useDocumentStore.setState({
      project: { ...useDocumentStore.getState().project, layers: [] },
      selectedLayerIds: [],
    });
  });

  it('shows "No layer selected" default state', () => {
    render(<PropertiesTab />);
    const tab = screen.getByTestId('properties-tab');
    expect(tab).toBeInTheDocument();
    expect(tab.textContent).toContain('No layer selected');
  });

  it('renders blend mode selector when layer selected', () => {
    setupSelectedLayer({ type: 'image' });
    render(<PropertiesTab />);
    const blendSelect = screen.getByTestId('blend-mode-select');
    expect(blendSelect).toBeInTheDocument();
  });

  it('renders opacity slider when layer selected', () => {
    setupSelectedLayer({ name: 'BG', width: 1920, height: 1080 });
    render(<PropertiesTab />);
    const slider = screen.getByTestId('opacity-slider');
    expect(slider).toBeInTheDocument();
  });

  it('renders layer name in bottom bar', () => {
    setupSelectedLayer({ name: 'My Layer', width: 800, height: 600 });
    render(<PropertiesTab />);
    const layerName = screen.getByTestId('layer-name');
    expect(layerName).toBeInTheDocument();
    expect(layerName.textContent).toBe('My Layer');
  });

  it('renders image dimensions in bottom bar', () => {
    setupSelectedLayer({ name: 'Photo', width: 1920, height: 1080 });
    render(<PropertiesTab />);
    const dims = screen.getByTestId('image-dimensions');
    expect(dims).toBeInTheDocument();
    expect(dims.textContent).toBe('1920 x 1080');
  });

  it('renders optimize memory button', () => {
    setupSelectedLayer({ name: 'Layer' });
    render(<PropertiesTab />);
    const btn = screen.getByTestId('optimize-memory-btn');
    expect(btn).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// PositionExpander
// ---------------------------------------------------------------------------

describe('PositionExpander', () => {
  const mockLayer = createDefaultLayer({ name: 'Test', x: 10, y: 20, width: 200, height: 100, rotation: 45, padding: 5 });
  const noop = vi.fn();

  it('renders with POSITION header', () => {
    render(<PositionExpander layer={mockLayer} onUpdate={noop} />);
    const trigger = screen.getByTestId('position-expander-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toContain('POSITION');
  });

  it('renders X/Y/W/H fields when open', () => {
    render(<PositionExpander layer={mockLayer} onUpdate={noop} defaultOpen />);
    expect(screen.getByTestId('nud-x')).toBeInTheDocument();
    expect(screen.getByTestId('nud-y')).toBeInTheDocument();
    expect(screen.getByTestId('nud-w')).toBeInTheDocument();
    expect(screen.getByTestId('nud-h')).toBeInTheDocument();
  });

  it('renders rotation field', () => {
    render(<PositionExpander layer={mockLayer} onUpdate={noop} defaultOpen />);
    expect(screen.getByTestId('nud-rotation')).toBeInTheDocument();
  });

  it('renders padding field', () => {
    render(<PositionExpander layer={mockLayer} onUpdate={noop} defaultOpen />);
    expect(screen.getByTestId('nud-padding')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// EffectsExpander
// ---------------------------------------------------------------------------

describe('EffectsExpander', () => {
  const mockLayer = createDefaultLayer({ name: 'Test' });
  const noop = vi.fn();

  it('renders with EFFECTS header', () => {
    render(<EffectsExpander layer={mockLayer} onUpdate={noop} />);
    const trigger = screen.getByTestId('effects-expander-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toContain('EFFECTS');
  });

  it('renders all 21 effect names when open', () => {
    render(<EffectsExpander layer={mockLayer} onUpdate={noop} defaultOpen />);
    const expectedEffects = [
      'brightness', 'contrast', 'saturation', 'hue',
      'grayscale', 'sepia', 'invert',
      'sharpen', 'vignette', 'pixelate',
      'colorTint', 'noise', 'posterize',
      'gaussianBlur', 'dropShadow', 'outerGlow',
      'cutStroke', 'rimLight', 'splitToning',
      'smoothStroke', 'blendOverlay',
    ];
    expect(expectedEffects).toHaveLength(21);
    for (const type of expectedEffects) {
      expect(screen.getByTestId(`effect-name-${type}`)).toBeInTheDocument();
    }
  });

  it('renders toggle switches for effects', () => {
    render(<EffectsExpander layer={mockLayer} onUpdate={noop} defaultOpen />);
    expect(screen.getByTestId('effect-toggle-brightness')).toBeInTheDocument();
    expect(screen.getByTestId('effect-toggle-contrast')).toBeInTheDocument();
    expect(screen.getByTestId('effect-toggle-gaussianBlur')).toBeInTheDocument();
  });

  it('renders effect labels with correct text', () => {
    render(<EffectsExpander layer={mockLayer} onUpdate={noop} defaultOpen />);
    expect(screen.getByTestId('effect-name-brightness').textContent).toBe('Brightness');
    expect(screen.getByTestId('effect-name-dropShadow').textContent).toBe('Drop Shadow');
    expect(screen.getByTestId('effect-name-splitToning').textContent).toBe('Split Toning');
  });
});
