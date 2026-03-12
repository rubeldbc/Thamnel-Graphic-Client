import { useMemo } from 'react';
import type { Command } from './types';
import { fileCommands } from './fileCommands';
import { editCommands } from './editCommands';
import { layerCommands } from './layerCommands';
import { arrangeCommands } from './arrangeCommands';
import { groupCommands } from './groupCommands';
import { transformCommands } from './transformCommands';
import { alignCommands } from './alignCommands';
import { viewCommands } from './viewCommands';
import { aiCommands } from './aiCommands';
import { videoCommands } from './videoCommands';

// ---------------------------------------------------------------------------
// Registry – built once at module load
// ---------------------------------------------------------------------------

const allCommands: Command[] = [
  ...fileCommands,
  ...editCommands,
  ...layerCommands,
  ...arrangeCommands,
  ...groupCommands,
  ...transformCommands,
  ...alignCommands,
  ...viewCommands,
  ...aiCommands,
  ...videoCommands,
];

const commandMap = new Map<string, Command>();
for (const cmd of allCommands) {
  commandMap.set(cmd.name, cmd);
}

/** Get a command by name (non-hook usage, e.g. tests). */
export function getCommand(name: string): Command | undefined {
  return commandMap.get(name);
}

/** Get the full registry map (non-hook usage). */
export function getCommandRegistry(): Map<string, Command> {
  return commandMap;
}

// ---------------------------------------------------------------------------
// React hooks
// ---------------------------------------------------------------------------

/**
 * Returns `{ execute, canExecute, shortcut }` for a single command by name.
 * Throws if the command does not exist in the registry.
 */
export function useCommand(commandName: string) {
  return useMemo(() => {
    const cmd = commandMap.get(commandName);
    if (!cmd) {
      throw new Error(`[useCommand] unknown command: "${commandName}"`);
    }
    return {
      execute: cmd.execute,
      canExecute: cmd.canExecute,
      shortcut: cmd.shortcut,
    };
  }, [commandName]);
}

/**
 * Returns the entire command map for iteration / palette UI.
 */
export function useCommandRegistry() {
  return useMemo(() => commandMap, []);
}
