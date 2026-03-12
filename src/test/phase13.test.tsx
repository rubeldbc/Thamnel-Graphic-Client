import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { useSelectionManager, HANDLE_COLORS } from '../hooks/useSelectionManager';
import type { LayerBounds } from '../hooks/useSelectionManager';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';
import { useSmartGuides } from '../hooks/useSmartGuides';
import { useEraserTool } from '../hooks/useEraserTool';
import { useBlurBrushTool } from '../hooks/useBlurBrushTool';
import { useClipboard } from '../hooks/useClipboard';
import type { ClipboardLayer } from '../hooks/useClipboard';
import { InlineTextEditor } from '../components/Canvas/InlineTextEditor';
import type { TextLayerData } from '../components/Canvas/InlineTextEditor';

// ===========================================================================
// useSelectionManager
// ===========================================================================

describe('useSelectionManager', () => {
  it('starts with empty selection', () => {
    const { result } = renderHook(() => useSelectionManager());
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.primarySelectedId).toBeNull();
  });

  it('selects a single layer', () => {
    const { result } = renderHook(() => useSelectionManager());
    act(() => result.current.selectLayer('layer-1'));
    expect(result.current.selectedIds.size).toBe(1);
    expect(result.current.selectedIds.has('layer-1')).toBe(true);
    expect(result.current.primarySelectedId).toBe('layer-1');
  });

  it('replaces selection when selectLayer is called again', () => {
    const { result } = renderHook(() => useSelectionManager());
    act(() => result.current.selectLayer('layer-1'));
    act(() => result.current.selectLayer('layer-2'));
    expect(result.current.selectedIds.size).toBe(1);
    expect(result.current.selectedIds.has('layer-2')).toBe(true);
    expect(result.current.primarySelectedId).toBe('layer-2');
  });

  it('toggleSelection adds a layer to existing selection', () => {
    const { result } = renderHook(() => useSelectionManager());
    act(() => result.current.selectLayer('layer-1'));
    act(() => result.current.toggleSelection('layer-2'));
    expect(result.current.selectedIds.size).toBe(2);
    expect(result.current.selectedIds.has('layer-1')).toBe(true);
    expect(result.current.selectedIds.has('layer-2')).toBe(true);
  });

  it('toggleSelection removes a layer already in selection', () => {
    const { result } = renderHook(() => useSelectionManager());
    act(() => result.current.selectLayer('layer-1'));
    act(() => result.current.toggleSelection('layer-2'));
    act(() => result.current.toggleSelection('layer-1'));
    expect(result.current.selectedIds.size).toBe(1);
    expect(result.current.selectedIds.has('layer-2')).toBe(true);
  });

  it('selectAll selects all provided IDs', () => {
    const { result } = renderHook(() => useSelectionManager());
    act(() => result.current.selectAll(['a', 'b', 'c']));
    expect(result.current.selectedIds.size).toBe(3);
  });

  it('deselectAll clears the selection', () => {
    const { result } = renderHook(() => useSelectionManager());
    act(() => result.current.selectAll(['a', 'b']));
    act(() => result.current.deselectAll());
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.primarySelectedId).toBeNull();
  });

  it('getSelectedBounds computes union bounding box', () => {
    const { result } = renderHook(() => useSelectionManager());
    act(() => result.current.selectAll(['a', 'b']));

    const boundsMap = new Map<string, LayerBounds>([
      ['a', { id: 'a', x: 10, y: 20, width: 100, height: 50 }],
      ['b', { id: 'b', x: 50, y: 30, width: 100, height: 80 }],
    ]);

    const bounds = result.current.getSelectedBounds(boundsMap);
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBe(10);
    expect(bounds!.y).toBe(20);
    expect(bounds!.width).toBe(140); // max(110,150) - 10
    expect(bounds!.height).toBe(90); // max(70,110) - 20
  });

  it('getHandleColor returns correct colors based on selection count', () => {
    const { result } = renderHook(() => useSelectionManager());

    // Single selection
    act(() => result.current.selectLayer('layer-1'));
    expect(result.current.getHandleColor('layer-1')).toBe(HANDLE_COLORS.single);

    // Multi-selection
    act(() => result.current.toggleSelection('layer-2'));
    expect(result.current.getHandleColor('layer-1')).toBe(HANDLE_COLORS.firstMulti);
    expect(result.current.getHandleColor('layer-2')).toBe(HANDLE_COLORS.additional);
  });
});

// ===========================================================================
// useCanvasInteraction
// ===========================================================================

