import { useCallback, useRef } from 'react';

export interface ResizableSplitterProps {
  /** Whether the splitter divides horizontally-stacked panes (vertical bar)
   *  or vertically-stacked panes (horizontal bar). */
  orientation: 'horizontal' | 'vertical';
  /** Called continuously during a drag with the signed pixel delta. */
  onResize: (delta: number) => void;
  /** Minimum size (px) of the panel being resized. */
  minSize?: number;
  /** Maximum size (px) of the panel being resized. */
  maxSize?: number;
  /** data-testid for testing. */
  testId?: string;
}

/**
 * A 4 px draggable splitter bar that fires resize deltas via `onResize`.
 *
 * - `orientation="horizontal"` => vertical bar between left/right panels
 *   (cursor: col-resize, width 4 px)
 * - `orientation="vertical"` => horizontal bar between top/bottom panels
 *   (cursor: row-resize, height 4 px)
 */
export function ResizableSplitter({
  orientation,
  onResize,
  testId,
}: ResizableSplitterProps) {
  const dragging = useRef(false);
  const lastPos = useRef(0);

  const isHorizontal = orientation === 'horizontal';

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current) return;
      const current = isHorizontal ? e.clientX : e.clientY;
      const delta = current - lastPos.current;
      lastPos.current = current;
      if (delta !== 0) onResize(delta);
    },
    [isHorizontal, onResize],
  );

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      lastPos.current = isHorizontal ? e.clientX : e.clientY;
      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [isHorizontal, handleMouseMove, handleMouseUp],
  );

  const cls = isHorizontal
    ? 'w-1 cursor-col-resize self-stretch'
    : 'h-1 cursor-row-resize self-stretch';

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      data-testid={testId}
      onMouseDown={handleMouseDown}
      className={`shrink-0 bg-border transition-colors hover:bg-accent-orange ${cls}`}
    />
  );
}

export default ResizableSplitter;
