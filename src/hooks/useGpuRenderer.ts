import { useEffect, useRef, useState, useCallback } from 'react';
import { renderFrame } from '../bridge/renderBridge';
import type { ViewportParams, SelectionParams } from '../bridge/renderBridge';
import { useDocumentStore } from '../stores/documentStore';
import { getRustSyncVersion } from '../stores/documentStore';
import { useMediaStore } from '../stores/mediaStore';
import { useUiStore } from '../stores/uiStore';

// ---------------------------------------------------------------------------
// Fast base64 → ArrayBuffer using browser-native fetch decoder
// (~10x faster than atob + charCodeAt loop for large payloads)
// ---------------------------------------------------------------------------

async function base64ToArrayBuffer(b64: string): Promise<ArrayBuffer> {
  const res = await fetch(`data:application/octet-stream;base64,${b64}`);
  return res.arrayBuffer();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseGpuRendererOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  selectedLayerIds: string[];
  enabled: boolean;
}

export interface UseGpuRendererResult {
  gpuActive: boolean;
}

/** Minimum interval between GPU render dispatches (ms). */
const GPU_RENDER_INTERVAL_MS = 100;

/**
 * Drives the live viewport render loop via the Rust GPU pipeline (wgpu + Vello).
 *
 * Polls the sync version counter and only dispatches a render_frame IPC when
 * Rust has fresh data AND at least GPU_RENDER_INTERVAL_MS has passed since the
 * last render dispatch.
 */
export function useGpuRenderer({
  canvasRef,
  canvasWidth,
  canvasHeight,
  selectedLayerIds,
  enabled,
}: UseGpuRendererOptions): UseGpuRendererResult {
  const [gpuActive, setGpuActive] = useState(false);

  const inFlight = useRef(false);
  const rafId = useRef(0);
  const failed = useRef(false);
  const activated = useRef(false);
  const lastRenderedSyncVersion = useRef(-1);
  const lastDispatchTime = useRef(0);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Keep latest values in refs so the RAF callback never goes stale
  const widthRef = useRef(canvasWidth);
  const heightRef = useRef(canvasHeight);
  const enabledRef = useRef(enabled);
  const canvasRefStable = canvasRef;

  widthRef.current = canvasWidth;
  heightRef.current = canvasHeight;
  enabledRef.current = enabled;

  // The render tick: dispatches GPU render when Rust has fresh data
  const tick = useCallback(() => {
    if (!enabledRef.current || failed.current) return;

    const suppress = useDocumentStore.getState().suppressRender;
    if (suppress) {
      rafId.current = requestAnimationFrame(tick);
      return;
    }

    // Only render when Rust has newer data than what we last rendered
    const currentSyncVersion = getRustSyncVersion();
    const needsRender = currentSyncVersion > lastRenderedSyncVersion.current;

    // Throttle: enforce minimum interval between dispatches
    const now = performance.now();
    const elapsed = now - lastDispatchTime.current;

    if (needsRender && !inFlight.current && elapsed >= GPU_RENDER_INTERVAL_MS) {
      inFlight.current = true;
      lastDispatchTime.current = now;
      const syncVersionAtRender = currentSyncVersion;

      const w = widthRef.current;
      const h = heightRef.current;

      const viewport: ViewportParams = {
        width: w,
        height: h,
        zoom: 1.0,
        scrollX: 0,
        scrollY: 0,
      };

      const selection: SelectionParams = {
        selectedIds: [],
      };

      const t0 = performance.now();

      renderFrame(viewport, selection)
        .then(async (b64: string) => {
          const t_ipc = performance.now();

          const canvas = canvasRefStable.current;
          if (!canvas) {
            inFlight.current = false;
            return;
          }

          // Fast browser-native base64 decode
          const buffer = await base64ToArrayBuffer(b64);
          const t_decode = performance.now();

          const expected = w * h * 4;
          if (buffer.byteLength < expected) {
            console.warn(`[GPU] buffer too small: ${buffer.byteLength} < ${expected}`);
            inFlight.current = false;
            return;
          }

          const pixels = new Uint8ClampedArray(buffer, 0, expected);
          const imageData = new ImageData(pixels, w, h);

          // Cache the 2D context
          if (!ctxRef.current || ctxRef.current.canvas !== canvas) {
            canvas.width = w;
            canvas.height = h;
            ctxRef.current = canvas.getContext('2d');
          } else if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            ctxRef.current = canvas.getContext('2d');
          }

          if (ctxRef.current) {
            ctxRef.current.putImageData(imageData, 0, 0);
          }

          const t_paint = performance.now();
          console.debug(
            `[GPU] ipc: ${(t_ipc - t0).toFixed(1)}ms, decode: ${(t_decode - t_ipc).toFixed(1)}ms, paint: ${(t_paint - t_decode).toFixed(1)}ms, total: ${(t_paint - t0).toFixed(1)}ms`
          );

          lastRenderedSyncVersion.current = syncVersionAtRender;

          if (!activated.current) {
            activated.current = true;
            setGpuActive(true);
            useMediaStore.getState().setInferenceDevice('GPU');
          }

          inFlight.current = false;
        })
        .catch((err) => {
          console.error('[GPU] renderFrame failed:', err);
          useUiStore.getState().setStatusMessage(`GPU render error: ${err}`);
          failed.current = true;
          activated.current = false;
          setGpuActive(false);
          useMediaStore.getState().setInferenceDevice('CPU');
          inFlight.current = false;
        });
    }

    rafId.current = requestAnimationFrame(tick);
  }, [canvasRefStable]);

  // Start / stop the RAF loop
  useEffect(() => {
    if (!enabled) {
      activated.current = false;
      setGpuActive(false);
      return;
    }

    failed.current = false;
    lastRenderedSyncVersion.current = -1;
    lastDispatchTime.current = 0;

    rafId.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId.current);
    };
  }, [enabled, tick]);

  return { gpuActive };
}