describe('useCanvasInteraction', () => {
  it('starts in idle mode', () => {
    const { result } = renderHook(() => useCanvasInteraction());
    expect(result.current.interactionMode).toBe('idle');
    expect(result.current.isDragging).toBe(false);
    expect(result.current.cursor).toBe('default');
  });

  it('setInteractionMode changes the mode', () => {
    const { result } = renderHook(() => useCanvasInteraction());
    act(() => result.current.setInteractionMode('move'));
    expect(result.current.interactionMode).toBe('move');
  });

  it('returns drag delta of {0,0} when not dragging', () => {
    const { result } = renderHook(() => useCanvasInteraction());
    expect(result.current.dragDelta).toEqual({ x: 0, y: 0 });
  });

  it('zoom defaults to 1', () => {
    const { result } = renderHook(() => useCanvasInteraction());
    expect(result.current.zoom).toBe(1);
  });

  it('setZoom updates zoom', () => {
    const { result } = renderHook(() => useCanvasInteraction());
    act(() => result.current.setZoom(2.5));
    expect(result.current.zoom).toBe(2.5);
  });

  it('modifiers default to all false', () => {
    const { result } = renderHook(() => useCanvasInteraction());
    expect(result.current.modifiers).toEqual({ shift: false, ctrl: false, alt: false });
  });
});

// ===========================================================================
// useSmartGuides
// ===========================================================================

describe('useSmartGuides', () => {
  it('starts with no active guides', () => {
    const { result } = renderHook(() => useSmartGuides(1920, 1080));
    expect(result.current.activeGuides).toEqual([]);
  });

  it('snaps to canvas left edge within threshold', () => {
    const { result } = renderHook(() => useSmartGuides(1920, 1080));
    let snapped: { x: number; y: number };

    act(() => {
      snapped = result.current.snapPosition({ x: 3, y: 100 });
    });

    expect(snapped!.x).toBe(0); // snapped to canvas left edge
    expect(result.current.activeGuides.length).toBeGreaterThan(0);
    expect(result.current.activeGuides[0]!.color).toBe('#FF00FF');
  });

  it('does not snap beyond threshold', () => {
    const { result } = renderHook(() => useSmartGuides(1920, 1080));
    let snapped: { x: number; y: number };

    act(() => {
      snapped = result.current.snapPosition({ x: 100, y: 200 });
    });

    // 100 is far from any default snap target (0, 960, 1920)
    expect(snapped!.x).toBe(100);
    expect(snapped!.y).toBe(200);
  });

  it('snaps to canvas center', () => {
    const { result } = renderHook(() => useSmartGuides(1920, 1080));
    let snapped: { x: number; y: number };

    act(() => {
      snapped = result.current.snapPosition({ x: 958, y: 538 });
    });

    expect(snapped!.x).toBe(960); // canvas center x
    expect(snapped!.y).toBe(540); // canvas center y
  });

  it('clearGuides removes active guides', () => {
    const { result } = renderHook(() => useSmartGuides(1920, 1080));

    act(() => {
      result.current.snapPosition({ x: 2, y: 2 });
    });
    expect(result.current.activeGuides.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearGuides();
    });
    expect(result.current.activeGuides).toEqual([]);
  });

  it('supports custom snap targets', () => {
    const { result } = renderHook(() => useSmartGuides(1920, 1080));

    act(() => {
      result.current.setSnapTargets([
        { orientation: 'vertical', position: 300 },
      ]);
    });

    let snapped: { x: number; y: number };
    act(() => {
      snapped = result.current.snapPosition({ x: 302, y: 500 });
    });

    expect(snapped!.x).toBe(300);
  });
});

// ===========================================================================
// useEraserTool
// ===========================================================================

describe('useEraserTool', () => {
  it('has correct defaults', () => {
    const { result } = renderHook(() => useEraserTool());
    expect(result.current.eraserState.mode).toBe('soft');
    expect(result.current.eraserState.brushSize).toBe(20);
    expect(result.current.eraserState.isAntiErase).toBe(false);
  });

  it('setMode switches between soft and hard', () => {
    const { result } = renderHook(() => useEraserTool());
    act(() => result.current.setMode('hard'));
    expect(result.current.eraserState.mode).toBe('hard');
    act(() => result.current.setMode('soft'));
    expect(result.current.eraserState.mode).toBe('soft');
  });

  it('setBrushSize changes size within bounds', () => {
    const { result } = renderHook(() => useEraserTool());
    act(() => result.current.setBrushSize(100));
    expect(result.current.eraserState.brushSize).toBe(100);
  });

  it('clamps brush size to valid range', () => {
    const { result } = renderHook(() => useEraserTool());
    act(() => result.current.setBrushSize(600));
    expect(result.current.eraserState.brushSize).toBe(500);
    act(() => result.current.setBrushSize(-10));
    expect(result.current.eraserState.brushSize).toBe(1);
  });

  it('toggleAntiErase toggles state', () => {
    const { result } = renderHook(() => useEraserTool());
    expect(result.current.eraserState.isAntiErase).toBe(false);
    act(() => result.current.toggleAntiErase());
    expect(result.current.eraserState.isAntiErase).toBe(true);
    act(() => result.current.toggleAntiErase());
    expect(result.current.eraserState.isAntiErase).toBe(false);
  });

  it('[ key decreases brush size by 5', () => {
    const { result } = renderHook(() => useEraserTool(true));
    expect(result.current.eraserState.brushSize).toBe(20);

    act(() => {
      fireEvent.keyDown(window, { key: '[' });
    });
    expect(result.current.eraserState.brushSize).toBe(15);
  });

  it('] key increases brush size by 5', () => {
    const { result } = renderHook(() => useEraserTool(true));
    expect(result.current.eraserState.brushSize).toBe(20);

    act(() => {
      fireEvent.keyDown(window, { key: ']' });
    });
    expect(result.current.eraserState.brushSize).toBe(25);
  });
});

