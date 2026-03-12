import { useCallback, type MouseEvent } from 'react';
import {
  mdiCursorDefault,
  mdiFormatText,
  mdiShapeOutline,
  mdiEraser,
  mdiBlurRadial,
  mdiAlignHorizontalLeft,
  mdiDistributeHorizontalCenter,
  mdiCalendarClock,
  mdiImagePlus,
  mdiCreation,
  mdiFlipHorizontal,
  mdiFlipVertical,
  mdiRotateRight,
} from '@mdi/js';
import { ToolToggleButton } from './ToolToggleButton';
import { ShapePickerPopup } from './ShapePickerPopup';
import { AlignPopup } from './AlignPopup';
import { DistributePopup } from './DistributePopup';
import { FillStrokeSwatches } from './FillStrokeSwatches';
import { useUiStore } from '../../stores/uiStore';
import { useDocumentStore } from '../../stores/documentStore';
import { getCommand } from '../../commands/useCommand';
import type { ActiveTool } from '../../types/index';

/* ------------------------------------------------------------------ */
/*  Align / Distribute ID -> command mapping                           */
/* ------------------------------------------------------------------ */

const ALIGN_ID_TO_COMMAND: Record<string, string> = {
  'align-left': 'alignLeft',
  'align-center': 'alignCenter',
  'align-right': 'alignRight',
  'align-top': 'alignTop',
  'align-middle': 'alignMiddle',
  'align-bottom': 'alignBottom',
};

const DISTRIBUTE_ID_TO_COMMAND: Record<string, string> = {
  'dist-h-center': 'distributeHorizontally',
  'dist-v-center': 'distributeVertically',
  'dist-h-left': 'distributeLeftEdges',
  'dist-h-right': 'distributeRightEdges',
  'dist-v-top': 'distributeTopEdges',
  'dist-v-bottom': 'distributeBottomEdges',
};

/* ------------------------------------------------------------------ */
/*  Tool definitions                                                   */
/* ------------------------------------------------------------------ */

/**
 * Maps internal tool names to the ActiveTool values the uiStore expects.
 * Most match 1:1 except 'blur' -> 'blurBrush'.
 */
const TOOL_TO_ACTIVE: Record<string, ActiveTool> = {
  select: 'select',
  text: 'text',
  shape: 'shape',
  eraser: 'eraser',
  blur: 'blurBrush',
};

type ToolName = 'select' | 'text' | 'shape' | 'eraser' | 'blur';

interface ToolDef {
  name: ToolName;
  icon: string;
  tooltip: string;
  shortcut: string;
}

