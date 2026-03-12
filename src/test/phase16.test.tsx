import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ImageStudioWindow } from '../components/ImageStudio/ImageStudioWindow';
import { AIOperationsPanel } from '../components/ImageStudio/AIOperationsPanel';
import { PixelEffectsPanel } from '../components/ImageStudio/PixelEffectsPanel';
import { ImageBlendPanel } from '../components/ImageStudio/ImageBlendPanel';

// ===========================================================================
// ImageStudioWindow
// ===========================================================================

describe('ImageStudioWindow', () => {
  it('renders when open', () => {
    const onOpenChange = vi.fn();
    render(
      <ImageStudioWindow open={true} onOpenChange={onOpenChange} imageUrl="test.png" />,
    );
    expect(screen.getByTestId('image-studio-window')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const onOpenChange = vi.fn();
    render(
      <ImageStudioWindow open={false} onOpenChange={onOpenChange} />,
    );
    expect(screen.queryByTestId('image-studio-window')).not.toBeInTheDocument();
  });

  it('displays title "Image Studio"', () => {
    const onOpenChange = vi.fn();
    render(
      <ImageStudioWindow open={true} onOpenChange={onOpenChange} />,
    );
    expect(screen.getByText('Image Studio')).toBeInTheDocument();
  });

  it('displays view mode radio buttons (Combined, Foreground, Background)', () => {
    const onOpenChange = vi.fn();
    render(
      <ImageStudioWindow open={true} onOpenChange={onOpenChange} />,
    );
    expect(screen.getByTestId('view-mode-combined')).toBeInTheDocument();
    expect(screen.getByTestId('view-mode-foreground')).toBeInTheDocument();
    expect(screen.getByTestId('view-mode-background')).toBeInTheDocument();
    expect(screen.getByText('Combined')).toBeInTheDocument();
    expect(screen.getByText('Foreground')).toBeInTheDocument();
    expect(screen.getByText('Background')).toBeInTheDocument();
  });

  it('shows action buttons (Apply Combined, Cancel)', () => {
    const onOpenChange = vi.fn();
    render(
      <ImageStudioWindow open={true} onOpenChange={onOpenChange} />,
    );
    expect(screen.getByTestId('apply-combined-button')).toBeInTheDocument();
    expect(screen.getByText('Apply Combined')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders the preview area', () => {
    const onOpenChange = vi.fn();
    render(
      <ImageStudioWindow open={true} onOpenChange={onOpenChange} />,
    );
    expect(screen.getByTestId('image-studio-preview')).toBeInTheDocument();
  });

  it('processing overlay is hidden by default', () => {
    const onOpenChange = vi.fn();
    render(
      <ImageStudioWindow open={true} onOpenChange={onOpenChange} />,
    );
    expect(screen.queryByTestId('processing-overlay')).not.toBeInTheDocument();
  });

  it('shows Place All Layers and Apply FG/BG buttons', () => {
    const onOpenChange = vi.fn();
    render(
      <ImageStudioWindow open={true} onOpenChange={onOpenChange} />,
    );
    expect(screen.getByTestId('place-all-layers-button')).toBeInTheDocument();
    expect(screen.getByText('Place All Layers')).toBeInTheDocument();
    expect(screen.getByTestId('apply-fg-button')).toBeInTheDocument();
    expect(screen.getByTestId('apply-bg-button')).toBeInTheDocument();
  });

  it('shows Keep Original checkbox', () => {
    const onOpenChange = vi.fn();
    render(
      <ImageStudioWindow open={true} onOpenChange={onOpenChange} />,
    );
    expect(screen.getByTestId('keep-original-checkbox')).toBeInTheDocument();
    expect(screen.getByText('Keep Original')).toBeInTheDocument();
  });
});

// ===========================================================================
// AIOperationsPanel
// ===========================================================================

describe('AIOperationsPanel', () => {
  it('renders with correct data-testid', () => {
    render(<AIOperationsPanel />);
    expect(screen.getByTestId('ai-operations-panel')).toBeInTheDocument();
  });

  it('renders all 7 operation sections', () => {
    render(<AIOperationsPanel />);
    expect(screen.getByTestId('ai-section-scratch')).toBeInTheDocument();
    expect(screen.getByTestId('ai-section-face')).toBeInTheDocument();
    expect(screen.getByTestId('ai-section-denoise')).toBeInTheDocument();
    expect(screen.getByTestId('ai-section-inpaint')).toBeInTheDocument();
    expect(screen.getByTestId('ai-section-colorize')).toBeInTheDocument();
    expect(screen.getByTestId('ai-section-cartoonize')).toBeInTheDocument();
    expect(screen.getByTestId('ai-section-separation')).toBeInTheDocument();
  });

  it('displays section labels', () => {
    render(<AIOperationsPanel />);
    expect(screen.getByText('Scratch Remover')).toBeInTheDocument();
    expect(screen.getByText('Face Restoration')).toBeInTheDocument();
    expect(screen.getByText('Denoise')).toBeInTheDocument();
    expect(screen.getByText('Inpaint / Outpaint')).toBeInTheDocument();
    expect(screen.getByText('Colorize')).toBeInTheDocument();
    expect(screen.getByText('Cartoonize')).toBeInTheDocument();
    expect(screen.getByText('Background Separation')).toBeInTheDocument();
  });
});

// ===========================================================================
// PixelEffectsPanel
// ===========================================================================

describe('PixelEffectsPanel', () => {
  it('renders with correct data-testid', () => {
    render(<PixelEffectsPanel />);
    expect(screen.getByTestId('pixel-effects-panel')).toBeInTheDocument();
  });

  it('renders color adjustment sliders', () => {
    render(<PixelEffectsPanel />);
    const panel = screen.getByTestId('pixel-effects-panel');
    expect(within(panel).getByText('Brightness')).toBeInTheDocument();
    expect(within(panel).getByText('Contrast')).toBeInTheDocument();
    expect(within(panel).getByText('Saturation')).toBeInTheDocument();
    expect(within(panel).getByText('Hue')).toBeInTheDocument();
    expect(within(panel).getByText('Temperature')).toBeInTheDocument();
  });

  it('renders image effect sliders', () => {
    render(<PixelEffectsPanel />);
    const panel = screen.getByTestId('pixel-effects-panel');
    expect(within(panel).getByText('Sharpen')).toBeInTheDocument();
    expect(within(panel).getByText('Vignette')).toBeInTheDocument();
    expect(within(panel).getByText('Grain')).toBeInTheDocument();
    expect(within(panel).getByText('Blur')).toBeInTheDocument();
  });

  it('has reset buttons for each section', () => {
    render(<PixelEffectsPanel />);
    expect(screen.getByTestId('reset-color-adjustments')).toBeInTheDocument();
    expect(screen.getByTestId('reset-image-effects')).toBeInTheDocument();
  });
});

// ===========================================================================
// ImageBlendPanel
// ===========================================================================

describe('ImageBlendPanel', () => {
  it('renders with correct data-testid', () => {
    render(<ImageBlendPanel />);
    expect(screen.getByTestId('image-blend-panel')).toBeInTheDocument();
  });

  it('renders blend controls', () => {
    render(<ImageBlendPanel />);
    const panel = screen.getByTestId('image-blend-panel');
    expect(within(panel).getByText('Blend Mode')).toBeInTheDocument();
    expect(within(panel).getByText('Opacity')).toBeInTheDocument();
    expect(within(panel).getByText('Source')).toBeInTheDocument();
  });

  it('renders Apply Blend button', () => {
    render(<ImageBlendPanel />);
    expect(screen.getByTestId('apply-blend-button')).toBeInTheDocument();
    expect(screen.getByText('Apply Blend')).toBeInTheDocument();
  });

  it('renders blend mode selector', () => {
    render(<ImageBlendPanel />);
    expect(screen.getByTestId('blend-mode-select')).toBeInTheDocument();
  });

  it('renders source selector placeholder', () => {
    render(<ImageBlendPanel />);
    expect(screen.getByTestId('blend-source-selector')).toBeInTheDocument();
  });
});