// ===========================================================================
// useBlurBrushTool
// ===========================================================================

describe('useBlurBrushTool', () => {
  it('has correct defaults', () => {
    const { result } = renderHook(() => useBlurBrushTool());
    expect(result.current.blurState.brushSize).toBe(30);
    expect(result.current.blurState.intensity).toBe(50);
    expect(result.current.blurState.isAntiBlur).toBe(false);
  });

  it('setBrushSize updates and clamps', () => {
    const { result } = renderHook(() => useBlurBrushTool());
    act(() => result.current.setBrushSize(200));
    expect(result.current.blurState.brushSize).toBe(200);
    act(() => result.current.setBrushSize(999));
    expect(result.current.blurState.brushSize).toBe(500);
    act(() => result.current.setBrushSize(0));
    expect(result.current.blurState.brushSize).toBe(1);
  });

  it('setIntensity updates and clamps', () => {
    const { result } = renderHook(() => useBlurBrushTool());
    act(() => result.current.setIntensity(75));
    expect(result.current.blurState.intensity).toBe(75);
    act(() => result.current.setIntensity(150));
    expect(result.current.blurState.intensity).toBe(100);
    act(() => result.current.setIntensity(-5));
    expect(result.current.blurState.intensity).toBe(0);
  });

  it('toggleAntiBlur toggles state', () => {
    const { result } = renderHook(() => useBlurBrushTool());
    expect(result.current.blurState.isAntiBlur).toBe(false);
    act(() => result.current.toggleAntiBlur());
    expect(result.current.blurState.isAntiBlur).toBe(true);
    act(() => result.current.toggleAntiBlur());
    expect(result.current.blurState.isAntiBlur).toBe(false);
  });

  it('paint function exists and is callable', () => {
    const { result } = renderHook(() => useBlurBrushTool());
    expect(typeof result.current.paint).toBe('function');
    // Should not throw
    act(() => result.current.paint(100, 200));
  });
});

// ===========================================================================
// useClipboard
// ===========================================================================

describe('useClipboard', () => {
  const sampleLayers: ClipboardLayer[] = [
    { id: 'orig-1', type: 'image', name: 'Layer 1', x: 100, y: 200, width: 300, height: 150 },
    { id: 'orig-2', type: 'text', name: 'Layer 2', x: 50, y: 60, width: 200, height: 100 },
  ];

  it('starts with canPaste = false', () => {
    const { result } = renderHook(() => useClipboard());
    expect(result.current.canPaste).toBe(false);
  });

  it('copy sets canPaste to true', () => {
    const { result } = renderHook(() => useClipboard());
    act(() => result.current.copy(sampleLayers));
    expect(result.current.canPaste).toBe(true);
  });

  it('paste returns layers with new IDs', () => {
    const { result } = renderHook(() => useClipboard());
    act(() => result.current.copy(sampleLayers));

    let pasted: ClipboardLayer[] = [];
    act(() => {
      pasted = result.current.paste();
    });

    expect(pasted).toHaveLength(2);
    // IDs should be different from originals
    expect(pasted[0]!.id).not.toBe('orig-1');
    expect(pasted[1]!.id).not.toBe('orig-2');
    // IDs should be valid UUIDs (contain hyphens)
    expect(pasted[0]!.id).toMatch(/^[0-9a-f]{8}-/);
  });

  it('paste offsets positions by (20, 20)', () => {
    const { result } = renderHook(() => useClipboard());
    act(() => result.current.copy(sampleLayers));

    let pasted: ClipboardLayer[] = [];
    act(() => {
      pasted = result.current.paste();
    });

    expect(pasted[0]!.x).toBe(120); // 100 + 20
    expect(pasted[0]!.y).toBe(220); // 200 + 20
    expect(pasted[1]!.x).toBe(70);  // 50 + 20
    expect(pasted[1]!.y).toBe(80);  // 60 + 20
  });

  it('successive pastes cascade the offset', () => {
    const { result } = renderHook(() => useClipboard());
    act(() => result.current.copy(sampleLayers));

    let first: ClipboardLayer[] = [];
    let second: ClipboardLayer[] = [];
    act(() => {
      first = result.current.paste();
    });
    act(() => {
      second = result.current.paste();
    });

    // First paste: offset 20
    expect(first[0]!.x).toBe(120);
    // Second paste: offset 40
    expect(second[0]!.x).toBe(140);
  });

  it('paste returns empty array when nothing copied', () => {
    const { result } = renderHook(() => useClipboard());
    let pasted: ClipboardLayer[] = [];
    act(() => {
      pasted = result.current.paste();
    });
    expect(pasted).toEqual([]);
  });

  it('preserves layer properties through copy/paste', () => {
    const { result } = renderHook(() => useClipboard());
    act(() => result.current.copy(sampleLayers));

    let pasted: ClipboardLayer[] = [];
    act(() => {
      pasted = result.current.paste();
    });

    expect(pasted[0]!.name).toBe('Layer 1');
    expect(pasted[0]!.type).toBe('image');
    expect(pasted[0]!.width).toBe(300);
    expect(pasted[1]!.name).toBe('Layer 2');
    expect(pasted[1]!.type).toBe('text');
  });
});

