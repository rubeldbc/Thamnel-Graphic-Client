import * as Tooltip from '@radix-ui/react-tooltip';
import { Icon } from '../common/Icon';

export interface ToolbarButtonProps {
  /** MDI icon path string. */
  icon: string;
  /** Click handler. */
  onClick?: () => void;
  /** Tooltip text shown on hover. */
  tooltip?: string;
  /** Whether the button is in active/toggled state. */
  active?: boolean;
  /** Whether the button is disabled. */
  disabled?: boolean;
  /** Button size in pixels (default 32). */
  size?: number;
  /** Visual variant. */
  variant?: 'default' | 'orange' | 'danger';
  /** data-testid for testing. */
  testId?: string;
}

const variantStyles = {
  default: {},
  orange: { color: 'var(--accent-orange)' },
  danger: { color: 'var(--delete-red, #FF5252)' },
} as const;

/**
 * Reusable toolbar icon button with Radix tooltip.
 * 32x32 default size, transparent background, hover/active states.
 */
export function ToolbarButton({
  icon,
  onClick,
  tooltip,
  active = false,
  disabled = false,
  size = 32,
  variant = 'default',
  testId,
}: ToolbarButtonProps) {
  const iconSize = Math.round(size * 0.5);

  const button = (
    <button
      type="button"
      data-testid={testId}
      data-active={active || undefined}
      disabled={disabled}
      onClick={onClick}
      className="tg-hoverable flex shrink-0 cursor-default items-center justify-center rounded-sm border-0 outline-none disabled:opacity-50 disabled:pointer-events-none"
      style={{
        width: size,
        height: size,
        backgroundColor: active ? 'var(--selected-bg)' : 'transparent',
        borderColor: active ? 'var(--accent-orange)' : 'transparent',
        ...variantStyles[variant],
      }}
    >
      <Icon
        path={icon}
        size={iconSize}
        color={
          disabled
            ? 'var(--text-disabled)'
            : variant !== 'default'
              ? variantStyles[variant].color
              : 'var(--text-primary)'
        }
      />
    </button>
  );

  if (!tooltip) {
    return button;
  }

  return (
    <Tooltip.Provider delayDuration={400}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 rounded px-2 py-1 text-xs shadow-md"
            style={{
              backgroundColor: 'var(--panel-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
            sideOffset={4}
          >
            {tooltip}
            <Tooltip.Arrow
              style={{ fill: 'var(--border-color)' }}
              width={8}
              height={4}
            />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export default ToolbarButton;
