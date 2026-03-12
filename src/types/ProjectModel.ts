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

let _projectCounter = 0;

function generateProjectId(): string {
  _projectCounter += 1;
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `proj-${ts}-${rand}-${_projectCounter}`;
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
