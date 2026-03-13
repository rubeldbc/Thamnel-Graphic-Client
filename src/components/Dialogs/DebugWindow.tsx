import { useState, useRef, useEffect, useCallback } from 'react';
import * as Switch from '@radix-ui/react-switch';
import { Icon } from '../common/Icon';
import { mdiDelete, mdiContentCopy, mdiClose, mdiBug } from '@mdi/js';
import {
  useDebugStore,
  formatDebugReport,
  ALL_CATEGORIES,
  CATEGORY_LABELS,
} from '../../stores/debugStore';
import type { DebugCategory, LogLevel, LogEntry } from '../../stores/debugStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DebugWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEVEL_COLORS: Record<LogLevel, string> = {
  info: '#8AB4F8',
  warning: '#FFB74D',
  error: '#EF5350',
};

const CATEGORY_COLORS: Record<DebugCategory, string> = {
  render: '#81C784',
  imageEditing: '#CE93D8',
  general: '#90CAF9',
  documentSync: '#FFD54F',
};

const LEVEL_TABS: ('all' | LogLevel)[] = ['all', 'info', 'warning', 'error'];

// ---------------------------------------------------------------------------
// Draggable hook — uses `open` flag so effect re-runs when dialog appears
// ---------------------------------------------------------------------------

function useDraggable(
  handleRef: React.RefObject<HTMLElement | null>,
  containerRef: React.RefObject<HTMLElement | null>,
  open: boolean,
) {
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) return;

    // Small delay to let refs populate after render
    const timerId = setTimeout(() => {
      const handle = handleRef.current;
      const container = containerRef.current;
      if (!handle || !container) return;

      const onMouseDown = (e: MouseEvent) => {
        // Only drag on left mouse button, and only on the title bar itself
        if (e.button !== 0) return;
        dragging.current = true;
        const rect = container.getBoundingClientRect();
        offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        document.body.style.userSelect = 'none';
        e.preventDefault();
        e.stopPropagation();
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!dragging.current) return;
        const x = Math.max(0, Math.min(e.clientX - offset.current.x, window.innerWidth - 100));
        const y = Math.max(0, Math.min(e.clientY - offset.current.y, window.innerHeight - 50));
        container.style.left = `${x}px`;
        container.style.top = `${y}px`;
        container.style.transform = 'none';
        e.preventDefault();
      };

      const onMouseUp = () => {
        if (dragging.current) {
          dragging.current = false;
          document.body.style.userSelect = '';
        }
      };

      handle.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);

      // Store cleanup in a ref-accessible way
      (handle as any).__dragCleanup = () => {
        handle.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    }, 50);

    return () => {
      clearTimeout(timerId);
      const handle = handleRef.current;
      if (handle && (handle as any).__dragCleanup) {
        (handle as any).__dragCleanup();
        delete (handle as any).__dragCleanup;
      }
      dragging.current = false;
      document.body.style.userSelect = '';
    };
  }, [open, handleRef, containerRef]);
}

// ---------------------------------------------------------------------------
// Context menu
// ---------------------------------------------------------------------------

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  entries: LogEntry[];
}

function useLogContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    entries: [],
  });

  const show = useCallback((e: React.MouseEvent, entries: LogEntry[]) => {
    e.preventDefault();
    setMenu({ visible: true, x: e.clientX, y: e.clientY, entries });
  }, []);

  const hide = useCallback(() => {
    setMenu((m) => ({ ...m, visible: false }));
  }, []);

  useEffect(() => {
    if (menu.visible) {
      const handler = () => hide();
      window.addEventListener('click', handler);
      return () => window.removeEventListener('click', handler);
    }
  }, [menu.visible, hide]);

  return { menu, show, hide };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DebugWindow({ open, onOpenChange }: DebugWindowProps) {
  const logs = useDebugStore((s) => s.logs);
  const enabledCategories = useDebugStore((s) => s.enabledCategories);
  const levelFilter = useDebugStore((s) => s.levelFilter);
  const autoScroll = useDebugStore((s) => s.autoScroll);
  const fps = useDebugStore((s) => s.fps);
  const gpuActive = useDebugStore((s) => s.gpuActive);
  const totalFrames = useDebugStore((s) => s.totalFrames);
  const recentFrames = useDebugStore((s) => s.recentFrames);

  const logAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleBarRef = useRef<HTMLDivElement>(null);
  const { menu, show: showMenu, hide: hideMenu } = useLogContextMenu();

  // Selected log entries for context menu copy
  const [selectedLogIds, setSelectedLogIds] = useState<Set<number>>(new Set());

  useDraggable(titleBarRef, containerRef, open);

  // Filter logs by enabled categories + level
  const filteredLogs = logs.filter((entry) => {
    if (!enabledCategories[entry.category]) return false;
    if (levelFilter !== 'all' && entry.level !== levelFilter) return false;
    return true;
  });

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logAreaRef.current) {
      logAreaRef.current.scrollTop = logAreaRef.current.scrollHeight;
    }
  }, [filteredLogs.length, autoScroll]);

  // Keyboard: F12 to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F12' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  const handleClear = () => useDebugStore.getState().clearLogs();

  const handleCopyAll = async () => {
    const text = filteredLogs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.level.toUpperCase()}] [${CATEGORY_LABELS[l.category]}] ${l.message}${l.detail ? '\n  ' + l.detail : ''}`,
      )
      .join('\n');
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  };

  const handleCopyReport = async () => {
    try { await navigator.clipboard.writeText(formatDebugReport()); } catch { /* ignore */ }
  };

  // Context menu actions
  const handleCopySelected = async () => {
    hideMenu();
    const selected = filteredLogs.filter((l) => selectedLogIds.has(l.id));
    if (selected.length === 0) return;
    const text = selected
      .map(
        (l) =>
          `[${l.timestamp}] [${l.level.toUpperCase()}] [${CATEGORY_LABELS[l.category]}] ${l.message}${l.detail ? '\n  ' + l.detail : ''}`,
      )
      .join('\n');
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  };

  const handleCopyEntry = async (entry: LogEntry) => {
    hideMenu();
    const text = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${CATEGORY_LABELS[entry.category]}] ${entry.message}${entry.detail ? '\n  ' + entry.detail : ''}`;
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  };

  const handleLogClick = (entry: LogEntry, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Toggle selection
      setSelectedLogIds((prev) => {
        const next = new Set(prev);
        if (next.has(entry.id)) next.delete(entry.id);
        else next.add(entry.id);
        return next;
      });
    } else if (e.shiftKey && selectedLogIds.size > 0) {
      // Range selection
      const ids = filteredLogs.map((l) => l.id);
      const lastSelected = Array.from(selectedLogIds).pop()!;
      const startIdx = ids.indexOf(lastSelected);
      const endIdx = ids.indexOf(entry.id);
      if (startIdx >= 0 && endIdx >= 0) {
        const [lo, hi] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
        const range = ids.slice(lo, hi + 1);
        setSelectedLogIds((prev) => new Set([...prev, ...range]));
      }
    } else {
      setSelectedLogIds(new Set([entry.id]));
    }
  };

  const handleContextMenu = (e: React.MouseEvent, entry: LogEntry) => {
    if (!selectedLogIds.has(entry.id)) {
      setSelectedLogIds(new Set([entry.id]));
    }
    showMenu(e, [entry]);
  };

  // Render averages
  const lastFrame = recentFrames.length > 0 ? recentFrames[recentFrames.length - 1] : null;
  const avgTotal =
    recentFrames.length > 0
      ? (recentFrames.reduce((s, f) => s + f.totalMs, 0) / recentFrames.length).toFixed(1)
      : '-';

  if (!open) return null;

  return (
    <>
      {/* Semi-transparent backdrop — only close on direct click, not during drag */}
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        onMouseDown={(e) => {
          // Only close if the click target is the backdrop itself
          if (e.target === e.currentTarget) {
            onOpenChange(false);
          }
        }}
      />

      {/* Debug window */}
      <div
        ref={containerRef}
        className="fixed z-50 flex flex-col overflow-hidden rounded-lg border shadow-2xl"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 860,
          height: 560,
          backgroundColor: 'var(--panel-bg)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
        data-testid="debug-window"
      >
        {/* ---- Title bar (draggable) ---- */}
        <div
          ref={titleBarRef}
          className="flex shrink-0 items-center justify-between border-b px-3"
          style={{
            height: 36,
            backgroundColor: 'var(--toolbar-bg)',
            borderColor: 'var(--border-color)',
            cursor: 'move',
            userSelect: 'none',
          }}
          data-testid="debug-titlebar"
        >
          <div className="flex items-center gap-2">
            <Icon path={mdiBug} size={16} color="var(--accent-orange)" />
            <span style={{ color: 'var(--accent-orange)', fontSize: 14, fontWeight: 700 }}>
              Debug
            </span>
            {/* Quick stats in title bar */}
            <span style={{ color: '#888', fontSize: 10, marginLeft: 8 }}>
              FPS: {fps} | Frames: {totalFrames} | {gpuActive ? 'GPU' : 'CPU'} | Avg: {avgTotal}ms
            </span>
          </div>
          <button
            type="button"
            className="rounded p-0.5 hover:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => onOpenChange(false)}
            data-testid="debug-close-btn"
          >
            <Icon path={mdiClose} size={16} />
          </button>
        </div>

        {/* ---- Main content: left panel + right log area ---- */}
        <div className="flex min-h-0 flex-1">
          {/* Left panel: categories */}
          <div
            className="flex shrink-0 flex-col border-r"
            style={{
              width: 160,
              backgroundColor: '#1E1E1E',
              borderColor: 'var(--border-color)',
            }}
            data-testid="debug-left-panel"
          >
            <div
              style={{
                padding: '8px 10px 4px',
                fontSize: 10,
                fontWeight: 600,
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Categories
            </div>

            {ALL_CATEGORIES.map((cat) => {
              const enabled = enabledCategories[cat];
              const count = logs.filter((l) => l.category === cat).length;
              return (
                <label
                  key={cat}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-[#2a2a2a]"
                  style={{ fontSize: 11 }}
                  data-testid={`debug-cat-${cat}`}
                >
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) =>
                      useDebugStore.getState().setCategoryEnabled(cat, e.target.checked)
                    }
                    style={{ accentColor: CATEGORY_COLORS[cat] }}
                  />
                  <span
                    style={{
                      color: enabled ? CATEGORY_COLORS[cat] : '#666',
                      fontWeight: enabled ? 500 : 400,
                    }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <span style={{ color: '#555', fontSize: 9, marginLeft: 'auto' }}>{count}</span>
                </label>
              );
            })}

            {/* Render quick info */}
            {enabledCategories.render && lastFrame && (
              <div
                style={{
                  margin: '8px 10px',
                  padding: '6px 8px',
                  backgroundColor: '#252525',
                  borderRadius: 4,
                  fontSize: 9,
                  lineHeight: '14px',
                  color: '#aaa',
                  borderLeft: `2px solid ${CATEGORY_COLORS.render}`,
                }}
              >
                <div style={{ fontWeight: 600, color: CATEGORY_COLORS.render, marginBottom: 2 }}>
                  Last Frame
                </div>
                <div>Prepare: {lastFrame.rustPrepareMs.toFixed(1)}ms</div>
                <div>Render: {lastFrame.rustRenderMs.toFixed(1)}ms</div>
                <div>Readback: {lastFrame.rustReadbackMs.toFixed(1)}ms</div>
                <div>IPC: {lastFrame.ipcMs.toFixed(1)}ms</div>
                <div>Paint: {lastFrame.paintMs.toFixed(1)}ms</div>
                <div style={{ borderTop: '1px solid #333', marginTop: 2, paddingTop: 2 }}>
                  Total: {lastFrame.totalMs.toFixed(1)}ms
                </div>
                <div>{lastFrame.width}x{lastFrame.height} | {lastFrame.nodeCount} nodes</div>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Copy Report button at bottom */}
            <button
              type="button"
              className="mx-2 mb-2 rounded px-2 py-1.5 text-xs hover:bg-[#333]"
              style={{
                color: 'var(--accent-orange)',
                border: '1px solid var(--accent-orange)',
                backgroundColor: 'transparent',
              }}
              onClick={handleCopyReport}
              title="Copy full debug report (metrics + logs) to clipboard"
              data-testid="debug-copy-report"
            >
              Copy Full Report
            </button>
          </div>

          {/* Right side: toolbar + log area */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Filter toolbar */}
            <div
              className="flex shrink-0 items-center gap-2 border-b px-3 py-1"
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--toolbar-bg)',
              }}
              data-testid="debug-toolbar"
            >
              {/* Level filter tabs */}
              {LEVEL_TABS.map((level) => (
                <button
                  key={level}
                  type="button"
                  className="rounded px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor:
                      levelFilter === level ? 'var(--accent-orange)' : 'transparent',
                    color: levelFilter === level ? '#fff' : 'var(--text-secondary)',
                  }}
                  onClick={() => useDebugStore.getState().setLevelFilter(level)}
                  data-testid={`debug-filter-${level}`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                  {level !== 'all' && (
                    <span style={{ marginLeft: 3, fontSize: 9, opacity: 0.7 }}>
                      {logs.filter(
                        (l) =>
                          l.level === level && enabledCategories[l.category],
                      ).length}
                    </span>
                  )}
                </button>
              ))}

              <div className="flex-1" />

              {/* Auto-scroll */}
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Auto-scroll
              </span>
              <Switch.Root
                checked={autoScroll}
                onCheckedChange={(v) => useDebugStore.getState().setAutoScroll(v)}
                className="relative inline-flex items-center rounded-full"
                style={{
                  width: 30,
                  height: 16,
                  backgroundColor: autoScroll ? 'var(--accent-orange)' : 'var(--border-color)',
                }}
                data-testid="debug-auto-scroll"
              >
                <Switch.Thumb
                  className="block rounded-full bg-white transition-transform"
                  style={{
                    width: 12,
                    height: 12,
                    transform: autoScroll ? 'translateX(15px)' : 'translateX(2px)',
                  }}
                />
              </Switch.Root>

              <button
                type="button"
                className="flex items-center gap-1 rounded px-2 py-0.5 text-xs hover:bg-[var(--hover-bg)]"
                style={{ color: 'var(--text-secondary)' }}
                onClick={handleCopyAll}
                title="Copy all visible log entries"
                data-testid="debug-copy-all"
              >
                <Icon path={mdiContentCopy} size={12} /> Copy All
              </button>
              <button
                type="button"
                className="flex items-center gap-1 rounded px-2 py-0.5 text-xs hover:bg-[var(--hover-bg)]"
                style={{ color: 'var(--text-secondary)' }}
                onClick={handleClear}
                data-testid="debug-clear"
              >
                <Icon path={mdiDelete} size={12} /> Clear
              </button>
            </div>

            {/* Log output area */}
            <div
              ref={logAreaRef}
              className="flex-1 overflow-auto p-1"
              style={{
                backgroundColor: '#1A1A1A',
                fontFamily: 'Consolas, "Fira Code", monospace',
                fontSize: 11,
                lineHeight: '18px',
              }}
              data-testid="debug-log-area"
            >
              {filteredLogs.map((entry) => {
                const isSelected = selectedLogIds.has(entry.id);
                return (
                  <div
                    key={entry.id}
                    className="flex gap-1 rounded-sm px-1"
                    style={{
                      backgroundColor: isSelected ? 'rgba(245, 166, 35, 0.15)' : 'transparent',
                      cursor: 'default',
                    }}
                    onClick={(e) => handleLogClick(entry, e)}
                    onContextMenu={(e) => handleContextMenu(e, entry)}
                    data-testid={`log-entry-${entry.id}`}
                  >
                    <span style={{ color: '#666', minWidth: 80 }}>[{entry.timestamp}]</span>
                    <span
                      style={{
                        color: LEVEL_COLORS[entry.level],
                        fontWeight: 600,
                        minWidth: 60,
                      }}
                    >
                      [{entry.level.toUpperCase()}]
                    </span>
                    <span
                      style={{
                        color: CATEGORY_COLORS[entry.category],
                        minWidth: 90,
                        fontSize: 10,
                        opacity: 0.8,
                      }}
                    >
                      [{CATEGORY_LABELS[entry.category]}]
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {entry.message}
                    </span>
                  </div>
                );
              })}
              {filteredLogs.length === 0 && (
                <div style={{ color: '#555', textAlign: 'center', paddingTop: 40, fontSize: 12 }}>
                  No log entries matching current filters
                </div>
              )}
            </div>

            {/* Bottom status line */}
            <div
              className="flex shrink-0 items-center justify-between border-t px-3"
              style={{
                height: 24,
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--toolbar-bg)',
                fontSize: 10,
                color: '#888',
              }}
            >
              <span>
                {filteredLogs.length} entries shown | {logs.length} total |{' '}
                {selectedLogIds.size > 0 && `${selectedLogIds.size} selected | `}
                Ctrl+Click to select | Right-click to copy
              </span>
              <span>
                Press F12 to toggle | Binary IPC
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Context Menu ---- */}
      {menu.visible && (
        <div
          className="fixed z-[60] rounded border shadow-lg"
          style={{
            left: menu.x,
            top: menu.y,
            backgroundColor: '#2a2a2a',
            borderColor: '#555',
            minWidth: 180,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[#444]"
            style={{ color: '#ddd' }}
            onClick={() => {
              if (menu.entries[0]) handleCopyEntry(menu.entries[0]);
            }}
          >
            <Icon path={mdiContentCopy} size={12} /> Copy This Entry
          </button>
          {selectedLogIds.size > 1 && (
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[#444]"
              style={{ color: '#ddd' }}
              onClick={handleCopySelected}
            >
              <Icon path={mdiContentCopy} size={12} /> Copy Selected ({selectedLogIds.size})
            </button>
          )}
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[#444]"
            style={{ color: '#ddd' }}
            onClick={() => { handleCopyAll(); hideMenu(); }}
          >
            <Icon path={mdiContentCopy} size={12} /> Copy All Visible
          </button>
          <div style={{ height: 1, backgroundColor: '#444', margin: '2px 0' }} />
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[#444]"
            style={{ color: '#ddd' }}
            onClick={() => { handleCopyReport(); hideMenu(); }}
          >
            <Icon path={mdiContentCopy} size={12} /> Copy Full Report
          </button>
        </div>
      )}
    </>
  );
}

export default DebugWindow;
