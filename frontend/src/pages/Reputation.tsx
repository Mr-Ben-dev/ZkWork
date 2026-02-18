import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useZKWorkWallet } from '../hooks/useZKWorkWallet';
import { useUserStore } from '../stores/userStore';
import { apiClient } from '../lib/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ReputationStar, ZKBadge } from '../components/icons';
import { AnimatedBackground } from '../components/ui/AnimatedBackground';

export const Reputation: FC = () => {
  const { connected, executeTransition, findRecord, findRecordWithRetry, authenticate } = useZKWorkWallet();
  const { isAuthenticated } = useUserStore();

  const [reputation, setReputation] = useState<any>(null);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState('');
  const [verifierAddress, setVerifierAddress] = useState('');
  const [proving, setProving] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [repRes, agRes] = await Promise.allSettled([
        apiClient.getMyReputation(),
        apiClient.getMyAgreements(),
      ]);
      if (repRes.status === 'fulfilled') setReputation((repRes.value as any).reputation);
      if (agRes.status === 'fulfilled') {
        const all = (agRes.value as any).agreements || [];
        setAgreements(all.filter((a: any) => a.status === 'completed' && !a.reputationClaimed && a.role === 'worker'));
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClaim = async (agreementCommitment: string) => {
    if (!connected || !isAuthenticated) return;
    setError('');
    setClaiming(agreementCommitment);

    try {
      const isFirst = !reputation || reputation.claimedJobs === 0;
      const transitionName = isFirst ? 'claim_reputation' : 'merge_reputation';

      // Find CompletionReceipt for this specific agreement
      // CompletionReceipt has: agreement_id, deliverable_hash, salary
      const ag = agreements.find((a: any) => a.commitment === agreementCommitment);
      const agOnChainId = ag?.onChainAgreementId;

      const isCompletionReceipt = (pt: string): boolean => {
        // CompletionReceipt has agreement_id but NOT client/worker/salary combo of Agreement
        if (!pt.includes('agreement_id:') || !pt.includes('deliverable_hash:')) return false;
        // Must NOT have client: (that's an Agreement record, not CompletionReceipt)
        if (pt.includes('client:')) return false;
        // Filter by agreement_id if we know it
        if (agOnChainId) {
          const match = pt.match(/agreement_id:\s*(\d+field)/);
          if (match && match[1] !== agOnChainId) return false;
        }
        return true;
      };

      // Search both complete_job_aleo and complete_job_usdcx outputs
      let completionRecord: string | null = null;
      for (const fn of ['complete_job_aleo', 'complete_job_usdcx']) {
        completionRecord = await findRecord({ functionName: fn }, undefined, isCompletionReceipt);
        if (completionRecord) break;
      }
      if (!completionRecord) {
        setError('CompletionReceipt not found in wallet. Complete a job first, then wait for the transaction to be confirmed.');
        setClaiming(null);
        return;
      }

      let inputs: string[];
      if (isFirst) {
        inputs = [completionRecord];
      } else {
        // ReputationRecord can be under 'claim_reputation' (first claim) or 'merge_reputation' (subsequent)
        const isRepRecord = (pt: string) =>
          pt.includes('completed_jobs:') && pt.includes('rep_commitment:') && pt.includes('score:');
        let repRecord: string | null = null;
        for (const fn of ['prove_threshold', 'merge_reputation', 'claim_reputation']) {
          repRecord = await findRecord({ functionName: fn }, undefined, isRepRecord);
          if (repRecord) break;
        }
        if (!repRecord) {
          setError('ReputationRecord not found in wallet. Claim your first job to create one.');
          setClaiming(null);
          return;
        }
        inputs = [completionRecord, repRecord];
      }

      const txId = await executeTransition(
        transitionName,
        inputs,
        500_000,
        'claim_reputation',
        { agreementCommitment }
      );

      if (txId) {
        await apiClient.claimReputation({ agreementCommitment, txId });
        setSuccessMessage('Reputation claimed successfully');
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Claim failed');
    } finally {
      setClaiming(null);
    }
  };

  const handleProveThreshold = async () => {
    if (!connected || !isAuthenticated) return;
    if (!threshold || parseInt(threshold) <= 0) { setError('Threshold must be positive'); return; }
    if (!verifierAddress.startsWith('aleo1')) { setError('Invalid verifier address'); return; }

    setError('');
    setProving(true);

    try {
      // prove_threshold(rep: ReputationRecord, threshold: u64, verifier: address)
      const isRepRecord = (pt: string) =>
        pt.includes('completed_jobs:') && pt.includes('rep_commitment:') && pt.includes('score:');
      let repRecord: string | null = null;
      for (const fn of ['prove_threshold', 'merge_reputation', 'claim_reputation']) {
        repRecord = await findRecord({ functionName: fn }, undefined, isRepRecord);
        if (repRecord) break;
      }
      if (!repRecord) {
        setError('ReputationRecord not found in wallet. Claim reputation from completed jobs first.');
        setProving(false);
        return;
      }

      const txId = await executeTransition(
        'prove_threshold',
        [repRecord, `${parseInt(threshold)}u64`, verifierAddress],
        500_000,
        'prove_threshold',
        { threshold: parseInt(threshold), verifier: verifierAddress }
      );

      if (txId) {
        await apiClient.proveThreshold({
          threshold: parseInt(threshold),
          verifierAddress,
          txId,
        });
        setSuccessMessage('Threshold proof submitted');
        setThreshold('');
        setVerifierAddress('');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Prove threshold failed');
    } finally {
      setProving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen">
        <AnimatedBackground />
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <ReputationStar className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Reputation</h1>
          <p className="text-white/40">Sign in to manage your ZK reputation.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="glass-glow p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shadow-lg shadow-accent/10">
              <ReputationStar className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">ZK Reputation</h1>
              <p className="text-sm text-white/40">
                Build and prove your work history without revealing your identity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-cyan-500/10 flex items-center justify-center shadow-lg shadow-accent/20">
              <span className="text-3xl font-bold text-accent">
                {reputation?.claimedJobs ?? 0}
              </span>
            </div>
            <div>
              <p className="text-lg font-semibold">Jobs Completed</p>
              <p className="text-sm text-white/40">
                {reputation?.updatedAt
                  ? `Last updated ${new Date(reputation.updatedAt).toLocaleDateString()}`
                  : 'No reputation claimed yet'}
              </p>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400 mb-6">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 mb-6">
            {error}
          </div>
        )}

        {agreements.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-glow p-6 sm:p-8 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Completed Jobs — Claim Reputation
            </h2>
            <div className="space-y-3">
              {agreements.map((ag) => (
                <div key={ag.commitment} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all duration-300">
                  <div>
                    <p className="text-sm font-mono text-white/60">
                      {ag.commitment.slice(0, 20)}...
                    </p>
                    <p className="text-xs text-white/30 mt-1">
                      {ag.amount} {ag.currency?.toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleClaim(ag.commitment)}
                    disabled={claiming === ag.commitment}
                    className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5"
                  >
                    {claiming === ag.commitment ? (
                      <><LoadingSpinner size={14} /> Claiming...</>
                    ) : (
                      'Claim'
                    )}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-glow p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <ZKBadge className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Prove Threshold</h2>
          </div>
          <p className="text-sm text-white/40 mb-4">
            Generate a zero-knowledge proof that you have completed at least N jobs,
            without revealing your exact count or identity.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">
                Minimum jobs threshold
              </label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="5"
                min="1"
                className="input-field max-w-xs"
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-2">
                Verifier address
              </label>
              <p className="text-xs text-white/30 mb-2">
                The Aleo address of whoever you want to prove your reputation to (e.g. a potential client).
                They will receive a private ThresholdProof record on-chain. Ask them for their address.
              </p>
              <input
                type="text"
                value={verifierAddress}
                onChange={(e) => setVerifierAddress(e.target.value)}
                placeholder="aleo1..."
                className="input-field"
              />
            </div>
            <button
              onClick={handleProveThreshold}
              disabled={proving}
              className="btn-primary flex items-center gap-2"
            >
              {proving ? (
                <><LoadingSpinner size={16} /> Proving...</>
              ) : (
                'Generate Threshold Proof'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
      </div>
    </div>
  );
};
