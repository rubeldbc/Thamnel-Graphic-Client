import type { ReactNode } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';

export interface SuperLockedMenuProps {
  /** Callback invoked with the action name when a menu item is clicked. */
  onAction: (action: string) => void;
  /** The trigger element (super-locked layer). */
  children: ReactNode;
}

const menuContentClass =
  'min-w-[160px] rounded-md p-1 shadow-lg z-50' +
  ' bg-[var(--panel-bg)] border border-[var(--border-color)]';

const menuItemClass =
  'flex items-center px-3 py-1.5 text-sm rounded-sm cursor-default select-none outline-none' +
  ' text-[var(--text-primary)] data-[highlighted]:bg-[var(--hover-bg)]';

/**
 * Minimal context menu for super-locked layers.
 * Only offers the option to turn off super lock.
 */
export function SuperLockedMenu({ onAction, children }: SuperLockedMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className={menuContentClass} data-testid="superlocked-context-menu">
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('off-super-lock')}>
            Off Super Lock
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export default SuperLockedMenu;
