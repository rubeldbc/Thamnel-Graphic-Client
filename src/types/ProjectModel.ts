import type { LayerModel } from './LayerModel';

export interface ProjectMetadata {
  name: string;
  author: string;
  createdAt: string;
  modifiedAt: string;
  description: string;
}

export interface ProjectModel {
  projectId: string;
  version: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  layers: LayerModel[];
  videoPaths: string[];
  timestamps: Record<string, string>;
  metadata: ProjectMetadata;
}

export function createDefaultProjectMetadata(
  overrides?: Partial<ProjectMetadata>,
): ProjectMetadata {
  const now = new Date().toISOString();
  return {
    name: 'Untitled Project',
    author: '',
    createdAt: now,
    modifiedAt: now,
    description: '',
    ...overrides,
  };
}

function generateProjectId(): string {
  return crypto.randomUUID();
}

export function createDefaultProject(
  overrides?: Partial<ProjectModel>,
): ProjectModel {
  return {
    projectId: generateProjectId(),
    version: '1.0.0',
    canvasWidth: 1920,
    canvasHeight: 1080,
    backgroundColor: '#000000',
    layers: [],
    videoPaths: [],
    timestamps: {},
    metadata: createDefaultProjectMetadata(),
    ...overrides,
  };
}
