import * as Tabs from '@radix-ui/react-tabs';
import { VideoBrowserTab } from './VideoBrowserTab';
import { ImageGalleryTab } from './ImageGalleryTab';
import { ServerAudioTab } from './ServerAudioTab';

export interface LeftTabPanelProps {
  /** When false the panel is completely hidden. */
  visible?: boolean;
}

const TAB_ITEMS = [
  { value: 'video', label: 'Video Browser' },
  { value: 'image', label: 'Image Gallery' },
  { value: 'audio', label: 'Server Audio' },
] as const;

/**
 * Collapsible left tab panel with three browsing tabs:
 * Video Browser, Image Gallery, and Server Audio.
 *
 * Uses Radix UI Tabs for accessible tab switching.
 */
export function LeftTabPanel({ visible = true }: LeftTabPanelProps) {
  if (!visible) return null;

  return (
    <Tabs.Root
      defaultValue="video"
      data-testid="left-tab-panel"
      className="flex h-full flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--panel-bg)',
        borderRight: '1px solid var(--border-color)',
      }}
    >
      {/* Tab triggers */}
      <Tabs.List
        className="flex shrink-0 items-center border-b select-none"
        style={{
          height: 28,
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--toolbar-bg)',
        }}
        data-testid="left-tab-list"
      >
        {TAB_ITEMS.map((tab) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            data-testid={`tab-trigger-${tab.value}`}
            className="tg-hoverable px-2.5 text-center text-[11px] whitespace-nowrap leading-[28px] data-[state=active]:text-accent-orange data-[state=active]:shadow-[inset_0_-2px_0_var(--accent-orange)]"
            style={{
              color: 'var(--text-secondary)',
              fontSize: 11,
              height: 28,
            }}
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {/* Tab content */}
      <Tabs.Content value="video" className="min-h-0 flex-1" data-testid="tab-content-video">
        <VideoBrowserTab />
      </Tabs.Content>

      <Tabs.Content value="image" className="min-h-0 flex-1" data-testid="tab-content-image">
        <ImageGalleryTab />
      </Tabs.Content>

      <Tabs.Content value="audio" className="min-h-0 flex-1" data-testid="tab-content-audio">
        <ServerAudioTab />
      </Tabs.Content>
    </Tabs.Root>
  );
}

export default LeftTabPanel;
