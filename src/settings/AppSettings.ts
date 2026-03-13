// ---------------------------------------------------------------------------
// AppSettings – complete application settings interface with 160+ properties,
// defaults, and factory function.
// ---------------------------------------------------------------------------

import type { ExportFormat, EraserMode } from '../types/enums';

// ---------------------------------------------------------------------------
// Sub-interfaces for each category
// ---------------------------------------------------------------------------

export interface WindowStateSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isFullScreen: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
  framePanelHeight: number;
  toolbarHeight: number;
  statusBarHeight: number;
}

export interface FilePathsSettings {
  projectsFolder: string;
  exportsFolder: string;
  videoPath: string;
  templatesFolder: string;
  galleryPath: string;
  backgroundFolderPath: string;
  layoutPresetsPath: string;
  tempFolder: string;
  modelsFolder: string;
  fontsFolder: string;
  autoSaveFolder: string;
  pluginsFolder: string;
  presetsFolder: string;
  cachesFolder: string;
}

export interface AutoSaveSettings {
  enabled: boolean;
  /** Seconds between auto-saves. Range: 10-3600. */
  intervalSeconds: number;
  maxBackups: number;
  saveOnFocusLoss: boolean;
  notifyOnSave: boolean;
}

export interface ExportSettings {
  defaultFormat: ExportFormat;
  /** JPEG quality 1-100. */
  jpegQuality: number;
  /** PNG compression level 0-9. */
  pngCompression: number;
  includeMetadata: boolean;
  outputNamePattern: string;
  openAfterExport: boolean;
  overwriteExisting: boolean;
  preserveColorProfile: boolean;
  defaultDpi: number;
  /** 0 = Canvas Background, 1 = Transparent, 2 = Custom Color */
  backgroundMode: number;
  backgroundColor: string;
}

export interface CanvasSettings {
  defaultWidth: number;
  defaultHeight: number;
  defaultBackground: string;
  gridSize: number;
  gridSizeX: number;
  gridSizeY: number;
  gridVisible: boolean;
  gridColor: string;
  gridOpacity: number;
  snapEnabled: boolean;
  snapThreshold: number;
  showItemsOutsideCanvas: boolean;
  rulerVisible: boolean;
  rulerColor: string;
  canvasBorderColor: string;
  zoomSpeed: number;
  minZoom: number;
  maxZoom: number;
  panSpeed: number;
  smoothZoom: boolean;
  brushCursorColor: string;
  brushCursorThickness: number;
  /** Last used canvas zoom level, restored on next startup. */
  lastZoom: number;
}

export interface VideoSettings {
  ffmpegPath: string;
  defaultFrameCount: number;
  frameQuality: number;
  extractionFormat: string;
  autoExtractOnImport: boolean;
  maxVideoSizeMB: number;
  thumbnailSize: number;
  previewFps: number;
  /** 0=Fill, 1=UniformFill, 2=Uniform, 3=Original, 4=Tile */
  frameToShapeFillMode: number;
  frameExtractionCount: number;
  frameExtractionIntervalSeconds: number;
}

export type InferenceDevice = 'gpu' | 'cpu';

export interface AISettings {
  inferenceDevice: InferenceDevice;
  modelCachePath: string;
  autoDownloadModels: boolean;
  maxConcurrentJobs: number;
  bgRemovalModel: string;
  upscaleModel: string;
  faceRestoreModel: string;
  defaultUpscaleFactor: number;
  gpuMemoryLimitMB: number;
  timeoutSeconds: number;
  showProgressNotification: boolean;
}

export interface InpaintingSettings {
  brushSize: number;
  brushHardness: number;
  previewQuality: number;
  maskColor: string;
  maskOpacity: number;
  featherRadius: number;
  showMaskOverlay: boolean;
}

export interface UIPanelsSettings {
  leftPanelVisible: boolean;
  rightPanelVisible: boolean;
  framePanelVisible: boolean;
  statusBarVisible: boolean;
  rulerVisible: boolean;
  defaultRightTab: string;
  defaultLeftTab: string;
  toolbarPosition: string;
  tooltipsEnabled: boolean;
  tooltipDelayMs: number;
  animationsEnabled: boolean;
}

export interface NudgeSettings {
  small: number;
  medium: number;
  large: number;
  extraLarge: number;
}

export interface EraserSettings {
  defaultMode: EraserMode;
  defaultSize: number;
  defaultOpacity: number;
  minSize: number;
  maxSize: number;
  pressureSensitive: boolean;
}

export interface BlurBrushSettings {
  defaultSize: number;
  defaultIntensity: number;
  throttleMs: number;
  minSize: number;
  maxSize: number;
  previewEnabled: boolean;
}

