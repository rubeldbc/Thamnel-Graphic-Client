import * as Menubar from '@radix-ui/react-menubar';
import { MenuBarItem } from './MenuBarItem';
import type { MenuItemDef } from './MenuBarItem';
import { getCommand } from '../../commands/useCommand';
import { useUiStore } from '../../stores/uiStore';
import { useDocumentStore } from '../../stores/documentStore';
import {
  mdiFileOutline,
  mdiFolderOpenOutline,
  mdiContentSave,
  mdiContentSaveAll,
  mdiImport,
  mdiExport,
  mdiHistory,
  mdiCog,
  mdiUndo,
  mdiRedo,
  mdiContentCut,
  mdiContentCopy,
  mdiContentPaste,
  mdiContentDuplicate,
  mdiDeleteOutline,
  mdiSelectAll,
  mdiSelectionOff,
  mdiMagnifyPlus,
  mdiMagnifyMinus,
  mdiMagnify,
  mdiFitToScreen,
  mdiGrid,
  mdiGridOff,
  mdiEyeOutline,
  mdiLayersPlus,
  mdiFolderPlusOutline,
  mdiFormatText,
  mdiShapeOutline,
  mdiCalendarClock,
  mdiLayersTriple,
  mdiLock,
  mdiFlipHorizontal,
  mdiFlipVertical,
  mdiRotateRight,
  mdiArrowExpandAll,
  mdiArrowExpandHorizontal,
  mdiArrowExpandVertical,
  mdiCreation,
  mdiImageRemoveOutline,
  mdiCursorDefaultOutline,
  mdiEraserVariant,
  mdiBlur,
  mdiImageMultipleOutline,
  mdiBugOutline,
  mdiInformation,
  mdiDistributeHorizontalCenter,
  mdiDistributeVerticalCenter,
  mdiExportVariant,
  mdiLinkVariant,
} from '@mdi/js';

// ---------------------------------------------------------------------------
// Command execution helper
// ---------------------------------------------------------------------------

function exec(commandName: string, ...args: unknown[]) {
  return () => {
    const cmd = getCommand(commandName);
    if (cmd && cmd.canExecute()) {
      cmd.execute(...args);
    }
  };
}

// ---------------------------------------------------------------------------
// Menu definitions (wired to commands)
// ---------------------------------------------------------------------------

const fileMenu: MenuItemDef[] = [
  { type: 'item', label: 'New Project', shortcut: 'Ctrl+N', icon: mdiFileOutline, onSelect: exec('newProject') },
  { type: 'item', label: 'Open Project', shortcut: 'Ctrl+O', icon: mdiFolderOpenOutline, onSelect: exec('openProject') },
  { type: 'separator' },
  { type: 'item', label: 'Save', shortcut: 'Ctrl+S', icon: mdiContentSave, onSelect: exec('saveProject') },
  { type: 'item', label: 'Save As', shortcut: 'Ctrl+Shift+S', icon: mdiContentSaveAll, onSelect: exec('saveProjectAs') },
  { type: 'item', label: 'Save Copy', onSelect: exec('saveCopy') },
  { type: 'item', label: 'Save as Template', onSelect: () => { /* placeholder: save as template */ } },
  { type: 'separator' },
  {
    type: 'sub',
    label: 'Import',
    icon: mdiImport,
    children: [
      { type: 'item', label: 'Image...', shortcut: 'Ctrl+I', onSelect: exec('importImage') },
      { type: 'item', label: 'Video...', onSelect: exec('importVideo') },
      { type: 'item', label: 'SVG...', shortcut: 'Ctrl+Shift+I', onSelect: exec('importSvg') },
      { type: 'item', label: 'Project...', onSelect: exec('importLayersFromProject') },
    ],
  },
  {
    type: 'sub',
    label: 'Export',
    icon: mdiExport,
    children: [
      { type: 'item', label: 'Export Image...', shortcut: 'Ctrl+E', onSelect: exec('exportImage') },
      { type: 'item', label: 'Export as SVG...', shortcut: 'Ctrl+Alt+S', onSelect: exec('exportSvg') },
      { type: 'item', label: 'Export as Photoshop File...', shortcut: 'Ctrl+Alt+P', onSelect: exec('exportPsd') },
      { type: 'item', label: 'Export Layer', shortcut: 'Ctrl+Shift+E', icon: mdiExportVariant, onSelect: exec('quickExportLayer') },
      { type: 'separator' },
      { type: 'item', label: 'Batch Image Producer...', onSelect: () => useUiStore.getState().setActiveDialog('batchProducer') },
    ],
  },
  { type: 'separator' },
  {
    type: 'sub',
    label: 'Recent Files',
    icon: mdiHistory,
    children: [
      { type: 'item', label: 'Project Files', disabled: true },
      { type: 'item', label: 'Template Files', disabled: true },
      { type: 'item', label: 'Local Image Files', disabled: true },
      { type: 'item', label: 'Gallery Images', disabled: true },
      { type: 'item', label: 'Online Images', disabled: true },
    ],
  },
  { type: 'separator' },
  { type: 'item', label: 'Settings', icon: mdiCog, onSelect: () => useUiStore.getState().setActiveDialog('settings') },
];

