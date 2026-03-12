import type { ReactNode } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';

export interface CanvasContextMenuProps {
  /** Callback invoked with the action name when a menu item is clicked. */
  onAction: (action: string) => void;
  /** The trigger element (typically the canvas layer). */
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
 * Context menu shown on right-click of a single selected layer on the canvas.
 */
export function CanvasContextMenu({ onAction, children }: CanvasContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className={menuContentClass} data-testid="canvas-context-menu">
          {/* Copy / Paste */}
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('copy')}>
            Copy
            <span className={shortcutClass}>Ctrl+C</span>
          </ContextMenu.Item>
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('paste')}>
            Paste
            <span className={shortcutClass}>Ctrl+V</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className={menuSeparatorClass} />

          {/* Layer operations */}
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('ungroup')}>
            Ungroup
          </ContextMenu.Item>
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('image-studio')}>
            Image Studio
          </ContextMenu.Item>
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('logo-remover')}>
            Logo Remover
          </ContextMenu.Item>
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('blur-faces')}>
            Blur Faces
          </ContextMenu.Item>

          <ContextMenu.Separator className={menuSeparatorClass} />

          {/* Text operations */}
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('text-properties')}>
            Text Properties
          </ContextMenu.Item>
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('edit-date-stamp')}>
            Edit Date Stamp
          </ContextMenu.Item>
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('convert-to-characters')}>
            Convert to Characters
          </ContextMenu.Item>

          <ContextMenu.Separator className={menuSeparatorClass} />

          {/* Image operations */}
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('mask-with-image')}>
            Mask with Image
          </ContextMenu.Item>
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('fill-selected')}>
            Fill Selected
          </ContextMenu.Item>

          <ContextMenu.Separator className={menuSeparatorClass} />

          {/* Duplicate / Delete */}
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('duplicate')}>
            Duplicate
            <span className={shortcutClass}>Ctrl+D</span>
          </ContextMenu.Item>
          <ContextMenu.Item
            className={menuItemClass + ' text-[var(--color-delete-red)]'}
            onSelect={() => onAction('delete')}
          >
            Delete
            <span className={shortcutClass}>Delete</span>
          </ContextMenu.Item>

          <ContextMenu.Separator className={menuSeparatorClass} />

          {/* Transform submenu */}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className={subTriggerClass}>
              Transform
              <span className="ml-auto pl-4 text-xs text-[var(--text-secondary)]">&#9656;</span>
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className={menuContentClass}>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('flip-horizontal')}>
                  Flip Horizontal
                </ContextMenu.Item>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('flip-vertical')}>
                  Flip Vertical
                </ContextMenu.Item>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('rotate-90')}>
                  Rotate 90&deg;
                </ContextMenu.Item>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('fit-to-canvas')}>
                  Fit to Canvas
                </ContextMenu.Item>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('fit-to-width')}>
                  Fit to Width
                </ContextMenu.Item>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('fit-to-height')}>
                  Fit to Height
                </ContextMenu.Item>
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>

          {/* Style Preset submenu */}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className={subTriggerClass}>
              Style Preset
              <span className="ml-auto pl-4 text-xs text-[var(--text-secondary)]">&#9656;</span>
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className={menuContentClass}>
                <ContextMenu.Item className={menuItemClass} disabled>
                  No presets available
                </ContextMenu.Item>
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>

          {/* Select Layer submenu */}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className={subTriggerClass}>
              Select Layer
              <span className="ml-auto pl-4 text-xs text-[var(--text-secondary)]">&#9656;</span>
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className={menuContentClass}>
                <ContextMenu.Item className={menuItemClass} disabled>
                  No overlapping layers
                </ContextMenu.Item>
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export default CanvasContextMenu;
