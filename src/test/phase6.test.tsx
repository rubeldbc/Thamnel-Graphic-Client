import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeftTabPanel } from '../components/LeftTabPanel/LeftTabPanel';
import { VideoBrowserTab } from '../components/LeftTabPanel/VideoBrowserTab';
import { ImageGalleryTab } from '../components/LeftTabPanel/ImageGalleryTab';
import { ServerAudioTab } from '../components/LeftTabPanel/ServerAudioTab';

// ---------------------------------------------------------------------------
// LeftTabPanel
// ---------------------------------------------------------------------------

describe('LeftTabPanel', () => {
  it('renders all 3 tab triggers', () => {
    render(<LeftTabPanel />);

    expect(screen.getByTestId('tab-trigger-video')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-image')).toBeInTheDocument();
    expect(screen.getByTestId('tab-trigger-audio')).toBeInTheDocument();
  });

  it('default tab content (Video Browser) is visible', () => {
    render(<LeftTabPanel />);

    // Video tab content should be visible by default
    const videoContent = screen.getByTestId('tab-content-video');
    expect(videoContent).toBeInTheDocument();
    expect(videoContent).not.toHaveAttribute('hidden');

    // The Video Browser header should be visible
    expect(screen.getByTestId('vb-header')).toBeInTheDocument();
  });

  it('tab switching works', async () => {
    const user = userEvent.setup();
    render(<LeftTabPanel />);

    // Click the Image Gallery tab
    await user.click(screen.getByTestId('tab-trigger-image'));

    // Image content should be visible
    const imageContent = screen.getByTestId('tab-content-image');
    expect(imageContent).toBeInTheDocument();
    expect(imageContent).not.toHaveAttribute('hidden');

    // Video content should be hidden
    expect(screen.queryByTestId('tab-content-video')).not.toBeVisible();

    // Click the Server Audio tab
    await user.click(screen.getByTestId('tab-trigger-audio'));

    const audioContent = screen.getByTestId('tab-content-audio');
    expect(audioContent).toBeInTheDocument();
    expect(audioContent).not.toHaveAttribute('hidden');
  });

  it('renders nothing when visible=false', () => {
    render(<LeftTabPanel visible={false} />);
    expect(screen.queryByTestId('left-tab-panel')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// VideoBrowserTab
// ---------------------------------------------------------------------------

describe('VideoBrowserTab', () => {
  it('shows header and empty state', () => {
    render(<VideoBrowserTab />);

    const header = screen.getByTestId('vb-header');
    expect(header).toBeInTheDocument();
    expect(header.textContent).toBe('VIDEO BROWSER');

    expect(screen.getByTestId('vb-empty')).toBeInTheDocument();
    expect(screen.getByTestId('vb-empty').textContent).toBe('No videos loaded');
  });

  it('renders all 4 action buttons', () => {
    render(<VideoBrowserTab />);

    expect(screen.getByTestId('vb-add')).toBeInTheDocument();
    expect(screen.getByTestId('vb-remove')).toBeInTheDocument();
    expect(screen.getByTestId('vb-refresh')).toBeInTheDocument();
    expect(screen.getByTestId('vb-open-folder')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ImageGalleryTab
// ---------------------------------------------------------------------------

describe('ImageGalleryTab', () => {
  it('shows search input', () => {
    render(<ImageGalleryTab />);

    const search = screen.getByTestId('ig-search');
    expect(search).toBeInTheDocument();
    expect(search).toHaveAttribute('placeholder', 'Search...');
  });

  it('shows toolbar buttons', () => {
    render(<ImageGalleryTab />);

    expect(screen.getByTestId('ig-folders')).toBeInTheDocument();
    expect(screen.getByTestId('ig-refresh')).toBeInTheDocument();
    expect(screen.getByTestId('ig-view-mode')).toBeInTheDocument();
    expect(screen.getByTestId('ig-sort')).toBeInTheDocument();
  });

  it('shows empty state text', () => {
    render(<ImageGalleryTab />);

    expect(screen.getByTestId('ig-empty')).toBeInTheDocument();
    expect(screen.getByTestId('ig-empty').textContent).toBe('No images');
  });
});

// ---------------------------------------------------------------------------
// ServerAudioTab
// ---------------------------------------------------------------------------

describe('ServerAudioTab', () => {
  it('shows header', () => {
    render(<ServerAudioTab />);

    const header = screen.getByTestId('sa-header');
    expect(header).toBeInTheDocument();
    expect(header.textContent).toBe('SERVER AUDIO');
  });

  it('shows empty state and refresh button', () => {
    render(<ServerAudioTab />);

    expect(screen.getByTestId('sa-empty')).toBeInTheDocument();
    expect(screen.getByTestId('sa-empty').textContent).toBe('No audio files');
    expect(screen.getByTestId('sa-refresh')).toBeInTheDocument();
  });

  it('shows status text', () => {
    render(<ServerAudioTab />);

    expect(screen.getByTestId('sa-status')).toBeInTheDocument();
  });
});
