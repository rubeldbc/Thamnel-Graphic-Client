import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MenuBar } from '../components/MenuBar/MenuBar';

const MENU_LABELS = ['File', 'Edit', 'View', 'Layer', 'Image', 'Tools', 'Window', 'Help'];

describe('MenuBar', () => {
  it('renders all 8 top-level menu triggers', () => {
    render(<MenuBar />);

    for (const label of MENU_LABELS) {
      expect(
        screen.getByTestId(`menubar-trigger-${label.toLowerCase()}`),
      ).toBeInTheDocument();
    }
  });

  it('menu triggers display the correct visible text', () => {
    render(<MenuBar />);

    for (const label of MENU_LABELS) {
      const trigger = screen.getByTestId(`menubar-trigger-${label.toLowerCase()}`);
      expect(trigger).toHaveTextContent(label);
      expect(trigger).toBeVisible();
    }
  });

  it('has correct styling (panel-bg background, border-bottom, font-size)', () => {
    render(<MenuBar />);

    const menubar = screen.getByTestId('menubar');
    expect(menubar.style.backgroundColor).toBe('var(--panel-bg)');
    expect(menubar.style.borderBottom).toBe('1px solid var(--border-color)');
    expect(menubar.style.fontSize).toBe('13px');
  });
});
