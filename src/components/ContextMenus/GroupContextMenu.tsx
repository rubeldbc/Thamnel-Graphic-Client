import type { ReactNode } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';

export interface GroupContextMenuProps {
  /** Callback invoked with the action name when a menu item is clicked. */
  onAction: (action: string) => void;
  /** The display name of the group (used in menu labels). */
  groupName?: string;
  /** The trigger element (group row in the layer panel). */
  children: ReactNode;
}

const GROUP_COLORS = [
  { name: 'Red', hex: '#FF6B6B' },
  { name: 'Teal', hex: '#4ECDC4' },
  { name: 'Yellow', hex: '#FFD93D' },
  { name: 'Purple', hex: '#A78BFA' },
  { name: 'Blue', hex: '#60A5FA' },
  { name: 'Pink', hex: '#F472B6' },
  { name: 'Lime', hex: '#A3E635' },
  { name: 'Amber', hex: '#FBBF24' },
] as const;

const menuContentClass =
  'min-w-[200px] rounded-md p-1 shadow-lg z-50' +
  ' bg-[var(--panel-bg)] border border-[var(--border-color)]';

const menuItemClass =
  'flex items-center justify-between px-3 py-1.5 text-sm rounded-sm cursor-default select-none outline-none' +
  ' text-[var(--text-primary)] data-[highlighted]:bg-[var(--hover-bg)]';

const menuSeparatorClass = 'my-1 h-px bg-[var(--border-color)]';

const subTriggerClass =
  'flex items-center justify-between px-3 py-1.5 text-sm rounded-sm cursor-default select-none outline-none' +
  ' text-[var(--text-primary)] data-[highlighted]:bg-[var(--hover-bg)]';

/**
 * Context menu shown on right-click of a group in the layer panel.
 */
export function GroupContextMenu({ onAction, groupName = 'Group', children }: GroupContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className={menuContentClass} data-testid="group-context-menu">
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('rename')}>
            Rename
          </ContextMenu.Item>
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('duplicate-group')}>
            Duplicate Group
          </ContextMenu.Item>
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('new-sub-group')}>
            New Sub-Group
          </ContextMenu.Item>

          <ContextMenu.Separator className={menuSeparatorClass} />

          {/* Change Group Color submenu */}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className={subTriggerClass}>
              Change Group Color
              <span className="ml-auto pl-4 text-xs text-[var(--text-secondary)]">&#9656;</span>
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className={menuContentClass}>
                <div className="grid grid-cols-4 gap-1 p-1">
                  {GROUP_COLORS.map((color) => (
                    <ContextMenu.Item
                      key={color.hex}
                      className="flex items-center justify-center w-7 h-7 rounded cursor-default outline-none data-[highlighted]:ring-2 data-[highlighted]:ring-[var(--text-primary)]"
                      onSelect={() => onAction(`group-color:${color.hex}`)}
                      title={color.name}
                    >
                      <span
                        className="block w-5 h-5 rounded-sm"
                        style={{ backgroundColor: color.hex }}
                      />
                    </ContextMenu.Item>
                  ))}
                </div>
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>

          <ContextMenu.Separator className={menuSeparatorClass} />

          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('release-all-items')}>
            Release all Items
          </ContextMenu.Item>
          <ContextMenu.Item
            className={menuItemClass + ' text-[var(--color-delete-red)]'}
            onSelect={() => onAction('delete-group')}
          >
            Delete {groupName} Group
          </ContextMenu.Item>

          <ContextMenu.Separator className={menuSeparatorClass} />

          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('super-lock-toggle')}>
            Super Lock
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export default GroupContextMenu;
