import * as ContextMenu from '@radix-ui/react-context-menu';
import { Icon } from '../../common/Icon';
import { mdiBookmarkOutline } from '@mdi/js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TemplateData {
  id: string;
  name: string;
}

export interface TemplateItemProps {
  /** Template data. */
  template: TemplateData;
  /** Fires on double-click to load the template. */
  onDoubleClick?: (id: string) => void;
  /** Update the template with the current project state. */
  onUpdate?: (id: string) => void;
  /** Delete the template. */
  onDelete?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TemplateItem({
  template,
  onDoubleClick,
  onUpdate,
  onDelete,
}: TemplateItemProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div
          data-testid="template-item"
          className="tg-hoverable flex items-center gap-2 px-2"
          style={{
            height: 30,
            cursor: 'pointer',
          }}
          onDoubleClick={() => onDoubleClick?.(template.id)}
        >
          {/* Bookmark icon */}
          <Icon path={mdiBookmarkOutline} size={14} color="var(--accent-orange)" />

          {/* Template name */}
          <span
            data-testid="template-name"
            className="min-w-0 flex-1 truncate"
            style={{ color: 'var(--text-primary)', fontSize: 13 }}
          >
            {template.name}
          </span>
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content
          className="z-50 min-w-[180px] overflow-hidden rounded-md border p-1 shadow-lg"
          style={{
            backgroundColor: 'var(--panel-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <ContextMenu.Item
            data-testid="template-ctx-update"
            className="cursor-default rounded-sm px-2 py-1.5 text-xs outline-none select-none data-[highlighted]:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-primary)' }}
            onSelect={() => onUpdate?.(template.id)}
          >
            Update with Current Project
          </ContextMenu.Item>

          <ContextMenu.Item
            data-testid="template-ctx-delete"
            className="cursor-default rounded-sm px-2 py-1.5 text-xs outline-none select-none data-[highlighted]:bg-[var(--hover-bg)]"
            style={{ color: 'var(--delete-red)' }}
            onSelect={() => onDelete?.(template.id)}
          >
            Delete Template
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export default TemplateItem;
