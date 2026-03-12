import { mdiKey } from '@mdi/js';
import { Icon } from '../common/Icon';
import { StatusDot, type StatusDotStatus } from './StatusDot';
import { ProgressIndicator } from './ProgressIndicator';
import { useUiStore } from '../../stores/uiStore';
import { useDocumentStore } from '../../stores/documentStore';
import { useJobStore } from '../../stores/jobStore';
import { useMediaStore } from '../../stores/mediaStore';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StatusBarProps {
  /** Status text (bottom-left). Defaults to store value or "Ready". */
  statusText?: string;

  /** Download progress value (0-100). Hidden when undefined or downloadVisible=false. */
  downloadProgress?: number;
  /** Whether the download progress bar is visible. */
  downloadVisible?: boolean;

  /** Canvas width. */
  canvasWidth?: number;
  /** Canvas height. */
  canvasHeight?: number;

  /** Inference device: CPU or GPU. */
  inferenceDevice?: 'CPU' | 'GPU';

  /** User display name. Defaults to "Designer". */
  userName?: string;
  /** Callback when user name is clicked. */
  onUserNameClick?: () => void;

  /** Text server connection status. */
  textServerStatus?: StatusDotStatus;
  /** Text server IP:Port address. */
  textServerAddress?: string;
  /** Render server connection status. */
  renderServerStatus?: StatusDotStatus;
  /** Render server IP:Port address. */
  renderServerAddress?: string;

  /** Render progress value (0-100). */
  renderProgress?: number;
  /** Whether render progress indicator is visible. */
  renderProgressVisible?: boolean;
  /** Render progress stage label. */
  renderStageText?: string;
}

// ---------------------------------------------------------------------------
// Separator helper
// ---------------------------------------------------------------------------

function Separator() {
  return (
    <span
      className="mx-2 inline-block self-stretch"
      style={{
        width: 1,
        backgroundColor: 'var(--border-color)',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// StatusBar
// ---------------------------------------------------------------------------

/**
 * Application-wide status bar rendered at the bottom of the layout.
 * Height: 28 px.
 *
 * Layout matches WPF original (left to right):
 *   Status Text | Download Progress | Canvas Dimensions | Inference Device |
 *   User Name | Text Server IP + Dot | Render Progress | Render Server IP + Dot |
 *   [spacer] | API Key
 */
export function StatusBar(props: StatusBarProps) {
  // Read from stores
  const storeStatusMessage = useUiStore((s) => s.statusMessage);
  const storeCanvasWidth = useDocumentStore((s) => s.project.canvasWidth);
  const storeCanvasHeight = useDocumentStore((s) => s.project.canvasHeight);
  const storeJobs = useJobStore((s) => s.jobs);
  const storeTextServerConnected = useMediaStore((s) => s.textServerConnected);
  const storeRenderServerConnected = useMediaStore((s) => s.renderServerConnected);
  const storeInferenceDevice = useMediaStore((s) => s.inferenceDevice);

  // Derive download job from store
  const downloadJob = storeJobs.find(
    (j) => j.type === 'export' && (j.status === 'running' || j.status === 'pending'),
  );
  // Derive render job from store
  const renderJob = storeJobs.find(
    (j) => j.type === 'render' && (j.status === 'running' || j.status === 'pending'),
  );

  // Resolve props vs store values
  const statusText = props.statusText ?? (storeStatusMessage || 'Ready');
  const downloadProgress = props.downloadProgress ?? (downloadJob?.progress ?? 0);
  const downloadVisible = props.downloadVisible ?? !!downloadJob;
  const canvasWidth = props.canvasWidth ?? storeCanvasWidth;
  const canvasHeight = props.canvasHeight ?? storeCanvasHeight;
  const inferenceDevice = props.inferenceDevice ?? storeInferenceDevice;
  const userName = props.userName ?? 'Designer';
  const onUserNameClick = props.onUserNameClick;
  const textServerStatus: StatusDotStatus =
    props.textServerStatus ?? (storeTextServerConnected ? 'connected' : 'disconnected');
  const textServerAddress = props.textServerAddress ?? '127.0.0.1:5050';
  const renderServerStatus: StatusDotStatus =
    props.renderServerStatus ?? (storeRenderServerConnected ? 'connected' : 'disconnected');
  const renderServerAddress = props.renderServerAddress ?? '127.0.0.1:5051';
  const renderProgress = props.renderProgress ?? (renderJob?.progress ?? 0);
  const renderProgressVisible = props.renderProgressVisible ?? !!renderJob;
  const renderStageText = props.renderStageText ?? renderJob?.message;

  return (
    <div
      data-testid="status-bar"
      className="flex w-full items-center"
      style={{
        height: 28,
        backgroundColor: 'var(--toolbar-bg)',
        borderTop: '1px solid var(--border-color)',
        padding: '0 8px',
        fontSize: 11,
        boxSizing: 'border-box',
      }}
    >
      {/* (a) Status text */}
      <span
        data-testid="status-text"
        style={{ color: 'var(--text-secondary)' }}
      >
        {statusText}
      </span>

      <Separator />

      {/* (b) Download progress bar (hidden by default) */}
      {downloadVisible && (
        <>
          <ProgressIndicator
            value={downloadProgress}
            width={120}
            height={4}
            visible
          />
          <Separator />
        </>
      )}

      {/* (c) Canvas dimensions */}
      <span
        data-testid="canvas-dimensions"
        style={{ color: 'var(--text-secondary)' }}
      >
        {canvasWidth} x {canvasHeight}
      </span>

      <Separator />

      {/* (d) Inference device indicator */}
      <span
        data-testid="inference-device"
        style={{
          color: inferenceDevice === 'GPU' ? '#81C784' : '#8AB4F8',
          fontWeight: 500,
        }}
      >
        {inferenceDevice}
      </span>

      <Separator />

      {/* (e) User name display */}
      <span
        data-testid="user-name"
        className="cursor-pointer select-none"
        style={{ color: 'var(--accent-orange)' }}
        onClick={onUserNameClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onUserNameClick?.();
        }}
      >
        {userName}
      </span>

      <Separator />

      {/* (f) Text Server status with IP:Port */}
      <span
        data-testid="text-server-status"
        className="inline-flex items-center gap-1"
        style={{ color: 'var(--text-secondary)', fontSize: 11 }}
      >
        <span
          data-testid="text-server-address"
          className="cursor-pointer"
          title="Click to reconnect"
        >
          {textServerAddress}
        </span>
        <StatusDot status={textServerStatus} />
      </span>

      <Separator />

      {/* (g) Render progress */}
      <ProgressIndicator
        value={renderProgress}
        width={80}
        height={6}
        visible={renderProgressVisible}
        label={renderStageText}
      />

      {renderProgressVisible && <Separator />}

      {/* (h) Render Server status with IP:Port */}
      <span
        data-testid="render-server-status"
        className="inline-flex items-center gap-1"
        style={{ color: 'var(--text-secondary)', fontSize: 11 }}
      >
        <span
          data-testid="render-server-address"
          className="cursor-pointer"
          title="Click to connect/disconnect"
        >
          {renderServerAddress}
        </span>
        <StatusDot status={renderServerStatus} />
      </span>

      {/* Spacer pushes API key icon to the right */}
      <span className="flex-1" />

      {/* (i) API key icon */}
      <span
        data-testid="api-key-icon"
        className="inline-flex cursor-pointer items-center"
        style={{ marginRight: 50 }}
        title="API Key"
      >
        <Icon path={mdiKey} size={14} color="var(--text-secondary)" />
      </span>
    </div>
  );
}

export default StatusBar;
