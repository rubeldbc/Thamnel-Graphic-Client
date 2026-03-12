import * as ScrollArea from '@radix-ui/react-scroll-area';
import { TemplateItem, type TemplateData } from './TemplateItem';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TemplatesTabProps {
  /** List of saved templates. */
  templates?: TemplateData[];
  /** Fires when the user double-clicks a template to load it. */
  onLoadTemplate?: (id: string) => void;
  /** Fires when the user chooses "Update with Current Project". */
  onUpdateTemplate?: (id: string) => void;
  /** Fires when the user chooses "Delete Template". */
  onDeleteTemplate?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TemplatesTab({
  templates = [],
  onLoadTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
}: TemplatesTabProps) {
  return (
    <div
      data-testid="templates-tab"
      className="flex h-full flex-col"
      style={{ backgroundColor: 'var(--panel-bg)' }}
    >
      {/* Scrollable template list */}
      <ScrollArea.Root className="min-h-0 flex-1" type="auto">
        <ScrollArea.Viewport className="h-full w-full">
          {templates.length === 0 ? (
            <div
              data-testid="templates-empty"
              className="flex h-full items-center justify-center"
              style={{ color: 'var(--text-disabled)', fontSize: 12, minHeight: 60 }}
            >
              No templates saved
            </div>
          ) : (
            <div className="flex flex-col py-0.5">
              {templates.map((template) => (
                <TemplateItem
                  key={template.id}
                  template={template}
                  onDoubleClick={onLoadTemplate}
                  onUpdate={onUpdateTemplate}
                  onDelete={onDeleteTemplate}
                />
              ))}
            </div>
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          orientation="vertical"
          className="flex w-2 touch-none p-[1px] select-none"
        >
          <ScrollArea.Thumb
            className="relative flex-1 rounded-full"
            style={{ backgroundColor: 'var(--border-color)' }}
          />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}

export default TemplatesTab;
