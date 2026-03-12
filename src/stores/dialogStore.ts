import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InputDialogConfig {
  title: string;
  prompt: string;
  defaultValue?: string;
  onOk: (value: string) => void;
}

export interface NotificationConfig {
  title: string;
  message: string;
  icon: 'info' | 'warning' | 'error' | 'question' | 'success';
  buttons: string[];
  onResult: (result: string) => void;
}

export interface ProgressConfig {
  title: string;
  statusText: string;
  progressPercent: number;
  stepText: string;
  modelName?: string;
  description?: string;
  onCancel?: () => void;
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface DialogStore {
  // Input dialog
  inputConfig: InputDialogConfig | null;
  showInput: (config: InputDialogConfig) => void;
  closeInput: () => void;

  // Notification dialog
  notificationConfig: NotificationConfig | null;
  showNotification: (config: NotificationConfig) => void;
  closeNotification: () => void;

  // Progress dialog
  progressConfig: ProgressConfig | null;
  showProgress: (config: Omit<ProgressConfig, 'progressPercent' | 'stepText'> & { progressPercent?: number; stepText?: string }) => void;
  updateProgress: (updates: Partial<ProgressConfig>) => void;
  closeProgress: () => void;

  // Convenience methods
  confirm: (message: string, title?: string) => Promise<boolean>;
  showInfo: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  promptInput: (title: string, prompt: string, defaultValue?: string) => Promise<string | null>;
}

// ---------------------------------------------------------------------------
// Internal bookkeeping for promptInput cancel handling
// ---------------------------------------------------------------------------

// We keep a reference to the pending promptInput reject/resolve so that
// closeInput (triggered by the dialog's onOpenChange(false) / Cancel button)
// can resolve the promise with null when the user cancels without pressing OK.
let _pendingPromptResolve: ((value: string | null) => void) | null = null;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useDialogStore = create<DialogStore>((set, get) => ({
  // ---- Input dialog ----
  inputConfig: null,

  showInput: (config) => set({ inputConfig: config }),

  closeInput: () => {
    // If there's a pending promptInput promise, resolve it with null (cancel).
    if (_pendingPromptResolve) {
      _pendingPromptResolve(null);
      _pendingPromptResolve = null;
    }
    set({ inputConfig: null });
  },

  // ---- Notification dialog ----
  notificationConfig: null,

  showNotification: (config) => set({ notificationConfig: config }),

  closeNotification: () => set({ notificationConfig: null }),

  // ---- Progress dialog ----
  progressConfig: null,

  showProgress: (config) =>
    set({
      progressConfig: {
        progressPercent: -1,
        stepText: '',
        ...config,
      },
    }),

  updateProgress: (updates) =>
    set((state) => ({
      progressConfig: state.progressConfig
        ? { ...state.progressConfig, ...updates }
        : null,
    })),

  closeProgress: () => set({ progressConfig: null }),

  // ---- Convenience: confirm ----
  confirm: (message, title = 'Confirm') =>
    new Promise<boolean>((resolve) => {
      set({
        notificationConfig: {
          title,
          message,
          icon: 'question',
          buttons: ['Yes', 'No'],
          onResult: (result) => {
            resolve(result === 'Yes');
            set({ notificationConfig: null });
          },
        },
      });
    }),

  // ---- Convenience: showInfo ----
  showInfo: (message, title = 'Info') => {
    set({
      notificationConfig: {
        title,
        message,
        icon: 'info',
        buttons: ['OK'],
        onResult: () => set({ notificationConfig: null }),
      },
    });
  },

  // ---- Convenience: showError ----
  showError: (message, title = 'Error') => {
    set({
      notificationConfig: {
        title,
        message,
        icon: 'error',
        buttons: ['OK'],
        onResult: () => set({ notificationConfig: null }),
      },
    });
  },

  // ---- Convenience: showWarning ----
  showWarning: (message, title = 'Warning') => {
    set({
      notificationConfig: {
        title,
        message,
        icon: 'warning',
        buttons: ['OK'],
        onResult: () => set({ notificationConfig: null }),
      },
    });
  },

  // ---- Convenience: promptInput ----
  promptInput: (title, prompt, defaultValue) =>
    new Promise<string | null>((resolve) => {
      // Store the resolve so closeInput can call it with null on cancel.
      _pendingPromptResolve = resolve;

      set({
        inputConfig: {
          title,
          prompt,
          defaultValue,
          onOk: (value) => {
            // User pressed OK — clear the pending reference and resolve.
            _pendingPromptResolve = null;
            resolve(value);
            set({ inputConfig: null });
          },
        },
      });
    }),
}));
