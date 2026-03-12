// ---------------------------------------------------------------------------
// ShortcutManager -- Centralised keyboard-shortcut registry (singleton)
// ---------------------------------------------------------------------------

/** Valid shortcut categories. */
export type ShortcutCategory = 'file' | 'edit' | 'view' | 'layer' | 'tool' | 'navigation';

/** A single registered shortcut entry. */
export interface ShortcutEntry {
  /** Normalised combo string, e.g. "Ctrl+Shift+S" or "V". */
  combo: string;
  /** Callback invoked when the shortcut fires. */
  action: () => void;
  /** Human-readable description. */
  description: string;
  /** Logical category for grouping. */
  category: ShortcutCategory;
  /** Whether this shortcut is currently enabled (default true). */
  enabled: boolean;
}

export interface RegisterOptions {
  description: string;
  category: ShortcutCategory;
}

// ---------------------------------------------------------------------------
// Normalisation helper
// ---------------------------------------------------------------------------

/**
 * Normalise a combo string so that modifier order is always
 * Ctrl+Shift+Alt+<Key> and the key is capitalised.
 */
export function normalizeCombo(raw: string): string {
  const parts = raw.split('+').map((p) => p.trim());
  const modifiers: string[] = [];
  let key = '';

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'ctrl' || lower === 'control') {
      if (!modifiers.includes('Ctrl')) modifiers.push('Ctrl');
    } else if (lower === 'shift') {
      if (!modifiers.includes('Shift')) modifiers.push('Shift');
    } else if (lower === 'alt') {
      if (!modifiers.includes('Alt')) modifiers.push('Alt');
    } else {
      // The non-modifier key
      key = part.length === 1 ? part.toUpperCase() : part;
    }
  }

  // Canonical modifier order
  const order = ['Ctrl', 'Shift', 'Alt'];
  modifiers.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return [...modifiers, key].join('+');
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ShortcutManager {
  private registry = new Map<string, ShortcutEntry>();
  private disabledGroups = new Set<ShortcutCategory>();

  /** Register a shortcut. Overwrites any existing binding for the same combo. */
  register(combo: string, action: () => void, opts: RegisterOptions): void {
    const normalised = normalizeCombo(combo);
    this.registry.set(normalised, {
      combo: normalised,
      action,
      description: opts.description,
      category: opts.category,
      enabled: true,
    });
  }

  /** Remove a shortcut by combo. */
  unregister(combo: string): void {
    this.registry.delete(normalizeCombo(combo));
  }

  /** Trigger the action bound to `combo`. Returns true if handled. */
  trigger(combo: string): boolean {
    const normalised = normalizeCombo(combo);
    const entry = this.registry.get(normalised);
    if (!entry) return false;
    if (!entry.enabled) return false;
    if (this.disabledGroups.has(entry.category)) return false;
    entry.action();
    return true;
  }

  /** Return all registered shortcuts. */
  getAll(): ShortcutEntry[] {
    return Array.from(this.registry.values());
  }

  /** Return shortcuts belonging to a specific category. */
  getByCategory(category: ShortcutCategory): ShortcutEntry[] {
    return this.getAll().filter((e) => e.category === category);
  }

  /** Disable an entire category of shortcuts. */
  disableGroup(category: ShortcutCategory): void {
    this.disabledGroups.add(category);
  }

  /** Enable a previously-disabled category. */
  enableGroup(category: ShortcutCategory): void {
    this.disabledGroups.delete(category);
  }

  /** Check whether a category group is enabled. */
  isGroupEnabled(category: ShortcutCategory): boolean {
    return !this.disabledGroups.has(category);
  }

  /** Remove all registered shortcuts and reset disabled groups. */
  reset(): void {
    this.registry.clear();
    this.disabledGroups.clear();
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const shortcutManager = new ShortcutManager();