export interface SelectionSettings {
  handleSize: number;
  rotationHandleDistance: number;
  singleSelectColor: string;
  firstSelectedColor: string;
  multiSelectColor: string;
  groupSelectColor: string;
  marqueeColor: string;
  lockedSelectionColor: string;
  snapGuideColor: string;
  selectionLineWidth: number;
  multiSelectBorderThickness: number;
  groupBoxBorderThickness: number;
  handleStrokeThickness: number;
  marqueeBorderThickness: number;
  lockedSelectionBorderThickness: number;
  selectionDashPattern: number;
  showDimensions: boolean;
  showRotationAngle: boolean;
}

export interface HandleSizesSettings {
  resizeHandle: number;
  rotationHandle: number;
  anchorSize: number;
  cropHandle: number;
  pathPointSize: number;
  controlPointSize: number;
}

export interface TextServerSettings {
  host: string;
  port: number;
  alias: string;
  autoConnect: boolean;
  enableNetworkLog: boolean;
  reconnectIntervalMs: number;
  timeoutMs: number;
  maxRetries: number;
}

export interface RenderServerSettings {
  host: string;
  port: number;
  autoConnect: boolean;
  reconnectIntervalMs: number;
  timeoutMs: number;
  maxRetries: number;
}

export interface UndoRedoSettings {
  /** Range: 5-200. */
  maxSteps: number;
  /** Gigabytes. Range: 1-100. */
  diskLimitGB: number;
  compressSnapshots: boolean;
  groupingDelayMs: number;
}

export interface SilentExportSettings {
  enabled: boolean;
  outputFolder: string;
  format: string;
  quality: number;
  triggerOnSave: boolean;
  includeTimestamp: boolean;
  maxFiles: number;
  saveProject: boolean;
  /** 0 = Based on video frame name, 1 = Based on selected text layer */
  namingMode: number;
  autoLoadTemplate: boolean;
  autoImportVideo: boolean;
  autoLoadNextFromBrowser: boolean;
  autoOpenImage: boolean;
  autoOpenFolder: boolean;
  autoClearFrames: boolean;
}

export interface DateStampSettings {
  defaultLanguage: string;
  defaultCalendar: string;
  defaultFormat: string;
  showTime: boolean;
  use24HourClock: boolean;
  timezone: string;
}

export interface ImageStudioSettings {
  defaultBrushSize: number;
  previewDebounceMs: number;
  settingsDebounceMs: number;
  preEffectDebounceMs: number;
  historyEnabled: boolean;
  livePreview: boolean;
  maxPreviewResolution: number;
}

export interface GroupColorsSettings {
  palette: string[];
  autoAssign: boolean;
  showInLayerPanel: boolean;
}

export interface PerformanceSettings {
  hardwareAcceleration: boolean;
  maxCanvasMemoryMB: number;
  thumbnailCacheSize: number;
  renderQuality: string;
  workerThreadCount: number;
  lazyLoadImages: boolean;
  offscreenRendering: boolean;
}

export interface AccessibilitySettings {
  highContrastMode: boolean;
  reducedMotion: boolean;
  fontSize: number;
  cursorScale: number;
  screenReaderAnnouncements: boolean;
  keyboardNavigationHighlight: boolean;
}

export interface ShapeToolSettings {
  /** Last used shape type (rectangle, ellipse, star, line, etc.). */
  lastShapeType: string;

  // ---- Star settings ----
  /** Star outer spike distance from center (pixels, reference). */
  starSpikeHigh: number;
  /** Star inner valley distance from center (pixels, reference). */
  starSpikeLow: number;
  /** Number of star spikes. */
  starSpikeCount: number;

  // ---- Common shape settings ----
  /** Default fill color for new shapes. */
  fillColor: string;
  /** Default stroke color for new shapes. */
  strokeColor: string;
  /** Default stroke width for new shapes. */
  strokeWidth: number;
  /** Default corner radius for rectangles. */
  cornerRadius: number;
  /** Default shape width (px). */
  shapeWidth: number;
  /** Default shape height (px). */
  shapeHeight: number;
  /** Default shape opacity (0-100). */
  shapeOpacity: number;
  /** Default polygon sides. */
  polygonSides: number;
  /** Whether gradient fill was enabled. */
  gradientEnabled: boolean;
}

export interface RecentFilesSettings {
  maxRecentFiles: number;
  maxExportListCount: number;
  showRecentOnStartup: boolean;
  clearOnExit: boolean;
  pinned: string[];
}

// ---------------------------------------------------------------------------
// Custom canvas presets (user-saved)
// ---------------------------------------------------------------------------

