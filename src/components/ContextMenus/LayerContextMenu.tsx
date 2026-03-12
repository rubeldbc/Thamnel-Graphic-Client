import type { ReactNode } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';

export type LayerType = 'image' | 'text' | 'shape' | 'group';

export interface LayerContextMenuProps {
  /** Callback invoked with the action name when a menu item is clicked. */
  onAction: (action: string) => void;
  /** The trigger element (layer row in the layer panel). */
  children: ReactNode;
  /** The type of the layer, used to conditionally show/hide items. */
  layerType: LayerType;
}

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
 * Context menu shown on right-click of a single layer in the layer panel.
 */
export function LayerContextMenu({ onAction, children, layerType }: LayerContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className={menuContentClass} data-testid="layer-context-menu">
          {/* Basic operations */}
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('rename')}>
            Rename
          </ContextMenu.Item>
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('duplicate')}>
            Duplicate
          </ContextMenu.Item>
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('merge-down')}>
            Merge Down
          </ContextMenu.Item>

          <ContextMenu.Separator className={menuSeparatorClass} />

          {/* Size & Transform */}
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('auto-size')}>
            Auto Size
          </ContextMenu.Item>

          {/* Rotate submenu */}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className={subTriggerClass}>
              Rotate
              <span className="ml-auto pl-4 text-xs text-[var(--text-secondary)]">&#9656;</span>
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className={menuContentClass}>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('rotate-90-cw')}>
                  90&deg; CW
                </ContextMenu.Item>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('rotate-90-ccw')}>
                  90&deg; CCW
                </ContextMenu.Item>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('rotate-180')}>
                  180&deg;
                </ContextMenu.Item>
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>

          {/* Position submenu */}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className={subTriggerClass}>
              Position
              <span className="ml-auto pl-4 text-xs text-[var(--text-secondary)]">&#9656;</span>
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className={menuContentClass}>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('fit-to-canvas')}>
                  Fit to Canvas
                </ContextMenu.Item>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('fit-to-width')}>
                  Fit to Width
                </ContextMenu.Item>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('fit-to-height')}>
                  Fit to Height
                </ContextMenu.Item>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('center-horizontally')}>
                  Center Horizontally
                </ContextMenu.Item>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('center-vertically')}>
                  Center Vertically
                </ContextMenu.Item>
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>

          <ContextMenu.Separator className={menuSeparatorClass} />

          {/* Arrange submenu */}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger className={subTriggerClass}>
              Arrange
              <span className="ml-auto pl-4 text-xs text-[var(--text-secondary)]">&#9656;</span>
            </ContextMenu.SubTrigger>
            <ContextMenu.Portal>
              <ContextMenu.SubContent className={menuContentClass}>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('bring-to-front')}>
                  Bring to Front
                </ContextMenu.Item>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('bring-forward')}>
                  Bring Forward
                </ContextMenu.Item>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('send-backward')}>
                  Send Backward
                </ContextMenu.Item>
                <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('send-to-back')}>
                  Send to Back
                </ContextMenu.Item>
              </ContextMenu.SubContent>
            </ContextMenu.Portal>
          </ContextMenu.Sub>

          <ContextMenu.Separator className={menuSeparatorClass} />

          {/* Export & AI */}
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('quick-export-png')}>
            Quick Export PNG
          </ContextMenu.Item>
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('blur-faces')}>
            Blur Faces
          </ContextMenu.Item>

          {/* "Get Video Name" only for image layers */}
          {layerType === 'image' && (
            <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('get-video-name')}>
              Get Video Name
            </ContextMenu.Item>
          )}

          <ContextMenu.Separator className={menuSeparatorClass} />

          {/* Style Presets placeholder */}
          <ContextMenu.Item className={menuItemClass} disabled onSelect={() => onAction('style-presets')}>
            Style Presets
          </ContextMenu.Item>
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('release-from-group')}>
            Release from Group
          </ContextMenu.Item>
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('clear-blur-mask')}>
            Clear Blur Mask
          </ContextMenu.Item>

          <ContextMenu.Separator className={menuSeparatorClass} />

          {/* Delete */}
          <ContextMenu.Item
            className={menuItemClass + ' text-[var(--color-delete-red)]'}
            onSelect={() => onAction('delete')}
          >
            Delete
          </ContextMenu.Item>

          <ContextMenu.Separator className={menuSeparatorClass} />

          {/* Super Lock toggle */}
          <ContextMenu.Item className={menuItemClass} onSelect={() => onAction('super-lock-toggle')}>
            Super Lock
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export default LayerContextMenu;
