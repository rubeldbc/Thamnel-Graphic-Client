import { useEffect, useRef, useState, useCallback } from 'react';
import { renderFrame } from '../bridge/renderBridge';
import type { ViewportParams, SelectionParams } from '../bridge/renderBridge';
import { useDocumentStore } from '../stores/documentStore';
import { getRustSyncVersion } from '../stores/documentStore';
import { useMediaStore } from '../stores/mediaStore';
import { useUiStore } from '../stores/uiStore';
import { useDebugStore, dlog } from '../stores/debugStore';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseGpuRendererOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasWidth: number;
  canvasHeight: number;
  selectedLayerIds: string[];  // reserved for future selection gizmo rendering
  enabled: boolean;
}

export interface UseGpuRendererResult {
  gpuActive: boolean;
}

/** Minimum interval between GPU render dispatches (ms). */
const GPU_RENDER_INTERVAL_MS = 16;

/**
 * Drives the live viewport render loop via the Rust GPU pipeline (wgpu + Vello).
 *
 * Binary IPC — raw RGBA ArrayBuffer with 24-byte header (no base64).
 * Pushes detailed render logs to the debug store.
 */
export function useGpuRenderer({
  canvasRef,
  canvasWidth,
  canvasHeight,
  selectedLayerIds,
  enabled,
}: UseGpuRendererOptions): UseGpuRendererResult {
  // selectedLayerIds reserved for future selection gizmo rendering
  void selectedLayerIds;

  const [gpuActive, setGpuActive] = useState(false);

  const inFlight = useRef(false);
  const rafId = useRef(0);
  const failed = useRef(false);
  const activated = useRef(false);
  const lastRenderedSyncVersion = useRef(-1);
  const lastDispatchTime = useRef(0);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const frameCounter = useRef(0);

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

      // Skip render if canvas dimensions are not ready
      if (w <= 0 || h <= 0) {
        inFlight.current = false;
        rafId.current = requestAnimationFrame(tick);
        return;
      }

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
        .then((result) => {
          const t_ipc = performance.now();

          const canvas = canvasRefStable.current;
          if (!canvas) {
            inFlight.current = false;
            return;
          }

          // Skip painting if dimensions are 0 or pixel data doesn't match
          const expectedBytes = result.width * result.height * 4;
          if (result.width === 0 || result.height === 0 || result.pixels.byteLength === 0) {
            inFlight.current = false;
            return;
          }
          if (result.pixels.byteLength < expectedBytes) {
            dlog.renderWarn(
              `Pixel data size mismatch: got ${result.pixels.byteLength} bytes, need ${expectedBytes} (${result.width}x${result.height}x4)`,
            );
            inFlight.current = false;
            return;
          }

          // Copy into a fresh ArrayBuffer to satisfy ImageData's type constraint
          const buf = new ArrayBuffer(expectedBytes);
          new Uint8Array(buf).set(new Uint8Array(result.pixels.buffer, result.pixels.byteOffset, expectedBytes));
          const imageData = new ImageData(new Uint8ClampedArray(buf), result.width, result.height);

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
          const ipcMs = t_ipc - t0;
          const paintMs = t_paint - t_ipc;
          const totalMs = t_paint - t0;

          // Feed debug store with detailed metrics
          frameCounter.current += 1;
          const debugStore = useDebugStore.getState();
          const frameNum = frameCounter.current;

          debugStore.pushFrame({
            frameNumber: frameNum,
            timestamp: t_paint,
            ipcMs,
            paintMs,
            totalMs,
            rustRenderMs: result.renderTimeUs / 1000,
            rustPrepareMs: result.prepareUs / 1000,
            rustReadbackMs: result.readbackUs / 1000,
            frameSizeBytes: result.pixels.byteLength,
            nodeCount: result.nodeCount,
            width: result.width,
            height: result.height,
          });

          debugStore.setSyncVersion(syncVersionAtRender);

          // Push detailed render log (only if render category is enabled)
          if (debugStore.enabledCategories.render) {
            const detail = [
              `Frame #${frameNum} | ${result.width}x${result.height} | ${result.nodeCount} nodes`,
              `Rust: prepare=${(result.prepareUs / 1000).toFixed(2)}ms render=${(result.renderTimeUs / 1000).toFixed(2)}ms readback=${(result.readbackUs / 1000).toFixed(2)}ms`,
              `JS: ipc=${ipcMs.toFixed(2)}ms paint=${paintMs.toFixed(2)}ms total=${totalMs.toFixed(2)}ms`,
              `Buffer: ${(result.pixels.byteLength / 1024).toFixed(0)}KB (binary IPC) | SyncVer: ${syncVersionAtRender}`,
            ].join(' | ');

            // Log every frame for now (to verify binary IPC performance)
            if (true) {
              dlog.renderInfo(
                `Frame #${frameNum}: ${totalMs.toFixed(1)}ms (GPU: ${(result.renderTimeUs / 1000).toFixed(1)}ms, IPC: ${ipcMs.toFixed(1)}ms)`,
                detail,
              );
            }

            // Log warnings for slow frames
            if (totalMs > 200) {
              dlog.renderWarn(
                `Slow frame #${frameNum}: ${totalMs.toFixed(1)}ms total`,
                detail,
              );
            }
          }

          lastRenderedSyncVersion.current = syncVersionAtRender;

          if (!activated.current) {
            activated.current = true;
            setGpuActive(true);
            useMediaStore.getState().setInferenceDevice('GPU');
            debugStore.setGpuActive(true);
            dlog.renderInfo(
              `GPU renderer activated (wgpu + Vello)`,
              `Viewport: ${result.width}x${result.height} | Nodes: ${result.nodeCount}`,
            );
          }

          inFlight.current = false;
        })
        .catch((err) => {
          console.error('[GPU] renderFrame failed:', err);
          useUiStore.getState().setStatusMessage(`GPU render error: ${err}`);
          dlog.renderError(`renderFrame IPC failed: ${err}`);
          useDebugStore.getState().setLastError(String(err));
          failed.current = true;
          activated.current = false;
          setGpuActive(false);
          useMediaStore.getState().setInferenceDevice('CPU');
          useDebugStore.getState().setGpuActive(false);
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
    dlog.renderInfo('GPU render loop started');

    rafId.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId.current);
      dlog.renderInfo('GPU render loop stopped');
    };
  }, [enabled, tick]);

  return { gpuActive };
}
