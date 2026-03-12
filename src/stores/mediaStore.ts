import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Video entry
// ---------------------------------------------------------------------------
export interface VideoEntry {
  id: string;
  filePath: string;
  fileName: string;
  duration: string;
  /** Whether frames have been extracted for this video. */
  extracted: boolean;
}

// ---------------------------------------------------------------------------
// Frame entry
// ---------------------------------------------------------------------------
export interface FrameEntry {
  id: string;
  videoId: string;
  src: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Audio entry
// ---------------------------------------------------------------------------
export interface AudioEntry {
  id: string;
  name: string;
  duration: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Image entry (gallery)
// ---------------------------------------------------------------------------
export interface ImageEntry {
  id: string;
  name: string;
  src: string;
  folder: string;
}

export interface ImageFolder {
  name: string;
  path: string;
  expanded: boolean;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
export interface MediaState {
  // Videos
  videos: VideoEntry[];
  activeVideoId: string | null;

  // Frames
  frames: FrameEntry[];
  extractionProgress: number | null;

  // Audio
  audioItems: AudioEntry[];
  selectedAudioId: string | null;
  audioStatus: string;

  // Image gallery
  images: ImageEntry[];
  imageFolders: ImageFolder[];
  selectedFolderId: string | null;
  imageSearchQuery: string;
  thumbSize: number;

  // Server connection
  textServerConnected: boolean;
  renderServerConnected: boolean;
  inferenceDevice: 'CPU' | 'GPU';
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
export interface MediaActions {
  // Videos
  addVideo: (video: VideoEntry) => void;
  removeVideo: (videoId: string) => void;
  setActiveVideo: (videoId: string | null) => void;
  setVideoExtracted: (videoId: string, extracted: boolean) => void;

  // Frames
  addFrame: (frame: FrameEntry) => void;
  addFrames: (frames: FrameEntry[]) => void;
  clearFrames: (videoId: string) => void;
  setExtractionProgress: (progress: number | null) => void;

  // Audio
  setAudioItems: (items: AudioEntry[]) => void;
  selectAudio: (audioId: string | null) => void;
  setAudioStatus: (status: string) => void;

  // Image gallery
  setImages: (images: ImageEntry[]) => void;
  addImageFolder: (folder: ImageFolder) => void;
  setSelectedFolder: (folderId: string | null) => void;
  setImageSearchQuery: (query: string) => void;
  setThumbSize: (size: number) => void;

  // Server
  setTextServerConnected: (connected: boolean) => void;
  setRenderServerConnected: (connected: boolean) => void;
  setInferenceDevice: (device: 'CPU' | 'GPU') => void;
}

export type MediaStore = MediaState & MediaActions;

export const useMediaStore = create<MediaStore>((set) => ({
  // State defaults
  videos: [],
  activeVideoId: null,
  frames: [],
  extractionProgress: null,
  audioItems: [],
  selectedAudioId: null,
  audioStatus: 'Ready',
  images: [],
  imageFolders: [],
  selectedFolderId: null,
  imageSearchQuery: '',
  thumbSize: 100,
  textServerConnected: false,
  renderServerConnected: false,
  inferenceDevice: 'CPU',

  // Video actions
  addVideo: (video) =>
    set((state) => ({
      videos: [...state.videos, video],
    })),

  removeVideo: (videoId) =>
    set((state) => ({
      videos: state.videos.filter((v) => v.id !== videoId),
      activeVideoId: state.activeVideoId === videoId ? null : state.activeVideoId,
      frames: state.frames.filter((f) => f.videoId !== videoId),
    })),

  setActiveVideo: (videoId) => set({ activeVideoId: videoId }),

  setVideoExtracted: (videoId, extracted) =>
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === videoId ? { ...v, extracted } : v,
      ),
    })),

  // Frame actions
  addFrame: (frame) =>
    set((state) => ({
      frames: [...state.frames, frame],
    })),

  addFrames: (frames) =>
    set((state) => ({
      frames: [...state.frames, ...frames],
    })),

  clearFrames: (videoId) =>
    set((state) => ({
      frames: state.frames.filter((f) => f.videoId !== videoId),
    })),

  setExtractionProgress: (progress) => set({ extractionProgress: progress }),

  // Audio actions
  setAudioItems: (items) => set({ audioItems: items }),
  selectAudio: (audioId) => set({ selectedAudioId: audioId }),
  setAudioStatus: (status) => set({ audioStatus: status }),

  // Image gallery actions
  setImages: (images) => set({ images }),
  addImageFolder: (folder) =>
    set((state) => ({
      imageFolders: [...state.imageFolders, folder],
    })),
  setSelectedFolder: (folderId) => set({ selectedFolderId: folderId }),
  setImageSearchQuery: (query) => set({ imageSearchQuery: query }),
  setThumbSize: (size) => set({ thumbSize: size }),

  // Server actions
  setTextServerConnected: (connected) => set({ textServerConnected: connected }),
  setRenderServerConnected: (connected) => set({ renderServerConnected: connected }),
  setInferenceDevice: (device) => set({ inferenceDevice: device }),
}));
