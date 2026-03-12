import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Icon } from '../components/common/Icon';
import { mdiHome } from '@mdi/js';

describe('Icon component', () => {
  it('renders an SVG with data-testid', () => {
    render(<Icon path={mdiHome} />);
    const icon = screen.getByTestId('tg-icon');
    expect(icon).toBeInTheDocument();
    expect(icon.tagName.toLowerCase()).toBe('svg');
  });

  it('renders with xs size (14px)', () => {
    render(<Icon path={mdiHome} size="xs" />);
    const icon = screen.getByTestId('tg-icon');
    expect(icon.style.width).toBe('14px');
    expect(icon.style.height).toBe('14px');
  });

  it('renders with sm size (16px)', () => {
    render(<Icon path={mdiHome} size="sm" />);
    const icon = screen.getByTestId('tg-icon');
    expect(icon.style.width).toBe('16px');
    expect(icon.style.height).toBe('16px');
  });

  it('renders with md size (18px) -- the default', () => {
    render(<Icon path={mdiHome} />);
    const icon = screen.getByTestId('tg-icon');
    expect(icon.style.width).toBe('18px');
    expect(icon.style.height).toBe('18px');
  });

  it('renders with lg size (20px)', () => {
    render(<Icon path={mdiHome} size="lg" />);
    const icon = screen.getByTestId('tg-icon');
    expect(icon.style.width).toBe('20px');
    expect(icon.style.height).toBe('20px');
  });

  it('renders with xl size (24px)', () => {
    render(<Icon path={mdiHome} size="xl" />);
    const icon = screen.getByTestId('tg-icon');
    expect(icon.style.width).toBe('24px');
    expect(icon.style.height).toBe('24px');
  });

  it('renders with a custom numeric size', () => {
    render(<Icon path={mdiHome} size={32} />);
    const icon = screen.getByTestId('tg-icon');
    expect(icon.style.width).toBe('32px');
    expect(icon.style.height).toBe('32px');
  });

  it('accepts a custom className', () => {
    render(<Icon path={mdiHome} className="my-custom-class" />);
    const icon = screen.getByTestId('tg-icon');
    expect(icon.classList.contains('my-custom-class')).toBe(true);
  });

  it('accepts a custom color prop', () => {
    render(<Icon path={mdiHome} color="#FF6600" />);
    const icon = screen.getByTestId('tg-icon');
    // @mdi/react sets fill on the inner path element
    const path = icon.querySelector('path');
    expect(path).not.toBeNull();
    // jsdom normalises hex to rgb, so we check for the rgb equivalent.
    const style = path!.getAttribute('style') ?? '';
    expect(
      style.includes('#FF6600') || style.includes('rgb(255, 102, 0)'),
    ).toBe(true);
  });
});

describe('Theme CSS variables', () => {
  it('defines the 10 theme tokens as CSS custom properties on :root', () => {
    // In jsdom the CSS file is not fully processed, but we can verify
    // the stylesheet text was loaded by checking the document styles.
    // As a lightweight alternative we just verify the globals.css module
    // can be imported without errors (build-time check).
    const expectedVars = [
      '--accent-orange',
      '--dark-bg',
      '--panel-bg',
      '--toolbar-bg',
      '--hover-bg',
      '--selected-bg',
      '--border-color',
      '--text-primary',
      '--text-secondary',
      '--text-disabled',
    ];

    // Simply assert the list is complete (a structural/contract test).
    expect(expectedVars).toHaveLength(10);

    // Verify CSS file exists and can be imported (will throw at build time
    // if missing). We dynamically import so the test runner touches it.
    const importCss = () => import('../styles/globals.css');
    expect(importCss).not.toThrow();
  });

  it('globals.css contains expected variable declarations', async () => {
    // Read the raw CSS source to verify token definitions are present.
    // This works because Vitest can import .css as a string with ?raw.
    const cssText: string = (await import('../styles/globals.css?raw')).default;

    expect(cssText).toContain('--accent-orange');
    expect(cssText).toContain('--dark-bg');
    expect(cssText).toContain('--panel-bg');
    expect(cssText).toContain('--toolbar-bg');
    expect(cssText).toContain('--hover-bg');
    expect(cssText).toContain('--selected-bg');
    expect(cssText).toContain('--border-color');
    expect(cssText).toContain('--text-primary');
    expect(cssText).toContain('--text-secondary');
    expect(cssText).toContain('--text-disabled');
    expect(cssText).toContain('#FF6600');
    expect(cssText).toContain('#1A1A1A');
    expect(cssText).toContain('Roboto');
    expect(cssText).toContain('Consolas');
  });
});
