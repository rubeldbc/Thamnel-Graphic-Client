import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { mdiCursorDefault } from '@mdi/js';
import { LeftToolbar } from '../components/LeftToolbar/LeftToolbar';
import { ToolToggleButton } from '../components/LeftToolbar/ToolToggleButton';
import { FillStrokeSwatches } from '../components/LeftToolbar/FillStrokeSwatches';

// ---------------------------------------------------------------------------
// LeftToolbar
// ---------------------------------------------------------------------------

describe('LeftToolbar', () => {
  it('renders all tool buttons', () => {
    render(<LeftToolbar />);

    expect(screen.getByTestId('left-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('tool-select')).toBeInTheDocument();
    expect(screen.getByTestId('tool-text')).toBeInTheDocument();
    expect(screen.getByTestId('tool-shape')).toBeInTheDocument();
    expect(screen.getByTestId('tool-eraser')).toBeInTheDocument();
    expect(screen.getByTestId('tool-blur')).toBeInTheDocument();
    expect(screen.getByTestId('tool-align')).toBeInTheDocument();
    expect(screen.getByTestId('tool-distribute')).toBeInTheDocument();
  });

  it('renders fill/stroke swatches', () => {
    render(<LeftToolbar />);
    expect(screen.getByTestId('fill-stroke-swatches')).toBeInTheDocument();
  });

  it('shape picker button exists', () => {
    render(<LeftToolbar />);
    const shapeBtn = screen.getByTestId('tool-shape');
    expect(shapeBtn).toBeInTheDocument();
    // Should contain an SVG icon
    const svg = shapeBtn.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ToolToggleButton
// ---------------------------------------------------------------------------

describe('ToolToggleButton', () => {
  it('shows active state with data-active attribute', () => {
    render(
      <ToolToggleButton
        icon={mdiCursorDefault}
        toolName="select"
        isActive
        testId="btn-active"
      />,
    );
    const btn = screen.getByTestId('btn-active');
    expect(btn).toHaveAttribute('data-active');
    expect(btn.style.backgroundColor).toBe('var(--selected-bg)');
    expect(btn.style.borderLeft).toBe('3px solid var(--accent-orange)');
  });

  it('does not have data-active when inactive', () => {
    render(
      <ToolToggleButton
        icon={mdiCursorDefault}
        toolName="select"
        isActive={false}
        testId="btn-inactive"
      />,
    );
    const btn = screen.getByTestId('btn-inactive');
    expect(btn).not.toHaveAttribute('data-active');
  });
});

// ---------------------------------------------------------------------------
// FillStrokeSwatches
// ---------------------------------------------------------------------------

describe('FillStrokeSwatches', () => {
  it('renders both swatches with correct colours', () => {
    render(
      <FillStrokeSwatches fillColor="#FF0000" strokeColor="#00FF00" />,
    );

    const fill = screen.getByTestId('swatch-fill');
    const stroke = screen.getByTestId('swatch-stroke');

    expect(fill).toBeInTheDocument();
    expect(stroke).toBeInTheDocument();

    // Verify background colours (jsdom normalises hex to rgb)
    expect(fill.style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect(stroke.style.backgroundColor).toBe('rgb(0, 255, 0)');
  });

  it('renders the container element', () => {
    render(<FillStrokeSwatches />);
    expect(screen.getByTestId('fill-stroke-swatches')).toBeInTheDocument();
  });
});
