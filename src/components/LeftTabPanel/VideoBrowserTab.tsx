import {
  mdiPlus,
  mdiDelete,
  mdiRefresh,
  mdiFolderOpen,
  mdiPlusBox,
} from '@mdi/js';
import { Icon } from '../common/Icon';
import { useMediaStore } from '../../stores/mediaStore';
import { useDocumentStore } from '../../stores/documentStore';

/** Action button descriptor. */
interface ActionBtn {
  icon: string;
  title: string;
  testId: string;
  onClick?: () => void;
}

/**
 * Video Browser tab content for the Left Tab Panel.
 *
 * Shows a header, action toolbar, data grid with columns
 * (SL, Video File, Duration) and video entries from the store.
 * Videos show extracted status (green=extracted, gray=pending).
 * Double-click a video to trigger frame extraction.
 */
export function VideoBrowserTab() {
  const videos = useMediaStore((s) => s.videos);
  const activeVideoId = useMediaStore((s) => s.activeVideoId);
  const addVideo = useMediaStore((s) => s.addVideo);
  const removeVideo = useMediaStore((s) => s.removeVideo);
  const setActiveVideo = useMediaStore((s) => s.setActiveVideo);
  const setVideoExtracted = useMediaStore((s) => s.setVideoExtracted);
  const setExtractionProgress = useMediaStore((s) => s.setExtractionProgress);
  const addFrames = useMediaStore((s) => s.addFrames);
  const videoPaths = useDocumentStore((s) => s.project.videoPaths);

  const handleAddVideo = () => {
    const id = `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const fileName = `Video_${videos.length + 1}.mp4`;
    addVideo({
      id,
      filePath: `/videos/${fileName}`,
      fileName,
      duration: '00:00',
      extracted: false,
    });
  };

  const handleAppendVideos = () => {
    // Append videos from project's videoPaths that aren't already loaded
    const existingPaths = new Set(videos.map((v) => v.filePath));
    videoPaths.forEach((path) => {
      if (!existingPaths.has(path)) {
        const id = `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const fileName = path.split('/').pop() || path;
        addVideo({
          id,
          filePath: path,
          fileName,
          duration: '00:00',
          extracted: false,
        });
      }
    });
  };

  const handleRemove = () => {
    if (activeVideoId) {
      removeVideo(activeVideoId);
    }
  };

  const handleDoubleClick = (videoId: string) => {
    // Simulate frame extraction
    setExtractionProgress(0);
    setVideoExtracted(videoId, true);
    const video = videos.find((v) => v.id === videoId);
    if (video) {
      // Generate sample frames
      const frames = Array.from({ length: 10 }, (_, i) => ({
        id: `frame-${videoId}-${i}`,
        videoId,
        src: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60"><rect fill="%23333" width="80" height="60"/><text x="40" y="35" text-anchor="middle" fill="white" font-size="10">${i}</text></svg>`,
        timestamp: `00:${String(i).padStart(2, '0')}`,
      }));
      addFrames(frames);
    }
    setExtractionProgress(100);
    // Clear progress after a moment
    setTimeout(() => setExtractionProgress(null), 1000);
  };

  const ACTIONS: ActionBtn[] = [
    { icon: mdiPlus, title: 'Add Video', testId: 'vb-add', onClick: handleAddVideo },
    { icon: mdiPlusBox, title: 'Append Videos', testId: 'vb-append', onClick: handleAppendVideos },
    { icon: mdiDelete, title: 'Remove', testId: 'vb-remove', onClick: handleRemove },
    { icon: mdiRefresh, title: 'Refresh', testId: 'vb-refresh' },
    { icon: mdiFolderOpen, title: 'Open Folder', testId: 'vb-open-folder' },
  ];

  return (
    <div
      data-testid="video-browser-tab"
      className="flex h-full flex-col overflow-hidden"
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center px-2 select-none"
        style={{ height: 28 }}
      >
        <span
          className="text-[11px] font-bold"
          style={{ color: 'var(--accent-orange)' }}
          data-testid="vb-header"
        >
          VIDEO BROWSER
        </span>
      </div>

      {/* Action buttons row */}
      <div
        className="flex shrink-0 items-center gap-1 border-b px-2 pb-1"
        style={{ borderColor: 'var(--border-color)' }}
      >
        {ACTIONS.map((a) => (
          <button
            key={a.testId}
            data-testid={a.testId}
            title={a.title}
            className="tg-hoverable flex items-center justify-center rounded"
            style={{ width: 26, height: 26 }}
            onClick={a.onClick}
          >
            <Icon path={a.icon} size="sm" />
          </button>
        ))}
      </div>

      {/* Data grid */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Column header */}
        <div
          className="flex shrink-0 items-center border-b text-[10px] font-semibold select-none"
          style={{
            height: 24,
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
          }}
        >
          <div className="shrink-0 px-1 text-center" style={{ width: 40 }}>
            SL
          </div>
          <div className="min-w-0 flex-1 px-1">Video File</div>
          <div className="shrink-0 px-1 text-right" style={{ width: 80 }}>
            Duration
          </div>
        </div>

        {/* Rows area */}
        {videos.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <span
              className="text-[11px]"
              style={{ color: 'var(--text-disabled)' }}
              data-testid="vb-empty"
            >
              No videos loaded
            </span>
          </div>
        ) : (
          <div
            className="flex-1 overflow-auto"
            data-testid="vb-video-list"
          >
            {videos.map((video, index) => (
              <div
                key={video.id}
                data-testid={`vb-video-row-${video.id}`}
                className="flex cursor-pointer items-center border-b text-[11px] select-none"
                style={{
                  height: 28,
                  borderColor: 'var(--border-color)',
                  backgroundColor:
                    video.id === activeVideoId
                      ? 'var(--hover-bg)'
                      : undefined,
                }}
                onClick={() => setActiveVideo(video.id)}
                onDoubleClick={() => handleDoubleClick(video.id)}
              >
                <div
                  className="shrink-0 px-1 text-center"
                  style={{ width: 40, color: 'var(--text-secondary)' }}
                >
                  {index + 1}
                </div>
                <div
                  className="flex min-w-0 flex-1 items-center gap-1 px-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span
                    data-testid={`vb-status-${video.id}`}
                    className="inline-block shrink-0 rounded-full"
                    style={{
                      width: 8,
                      height: 8,
                      backgroundColor: video.extracted
                        ? '#81C784'
                        : '#9E9E9E',
                    }}
                    title={video.extracted ? 'Extracted' : 'Pending'}
                  />
                  <span className="truncate">{video.fileName}</span>
                </div>
                <div
                  className="shrink-0 px-1 text-right"
                  style={{ width: 80, color: 'var(--text-secondary)' }}
                >
                  {video.duration}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Duration progress bar placeholder */}
        <div
          className="shrink-0"
          style={{
            height: 2,
            backgroundColor: 'var(--accent-orange)',
            opacity: 0.3,
          }}
          data-testid="vb-progress"
        />
      </div>
    </div>
  );
}

export default VideoBrowserTab;
