import type { Command } from './types';
import { useDocumentStore } from '../stores/documentStore';

function hasVideos(): boolean {
  return useDocumentStore.getState().project.videoPaths.length > 0;
}

function hasFrames(): boolean {
  // Frames are layers marked as frame receivers
  return useDocumentStore
    .getState()
    .project.layers.some((l) => l.isFrameReceiver);
}

export const removeVideo: Command = {
  name: 'removeVideo',
  category: 'video',
  canExecute: () => hasVideos(),
  execute: () => {
    console.log('[videoCommands] removeVideo');
  },
};

export const selectVideo: Command = {
  name: 'selectVideo',
  category: 'video',
  canExecute: () => hasVideos(),
  execute: () => {
    console.log('[videoCommands] selectVideo');
  },
};

export const randomizeFrames: Command = {
  name: 'randomizeFrames',
  category: 'video',
  canExecute: () => hasFrames(),
  execute: () => {
    console.log('[videoCommands] randomizeFrames');
  },
};

export const playFile: Command = {
  name: 'playFile',
  category: 'video',
  canExecute: () => hasVideos(),
  execute: () => {
    console.log('[videoCommands] playFile');
  },
};

export const openFileLocation: Command = {
  name: 'openFileLocation',
  category: 'video',
  canExecute: () => hasVideos(),
  execute: () => {
    console.log('[videoCommands] openFileLocation');
  },
};

export const extractFrameAtTime: Command = {
  name: 'extractFrameAtTime',
  category: 'video',
  canExecute: () => hasVideos(),
  execute: () => {
    console.log('[videoCommands] extractFrameAtTime');
  },
};

export const videoCommands: Command[] = [
  removeVideo,
  selectVideo,
  randomizeFrames,
  playFile,
  openFileLocation,
  extractFrameAtTime,
];
