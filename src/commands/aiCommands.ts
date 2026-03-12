import type { Command } from './types';
import { useDocumentStore } from '../stores/documentStore';

function hasSelectedImage(): boolean {
  const state = useDocumentStore.getState();
  if (state.selectedLayerIds.length === 0) return false;
  return state.project.layers.some(
    (l) => state.selectedLayerIds.includes(l.id) && l.type === 'image',
  );
}

export const removeBackground: Command = {
  name: 'removeBackground',
  category: 'ai',
  canExecute: () => hasSelectedImage(),
  execute: () => {
    console.log('[aiCommands] removeBackground');
  },
};

export const enhanceImage: Command = {
  name: 'enhanceImage',
  category: 'ai',
  canExecute: () => hasSelectedImage(),
  execute: () => {
    console.log('[aiCommands] enhanceImage');
  },
};

export const upscaleRealEsrgan: Command = {
  name: 'upscaleRealEsrgan',
  category: 'ai',
  canExecute: () => hasSelectedImage(),
  execute: () => {
    console.log('[aiCommands] upscaleRealEsrgan');
  },
};

export const logoRemoval: Command = {
  name: 'logoRemoval',
  category: 'ai',
  canExecute: () => hasSelectedImage(),
  execute: () => {
    console.log('[aiCommands] logoRemoval');
  },
};

export const faceRestore: Command = {
  name: 'faceRestore',
  category: 'ai',
  canExecute: () => hasSelectedImage(),
  execute: () => {
    console.log('[aiCommands] faceRestore');
  },
};

export const aiCommands: Command[] = [
  removeBackground,
  enhanceImage,
  upscaleRealEsrgan,
  logoRemoval,
  faceRestore,
];
