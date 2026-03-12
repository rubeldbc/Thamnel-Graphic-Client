import * as Tabs from '@radix-ui/react-tabs';
import { Icon } from '../common/Icon';
import { PropertiesTab } from './Properties/PropertiesTab';
import { LayersTab } from './Layers/LayersTab';
import { TemplatesTab } from './Templates/TemplatesTab';
import type { PropertiesTabProps } from './Properties/PropertiesTab';
import type { LayersTabProps } from './Layers/LayersTab';
import type { TemplatesTabProps } from './Templates/TemplatesTab';
import {
  mdiCog,
  mdiLayersOutline,
  mdiBookmarkMultipleOutline,
} from '@mdi/js';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RightPanelProps {
  /** Props forwarded to PropertiesTab. */
  propertiesProps?: PropertiesTabProps;
  /** Props forwarded to LayersTab. */
  layersProps?: LayersTabProps;
  /** Props forwarded to TemplatesTab. */
  templatesProps?: TemplatesTabProps;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RightPanel({
  propertiesProps = {},
  layersProps = {},
  templatesProps = {},
}: RightPanelProps) {
  const templateCount = templatesProps.templates?.length ?? 0;

  return (
    <div
      data-testid="right-panel"
      className="flex h-full flex-col border-l"
      style={{
        backgroundColor: 'var(--panel-bg)',
        borderColor: 'var(--border-color)',
      }}
    >
      <Tabs.Root defaultValue="properties" className="flex h-full flex-col">
        {/* ---- Tab headers ---- */}
        <Tabs.List
          className="flex shrink-0 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <Tabs.Trigger
            value="properties"
            data-testid="tab-properties"
            className="flex flex-1 cursor-pointer items-center justify-center gap-1 border-b-2 border-transparent px-2 py-1.5 text-xs outline-none select-none data-[state=active]:border-[var(--accent-orange)] data-[state=active]:text-[var(--text-primary)]"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
          >
            <Icon path={mdiCog} size={14} />
            Properties
          </Tabs.Trigger>

          <Tabs.Trigger
            value="layers"
            data-testid="tab-layers"
            className="flex flex-1 cursor-pointer items-center justify-center gap-1 border-b-2 border-transparent px-2 py-1.5 text-xs outline-none select-none data-[state=active]:border-[var(--accent-orange)] data-[state=active]:text-[var(--text-primary)]"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
          >
            <Icon path={mdiLayersOutline} size={14} />
            Layers
          </Tabs.Trigger>

          <Tabs.Trigger
            value="templates"
            data-testid="tab-templates"
            className="flex flex-1 cursor-pointer items-center justify-center gap-1 border-b-2 border-transparent px-2 py-1.5 text-xs outline-none select-none data-[state=active]:border-[var(--accent-orange)] data-[state=active]:text-[var(--text-primary)]"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
          >
            <Icon path={mdiBookmarkMultipleOutline} size={14} />
            <span>Templates</span>
            <span data-testid="templates-count-badge" style={{ color: 'var(--text-disabled)' }}>
              ({templateCount})
            </span>
          </Tabs.Trigger>
        </Tabs.List>

        {/* ---- Tab content panels ---- */}
        <Tabs.Content value="properties" className="min-h-0 flex-1" asChild>
          <div className="h-full">
            <PropertiesTab {...propertiesProps} />
          </div>
        </Tabs.Content>

        <Tabs.Content value="layers" className="min-h-0 flex-1" asChild>
          <div className="h-full">
            <LayersTab {...layersProps} />
          </div>
        </Tabs.Content>

        <Tabs.Content value="templates" className="min-h-0 flex-1" asChild>
          <div className="h-full">
            <TemplatesTab {...templatesProps} />
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

export default RightPanel;
