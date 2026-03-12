import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainLayout } from '../components/layout/MainLayout';
import { ResizableSplitter } from '../components/layout/ResizableSplitter';
import { PanelShell } from '../components/layout/PanelShell';

describe('MainLayout', () => {
  it('renders all panel regions', () => {
    render(<MainLayout />);

    expect(screen.getByTestId('panel-menubar')).toBeInTheDocument();
    expect(screen.getByTestId('panel-top-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('panel-left-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('panel-left-tab')).toBeInTheDocument();
    expect(screen.getByTestId('panel-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('panel-frame-gallery')).toBeInTheDocument();
    expect(screen.getByTestId('panel-right-panel')).toBeInTheDocument();
    expect(screen.getByTestId('panel-statusbar')).toBeInTheDocument();
  });

  it('renders real components in all panel slots', () => {
    render(<MainLayout />);

    // All panels have been replaced by real components in phases 3-12.
    // Verify key testids from each real component.
    expect(screen.getByTestId('canvas-viewport')).toBeInTheDocument();
    expect(screen.getByTestId('frame-gallery')).toBeInTheDocument();
    expect(screen.getByTestId('right-panel')).toBeInTheDocument();
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
  });

  it('has correct 4-row structure (menubar, toolbar, content, statusbar)', () => {
    render(<MainLayout />);

    const layout = screen.getByTestId('main-layout');
    // The layout root should be a flex column container
    expect(layout.className).toContain('flex');
    expect(layout.className).toContain('flex-col');

    // It should have 4 direct children (the 4 rows)
    const rows = layout.children;
    expect(rows.length).toBe(4);

    // Row 1: Menu Bar (32px)
    const menuRow = rows[0] as HTMLElement;
    expect(menuRow.style.height).toBe('32px');

    // Row 2: Top Toolbar (40px)
    const toolbarRow = rows[1] as HTMLElement;
    expect(toolbarRow.style.height).toBe('40px');

    // Row 3: Main Content (flex-1, no fixed height)
    const contentRow = rows[2] as HTMLElement;
    expect(contentRow.className).toContain('flex-1');

    // Row 4: Status Bar (28px)
    const statusRow = rows[3] as HTMLElement;
    expect(statusRow.style.height).toBe('28px');
  });

  it('sets minimum window constraints', () => {
    render(<MainLayout />);

    const layout = screen.getByTestId('main-layout');
    expect(layout.style.minWidth).toBe('1000px');
    expect(layout.style.minHeight).toBe('600px');
  });
});

describe('ResizableSplitter', () => {
  it('renders with horizontal orientation (col-resize)', () => {
    render(
      <ResizableSplitter
        orientation="horizontal"
        onResize={() => {}}
        testId="test-splitter-h"
      />,
    );

    const splitter = screen.getByTestId('test-splitter-h');
    expect(splitter).toBeInTheDocument();
    expect(splitter.getAttribute('role')).toBe('separator');
    expect(splitter.getAttribute('aria-orientation')).toBe('horizontal');
    expect(splitter.className).toContain('cursor-col-resize');
  });

  it('renders with vertical orientation (row-resize)', () => {
    render(
      <ResizableSplitter
        orientation="vertical"
        onResize={() => {}}
        testId="test-splitter-v"
      />,
    );

    const splitter = screen.getByTestId('test-splitter-v');
    expect(splitter).toBeInTheDocument();
    expect(splitter.getAttribute('role')).toBe('separator');
    expect(splitter.getAttribute('aria-orientation')).toBe('vertical');
    expect(splitter.className).toContain('cursor-row-resize');
  });
});

describe('PanelShell', () => {
  it('renders children content', () => {
    render(
      <PanelShell testId="test-panel">
        <span>Hello Panel</span>
      </PanelShell>,
    );

    const panel = screen.getByTestId('test-panel');
    expect(panel).toBeInTheDocument();
    expect(screen.getByText('Hello Panel')).toBeInTheDocument();
  });

  it('renders an optional title header', () => {
    render(
      <PanelShell testId="test-panel-titled" title="My Panel">
        Content
      </PanelShell>,
    );

    expect(screen.getByText('My Panel')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('does not render a title header when no title is given', () => {
    render(
      <PanelShell testId="test-panel-no-title">
        Just content
      </PanelShell>,
    );

    const panel = screen.getByTestId('test-panel-no-title');
    // The panel should only have one child div (the content wrapper), no title bar
    expect(panel.children.length).toBe(1);
  });

  it('applies custom className', () => {
    render(
      <PanelShell testId="test-panel-cls" className="my-custom">
        Styled
      </PanelShell>,
    );

    const panel = screen.getByTestId('test-panel-cls');
    expect(panel.className).toContain('my-custom');
  });
});
