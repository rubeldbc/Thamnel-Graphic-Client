import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from '../components/StatusBar/StatusBar';
import { StatusDot } from '../components/StatusBar/StatusDot';
import { ProgressIndicator } from '../components/StatusBar/ProgressIndicator';

// ---------------------------------------------------------------------------
// StatusBar
// ---------------------------------------------------------------------------

describe('StatusBar', () => {
  it('renders with "Ready" status text', () => {
    render(<StatusBar />);
    const bar = screen.getByTestId('status-bar');
    expect(bar).toBeInTheDocument();

    const statusText = screen.getByTestId('status-text');
    expect(statusText.textContent).toBe('Ready');
  });

  it('shows canvas dimensions', () => {
    render(<StatusBar canvasWidth={1920} canvasHeight={1080} />);
    const dims = screen.getByTestId('canvas-dimensions');
    expect(dims).toBeInTheDocument();
    expect(dims.textContent).toBe('1920 x 1080');
  });

  it('shows inference device indicator', () => {
    render(<StatusBar inferenceDevice="CPU" />);
    const device = screen.getByTestId('inference-device');
    expect(device).toBeInTheDocument();
    expect(device.textContent).toBe('CPU');
    expect(device.style.color).toBe('rgb(138, 180, 248)');
  });

  it('shows GPU device with green color', () => {
    render(<StatusBar inferenceDevice="GPU" />);
    const device = screen.getByTestId('inference-device');
    expect(device.textContent).toBe('GPU');
    expect(device.style.color).toBe('rgb(129, 199, 132)');
  });

  it('displays user name', () => {
    render(<StatusBar userName="Designer" />);
    const name = screen.getByTestId('user-name');
    expect(name).toBeInTheDocument();
    expect(name.textContent).toBe('Designer');
  });

  it('renders server status dots with IP:Port', () => {
    render(<StatusBar />);
    const textServer = screen.getByTestId('text-server-status');
    expect(textServer).toBeInTheDocument();
    expect(textServer.textContent).toContain('127.0.0.1:5050');

    const renderServer = screen.getByTestId('render-server-status');
    expect(renderServer).toBeInTheDocument();
    expect(renderServer.textContent).toContain('127.0.0.1:5051');

    // Should have status-dot elements inside
    const dots = screen.getAllByTestId('status-dot');
    expect(dots.length).toBeGreaterThanOrEqual(2);
  });

  it('has API key icon', () => {
    render(<StatusBar />);
    const icon = screen.getByTestId('api-key-icon');
    expect(icon).toBeInTheDocument();

    // Should contain an SVG element (the mdiKey icon)
    const svg = icon.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// StatusDot
// ---------------------------------------------------------------------------

describe('StatusDot', () => {
  it('renders with correct green color for connected', () => {
    render(<StatusDot status="connected" />);
    const dot = screen.getByTestId('status-dot');
    expect(dot).toBeInTheDocument();
    expect(dot.getAttribute('data-status')).toBe('connected');

    // The inner colored span
    const inner = dot.querySelector('span');
    expect(inner).toBeTruthy();
    expect(inner!.style.backgroundColor).toBe('rgb(129, 199, 132)'); // #81C784
  });

  it('renders with correct red color for disconnected', () => {
    render(<StatusDot status="disconnected" />);
    const dot = screen.getByTestId('status-dot');
    expect(dot.getAttribute('data-status')).toBe('disconnected');

    const inner = dot.querySelector('span');
    expect(inner!.style.backgroundColor).toBe('rgb(239, 83, 80)'); // #EF5350
  });

  it('renders with correct blue color for busy', () => {
    render(<StatusDot status="busy" />);
    const dot = screen.getByTestId('status-dot');
    expect(dot.getAttribute('data-status')).toBe('busy');

    const inner = dot.querySelector('span');
    expect(inner!.style.backgroundColor).toBe('rgb(66, 165, 245)'); // #42A5F5
  });

  it('renders label text when provided', () => {
    render(<StatusDot status="connected" label="Online" />);
    const dot = screen.getByTestId('status-dot');
    expect(dot.textContent).toContain('Online');
  });
});

// ---------------------------------------------------------------------------
// ProgressIndicator
// ---------------------------------------------------------------------------

describe('ProgressIndicator', () => {
  it('renders bar with value', () => {
    render(<ProgressIndicator value={45} />);
    const indicator = screen.getByTestId('progress-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator.textContent).toContain('45%');
  });

  it('renders with label text', () => {
    render(<ProgressIndicator value={70} label="Rendering..." />);
    const indicator = screen.getByTestId('progress-indicator');
    expect(indicator.textContent).toContain('70%');
    expect(indicator.textContent).toContain('Rendering...');
  });

  it('is hidden when visible=false', () => {
    const { container } = render(<ProgressIndicator value={50} visible={false} />);
    expect(container.querySelector('[data-testid="progress-indicator"]')).toBeNull();
  });

  it('clamps value between 0 and 100', () => {
    render(<ProgressIndicator value={150} />);
    const indicator = screen.getByTestId('progress-indicator');
    expect(indicator.textContent).toContain('100%');
  });
});
