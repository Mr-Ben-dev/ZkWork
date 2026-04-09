import { FC, useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useZKWorkWallet } from '../hooks/useZKWorkWallet';
import { useUserStore } from '../stores/userStore';
import { usePendingTxStore } from '../stores/pendingTxStore';
import { apiClient } from '../lib/api';
import { displayToMicro } from '../lib/aleo';
import { stringToField } from '../lib/commitment';
import { buildMerkleProofPair, toMicroUSDCx } from '../lib/usdcx';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const AgreementDetail: FC = () => {
  const { commitment } = useParams<{ commitment: string }>();
  const { connected, wallet, executeTransition, findRecord, findAllRecords, findRecordWithRetry, findCreditsRecord, findTokenRecord, findUsadRecord, authenticate } = useZKWorkWallet();
  const { isAuthenticated } = useUserStore();
  const pendingTxs = usePendingTxStore((s) => s.transactions);

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
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [submittingDispute, setSubmittingDispute] = useState(false);

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

  // Auto-reset escrow status when a deposit tx is rejected on-chain
  useEffect(() => {
    if (!commitment || !escrow) return;
    if (escrow.status !== 'committed' && escrow.status !== 'deposited') return;
    const depositTxId = escrow.depositTxId;
    if (!depositTxId) return;
    const tx = pendingTxs.find((t) => t.id === depositTxId || t.meta?.agreementCommitment === commitment);
    if (tx && tx.status === 'failed') {
      console.log('[escrow] Deposit tx rejected, resetting escrow status');
      apiClient.confirmEscrowStatus(commitment, 'rejected').then(() => loadData()).catch(() => {});
    }
  }, [pendingTxs, commitment, escrow, loadData]);

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
    const expectedPT = agreement.currency === 'aleo' ? '0u8' : agreement.currency === 'usdcx' ? '1u8' : '2u8';
    const detect = async () => {
      try {
        const fnNames = ['submit_deliverable', 'deposit_escrow_aleo', 'commit_escrow_usdcx', 'commit_escrow_usad', 'create_agreement'];
        const filter = (pt: string): boolean => {
          if (!isAgreementRecord(pt)) return false;
          // Check payment_type matches currency
          const ptTypeMatch = pt.match(/payment_type:\s*(\du8)/);
          if (ptTypeMatch && ptTypeMatch[1] !== expectedPT) return false;
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

  /** Map currency string to on-chain payment_type u8 value */
  const currencyToPaymentType = (currency?: string): string | null => {
    if (currency === 'aleo') return '0u8';
    if (currency === 'usdcx') return '1u8';
    if (currency === 'usad') return '2u8';
    return null;
  };

  /** Check if a record plaintext has the expected payment_type */
  const matchesPaymentType = (pt: string, expectedType: string | null): boolean => {
    if (!expectedType) return true;
    const match = pt.match(/payment_type:\s*(\du8)/);
    return !match || match[1] === expectedType;
  };

  /**
   * Build a content filter for Agreement records.
   * When onChainAgreementId is set: STRICT match only (no fallback).
   * When not set: match by salary + description_hash for reliable filtering.
   * Always checks payment_type when currency is known.
   */
  const buildAgreementFilter = (agreementId?: string, expectedSalaryMicro?: number, expectedDescHash?: string, currency?: string) => (pt: string): boolean => {
    if (!isAgreementRecord(pt)) return false;
    // Always check payment_type when currency is known
    if (!matchesPaymentType(pt, currencyToPaymentType(currency))) return false;
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
   * When not set: uses salary + description_hash, then falls back to any Agreement.
   */
  const findLatestAgreement = async (): Promise<string | null> => {
    const agId = agreement?.onChainAgreementId;
    const expectedSalary = agreement ? displayToMicro(agreement.amount) : undefined;
    const currency = agreement?.currency;
    // Compute description_hash from linked job data
    const expectedDescHash = jobData
      ? stringToField((jobData.title || '').trim() + '|' + (jobData.description || '').trim())
      : undefined;

    if (!agId) {
      console.warn('[findLatestAgreement] No onChainAgreementId — using salary+descHash+currency filter');
    }

    const filter = buildAgreementFilter(agId, expectedSalary, expectedDescHash, currency);
    const sources = ['submit_deliverable', 'deposit_escrow_aleo', 'commit_escrow_usdcx', 'commit_escrow_usad', 'create_agreement'];
    for (const fn of sources) {
      const record = await findRecord({ functionName: fn }, undefined, filter);
      if (record) {
        await saveAgreementIdIfNeeded(record);
        return record;
      }
    }

    // Fallback: try loose filter (any Agreement record matching payment_type) if strict filter failed
    if (!agId) {
      console.warn('[findLatestAgreement] Strict filter failed — trying loose match (payment_type-filtered)');
      const expectedType = currencyToPaymentType(currency);
      const looseFilter = (pt: string) => isAgreementRecord(pt) && matchesPaymentType(pt, expectedType);
      for (const fn of sources) {
        const record = await findRecord({ functionName: fn }, undefined, looseFilter);
        if (record) {
          await saveAgreementIdIfNeeded(record);
          return record;
        }
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
      // If escrow is 'committed' but the tx was rejected, reset it first
      if (escrow && (escrow.status === 'committed' || escrow.status === 'deposited')) {
        const depositTx = pendingTxs.find((t) => t.id === escrow.depositTxId || t.meta?.agreementCommitment === commitment);
        if (depositTx && depositTx.status === 'failed') {
          console.log('[deposit] Previous deposit tx was rejected, resetting escrow status');
          await apiClient.confirmEscrowStatus(commitment!, 'rejected');
          await loadData();
        }
      }

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
          { agreementCommitment: commitment },
          [0, 1] // inputs[0]=Agreement record, inputs[1]=credits record
        );
      } else if (agreement.currency === 'usdcx') {
        // commit_escrow_usdcx(agreement: Agreement)
        setStatusMessage('Finding agreement record...');
        const agreementRecord = await findLatestAgreement();
        setStatusMessage('');
        if (!agreementRecord) {
          setError('Agreement record not found in wallet. It may have been consumed by a previous failed transaction. Try creating a new agreement.');
          setActionLoading('');
          return;
        }

        // Validate payment_type before sending to prover
        const ptMatch = agreementRecord.match(/payment_type:\s*(\du8)/);
        if (ptMatch && ptMatch[1] !== '1u8') {
          setError(`Wrong record selected: payment_type is ${ptMatch[1]} but USDCx requires 1u8. This may be from a different agreement.`);
          setActionLoading('');
          return;
        }

        // Validate owner and client match the connected wallet
        const walletAddr = wallet?.address;
        if (walletAddr) {
          const ownerMatch = agreementRecord.match(/owner:\s*(aleo1\w+)/);
          const clientMatch = agreementRecord.match(/client:\s*(aleo1\w+)/);
          if (ownerMatch && ownerMatch[1] !== walletAddr) {
            setError(`Record owner (${ownerMatch[1].slice(0, 15)}...) does not match your wallet.`);
            setActionLoading('');
            return;
          }
          if (clientMatch && clientMatch[1] !== walletAddr) {
            setError(`Record client (${clientMatch[1].slice(0, 15)}...) does not match your wallet. Only the job poster can deposit escrow.`);
            setActionLoading('');
            return;
          }
        }

        console.log('[deposit] USDCx agreement record (full):', agreementRecord);

        txId = await executeTransition(
          'commit_escrow_usdcx',
          [agreementRecord],
          500_000,
          'commit_escrow_usdcx',
          { agreementCommitment: commitment },
          [0] // inputs[0]=Agreement record
        );
      } else {
        // commit_escrow_usad(agreement: Agreement)
        setStatusMessage('Finding agreement record...');
        const agreementRecord = await findLatestAgreement();
        setStatusMessage('');
        if (!agreementRecord) {
          setError('Agreement record not found in wallet. It may have been consumed by a previous failed transaction. Try creating a new agreement.');
          setActionLoading('');
          return;
        }

        // Validate payment_type before sending to prover
        const ptMatch = agreementRecord.match(/payment_type:\s*(\du8)/);
        if (ptMatch && ptMatch[1] !== '2u8') {
          setError(`Wrong record selected: payment_type is ${ptMatch[1]} but USAD requires 2u8. This may be from a different agreement.`);
          setActionLoading('');
          return;
        }

        // Validate owner and client match the connected wallet
        const walletAddr = wallet?.address;
        if (walletAddr) {
          const ownerMatch = agreementRecord.match(/owner:\s*(aleo1\w+)/);
          const clientMatch = agreementRecord.match(/client:\s*(aleo1\w+)/);
          if (ownerMatch && ownerMatch[1] !== walletAddr) {
            setError(`Record owner (${ownerMatch[1].slice(0, 15)}...) does not match your wallet. You may need the original job poster's account.`);
            setActionLoading('');
            return;
          }
          if (clientMatch && clientMatch[1] !== walletAddr) {
            setError(`Record client (${clientMatch[1].slice(0, 15)}...) does not match your wallet. Only the job poster can deposit escrow.`);
            setActionLoading('');
            return;
          }
        }

        // Log full record for debugging
        console.log('[deposit] USAD agreement record (full):', agreementRecord);
        console.log('[deposit] Record length:', agreementRecord.length);
        console.log('[deposit] Has _nonce:', agreementRecord.includes('_nonce'));

        txId = await executeTransition(
          'commit_escrow_usad',
          [agreementRecord],
          500_000,
          'commit_escrow_usad',
          { agreementCommitment: commitment },
          [0] // inputs[0]=Agreement record
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
        { agreementCommitment: commitment },
        [0] // inputs[0]=Agreement record
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
      const transitionName = agreement.currency === 'aleo' ? 'complete_job_aleo' : agreement.currency === 'usdcx' ? 'complete_job_usdcx' : 'complete_job_usad';

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
          { agreementCommitment: commitment },
          [0, 1, 2] // all 3 inputs are records
        );

        if (txId) {
          await apiClient.completeEscrow({
            agreementCommitment: commitment!,
            txId,
          });
          await loadData();
        }
      } else if (agreement.currency === 'usdcx') {
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
          { agreementCommitment: commitment },
          [0, 1, 2, 3] // first 4 inputs are records
        );

        if (txId) {
          await apiClient.completeEscrow({
            agreementCommitment: commitment!,
            txId,
          });
          await loadData();
        }
      } else {
        // complete_job_usad(agreement, escrow, notice, pay_record, amount, proofs)
        console.log('[complete] USAD flow — looking for Agreement record...');
        const agreementRecord = await findLatestAgreement();
        if (agreementRecord) {
          console.log('[complete] Agreement found:', agreementRecord.slice(0, 300));
        }

        const agId = agreementRecord ? extractAgreementId(agreementRecord) : null;
        console.log('[complete] Using agreement_id for filtering:', agId);

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

        console.log('[complete] Looking for EscrowReceipt (from commit_escrow_usad)...');
        const escrowRecord = await findRecordWithRetry(
          { functionName: 'commit_escrow_usad' }, undefined, isEscrowReceipt
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

        // Find USAD Token record with sufficient balance
        const amountMicro = BigInt(toMicroUSDCx(agreement.amount));
        console.log('[complete] Looking for USAD Token record, need:', amountMicro.toString());
        setStatusMessage('Looking for USAD token record...');
        const tokenRecord = await findUsadRecord(amountMicro);
        setStatusMessage('');
        if (!tokenRecord) {
          setError(`No USAD token with sufficient balance found. You need at least ${agreement.amount} USAD. Make sure you have USAD tokens in your wallet.`);
          setActionLoading('');
          return;
        }
        console.log('[complete] USAD Token found:', tokenRecord.slice(0, 200));

        const [proof1, proof2] = buildMerkleProofPair();
        const proofsInput = `[${proof1}, ${proof2}]`;

        const txId = await executeTransition(
          transitionName,
          [agreementRecord, escrowRecord, noticeRecord, tokenRecord, `${amountMicro}u128`, proofsInput],
          500_000,
          'complete_job',
          { agreementCommitment: commitment },
          [0, 1, 2, 3] // first 4 inputs are records
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
        { agreementCommitment: commitment },
        [0] // inputs[0]=EscrowReceipt record
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

  const handleRaiseDispute = async () => {
    if (!disputeReason.trim()) { setError('Please describe the dispute reason.'); return; }
    setError('');
    setSubmittingDispute(true);
    try {
      await apiClient.raiseDispute(commitment!, { reason: disputeReason.trim() });
      setShowDisputeForm(false);
      setDisputeReason('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to raise dispute');
    } finally {
      setSubmittingDispute(false);
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
      <div className="relative min-h-screen flex items-center justify-center" style={{ background: '#0d0812' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl" style={{ background: 'rgba(135,255,139,0.06)', border: '1px solid rgba(135,255,139,0.1)' }}>📋</div>
          <p style={{ color: 'rgba(212,190,236,0.45)' }}>Agreement not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen" style={{ background: '#0d0812' }}>
      <div className="orb orb-green w-[500px] h-[500px] -top-40 -right-48" style={{ opacity: 0.06 }} />
      <div className="orb orb-purple w-[400px] h-[400px] top-1/2 -left-32" style={{ opacity: 0.07 }} />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="liquid-glass p-6 sm:p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">Agreement</h1>
              <p className="text-xs font-mono" style={{ color: 'rgba(212,190,236,0.3)' }}>{commitment}</p>
            </div>
            <StatusBadge status={agreement.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(26,19,37,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'rgba(212,190,236,0.45)' }}>Amount</span>
              <p className="text-accent font-semibold text-lg">
                {agreement.amount} {agreement.currency?.toUpperCase()}
              </p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'rgba(26,19,37,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: 'rgba(212,190,236,0.45)' }}>Created</span>
              <p style={{ color: 'rgba(212,190,236,0.7)' }}>{new Date(agreement.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {agreement.deliverable && (
            <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(26,19,37,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(212,190,236,0.45)' }}>Deliverable</span>
              <p className="text-sm mt-1" style={{ color: 'rgba(212,190,236,0.7)' }}>{agreement.deliverable}</p>
            </div>
          )}
        </div>

        {escrow && (
          <div className="glass-card p-6 sm:p-8 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🔒</span>
              <h2 className="text-lg font-semibold">Escrow Status</h2>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={escrow.status || 'none'} />
              {escrow.onChain && (
                <span className="text-xs flex items-center gap-1" style={{ color: '#87FF8B' }}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Verified on-chain
                </span>
              )}
            </div>
          </div>
        )}

        {/* Dispute resolved banner */}
        {agreement.status === 'disputed' && (
          <div className="glass-card p-4 mb-6 flex items-center gap-3" style={{ border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.05)' }}>
            <span className="text-2xl">⚖️</span>
            <div>
              <p className="font-semibold text-yellow-400 text-sm">Dispute Raised</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(212,190,236,0.5)' }}>This agreement is under arbitration review. Both parties will be notified of the outcome.</p>
            </div>
          </div>
        )}

        <div className="glass-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Actions</h2>
            <span className="text-xs px-3 py-1 rounded-full font-medium uppercase tracking-wider" style={{ background: 'rgba(135,255,139,0.08)', border: '1px solid rgba(135,255,139,0.15)', color: '#87FF8B' }}>
              {role === 'client' ? 'Client' : role === 'worker' ? 'Worker' : 'Viewer'}
            </span>
          </div>

          {/* Syncing on-chain agreement ID */}
          {connected && !agreement.onChainAgreementId && !autoDetectDone && (
            <div className="p-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: 'rgb(165,180,252)' }}>
              <LoadingSpinner size={14} /> Syncing on-chain agreement ID...
            </div>
          )}

          {connected && autoDetectDone && !agreement.onChainAgreementId && (
            <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(26,19,37,0.6)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(212,190,236,0.5)' }}>
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
                    const fnNames = ['submit_deliverable', 'deposit_escrow_aleo', 'commit_escrow_usdcx', 'commit_escrow_usad', 'create_agreement'];
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
            <div className="p-3 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: 'rgb(165,180,252)' }}>
              <LoadingSpinner size={14} /> {statusMessage}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgb(252,165,165)' }}>
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
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(212,190,236,0.5)' }}>Submit Deliverable</label>
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

          {/* Client: Refund after timeout */}
          {role === 'client' && agreement.status === 'active' && (escrow?.status === 'deposited' || escrow?.status === 'committed') && (
            <button
              onClick={handleRefund}
              disabled={actionLoading === 'refund'}
              className="btn-secondary w-full flex items-center justify-center gap-2"
              style={{ color: 'rgb(251,146,60)', borderColor: 'rgba(249,115,22,0.3)' }}
            >
              {actionLoading === 'refund' ? (
                <><LoadingSpinner size={16} /> Refunding...</>
              ) : (
                'Request Refund (after timeout)'
              )}
            </button>
          )}

          {/* Dispute Resolution */}
          {agreement.status !== 'disputed' && agreement.status !== 'completed' && agreement.status !== 'cancelled' &&
            (escrow?.status === 'deposited' || escrow?.status === 'committed') && (
            <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {!showDisputeForm ? (
                <button
                  onClick={() => setShowDisputeForm(true)}
                  className="text-sm flex items-center gap-2 transition-colors duration-200"
                  style={{ color: 'rgba(212,190,236,0.5)' }}
                >
                  <span>⚖️</span> Raise a Dispute
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚖️</span>
                    <h3 className="font-semibold text-sm">Raise Dispute</h3>
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(212,190,236,0.45)' }}>
                    Describe the issue clearly. An arbitrator will review and mediate between both parties.
                  </p>
                  <textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Describe the dispute in detail — what went wrong, what resolution you expect..."
                    rows={4}
                    className="input-field resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleRaiseDispute}
                      disabled={submittingDispute}
                      className="btn-primary flex items-center gap-2 text-sm"
                      style={{ background: 'rgba(251,191,36,0.15)', borderColor: 'rgba(251,191,36,0.3)', color: 'rgb(251,191,36)', boxShadow: 'none' }}
                    >
                      {submittingDispute ? <><LoadingSpinner size={14} /> Submitting...</> : 'Submit Dispute'}
                    </button>
                    <button
                      onClick={() => { setShowDisputeForm(false); setDisputeReason(''); }}
                      className="btn-secondary text-sm px-4"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
      </div>
    </div>
  );
};
