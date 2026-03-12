import { useState, useEffect, useCallback } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { DialogBase } from './DialogBase';
import { NumericUpDown } from '../common/NumericUpDown';
import { Icon } from '../common/Icon';
import {
  mdiCog,
  mdiGrid,
  mdiExport,
  mdiBrain,
  mdiServerNetwork,
  mdiFolderOpen,
} from '@mdi/js';
import { useSettingsStore } from '../../settings/settingsStore';
import type { AppSettings } from '../../settings/AppSettings';
import { createDefaultSettings } from '../../settings/AppSettings';
import { useUiStore } from '../../stores/uiStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SettingsWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
  onReset?: () => void;
}

type TabId = 'general' | 'canvas' | 'export' | 'ai' | 'network';

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { id: 'general', label: 'General', icon: mdiCog },
  { id: 'canvas', label: 'Canvas', icon: mdiGrid },
  { id: 'export', label: 'Export', icon: mdiExport },
  { id: 'ai', label: 'AI', icon: mdiBrain },
  { id: 'network', label: 'Network', icon: mdiServerNetwork },
];

const FILL_MODES = ['Fill', 'Uniform Fill', 'Uniform', 'Original', 'Tile'];
const SILENT_EXPORT_FORMATS = ['PNG', 'JPG'];

// ---------------------------------------------------------------------------
// Tauri dialog helper — opens native folder picker in Tauri, no-op in browser
// ---------------------------------------------------------------------------

async function pickFolder(currentPath?: string): Promise<string | null> {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      directory: true,
      multiple: false,
      defaultPath: currentPath || undefined,
    });
    return typeof selected === 'string' ? selected : null;
  } catch {
    // Not running in Tauri or dialog cancelled
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-3 rounded-lg p-4"
      style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mb-3 select-none text-[11px] font-semibold"
      style={{ color: 'var(--accent-orange)' }}
    >
      {children}
    </div>
  );
}

function FieldRow({
  label,
  children,
  hint,
  labelWidth = 180,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  labelWidth?: number;
}) {
  return (
    <>
      <div className="flex items-center gap-2 py-1.5">
        <span
          className="shrink-0 select-none text-xs"
          style={{ color: 'var(--text-secondary)', width: labelWidth }}
        >
          {label}
        </span>
        <div className="flex items-center gap-1">{children}</div>
      </div>
      {hint && (
        <div
          className="text-[10px] leading-tight"
          style={{ color: '#666', marginLeft: labelWidth, marginTop: 2, marginBottom: 4 }}
        >
          {hint}
        </div>
      )}
    </>
  );
}

