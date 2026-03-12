import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FrameGallery } from '../components/FrameGallery/FrameGallery';
import { VideoTabStrip } from '../components/FrameGallery/VideoTabStrip';
import { FrameThumbnail } from '../components/FrameGallery/FrameThumbnail';

// ---------------------------------------------------------------------------
// FrameGallery
// ---------------------------------------------------------------------------

describe('FrameGallery', () => {
  it('renders with header', () => {
    render(<FrameGallery />);
    expect(screen.getByTestId('frame-gallery')).toBeInTheDocument();
  });

  it('"VIDEO FRAMES" title visible', () => {
    render(<FrameGallery />);
    const title = screen.getByTestId('frame-gallery-title');
    expect(title).toBeInTheDocument();
    expect(title.textContent).toBe('VIDEO FRAMES');
  });

  it('empty state message shown', () => {
    render(<FrameGallery />);
    const empty = screen.getByTestId('frame-gallery-empty');
    expect(empty).toBeInTheDocument();
    expect(empty.textContent).toBe('Add a video to extract frames');
  });

  it('timestamp input rendered with placeholder', () => {
    render(<FrameGallery />);
    const input = screen.getByTestId('frame-timestamp-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'mm:ss');
  });

  it('playback controls render (previous, play, next)', () => {
    render(<FrameGallery />);
    expect(screen.getByTestId('frame-btn-previous')).toBeInTheDocument();
    expect(screen.getByTestId('frame-btn-play')).toBeInTheDocument();
    expect(screen.getByTestId('frame-btn-next')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// VideoTabStrip
// ---------------------------------------------------------------------------

describe('VideoTabStrip', () => {
  it('renders add button', () => {
    render(
      <VideoTabStrip
        tabs={[]}
        activeTabId={null}
        onTabSelect={vi.fn()}
        onTabClose={vi.fn()}
        onAddVideo={vi.fn()}
      />,
    );
    expect(screen.getByTestId('video-tab-add')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// FrameThumbnail
// ---------------------------------------------------------------------------

describe('FrameThumbnail', () => {
  it('renders with timestamp', () => {
    render(<FrameThumbnail src="/test.jpg" timestamp="01:23" />);
    const thumbnail = screen.getByTestId('frame-thumbnail');
    expect(thumbnail).toBeInTheDocument();
    const ts = screen.getByTestId('frame-thumbnail-timestamp');
    expect(ts).toBeInTheDocument();
    expect(ts.textContent).toBe('01:23');
  });
});
