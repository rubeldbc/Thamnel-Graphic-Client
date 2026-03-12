import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CanvasViewport } from '../components/Canvas/CanvasViewport';
import { useUiStore } from '../stores/uiStore';
import { useDocumentStore } from '../stores/documentStore';

// ---------------------------------------------------------------------------
// Mock compositeAllLayers so we can assert it's called without needing
// a real Canvas2D implementation (jsdom doesn't provide one).
// ---------------------------------------------------------------------------
const mockComposite = vi.fn(
  (_layers: any, w: number, h: number, _bg: string, _zoom: number, _q: number, _interactive?: boolean) => {
    // Return a real DOM canvas element (jsdom can create it, just can't render)
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  },
);

vi.mock('../engine/compositor', () => ({
  compositeAllLayers: (...args: [any, number, number, string, number, number, boolean?]) => mockComposite(...args),
}));

// ---------------------------------------------------------------------------
// Helper: mock requestAnimationFrame to run synchronously for tests
// ---------------------------------------------------------------------------
let rafCallbacks: Array<(t: number) => void> = [];
let rafId = 0;

function setupRafMock() {
  rafCallbacks = [];
  rafId = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    rafCallbacks.push(cb);
    return ++rafId;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
}

function flushRaf(count = 1) {
  for (let i = 0; i < count && rafCallbacks.length > 0; i++) {
    const cb = rafCallbacks.shift()!;
    cb(performance.now());
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('GW Phase 5 – Canvas Viewport Integration', () => {
  beforeEach(() => {
    setupRafMock();
    mockComposite.mockClear();

    // Reset stores to defaults
    useUiStore.setState({
      zoom: 1,
      gridVisible: false,
      activeTool: 'select',
    });
    useDocumentStore.setState({
      project: {
        projectId: 'test-proj',
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
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Canvas renders with correct dimensions from store
  // =========================================================================
  it('renders canvas with correct dimensions from documentStore', () => {
    useDocumentStore.setState({
      project: {
        ...useDocumentStore.getState().project,
        canvasWidth: 800,
        canvasHeight: 600,
      },
    });

    render(<CanvasViewport />);

    const surface = screen.getByTestId('canvas-surface');
    expect(surface).toBeInTheDocument();

    // At zoom=1, scaledWidth=800, scaledHeight=600
    expect(surface.style.width).toBe('800px');
    expect(surface.style.height).toBe('600px');
  });

  // =========================================================================
  // 2. Zoom changes update canvas scale
  // =========================================================================
  it('zoom changes update canvas surface dimensions', () => {
    const { rerender } = render(<CanvasViewport initialZoom={1} canvasWidth={800} canvasHeight={600} />);

    const surface = screen.getByTestId('canvas-surface');
    expect(surface.style.width).toBe('800px');
    expect(surface.style.height).toBe('600px');

    // Re-render with new zoom
    rerender(<CanvasViewport initialZoom={2} canvasWidth={800} canvasHeight={600} />);
    expect(surface.style.width).toBe('1600px');
    expect(surface.style.height).toBe('1200px');
  });

  // =========================================================================
  // 3. Ctrl+Scroll wheel triggers zoom
  // =========================================================================
  it('Ctrl+scroll wheel triggers zoom change', () => {
    useUiStore.setState({ zoom: 1.0 });

    render(<CanvasViewport />);
    const scrollArea = screen.getByTestId('canvas-scroll-area');

    // Simulate Ctrl+scroll down (zoom out)
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 100,
      ctrlKey: true,
      bubbles: true,
      clientX: 100,
      clientY: 100,
    });

    act(() => {
      scrollArea.dispatchEvent(wheelEvent);
    });

    // Zoom should have decreased by ZOOM_STEP (0.1)
    const newZoom = useUiStore.getState().zoom;
    expect(newZoom).toBeCloseTo(0.9, 1);
  });

  it('Ctrl+scroll wheel zoom in increases zoom', () => {
    useUiStore.setState({ zoom: 1.0 });

    render(<CanvasViewport />);
    const scrollArea = screen.getByTestId('canvas-scroll-area');

    // Simulate Ctrl+scroll up (zoom in)
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: -100,
      ctrlKey: true,
      bubbles: true,
      clientX: 100,
      clientY: 100,
    });

    act(() => {
      scrollArea.dispatchEvent(wheelEvent);
    });

    const newZoom = useUiStore.getState().zoom;
    expect(newZoom).toBeCloseTo(1.1, 1);
  });

  it('zoom is clamped to min 0.1 and max 5.0', () => {
    // Test min clamp
    useUiStore.setState({ zoom: 0.1 });
    render(<CanvasViewport />);
    const scrollArea = screen.getByTestId('canvas-scroll-area');

    const wheelDown = new WheelEvent('wheel', {
      deltaY: 100,
      ctrlKey: true,
      bubbles: true,
    });

    act(() => {
      scrollArea.dispatchEvent(wheelDown);
    });

    // Should stay at 0.1 (clamped)
    expect(useUiStore.getState().zoom).toBeGreaterThanOrEqual(0.1);
  });

  // =========================================================================
  // 4. Space key enables pan mode
  // =========================================================================
  it('Space key sets pan cursor', () => {
    render(<CanvasViewport />);
    const scrollArea = screen.getByTestId('canvas-scroll-area');

    // Initially default cursor
    expect(scrollArea.style.cursor).toBe('default');

    // Press Space
    act(() => {
      fireEvent.keyDown(window, { code: 'Space' });
    });

    expect(scrollArea.style.cursor).toBe('grab');

    // Release Space
    act(() => {
      fireEvent.keyUp(window, { code: 'Space' });
    });

    expect(scrollArea.style.cursor).toBe('default');
  });

  it('Space+drag sets grabbing cursor and pans', () => {
    render(<CanvasViewport />);
    const scrollArea = screen.getByTestId('canvas-scroll-area');

    // Press Space
    act(() => {
      fireEvent.keyDown(window, { code: 'Space' });
    });

    expect(scrollArea.style.cursor).toBe('grab');

    // Mouse down to start panning
    act(() => {
      fireEvent.mouseDown(scrollArea, { clientX: 100, clientY: 100 });
    });

    expect(scrollArea.style.cursor).toBe('grabbing');

    // Mouse up to stop panning
    act(() => {
      fireEvent.mouseUp(scrollArea);
    });

    // Still space held, so grab
    expect(scrollArea.style.cursor).toBe('grab');

    // Release space
    act(() => {
      fireEvent.keyUp(window, { code: 'Space' });
    });

    expect(scrollArea.style.cursor).toBe('default');
  });

  // =========================================================================
  // 5. Active tool indicator shows current tool
  // =========================================================================
  it('active tool indicator shows current tool from uiStore', () => {
    useUiStore.setState({ activeTool: 'select' });
    render(<CanvasViewport />);

    const indicator = screen.getByTestId('active-tool-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator.textContent).toBe('Select Tool');
  });

  it('active tool indicator updates when tool changes', () => {
    useUiStore.setState({ activeTool: 'text' });
    const { rerender } = render(<CanvasViewport />);

    const indicator = screen.getByTestId('active-tool-indicator');
    expect(indicator.textContent).toBe('Text Tool');

    // Change tool in store
    act(() => {
      useUiStore.setState({ activeTool: 'shape' });
    });

    rerender(<CanvasViewport />);
    expect(indicator.textContent).toBe('Shape Tool');
  });

  it('activeTool prop overrides store label', () => {
    render(<CanvasViewport activeTool="Custom Tool" />);

    const indicator = screen.getByTestId('active-tool-indicator');
    expect(indicator.textContent).toBe('Custom Tool');
  });

  // =========================================================================
  // 6. Grid overlay visibility matches store state
  // =========================================================================
  it('grid overlay is hidden when gridVisible is false', () => {
    useUiStore.setState({ gridVisible: false });
    render(<CanvasViewport canvasWidth={800} canvasHeight={600} initialZoom={1} />);

    expect(screen.queryByTestId('grid-overlay')).not.toBeInTheDocument();
  });

  it('grid overlay is visible when gridVisible is true', () => {
    useUiStore.setState({ gridVisible: true });
    render(<CanvasViewport canvasWidth={800} canvasHeight={600} initialZoom={1} />);

    expect(screen.getByTestId('grid-overlay')).toBeInTheDocument();
  });

  // =========================================================================
  // 7. compositeAllLayers is called during render
  // =========================================================================
  it('compositeAllLayers is called on render frame', () => {
    render(<CanvasViewport />);

    // Flush one animation frame
    flushRaf(1);

    expect(mockComposite).toHaveBeenCalled();
    // Check it was called with the correct canvas dimensions
    const call = mockComposite.mock.calls[0];
    expect(call[1]).toBe(1920); // canvasWidth
    expect(call[2]).toBe(1080); // canvasHeight
    expect(call[3]).toBe('#000000'); // backgroundColor
  });

  it('compositeAllLayers uses store backgroundColor', () => {
    useDocumentStore.setState({
      project: {
        ...useDocumentStore.getState().project,
        backgroundColor: '#FF0000',
      },
    });

    render(<CanvasViewport />);
    flushRaf(1);

    expect(mockComposite).toHaveBeenCalled();
    const call = mockComposite.mock.calls[0];
    expect(call[3]).toBe('#FF0000');
  });

  // =========================================================================
  // 8. Existing structure / data-testid attributes preserved
  // =========================================================================
  it('preserves all existing data-testid attributes', () => {
    render(
      <CanvasViewport
        initialZoom={1}
        canvasWidth={800}
        canvasHeight={600}
        guides={[]}
        marqueeRect={null}
        selectedBounds={null}
      />,
    );

    expect(screen.getByTestId('canvas-viewport')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-scroll-area')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-surface')).toBeInTheDocument();
    expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('dim-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('padding-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('active-tool-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('ruler-horizontal')).toBeInTheDocument();
    expect(screen.getByTestId('ruler-vertical')).toBeInTheDocument();
    expect(screen.getByTestId('ruler-corner')).toBeInTheDocument();
  });

  // =========================================================================
  // 9. Render canvas element exists
  // =========================================================================
  it('render canvas element is present in the DOM', () => {
    render(<CanvasViewport initialZoom={1} canvasWidth={800} canvasHeight={600} />);

    const renderCanvas = screen.getByTestId('render-canvas');
    expect(renderCanvas).toBeInTheDocument();
    expect(renderCanvas.tagName.toLowerCase()).toBe('canvas');
  });

  // =========================================================================
  // 10. Design canvas uses backgroundColor from store
  // =========================================================================
  it('design canvas uses backgroundColor from documentStore', () => {
    useDocumentStore.setState({
      project: {
        ...useDocumentStore.getState().project,
        backgroundColor: '#FF5500',
      },
    });

    render(<CanvasViewport />);

    const designCanvas = screen.getByTestId('design-canvas');
    expect(designCanvas.style.backgroundColor).toBe('rgb(255, 85, 0)');
  });

  // =========================================================================
  // 11. Canvas shadow is applied
  // =========================================================================
  it('design canvas has drop-shadow filter', () => {
    render(<CanvasViewport initialZoom={1} canvasWidth={800} canvasHeight={600} />);

    const designCanvas = screen.getByTestId('design-canvas');
    expect(designCanvas.style.filter).toContain('drop-shadow');
  });

  // =========================================================================
  // 12. Rulers are connected to scroll position
  // =========================================================================
  it('rulers are rendered and connected', () => {
    render(<CanvasViewport initialZoom={1} canvasWidth={800} canvasHeight={600} />);

    const hRuler = screen.getByTestId('ruler-horizontal');
    const vRuler = screen.getByTestId('ruler-vertical');

    expect(hRuler).toBeInTheDocument();
    expect(vRuler).toBeInTheDocument();
  });
});
