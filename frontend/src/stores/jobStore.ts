import { create } from 'zustand';
import type { Job } from '../lib/types';

interface JobState {
  jobs: Job[];
  myJobs: Job[];
  loading: boolean;
  setJobs: (jobs: Job[]) => void;
  setMyJobs: (jobs: Job[]) => void;
  setLoading: (loading: boolean) => void;
  addJob: (job: Job) => void;
  updateJob: (commitment: string, updates: Partial<Job>) => void;
}

export const useJobStore = create<JobState>()((set) => ({
  jobs: [],
  myJobs: [],
  loading: false,
  setJobs: (jobs) => set({ jobs }),
  setMyJobs: (myJobs) => set({ myJobs }),
  setLoading: (loading) => set({ loading }),
  addJob: (job) => set((s) => ({ jobs: [job, ...s.jobs] })),
  updateJob: (commitment, updates) =>
    set((s) => ({
      jobs: s.jobs.map((j) => (j.commitment === commitment ? { ...j, ...updates } : j)),
      myJobs: s.myJobs.map((j) => (j.commitment === commitment ? { ...j, ...updates } : j)),
    })),
}));
