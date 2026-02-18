export interface WorkerRecord {
  commitment: string;
  skills: string[];
  bio: string;
  ratePerHour: number;
  currency: 'aleo' | 'usdcx';
  createdAt: string;
  txId: string;
}

export interface JobRecord {
  commitment: string;
  title: string;
  description: string;
  budget: number;
  currency: 'aleo' | 'usdcx';
  skills: string[];
  deadline: string;
  posterHash: string;
  status: 'open' | 'assigned' | 'completed' | 'cancelled';
  applicantCount: number;
  txId: string;
  createdAt: string;
}

export interface ApplicationRecord {
  id: string;
  jobCommitment: string;
  workerCommitment: string;
  workerHash: string;
  workerAddress: string;
  coverLetter: string;
  proposedRate: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface AgreementRecord {
  commitment: string;
  jobCommitment: string;
  workerCommitment: string;
  workerHash: string;
  clientHash: string;
  amount: number;
  currency: 'aleo' | 'usdcx';
  status: 'active' | 'delivered' | 'completed' | 'refunded' | 'cancelled';
  deliverable?: string;
  txId: string;
  createdAt: string;
  onChainAgreementId?: string;
  reputationClaimed?: boolean;
}

export interface EscrowRecord {
  agreementCommitment: string;
  amount: number;
  currency: 'aleo' | 'usdcx';
  status: 'pending' | 'deposited' | 'released' | 'refunded' | 'committed' | 'rejected';
  depositTxId: string;
  depositHeight: number;
  releaseTxId: string;
}

export interface DeliverableRecord {
  agreementCommitment: string;
  deliverableHash: string;
  status: 'submitted' | 'accepted';
  txId: string;
  createdAt: string;
}

export interface ReputationEntry {
  workerHash: string;
  claimedJobs: number;
  lastClaimTxId: string;
  updatedAt: string;
}

export interface EventLog {
  type: string;
  actorHash: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface Database {
  workers: Record<string, WorkerRecord>;
  jobs: Record<string, JobRecord>;
  applications: Record<string, ApplicationRecord>;
  agreements: Record<string, AgreementRecord>;
  escrows: Record<string, EscrowRecord>;
  deliverables: Record<string, DeliverableRecord>;
  reputation: Record<string, ReputationEntry>;
  nonces: Record<string, string>;
  events: EventLog[];
}

export interface AuthenticatedRequest extends Express.Request {
  userAddress?: string;
}
