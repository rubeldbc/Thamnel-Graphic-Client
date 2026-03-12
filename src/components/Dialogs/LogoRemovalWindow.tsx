import { useState, useRef, useEffect, useCallback } from 'react';
import { DialogBase } from './DialogBase';
import { NumericUpDown } from '../common/NumericUpDown';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tool = 'brush' | 'rect' | 'circle';

export interface LogoRemovalWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc?: string;
  onApply?: (maskDataUrl: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LogoRemovalWindow({
  open,
  onOpenChange,
  imageSrc,
  onApply,
}: LogoRemovalWindowProps) {
  const [activeTool, setActiveTool] = useState<Tool>('brush');
  const [brushWidth, setBrushWidth] = useState(30);
  const [brushHeight, setBrushHeight] = useState(30);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPainting, setIsPainting] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [maskCoverage, setMaskCoverage] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);

  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const offsetStartRef = useRef({ x: 0, y: 0 });
  const undoStackRef = useRef<ImageData[]>([]);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image when dialog opens
  useEffect(() => {
    if (!open || !imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageSize({ width: img.width, height: img.height });
      setScale(1);
      setOffset({ x: 0, y: 0 });
      setMaskCoverage(0);
      undoStackRef.current = [];
      drawImage(img);
      clearMask(img.width, img.height);
    };
    img.src = imageSrc;
  }, [open, imageSrc]);

  const drawImage = useCallback((img: HTMLImageElement) => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  }, []);

  const clearMask = useCallback((width: number, height: number) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    setMaskCoverage(0);
  }, []);

  const saveUndoState = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoStackRef.current.push(data);
    // Limit undo stack
    if (undoStackRef.current.length > 50) {
      undoStackRef.current.shift();
    }
  }, []);

  const handleUndo = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const prev = undoStackRef.current.pop();
    if (prev) {
      ctx.putImageData(prev, 0, 0);
      updateMaskCoverage();
    }
  }, []);

  const handleClearMask = useCallback(() => {
    saveUndoState();
    clearMask(imageSize.width, imageSize.height);
  }, [imageSize, saveUndoState, clearMask]);

  const updateMaskCoverage = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let painted = 0;
    for (let i = 3; i < data.data.length; i += 4) {
      if (data.data[i] > 0) painted++;
    }
    const total = canvas.width * canvas.height;
    setMaskCoverage(Math.round((painted / total) * 100));
  }, []);

  // Convert mouse event to canvas coordinates
  const toCanvasCoords = useCallback(
    (e: React.MouseEvent) => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      return {
        x: (mx - offset.x) / scale,
        y: (my - offset.y) / scale,
      };
    },
    [scale, offset],
  );

  const paintAt = useCallback(
    (x: number, y: number) => {
      const canvas = maskCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      if (activeTool === 'brush') {
        ctx.beginPath();
        ctx.ellipse(x, y, brushWidth / 2, brushHeight / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [activeTool, brushWidth, brushHeight],
  );

  const paintShape = useCallback(
    (startX: number, startY: number, endX: number, endY: number) => {
      const canvas = maskCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const w = Math.abs(endX - startX);
      const h = Math.abs(endY - startY);
      if (activeTool === 'rect') {
        ctx.fillRect(x, y, w, h);
      } else if (activeTool === 'circle') {
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [activeTool],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (spaceHeld) {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY };
        offsetStartRef.current = { ...offset };
        return;
      }
      const pos = toCanvasCoords(e);
      if (activeTool === 'brush') {
        saveUndoState();
        setIsPainting(true);
        paintAt(pos.x, pos.y);
      } else {
        saveUndoState();
        setShapeStart(pos);
        setIsPainting(true);
      }
    },
    [spaceHeld, offset, toCanvasCoords, activeTool, saveUndoState, paintAt],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }

      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setOffset({
          x: offsetStartRef.current.x + dx,
          y: offsetStartRef.current.y + dy,
        });
        return;
      }

      if (!isPainting) return;

      const pos = toCanvasCoords(e);
      if (activeTool === 'brush') {
        paintAt(pos.x, pos.y);
      }
    },
    [isPanning, isPainting, toCanvasCoords, activeTool, paintAt],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setIsPanning(false);
        return;
      }
      if (isPainting && (activeTool === 'rect' || activeTool === 'circle') && shapeStart) {
        const pos = toCanvasCoords(e);
        paintShape(shapeStart.x, shapeStart.y, pos.x, pos.y);
        setShapeStart(null);
      }
      setIsPainting(false);
      updateMaskCoverage();
    },
    [isPanning, isPainting, activeTool, shapeStart, toCanvasCoords, paintShape, updateMaskCoverage],
  );

  // Zoom with Ctrl+scroll
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((prev) => Math.max(0.1, Math.min(10, prev + delta)));
    },
    [],
  );

  // Keyboard events for Space key and bracket shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.key === '[') {
        setBrushWidth((p) => Math.max(3, p - 5));
        setBrushHeight((p) => Math.max(3, p - 5));
      }
      if (e.key === ']') {
        setBrushWidth((p) => Math.min(300, p + 5));
        setBrushHeight((p) => Math.min(300, p + 5));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpaceHeld(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [open]);

  const handleApply = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    onApply?.(dataUrl);
    onOpenChange(false);
  }, [onApply, onOpenChange]);

  const footer = (
    <>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
        onClick={() => onOpenChange(false)}
        data-testid="logo-removal-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-4 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={handleApply}
        data-testid="logo-removal-apply"
      >
        Apply Removal
      </button>
    </>
  );

  const toolButtonStyle = (tool: Tool) => ({
    backgroundColor: activeTool === tool ? 'var(--accent-orange)' : 'var(--toolbar-bg)',
    color: activeTool === tool ? '#fff' : 'var(--text-secondary)',
    border: `1px solid ${activeTool === tool ? 'var(--accent-orange)' : 'var(--border-color)'}`,
  });

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Logo / Scratch Removal"
      width={900}
      height={700}
      footer={footer}
    >
      <div className="flex h-full flex-col" data-testid="logo-removal-content">
        {/* Top toolbar */}
        <div
          className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3"
          style={{
            height: 40,
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--toolbar-bg)',
          }}
          data-testid="logo-removal-toolbar"
        >
          {/* Tool buttons */}
          <button
            type="button"
            className="flex items-center justify-center rounded px-2 py-1 text-xs"
            style={toolButtonStyle('brush')}
            onClick={() => setActiveTool('brush')}
            data-testid="logo-removal-tool-brush"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginRight: 4 }}>
              <circle cx="7" cy="7" r="5" fill="currentColor" />
            </svg>
            Brush
          </button>
          <button
            type="button"
            className="flex items-center justify-center rounded px-2 py-1 text-xs"
            style={toolButtonStyle('rect')}
            onClick={() => setActiveTool('rect')}
            data-testid="logo-removal-tool-rect"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginRight: 4 }}>
              <rect x="2" y="2" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            Rect Select
          </button>
          <button
            type="button"
            className="flex items-center justify-center rounded px-2 py-1 text-xs"
            style={toolButtonStyle('circle')}
            onClick={() => setActiveTool('circle')}
            data-testid="logo-removal-tool-circle"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginRight: 4 }}>
              <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            Circle Select
          </button>

          <div
            style={{ width: 1, height: 20, backgroundColor: 'var(--border-color)' }}
          />

          <NumericUpDown
            value={brushWidth}
            onChange={setBrushWidth}
            min={3}
            max={300}
            step={1}
            width={55}
            label="W"
          />
          <NumericUpDown
            value={brushHeight}
            onChange={setBrushHeight}
            min={3}
            max={300}
            step={1}
            width={55}
            label="H"
          />

          <div
            style={{ width: 1, height: 20, backgroundColor: 'var(--border-color)' }}
          />

          <button
            type="button"
            className="rounded px-2 py-1 text-xs hover:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            onClick={handleClearMask}
            data-testid="logo-removal-clear-mask"
          >
            Clear Mask
          </button>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs hover:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            onClick={handleUndo}
            data-testid="logo-removal-undo"
          >
            Undo
          </button>

          <span
            className="ml-auto text-xs"
            style={{ color: 'var(--text-secondary)', fontSize: 10 }}
          >
            [/] = resize, Space+drag = pan
          </span>
        </div>

        {/* Main canvas area */}
        <div
          ref={containerRef}
          className="relative flex-1 overflow-hidden"
          style={{
            backgroundColor: '#1a1a1a',
            cursor: spaceHeld ? 'grab' : activeTool === 'brush' ? 'none' : 'crosshair',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsPainting(false);
            setIsPanning(false);
          }}
          onWheel={handleWheel}
          data-testid="logo-removal-canvas-area"
        >
          <div
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              position: 'relative',
              width: imageSize.width,
              height: imageSize.height,
            }}
          >
            <canvas
              ref={imageCanvasRef}
              style={{ position: 'absolute', top: 0, left: 0 }}
              data-testid="logo-removal-image-canvas"
            />
            <canvas
              ref={maskCanvasRef}
              style={{ position: 'absolute', top: 0, left: 0, opacity: 0.5 }}
              data-testid="logo-removal-mask-canvas"
            />
          </div>

          {/* Brush cursor overlay */}
          {!spaceHeld && activeTool === 'brush' && (
            <div
              style={{
                position: 'absolute',
                left: cursorPos.x - (brushWidth * scale) / 2,
                top: cursorPos.y - (brushHeight * scale) / 2,
                width: brushWidth * scale,
                height: brushHeight * scale,
                borderRadius: '50%',
                border: '1px solid rgba(255, 255, 255, 0.7)',
                pointerEvents: 'none',
              }}
              data-testid="logo-removal-cursor"
            />
          )}
        </div>

        {/* Bottom info bar */}
        <div
          className="flex shrink-0 items-center gap-4 border-t px-3"
          style={{
            height: 28,
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--toolbar-bg)',
            fontSize: 11,
            color: 'var(--text-secondary)',
          }}
          data-testid="logo-removal-info-bar"
        >
          <span data-testid="logo-removal-dimensions">
            {imageSize.width} x {imageSize.height}
          </span>
          <span data-testid="logo-removal-zoom">
            Zoom: {Math.round(scale * 100)}%
          </span>
          <span data-testid="logo-removal-mask-coverage">
            Mask Coverage: {maskCoverage}%
          </span>
        </div>
      </div>
    </DialogBase>
  );
}

export default LogoRemovalWindow;
