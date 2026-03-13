import { useState, useRef, useCallback, useEffect } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { Icon } from '../common/Icon';
import {
  mdiSkipPrevious,
  mdiPlay,
  mdiSkipNext,
  mdiContentPaste,
  mdiChevronLeft,
  mdiChevronRight,
  mdiVideoPlus,
  mdiFolder,
  mdiImage,
  mdiImageMultiple,
  mdiClose,
} from '@mdi/js';
import type { VideoTab } from './VideoTabStrip';
import { FrameThumbnail } from './FrameThumbnail';
import { useMediaStore } from '../../stores/mediaStore';
import { useDocumentStore } from '../../stores/documentStore';
import { useSettingsStore } from '../../settings/settingsStore';
import { createDefaultLayer } from '../../types/index';

// ---------------------------------------------------------------------------
// Helpers — import video via Tauri dialog + extract frames via FFmpeg
// ---------------------------------------------------------------------------

async function pickVideoFile(): Promise<string | null> {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: 'Video Files',
          extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'webm', 'flv'],
        },
      ],
    });
    return typeof selected === 'string' ? selected : null;
  } catch {
    return null;
  }
}

interface ExtractedFrame {
  timestamp: string;
  base64_png: string;
}

async function extractFrames(
  videoPath: string,
  ffmpegPath: string,
  frameCount: number,
): Promise<ExtractedFrame[]> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<ExtractedFrame[]>('extract_video_frames', {
    videoPath,
    ffmpegPath,
    frameCount,
  });
}

/** Get file name from a full path */
function getFileName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || filePath;
}

export interface FrameGalleryProps {
  /** Video tabs to display (overrides store data when provided). */
  tabs?: VideoTab[];
  /** Currently active tab id (overrides store data when provided). */
  activeTabId?: string | null;
  /** Frame thumbnails for the active video (overrides store data when provided). */
  frames?: Array<{ id: string; src: string; timestamp: string }>;
  /** Whether extraction is in progress (overrides store data when provided). */
  extractionProgress?: number | null;
}

/**
 * Frame Gallery panel for video frame browsing and extraction.
 * Matches WPF layout: single header DockPanel with title left, controls right,
 * progress bar below, frame thumbnails filling remaining space.
 */