export interface CustomCanvasPreset {
  name: string;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Master interface
// ---------------------------------------------------------------------------

export interface AppSettings {
  windowState: WindowStateSettings;
  filePaths: FilePathsSettings;
  autoSave: AutoSaveSettings;
  export: ExportSettings;
  canvas: CanvasSettings;
  video: VideoSettings;
  ai: AISettings;
  inpainting: InpaintingSettings;
  uiPanels: UIPanelsSettings;
  nudge: NudgeSettings;
  eraser: EraserSettings;
  blurBrush: BlurBrushSettings;
  selection: SelectionSettings;
  handleSizes: HandleSizesSettings;
  textServer: TextServerSettings;
  renderServer: RenderServerSettings;
  undoRedo: UndoRedoSettings;
  silentExport: SilentExportSettings;
  dateStamp: DateStampSettings;
  imageStudio: ImageStudioSettings;
  groupColors: GroupColorsSettings;
  performance: PerformanceSettings;
  accessibility: AccessibilitySettings;
  shapeTool: ShapeToolSettings;
  recentFiles: RecentFilesSettings;
  customCanvasPresets: CustomCanvasPreset[];
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS: AppSettings = {
  windowState: {
    x: 100,
    y: 100,
    width: 1280,
    height: 720,
    isMaximized: false,
    isFullScreen: false,
    leftPanelWidth: 260,
    rightPanelWidth: 300,
    framePanelHeight: 150,
    toolbarHeight: 40,
    statusBarHeight: 24,
  },

  filePaths: {
    projectsFolder: '',
    exportsFolder: '',
    videoPath: '',
    templatesFolder: '',
    galleryPath: '',
    backgroundFolderPath: '',
    layoutPresetsPath: '',
    tempFolder: '',
    modelsFolder: '',
    fontsFolder: '',
    autoSaveFolder: '',
    pluginsFolder: '',
    presetsFolder: '',
    cachesFolder: '',
  },

  autoSave: {
    enabled: true,
    intervalSeconds: 300,
    maxBackups: 5,
    saveOnFocusLoss: true,
    notifyOnSave: false,
  },

  export: {
    defaultFormat: 'png',
    jpegQuality: 95,
    pngCompression: 6,
    includeMetadata: true,
    outputNamePattern: '{project}_{date}',
    openAfterExport: false,
    overwriteExisting: false,
    preserveColorProfile: true,
    defaultDpi: 72,
    backgroundMode: 0,
    backgroundColor: '#FFFFFFFF',
  },

  canvas: {
    defaultWidth: 1920,
    defaultHeight: 1080,
    defaultBackground: '#FFFFFF',
    gridSize: 50,
    gridSizeX: 50,
    gridSizeY: 50,
    gridVisible: false,
    gridColor: '#808080',
    gridOpacity: 15,
    snapEnabled: true,
    snapThreshold: 5,
    showItemsOutsideCanvas: true,
    rulerVisible: true,
    rulerColor: '#333333',
    canvasBorderColor: '#999999',
    zoomSpeed: 1.1,
    minZoom: 0.1,
    maxZoom: 32,
    panSpeed: 1,
    smoothZoom: true,
    brushCursorColor: '#FF6600',
    brushCursorThickness: 1.0,
    lastZoom: 1,
  },

  video: {
    ffmpegPath: 'ffmpeg',
    defaultFrameCount: 10,
    frameQuality: 90,
    extractionFormat: 'jpg',
    autoExtractOnImport: false,
    maxVideoSizeMB: 500,
    thumbnailSize: 120,
    previewFps: 30,
    frameToShapeFillMode: 1,
    frameExtractionCount: 20,
    frameExtractionIntervalSeconds: 10,
  },

  ai: {
    inferenceDevice: 'gpu',
    modelCachePath: '',
    autoDownloadModels: true,
    maxConcurrentJobs: 1,
    bgRemovalModel: 'inspyrenet',
    upscaleModel: 'realesrgan-x4',
    faceRestoreModel: 'codeformer',
    defaultUpscaleFactor: 4,
    gpuMemoryLimitMB: 4096,
    timeoutSeconds: 120,
    showProgressNotification: true,
  },

  inpainting: {
    brushSize: 30,
    brushHardness: 80,
    previewQuality: 75,
    maskColor: '#FF0000',
    maskOpacity: 50,
    featherRadius: 0,
    showMaskOverlay: true,
  },

  uiPanels: {
    leftPanelVisible: true,
    rightPanelVisible: true,
    framePanelVisible: true,
    statusBarVisible: true,
    rulerVisible: true,
    defaultRightTab: 'layers',
    defaultLeftTab: 'tools',
    toolbarPosition: 'top',
    tooltipsEnabled: true,
    tooltipDelayMs: 500,
    animationsEnabled: true,
  },

  nudge: {
    small: 1,
    medium: 5,
    large: 10,
    extraLarge: 50,
  },

  eraser: {
    defaultMode: 'soft',
    defaultSize: 20,
    defaultOpacity: 100,
    minSize: 1,
    maxSize: 500,
    pressureSensitive: false,
  },

  blurBrush: {
    defaultSize: 30,
    defaultIntensity: 50,
    throttleMs: 33,
    minSize: 1,
    maxSize: 200,
    previewEnabled: true,
  },

  selection: {
    handleSize: 8,
    rotationHandleDistance: 28,
    singleSelectColor: '#FF6600',
    firstSelectedColor: '#00FF00',
    multiSelectColor: '#FF6600',
    groupSelectColor: '#00BCD4',
    marqueeColor: '#0078D7',
    lockedSelectionColor: '#00FF00',
    snapGuideColor: '#FF00FF',
    selectionLineWidth: 1,
    multiSelectBorderThickness: 1,
    groupBoxBorderThickness: 1,
    handleStrokeThickness: 1.5,
    marqueeBorderThickness: 1,
    lockedSelectionBorderThickness: 4,
    selectionDashPattern: 5,
    showDimensions: true,
    showRotationAngle: true,
  },

  handleSizes: {
    resizeHandle: 8,
    rotationHandle: 10,
    anchorSize: 6,
    cropHandle: 8,
    pathPointSize: 6,
    controlPointSize: 4,
  },

  textServer: {
    host: '127.0.0.1',
    port: 5050,
    alias: '',
    autoConnect: false,
    enableNetworkLog: false,
    reconnectIntervalMs: 5000,
    timeoutMs: 10000,
    maxRetries: 3,
  },

  renderServer: {
    host: '127.0.0.1',
    port: 5051,
    autoConnect: false,
    reconnectIntervalMs: 5000,
    timeoutMs: 30000,
    maxRetries: 3,
  },

  undoRedo: {
    maxSteps: 30,
    diskLimitGB: 10,
    compressSnapshots: false,
    groupingDelayMs: 500,
  },

  silentExport: {
    enabled: false,
    outputFolder: '',
    format: 'PNG',
    quality: 90,
    triggerOnSave: false,
    includeTimestamp: true,
    maxFiles: 100,
    saveProject: false,
    namingMode: 0,
    autoLoadTemplate: false,
    autoImportVideo: false,
    autoLoadNextFromBrowser: false,
    autoOpenImage: false,
    autoOpenFolder: false,
    autoClearFrames: false,
  },

  dateStamp: {
    defaultLanguage: 'en',
    defaultCalendar: 'gregorian',
    defaultFormat: 'YYYY-MM-DD',
    showTime: false,
    use24HourClock: true,
    timezone: 'local',
  },

  imageStudio: {
    defaultBrushSize: 30,
    previewDebounceMs: 300,
    settingsDebounceMs: 500,
    preEffectDebounceMs: 300,
    historyEnabled: true,
    livePreview: true,
    maxPreviewResolution: 2048,
  },

  groupColors: {
    palette: [
      '#FF6B6B',
      '#4ECDC4',
      '#FFD93D',
      '#A78BFA',
      '#60A5FA',
      '#F472B6',
      '#A3E635',
      '#FBBF24',
    ],
    autoAssign: true,
    showInLayerPanel: true,
  },

  performance: {
    hardwareAcceleration: true,
    maxCanvasMemoryMB: 2048,
    thumbnailCacheSize: 100,
    renderQuality: 'high',
    workerThreadCount: 4,
    lazyLoadImages: true,
    offscreenRendering: true,
  },

  accessibility: {
    highContrastMode: false,
    reducedMotion: false,
    fontSize: 14,
    cursorScale: 1,
    screenReaderAnnouncements: false,
    keyboardNavigationHighlight: true,
  },

  shapeTool: {
    lastShapeType: 'rectangle',
    starSpikeHigh: 50,
    starSpikeLow: 25,
    starSpikeCount: 5,
    fillColor: '#FF6600',
    strokeColor: '#FFFFFF',
    strokeWidth: 2,
    cornerRadius: 0,
    shapeWidth: 200,
    shapeHeight: 200,
    shapeOpacity: 100,
    polygonSides: 5,
    gradientEnabled: false,
  },

  recentFiles: {
    maxRecentFiles: 20,
    maxExportListCount: 300,
    showRecentOnStartup: true,
    clearOnExit: false,
    pinned: [],
  },

  customCanvasPresets: [],
};

// ---------------------------------------------------------------------------
// Factory - returns a deep clone of DEFAULT_SETTINGS so mutations are safe.
// ---------------------------------------------------------------------------

export function createDefaultSettings(): AppSettings {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as AppSettings;
}
