// TypeScript IPC wrapper for the Rust GPU render engine and hit-testing.
//
// Phase 2: render_frame and export_render commands.
// Phase 3: hit_test, hit_test_all, marquee_select commands.

// ---------------------------------------------------------------------------
// Tauri invoke helper
// ---------------------------------------------------------------------------

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ViewportParams {
  width: number;
  height: number;
  zoom: number;
  scrollX: number;
  scrollY: number;
}

export interface SelectionParams {
  selectedIds: string[];
}

// ---------------------------------------------------------------------------
// Render bridge commands
// ---------------------------------------------------------------------------

/**
 * Render the current document and return RGBA pixel data as a base64 string.
 * The caller can decode this into an ImageData for canvas display.
 */
export async function renderFrame(
  viewport: ViewportParams,
  selection: SelectionParams
): Promise<string> {
  return invoke<string>('render_frame', { viewport, selection });
}

/**
 * Export the current document to encoded image bytes (PNG or JPEG).
 * Returns raw bytes as a number array.
 */
export async function exportRender(
  width: number,
  height: number,
  format: 'png' | 'jpeg' = 'png'
): Promise<number[]> {
  return invoke<number[]>('export_render', { width, height, format });
}

// ---------------------------------------------------------------------------
// Hit-testing bridge commands (Phase 3)
// ---------------------------------------------------------------------------

/**
 * Hit-test at a canvas-space point. Returns the UUID of the topmost hit node,
 * or null if nothing was hit. Uses shape-precise testing for shape nodes.
 */
export async function hitTest(x: number, y: number): Promise<string | null> {
  return invoke<string | null>('hit_test', { x, y });
}

/**
 * Hit-test at a canvas-space point. Returns UUIDs of ALL hit nodes
 * ordered top-to-bottom.
 */
export async function hitTestAll(x: number, y: number): Promise<string[]> {
  return invoke<string[]>('hit_test_all', { x, y });
}

/**
 * Marquee-select: find all nodes whose bounding box intersects the given
 * rectangle (in canvas coordinates).
 */
export async function marqueeSelect(
  x: number,
  y: number,
  w: number,
  h: number
): Promise<string[]> {
  return invoke<string[]>('marquee_select', { x, y, w, h });
}
