// Command system type definitions.

export type CommandCategory =
  | 'file'
  | 'edit'
  | 'layer'
  | 'arrange'
  | 'group'
  | 'transform'
  | 'align'
  | 'view'
  | 'ai'
  | 'video';

export interface Command {
  name: string;
  execute: (...args: any[]) => void;
  canExecute: () => boolean;
  shortcut?: string;
  category: CommandCategory;
}