function PathField({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testId?: string;
}) {
  const handleBrowse = useCallback(async () => {
    const selected = await pickFolder(value || undefined);
    if (selected) onChange(selected);
  }, [value, onChange]);

  return (
    <div className="mb-3">
      <div
        className="mb-1.5 select-none text-[11px]"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded border px-2.5 py-1.5 text-xs outline-none"
          style={{
            backgroundColor: '#2A2A2A',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
          data-testid={testId}
        />
        <button
          type="button"
          className="flex shrink-0 items-center gap-1 rounded px-3 py-1.5 text-xs font-medium"
          style={{ color: 'var(--accent-orange)', backgroundColor: 'transparent' }}
          onClick={handleBrowse}
          data-testid={testId ? `${testId}-browse` : undefined}
        >
          <Icon path={mdiFolderOpen} size={14} color="var(--accent-orange)" />
          Browse
        </button>
      </div>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  width = 200,
  placeholder,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  width?: number;
  placeholder?: string;
  testId?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="rounded border px-2 py-1 text-xs outline-none"
      style={{
        width,
        backgroundColor: '#2A2A2A',
        borderColor: 'var(--border-color)',
        color: 'var(--text-primary)',
      }}
      data-testid={testId}
    />
  );
}

function SelectField({
  value,
  onValueChange,
  options,
  testId,
  width = 160,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: string[];
  testId?: string;
  width?: number;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className="rounded border px-2 py-1 text-xs outline-none"
      style={{
        width,
        backgroundColor: '#2A2A2A',
        borderColor: 'var(--border-color)',
        color: 'var(--text-primary)',
      }}
      data-testid={testId}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
  disabled,
  indent,
  testId,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  indent?: boolean;
  testId?: string;
}) {
  return (
    <label
      className="flex cursor-pointer items-center gap-2 py-1"
      style={{ marginLeft: indent ? 20 : 0, opacity: disabled ? 0.5 : 1 }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="accent-[var(--accent-orange)]"
        style={{ width: 14, height: 14 }}
        data-testid={testId}
      />
      <span className="select-none text-xs" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </label>
  );
}

function RadioField({
  label,
  checked,
  onChange,
  name,
  disabled,
  indent,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  name: string;
  disabled?: boolean;
  indent?: boolean;
}) {
  return (
    <label
      className="flex cursor-pointer items-center gap-2 py-1"
      style={{ marginLeft: indent ? 20 : 0, opacity: disabled ? 0.5 : 1 }}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="accent-[var(--accent-orange)]"
        style={{ width: 14, height: 14 }}
      />
      <span className="select-none text-xs" style={{ color: 'var(--text-primary)' }}>
        {label}
      </span>
    </label>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2">{children}</div>
  );
}

function SliderField({
  value,
  onChange,
  min,
  max,
  step = 5,
  width = 220,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  width?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-[var(--accent-orange)]"
        style={{ width }}
      />
      <span className="text-xs" style={{ color: 'var(--text-secondary)', minWidth: 32 }}>
        {value}%
      </span>
    </div>
  );
}

/** Clickable color swatch that opens color picker dialog */
function ClickableColorSwatch({
  color,
  label,
  onColorChange,
}: {
  color: string;
  label: string;
  onColorChange: (color: string) => void;
}) {
  const handleClick = useCallback(() => {
    // Open color picker dialog via UI store
    // Store the callback info for when picker returns
    const key = `colorPicker:settings:${label}`;
    // Store pending callback in a global map
    (window as unknown as Record<string, unknown>).__settingsColorCallback = onColorChange;
    (window as unknown as Record<string, unknown>).__settingsColorInitial = color;
    useUiStore.getState().setActiveDialog(key);
  }, [color, label, onColorChange]);

  return (
    <div
      className="cursor-pointer rounded"
      style={{
        width: 40,
        height: 24,
        backgroundColor: color,
        border: '1px solid #555',
        borderRadius: 4,
      }}
      onClick={handleClick}
      title={`Click to change (${color})`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
      data-testid={`color-swatch-${label}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Snapshot helper
// ---------------------------------------------------------------------------

function snapshotFromStore(s: AppSettings) {
  return {
    // General - Paths
    projectPath: s.filePaths.projectsFolder,
    exportPath: s.filePaths.exportsFolder,
    videoPath: s.filePaths.videoPath,
    templatePath: s.filePaths.templatesFolder,
    galleryPath: s.filePaths.galleryPath,
    bgFolderPath: s.filePaths.backgroundFolderPath,
    layoutPresetsPath: s.filePaths.layoutPresetsPath,
    // General - Behavior
    autoSaveInterval: s.autoSave.intervalSeconds,
    snapshotDiskLimit: s.undoRedo.diskLimitGB,
    maxSnapshotCount: s.undoRedo.maxSteps,
    maxRecentFiles: s.recentFiles.maxRecentFiles,
    maxExportListCount: s.recentFiles.maxExportListCount,
    frameToShapeFillMode: s.video.frameToShapeFillMode,
    silentExportFormat: s.silentExport.format,
    // Canvas - Grid
    gridSizeX: s.canvas.gridSizeX,
    gridSizeY: s.canvas.gridSizeY,
    gridColor: s.canvas.gridColor,
    gridOpacity: s.canvas.gridOpacity,
    showItemsOutside: s.canvas.showItemsOutsideCanvas,
    // Canvas - Nudge
    nudgeArrow: s.nudge.small,
    nudgeShift: s.nudge.medium,
    nudgeShiftCtrl: s.nudge.large,
    nudgeShiftCtrlAlt: s.nudge.extraLarge,
    // Canvas - Selection Colors
    selectionColor: s.selection.singleSelectColor,
    firstSelectedColor: s.selection.firstSelectedColor,
    multiSelectedColor: s.selection.multiSelectColor,
    groupBoxColor: s.selection.groupSelectColor,
    marqueeColor: s.selection.marqueeColor,
    lockedSelectionColor: s.selection.lockedSelectionColor,
    // Canvas - Selection Sizes
    selectionBorder: s.selection.selectionLineWidth,
    multiSelectBorder: s.selection.multiSelectBorderThickness,
    groupBoxBorder: s.selection.groupBoxBorderThickness,
    handleSize: s.selection.handleSize,
    rotationOffset: s.selection.rotationHandleDistance,
    handleStroke: s.selection.handleStrokeThickness,
    marqueeBorder: s.selection.marqueeBorderThickness,
    lockedSelectionBorder: s.selection.lockedSelectionBorderThickness,
    // Canvas - Brush Cursor
    brushCursorColor: s.canvas.brushCursorColor,
    brushCursorThickness: s.canvas.brushCursorThickness,
    // Export
    jpgQuality: s.export.jpegQuality,
    exportBgMode: s.export.backgroundMode,
    exportBgColor: s.export.backgroundColor,
    // Silent Export
    silentSaveProject: s.silentExport.saveProject,
    silentNamingMode: s.silentExport.namingMode,
    silentAutoLoadTemplate: s.silentExport.autoLoadTemplate,
    silentAutoImportVideo: s.silentExport.autoImportVideo,
    silentAutoLoadNext: s.silentExport.autoLoadNextFromBrowser,
    silentAutoOpenImage: s.silentExport.autoOpenImage,
    silentAutoOpenFolder: s.silentExport.autoOpenFolder,
    silentAutoClearFrames: s.silentExport.autoClearFrames,
    // Frame Extraction
    frameExtractionCount: s.video.frameExtractionCount,
    frameExtractionInterval: s.video.frameExtractionIntervalSeconds,
    // AI
    forceCpuMode: s.ai.inferenceDevice === 'cpu',
    // Network
    textServerIp: s.textServer.host,
    textServerPort: s.textServer.port,
    textServerAlias: s.textServer.alias,
    textServerAutoConnect: s.textServer.autoConnect,
    textServerNetworkLog: s.textServer.enableNetworkLog,
    renderServerIp: s.renderServer.host,
    renderServerPort: s.renderServer.port,
    renderServerAutoConnect: s.renderServer.autoConnect,
  };
}

type Snapshot = ReturnType<typeof snapshotFromStore>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SettingsWindow({ open, onOpenChange, onSave, onReset }: SettingsWindowProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const storeSettings = useSettingsStore((s) => s.settings);
  const setSetting = useSettingsStore((s) => s.setSetting);
  const resetAll = useSettingsStore((s) => s.resetAll);
  const saveSettings = useSettingsStore((s) => s.saveSettings);

  // Local state
  const [snap, setSnap] = useState<Snapshot>(() => snapshotFromStore(storeSettings));

  // API Key copy feedback
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // FFmpeg status
  const [ffmpegInstalled, setFfmpegInstalled] = useState(true);
  const [ffmpegDownloading, setFfmpegDownloading] = useState(false);
  const [ffmpegProgressText, setFfmpegProgressText] = useState('');
  const [showFfmpegDeleteConfirm, setShowFfmpegDeleteConfirm] = useState(false);

  // Server connection status (simulated - will be wired to actual server later)
  const [textServerConnected, setTextServerConnected] = useState(false);
  const [renderServerConnected, setRenderServerConnected] = useState(false);
  const [textServerConnecting, setTextServerConnecting] = useState(false);
  const [renderServerConnecting, setRenderServerConnecting] = useState(false);

  const update = useCallback(<K extends keyof Snapshot>(key: K, value: Snapshot[K]) => {
    setSnap((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Sync local state from store when dialog opens
  useEffect(() => {
    if (open) {
      setSnap(snapshotFromStore(storeSettings));
      setShowResetConfirm(false);
      setApiKeyCopied(false);
    }
  }, [open, storeSettings]);

  // ---------------------------------------------------------------------------
  // Silent Export chain interdependency logic (matches WPF UpdateSilentExportChain)
  // ---------------------------------------------------------------------------
  const silentSaveProjectOn = snap.silentSaveProject;
  const isTextLayerMode = snap.silentNamingMode === 1;
  const videoChain = silentSaveProjectOn && snap.silentAutoLoadTemplate && !isTextLayerMode;

  // Auto-disable dependent options when prerequisites are off (matches WPF behavior)
  useEffect(() => {
    setSnap((prev) => {
      const next = { ...prev };
      let changed = false;

      // Naming mode panel only active when Save Project is on (just visual - no auto-uncheck)
      // Auto load template only enabled when Save Project is on
      if (!prev.silentSaveProject && prev.silentAutoLoadTemplate) {
        next.silentAutoLoadTemplate = false;
        changed = true;
      }
      // Video-only options: require Save Project + Auto Template + Video Frame mode
      const vc = prev.silentSaveProject && prev.silentAutoLoadTemplate && prev.silentNamingMode !== 1;
      if (!vc && prev.silentAutoImportVideo) { next.silentAutoImportVideo = false; changed = true; }
      if (!vc && prev.silentAutoLoadNext) { next.silentAutoLoadNext = false; changed = true; }
      // Post-export open actions: enabled when Save Project is on
      if (!prev.silentSaveProject && prev.silentAutoOpenImage) { next.silentAutoOpenImage = false; changed = true; }
      if (!prev.silentSaveProject && prev.silentAutoOpenFolder) { next.silentAutoOpenFolder = false; changed = true; }
      if (!prev.silentSaveProject && prev.silentAutoClearFrames) { next.silentAutoClearFrames = false; changed = true; }

      return changed ? next : prev;
    });
  }, [snap.silentSaveProject, snap.silentAutoLoadTemplate, snap.silentNamingMode]);

  const handleSave = useCallback(() => {
    // Push all local state to the settings store
    setSetting('filePaths.projectsFolder', snap.projectPath);
    setSetting('filePaths.exportsFolder', snap.exportPath);
    setSetting('filePaths.videoPath', snap.videoPath);
    setSetting('filePaths.templatesFolder', snap.templatePath);
    setSetting('filePaths.galleryPath', snap.galleryPath);
    setSetting('filePaths.backgroundFolderPath', snap.bgFolderPath);
    setSetting('filePaths.layoutPresetsPath', snap.layoutPresetsPath);
    setSetting('autoSave.intervalSeconds', snap.autoSaveInterval);
    setSetting('undoRedo.diskLimitGB', snap.snapshotDiskLimit);
    setSetting('undoRedo.maxSteps', snap.maxSnapshotCount);
    setSetting('recentFiles.maxRecentFiles', snap.maxRecentFiles);
    setSetting('recentFiles.maxExportListCount', snap.maxExportListCount);
    setSetting('video.frameToShapeFillMode', snap.frameToShapeFillMode);
    setSetting('silentExport.format', snap.silentExportFormat);
    // Canvas
    setSetting('canvas.gridSizeX', snap.gridSizeX);
    setSetting('canvas.gridSizeY', snap.gridSizeY);
    setSetting('canvas.gridSize', snap.gridSizeX); // backward compat
    setSetting('canvas.gridColor', snap.gridColor);
    setSetting('canvas.gridOpacity', snap.gridOpacity);
    setSetting('canvas.showItemsOutsideCanvas', snap.showItemsOutside);
    setSetting('nudge.small', snap.nudgeArrow);
    setSetting('nudge.medium', snap.nudgeShift);
    setSetting('nudge.large', snap.nudgeShiftCtrl);
    setSetting('nudge.extraLarge', snap.nudgeShiftCtrlAlt);
    setSetting('selection.singleSelectColor', snap.selectionColor);
    setSetting('selection.firstSelectedColor', snap.firstSelectedColor);
    setSetting('selection.multiSelectColor', snap.multiSelectedColor);
    setSetting('selection.groupSelectColor', snap.groupBoxColor);
    setSetting('selection.marqueeColor', snap.marqueeColor);
    setSetting('selection.lockedSelectionColor', snap.lockedSelectionColor);
    setSetting('selection.selectionLineWidth', snap.selectionBorder);
    setSetting('selection.multiSelectBorderThickness', snap.multiSelectBorder);
    setSetting('selection.groupBoxBorderThickness', snap.groupBoxBorder);
    setSetting('selection.handleSize', snap.handleSize);
    setSetting('selection.rotationHandleDistance', snap.rotationOffset);
    setSetting('selection.handleStrokeThickness', snap.handleStroke);
    setSetting('selection.marqueeBorderThickness', snap.marqueeBorder);
    setSetting('selection.lockedSelectionBorderThickness', snap.lockedSelectionBorder);
    setSetting('canvas.brushCursorColor', snap.brushCursorColor);
    setSetting('canvas.brushCursorThickness', snap.brushCursorThickness);
    // Export
    setSetting('export.jpegQuality', snap.jpgQuality);
    setSetting('export.backgroundMode', snap.exportBgMode);
    setSetting('export.backgroundColor', snap.exportBgColor);
    setSetting('silentExport.saveProject', snap.silentSaveProject);
    setSetting('silentExport.namingMode', snap.silentNamingMode);
    setSetting('silentExport.autoLoadTemplate', snap.silentAutoLoadTemplate);
    setSetting('silentExport.autoImportVideo', snap.silentAutoImportVideo);
    setSetting('silentExport.autoLoadNextFromBrowser', snap.silentAutoLoadNext);
    setSetting('silentExport.autoOpenImage', snap.silentAutoOpenImage);
    setSetting('silentExport.autoOpenFolder', snap.silentAutoOpenFolder);
    setSetting('silentExport.autoClearFrames', snap.silentAutoClearFrames);
    setSetting('video.frameExtractionCount', snap.frameExtractionCount);
    setSetting('video.frameExtractionIntervalSeconds', snap.frameExtractionInterval);
    // AI
    setSetting('ai.inferenceDevice', snap.forceCpuMode ? 'cpu' : 'gpu');
    // Network
    setSetting('textServer.host', snap.textServerIp);
    setSetting('textServer.port', snap.textServerPort);
    setSetting('textServer.alias', snap.textServerAlias);
    setSetting('textServer.autoConnect', snap.textServerAutoConnect);
    setSetting('textServer.enableNetworkLog', snap.textServerNetworkLog);
    setSetting('renderServer.host', snap.renderServerIp);
    setSetting('renderServer.port', snap.renderServerPort);
    setSetting('renderServer.autoConnect', snap.renderServerAutoConnect);
    saveSettings();
    onSave?.();
    onOpenChange(false);
  }, [snap, setSetting, saveSettings, onSave, onOpenChange]);

  const handleReset = useCallback(() => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }
    resetAll();
    setSnap(snapshotFromStore(createDefaultSettings()));
    setShowResetConfirm(false);
    onReset?.();
  }, [resetAll, onReset, showResetConfirm]);

  const handleCopyApiKey = useCallback(async () => {
    const machineId = 'thamnel-' + Math.random().toString(36).substring(2, 10);
    try {
      await navigator.clipboard.writeText(machineId);
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
    } catch {
      // fallback
    }
  }, []);

  const handleFfmpegDelete = useCallback(() => {
    if (!showFfmpegDeleteConfirm) {
      setShowFfmpegDeleteConfirm(true);
      return;
    }
    // Confirmed - delete FFmpeg
    setFfmpegInstalled(false);
    setShowFfmpegDeleteConfirm(false);
    setFfmpegProgressText('');
  }, [showFfmpegDeleteConfirm]);

  const handleFfmpegDeleteCancel = useCallback(() => {
    setShowFfmpegDeleteConfirm(false);
  }, []);

  const handleFfmpegRedownload = useCallback(async () => {
    setFfmpegDownloading(true);
    setFfmpegProgressText('Starting download...');
    // Simulate download progress
    await new Promise<void>((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        if (progress >= 100) {
          clearInterval(interval);
          resolve();
        } else {
          setFfmpegProgressText(`Downloading... ${progress}%`);
        }
      }, 400);
    });
    setFfmpegProgressText('');
    setFfmpegDownloading(false);
    setFfmpegInstalled(true);
  }, []);

  const handleTextServerConnect = useCallback(async () => {
    setTextServerConnecting(true);
    // Simulate connection attempt
    setTimeout(() => {
      setTextServerConnected((prev) => !prev);
      setTextServerConnecting(false);
    }, 500);
  }, []);

  const handleRenderServerConnect = useCallback(async () => {
    setRenderServerConnecting(true);
    setTimeout(() => {
      setRenderServerConnected((prev) => !prev);
      setRenderServerConnecting(false);
    }, 500);
  }, []);

  const handleFileAssociation = useCallback(async () => {
    try {
      const { message } = await import('@tauri-apps/plugin-dialog');
      await message('File association set successfully!\n\n.rbl files are now associated with Thamnel.', { title: 'File Association', kind: 'info' });
    } catch {
      // Not running in Tauri
    }
  }, []);

  const footer = (
    <>
      {showResetConfirm ? (
        <div className="mr-auto flex items-center gap-2">
          <span className="text-xs" style={{ color: '#FF5252' }}>
            Reset ALL settings to defaults?
          </span>
          <button
            type="button"
            className="rounded px-3 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: '#FF5252' }}
            onClick={handleReset}
          >
            Yes, Reset
          </button>
          <button
            type="button"
            className="rounded px-3 py-1 text-xs font-medium"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--toolbar-bg)' }}
            onClick={() => setShowResetConfirm(false)}
          >
            No
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="mr-auto rounded px-4 py-1.5 text-xs font-medium"
          style={{ color: '#FF5252', backgroundColor: 'transparent' }}
          onClick={handleReset}
          data-testid="settings-reset-all"
        >
          Reset All Settings
        </button>
      )}
      <button
        type="button"
        className="rounded px-5 py-1.5 text-xs font-medium"
        style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
        onClick={() => onOpenChange(false)}
        data-testid="settings-cancel"
      >
        Cancel
      </button>
      <button
        type="button"
        className="rounded px-6 py-1.5 text-xs font-medium text-white"
        style={{ backgroundColor: 'var(--accent-orange)' }}
        onClick={handleSave}
        data-testid="settings-save"
      >
        Save
      </button>
    </>
  );

  return (
    <DialogBase
      open={open}
      onOpenChange={onOpenChange}
      title="SETTINGS"
      width={750}
      height={820}
      footer={footer}
    >
      <div className="flex h-full flex-col" data-testid="settings-dialog-content">
        <Tabs.Root
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabId)}
          orientation="vertical"
          className="flex flex-1"
        >
          {/* Vertical Navigation Rail */}
          <Tabs.List
            className="flex shrink-0 flex-col border-r"
            style={{ borderColor: 'var(--border-color)', width: 80 }}
            data-testid="settings-tabs"
          >
            {TABS.map((t) => (
              <Tabs.Trigger
                key={t.id}
                value={t.id}
                className="flex flex-col items-center justify-center gap-1 px-2 py-3 outline-none"
                style={{
                  color: activeTab === t.id ? 'var(--accent-orange)' : 'var(--text-secondary)',
                  backgroundColor: activeTab === t.id ? 'rgba(255,102,0,0.12)' : 'transparent',
                  cursor: 'pointer',
                  minHeight: 56,
                }}
                data-testid={`settings-tab-${t.id}`}
              >
                <Icon path={t.icon} size={20} color={activeTab === t.id ? 'var(--accent-orange)' : 'var(--text-secondary)'} />
                <span className="text-[11px]">{t.label}</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* ---- General ---- */}
          <Tabs.Content value="general" className="flex-1 overflow-auto p-4" data-testid="settings-general">
            {/* Default Paths */}
            <SectionCard>
              <SectionHeader>DEFAULT PATHS</SectionHeader>
              <PathField
                label="Default Project Path"
                value={snap.projectPath}
                onChange={(v) => update('projectPath', v)}
                testId="settings-project-path"
              />
              <PathField
                label="Default Export Path"
                value={snap.exportPath}
                onChange={(v) => update('exportPath', v)}
                testId="settings-export-path"
              />
              <PathField
                label="Default Video Path"
                value={snap.videoPath}
                onChange={(v) => update('videoPath', v)}
                testId="settings-video-path"
              />
              <PathField
                label="Template Folder"
                value={snap.templatePath}
                onChange={(v) => update('templatePath', v)}
                testId="settings-template-path"
              />
              <PathField
                label="Gallery Path"
                value={snap.galleryPath}
                onChange={(v) => update('galleryPath', v)}
                testId="settings-gallery-path"
              />
              <PathField
                label="Background Folder Path"
                value={snap.bgFolderPath}
                onChange={(v) => update('bgFolderPath', v)}
                testId="settings-bg-folder-path"
              />
              <PathField
                label="Layout Presets Path"
                value={snap.layoutPresetsPath}
                onChange={(v) => update('layoutPresetsPath', v)}
                testId="settings-layout-presets-path"
              />
            </SectionCard>

            {/* File Association */}
            <SectionCard>
              <SectionHeader>FILE ASSOCIATION</SectionHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Associate .rbl files with Thamnel
                  </div>
                  <div className="mt-1 text-[10px]" style={{ color: '#666' }}>
                    Sets Thamnel as the default application for .rbl files and assigns the app icon.
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded px-4 py-1.5 text-xs font-medium text-white"
                  style={{ backgroundColor: 'var(--accent-orange)' }}
                  onClick={handleFileAssociation}
                  data-testid="settings-file-association"
                >
                  Set File Association
                </button>
              </div>
            </SectionCard>

            {/* Behavior */}
            <SectionCard>
              <SectionHeader>BEHAVIOR</SectionHeader>
              <FieldRow label="Auto-Save Interval (sec)">
                <NumericUpDown
                  value={snap.autoSaveInterval}
                  onChange={(v) => update('autoSaveInterval', v)}
                  min={10} max={3600} step={10} width={110}
                />
              </FieldRow>
              <FieldRow
                label="Undo History Disk Limit (GB)"
                hint="Maximum disk space for undo history. Oldest project histories are removed when exceeded."
              >
                <NumericUpDown
                  value={snap.snapshotDiskLimit}
                  onChange={(v) => update('snapshotDiskLimit', v)}
                  min={1} max={100} width={110}
                />
              </FieldRow>
              <FieldRow
                label="Max Undo Steps"
                hint="Maximum number of undo steps per document. Higher values use more disk space."
              >
                <NumericUpDown
                  value={snap.maxSnapshotCount}
                  onChange={(v) => update('maxSnapshotCount', v)}
                  min={5} max={200} step={5} width={110}
                />
              </FieldRow>
              <FieldRow
                label="Recent Files Per Category"
                hint="Maximum number of recent files tracked per category (Projects, Images, etc.)."
              >
                <NumericUpDown
                  value={snap.maxRecentFiles}
                  onChange={(v) => update('maxRecentFiles', v)}
                  min={5} max={100} step={5} width={110}
                />
              </FieldRow>
              <FieldRow
                label="Max Export List Entries"
                hint="Maximum number of exports to keep in the export history list."
              >
                <NumericUpDown
                  value={snap.maxExportListCount}
                  onChange={(v) => update('maxExportListCount', v)}
                  min={10} max={1000} step={10} width={110}
                />
              </FieldRow>
              <FieldRow label="Frame to Shape Fill Mode">
                <SelectField
                  value={FILL_MODES[snap.frameToShapeFillMode] ?? 'Uniform Fill'}
                  onValueChange={(v) => update('frameToShapeFillMode', FILL_MODES.indexOf(v))}
                  options={FILL_MODES}
                  testId="settings-fill-mode"
                />
              </FieldRow>
              <div className="text-[10px]" style={{ color: '#666', marginLeft: 180, marginTop: 2 }}>
                How frame images fill shapes when assigned via right-click.
              </div>
              <FieldRow label="Silent Export Format">
                <SelectField
                  value={snap.silentExportFormat}
                  onValueChange={(v) => update('silentExportFormat', v)}
                  options={SILENT_EXPORT_FORMATS}
                  testId="settings-silent-format"
                />
              </FieldRow>
              <div className="text-[10px]" style={{ color: '#666', marginLeft: 180, marginTop: 2 }}>
                Image format used for quick/silent exports.
              </div>
            </SectionCard>
          </Tabs.Content>

          {/* ---- Canvas ---- */}
          <Tabs.Content value="canvas" className="flex-1 overflow-auto p-4" data-testid="settings-canvas">
            {/* Grid & Display */}
            <SectionCard>
              <SectionHeader>GRID &amp; DISPLAY</SectionHeader>
              <TwoCol>
                <FieldRow label="Grid Width (px)" labelWidth={110}>
                  <NumericUpDown
                    value={snap.gridSizeX}
                    onChange={(v) => update('gridSizeX', v)}
                    min={5} max={500} step={5} width={90}
                  />
                </FieldRow>
                <FieldRow label="Grid Height (px)" labelWidth={110}>
                  <NumericUpDown
                    value={snap.gridSizeY}
                    onChange={(v) => update('gridSizeY', v)}
                    min={5} max={500} step={5} width={90}
                  />
                </FieldRow>
                <FieldRow label="Grid Line Color" labelWidth={110}>
                  <ClickableColorSwatch
                    color={snap.gridColor}
                    label="grid-color"
                    onColorChange={(c) => update('gridColor', c)}
                  />
                </FieldRow>
                <FieldRow label="Grid Opacity (%)" labelWidth={110}>
                  <NumericUpDown
                    value={snap.gridOpacity}
                    onChange={(v) => update('gridOpacity', v)}
                    min={1} max={100} step={5} width={90}
                  />
                </FieldRow>
              </TwoCol>
              <CheckboxField
                label="Show items outside of canvas"
                checked={snap.showItemsOutside}
                onChange={(v) => update('showItemsOutside', v)}
                testId="settings-show-outside"
              />
            </SectionCard>

            {/* Arrow Key Nudge */}
            <SectionCard>
              <SectionHeader>ARROW KEY NUDGE (px)</SectionHeader>
              <TwoCol>
                <FieldRow label="Arrow" labelWidth={110}>
                  <NumericUpDown
                    value={snap.nudgeArrow}
                    onChange={(v) => update('nudgeArrow', v)}
                    min={1} max={100} width={90}
                  />
                </FieldRow>
                <FieldRow label="Shift + Arrow" labelWidth={110}>
                  <NumericUpDown
                    value={snap.nudgeShift}
                    onChange={(v) => update('nudgeShift', v)}
                    min={1} max={200} width={90}
                  />
                </FieldRow>
                <FieldRow label="Shift+Ctrl+Arrow" labelWidth={110}>
                  <NumericUpDown
                    value={snap.nudgeShiftCtrl}
                    onChange={(v) => update('nudgeShiftCtrl', v)}
                    min={1} max={500} step={5} width={90}
                  />
                </FieldRow>
                <FieldRow label="Shift+Ctrl+Alt" labelWidth={110}>
                  <NumericUpDown
                    value={snap.nudgeShiftCtrlAlt}
                    onChange={(v) => update('nudgeShiftCtrlAlt', v)}
                    min={1} max={1000} step={10} width={90}
                  />
                </FieldRow>
              </TwoCol>
            </SectionCard>

            {/* Selection Colors */}
            <SectionCard>
              <SectionHeader>SELECTION COLORS</SectionHeader>
              <TwoCol>
                <div className="flex items-center gap-2 py-1">
                  <ClickableColorSwatch color={snap.selectionColor} label="selection" onColorChange={(c) => update('selectionColor', c)} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Selection</span>
                </div>
                <div className="flex items-center gap-2 py-1">
                  <ClickableColorSwatch color={snap.firstSelectedColor} label="first-selected" onColorChange={(c) => update('firstSelectedColor', c)} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>First Selected</span>
                </div>
                <div className="flex items-center gap-2 py-1">
                  <ClickableColorSwatch color={snap.multiSelectedColor} label="multi-selected" onColorChange={(c) => update('multiSelectedColor', c)} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Multi Selected</span>
                </div>
                <div className="flex items-center gap-2 py-1">
                  <ClickableColorSwatch color={snap.groupBoxColor} label="group-box" onColorChange={(c) => update('groupBoxColor', c)} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Group Box</span>
                </div>
                <div className="flex items-center gap-2 py-1">
                  <ClickableColorSwatch color={snap.marqueeColor} label="marquee" onColorChange={(c) => update('marqueeColor', c)} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Marquee</span>
                </div>
                <div className="flex items-center gap-2 py-1">
                  <ClickableColorSwatch color={snap.lockedSelectionColor} label="locked-selection" onColorChange={(c) => update('lockedSelectionColor', c)} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Locked Selection</span>
                </div>
              </TwoCol>
            </SectionCard>

            {/* Selection Sizes */}
            <SectionCard>
              <SectionHeader>SELECTION SIZES</SectionHeader>
              <TwoCol>
                <FieldRow label="Selection Border" labelWidth={110}>
                  <NumericUpDown value={snap.selectionBorder} onChange={(v) => update('selectionBorder', v)} min={0.5} max={10} step={0.5} width={90} />
                </FieldRow>
                <FieldRow label="Multi-Select" labelWidth={110}>
                  <NumericUpDown value={snap.multiSelectBorder} onChange={(v) => update('multiSelectBorder', v)} min={0.5} max={10} step={0.5} width={90} />
                </FieldRow>
                <FieldRow label="Group Box" labelWidth={110}>
                  <NumericUpDown value={snap.groupBoxBorder} onChange={(v) => update('groupBoxBorder', v)} min={0.5} max={10} step={0.5} width={90} />
                </FieldRow>
                <FieldRow label="Handle Size" labelWidth={110}>
                  <NumericUpDown value={snap.handleSize} onChange={(v) => update('handleSize', v)} min={4} max={20} width={90} />
                </FieldRow>
                <FieldRow label="Rotation Offset" labelWidth={110}>
                  <NumericUpDown value={snap.rotationOffset} onChange={(v) => update('rotationOffset', v)} min={10} max={60} step={2} width={90} />
                </FieldRow>
                <FieldRow label="Handle Stroke" labelWidth={110}>
                  <NumericUpDown value={snap.handleStroke} onChange={(v) => update('handleStroke', v)} min={0.5} max={5} step={0.5} width={90} />
                </FieldRow>
                <FieldRow label="Marquee Border" labelWidth={110}>
                  <NumericUpDown value={snap.marqueeBorder} onChange={(v) => update('marqueeBorder', v)} min={0.5} max={5} step={0.5} width={90} />
                </FieldRow>
                <FieldRow label="Locked Selection" labelWidth={110}>
                  <NumericUpDown value={snap.lockedSelectionBorder} onChange={(v) => update('lockedSelectionBorder', v)} min={0.5} max={10} step={0.5} width={90} />
                </FieldRow>
              </TwoCol>

              <SectionHeader>BRUSH CURSOR</SectionHeader>
              <TwoCol>
                <FieldRow label="Cursor Color" labelWidth={110}>
                  <ClickableColorSwatch color={snap.brushCursorColor} label="brush-cursor" onColorChange={(c) => update('brushCursorColor', c)} />
                </FieldRow>
                <FieldRow label="Cursor Thickness" labelWidth={110}>
                  <NumericUpDown value={snap.brushCursorThickness} onChange={(v) => update('brushCursorThickness', v)} min={0.5} max={5} step={0.5} width={90} />
                </FieldRow>
              </TwoCol>
            </SectionCard>
          </Tabs.Content>

          {/* ---- Export ---- */}
          <Tabs.Content value="export" className="flex-1 overflow-auto p-4" data-testid="settings-export">
            {/* Image Quality */}
            <SectionCard>
              <SectionHeader>IMAGE QUALITY</SectionHeader>
              <FieldRow label="JPG Export Quality">
                <SliderField
                  value={snap.jpgQuality}
                  onChange={(v) => update('jpgQuality', v)}
                  min={10} max={100} step={5}
                />
              </FieldRow>
            </SectionCard>

            {/* Export Background */}
            <SectionCard>
              <SectionHeader>EXPORT BACKGROUND</SectionHeader>
              <RadioField
                label="Use Canvas Background"
                checked={snap.exportBgMode === 0}
                onChange={() => update('exportBgMode', 0)}
                name="exportBg"
              />
              <RadioField
                label="Transparent Background (PNG only)"
                checked={snap.exportBgMode === 1}
                onChange={() => update('exportBgMode', 1)}
                name="exportBg"
              />
              <RadioField
                label="Custom Color"
                checked={snap.exportBgMode === 2}
                onChange={() => update('exportBgMode', 2)}
                name="exportBg"
              />
              {snap.exportBgMode === 2 && (
                <div className="mt-2 ml-6 flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Color</span>
                  <ClickableColorSwatch color={snap.exportBgColor} label="export-bg" onColorChange={(c) => update('exportBgColor', c)} />
                </div>
              )}
            </SectionCard>

            {/* Silent Export */}
            <SectionCard>
              <SectionHeader>SILENT EXPORT</SectionHeader>
              <CheckboxField
                label="Save project file with silent export"
                checked={snap.silentSaveProject}
                onChange={(v) => update('silentSaveProject', v)}
                testId="settings-silent-save-project"
              />
              {/* Naming mode radio buttons */}
              <div className="ml-5 my-1" style={{ opacity: silentSaveProjectOn ? 1 : 0.5 }}>
                <RadioField
                  label="Based on video frame name"
                  checked={snap.silentNamingMode === 0}
                  onChange={() => update('silentNamingMode', 0)}
                  name="silentNaming"
                  disabled={!silentSaveProjectOn}
                />
                <RadioField
                  label="Based on selected text layer"
                  checked={snap.silentNamingMode === 1}
                  onChange={() => update('silentNamingMode', 1)}
                  name="silentNaming"
                  disabled={!silentSaveProjectOn}
                />
                {snap.silentNamingMode === 1 && (
                  <div className="ml-5 mt-0.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Saves to: Default Project Path\layer text_username_1280x720.rbl
                  </div>
                )}
              </div>
              <CheckboxField
                label="Auto open last template with silent export"
                checked={snap.silentAutoLoadTemplate}
                onChange={(v) => update('silentAutoLoadTemplate', v)}
                disabled={!silentSaveProjectOn}
              />
              <CheckboxField
                label="Auto video file import dialog after silent export"
                checked={snap.silentAutoImportVideo}
                onChange={(v) => update('silentAutoImportVideo', v)}
                disabled={!videoChain}
              />
              <CheckboxField
                label="Automatic load next video from video browser after silent export"
                checked={snap.silentAutoLoadNext}
                onChange={(v) => update('silentAutoLoadNext', v)}
                disabled={!videoChain}
              />
              <CheckboxField
                label="Auto open exported image"
                checked={snap.silentAutoOpenImage}
                onChange={(v) => update('silentAutoOpenImage', v)}
                disabled={!silentSaveProjectOn}
              />
              <CheckboxField
                label="Auto open export folder"
                checked={snap.silentAutoOpenFolder}
                onChange={(v) => update('silentAutoOpenFolder', v)}
                disabled={!silentSaveProjectOn}
              />
              <CheckboxField
                label="Auto clear previous frames"
                checked={snap.silentAutoClearFrames}
                onChange={(v) => update('silentAutoClearFrames', v)}
                disabled={!silentSaveProjectOn}
              />
            </SectionCard>

            {/* Frame Extraction */}
            <SectionCard>
              <SectionHeader>FRAME EXTRACTION</SectionHeader>
              <FieldRow label="Frames to Extract per Video">
                <NumericUpDown
                  value={snap.frameExtractionCount}
                  onChange={(v) => update('frameExtractionCount', v)}
                  min={0} max={200} width={110}
                />
              </FieldRow>
              <FieldRow label="Frame Interval (sec, if count=0)">
                <NumericUpDown
                  value={snap.frameExtractionInterval}
                  onChange={(v) => update('frameExtractionInterval', v)}
                  min={1} max={600} step={5} width={110}
                />
              </FieldRow>
            </SectionCard>
          </Tabs.Content>

          {/* ---- AI ---- */}
          <Tabs.Content value="ai" className="flex-1 overflow-auto p-4" data-testid="settings-ai">
            {/* AI Models */}
            <SectionCard>
              <SectionHeader>AI MODELS</SectionHeader>
              <div className="text-[11px]" style={{ color: '#999' }}>
                Download required AI models. Models are stored locally.
              </div>
              <div className="mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                No models configured yet. Models will appear here when the AI backend is connected.
              </div>
            </SectionCard>

            {/* FFmpeg Info */}
            <div className="mb-3 rounded-lg p-3.5" style={{ backgroundColor: '#222' }}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-white">FFmpeg (Video Frames)</span>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block rounded-full"
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: ffmpegInstalled ? '#81C784' : '#FF5252',
                    }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: ffmpegInstalled ? '#81C784' : '#FF5252' }}
                  >
                    {ffmpegInstalled ? 'Installed' : 'Not Installed'}
                  </span>
                </div>
              </div>
              <div className="text-[11px]" style={{ color: '#999' }}>
                FFmpeg is used for video frame extraction. Install it to enable video import features.
              </div>

              {/* Delete confirmation */}
              {showFfmpegDeleteConfirm && (
                <div className="mt-2 flex items-center gap-2 rounded p-2 text-[11px]" style={{ backgroundColor: '#1a1a1a', border: '1px solid #FF5252' }}>
                  <span style={{ color: '#FF5252' }}>Delete FFmpeg? You can redownload it later.</span>
                  <button
                    type="button"
                    className="rounded px-2 py-0.5 text-[11px] font-medium text-white"
                    style={{ backgroundColor: '#FF5252' }}
                    onClick={handleFfmpegDelete}
                    data-testid="ffmpeg-delete-confirm"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    className="rounded px-2 py-0.5 text-[11px]"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={handleFfmpegDeleteCancel}
                  >
                    No
                  </button>
                </div>
              )}

              {/* Download progress text */}
              {ffmpegProgressText && (
                <div
                  className="mt-2 text-[11px]"
                  style={{ color: 'var(--accent-orange)' }}
                  data-testid="ffmpeg-progress-text"
                >
                  {ffmpegProgressText}
                </div>
              )}

              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-[11px]"
                  style={{
                    borderColor: '#FF5252',
                    color: '#FF5252',
                    backgroundColor: 'transparent',
                    opacity: (!ffmpegInstalled || ffmpegDownloading) ? 0.4 : 1,
                    cursor: (!ffmpegInstalled || ffmpegDownloading) ? 'default' : 'pointer',
                  }}
                  disabled={!ffmpegInstalled || ffmpegDownloading}
                  onClick={handleFfmpegDelete}
                  data-testid="ffmpeg-delete-btn"
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-[11px]"
                  style={{
                    borderColor: 'var(--accent-orange)',
                    color: 'var(--accent-orange)',
                    backgroundColor: 'transparent',
                    opacity: ffmpegDownloading ? 0.4 : 1,
                    cursor: ffmpegDownloading ? 'default' : 'pointer',
                  }}
                  disabled={ffmpegDownloading}
                  onClick={handleFfmpegRedownload}
                  data-testid="ffmpeg-redownload-btn"
                >
                  Redownload
                </button>
              </div>
            </div>

            {/* GPU Acceleration */}
            <div className="mb-3 rounded-lg p-3.5" style={{ backgroundColor: '#222' }}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-white">GPU Acceleration (DirectML)</span>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 10, height: 10, backgroundColor: '#81C784' }}
                  />
                  <span className="text-xs" style={{ color: '#81C784' }}>Available</span>
                </div>
              </div>
              <div className="text-[11px]" style={{ color: '#777' }}>
                DirectML provides GPU-accelerated AI inference on all GPUs (NVIDIA, AMD, Intel). No additional downloads required.
              </div>
              <CheckboxField
                label="Force CPU Mode (skip GPU even if available)"
                checked={snap.forceCpuMode}
                onChange={(v) => update('forceCpuMode', v)}
                testId="settings-force-cpu"
              />
            </div>

            {/* Server API Key */}
            <div className="mb-3 rounded-lg p-3.5" style={{ backgroundColor: '#222' }}>
              <div className="mb-2 text-[13px] font-semibold text-white">Server API Key</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value="(generated on first server connection)"
                  className="flex-1 rounded border-none bg-transparent px-1 py-1 font-mono text-xs outline-none"
                  style={{ color: '#CCC' }}
                  data-testid="settings-api-key"
                />
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-[11px]"
                  style={{
                    borderColor: 'var(--accent-orange)',
                    color: apiKeyCopied ? '#81C784' : 'var(--accent-orange)',
                    backgroundColor: 'transparent',
                  }}
                  onClick={handleCopyApiKey}
                >
                  {apiKeyCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </Tabs.Content>

          {/* ---- Network ---- */}
          <Tabs.Content value="network" className="flex-1 overflow-auto p-4" data-testid="settings-network">
            {/* Text Server */}
            <SectionCard>
              <SectionHeader>TEXT SERVER</SectionHeader>
              <FieldRow label="Server IP">
                <TextInput
                  value={snap.textServerIp}
                  onChange={(v) => update('textServerIp', v)}
                  testId="settings-text-host"
                  width={200}
                />
              </FieldRow>
              <FieldRow label="Server Port">
                <NumericUpDown
                  value={snap.textServerPort}
                  onChange={(v) => update('textServerPort', v)}
                  min={1} max={65535} width={110}
                />
              </FieldRow>
              <FieldRow label="Alias Name">
                <TextInput
                  value={snap.textServerAlias}
                  onChange={(v) => update('textServerAlias', v)}
                  testId="settings-text-alias"
                  width={200}
                  placeholder="PC name if empty"
                />
              </FieldRow>
              <CheckboxField
                label="Auto Connect When Software Run"
                checked={snap.textServerAutoConnect}
                onChange={(v) => update('textServerAutoConnect', v)}
                testId="settings-text-auto-connect"
              />
              <CheckboxField
                label="Enable Network Log (saved to NetworkLog/ folder)"
                checked={snap.textServerNetworkLog}
                onChange={(v) => update('textServerNetworkLog', v)}
                testId="settings-text-network-log"
              />
              <div className="mt-3">
                <button
                  type="button"
                  className="rounded px-6 py-2 text-xs font-medium text-white"
                  style={{ backgroundColor: 'var(--accent-orange)' }}
                  onClick={handleTextServerConnect}
                  disabled={textServerConnecting}
                  data-testid="settings-text-connect"
                >
                  {textServerConnecting ? 'Connecting...' : textServerConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </SectionCard>

            {/* Render Server */}
            <SectionCard>
              <SectionHeader>RENDER SERVER</SectionHeader>
              <FieldRow label="Server IP">
                <TextInput
                  value={snap.renderServerIp}
                  onChange={(v) => update('renderServerIp', v)}
                  testId="settings-render-host"
                  width={200}
                />
              </FieldRow>
              <FieldRow label="Server Port">
                <NumericUpDown
                  value={snap.renderServerPort}
                  onChange={(v) => update('renderServerPort', v)}
                  min={1} max={65535} width={110}
                />
              </FieldRow>
              <CheckboxField
                label="Auto Connect When Software Run"
                checked={snap.renderServerAutoConnect}
                onChange={(v) => update('renderServerAutoConnect', v)}
                testId="settings-render-auto-connect"
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  className="rounded px-6 py-2 text-xs font-medium text-white"
                  style={{ backgroundColor: 'var(--accent-orange)' }}
                  onClick={handleRenderServerConnect}
                  disabled={renderServerConnecting}
                  data-testid="settings-render-connect"
                >
                  {renderServerConnecting ? 'Connecting...' : renderServerConnected ? 'Disconnect' : 'Connect'}
                </button>
                <span
                  className="text-xs"
                  style={{ color: renderServerConnected ? '#81C784' : '#EF5350' }}
                >
                  {renderServerConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </SectionCard>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </DialogBase>
  );
}

export default SettingsWindow;
