import { z } from 'zod';

export const aleoAddress = z.string().regex(/^aleo1[a-z0-9]{58}$/, 'Invalid Aleo address');
export const txIdField = z.string().min(1);
export const fieldValue = z.string().min(1);

export const registerWorkerSchema = z.object({
  commitment: fieldValue,
  skills: z.array(z.string().min(1)).min(1),
  bio: z.string().min(1).max(2000),
  ratePerHour: z.number().positive(),
  currency: z.enum(['aleo', 'usdcx']),
  txId: txIdField,
});

export const createJobSchema = z.object({
  commitment: fieldValue,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  budget: z.number().positive(),
  currency: z.enum(['aleo', 'usdcx']),
  skills: z.array(z.string().min(1)).min(1),
  deadline: z.string().min(1),
  txId: txIdField,
});

export const applyJobSchema = z.object({
  workerCommitment: fieldValue,
  coverLetter: z.string().min(1).max(2000),
  proposedRate: z.number().positive(),
});

export const createAgreementSchema = z.object({
  commitment: fieldValue,
  jobCommitment: fieldValue,
  workerCommitment: fieldValue,
  amount: z.number().positive(),
  currency: z.enum(['aleo', 'usdcx']),
  txId: txIdField,
  onChainAgreementId: z.string().optional(),
});

export const depositEscrowSchema = z.object({
  agreementCommitment: fieldValue,
  amount: z.number().positive(),
  currency: z.enum(['aleo', 'usdcx']),
  txId: txIdField,
});

export const submitDeliverableSchema = z.object({
  deliverable: z.string().min(1).max(5000),
  txId: txIdField,
});

export const completeJobSchema = z.object({
  agreementCommitment: fieldValue,
  txId: txIdField,
});

export const refundEscrowSchema = z.object({
  agreementCommitment: fieldValue,
  txId: txIdField,
});

export const claimReputationSchema = z.object({
  agreementCommitment: fieldValue,
  txId: txIdField,
});

export const proveThresholdSchema = z.object({
  threshold: z.number().int().positive(),
  verifierAddress: aleoAddress,
  txId: txIdField,
});

export const nonceSchema = z.object({
  address: aleoAddress,
});

export const verifySchema = z.object({
  address: aleoAddress,
  signature: z.string().min(1),
  nonce: z.string().min(1),
});