const editMenu: MenuItemDef[] = [
  { type: 'item', label: 'Undo', shortcut: 'Ctrl+Z', icon: mdiUndo, onSelect: exec('undo') },
  { type: 'item', label: 'Redo', shortcut: 'Ctrl+Y', icon: mdiRedo, onSelect: exec('redo') },
  { type: 'separator' },
  { type: 'item', label: 'Cut', shortcut: 'Ctrl+X', icon: mdiContentCut, onSelect: exec('cutLayer') },
  { type: 'item', label: 'Copy', shortcut: 'Ctrl+C', icon: mdiContentCopy, onSelect: exec('copyLayer') },
  { type: 'item', label: 'Paste', shortcut: 'Ctrl+V', icon: mdiContentPaste, onSelect: exec('pasteLayer') },
  { type: 'separator' },
  { type: 'item', label: 'Duplicate', shortcut: 'Ctrl+D', icon: mdiContentDuplicate, onSelect: exec('duplicateLayer') },
  { type: 'item', label: 'Delete', shortcut: 'Delete', icon: mdiDeleteOutline, onSelect: exec('deleteLayer') },
  { type: 'item', label: 'Select All', shortcut: 'Ctrl+A', icon: mdiSelectAll, onSelect: exec('selectAll') },
  { type: 'item', label: 'Deselect', shortcut: 'Esc', icon: mdiSelectionOff, onSelect: exec('deselect') },
];

const viewMenu: MenuItemDef[] = [
  { type: 'item', label: 'Zoom In', shortcut: 'Ctrl++', icon: mdiMagnifyPlus, onSelect: exec('zoomIn') },
  { type: 'item', label: 'Zoom Out', shortcut: 'Ctrl+-', icon: mdiMagnifyMinus, onSelect: exec('zoomOut') },
  { type: 'item', label: 'Original Size', shortcut: 'Ctrl+0', icon: mdiMagnify, onSelect: exec('originalSize') },
  { type: 'item', label: 'Fit to Screen', shortcut: 'Ctrl+1', icon: mdiFitToScreen, onSelect: () => {
    const ui = useUiStore.getState();
    const { canvasWidth, canvasHeight } = useDocumentStore.getState().project;
    const vw = window.innerWidth - 400;
    const vh = window.innerHeight - 200;
    const scale = Math.min(vw / canvasWidth, vh / canvasHeight, 1.0);
    ui.setZoom(Math.max(0.1, scale));
  }},
  { type: 'separator' },
  { type: 'item', label: 'Zoom 200%', shortcut: 'Ctrl+2', onSelect: () => useUiStore.getState().setZoom(2.0) },
  { type: 'item', label: 'Zoom 300%', shortcut: 'Ctrl+3', onSelect: () => useUiStore.getState().setZoom(3.0) },
  { type: 'item', label: 'Zoom 400%', shortcut: 'Ctrl+4', onSelect: () => useUiStore.getState().setZoom(4.0) },
  { type: 'item', label: 'Zoom 500%', shortcut: 'Ctrl+5', onSelect: () => useUiStore.getState().setZoom(5.0) },
  { type: 'separator' },
  { type: 'item', label: 'Show Grid', shortcut: 'F', icon: mdiGrid, onSelect: exec('toggleGrid') },
  { type: 'item', label: 'Show Items Outside Canvas', icon: mdiEyeOutline, onSelect: () => { /* placeholder: toggle canvas overflow visibility */ } },
  { type: 'item', label: 'Clear Marker Grid', icon: mdiGridOff, onSelect: () => { /* placeholder: clear marker grid */ } },
  { type: 'separator' },
  {
    type: 'sub',
    label: 'Canvas Size',
    children: [
      { type: 'item', label: '(placeholder)', disabled: true },
    ],
  },
  {
    type: 'sub',
    label: 'Layout Presets',
    children: [
      { type: 'item', label: '(placeholder)', disabled: true },
    ],
  },
];