// ===========================================================================
// InlineTextEditor
// ===========================================================================

describe('InlineTextEditor', () => {
  const sampleLayer: TextLayerData = {
    id: 'text-1',
    text: 'Hello World',
    x: 50,
    y: 100,
    width: 200,
    height: 60,
    rotation: 0,
    fontSize: 16,
    fontFamily: 'Arial',
    color: '#000000',
  };

  it('renders with data-testid', () => {
    render(
      <InlineTextEditor
        layer={sampleLayer}
        position={{ x: 0, y: 0 }}
        zoom={1}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId('inline-text-editor')).toBeInTheDocument();
  });

  it('displays the layer text in the textarea', () => {
    render(
      <InlineTextEditor
        layer={sampleLayer}
        position={{ x: 0, y: 0 }}
        zoom={1}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const textarea = screen.getByTestId('inline-text-editor').querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect(textarea!.value).toBe('Hello World');
  });

  it('has orange border on the textarea', () => {
    render(
      <InlineTextEditor
        layer={sampleLayer}
        position={{ x: 0, y: 0 }}
        zoom={1}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const textarea = screen.getByTestId('inline-text-editor').querySelector('textarea');
    expect(textarea!.style.border).toContain('rgb(255, 102, 0)');
  });

  it('calls onCommit with Ctrl+Enter', () => {
    const onCommit = vi.fn();
    render(
      <InlineTextEditor
        layer={sampleLayer}
        position={{ x: 0, y: 0 }}
        zoom={1}
        onCommit={onCommit}
        onCancel={vi.fn()}
      />,
    );
    const textarea = screen.getByTestId('inline-text-editor').querySelector('textarea')!;

    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    expect(onCommit).toHaveBeenCalledWith('text-1', 'Hello World');
  });

  it('calls onCancel with Escape', () => {
    const onCancel = vi.fn();
    render(
      <InlineTextEditor
        layer={sampleLayer}
        position={{ x: 0, y: 0 }}
        zoom={1}
        onCommit={vi.fn()}
        onCancel={onCancel}
      />,
    );
    const textarea = screen.getByTestId('inline-text-editor').querySelector('textarea')!;

    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('applies zoom to positioning', () => {
    render(
      <InlineTextEditor
        layer={sampleLayer}
        position={{ x: 10, y: 20 }}
        zoom={2}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const editor = screen.getByTestId('inline-text-editor');
    // x = 10 + 50*2 = 110, y = 20 + 100*2 = 220
    expect(editor.style.left).toBe('110px');
    expect(editor.style.top).toBe('220px');
    // width = 200*2 = 400, height = 60*2 = 120
    expect(editor.style.width).toBe('400px');
    expect(editor.style.height).toBe('120px');
  });

  it('applies rotation transform when layer is rotated', () => {
    const rotatedLayer = { ...sampleLayer, rotation: 45 };
    render(
      <InlineTextEditor
        layer={rotatedLayer}
        position={{ x: 0, y: 0 }}
        zoom={1}
        onCommit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const editor = screen.getByTestId('inline-text-editor');
    expect(editor.style.transform).toBe('rotate(45deg)');
  });
});