const TOOLS: ToolDef[] = [
  { name: 'select', icon: mdiCursorDefault, tooltip: 'Select (V)', shortcut: 'V' },
  { name: 'text', icon: mdiFormatText, tooltip: 'Text (T)', shortcut: 'T' },
  { name: 'shape', icon: mdiShapeOutline, tooltip: 'Shape (R)', shortcut: 'R' },
  { name: 'eraser', icon: mdiEraser, tooltip: 'Eraser (B)', shortcut: 'B' },
  { name: 'blur', icon: mdiBlurRadial, tooltip: 'Blur Brush (J)', shortcut: 'J' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function execCommand(name: string, ...args: unknown[]) {
  const cmd = getCommand(name);
  if (cmd && cmd.canExecute()) {
    cmd.execute(...args);
  }
}

/* ------------------------------------------------------------------ */
/*  Separator                                                          */
/* ------------------------------------------------------------------ */

function ToolbarSep() {
  return (
    <div
      className="my-1 shrink-0"
      style={{
        width: 28,
        height: 1,
        backgroundColor: 'var(--border-color)',
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Vertical left toolbar (48 px wide) containing tool toggles, shape picker,
 * action buttons, align/distribute popups, and fill/stroke swatches.
 * Matches the WPF original layout.
 */
export function LeftToolbar() {
  // Read the active tool from uiStore (single source of truth)
  const activeTool = useUiStore((s) => s.activeTool);

  // Read fill/stroke colours from the currently selected layer (if any).
  const fillColor = useDocumentStore((s) => {
    if (s.selectedLayerIds.length === 0) return '#FFFFFF';
    const layer = s.project.layers.find((l) => l.id === s.selectedLayerIds[0]);
    if (!layer) return '#FFFFFF';
    return layer.shapeProperties?.fillColor ?? layer.textProperties?.color ?? '#FFFFFF';
  });

  const strokeColor = useDocumentStore((s) => {
    if (s.selectedLayerIds.length === 0) return '#000000';
    const layer = s.project.layers.find((l) => l.id === s.selectedLayerIds[0]);
    if (!layer) return '#000000';
    return layer.shapeProperties?.borderColor ?? layer.textProperties?.strokeColor ?? '#000000';
  });

  const handleToolClick = useCallback((name: ToolName) => {
    const activeToolValue = TOOL_TO_ACTIVE[name] ?? 'select';
    useUiStore.getState().setActiveTool(activeToolValue);
  }, []);

  const handleRightClick = useCallback((e: MouseEvent) => {
    e.preventDefault();
    // Right-click settings will be implemented in a future phase.
  }, []);

  const handleShapeSelect = useCallback((shapeId: string) => {
    // Enter shape draw mode: set the shape type and switch to shape tool.
    // The actual shape will be created on canvas via marquee draw.
    const ui = useUiStore.getState();
    ui.setSelectedShapeType(shapeId as import('../../types/enums').ShapeType);
    ui.setActiveTool('shape');
  }, []);

  const handleAlign = useCallback((alignId: string) => {
    const cmdName = ALIGN_ID_TO_COMMAND[alignId];
    if (cmdName) {
      execCommand(cmdName);
    }
  }, []);

  const handleDistribute = useCallback((distributeId: string) => {
    const cmdName = DISTRIBUTE_ID_TO_COMMAND[distributeId];
    if (cmdName) {
      execCommand(cmdName);
    }
  }, []);

  const handleFillClick = useCallback(() => {
    useUiStore.getState().setActiveDialog('colorPicker:fill');
  }, []);

  const handleStrokeClick = useCallback(() => {
    useUiStore.getState().setActiveDialog('colorPicker:stroke');
  }, []);

  const handleDateStamp = useCallback(() => {
    execCommand('addDateStamp');
  }, []);

  const handleImportImage = useCallback(() => {
    execCommand('importImage');
  }, []);

  const handleImageStudio = useCallback(() => {
    execCommand('enhanceImage');
  }, []);

  const handleFlipH = useCallback(() => {
    execCommand('flipHorizontal');
  }, []);

  const handleFlipV = useCallback(() => {
    execCommand('flipVertical');
  }, []);

  const handleRotate90 = useCallback(() => {
    execCommand('rotate90');
  }, []);

  /**
   * Determine whether a toolbar tool button is "active" based on the
   * uiStore's activeTool value.
   */
  function isToolActive(toolName: ToolName): boolean {
    const expected = TOOL_TO_ACTIVE[toolName];
    return activeTool === expected;
  }

  return (
    <div
      data-testid="left-toolbar"
      className="flex h-full flex-col items-center py-1"
      style={{
        width: 48,
        backgroundColor: 'var(--toolbar-bg)',
        borderRight: '1px solid var(--border-color)',
      }}
    >
      {/* ---- Drawing / Selection Tools ---- */}
      {TOOLS.map((tool) => {
        // Shape tool gets wrapped in ShapePickerPopup
        if (tool.name === 'shape') {
          return (
            <ShapePickerPopup
              key={tool.name}
              trigger={
                <ToolToggleButton
                  icon={tool.icon}
                  toolName={tool.name}
                  isActive={isToolActive(tool.name)}
                  onClick={() => handleToolClick(tool.name)}
                  tooltip={tool.tooltip}
                />
              }
              onSelect={handleShapeSelect}
            />
          );
        }

        // Eraser and Blur have right-click handlers
        const hasRightClick = tool.name === 'eraser' || tool.name === 'blur';

        return (
          <ToolToggleButton
            key={tool.name}
            icon={tool.icon}
            toolName={tool.name}
            isActive={isToolActive(tool.name)}
            onClick={() => handleToolClick(tool.name)}
            onRightClick={hasRightClick ? handleRightClick : undefined}
            tooltip={tool.tooltip}
          />
        );
      })}

      {/* ---- Date Stamp ---- */}
      <ToolToggleButton
        icon={mdiCalendarClock}
        toolName="datestamp"
        tooltip="Date Stamp"
        onClick={handleDateStamp}
      />

      {/* ---- Import Image ---- */}
      <ToolToggleButton
        icon={mdiImagePlus}
        toolName="import-image"
        tooltip="Import Image (Ctrl+I)"
        onClick={handleImportImage}
      />

      <ToolbarSep />

      {/* ---- Image Studio / AI Tool ---- */}
      <ToolToggleButton
        icon={mdiCreation}
        toolName="image-studio"
        tooltip="Image Studio"
        onClick={handleImageStudio}
      />

      <ToolbarSep />

      {/* ---- Align popup ---- */}
      <AlignPopup
        trigger={
          <ToolToggleButton
            icon={mdiAlignHorizontalLeft}
            toolName="align"
            tooltip="Align"
          />
        }
        onAlign={handleAlign}
      />

      {/* ---- Distribute popup ---- */}
      <DistributePopup
        trigger={
          <ToolToggleButton
            icon={mdiDistributeHorizontalCenter}
            toolName="distribute"
            tooltip="Distribute"
          />
        }
        onDistribute={handleDistribute}
      />

      <ToolbarSep />

      {/* ---- Flip Horizontal ---- */}
      <ToolToggleButton
        icon={mdiFlipHorizontal}
        toolName="flip-h"
        tooltip="Flip Horizontal (Ctrl+H)"
        onClick={handleFlipH}
      />

      {/* ---- Flip Vertical ---- */}
      <ToolToggleButton
        icon={mdiFlipVertical}
        toolName="flip-v"
        tooltip="Flip Vertical (Ctrl+Shift+H)"
        onClick={handleFlipV}
      />

      {/* ---- Rotate 90° ---- */}
      <ToolToggleButton
        icon={mdiRotateRight}
        toolName="rotate-90"
        tooltip="Rotate 90° (Ctrl+R)"
        onClick={handleRotate90}
      />

      <ToolbarSep />

      {/* ---- Spacer pushes swatches to bottom ---- */}
      <div className="flex-1" />

      {/* ---- Fill / Stroke swatches ---- */}
      <div className="mb-2">
        <FillStrokeSwatches
          fillColor={fillColor}
          strokeColor={strokeColor}
          onFillClick={handleFillClick}
          onStrokeClick={handleStrokeClick}
        />
      </div>
    </div>
  );
}

export default LeftToolbar;
