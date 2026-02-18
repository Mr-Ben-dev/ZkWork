import { FC, useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useZKWorkWallet } from '../hooks/useZKWorkWallet';
import { useUserStore } from '../stores/userStore';
import { apiClient } from '../lib/api';
import { displayToMicro } from '../lib/aleo';
import { stringToField } from '../lib/commitment';
import { buildMerkleProofPair, toMicroUSDCx } from '../lib/usdcx';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EscrowLock, JobContract } from '../components/icons';

export const AgreementDetail: FC = () => {
  const { commitment } = useParams<{ commitment: string }>();
  const { connected, executeTransition, findRecord, findAllRecords, findRecordWithRetry, findCreditsRecord, findTokenRecord, authenticate } = useZKWorkWallet();
  const { isAuthenticated } = useUserStore();

  const [agreement, setAgreement] = useState<any>(null);
  const [escrow, setEscrow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deliverable, setDeliverable] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [role, setRole] = useState<'client' | 'worker' | 'unknown'>('unknown');
  const [jobData, setJobData] = useState<any>(null);
  const [autoDetectDone, setAutoDetectDone] = useState(false);

  const loadData = useCallback(async () => {
    if (!commitment) return;
    try {
      const [agRes, escrowRes] = await Promise.allSettled([
        apiClient.getAgreement(commitment),
        apiClient.getEscrowStatus(commitment),
      ]);
      if (agRes.status === 'fulfilled') {
        const ag = (agRes.value as any).agreement || agRes.value;
        setAgreement(ag);
        if (ag.role) setRole(ag.role);
        // Load linked job data for description_hash computation
        if (ag.jobCommitment && !jobData) {
          try {
            const jobRes = await apiClient.getJob(ag.jobCommitment);
            const jd = (jobRes as any).job || jobRes;
            setJobData(jd);
          } catch { /* job may not be accessible */ }
        }
      }
      if (escrowRes.status === 'fulfilled') {
        const escrowData = (escrowRes.value as any);
        // API returns { escrow: {...}, onChain: {...} } — merge for easy access
        setEscrow({
          ...(escrowData.escrow || {}),
          onChain: escrowData.onChain?.escrowActive || escrowData.onChain?.agreementActive || false,
        });
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [commitment]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Auto-detect on-chain agreement_id when missing.
  // Uses salary + description_hash from linked job to filter accurately.
  useEffect(() => {
    if (!connected || !agreement || !commitment) return;
    if (agreement.onChainAgreementId) { setAutoDetectDone(true); return; }
    const expectedSalary = displayToMicro(agreement.amount);
    // Compute description_hash from linked job data (same formula as PostJob.tsx)
    const expectedDescHash = jobData
      ? stringToField((jobData.title || '').trim() + '|' + (jobData.description || '').trim())
      : null;
    const detect = async () => {
      try {
        const fnNames = ['submit_deliverable', 'deposit_escrow_aleo', 'commit_escrow_usdcx', 'create_agreement'];
        const filter = (pt: string): boolean => {
          if (!isAgreementRecord(pt)) return false;
          const sal = parseSalaryFromRecord(pt);
          if (sal !== expectedSalary) return false;
          // If we have description_hash, use it for stronger filtering
          if (expectedDescHash) {
            const descMatch = pt.match(/description_hash:\s*(\d+field)/);
            if (descMatch && descMatch[1] !== expectedDescHash) return false;
          }
          return true;
        };
        // Collect all matching records across function names
        const uniqueIds = new Set<string>();
        for (const fn of fnNames) {
          const matches = await findAllRecords({ functionName: fn }, undefined, filter);
          for (const pt of matches) {
            const agId = extractAgreementId(pt);
            if (agId) uniqueIds.add(agId);
          }
        }
        if (uniqueIds.size === 1) {
          const agId = [...uniqueIds][0];
          console.log('[autoDetect] Single unique agreement_id found:', agId);
          await apiClient.patchAgreement(commitment, { onChainAgreementId: agId });
          setAgreement((prev: any) => prev ? { ...prev, onChainAgreementId: agId } : prev);
        } else {
          console.log(`[autoDetect] ${uniqueIds.size} unique agreement_ids for salary ${expectedSalary} — cannot auto-detect`);
        }
      } catch (err) {
        console.warn('[autoDetect] Error:', err);
      } finally {
        setAutoDetectDone(true);
      }
    };
    detect();
  }, [connected, agreement?.onChainAgreementId, commitment, jobData]); // eslint-disable-line

  /** Parse salary from a decrypted agreement record plaintext */
  const parseSalaryFromRecord = (plaintext: string): number => {
    const match = plaintext.match(/salary:\s*(\d+)u64/);
    return match ? parseInt(match[1], 10) : 0;
  };

  /** Extract agreement_id field from a decrypted record plaintext */
  const extractAgreementId = (plaintext: string): string | null => {
    const match = plaintext.match(/agreement_id:\s*(\d+field)/);
    return match ? match[1] : null;
  };

  /** Content filter: must be an Agreement record (has salary + client) */
  const isAgreementRecord = (pt: string) => pt.includes('salary:') && pt.includes('client:');

  /**
   * Build a content filter for Agreement records.
   * When onChainAgreementId is set: STRICT match only (no fallback).
   * When not set: match by salary + description_hash for reliable filtering.
   */
  const buildAgreementFilter = (agreementId?: string, expectedSalaryMicro?: number, expectedDescHash?: string) => (pt: string): boolean => {
    if (!isAgreementRecord(pt)) return false;
    if (agreementId) {
      // Strict: only match exact agreement_id
      const ptId = extractAgreementId(pt);
      return ptId === agreementId;
    }
    // Fallback: salary + description_hash match
    if (expectedSalaryMicro !== undefined && expectedSalaryMicro > 0) {
      const salary = parseSalaryFromRecord(pt);
      if (salary !== expectedSalaryMicro) return false;
    }
    if (expectedDescHash) {
      const descMatch = pt.match(/description_hash:\s*(\d+field)/);
      if (descMatch && descMatch[1] !== expectedDescHash) return false;
    }
    return true;
  };

  /**
   * Find the latest Agreement record.
   * When onChainAgreementId is set: exact match across all output sources.
   * When not set: uses salary + description_hash for reliable matching.
   */
  const findLatestAgreement = async (): Promise<string | null> => {
    const agId = agreement?.onChainAgreementId;
    const expectedSalary = agreement ? displayToMicro(agreement.amount) : undefined;
    // Compute description_hash from linked job data
    const expectedDescHash = jobData
      ? stringToField((jobData.title || '').trim() + '|' + (jobData.description || '').trim())
      : undefined;

    if (!agId) {
      console.warn('[findLatestAgreement] No onChainAgreementId — using salary+descHash filter');
    }

    const filter = buildAgreementFilter(agId, expectedSalary, expectedDescHash);
    const sources = ['submit_deliverable', 'deposit_escrow_aleo', 'commit_escrow_usdcx', 'create_agreement'];
    for (const fn of sources) {
      const record = await findRecord({ functionName: fn }, undefined, filter);
      if (record) {
        await saveAgreementIdIfNeeded(record);
        return record;
      }
    }
    // Retry with delays for sync
    for (const fn of sources) {
      const record = await findRecordWithRetry({ functionName: fn }, undefined, filter, 3, 3000);
      if (record) {
        await saveAgreementIdIfNeeded(record);
        return record;
      }
    }
    return null;
  };

  /**
   * After finding an Agreement record, save its on-chain agreement_id to backend
   * so future lookups can use it for exact matching (even across same-salary agreements).
   */
  const saveAgreementIdIfNeeded = async (plaintext: string) => {
    if (!commitment || !agreement) return;
    // Already stored — skip
    if (agreement.onChainAgreementId) return;
    const agId = extractAgreementId(plaintext);
    if (!agId) return;
    try {
      console.log(`[saveAgreementId] Storing agreement_id ${agId} for commitment ${commitment}`);
      await apiClient.patchAgreement(commitment, { onChainAgreementId: agId });
      // Update local state so subsequent calls use the new ID immediately
      setAgreement((prev: any) => prev ? { ...prev, onChainAgreementId: agId } : prev);
    } catch (err) {
      console.warn('[saveAgreementId] Failed to save:', err);
    }
  };

  const handleDepositEscrow = async () => {
    if (!connected || !isAuthenticated || !agreement) return;
    setError('');
    setActionLoading('deposit');

    try {
      let txId: string | null = null;

      if (agreement.currency === 'aleo') {
        // deposit_escrow_aleo(agreement: Agreement, pay_record: credits, amount: u64)
        setStatusMessage('Looking for agreement record...');
        const agreementRecord = await findLatestAgreement();
        setStatusMessage('');
        if (!agreementRecord) {
          setError('Agreement record not found in wallet. The record may not have synced yet — try again in a few seconds.');
          setActionLoading('');
          return;
        }

        // Use on-chain salary as source of truth (contract asserts amount == agreement.salary)
        const onChainSalary = parseSalaryFromRecord(agreementRecord);
        const backendMicro = displayToMicro(agreement.amount);
        if (onChainSalary !== backendMicro) {
          setError(`Salary mismatch: on-chain record has ${onChainSalary / 1_000_000} ALEO but agreement shows ${agreement.amount} ALEO. Wrong record may be selected. Try detecting the agreement ID first.`);
          console.error(`[deposit] CRITICAL: Salary mismatch! Backend: ${backendMicro}, On-chain: ${onChainSalary}. Aborting.`);
          setActionLoading('');
          return;
        }
        if (onChainSalary <= 0) {
          setError('Could not parse salary from agreement record.');
          setActionLoading('');
          return;
        }
        console.log('[deposit] Using on-chain salary:', onChainSalary);

        // Fetch a credits record with sufficient balance
        const creditRecords = await findCreditsRecord(onChainSalary);
        if (!creditRecords) {
          setError('No credits record with sufficient balance found. You need at least ' + (onChainSalary / 1_000_000) + ' ALEO.');
          setActionLoading('');
          return;
        }

        txId = await executeTransition(
          'deposit_escrow_aleo',
          [agreementRecord, creditRecords, `${onChainSalary}u64`],
          500_000,
          'deposit_escrow',
          { agreementCommitment: commitment }
        );
      } else {
        // commit_escrow_usdcx(agreement: Agreement)
        const agreementRecord = await findLatestAgreement();
        if (!agreementRecord) {
          setError('Agreement record not found in wallet.');
          setActionLoading('');
          return;
        }

        txId = await executeTransition(
          'commit_escrow_usdcx',
          [agreementRecord],
          500_000,
          'commit_escrow_usdcx',
          { agreementCommitment: commitment }
        );
      }

      if (txId) {
        await apiClient.depositEscrow({
          agreementCommitment: commitment!,
          amount: agreement.amount,
          currency: agreement.currency,
          txId,
        });
        await loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Deposit failed');
    } finally {
      setActionLoading('');
    }
  };

  const handleSubmitDeliverable = async () => {
    if (!connected || !isAuthenticated) return;
    if (!deliverable.trim()) { setError('Deliverable description required'); return; }

    setError('');
    setActionLoading('deliverable');

    try {
      // submit_deliverable(agreement: Agreement, deliverable_hash: field)
      const agreementRecord = await findLatestAgreement();
      if (!agreementRecord) {
        setError('Agreement record not found in wallet.');
        setActionLoading('');
        return;
      }

      const delivHash = stringToField(deliverable.trim());
      const txId = await executeTransition(
        'submit_deliverable',
        [agreementRecord, delivHash],
        500_000,
        'submit_deliverable',
        { agreementCommitment: commitment }
      );

      if (txId) {
        await apiClient.submitDeliverable(commitment!, {
          deliverable: deliverable.trim(),
          txId,
        });
        setDeliverable('');
        await loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Submit deliverable failed');
    } finally {
      setActionLoading('');
    }
  };

  const handleComplete = async () => {
    if (!connected || !isAuthenticated || !agreement) return;
    setError('');
    setActionLoading('complete');

    try {
      const transitionName = agreement.currency === 'aleo' ? 'complete_job_aleo' : 'complete_job_usdcx';

      if (agreement.currency === 'aleo') {
        // complete_job_aleo(agreement: Agreement, escrow: EscrowReceipt, notice: DeliveryNotice)
        console.log('[complete] Looking for Agreement record...');
        const agreementRecord = await findLatestAgreement();
        if (agreementRecord) {
          console.log('[complete] Agreement found:', agreementRecord.slice(0, 300));
        }

        // Extract agreement_id from matched Agreement to find related records
        const agId = agreementRecord ? extractAgreementId(agreementRecord) : null;
        console.log('[complete] Using agreement_id for filtering:', agId);

        // EscrowReceipt: has escrow_commitment, NO client field
        // Also match by agreement_id to find the receipt for THIS agreement
        const isEscrowReceipt = (pt: string) => {
          const hasEscrowCommitment = pt.includes('escrow_commitment:');
          const hasClient = pt.includes('client:');
          if (!hasEscrowCommitment || hasClient) return false;
          // If we know the agreement_id, verify it matches
          if (agId) {
            const ptAgId = extractAgreementId(pt);
            if (ptAgId && ptAgId !== agId) {
              console.log(`[complete] EscrowReceipt skipped: agreement_id ${ptAgId} !== ${agId}`);
              return false;
            }
          }
          console.log('[complete] isEscrowReceipt MATCH:', pt.slice(0, 200));
          return true;
        };

        // DeliveryNotice: has deliverable_hash, NO salary field
        // Also match by agreement_id
        const isDeliveryNotice = (pt: string) => {
          const hasDeliverableHash = pt.includes('deliverable_hash:');
          const hasSalary = pt.includes('salary:');
          if (!hasDeliverableHash || hasSalary) return false;
          if (agId) {
            const ptAgId = extractAgreementId(pt);
            if (ptAgId && ptAgId !== agId) {
              console.log(`[complete] DeliveryNotice skipped: agreement_id ${ptAgId} !== ${agId}`);
              return false;
            }
          }
          console.log('[complete] isDeliveryNotice MATCH:', pt.slice(0, 200));
          return true;
        };

        console.log('[complete] Looking for EscrowReceipt (from deposit_escrow_aleo)...');
        const escrowRecord = await findRecordWithRetry(
          { functionName: 'deposit_escrow_aleo' }, undefined, isEscrowReceipt
        );
        if (escrowRecord) {
          console.log('[complete] EscrowReceipt found:', escrowRecord.slice(0, 200));
        } else {
          console.error('[complete] EscrowReceipt NOT FOUND');
        }

        console.log('[complete] Looking for DeliveryNotice (from submit_deliverable)...');
        const noticeRecord = await findRecordWithRetry(
          { functionName: 'submit_deliverable' }, undefined, isDeliveryNotice
        );
        if (noticeRecord) {
          console.log('[complete] DeliveryNotice found:', noticeRecord.slice(0, 200));
        } else {
          console.error('[complete] DeliveryNotice NOT FOUND');
        }

        if (!agreementRecord || !escrowRecord || !noticeRecord) {
          const missing = [];
          if (!agreementRecord) missing.push('agreement');
          if (!escrowRecord) missing.push('escrow receipt');
          if (!noticeRecord) missing.push('delivery notice');
          setError(`Required records not found: ${missing.join(', ')}. Records may not have synced yet — try again in a few seconds.`);
          setActionLoading('');
          return;
        }

        const txId = await executeTransition(
          transitionName,
          [agreementRecord, escrowRecord, noticeRecord],
          500_000,
          'complete_job',
          { agreementCommitment: commitment }
        );

        if (txId) {
          await apiClient.completeEscrow({
            agreementCommitment: commitment!,
            txId,
          });
          await loadData();
        }
      } else {
        // complete_job_usdcx(agreement, escrow, notice, pay_record, amount, proofs)
        console.log('[complete] USDCx flow — looking for Agreement record...');
        const agreementRecord = await findLatestAgreement();
        if (agreementRecord) {
          console.log('[complete] Agreement found:', agreementRecord.slice(0, 300));
        }

        const agId = agreementRecord ? extractAgreementId(agreementRecord) : null;
        console.log('[complete] Using agreement_id for filtering:', agId);

        // EscrowReceipt from commit_escrow_usdcx (payment_type=1)
        const isEscrowReceipt = (pt: string) => {
          const hasEscrowCommitment = pt.includes('escrow_commitment:');
          const hasClient = pt.includes('client:');
          if (!hasEscrowCommitment || hasClient) return false;
          if (agId) {
            const ptAgId = extractAgreementId(pt);
            if (ptAgId && ptAgId !== agId) return false;
          }
          return true;
        };

        // DeliveryNotice from submit_deliverable
        const isDeliveryNotice = (pt: string) => {
          const hasDeliverableHash = pt.includes('deliverable_hash:');
          const hasSalary = pt.includes('salary:');
          if (!hasDeliverableHash || hasSalary) return false;
          if (agId) {
            const ptAgId = extractAgreementId(pt);
            if (ptAgId && ptAgId !== agId) return false;
          }
          return true;
        };

        console.log('[complete] Looking for EscrowReceipt (from commit_escrow_usdcx)...');
        const escrowRecord = await findRecordWithRetry(
          { functionName: 'commit_escrow_usdcx' }, undefined, isEscrowReceipt
        );

        console.log('[complete] Looking for DeliveryNotice (from submit_deliverable)...');
        const noticeRecord = await findRecordWithRetry(
          { functionName: 'submit_deliverable' }, undefined, isDeliveryNotice
        );

        if (!agreementRecord || !escrowRecord || !noticeRecord) {
          const missing = [];
          if (!agreementRecord) missing.push('agreement');
          if (!escrowRecord) missing.push('escrow receipt');
          if (!noticeRecord) missing.push('delivery notice');
          setError(`Required records not found: ${missing.join(', ')}. Records may not have synced yet — try again in a few seconds.`);
          setActionLoading('');
          return;
        }

        // Find USDCx Token record with sufficient balance
        const amountMicro = BigInt(toMicroUSDCx(agreement.amount));
        console.log('[complete] Looking for USDCx Token record, need:', amountMicro.toString());
        setStatusMessage('Looking for USDCx token record...');
        const tokenRecord = await findTokenRecord(amountMicro);
        setStatusMessage('');
        if (!tokenRecord) {
          setError(`No USDCx token with sufficient balance found. You need at least ${agreement.amount} USDCx. Make sure you have USDCx tokens in your wallet.`);
          setActionLoading('');
          return;
        }
        console.log('[complete] USDCx Token found:', tokenRecord.slice(0, 200));

        // Build compliance proofs (dummy non-membership proofs for testnet)
        const [proof1, proof2] = buildMerkleProofPair();
        const proofsInput = `[${proof1}, ${proof2}]`;

        const txId = await executeTransition(
          transitionName,
          [agreementRecord, escrowRecord, noticeRecord, tokenRecord, `${amountMicro}u128`, proofsInput],
          500_000,
          'complete_job',
          { agreementCommitment: commitment }
        );

        if (txId) {
          await apiClient.completeEscrow({
            agreementCommitment: commitment!,
            txId,
          });
          await loadData();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Completion failed');
    } finally {
      setActionLoading('');
    }
  };

  const handleRefund = async () => {
    if (!connected || !isAuthenticated) return;
    setError('');
    setActionLoading('refund');

    try {
      // refund_escrow_aleo(escrow: EscrowReceipt)
      // Find the Agreement to get the agreement_id for matching related records
      const agRecord = await findLatestAgreement();
      const agId = agRecord ? extractAgreementId(agRecord) : (agreement?.onChainAgreementId || null);
      const isEscrowReceipt = (pt: string) => {
        if (!pt.includes('escrow_commitment:') || pt.includes('client:')) return false;
        if (agId) {
          const ptAgId = extractAgreementId(pt);
          if (ptAgId && ptAgId !== agId) return false;
        }
        return true;
      };
      const escrowRecord = await findRecord({ functionName: 'deposit_escrow_aleo' }, undefined, isEscrowReceipt);
      if (!escrowRecord) {
        setError('Escrow receipt record not found in wallet.');
        setActionLoading('');
        return;
      }

      const txId = await executeTransition(
        'refund_escrow_aleo',
        [escrowRecord],
        500_000,
        'refund_escrow',
        { agreementCommitment: commitment }
      );

      if (txId) {
        await apiClient.refundEscrow({
          agreementCommitment: commitment!,
          txId,
        });
        await loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Refund failed');
    } finally {
      setActionLoading('');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <JobContract className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <p className="text-white/40">Agreement not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="glass p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">Agreement</h1>
              <p className="text-xs font-mono text-white/30">{commitment}</p>
            </div>
            <StatusBadge status={agreement.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/40">Amount</span>
              <p className="text-accent font-semibold text-lg">
                {agreement.amount} {agreement.currency?.toUpperCase()}
              </p>
            </div>
            <div>
              <span className="text-white/40">Created</span>
              <p className="text-white/70">{new Date(agreement.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {agreement.deliverable && (
            <div className="mt-4 p-3 rounded-xl bg-white/5">
              <span className="text-xs text-white/40">Deliverable</span>
              <p className="text-sm text-white/70 mt-1">{agreement.deliverable}</p>
            </div>
          )}
        </div>

        {escrow && (
          <div className="glass p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <EscrowLock className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold">Escrow Status</h2>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={escrow.status || 'none'} />
              {escrow.onChain && (
                <span className="text-xs text-green-400">Verified on-chain</span>
              )}
            </div>
          </div>
        )}

        <div className="glass p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Actions</h2>
            <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/50">
              {role === 'client' ? 'Client' : role === 'worker' ? 'Worker' : 'Viewer'}
            </span>
          </div>

          {/* Syncing on-chain agreement ID */}
          {connected && !agreement.onChainAgreementId && !autoDetectDone && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400 flex items-center gap-2">
              <LoadingSpinner size={14} /> Syncing on-chain agreement ID...
            </div>
          )}

          {connected && autoDetectDone && !agreement.onChainAgreementId && (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white/50">
              <p className="mb-2">Agreement ID is still syncing. If the transaction was recent, it may take a moment.</p>
              <button
                onClick={async () => {
                  setActionLoading('detect');
                  setError('');
                  try {
                    const expectedSalary = displayToMicro(agreement.amount);
                    const expectedDescHash = jobData
                      ? stringToField((jobData.title || '').trim() + '|' + (jobData.description || '').trim())
                      : null;
                    const fnNames = ['submit_deliverable', 'deposit_escrow_aleo', 'commit_escrow_usdcx', 'create_agreement'];
                    const filter = (pt: string): boolean => {
                      if (!isAgreementRecord(pt)) return false;
                      if (parseSalaryFromRecord(pt) !== expectedSalary) return false;
                      if (expectedDescHash) {
                        const descMatch = pt.match(/description_hash:\s*(\d+field)/);
                        if (descMatch && descMatch[1] !== expectedDescHash) return false;
                      }
                      return true;
                    };
                    const uniqueIds = new Set<string>();
                    for (const fn of fnNames) {
                      const matches = await findAllRecords({ functionName: fn }, undefined, filter);
                      for (const pt of matches) {
                        const agId = extractAgreementId(pt);
                        if (agId) uniqueIds.add(agId);
                      }
                    }
                    if (uniqueIds.size === 1) {
                      const agId = [...uniqueIds][0];
                      await apiClient.patchAgreement(commitment!, { onChainAgreementId: agId });
                      setAgreement((prev: any) => prev ? { ...prev, onChainAgreementId: agId } : prev);
                    } else if (uniqueIds.size === 0) {
                      setError('No Agreement records found in wallet. The transaction may still be processing.');
                    } else {
                      setError(`Found ${uniqueIds.size} different agreements with the same amount. Cannot auto-detect. Try creating a new agreement with a unique amount.`);
                    }
                  } catch (err: any) {
                    setError(err.message || 'Detection failed');
                  } finally {
                    setActionLoading('');
                  }
                }}
                disabled={actionLoading === 'detect'}
                className="btn-secondary text-xs px-3 py-1"
              >
                {actionLoading === 'detect' ? <><LoadingSpinner size={14} /> Detecting...</> : 'Retry Sync'}
              </button>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400 flex items-center gap-2">
              <LoadingSpinner size={14} /> {statusMessage}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Client: Deposit Escrow */}
          {role === 'client' && agreement.status === 'active' && (!escrow?.status || escrow?.status === 'pending' || escrow?.status === 'rejected') && (
            <button
              onClick={handleDepositEscrow}
              disabled={actionLoading === 'deposit'}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {actionLoading === 'deposit' ? (
                <><LoadingSpinner size={16} /> Depositing...</>
              ) : (
                `Deposit Escrow (${agreement.amount} ${agreement.currency?.toUpperCase()})`
              )}
            </button>
          )}

          {/* Worker: Submit Deliverable */}
          {role === 'worker' && agreement.status === 'active' && (
            <div>
              <label className="block text-sm text-white/60 mb-2">Submit Deliverable</label>
              <textarea
                value={deliverable}
                onChange={(e) => setDeliverable(e.target.value)}
                placeholder="Describe or link to your completed work..."
                rows={3}
                className="input-field resize-none mb-3"
              />
              <button
                onClick={handleSubmitDeliverable}
                disabled={actionLoading === 'deliverable'}
                className="btn-secondary flex items-center gap-2"
              >
                {actionLoading === 'deliverable' ? (
                  <><LoadingSpinner size={16} /> Submitting...</>
                ) : (
                  'Submit Deliverable'
                )}
              </button>
            </div>
          )}

          {/* Client: Approve & Release Payment */}
          {role === 'client' && agreement.status === 'delivered' && (
            <button
              onClick={handleComplete}
              disabled={actionLoading === 'complete'}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {actionLoading === 'complete' ? (
                <><LoadingSpinner size={16} /> Completing...</>
              ) : (
                'Approve & Release Payment'
              )}
            </button>
          )}

          {/* Client: Refund */}
          {role === 'client' && agreement.status === 'active' && (escrow?.status === 'deposited' || escrow?.status === 'committed') && (
            <button
              onClick={handleRefund}
              disabled={actionLoading === 'refund'}
              className="btn-secondary w-full flex items-center justify-center gap-2 text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
            >
              {actionLoading === 'refund' ? (
                <><LoadingSpinner size={16} /> Refunding...</>
              ) : (
                'Request Refund (after timeout)'
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
