// Document model matching Rust thamnel_core::document serde output.

import type { Size } from './geometry';
import type { Node } from './node';

export interface DocumentMetadata {
  name: string;
  author: string;
  createdAt: string;
  modifiedAt: string;
  description: string;
}

export interface DocumentModel {
  id: string;
  version: string;
  canvasSize: Size;
  backgroundColor: string;
  nodes: Node[];
  videoPaths: string[];
  timestamps: [string, string][];
  metadata: DocumentMetadata;
}

export function createDefaultDocumentMetadata(): DocumentMetadata {
  const now = new Date().toISOString();
  return {
    name: 'Untitled Project',
    author: '',
    createdAt: now,
    modifiedAt: now,
    description: '',
  };
}

export function createDefaultDocumentModel(): DocumentModel {
  return {
    id: crypto.randomUUID(),
    version: '1.0.0',
    canvasSize: { width: 1920, height: 1080 },
    backgroundColor: '#000000',
    nodes: [],
    videoPaths: [],
    timestamps: [],
    metadata: createDefaultDocumentMetadata(),
  };
}
