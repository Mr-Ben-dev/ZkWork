export interface User {
  address: string;
  token: string;
}

export interface WorkerProfile {
  commitment: string;
  skills: string[];
  bio: string;
  ratePerHour: number;
  currency: 'aleo' | 'usdcx';
  createdAt: string;
}

export interface Job {
  commitment: string;
  title: string;
  description: string;
  budget: number;
  currency: 'aleo' | 'usdcx';
  skills: string[];
  deadline: string;
  status: 'open' | 'assigned' | 'completed' | 'cancelled';
  createdAt: string;
  applicantCount?: number;
}

export interface Application {
  id: string;
  jobCommitment: string;
  workerCommitment: string;
  coverLetter: string;
  proposedRate: number;
  createdAt: string;
}

export interface Agreement {
  commitment: string;
  jobCommitment: string;
  clientHash: string;
  workerHash: string;
  amount: number;
  currency: 'aleo' | 'usdcx';
  status: 'active' | 'delivered' | 'completed' | 'refunded';
  deliverable?: string;
  createdAt: string;
}

export interface EscrowStatus {
  commitment: string;
  status: 'locked' | 'released' | 'refunded' | 'none';
  onChain: boolean;
}

export interface ReputationInfo {
  workerHash: string;
  claimedJobs: number;
  lastClaimTxId: string;
  updatedAt: string;
}

export interface PendingTx {
  id: string;
  type: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
  meta?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  error?: string;
  data?: T;
}

export type Currency = 'aleo' | 'usdcx';