const layerMenu: MenuItemDef[] = [
  { type: 'item', label: 'New Empty Layer', shortcut: 'Ctrl+Shift+N', icon: mdiLayersPlus, onSelect: exec('addNewLayer') },
  { type: 'item', label: 'New Group', icon: mdiFolderPlusOutline, onSelect: exec('addNewGroup') },
  { type: 'item', label: 'Add Text', shortcut: 'T', icon: mdiFormatText, onSelect: exec('addText') },
  { type: 'item', label: 'Add Shape', shortcut: 'R', icon: mdiShapeOutline, onSelect: exec('addShape') },
  { type: 'item', label: 'Add Date Stamp', icon: mdiCalendarClock, onSelect: () => { /* placeholder: add date stamp layer */ } },
  { type: 'separator' },
  { type: 'item', label: 'Duplicate', shortcut: 'Ctrl+D', icon: mdiContentDuplicate, onSelect: exec('duplicateLayer') },
  { type: 'item', label: 'Delete', shortcut: 'Del', icon: mdiDeleteOutline, onSelect: exec('deleteLayer') },
  { type: 'item', label: 'Merge Down', shortcut: 'Ctrl+M', icon: mdiLayersTriple, onSelect: exec('mergeDown') },
  { type: 'item', label: 'Rasterize', onSelect: exec('rasterize') },
  { type: 'separator' },
  { type: 'item', label: 'Lock / Unlock', shortcut: 'Ctrl+L', icon: mdiLock, onSelect: exec('lockLayer') },
  { type: 'item', label: 'Toggle Visibility', shortcut: 'H', icon: mdiEyeOutline, onSelect: exec('toggleVisibility') },
  { type: 'separator' },
  {
    type: 'sub',
    label: 'Arrange',
    children: [
      { type: 'item', label: 'Bring to Front', shortcut: 'Ctrl+Shift+]', onSelect: exec('bringToFront') },
      { type: 'item', label: 'Bring Forward', shortcut: 'Ctrl+]', onSelect: exec('bringForward') },
      { type: 'item', label: 'Send Backward', shortcut: 'Ctrl+[', onSelect: exec('sendBackward') },
      { type: 'item', label: 'Send to Back', shortcut: 'Ctrl+Shift+[', onSelect: exec('sendToBack') },
    ],
  },
  {
    type: 'sub',
    label: 'Group',
    children: [
      { type: 'item', label: 'Group', shortcut: 'Ctrl+G', onSelect: exec('group') },
      { type: 'item', label: 'Ungroup', shortcut: 'Ctrl+Shift+G', onSelect: exec('ungroup') },
      { type: 'item', label: 'Release from Group', shortcut: 'Ctrl+Shift+R', icon: mdiLinkVariant, onSelect: exec('releaseFromGroup') },
    ],
  },
  {
    type: 'sub',
    label: 'Align',
    children: [
      { type: 'item', label: 'Align Left', onSelect: exec('alignLeft') },
      { type: 'item', label: 'Align Center', onSelect: exec('alignCenter') },
      { type: 'item', label: 'Align Right', onSelect: exec('alignRight') },
      { type: 'separator' },
      { type: 'item', label: 'Align Top', onSelect: exec('alignTop') },
      { type: 'item', label: 'Align Middle', onSelect: exec('alignMiddle') },
      { type: 'item', label: 'Align Bottom', onSelect: exec('alignBottom') },
      { type: 'separator' },
      { type: 'item', label: 'Distribute Horizontally', icon: mdiDistributeHorizontalCenter, onSelect: exec('distributeHorizontally') },
      { type: 'item', label: 'Distribute Vertically', icon: mdiDistributeVerticalCenter, onSelect: exec('distributeVertically') },
    ],
  },
];

