// TypeScript IPC wrapper for the Rust GPU render engine.
//
// Phase 2: calls the render_frame and export_render commands in render_bridge.rs.

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
