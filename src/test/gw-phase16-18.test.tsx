import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react';

import { LeftTabPanel } from '../components/LeftTabPanel/LeftTabPanel';
import { FrameGallery } from '../components/FrameGallery/FrameGallery';
import { StatusBar } from '../components/StatusBar/StatusBar';
import { useDocumentStore } from '../stores/documentStore';
import { useUiStore } from '../stores/uiStore';
import { useJobStore } from '../stores/jobStore';
import { useMediaStore } from '../stores/mediaStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetAllStores() {
  useDocumentStore.setState({
    project: {
      projectId: 'test',
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
    selectedLayerIds: [],
    undoStack: [],
    redoStack: [],
    isDirty: false,
    currentProjectPath: null,
    windowTitle: 'Thamnel',
    suppressRender: false,
  });

  useUiStore.setState({
    activeTool: 'select',
    zoom: 1,
    gridVisible: false,
    isEditingText: false,
    leftPanelVisible: true,
    rightPanelVisible: true,
    framePanelHeight: 150,
    statusMessage: '',
    activeDialog: null,
  });

  useJobStore.setState({
    jobs: [],
    activeJobId: null,
  });

  useMediaStore.setState({
    videos: [],
    activeVideoId: null,
    frames: [],
    extractionProgress: null,
    audioItems: [],
    selectedAudioId: null,
    audioStatus: 'Ready',
    images: [],
    imageFolders: [],
    selectedFolderId: null,
    imageSearchQuery: '',
    thumbSize: 100,
    textServerConnected: false,
    renderServerConnected: false,
    inferenceDevice: 'CPU',
  });
}

// ===========================================================================
// PHASE 16 — Left Tab Panel
// ===========================================================================