const imageMenu: MenuItemDef[] = [
  { type: 'item', label: 'Flip Horizontal', shortcut: 'Ctrl+H', icon: mdiFlipHorizontal, onSelect: exec('flipHorizontal') },
  { type: 'item', label: 'Flip Vertical', shortcut: 'Ctrl+Shift+H', icon: mdiFlipVertical, onSelect: exec('flipVertical') },
  { type: 'item', label: 'Rotate 90\u00B0', shortcut: 'Ctrl+R', icon: mdiRotateRight, onSelect: exec('rotate90') },
  { type: 'separator' },
  { type: 'item', label: 'Fit to Canvas', shortcut: 'Ctrl+F', icon: mdiArrowExpandAll, onSelect: exec('fitToCanvas') },
  { type: 'item', label: 'Fit Width', shortcut: 'Ctrl+Shift+F', icon: mdiArrowExpandHorizontal, onSelect: exec('fitWidth') },
  { type: 'item', label: 'Fit Height', shortcut: 'Ctrl+Alt+Shift+F', icon: mdiArrowExpandVertical, onSelect: exec('fitHeight') },
  { type: 'separator' },
  { type: 'item', label: 'AI Enhance Image', icon: mdiCreation, onSelect: exec('enhanceImage') },
  { type: 'item', label: 'AI Remove Background', icon: mdiImageRemoveOutline, onSelect: exec('removeBackground') },
];

const toolsMenu: MenuItemDef[] = [
  { type: 'item', label: 'Select Tool', shortcut: 'V', icon: mdiCursorDefaultOutline, onSelect: exec('setTool', 'select') },
  { type: 'item', label: 'Eraser Tool', shortcut: 'B', icon: mdiEraserVariant, onSelect: exec('setTool', 'eraser') },
  { type: 'item', label: 'Blur Brush', shortcut: 'J', icon: mdiBlur, onSelect: exec('setTool', 'blurBrush') },
  { type: 'separator' },
  { type: 'item', label: 'Eraser Settings...', icon: mdiCog, onSelect: () => useUiStore.getState().setActiveDialog('eraserSettings') },
  { type: 'item', label: 'Blur Brush Settings...', icon: mdiCog, onSelect: () => useUiStore.getState().setActiveDialog('blurBrushSettings') },
];

const windowMenu: MenuItemDef[] = [
  { type: 'item', label: 'Image Gallery', shortcut: 'G', icon: mdiImageMultipleOutline, onSelect: () => useUiStore.getState().toggleLeftPanelTab('IMAGE') },
  { type: 'item', label: 'Debug Log', icon: mdiBugOutline, onSelect: () => useUiStore.getState().setActiveDialog('debugLog') },
];

const helpMenu: MenuItemDef[] = [
  { type: 'item', label: 'About Thamnel', icon: mdiInformation, onSelect: () => useUiStore.getState().setActiveDialog('about') },
];

// ---------------------------------------------------------------------------
// Menu structure
// ---------------------------------------------------------------------------

interface MenuDef {
  label: string;
  items: MenuItemDef[];
}

const menus: MenuDef[] = [
  { label: 'File', items: fileMenu },
  { label: 'Edit', items: editMenu },
  { label: 'View', items: viewMenu },
  { label: 'Layer', items: layerMenu },
  { label: 'Image', items: imageMenu },
  { label: 'Tools', items: toolsMenu },
  { label: 'Window', items: windowMenu },
  { label: 'Help', items: helpMenu },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Full application menu bar built on @radix-ui/react-menubar.
 * Contains 8 top-level menus: File, Edit, View, Layer, Image, Tools, Window, Help.
 */
export function MenuBar() {
  return (
    <Menubar.Root
      data-testid="menubar"
      className="flex h-full items-center"
      style={{
        backgroundColor: 'var(--panel-bg)',
        borderBottom: '1px solid var(--border-color)',
        fontSize: '13px',
      }}
    >
      {menus.map((menu) => (
        <Menubar.Menu key={menu.label}>
          <Menubar.Trigger
            className="cursor-default px-3 py-1 text-[13px] outline-none select-none data-[highlighted]:bg-[var(--hover-bg)] data-[state=open]:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-primary)' }}
            data-testid={`menubar-trigger-${menu.label.toLowerCase()}`}
          >
            {menu.label}
          </Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Content
              className="z-50 min-w-[220px] rounded-md border p-1 shadow-lg"
              style={{
                backgroundColor: 'var(--panel-bg)',
                borderColor: 'var(--border-color)',
              }}
              sideOffset={2}
              align="start"
            >
              {menu.items.map((item, i) => (
                <MenuBarItem key={`${item.label ?? 'sep'}-${i}`} def={item} />
              ))}
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>
      ))}
    </Menubar.Root>
  );
}

export default MenuBar;
