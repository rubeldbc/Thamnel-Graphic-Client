import type { MouseEvent } from 'react';
import { Icon } from '../common/Icon';

export interface ToolToggleButtonProps {
  /** MDI icon path string. */
  icon: string;
  /** Unique tool name used for identification. */
  toolName: string;
  /** Whether this tool is currently selected. */
  isActive?: boolean;
  /** Click handler. */
  onClick?: () => void;
  /** Right-click handler (e.g. for secondary tool options). */
  onRightClick?: (e: MouseEvent) => void;
  /** Tooltip text shown on hover. */
  tooltip?: string;
  /** data-testid for testing. */
  testId?: string;
}

/**
 * A 38x38 borderless toggle button for the left toolbar.
 *
 * States:
 *  - normal: transparent background
 *  - hover: var(--hover-bg)
 *  - active: var(--selected-bg) with a left orange accent border
 */
export function ToolToggleButton({
  icon,
  toolName,
  isActive = false,
  onClick,
  onRightClick,
  tooltip,
  testId,
}: ToolToggleButtonProps) {
  return (
    <button
      type="button"
      data-testid={testId ?? `tool-${toolName}`}
      data-active={isActive || undefined}
      title={tooltip ?? toolName}
      onClick={onClick}
      onContextMenu={onRightClick}
      className="tg-hoverable relative flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent outline-none"
      style={{
        width: 38,
        height: 38,
        borderRadius: 4,
        ...(isActive
          ? {
              backgroundColor: 'var(--selected-bg)',
              borderLeft: '3px solid var(--accent-orange)',
            }
          : {}),
      }}
    >
      <Icon path={icon} size="lg" />
    </button>
  );
}

export default ToolToggleButton;
