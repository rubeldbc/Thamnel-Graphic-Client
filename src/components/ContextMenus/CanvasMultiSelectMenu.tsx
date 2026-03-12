import type { ReactNode } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';

export interface CanvasMultiSelectMenuProps {
  /** Callback invoked with the action name when a menu item is clicked. */
  onAction: (action: string) => void;
  /** The trigger element (typically the canvas multi-selection area). */
  children: ReactNode;
}

const menuContentClass =
  'min-w-[200px] rounded-md p-1 shadow-lg z-50' +
  ' bg-[var(--panel-bg)] border border-[var(--border-color)]';

const menuItemClass =
  'flex items-center justify-between px-3 py-1.5 text-sm rounded-sm cursor-default select-none outline-none' +
  ' text-[var(--text-primary)] data-[highlighted]:bg-[var(--hover-bg)]';

const menuSeparatorClass = 'my-1 h-px bg-[var(--border-color)]';

const shortcutClass = 'ml-auto pl-4 text-xs text-[var(--text-secondary)]';

const subTriggerClass =
  'flex items-center justify-between px-3 py-1.5 text-sm rounded-sm cursor-default select-none outline-none' +
  ' text-[var(--text-primary)] data-[highlighted]:bg-[var(--hover-bg)]';

/**
 * Context menu shown on right-click when multiple layers are selected on the canvas.
 */
export function CanvasMultiSelectMenu({ onAction, children }: CanvasMultiSelectMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className={menuContentClass} data-testid="canvas-multi-context-menu">
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('group')}>
            Group
            <span className={shortcutClass}>Ctrl+G</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className={menuSeparatorClass} />

          {/* Autosize submenu */}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className={subTriggerClass}>
              Autosize
              <span className="ml-auto pl-4 text-xs text-[var(--text-secondary)]">&#9656;</span>
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className={menuContentClass}>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('match-width')}>
                  Match Width
                </ContextMenu.Item>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('match-height')}>
                  Match Height
                </ContextMenu.Item>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('match-size')}>
                  Match Size
                </ContextMenu.Item>
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>

          <ContextMenu.Separator className={menuSeparatorClass} />

          <ContextMenu.Item
            className={menuItemClass + ' text-[var(--color-delete-red)]'}
            onSelect={() => onAction('delete-selected')}
          >
            Delete Selected
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export default CanvasMultiSelectMenu;
