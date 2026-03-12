import { useState, useRef, useEffect } from 'react';
import * as Switch from '@radix-ui/react-switch';
import { DialogBase } from './DialogBase';
import { Icon } from '../common/Icon';
import { mdiDelete, mdiContentCopy } from '@mdi/js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DebugWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LogLevel = 'all' | 'info' | 'warning' | 'error';

interface LogEntry {
  id: string;
  level: 'info' | 'warning' | 'error';
  timestamp: string;
  message: string;
}

const SAMPLE_LOGS: LogEntry[] = [
  { id: '1', level: 'info', timestamp: '12:00:01', message: 'Application started' },
  { id: '2', level: 'info', timestamp: '12:00:02', message: 'Canvas initialized (1920x1080)' },
  { id: '3', level: 'warning', timestamp: '12:00:05', message: 'GPU memory usage above 80%' },
  { id: '4', level: 'error', timestamp: '12:00:10', message: 'Failed to connect to render server' },
  { id: '5', level: 'info', timestamp: '12:00:12', message: 'Retrying connection...' },
  { id: '6', level: 'info', timestamp: '12:00:15', message: 'Connected to render server' },
];

const LEVEL_COLORS: Record<LogEntry['level'], string> = {
  info: '#8AB4F8',
  warning: '#FFB74D',
  error: '#EF5350',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DebugWindow({ open, onOpenChange }: DebugWindowProps) {
  const [logs, setLogs] = useState<LogEntry[]>(SAMPLE_LOGS);
  const [filter, setFilter] = useState<LogLevel>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logAreaRef = useRef<HTMLDivElement>(null);

  const filteredLogs = filter === 'all' ? logs : logs.filter((l) => l.level === filter);

  const handleClear = () => setLogs([]);
  const handleCopyAll = () => {
    const text = filteredLogs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard?.writeText(text);
  };

  useEffect(() => {
    if (autoScroll && logAreaRef.current) {
      logAreaRef.current.scrollTop = logAreaRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const footer = (
    <button
      type="button"
      className="rounded px-4 py-1.5 text-xs font-medium"
      style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
      onClick={() => onOpenChange(false)}
      data-testid="debug-close"
    >
      Close
    </button>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="Debug"
      width={700}
      height={500}
      footer={footer}
    >
      <div className="flex h-full flex-col" data-testid="debug-dialog-content">
        {/* Filter toolbar */}
        <div
          className="flex shrink-0 items-center gap-2 border-b px-3 py-1"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--toolbar-bg)' }}
          data-testid="debug-toolbar"
        >
          {/* Level filter buttons */}
          {(['all', 'info', 'warning', 'error'] as const).map((level) => (
            <button
              key={level}
              type="button"
              className="rounded px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: filter === level ? 'var(--accent-orange)' : 'transparent',
                color: filter === level ? '#fff' : 'var(--text-secondary)',
              }}
              onClick={() => setFilter(level)}
              data-testid={`debug-filter-${level}`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}

          <div className="flex-1" />

          {/* Auto-scroll */}
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Auto-scroll</span>
          <Switch.Root
            checked={autoScroll}
            onCheckedChange={setAutoScroll}
            className="relative inline-flex items-center rounded-full"
            style={{ width: 30, height: 16, backgroundColor: autoScroll ? 'var(--accent-orange)' : 'var(--border-color)' }}
            data-testid="debug-auto-scroll"
          >
            <Switch.Thumb
              className="block rounded-full bg-white transition-transform"
              style={{ width: 12, height: 12, transform: autoScroll ? 'translateX(15px)' : 'translateX(2px)' }}
            />
          </Switch.Root>

          <button
            type="button"
            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs hover:bg-[var(--hover-bg)]"
            style={{ color: 'var(--text-secondary)' }}
            onClick={handleCopyAll}
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
          className="flex-1 overflow-auto p-2"
          style={{
            backgroundColor: '#1A1A1A',
            fontFamily: 'Consolas, ui-monospace, monospace',
            fontSize: 11,
            lineHeight: '18px',
          }}
          data-testid="debug-log-area"
        >
          {filteredLogs.map((entry) => (
            <div key={entry.id} className="flex gap-2" data-testid={`log-entry-${entry.id}`}>
              <span style={{ color: 'var(--text-disabled)' }}>[{entry.timestamp}]</span>
              <span style={{ color: LEVEL_COLORS[entry.level], fontWeight: 600, minWidth: 55 }}>
                [{entry.level.toUpperCase()}]
              </span>
              <span style={{ color: 'var(--text-primary)' }}>{entry.message}</span>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <span style={{ color: 'var(--text-disabled)' }}>No log entries</span>
          )}
        </div>
      </div>
    </DialogBase>
  );
}

export default DebugWindow;
