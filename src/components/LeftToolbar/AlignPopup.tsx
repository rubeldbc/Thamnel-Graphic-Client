import * as Popover from '@radix-ui/react-popover';
import type { ReactNode } from 'react';
import {
  mdiAlignHorizontalLeft,
  mdiAlignHorizontalCenter,
  mdiAlignHorizontalRight,
  mdiAlignVerticalTop,
  mdiAlignVerticalCenter,
  mdiAlignVerticalBottom,
} from '@mdi/js';
import { Icon } from '../common/Icon';

/* ------------------------------------------------------------------ */
/*  Align options                                                      */
/* ------------------------------------------------------------------ */

interface AlignOption {
  id: string;
  label: string;
  icon: string;
}

const ALIGN_OPTIONS: AlignOption[] = [
  { id: 'align-left', label: 'Align Left', icon: mdiAlignHorizontalLeft },
  { id: 'align-center', label: 'Align Center', icon: mdiAlignHorizontalCenter },
  { id: 'align-right', label: 'Align Right', icon: mdiAlignHorizontalRight },
  { id: 'align-top', label: 'Align Top', icon: mdiAlignVerticalTop },
  { id: 'align-middle', label: 'Align Middle', icon: mdiAlignVerticalCenter },
  { id: 'align-bottom', label: 'Align Bottom', icon: mdiAlignVerticalBottom },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export interface AlignPopupProps {
  /** The trigger element that opens the popup. */
  trigger: ReactNode;
  /** Called when an align action is selected. */
  onAlign?: (alignId: string) => void;
}

/**
 * Radix Popover showing 6 alignment buttons (32x32 each) in a horizontal row.
 */
export function AlignPopup({ trigger, onAlign }: AlignPopupProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="right"
          sideOffset={6}
          align="start"
          data-testid="align-popup"
          className="tg-panel z-50 flex flex-wrap gap-1 rounded border border-border p-2"
        >
          {ALIGN_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              data-testid={opt.id}
              title={opt.label}
              onClick={() => onAlign?.(opt.id)}
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

export default AlignPopup;
