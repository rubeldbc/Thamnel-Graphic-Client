import * as Menubar from '@radix-ui/react-menubar';
import { Icon } from '../common/Icon';
import { mdiChevronRight } from '@mdi/js';

export interface MenuItemDef {
  type: 'item' | 'separator' | 'sub';
  label?: string;
  shortcut?: string;
  icon?: string;
  disabled?: boolean;
  onSelect?: () => void;
  children?: MenuItemDef[];
}

/**
 * Renders an individual menu item, separator, or submenu
 * within a Radix Menubar dropdown.
 */
export function MenuBarItem({ def }: { def: MenuItemDef }) {
  if (def.type === 'separator') {
    return (
      <Menubar.Separator
        className="my-1 h-px"
        style={{ backgroundColor: 'var(--border-color)' }}
      />
    );
  }

  if (def.type === 'sub' && def.children) {
    return (
      <Menubar.Sub>
        <Menubar.SubTrigger
          className="flex cursor-default items-center gap-2 rounded px-2 py-1 text-[13px] outline-none select-none data-[highlighted]:bg-[var(--hover-bg)]"
          style={{ color: 'var(--text-primary)' }}
        >
          {def.icon && <Icon path={def.icon} size="sm" />}
          <span className="flex-1">{def.label}</span>
          <Icon path={mdiChevronRight} size="sm" color="var(--text-secondary)" />
        </Menubar.SubTrigger>
        <Menubar.Portal>
          <Menubar.SubContent
            className="z-50 min-w-[180px] rounded-md border p-1 shadow-lg"
            style={{
              backgroundColor: 'var(--panel-bg)',
              borderColor: 'var(--border-color)',
            }}
            sideOffset={4}
            alignOffset={-4}
          >
            {def.children.map((child, i) => (
              <MenuBarItem key={`${child.label ?? 'sep'}-${i}`} def={child} />
            ))}
          </Menubar.SubContent>
        </Menubar.Portal>
      </Menubar.Sub>
    );
  }

  // Regular item
  return (
    <Menubar.Item
      className="flex cursor-default items-center gap-2 rounded px-2 py-1 text-[13px] outline-none select-none data-[highlighted]:bg-[var(--hover-bg)] data-[disabled]:opacity-50"
      style={{ color: 'var(--text-primary)' }}
      disabled={def.disabled}
      onSelect={def.onSelect}
    >
      {def.icon && <Icon path={def.icon} size="sm" />}
      <span className="flex-1">{def.label}</span>
      {def.shortcut && (
        <span
          className="ml-4 text-[11px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {def.shortcut}
        </span>
      )}
    </Menubar.Item>
  );
}

export default MenuBarItem;
