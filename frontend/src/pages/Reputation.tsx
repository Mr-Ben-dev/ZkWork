import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useZKWorkWallet } from '../hooks/useZKWorkWallet';
import { useUserStore } from '../stores/userStore';
import { apiClient } from '../lib/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';


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

      // Search all complete_job outputs (aleo, usdcx, usad)
      let completionRecord: string | null = null;
      for (const fn of ['complete_job_aleo', 'complete_job_usdcx', 'complete_job_usad']) {
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
        { agreementCommitment },
        inputs.length === 1 ? [0] : [0, 1] // all inputs are records
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
        { threshold: parseInt(threshold), verifier: verifierAddress },
        [0] // inputs[0]=ReputationRecord
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
      <div className="relative min-h-screen flex items-center justify-center" style={{ background: '#0d0812' }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-4xl" style={{ background: 'rgba(135,255,139,0.06)', border: '1px solid rgba(135,255,139,0.1)' }}>⭐</div>
          <h1 className="text-2xl font-bold mb-2">Reputation</h1>
          <p style={{ color: 'rgba(212,190,236,0.45)' }}>Sign in to manage your ZK reputation.</p>
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
    <div className="relative min-h-screen" style={{ background: '#0d0812' }}>
      <div className="orb orb-green w-[500px] h-[500px] -top-40 -right-48" style={{ opacity: 0.06 }} />
      <div className="orb orb-purple w-[400px] h-[400px] top-1/2 -left-32" style={{ opacity: 0.07 }} />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="liquid-glass p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'rgba(135,255,139,0.08)', border: '1px solid rgba(135,255,139,0.15)' }}>⭐</div>
            <div>
              <h1 className="text-2xl font-bold">ZK Reputation</h1>
              <p className="text-sm" style={{ color: 'rgba(212,190,236,0.45)' }}>
                Build and prove your work history without revealing your identity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(26,19,37,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(135,255,139,0.1)', border: '1px solid rgba(135,255,139,0.2)' }}>
              <span className="text-3xl font-bold text-accent">
                {reputation?.claimedJobs ?? 0}
              </span>
            </div>
            <div>
              <p className="text-lg font-semibold">Jobs Completed</p>
              <p className="text-sm" style={{ color: 'rgba(212,190,236,0.45)' }}>
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
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 sm:p-8 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-accent">✓</span>
              Completed Jobs — Claim Reputation
            </h2>
            <div className="space-y-3">
              {agreements.map((ag) => (
                <div key={ag.commitment} className="glass-hover flex items-center justify-between p-4 rounded-xl transition-all duration-300">
                  <div>
                    <p className="text-sm font-mono" style={{ color: 'rgba(212,190,236,0.55)' }}>
                      {ag.commitment.slice(0, 20)}...
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(212,190,236,0.35)' }}>
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

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔐</span>
            <h2 className="text-lg font-semibold">Prove Threshold</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: 'rgba(212,190,236,0.45)' }}>
            Generate a zero-knowledge proof that you have completed at least N jobs,
            without revealing your exact count or identity.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(212,190,236,0.5)' }}>
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
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(212,190,236,0.5)' }}>
                Verifier address
              </label>
              <p className="text-xs mb-2" style={{ color: 'rgba(212,190,236,0.3)' }}>
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
