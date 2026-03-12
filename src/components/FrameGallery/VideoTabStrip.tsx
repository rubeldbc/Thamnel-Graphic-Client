import { Icon } from '../common/Icon';
import { mdiVideoPlus, mdiClose } from '@mdi/js';

export interface VideoTab {
  id: string;
  name: string;
}

export interface VideoTabStripProps {
  /** Array of video tabs to display. */
  tabs: VideoTab[];
  /** ID of the currently active tab. */
  activeTabId: string | null;
  /** Called when a tab is selected. */
  onTabSelect: (id: string) => void;
  /** Called when a tab close button is clicked. */
  onTabClose: (id: string) => void;
  /** Called when the Add Video button is clicked. */
  onAddVideo: () => void;
}

/**
 * Scrollable horizontal tab strip for video tabs in the Frame Gallery.
 */
export function VideoTabStrip({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onAddVideo,
}: VideoTabStripProps) {
  return (
    <div
      data-testid="video-tab-strip"
      className="flex items-center overflow-x-auto"
      style={{ minHeight: 28 }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            data-testid={`video-tab-${tab.id}`}
            className="tg-hoverable flex shrink-0 items-center gap-1 px-2 py-1"
            style={{
              backgroundColor: isActive ? '#55FF6600' : undefined,
              borderBottom: isActive ? '2px solid #FF6600' : '2px solid transparent',
              fontSize: '9pt',
            }}
            onClick={() => onTabSelect(tab.id)}
          >
            <span
              className="truncate text-text-primary"
              style={{ maxWidth: 100, fontSize: '9pt' }}
            >
              {tab.name}
            </span>
            <span
              className="ml-1 flex shrink-0 cursor-pointer items-center rounded-sm hover:bg-hover-bg"
              style={{ color: '#FF5252' }}
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              data-testid={`video-tab-close-${tab.id}`}
            >
              <Icon path={mdiClose} size={10} color="#FF5252" />
            </span>
          </button>
        );
      })}

      {/* Add Video button */}
      <button
        data-testid="video-tab-add"
        className="tg-hoverable ml-1 flex shrink-0 items-center justify-center rounded"
        style={{
          width: 28,
          height: 28,
          color: '#FF6600',
        }}
        onClick={onAddVideo}
        title="Add Video"
      >
        <Icon path={mdiVideoPlus} size={18} color="#FF6600" />
      </button>
    </div>
  );
}

export default VideoTabStrip;
