import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplatesTab } from '../components/RightPanel/Templates/TemplatesTab';
import { TemplateItem, type TemplateData } from '../components/RightPanel/Templates/TemplateItem';
import { RightPanel } from '../components/RightPanel/RightPanel';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_TEMPLATES: TemplateData[] = [
  { id: 'tpl-1', name: 'Landing Page' },
  { id: 'tpl-2', name: 'Social Media Banner' },
  { id: 'tpl-3', name: 'Product Card' },
];

// ---------------------------------------------------------------------------
// TemplatesTab
// ---------------------------------------------------------------------------

describe('TemplatesTab', () => {
  it('renders empty state when no templates', () => {
    render(<TemplatesTab />);
    const tab = screen.getByTestId('templates-tab');
    expect(tab).toBeInTheDocument();
    const empty = screen.getByTestId('templates-empty');
    expect(empty).toBeInTheDocument();
    expect(empty.textContent).toContain('No templates saved');
  });

  it('renders template items when given templates', () => {
    render(<TemplatesTab templates={MOCK_TEMPLATES} />);
    const items = screen.getAllByTestId('template-item');
    expect(items).toHaveLength(3);
  });

  it('shows count badge in RightPanel templates tab', () => {
    render(<RightPanel templatesProps={{ templates: MOCK_TEMPLATES }} />);
    const badge = screen.getByTestId('templates-count-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('(3)');
  });
});

// ---------------------------------------------------------------------------
// TemplateItem
// ---------------------------------------------------------------------------

describe('TemplateItem', () => {
  it('shows name and icon', () => {
    render(
      <TemplateItem template={{ id: 'tpl-1', name: 'My Template' }} />,
    );
    const item = screen.getByTestId('template-item');
    expect(item).toBeInTheDocument();

    const name = screen.getByTestId('template-name');
    expect(name.textContent).toBe('My Template');

    // Should contain an SVG icon (the bookmark icon)
    const svg = item.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('double-click calls handler', () => {
    const onDoubleClick = vi.fn();
    render(
      <TemplateItem
        template={{ id: 'tpl-42', name: 'Test' }}
        onDoubleClick={onDoubleClick}
      />,
    );
    const item = screen.getByTestId('template-item');
    fireEvent.doubleClick(item);
    expect(onDoubleClick).toHaveBeenCalledWith('tpl-42');
  });
});

// ---------------------------------------------------------------------------
// RightPanel
// ---------------------------------------------------------------------------

describe('RightPanel', () => {
  it('renders all 3 tabs', () => {
    render(<RightPanel />);
    const panel = screen.getByTestId('right-panel');
    expect(panel).toBeInTheDocument();

    expect(screen.getByTestId('tab-properties')).toBeInTheDocument();
    expect(screen.getByTestId('tab-layers')).toBeInTheDocument();
    expect(screen.getByTestId('tab-templates')).toBeInTheDocument();
  });

  it('defaults to Properties tab', () => {
    render(<RightPanel />);
    const propertiesTab = screen.getByTestId('tab-properties');
    expect(propertiesTab).toHaveAttribute('data-state', 'active');

    // Properties content should be visible
    expect(screen.getByTestId('properties-tab')).toBeInTheDocument();
  });
});
