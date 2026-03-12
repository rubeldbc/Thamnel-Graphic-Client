import { create } from 'zustand';
import type { JobStatus, JobType } from '../types/index';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  message: string;
}

export interface JobState {
  jobs: Job[];
  activeJobId: string | null;
}

export interface JobActions {
  addJob: (job: Job) => void;
  updateJob: (jobId: string, changes: Partial<Job>) => void;
  removeJob: (jobId: string) => void;
  setActiveJob: (jobId: string | null) => void;
}

export type JobStore = JobState & JobActions;

export const useJobStore = create<JobStore>((set) => ({
  jobs: [],
  activeJobId: null,

  addJob: (job) =>
    set((state) => ({
      jobs: [...state.jobs, job],
    })),

  updateJob: (jobId, changes) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === jobId ? { ...j, ...changes } : j)),
    })),

  removeJob: (jobId) =>
    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== jobId),
      activeJobId: state.activeJobId === jobId ? null : state.activeJobId,
    })),

  setActiveJob: (jobId) => set({ activeJobId: jobId }),
}));
