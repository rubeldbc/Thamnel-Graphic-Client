import { useRef, useEffect } from 'react';

/**
 * Makes a dialog draggable by its title bar handle.
 * Clamps position within the browser window.
 * On first drag, removes any CSS transform so absolute positioning takes over.
 */
export function useDraggable(
  handleRef: React.RefObject<HTMLElement | null>,
  containerRef: React.RefObject<HTMLElement | null>,
  open: boolean,
) {
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) return;

    // Small delay to let refs populate after render
    const timerId = setTimeout(() => {
      const handle = handleRef.current;
      const container = containerRef.current;
      if (!handle || !container) return;

      const onMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        dragging.current = true;
        const rect = container.getBoundingClientRect();
        offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        document.body.style.userSelect = 'none';
        e.preventDefault();
        e.stopPropagation();
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!dragging.current) return;
        const x = Math.max(0, Math.min(e.clientX - offset.current.x, window.innerWidth - 100));
        const y = Math.max(0, Math.min(e.clientY - offset.current.y, window.innerHeight - 50));
        container.style.left = `${x}px`;
        container.style.top = `${y}px`;
        container.style.transform = 'none';
        e.preventDefault();
      };

      const onMouseUp = () => {
        if (dragging.current) {
          dragging.current = false;
          document.body.style.userSelect = '';
        }
      };

      handle.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);

      (handle as any).__dragCleanup = () => {
        handle.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    }, 50);

    return () => {
      clearTimeout(timerId);
      const handle = handleRef.current;
      if (handle && (handle as any).__dragCleanup) {
        (handle as any).__dragCleanup();
        delete (handle as any).__dragCleanup;
      }
      dragging.current = false;
      document.body.style.userSelect = '';
    };
  }, [open, handleRef, containerRef]);
}
