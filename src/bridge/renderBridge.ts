// TypeScript IPC wrapper for the Rust GPU render engine and hit-testing.
//
// Binary IPC — raw RGBA ArrayBuffer with 32-byte header (no base64).
// Phase 2: render_frame_bin (binary) and export_render commands.
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

/**
 * Parsed render frame result with timing metadata and decoded pixel data.
 */
export interface RenderFrameResult {
  /** Rendered image width in pixels. */
  width: number;
  /** Rendered image height in pixels. */
  height: number;
  /** Rust-side GPU render time in microseconds. */
  renderTimeUs: number;
  /** Number of nodes in the document. */
  nodeCount: number;
  /** Resource preparation time in microseconds. */
  prepareUs: number;
  /** GPU readback time in microseconds. */
  readbackUs: number;
  /** Encode/transfer overhead in microseconds (0 for binary IPC). */
  encodeUs: number;
  /** Raw RGBA pixel data (width * height * 4 bytes). */
  pixels: Uint8ClampedArray;
}

// ---------------------------------------------------------------------------
// Binary header constants (must match Rust BIN_HEADER_SIZE = 32)
// ---------------------------------------------------------------------------

const HEADER_SIZE = 32;

// Header offsets (u32 little-endian):
//  0: width
//  4: height
//  8: render_time_us
// 12: node_count
// 16: prepare_us
// 20: readback_us
// 24: status (0=ok, 1=error)
// 28: reserved

/**
 * Parse the 32-byte binary header from a render_frame_bin response.
 */
function parseBinaryHeader(view: DataView) {
  return {
    width: view.getUint32(0, true),
    height: view.getUint32(4, true),
    renderTimeUs: view.getUint32(8, true),
    nodeCount: view.getUint32(12, true),
    prepareUs: view.getUint32(16, true),
    readbackUs: view.getUint32(20, true),
    status: view.getUint32(24, true),
  };
}

// ---------------------------------------------------------------------------
// Render bridge commands
// ---------------------------------------------------------------------------

/**
 * Render the current document via binary IPC.
 *
 * Rust returns a raw byte buffer: 32-byte header + RGBA pixel data.
 * No base64 encoding/decoding — ~10x faster IPC than JSON+base64.
 */
export async function renderFrame(
  viewport: ViewportParams,
  selection: SelectionParams
): Promise<RenderFrameResult> {
  const raw = await invoke<ArrayBuffer>('render_frame_bin', { viewport, selection });

  // Must have at least the header
  if (!raw || raw.byteLength < HEADER_SIZE) {
    return {
      width: 0, height: 0,
      renderTimeUs: 0, nodeCount: 0,
      prepareUs: 0, readbackUs: 0, encodeUs: 0,
      pixels: new Uint8ClampedArray(0),
    };
  }

  const view = new DataView(raw);
  const header = parseBinaryHeader(view);

  // Check error status
  if (header.status !== 0 || header.width === 0 || header.height === 0) {
    return {
      width: header.width, height: header.height,
      renderTimeUs: header.renderTimeUs, nodeCount: header.nodeCount,
      prepareUs: header.prepareUs, readbackUs: header.readbackUs, encodeUs: 0,
      pixels: new Uint8ClampedArray(0),
    };
  }

  const expectedPixels = header.width * header.height * 4;
  const actualPixels = raw.byteLength - HEADER_SIZE;

  if (actualPixels < expectedPixels) {
    // Pixel data truncated — return empty
    return {
      width: header.width, height: header.height,
      renderTimeUs: header.renderTimeUs, nodeCount: header.nodeCount,
      prepareUs: header.prepareUs, readbackUs: header.readbackUs, encodeUs: 0,
      pixels: new Uint8ClampedArray(0),
    };
  }

  // Direct view into the raw buffer — zero-copy!
  const pixels = new Uint8ClampedArray(raw, HEADER_SIZE, expectedPixels);

  return {
    width: header.width,
    height: header.height,
    renderTimeUs: header.renderTimeUs,
    nodeCount: header.nodeCount,
    prepareUs: header.prepareUs,
    readbackUs: header.readbackUs,
    encodeUs: 0,
    pixels,
  };
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
