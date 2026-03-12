import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CanvasViewport } from '../components/Canvas/CanvasViewport';
import { Ruler } from '../components/Canvas/Ruler';
import { GridOverlay } from '../components/Canvas/GridOverlay';
import { HandleOverlay } from '../components/Canvas/HandleOverlay';
import { useUiStore } from '../stores/uiStore';

// ---------------------------------------------------------------------------
// CanvasViewport
// ---------------------------------------------------------------------------

describe('CanvasViewport', () => {
  it('renders the canvas viewport container', () => {
    render(<CanvasViewport />);
    expect(screen.getByTestId('canvas-viewport')).toBeInTheDocument();
  });

  it('renders the design canvas surface', () => {
    render(<CanvasViewport />);
    expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
  });

  it('renders the canvas scroll area', () => {
    render(<CanvasViewport />);
    expect(screen.getByTestId('canvas-scroll-area')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Rulers
// ---------------------------------------------------------------------------

describe('Rulers', () => {
  it('renders a horizontal ruler', () => {
    render(<Ruler orientation="horizontal" zoom={1} scrollOffset={0} canvasSize={1920} />);
    expect(screen.getByTestId('ruler-horizontal')).toBeInTheDocument();
  });

  it('renders a vertical ruler', () => {
    render(<Ruler orientation="vertical" zoom={1} scrollOffset={0} canvasSize={1080} />);
    expect(screen.getByTestId('ruler-vertical')).toBeInTheDocument();
  });

  it('both rulers render inside CanvasViewport', () => {
    render(<CanvasViewport />);
    expect(screen.getByTestId('ruler-horizontal')).toBeInTheDocument();
    expect(screen.getByTestId('ruler-vertical')).toBeInTheDocument();
    expect(screen.getByTestId('ruler-corner')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// GridOverlay
// ---------------------------------------------------------------------------

describe('GridOverlay', () => {
  it('renders when visible=true', () => {
    render(
      <GridOverlay visible={true} zoom={1} canvasWidth={1920} canvasHeight={1080} />,
    );
    expect(screen.getByTestId('grid-overlay')).toBeInTheDocument();
  });

  it('does not render when visible=false', () => {
    render(
      <GridOverlay visible={false} zoom={1} canvasWidth={1920} canvasHeight={1080} />,
    );
    expect(screen.queryByTestId('grid-overlay')).not.toBeInTheDocument();
  });

  it('grid overlay is present inside CanvasViewport when grid enabled in store', () => {
    // Enable grid in the store before rendering
    useUiStore.setState({ gridVisible: true });
    render(<CanvasViewport />);
    expect(screen.getByTestId('grid-overlay')).toBeInTheDocument();
    // Reset
    useUiStore.setState({ gridVisible: false });
  });
});

// ---------------------------------------------------------------------------
// Canvas dimensions
// ---------------------------------------------------------------------------

describe('Canvas dimensions', () => {
  it('has correct default dimensions (1920x1080 at zoom 1)', () => {
    render(<CanvasViewport />);
    const surface = screen.getByTestId('design-canvas');
    // The design canvas should be 100% of its parent which is 1920x1080 at zoom 1
    const parent = surface.parentElement!;
    expect(parent.style.width).toBe('1920px');
    expect(parent.style.height).toBe('1080px');
  });

  it('respects custom canvas dimensions', () => {
    render(<CanvasViewport canvasWidth={800} canvasHeight={600} />);
    const surface = screen.getByTestId('design-canvas');
    const parent = surface.parentElement!;
    expect(parent.style.width).toBe('800px');
    expect(parent.style.height).toBe('600px');
  });
});

// ---------------------------------------------------------------------------
// HandleOverlay
// ---------------------------------------------------------------------------

describe('HandleOverlay', () => {
  it('renders when selectedBounds is provided', () => {
    render(
      <HandleOverlay
        selectedBounds={{ x: 100, y: 100, width: 200, height: 150 }}
        zoom={1}
      />,
    );
    expect(screen.getByTestId('handle-overlay')).toBeInTheDocument();
  });

  it('renders 8 resize handles and a rotation handle', () => {
    render(
      <HandleOverlay
        selectedBounds={{ x: 100, y: 100, width: 200, height: 150 }}
        zoom={1}
      />,
    );
    expect(screen.getByTestId('handle-nw')).toBeInTheDocument();
    expect(screen.getByTestId('handle-n')).toBeInTheDocument();
    expect(screen.getByTestId('handle-ne')).toBeInTheDocument();
    expect(screen.getByTestId('handle-e')).toBeInTheDocument();
    expect(screen.getByTestId('handle-se')).toBeInTheDocument();
    expect(screen.getByTestId('handle-s')).toBeInTheDocument();
    expect(screen.getByTestId('handle-sw')).toBeInTheDocument();
    expect(screen.getByTestId('handle-w')).toBeInTheDocument();
    expect(screen.getByTestId('handle-rotate')).toBeInTheDocument();
  });

  it('does not render when selectedBounds is null', () => {
    render(<HandleOverlay selectedBounds={null} zoom={1} />);
    expect(screen.queryByTestId('handle-overlay')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Active tool indicator
// ---------------------------------------------------------------------------

describe('Active tool indicator', () => {
  it('is visible with default text', () => {
    render(<CanvasViewport />);
    const indicator = screen.getByTestId('active-tool-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator.textContent).toBe('Select Tool');
  });

  it('shows custom tool name', () => {
    render(<CanvasViewport activeTool="Pen Tool" />);
    const indicator = screen.getByTestId('active-tool-indicator');
    expect(indicator.textContent).toBe('Pen Tool');
  });
});
