import { useState } from 'react';
import { Icon } from '../../common/Icon';
import { ColorSwatch } from '../../common/ColorSwatch';
import { ColorPickerWindow } from '../../Dialogs/ColorPickerWindow';
import { useDocumentStore } from '../../../stores/documentStore';
import { useSettingsStore } from '../../../settings/settingsStore';
import {
  mdiExport,
  mdiPlus,
  mdiFolderPlusOutline,
  mdiContentDuplicate,
  mdiArrangeBringForward,
  mdiArrangeSendBackward,
  mdiGroup,
  mdiUngroup,
  mdiTrashCanOutline,
} from '@mdi/js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LayerFooterBarProps {
  onExport?: () => void;
  onNewLayer?: () => void;
  onNewGroup?: () => void;
  onDuplicate?: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onDelete?: () => void;
}

// ---------------------------------------------------------------------------
// Button definition
// ---------------------------------------------------------------------------

interface FooterButton {
  testId: string;
  title: string;
  icon: string;
  bg?: string;
  color?: string;
  handler: keyof LayerFooterBarProps;
}

const BUTTONS: FooterButton[] = [
  { testId: 'layer-btn-export', title: 'Export', icon: mdiExport, bg: 'var(--accent-orange)', color: '#FFFFFF', handler: 'onExport' },
  { testId: 'layer-btn-new-layer', title: 'New Layer', icon: mdiPlus, handler: 'onNewLayer' },
  { testId: 'layer-btn-new-group', title: 'New Group', icon: mdiFolderPlusOutline, handler: 'onNewGroup' },
  { testId: 'layer-btn-duplicate', title: 'Duplicate', icon: mdiContentDuplicate, handler: 'onDuplicate' },
  { testId: 'layer-btn-bring-forward', title: 'Bring Forward', icon: mdiArrangeBringForward, handler: 'onBringForward' },
  { testId: 'layer-btn-send-backward', title: 'Send Backward', icon: mdiArrangeSendBackward, handler: 'onSendBackward' },
  { testId: 'layer-btn-group', title: 'Group', icon: mdiGroup, handler: 'onGroup' },
  { testId: 'layer-btn-ungroup', title: 'Ungroup', icon: mdiUngroup, handler: 'onUngroup' },
  { testId: 'layer-btn-delete', title: 'Delete', icon: mdiTrashCanOutline, bg: undefined, color: '#FF5252', handler: 'onDelete' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LayerFooterBar(props: LayerFooterBarProps) {
  const backgroundColor = useDocumentStore((s) => s.project.backgroundColor);
  const setBackgroundColor = useDocumentStore((s) => s.setBackgroundColor);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const handleBgColorOk = (color: string) => {
    setBackgroundColor(color);
    // Persist to settings for next run
    useSettingsStore.getState().setSetting('canvas.defaultBackground', color);
    setColorPickerOpen(false);
  };

  return (
    <>
      <div
        data-testid="layer-footer"
        className="flex shrink-0 items-center gap-0.5 border-t px-1 py-1"
        style={{
          backgroundColor: 'var(--toolbar-bg)',
          borderColor: 'var(--border-color)',
        }}
      >
        {BUTTONS.map((btn) => {
          const handler = props[btn.handler] as (() => void) | undefined;
          return (
            <button
              key={btn.testId}
              type="button"
              data-testid={btn.testId}
              title={btn.title}
              className="flex shrink-0 cursor-pointer items-center justify-center rounded-sm border-none outline-none"
              style={{
                width: 28,
                height: 28,
                backgroundColor: btn.bg ?? 'transparent',
              }}
              onClick={(e) => {
                e.stopPropagation();
                handler?.();
              }}
            >
              <Icon
                path={btn.icon}
                size={14}
                color={btn.color ?? 'var(--text-secondary)'}
              />
            </button>
          );
        })}

        {/* Spacer to push background swatch to the right */}
        <div className="flex-1" />

        {/* Canvas background color swatch */}
        <ColorSwatch
          color={backgroundColor}
          size={22}
          label="canvas-bg"
          onClick={() => setColorPickerOpen(true)}
        />
      </div>

      {/* Color picker dialog for canvas background */}
      <ColorPickerWindow
        open={colorPickerOpen}
        onOpenChange={setColorPickerOpen}
        initialColor={backgroundColor}
        onOk={handleBgColorOk}
        onCancel={() => setColorPickerOpen(false)}
        onColorChange={(color) => setBackgroundColor(color)}
      />
    </>
  );
}

export default LayerFooterBar;
