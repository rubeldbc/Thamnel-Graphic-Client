import * as Popover from '@radix-ui/react-popover';
import type { ReactNode } from 'react';
import {
  mdiMinus,
  mdiVectorLine,
  mdiRectangleOutline,
  mdiSquareRoundedOutline,
  mdiCardOutline,
  mdiEllipseOutline,
  mdiTriangleOutline,
  mdiDiamondOutline,
  mdiPentagonOutline,
  mdiHexagonOutline,
  mdiOctagonOutline,
  mdiCross,
  mdiHeartOutline,
  mdiStarOutline,
  mdiStar,
  mdiRing,
  mdiArrowRight,
  mdiArrowLeft,
  mdiArrowUp,
  mdiArrowDown,
  mdiArrowLeftRight,
  mdiChevronRight,
  mdiChevronLeft,
  mdiShapePlus,
  mdiTriangleDown,
  mdiRhombus,
  mdiShapeOutline,
} from '@mdi/js';
import { Icon } from '../common/Icon';

/* ------------------------------------------------------------------ */
/*  Shape data                                                         */
/* ------------------------------------------------------------------ */

export interface ShapeItem {
  id: string;
  label: string;
  icon: string;
}

export interface ShapeGroup {
  label: string;
  shapes: ShapeItem[];
}

const SHAPE_GROUPS: ShapeGroup[] = [
  {
    label: 'Lines',
    shapes: [
      { id: 'line', label: 'Line', icon: mdiMinus },
      { id: 'diagonal-line', label: 'Diagonal Line', icon: mdiVectorLine },
    ],
  },
  {
    label: 'Rectangles',
    shapes: [
      { id: 'rectangle', label: 'Rectangle', icon: mdiRectangleOutline },
      { id: 'rounded-rectangle', label: 'Rounded Rectangle', icon: mdiSquareRoundedOutline },
      { id: 'snip', label: 'Snip', icon: mdiCardOutline },
    ],
  },
  {
    label: 'Basic Shapes',
    shapes: [
      { id: 'ellipse', label: 'Ellipse', icon: mdiEllipseOutline },
      { id: 'triangle', label: 'Triangle', icon: mdiTriangleOutline },
      { id: 'right-triangle', label: 'Right Triangle', icon: mdiTriangleDown },
      { id: 'diamond', label: 'Diamond', icon: mdiDiamondOutline },
      { id: 'parallelogram', label: 'Parallelogram', icon: mdiRhombus },
      { id: 'trapezoid', label: 'Trapezoid', icon: mdiShapeOutline },
      { id: 'pentagon', label: 'Pentagon', icon: mdiPentagonOutline },
      { id: 'hexagon', label: 'Hexagon', icon: mdiHexagonOutline },
      { id: 'octagon', label: 'Octagon', icon: mdiOctagonOutline },
      { id: 'cross', label: 'Cross', icon: mdiCross },
      { id: 'heart', label: 'Heart', icon: mdiHeartOutline },
      { id: 'star', label: 'Star', icon: mdiStarOutline },
      { id: 'star6', label: 'Star6', icon: mdiStar },
      { id: 'ring', label: 'Ring', icon: mdiRing },
    ],
  },
  {
    label: 'Block Arrows',
    shapes: [
      { id: 'arrow', label: 'Arrow', icon: mdiArrowRight },
      { id: 'arrow-left', label: 'Arrow Left', icon: mdiArrowLeft },
      { id: 'arrow-up', label: 'Arrow Up', icon: mdiArrowUp },
      { id: 'arrow-down', label: 'Arrow Down', icon: mdiArrowDown },
      { id: 'double-arrow', label: 'Double Arrow', icon: mdiArrowLeftRight },
      { id: 'chevron-right', label: 'Chevron Right', icon: mdiChevronRight },
      { id: 'chevron-left', label: 'Chevron Left', icon: mdiChevronLeft },
      { id: 'custom', label: 'Custom', icon: mdiShapePlus },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export interface ShapePickerPopupProps {
  /** The trigger element that opens the popup. */
  trigger: ReactNode;
  /** Called when a shape is selected. */
  onSelect?: (shapeId: string) => void;
}

/**
 * Radix Popover with a scrollable list of 27 shapes organised in 4 groups.
 */
export function ShapePickerPopup({ trigger, onSelect }: ShapePickerPopupProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="right"
          sideOffset={6}
          align="start"
          data-testid="shape-picker-popup"
          className="tg-panel z-50 overflow-y-auto rounded border border-border p-2"
          style={{ width: 140, maxHeight: 460 }}
        >
          {SHAPE_GROUPS.map((group) => (
            <div key={group.label} className="mb-2 last:mb-0">
              {/* Group header */}
              <div
                className="mb-1 select-none px-1 uppercase"
                style={{
                  fontSize: 10,
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.05em',
                }}
              >
                {group.label}
              </div>

              {/* Shape buttons */}
              <div className="flex flex-wrap gap-1">
                {group.shapes.map((shape) => (
                  <button
                    key={shape.id}
                    type="button"
                    data-testid={`shape-${shape.id}`}
                    title={shape.label}
                    onClick={() => onSelect?.(shape.id)}
                    className="tg-hoverable flex cursor-pointer items-center justify-center border-0 bg-transparent outline-none"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 3,
                    }}
                  >
                    <Icon path={shape.icon} size="sm" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default ShapePickerPopup;