export function FrameGallery({
  tabs: externalTabs,
  activeTabId: externalActiveTabId,
  frames: externalFrames,
  extractionProgress: externalExtractionProgress,
}: FrameGalleryProps) {
  // Store data
  const storeVideos = useMediaStore((s) => s.videos);
  const storeActiveVideoId = useMediaStore((s) => s.activeVideoId);
  const storeFrames = useMediaStore((s) => s.frames);
  const storeExtractionProgress = useMediaStore((s) => s.extractionProgress);
  const setActiveVideo = useMediaStore((s) => s.setActiveVideo);
  const removeVideo = useMediaStore((s) => s.removeVideo);
  const addVideo = useMediaStore((s) => s.addVideo);
  const addFrames = useMediaStore((s) => s.addFrames);
  const setExtractionProgress = useMediaStore((s) => s.setExtractionProgress);
  const setVideoExtracted = useMediaStore((s) => s.setVideoExtracted);

  const addLayer = useDocumentStore((s) => s.addLayer);
  const selectLayer = useDocumentStore((s) => s.selectLayer);
  const selectedLayerIds = useDocumentStore((s) => s.selectedLayerIds);
  const updateLayer = useDocumentStore((s) => s.updateLayer);
  const project = useDocumentStore((s) => s.project);

  // Resolve data: external props override store data
  const tabs: VideoTab[] =
    externalTabs ??
    storeVideos.map((v) => ({ id: v.id, name: v.fileName }));

  const activeTabId = externalActiveTabId ?? storeActiveVideoId;

  const resolvedFrames =
    externalFrames ??
    storeFrames
      .filter((f) => f.videoId === activeTabId)
      .map((f) => ({ id: f.id, src: f.src, timestamp: f.timestamp }));

  const extractionProgress =
    externalExtractionProgress !== undefined
      ? externalExtractionProgress
      : storeExtractionProgress;

  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [isHoveringScroll, setIsHoveringScroll] = useState(false);
  const [thumbHeight, setThumbHeight] = useState(68);
  const [animatingFrameIds, setAnimatingFrameIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Dynamically size thumbnails based on available gallery height (WPF: panelHeight - 50, clamp 30-300)
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const available = entry.contentRect.height - 28; // subtract header row
        setThumbHeight(Math.max(30, Math.min(300, available - 10)));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleTabSelect = (id: string) => setActiveVideo(id);

  const handleTabClose = (id: string) => {
    removeVideo(id);
  };

  // Settings for frame extraction
  const ffmpegPath = useSettingsStore((s) => s.settings.video.ffmpegPath) || 'ffmpeg';
  const frameExtractionCount = useSettingsStore((s) => s.settings.video.frameExtractionCount) || 20;

  const handleAddVideo = useCallback(async () => {
    // Open file dialog to pick a video
    const filePath = await pickVideoFile();
    if (!filePath) return;

    const videoId = `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fileName = getFileName(filePath);

    // Add the video tab
    addVideo({
      id: videoId,
      filePath,
      fileName,
      duration: '00:00',
      extracted: false,
    });
    setActiveVideo(videoId);

    // Start frame extraction with simulated progress bar
    setExtractionProgress(0);

    // Simulate gradual progress while FFmpeg runs (estimated ~200ms per frame)
    const estimatedMs = frameExtractionCount * 200;
    const intervalMs = 150;
    const incrementPerTick = (90 / (estimatedMs / intervalMs));
    let currentProgress = 0;
    const progressTimer = setInterval(() => {
      currentProgress = Math.min(currentProgress + incrementPerTick, 90);
      setExtractionProgress(Math.round(currentProgress));
    }, intervalMs);

    try {
      const extracted = await extractFrames(filePath, ffmpegPath, frameExtractionCount);
      clearInterval(progressTimer);
      setExtractionProgress(100);

      // Convert extracted frames to FrameEntry objects
      const frameEntries = extracted.map((f, i) => ({
        id: `${videoId}-frame-${i}`,
        videoId,
        src: f.base64_png,
        timestamp: f.timestamp,
      }));

      // Add frames one-by-one with fade-in animation
      const addFrame = useMediaStore.getState().addFrame;
      for (let i = 0; i < frameEntries.length; i++) {
        const entry = frameEntries[i];
        addFrame(entry);
        setAnimatingFrameIds((prev) => new Set(prev).add(entry.id));
        // Scroll to reveal the newly added frame
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
        // Small delay between frames for visual effect
        if (i < frameEntries.length - 1) {
          await new Promise((r) => setTimeout(r, 120));
        }
      }
      // Clear animation flags after all animations complete
      setTimeout(() => setAnimatingFrameIds(new Set()), 400);

      setVideoExtracted(videoId, true);

      // Brief delay to show 100% before hiding
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      clearInterval(progressTimer);
      // Show error in console - extraction failed
      console.error('Frame extraction failed:', err);
    } finally {
      setExtractionProgress(null);
    }
  }, [ffmpegPath, frameExtractionCount, addVideo, setActiveVideo, setExtractionProgress, addFrames, setVideoExtracted]);

  const handleFrameClick = useCallback(
    (frameId: string, frameSrc: string) => {
      setSelectedFrameId(frameId);

      // If there is a selected image/shape layer, apply the frame as image fill
      if (selectedLayerIds.length === 1) {
        const selectedLayer = project.layers.find(
          (l) => l.id === selectedLayerIds[0],
        );
        if (selectedLayer && (selectedLayer.type === 'image' || selectedLayer.type === 'shape')) {
          updateLayer(selectedLayer.id, { imageData: frameSrc });
          return;
        }
      }

      // Otherwise, create a new image layer at full canvas resolution
      const canvasW = project.canvasWidth;
      const canvasH = project.canvasHeight;
      const layer = createDefaultLayer({
        type: 'image',
        name: `Frame ${frameId}`,
        imageData: frameSrc,
        x: 0,
        y: 0,
        width: canvasW,
        height: canvasH,
      });
      addLayer(layer);
      selectLayer(layer.id);
    },
    [selectedLayerIds, project.layers, updateLayer, addLayer, selectLayer],
  );

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  };
  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
  };

  const noVideos = tabs.length === 0;
  const hasVideos = tabs.length > 0;
  const hasFrames = resolvedFrames.length > 0;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div
          ref={galleryRef}
          data-testid="frame-gallery"
          className="flex h-full flex-col overflow-hidden"
          style={{
            backgroundColor: 'var(--toolbar-bg)',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          {/* ---- Single header row (DockPanel): title left, controls right ---- */}
          <div
            className="flex shrink-0 items-center px-2 select-none"
            style={{ height: 28, gap: 4 }}
          >
            {/* Left: title */}
            <span
              data-testid="frame-gallery-title"
              className="shrink-0 cursor-pointer font-bold"
              style={{ fontSize: 11, color: '#FF6600' }}
            >
              VIDEO FRAMES
            </span>

            {/* Spacer pushes everything else right */}
            <span className="flex-1" />

            {/* Video tabs inline */}
            <div
              data-testid="video-tab-strip"
              className="flex shrink items-center overflow-x-auto"
              style={{ gap: 2, marginRight: 8 }}
            >
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                  <div
                    key={tab.id}
                    data-testid={`video-tab-${tab.id}`}
                    className="flex shrink-0 cursor-pointer items-center rounded"
                    style={{
                      padding: '2px 6px',
                      backgroundColor: isActive ? '#55FF6600' : '#333',
                      border: isActive ? '1px solid #FF6600' : '1px solid transparent',
                    }}
                    onClick={() => handleTabSelect(tab.id)}
                  >
                    <span
                      className="truncate"
                      style={{
                        maxWidth: 100,
                        fontSize: 9,
                        color: 'var(--text-secondary)',
                        marginRight: 4,
                      }}
                      title={tab.name}
                    >
                      {tab.name}
                    </span>
                    <span
                      className="flex shrink-0 cursor-pointer items-center"
                      data-testid={`video-tab-close-${tab.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTabClose(tab.id);
                      }}
                    >
                      <Icon path={mdiClose} size={12} color="#FF5252" />
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Add Video button */}
            <button
              data-testid="video-tab-add"
              className="tg-hoverable flex shrink-0 items-center justify-center rounded"
              style={{ width: 28, height: 28 }}
              onClick={handleAddVideo}
              title="Add another video"
            >
              <Icon path={mdiVideoPlus} size={16} color="#FF6600" />
            </button>

            {/* Timestamp input */}
            <input
              data-testid="frame-timestamp-input"
              type="text"
              placeholder="mm:ss"
              className="shrink-0 rounded border px-1"
              style={{
                width: 80,
                height: 22,
                fontSize: 11,
                backgroundColor: 'var(--dark-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                marginLeft: 4,
              }}
              disabled={!hasVideos}
            />

            {/* Previous (-1s) */}
            <button
              data-testid="frame-btn-previous"
              className="tg-hoverable flex shrink-0 items-center justify-center rounded"
              style={{ width: 20, height: 20 }}
              title="Previous (−1s)"
              disabled={!hasVideos}
            >
              <Icon path={mdiSkipPrevious} size={16} color="var(--text-secondary)" />
            </button>

            {/* Extract frame at timestamp */}
            <button
              data-testid="frame-btn-play"
              className="tg-hoverable flex shrink-0 items-center justify-center rounded"
              style={{ width: 20, height: 20 }}
              title="Extract frame at timestamp"
              disabled={!hasVideos}
            >
              <Icon path={mdiPlay} size={16} color="#FF6600" />
            </button>

            {/* Next (+1s) */}
            <button
              data-testid="frame-btn-next"
              className="tg-hoverable flex shrink-0 items-center justify-center rounded"
              style={{ width: 20, height: 20 }}
              title="Next (+1s)"
              disabled={!hasVideos}
            >
              <Icon path={mdiSkipNext} size={16} color="var(--text-secondary)" />
            </button>

            {/* Paste from clipboard */}
            <button
              data-testid="frame-btn-paste"
              className="tg-hoverable flex shrink-0 items-center justify-center rounded"
              style={{ width: 28, height: 28, marginLeft: 4 }}
              title="Paste frame from clipboard"
            >
              <Icon path={mdiContentPaste} size={16} color="var(--text-secondary)" />
            </button>
          </div>

          {/* ---- Extraction progress bar ---- */}
          {extractionProgress !== null && (
            <div
              data-testid="frame-extraction-progress"
              className="shrink-0"
              style={{ padding: '0 8px 4px' }}
            >
              <div
                className="w-full overflow-hidden rounded-full"
                style={{ height: 6, backgroundColor: '#333' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(Math.max(extractionProgress, 0), 100)}%`,
                    backgroundColor: '#FF6600',
                  }}
                />
              </div>
            </div>
          )}

          {/* ---- Frame thumbnails area ---- */}
          {noVideos ? (
            <div
              data-testid="frame-gallery-empty"
              className="flex flex-1 items-center justify-center"
              style={{ color: 'var(--text-disabled)', fontSize: 11 }}
            >
              Add a video to extract frames
            </div>
          ) : (
            <div
              className="relative flex-1"
              onMouseEnter={() => setIsHoveringScroll(true)}
              onMouseLeave={() => setIsHoveringScroll(false)}
            >
              {/* Left scroll nav */}
              {isHoveringScroll && hasFrames && (
                <button
                  data-testid="frame-scroll-left"
                  className="absolute top-0 left-0 z-10 flex h-full items-center justify-center"
                  style={{
                    width: 32,
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    opacity: 0.7,
                  }}
                  onClick={scrollLeft}
                >
                  <Icon path={mdiChevronLeft} size={24} color="white" />
                </button>
              )}

              {/* Scrollable thumbnails */}
              <div
                ref={scrollRef}
                data-testid="frame-thumbnails-scroll"
                className="flex h-full items-center overflow-x-auto"
                style={{ scrollbarWidth: 'none' }}
                onWheel={(e) => {
                  if (scrollRef.current) {
                    scrollRef.current.scrollLeft += e.deltaY;
                    e.preventDefault();
                  }
                }}
              >
                {hasFrames ? (
                  resolvedFrames.map((frame) => (
                    <FrameThumbnail
                      key={frame.id}
                      src={frame.src}
                      timestamp={frame.timestamp}
                      isSelected={frame.id === selectedFrameId}
                      thumbHeight={thumbHeight}
                      animate={animatingFrameIds.has(frame.id)}
                      onClick={() => handleFrameClick(frame.id, frame.src)}
                      onDoubleClick={() => handleFrameClick(frame.id, frame.src)}
                    />
                  ))
                ) : (
                  <div
                    className="flex flex-1 items-center justify-center"
                    style={{ color: 'var(--text-disabled)', fontSize: 11 }}
                  >
                    {extractionProgress !== null
                      ? 'Extracting frames...'
                      : 'No frames extracted yet'}
                  </div>
                )}
              </div>

              {/* Right scroll nav */}
              {isHoveringScroll && hasFrames && (
                <button
                  data-testid="frame-scroll-right"
                  className="absolute top-0 right-0 z-10 flex h-full items-center justify-center"
                  style={{
                    width: 32,
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    opacity: 0.7,
                  }}
                  onClick={scrollRight}
                >
                  <Icon path={mdiChevronRight} size={24} color="white" />
                </button>
              )}
            </div>
          )}
        </div>
      </ContextMenu.Trigger>

      {/* Context menu */}
      <ContextMenu.Portal>
        <ContextMenu.Content
          data-testid="frame-gallery-context-menu"
          className="min-w-[160px] rounded border border-border bg-panel-bg p-1 shadow-lg"
        >
          <ContextMenu.Item
            data-testid="ctx-add-video"
            className="tg-hoverable flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-text-primary outline-none"
            onSelect={handleAddVideo}
          >
            <Icon path={mdiVideoPlus} size={14} />
            Add Video
          </ContextMenu.Item>
          <ContextMenu.Item
            data-testid="ctx-add-image-folder"
            className="tg-hoverable flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-text-primary outline-none"
          >
            <Icon path={mdiFolder} size={14} />
            Add Image Folder
          </ContextMenu.Item>
          <ContextMenu.Item
            data-testid="ctx-add-image"
            className="tg-hoverable flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-text-primary outline-none"
          >
            <Icon path={mdiImage} size={14} />
            Add Image
          </ContextMenu.Item>
          <ContextMenu.Item
            data-testid="ctx-add-from-gallery"
            className="tg-hoverable flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-text-primary outline-none"
          >
            <Icon path={mdiImageMultiple} size={14} />
            Add From Gallery
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export default FrameGallery;
