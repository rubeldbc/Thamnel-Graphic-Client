import { useState, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClipboardLayer {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  parentGroupId?: string | null;
  depth?: number;
  childIds?: string[];
  superLocked?: boolean;
  [key: string]: unknown;
}

export interface ClipboardResult {
  /** Copy given layers into the internal clipboard (guards against super-locked). */
  copy: (layers: ClipboardLayer[], allLayers?: ClipboardLayer[]) => void;
  /** Paste layers from the internal clipboard, remapping IDs and offsetting. */
  paste: () => ClipboardLayer[];
  /** Paste from a system clipboard image (base64 data). */
  pasteImage: (imageData: string, width: number, height: number) => ClipboardLayer;
  /** Duplicate layers in-place: clone, new ID, unique name, offset +20,+20. */
  duplicate: (layers: ClipboardLayer[], allLayers: ClipboardLayer[]) => ClipboardLayer[];
  /** Whether the clipboard has content to paste. */
  canPaste: boolean;
}

/** Custom clipboard format identifier. */
export const CLIPBOARD_FORMAT = 'ThamneLayer';

/** Offset applied to pasted layers, in canvas pixels. */
const PASTE_OFFSET = 20;

/** Maximum nesting depth for groups on paste. */
const MAX_PASTE_DEPTH = 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a v4-ish UUID (good enough for layer IDs). */
export function generateClipboardId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Collect group descendants recursively.
 * Given a set of layers and the full layers list, returns the layers plus any
 * children (transitively) that belong to groups in the set.
 */
function collectGroupDescendants(
  layers: ClipboardLayer[],
  allLayers: ClipboardLayer[],
): ClipboardLayer[] {
  const ids = new Set(layers.map((l) => l.id)); void ids;
  const result = new Map<string, ClipboardLayer>();

  // Add the originally selected layers
  for (const l of layers) {
    result.set(l.id, l);
  }

  // Recursively add children of groups
  const addChildren = (parentId: string) => {
    for (const l of allLayers) {
      if (l.parentGroupId === parentId && !result.has(l.id)) {
        result.set(l.id, l);
        // Recurse if this child is also a group
        if (l.type === 'group') {
          addChildren(l.id);
        }
      }
    }
  };

  for (const l of layers) {
    if (l.type === 'group') {
      addChildren(l.id);
    }
  }

  return Array.from(result.values());
}

/**
 * Remap all IDs in a set of layers, preserving group hierarchy.
 * Returns cloned layers with new IDs and updated parentGroupId references.
 */
function remapIds(
  layers: ClipboardLayer[],
  offset: number,
): ClipboardLayer[] {
  // Build old-ID -> new-ID mapping
  const idMap = new Map<string, string>();
  for (const l of layers) {
    idMap.set(l.id, generateClipboardId());
  }

  return layers.map((layer) => {
    const cloned = JSON.parse(JSON.stringify(layer)) as ClipboardLayer;
    const newId = idMap.get(layer.id)!;
    cloned.id = newId;
    cloned.x = layer.x + offset;
    cloned.y = layer.y + offset;

    // Remap parentGroupId if the parent is in the set
    if (cloned.parentGroupId && idMap.has(cloned.parentGroupId)) {
      cloned.parentGroupId = idMap.get(cloned.parentGroupId)!;
    } else {
      // Parent not in copied set — detach from group
      cloned.parentGroupId = null;
    }

    // Remap childIds
    if (cloned.childIds && Array.isArray(cloned.childIds)) {
      cloned.childIds = cloned.childIds
        .filter((cid: string) => idMap.has(cid))
        .map((cid: string) => idMap.get(cid)!);
    }

    // Enforce max depth
    if (cloned.depth !== undefined && cloned.depth > MAX_PASTE_DEPTH) {
      cloned.depth = MAX_PASTE_DEPTH;
    }

    return cloned;
  });
}

/**
 * Check if a layer (or any ancestor) is super-locked.
 */
function isEffectivelySuperLocked(
  layer: ClipboardLayer,
  allLayers: ClipboardLayer[],
): boolean {
  if (layer.superLocked) return true;
  if (!layer.parentGroupId) return false;
  const parent = allLayers.find((l) => l.id === layer.parentGroupId);
  if (!parent) return false;
  return isEffectivelySuperLocked(parent, allLayers);
}

/**
 * Generate a unique name by appending " Copy" or " Copy (N)".
 */
function makeUniqueName(
  baseName: string,
  existingNames: Set<string>,
): string {
  const copyName = `${baseName} Copy`;
  if (!existingNames.has(copyName)) return copyName;

  let counter = 2;
  while (existingNames.has(`${baseName} Copy (${counter})`)) {
    counter++;
  }
  return `${baseName} Copy (${counter})`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Clipboard management for layer copy/paste.
 *
 * - Serialises selected layers to a custom "ThamneLayer" JSON format.
 * - On paste, remaps all IDs (new UUIDs) and offsets position by (20, 20).
 * - Tracks a paste counter so successive pastes cascade the offset.
 * - Guards against copying super-locked layers.
 * - Group copy includes all descendants recursively.
 * - Duplicate creates independent copies with unique names.
 * - Max depth 2 enforced on paste.
 */
export function useClipboard(): ClipboardResult {
  const bufferRef = useRef<ClipboardLayer[]>([]);
  const [canPaste, setCanPaste] = useState(false);
  const pasteCountRef = useRef(0);

  const copy = useCallback((layers: ClipboardLayer[], allLayers?: ClipboardLayer[]) => {
    if (layers.length === 0) return;

    // Guard: skip super-locked layers
    const all = allLayers ?? layers;
    const copyable = layers.filter((l) => !isEffectivelySuperLocked(l, all));
    if (copyable.length === 0) return;

    // Collect group descendants recursively
    const withDescendants = collectGroupDescendants(copyable, all);

    // Deep-clone via JSON roundtrip to sever references
    bufferRef.current = JSON.parse(JSON.stringify(withDescendants)) as ClipboardLayer[];
    pasteCountRef.current = 0;
    setCanPaste(true);
  }, []);

  const paste = useCallback((): ClipboardLayer[] => {
    if (bufferRef.current.length === 0) return [];

    pasteCountRef.current += 1;
    const offset = PASTE_OFFSET * pasteCountRef.current;

    return remapIds(bufferRef.current, offset);
  }, []);

  const pasteImage = useCallback((imageData: string, width: number, height: number): ClipboardLayer => {
    return {
      id: generateClipboardId(),
      type: 'image',
      name: 'Pasted Image',
      x: 0,
      y: 0,
      width,
      height,
      imageData,
    };
  }, []);

  const duplicate = useCallback((
    layers: ClipboardLayer[],
    allLayers: ClipboardLayer[],
  ): ClipboardLayer[] => {
    if (layers.length === 0) return [];

    // Collect group descendants
    const withDescendants = collectGroupDescendants(layers, allLayers);

    // Deep clone
    const cloned = JSON.parse(JSON.stringify(withDescendants)) as ClipboardLayer[];

    // Build existing name set
    const existingNames = new Set(allLayers.map((l) => l.name));

    // Remap all IDs
    const remapped = remapIds(cloned, PASTE_OFFSET);

    // Assign unique names (match by index since remapIds preserves order)
    for (let i = 0; i < remapped.length; i++) {
      const originalName = cloned[i].name;
      const uniqueName = makeUniqueName(originalName, existingNames);
      remapped[i].name = uniqueName;
      existingNames.add(uniqueName);
    }

    return remapped;
  }, []);

  return { copy, paste, pasteImage, duplicate, canPaste };
}