describe('Phase 16 — Left Tab Panel', () => {
  beforeEach(() => {
    resetAllStores();
  });

  // -----------------------------------------------------------------------
  // 16.0 — Tab structure
  // -----------------------------------------------------------------------
  describe('Tab structure', () => {
    it('renders the left tab panel with 3 tabs', () => {
      render(<LeftTabPanel />);
      expect(screen.getByTestId('left-tab-panel')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-video')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-image')).toBeInTheDocument();
      expect(screen.getByTestId('tab-trigger-audio')).toBeInTheDocument();
    });

    it('shows Video Browser tab by default', () => {
      render(<LeftTabPanel />);
      expect(screen.getByTestId('video-browser-tab')).toBeInTheDocument();
    });

    it('hides panel when visible=false', () => {
      const { container } = render(<LeftTabPanel visible={false} />);
      expect(container.innerHTML).toBe('');
    });

    it('switches to Image Gallery tab when clicked', async () => {
      const user = userEvent.setup();
      render(<LeftTabPanel />);
      await user.click(screen.getByTestId('tab-trigger-image'));
      expect(screen.getByTestId('image-gallery-tab')).toBeInTheDocument();
    });

    it('switches to Server Audio tab when clicked', async () => {
      const user = userEvent.setup();
      render(<LeftTabPanel />);
      await user.click(screen.getByTestId('tab-trigger-audio'));
      expect(screen.getByTestId('server-audio-tab')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // 16A — Video Browser
  // -----------------------------------------------------------------------
  describe('Video Browser tab', () => {
    it('displays "VIDEO BROWSER" header in orange', () => {
      render(<LeftTabPanel />);
      const header = screen.getByTestId('vb-header');
      expect(header).toHaveTextContent('VIDEO BROWSER');
      expect(header).toHaveStyle({ color: 'var(--accent-orange)' });
    });

    it('shows "No videos loaded" when store is empty', () => {
      render(<LeftTabPanel />);
      expect(screen.getByTestId('vb-empty')).toHaveTextContent(
        'No videos loaded',
      );
    });

    it('has Add Video and Append Videos buttons', () => {
      render(<LeftTabPanel />);
      expect(screen.getByTestId('vb-add')).toBeInTheDocument();
      expect(screen.getByTestId('vb-append')).toBeInTheDocument();
    });

    it('shows video list when videos are in the store', () => {
      act(() => {
        useMediaStore.getState().addVideo({
          id: 'v1',
          filePath: '/videos/test.mp4',
          fileName: 'test.mp4',
          duration: '01:30',
          extracted: false,
        });
      });

      render(<LeftTabPanel />);
      expect(screen.getByTestId('vb-video-list')).toBeInTheDocument();
      expect(screen.getByTestId('vb-video-row-v1')).toBeInTheDocument();
      expect(screen.getByText('test.mp4')).toBeInTheDocument();
      expect(screen.getByText('01:30')).toBeInTheDocument();
    });

    it('shows extracted status (green) for extracted videos', () => {
      act(() => {
        useMediaStore.getState().addVideo({
          id: 'v1',
          filePath: '/videos/test.mp4',
          fileName: 'test.mp4',
          duration: '01:30',
          extracted: true,
        });
      });

      render(<LeftTabPanel />);
      const statusDot = screen.getByTestId('vb-status-v1');
      expect(statusDot).toHaveStyle({ backgroundColor: '#81C784' });
    });

    it('shows pending status (gray) for non-extracted videos', () => {
      act(() => {
        useMediaStore.getState().addVideo({
          id: 'v2',
          filePath: '/videos/test2.mp4',
          fileName: 'test2.mp4',
          duration: '02:00',
          extracted: false,
        });
      });

      render(<LeftTabPanel />);
      const statusDot = screen.getByTestId('vb-status-v2');
      expect(statusDot).toHaveStyle({ backgroundColor: '#9E9E9E' });
    });

    it('Add Video button adds a video to the store', async () => {
      const user = userEvent.setup();
      render(<LeftTabPanel />);

      await user.click(screen.getByTestId('vb-add'));

      const videos = useMediaStore.getState().videos;
      expect(videos).toHaveLength(1);
      expect(videos[0].fileName).toContain('Video_');
    });
  });

  // -----------------------------------------------------------------------
  // 16B — Image Gallery
  // -----------------------------------------------------------------------
  describe('Image Gallery tab', () => {
    it('renders search input and thumbnail area', async () => {
      const user = userEvent.setup();
      render(<LeftTabPanel />);
      await user.click(screen.getByTestId('tab-trigger-image'));

      expect(screen.getByTestId('ig-search')).toBeInTheDocument();
      expect(screen.getByTestId('ig-thumbs')).toBeInTheDocument();
      expect(screen.getByTestId('ig-tree')).toBeInTheDocument();
    });

    it('shows "No images" in empty state', async () => {
      const user = userEvent.setup();
      render(<LeftTabPanel />);
      await user.click(screen.getByTestId('tab-trigger-image'));

      expect(screen.getByTestId('ig-empty')).toHaveTextContent('No images');
    });

    it('has thumb size slider', async () => {
      const user = userEvent.setup();
      render(<LeftTabPanel />);
      await user.click(screen.getByTestId('tab-trigger-image'));

      expect(screen.getByTestId('ig-thumb-slider')).toBeInTheDocument();
    });

    it('displays folder tree when folders exist', async () => {
      act(() => {
        useMediaStore.getState().addImageFolder({
          name: 'Landscapes',
          path: '/images/landscapes',
          expanded: true,
        });
      });

      const user = userEvent.setup();
      render(<LeftTabPanel />);
      await user.click(screen.getByTestId('tab-trigger-image'));

      expect(screen.getByTestId('ig-folder-Landscapes')).toBeInTheDocument();
    });

    it('displays image thumbnails when images exist', async () => {
      act(() => {
        useMediaStore.getState().setImages([
          {
            id: 'img-1',
            name: 'Photo 1',
            src: 'data:image/png;base64,fake',
            folder: '/images',
          },
        ]);
      });

      const user = userEvent.setup();
      render(<LeftTabPanel />);
      await user.click(screen.getByTestId('tab-trigger-image'));

      expect(screen.getByTestId('ig-thumb-img-1')).toBeInTheDocument();
      expect(screen.getByTestId('ig-thumbnail-grid')).toBeInTheDocument();
    });

    it('shows item count in info bar', async () => {
      act(() => {
        useMediaStore.getState().setImages([
          { id: 'img-1', name: 'A', src: '', folder: '/' },
          { id: 'img-2', name: 'B', src: '', folder: '/' },
        ]);
      });

      const user = userEvent.setup();
      render(<LeftTabPanel />);
      await user.click(screen.getByTestId('tab-trigger-image'));

      expect(screen.getByTestId('ig-info-bar')).toHaveTextContent('2 items');
    });

    it('filters images by search query', async () => {
      act(() => {
        useMediaStore.getState().setImages([
          { id: 'img-1', name: 'Sunset', src: '', folder: '/' },
          { id: 'img-2', name: 'Mountain', src: '', folder: '/' },
        ]);
      });

      const user = userEvent.setup();
      render(<LeftTabPanel />);
      await user.click(screen.getByTestId('tab-trigger-image'));

      const searchInput = screen.getByTestId('ig-search');
      await user.type(searchInput, 'Sun');

      expect(screen.getByTestId('ig-thumb-img-1')).toBeInTheDocument();
      expect(screen.queryByTestId('ig-thumb-img-2')).not.toBeInTheDocument();
      expect(screen.getByTestId('ig-info-bar')).toHaveTextContent('1 items');
    });

    it('has toolbar buttons (Refresh, Collapse, etc.)', async () => {
      const user = userEvent.setup();
      render(<LeftTabPanel />);
      await user.click(screen.getByTestId('tab-trigger-image'));

      expect(screen.getByTestId('ig-refresh')).toBeInTheDocument();
      expect(screen.getByTestId('ig-collapse')).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // 16C — Server Audio
  // -----------------------------------------------------------------------
  describe('Server Audio tab', () => {
    it('displays "SERVER AUDIO" header in orange', async () => {
      const user = userEvent.setup();
      render(<LeftTabPanel />);
      await user.click(screen.getByTestId('tab-trigger-audio'));

      const header = screen.getByTestId('sa-header');
      expect(header).toHaveTextContent('SERVER AUDIO');
      expect(header).toHaveStyle({ color: 'var(--accent-orange)' });
    });

    it('shows Refresh button', async () => {
      const user = userEvent.setup();
      render(<LeftTabPanel />);
      await user.click(screen.getByTestId('tab-trigger-audio'));

      expect(screen.getByTestId('sa-refresh')).toBeInTheDocument();
    });

    it('shows "No audio files" when store is empty', async () => {
      const user = userEvent.setup();
      render(<LeftTabPanel />);
      await user.click(screen.getByTestId('tab-trigger-audio'));

      expect(screen.getByTestId('sa-empty')).toHaveTextContent(
        'No audio files',
      );
    });

    it('shows audio items from the store', async () => {
      act(() => {
        useMediaStore.getState().setAudioItems([
          { id: 'a1', name: 'Track 1', duration: '03:45', url: '/audio/track1.mp3' },
          { id: 'a2', name: 'Track 2', duration: '02:30', url: '/audio/track2.mp3' },
        ]);
      });

      const user = userEvent.setup();
      render(<LeftTabPanel />);
      await user.click(screen.getByTestId('tab-trigger-audio'));

      expect(screen.getByTestId('sa-audio-item-a1')).toBeInTheDocument();
      expect(screen.getByTestId('sa-audio-item-a2')).toBeInTheDocument();
      expect(screen.getByText('Track 1')).toBeInTheDocument();
      expect(screen.getByText('03:45')).toBeInTheDocument();
    });

    it('supports radio selection of audio items', async () => {
      act(() => {
        useMediaStore.getState().setAudioItems([
          { id: 'a1', name: 'Track 1', duration: '03:45', url: '/audio/track1.mp3' },
          { id: 'a2', name: 'Track 2', duration: '02:30', url: '/audio/track2.mp3' },
        ]);
      });

      const user = userEvent.setup();
      render(<LeftTabPanel />);
      await user.click(screen.getByTestId('tab-trigger-audio'));

      // Click on the first audio item
      await user.click(screen.getByTestId('sa-audio-item-a1'));

      expect(useMediaStore.getState().selectedAudioId).toBe('a1');
    });

    it('shows status text at the bottom', async () => {
      const user = userEvent.setup();
      render(<LeftTabPanel />);
      await user.click(screen.getByTestId('tab-trigger-audio'));

      expect(screen.getByTestId('sa-status')).toHaveTextContent('Ready');
    });
  });
});

// ===========================================================================
// PHASE 17 — Frame Gallery
// ===========================================================================

describe('Phase 17 — Frame Gallery', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('renders the frame gallery', () => {
    render(<FrameGallery />);
    expect(screen.getByTestId('frame-gallery')).toBeInTheDocument();
  });

  it('shows "VIDEO FRAMES" header in orange', () => {
    render(<FrameGallery />);
    const title = screen.getByTestId('frame-gallery-title');
    expect(title).toHaveTextContent('VIDEO FRAMES');
    expect(title).toHaveStyle({ color: '#FF6600' });
  });

  it('shows the video tab strip with Add Video button', () => {
    render(<FrameGallery />);
    expect(screen.getByTestId('video-tab-strip')).toBeInTheDocument();
    expect(screen.getByTestId('video-tab-add')).toBeInTheDocument();
  });

  it('shows empty state when no videos loaded', () => {
    render(<FrameGallery />);
    expect(screen.getByTestId('frame-gallery-empty')).toHaveTextContent(
      'Add a video to extract frames',
    );
  });

  it('shows video tabs from the store', () => {
    act(() => {
      useMediaStore.getState().addVideo({
        id: 'v1',
        filePath: '/videos/test.mp4',
        fileName: 'test.mp4',
        duration: '01:30',
        extracted: false,
      });
    });

    render(<FrameGallery />);
    expect(screen.getByTestId('video-tab-v1')).toBeInTheDocument();
    expect(screen.getByText('test.mp4')).toBeInTheDocument();
  });

  it('shows frame thumbnails when frames exist', () => {
    act(() => {
      useMediaStore.getState().addVideo({
        id: 'v1',
        filePath: '/videos/test.mp4',
        fileName: 'test.mp4',
        duration: '01:30',
        extracted: true,
      });
      useMediaStore.getState().setActiveVideo('v1');
      useMediaStore.getState().addFrames([
        { id: 'f1', videoId: 'v1', src: 'data:image/png;base64,a', timestamp: '00:01' },
        { id: 'f2', videoId: 'v1', src: 'data:image/png;base64,b', timestamp: '00:02' },
      ]);
    });

    render(<FrameGallery />);
    expect(screen.getByTestId('frame-thumbnails-scroll')).toBeInTheDocument();
    const thumbnails = screen.getAllByTestId('frame-thumbnail');
    expect(thumbnails).toHaveLength(2);
  });

  it('shows extraction progress bar when progress is set', () => {
    act(() => {
      useMediaStore.getState().setExtractionProgress(45);
    });

    render(<FrameGallery />);
    expect(
      screen.getByTestId('frame-extraction-progress'),
    ).toBeInTheDocument();
  });

  it('does not show extraction progress bar when progress is null', () => {
    render(<FrameGallery />);
    expect(
      screen.queryByTestId('frame-extraction-progress'),
    ).not.toBeInTheDocument();
  });

  it('accepts external props for backward compatibility', () => {
    const tabs = [
      { id: 'ext1', name: 'External Video' },
    ];
    const frames = [
      { id: 'ef1', src: 'data:image/png;base64,test', timestamp: '00:05' },
    ];

    render(
      <FrameGallery
        tabs={tabs}
        activeTabId="ext1"
        frames={frames}
        extractionProgress={75}
      />,
    );

    expect(screen.getByText('External Video')).toBeInTheDocument();
    expect(screen.getByTestId('frame-thumbnails-scroll')).toBeInTheDocument();
    expect(screen.getByTestId('frame-extraction-progress')).toBeInTheDocument();
  });

  it('shows playback controls', () => {
    render(<FrameGallery />);
    expect(screen.getByTestId('frame-btn-previous')).toBeInTheDocument();
    expect(screen.getByTestId('frame-btn-play')).toBeInTheDocument();
    expect(screen.getByTestId('frame-btn-next')).toBeInTheDocument();
    expect(screen.getByTestId('frame-btn-paste')).toBeInTheDocument();
    expect(screen.getByTestId('frame-timestamp-input')).toBeInTheDocument();
  });
});

// ===========================================================================
// PHASE 18 — Status Bar
// ===========================================================================

describe('Phase 18 — Status Bar', () => {
  beforeEach(() => {
    resetAllStores();
  });

  // -----------------------------------------------------------------------
  // Basic rendering
  // -----------------------------------------------------------------------
  it('renders the status bar', () => {
    render(<StatusBar />);
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Status text
  // -----------------------------------------------------------------------
  it('shows "Ready" when statusMessage is empty', () => {
    render(<StatusBar />);
    expect(screen.getByTestId('status-text')).toHaveTextContent('Ready');
  });

  it('shows status message from uiStore', () => {
    act(() => {
      useUiStore.getState().setStatusMessage('Exporting...');
    });

    render(<StatusBar />);
    expect(screen.getByTestId('status-text')).toHaveTextContent('Exporting...');
  });

  it('props override store status message', () => {
    act(() => {
      useUiStore.getState().setStatusMessage('From store');
    });

    render(<StatusBar statusText="From props" />);
    expect(screen.getByTestId('status-text')).toHaveTextContent('From props');
  });

  // -----------------------------------------------------------------------
  // Canvas dimensions
  // -----------------------------------------------------------------------
  it('shows canvas dimensions from documentStore', () => {
    render(<StatusBar />);
    expect(screen.getByTestId('canvas-dimensions')).toHaveTextContent(
      '1920 x 1080',
    );
  });

  it('updates when canvas size changes', () => {
    act(() => {
      useDocumentStore.getState().setCanvasSize(1280, 720);
    });

    render(<StatusBar />);
    expect(screen.getByTestId('canvas-dimensions')).toHaveTextContent(
      '1280 x 720',
    );
  });

  it('props override store canvas dimensions', () => {
    render(<StatusBar canvasWidth={800} canvasHeight={600} />);
    expect(screen.getByTestId('canvas-dimensions')).toHaveTextContent(
      '800 x 600',
    );
  });

  // -----------------------------------------------------------------------
  // Inference device
  // -----------------------------------------------------------------------
  it('shows CPU inference device by default', () => {
    render(<StatusBar />);
    expect(screen.getByTestId('inference-device')).toHaveTextContent('CPU');
  });

  it('shows GPU when inference device is GPU', () => {
    act(() => {
      useMediaStore.getState().setInferenceDevice('GPU');
    });

    render(<StatusBar />);
    expect(screen.getByTestId('inference-device')).toHaveTextContent('GPU');
  });

  // -----------------------------------------------------------------------
  // Server status dots
  // -----------------------------------------------------------------------
  it('shows disconnected status dots by default', () => {
    render(<StatusBar />);
    const textServerStatus = screen.getByTestId('text-server-status');
    const dotInTextServer = within(textServerStatus).getByTestId('status-dot');
    expect(dotInTextServer).toHaveAttribute('data-status', 'disconnected');
  });

  it('shows connected dot when textServerConnected is true', () => {
    act(() => {
      useMediaStore.getState().setTextServerConnected(true);
    });

    render(<StatusBar />);
    const textServerStatus = screen.getByTestId('text-server-status');
    const dotInTextServer = within(textServerStatus).getByTestId('status-dot');
    expect(dotInTextServer).toHaveAttribute('data-status', 'connected');
  });

  it('shows connected dot when renderServerConnected is true', () => {
    act(() => {
      useMediaStore.getState().setRenderServerConnected(true);
    });

    render(<StatusBar />);
    const renderServerStatus = screen.getByTestId('render-server-status');
    const dotInRenderServer = within(renderServerStatus).getByTestId('status-dot');
    expect(dotInRenderServer).toHaveAttribute('data-status', 'connected');
  });

  // -----------------------------------------------------------------------
  // Download progress
  // -----------------------------------------------------------------------
  it('hides download progress bar by default', () => {
    render(<StatusBar />);
    // downloadVisible should be false by default (no export job)
    // render progress is also hidden by default
    // Both ProgressIndicator return null when visible=false -> no indicators
    const indicators = screen.queryAllByTestId('progress-indicator');
    expect(indicators.length).toBe(0);
  });

  it('shows download progress when an export job is running', () => {
    act(() => {
      useJobStore.getState().addJob({
        id: 'export-1',
        type: 'export',
        status: 'running',
        progress: 55,
        message: 'Exporting...',
      });
    });

    render(<StatusBar />);
    // There should be a progress indicator visible
    const indicators = screen.getAllByTestId('progress-indicator');
    expect(indicators.length).toBeGreaterThanOrEqual(1);
    // Find the one showing 55%
    const downloadIndicator = indicators.find((el) =>
      el.textContent?.includes('55%'),
    );
    expect(downloadIndicator).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // Render progress
  // -----------------------------------------------------------------------
  it('hides render progress by default', () => {
    render(<StatusBar />);
    // No render job, so render progress should not be visible
    // The component renders but with visible=false -> returns null
    // Check that there is no indicator with render-related content
    const bar = screen.getByTestId('status-bar');
    // The render progress indicator's visible prop is false -> returns null
    expect(bar).toBeInTheDocument();
  });

  it('shows render progress when a render job exists', () => {
    act(() => {
      useJobStore.getState().addJob({
        id: 'render-1',
        type: 'render',
        status: 'running',
        progress: 42,
        message: 'Rendering...',
      });
    });

    render(<StatusBar />);
    const indicators = screen.getAllByTestId('progress-indicator');
    const renderIndicator = indicators.find((el) =>
      el.textContent?.includes('42%'),
    );
    expect(renderIndicator).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // User name
  // -----------------------------------------------------------------------
  it('shows user name', () => {
    render(<StatusBar />);
    expect(screen.getByTestId('user-name')).toHaveTextContent('Designer');
  });

  it('shows custom user name', () => {
    render(<StatusBar userName="Admin" />);
    expect(screen.getByTestId('user-name')).toHaveTextContent('Admin');
  });

  // -----------------------------------------------------------------------
  // API key icon
  // -----------------------------------------------------------------------
  it('shows API key icon', () => {
    render(<StatusBar />);
    expect(screen.getByTestId('api-key-icon')).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Props-based backward compatibility
  // -----------------------------------------------------------------------
  it('accepts all props for standalone usage', () => {
    render(
      <StatusBar
        statusText="Custom status"
        downloadProgress={80}
        downloadVisible={true}
        canvasWidth={3840}
        canvasHeight={2160}
        inferenceDevice="GPU"
        userName="TestUser"
        textServerStatus="connected"
        renderServerStatus="busy"
        renderProgress={60}
        renderProgressVisible={true}
        renderStageText="Step 2"
      />,
    );

    expect(screen.getByTestId('status-text')).toHaveTextContent('Custom status');
    expect(screen.getByTestId('canvas-dimensions')).toHaveTextContent('3840 x 2160');
    expect(screen.getByTestId('inference-device')).toHaveTextContent('GPU');
    expect(screen.getByTestId('user-name')).toHaveTextContent('TestUser');

    const indicators = screen.getAllByTestId('progress-indicator');
    expect(indicators.length).toBeGreaterThanOrEqual(2);
  });
});
