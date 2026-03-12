import * as Popover from '@radix-ui/react-popover';
import type { ReactNode } from 'react';
import {
  mdiDistributeHorizontalCenter,
  mdiDistributeVerticalCenter,
  mdiDistributeHorizontalLeft,
  mdiDistributeHorizontalRight,
  mdiDistributeVerticalTop,
  mdiDistributeVerticalBottom,
} from '@mdi/js';
import { Icon } from '../common/Icon';

/* ------------------------------------------------------------------ */
/*  Distribute options                                                 */
/* ------------------------------------------------------------------ */

interface DistributeOption {
  id: string;
  label: string;
  icon: string;
}

const DISTRIBUTE_OPTIONS: DistributeOption[] = [
  { id: 'dist-h-center', label: 'Distribute Horizontally', icon: mdiDistributeHorizontalCenter },
  { id: 'dist-v-center', label: 'Distribute Vertically', icon: mdiDistributeVerticalCenter },
  { id: 'dist-h-left', label: 'Distribute Left Edges', icon: mdiDistributeHorizontalLeft },
  { id: 'dist-h-right', label: 'Distribute Right Edges', icon: mdiDistributeHorizontalRight },
  { id: 'dist-v-top', label: 'Distribute Top Edges', icon: mdiDistributeVerticalTop },
  { id: 'dist-v-bottom', label: 'Distribute Bottom Edges', icon: mdiDistributeVerticalBottom },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export interface DistributePopupProps {
  /** The trigger element that opens the popup. */
  trigger: ReactNode;
  /** Called when a distribute action is selected. */
  onDistribute?: (distributeId: string) => void;
}

/**
 * Radix Popover showing 6 distribute buttons (32x32 each) in a horizontal row.
 */
export function DistributePopup({ trigger, onDistribute }: DistributePopupProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="right"
          sideOffset={6}
          align="start"
          data-testid="distribute-popup"
          className="tg-panel z-50 flex flex-wrap gap-1 rounded border border-border p-2"
        >
          {DISTRIBUTE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              data-testid={opt.id}
              title={opt.label}
              onClick={() => onDistribute?.(opt.id)}
              className="tg-hoverable flex cursor-pointer items-center justify-center border-0 bg-transparent outline-none"
              style={{ width: 32, height: 32, borderRadius: 4 }}
            >
              <Icon path={opt.icon} size="md" />
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default DistributePopup;
