import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { mdiFileOutline } from '@mdi/js';
import { ToolbarButton } from '../components/TopToolbar/ToolbarButton';
import { ToolbarComboBox } from '../components/TopToolbar/ToolbarComboBox';
import { TopToolbar } from '../components/TopToolbar/TopToolbar';

// ---------------------------------------------------------------------------
// ToolbarButton
// ---------------------------------------------------------------------------

describe('ToolbarButton', () => {
  it('renders with an icon', () => {
    render(<ToolbarButton icon={mdiFileOutline} testId="tb-btn" />);
    const btn = screen.getByTestId('tb-btn');
    expect(btn).toBeInTheDocument();
    // Should contain an SVG icon
    const svg = btn.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('shows active state via data-active attribute and selected background', () => {
    render(<ToolbarButton icon={mdiFileOutline} active testId="tb-active" />);
    const btn = screen.getByTestId('tb-active');
    expect(btn).toHaveAttribute('data-active');
    expect(btn.style.backgroundColor).toBe('var(--selected-bg)');
  });

  it('disabled state disables the button element', () => {
    render(<ToolbarButton icon={mdiFileOutline} disabled testId="tb-dis" />);
    const btn = screen.getByTestId('tb-dis');
    expect(btn).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// TopToolbar
// ---------------------------------------------------------------------------

describe('TopToolbar', () => {
  it('renders left, center, and right sections', () => {
    render(<TopToolbar />);
    expect(screen.getByTestId('toolbar-left')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-center')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-right')).toBeInTheDocument();
  });

  it('displays the branding text', () => {
    render(<TopToolbar />);
    const branding = screen.getByTestId('branding-text');
    expect(branding).toBeVisible();
    expect(branding).toHaveTextContent('Thamnel by Kamrul Islam Rubel');
  });

  it('renders zoom controls that update zoom display', () => {
    render(<TopToolbar />);
    const display = screen.getByTestId('zoom-display');
    expect(display).toHaveTextContent('100%');

    // Zoom in
    fireEvent.click(screen.getByTestId('btn-zoom-in'));
    expect(display).toHaveTextContent('110%');

    // Zoom out
    fireEvent.click(screen.getByTestId('btn-zoom-out'));
    expect(display).toHaveTextContent('100%');
  });
});

// ---------------------------------------------------------------------------
// ToolbarComboBox
// ---------------------------------------------------------------------------

describe('ToolbarComboBox', () => {
  const options = [
    { label: '10%', value: '10' },
    { label: '50%', value: '50' },
    { label: '100%', value: '100' },
  ];

  it('renders with a value', () => {
    render(
      <ToolbarComboBox
        value="100"
        options={options}
        testId="cb"
      />,
    );
    const trigger = screen.getByTestId('cb');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('100%');
  });

  it('renders with placeholder when no value', () => {
    render(
      <ToolbarComboBox
        options={options}
        placeholder="Quality"
        testId="cb-ph"
      />,
    );
    const trigger = screen.getByTestId('cb-ph');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Quality');
  });
});
