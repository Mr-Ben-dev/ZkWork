import { FC, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useZKWorkWallet } from '../hooks/useZKWorkWallet';
import { useUserStore } from '../stores/userStore';
import { apiClient } from '../lib/api';
import { randomField, stringToField } from '../lib/commitment';
import { displayToMicro } from '../lib/aleo';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const JobDetail: FC = () => {
  const { commitment } = useParams<{ commitment: string }>();
  const navigate = useNavigate();
  const { connected, executeTransition, findRecord, authenticate } = useZKWorkWallet();
  const { isAuthenticated } = useUserStore();

  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedRate, setProposedRate] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  const loadJob = useCallback(async () => {
    if (!commitment) return;
    try {
      const jobRes = await apiClient.getJob(commitment);
      setJob((jobRes as any).job || jobRes);

      if (isAuthenticated) {
        try {
          const appRes = await apiClient.getJobApplications(commitment);
          setApplications((appRes as any).applications || []);
        } catch {
          // Ignore auth errors for applications
        }
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [commitment, isAuthenticated]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  const handleApply = async () => {
    if (!connected) { setError('Please connect your wallet first.'); return; }

    // Always authenticate if not authenticated (handles account switch)
    if (!isAuthenticated) {
      const ok = await authenticate();
      if (!ok) { setError('Authentication failed. Please try again.'); return; }
    }
    if (!coverLetter.trim()) { setError('Cover letter required'); return; }
    if (!proposedRate || parseFloat(proposedRate) <= 0) { setError('Rate must be positive'); return; }

    setError('');
    setApplying(true);

    try {
      await apiClient.applyToJob(commitment!, {
        workerCommitment: randomField(),
        coverLetter: coverLetter.trim(),
        proposedRate: parseFloat(proposedRate),
      });
      setCoverLetter('');
      setProposedRate('');
      await loadJob();
    } catch (err: any) {
      // Re-authenticate on 401 and retry once
      if (err.message?.includes('401') || err.message?.toLowerCase().includes('invalid') || err.message?.toLowerCase().includes('expired')) {
        const ok = await authenticate();
        if (ok) {
          try {
            await apiClient.applyToJob(commitment!, {
              workerCommitment: randomField(),
              coverLetter: coverLetter.trim(),
              proposedRate: parseFloat(proposedRate),
            });
            setCoverLetter('');
            setProposedRate('');
            await loadJob();
            return;
          } catch (retryErr: any) {
            setError(retryErr.message || 'Application failed');
            return;
          }
        }
      }
      setError(err.message || 'Application failed');
    } finally {
      setApplying(false);
    }
  };

  const handleCreateAgreement = async (app: any) => {
    if (!connected) { setError('Please connect your wallet first.'); return; }
    if (!isAuthenticated) {
      const ok = await authenticate();
      if (!ok) { setError('Authentication failed. Please try again.'); return; }
    }

    try {
      // Compute expected field values to identify the correct JobOffer record
      const expectedSalary = displayToMicro(job.budget);
      const expectedDescHash = stringToField((job.title || '').trim() + '|' + (job.description || '').trim());
      const jobContentFilter = (pt: string): boolean => {
        // Must contain salary and description_hash fields (JobOffer record)
        if (!pt.includes('salary:') || !pt.includes('description_hash:')) return false;
        // Match salary
        const salaryMatch = pt.match(/salary:\s*(\d+)u64/);
        if (salaryMatch && parseInt(salaryMatch[1], 10) !== expectedSalary) return false;
        // Match description_hash
        const descMatch = pt.match(/description_hash:\s*(\d+field)/);
        if (descMatch && descMatch[1] !== expectedDescHash) return false;
        return true;
      };
      console.log(`[createAgreement] Looking for JobOffer: salary=${expectedSalary}, descHash=${expectedDescHash}`);
      const jobRecord = await findRecord({ functionName: 'post_job' }, undefined, jobContentFilter);
      if (!jobRecord) {
        setError('JobOffer record not found in wallet. The post_job transaction may still be processing.');
        return;
      }
      console.log('[createAgreement] Found correct JobOffer:', jobRecord.slice(0, 300));

      if (!app.workerAddress || !app.workerAddress.startsWith('aleo1')) {
        setError('Worker address not available for this application.');
        return;
      }

      const salt = randomField();
      const workerAddress = app.workerAddress;

      const txId = await executeTransition(
        'create_agreement',
        [jobRecord, workerAddress, salt],
        500_000,
        'create_agreement',
        { jobCommitment: commitment, workerCommitment: app.workerCommitment },
        [0] // inputs[0]=JobOffer record
      );

      const agreementCommitment = salt;

      if (txId) {
        // Capture on-chain agreement_id from the newest record immediately
        // Filter by salary + worker address to ensure we get the right agreement
        let onChainAgreementId: string | undefined;
        try {
          await new Promise(r => setTimeout(r, 3000));
          const agFilter = (pt: string): boolean => {
            if (!pt.includes('salary:') || !pt.includes('client:')) return false;
            const salMatch = pt.match(/salary:\s*(\d+)u64/);
            if (salMatch && parseInt(salMatch[1], 10) !== expectedSalary) return false;
            if (!pt.includes(app.workerAddress)) return false;
            // Also verify description_hash matches
            const descMatch = pt.match(/description_hash:\s*(\d+field)/);
            if (descMatch && descMatch[1] !== expectedDescHash) return false;
            return true;
          };
          const rec = await findRecord({ functionName: 'create_agreement' }, undefined, agFilter);
          if (rec) {
            const m = rec.match(/agreement_id:\s*(\d+field)/);
            if (m) {
              onChainAgreementId = m[1];
              console.log('[createAgreement] Captured agreement_id:', onChainAgreementId);
            }
          } else {
            console.warn('[createAgreement] Could not find matching agreement record for capture');
          }
        } catch (err) {
          console.warn('[createAgreement] Could not capture agreement_id:', err);
        }

        await apiClient.createAgreement({
          commitment: agreementCommitment,
          jobCommitment: commitment!,
          workerCommitment: app.workerCommitment,
          amount: job.budget,
          currency: job.currency,
          txId,
          onChainAgreementId,
        });
        navigate(`/agreements/${agreementCommitment}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create agreement');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="relative min-h-screen flex items-center justify-center" style={{ background: '#0d0812' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6" style={{ background: 'rgba(135,255,139,0.06)', border: '1px solid rgba(135,255,139,0.1)' }}>💼</div>
          <p style={{ color: 'rgba(212,190,236,0.45)' }}>Job not found</p>
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
            <h1 className="text-2xl font-bold flex-1 mr-4">{job.title}</h1>
            <StatusBadge status={job.status} />
          </div>
          <p className="mb-4 leading-relaxed" style={{ color: 'rgba(212,190,236,0.55)' }}>{job.description}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {job.skills?.map((s: string) => (
              <span key={s} className="badge-accent">{s}</span>
            ))}
          </div>
          <div className="flex items-center gap-6 text-sm p-3 rounded-xl" style={{ background: 'rgba(26,19,37,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="font-bold" style={{ color: '#87FF8B' }}>
              {job.budget} {job.currency?.toUpperCase()}
            </span>
            <span style={{ color: 'rgba(212,190,236,0.35)' }}>
              Deadline: {new Date(job.deadline).toLocaleDateString()}
            </span>
            <span style={{ color: 'rgba(212,190,236,0.35)' }}>
              {applications.length} applicant{applications.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {job.status === 'open' && isAuthenticated && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 sm:p-8 mb-6">
            <h2 className="text-base font-bold mb-4">Apply for this Job</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(212,190,236,0.5)' }}>Cover Letter</label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Why are you the right person for this job?"
                  rows={4}
                  className="input-field resize-none"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(212,190,236,0.5)' }}>Proposed Rate</label>
                <input
                  type="number"
                  value={proposedRate}
                  onChange={(e) => setProposedRate(e.target.value)}
                  placeholder="100.00"
                  min="0"
                  step="0.01"
                  className="input-field max-w-xs"
                />
              </div>
              {error && (<p className="text-sm" style={{ color: 'rgb(252,165,165)' }}>{error}</p>)}
              <button
                onClick={handleApply}
                disabled={applying}
                className="btn-primary flex items-center gap-2"
              >
                {applying ? <><LoadingSpinner size={16} /> Applying...</> : 'Submit Application'}
              </button>
            </div>
          </motion.div>
        )}

        {applications.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 sm:p-8">
            <h2 className="text-lg font-semibold mb-4">Applications</h2>
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.id} className="p-4 rounded-xl transition-all duration-300" style={{ background: 'rgba(26,19,37,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-sm mb-2" style={{ color: 'rgba(212,190,236,0.6)' }}>{app.coverLetter}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-accent font-medium">
                      Rate: {app.proposedRate} {job.currency?.toUpperCase()}
                    </span>
                    {job.status === 'open' && (
                      <button
                        onClick={() => handleCreateAgreement(app)}
                        className="btn-primary text-sm px-4 py-1.5"
                      >
                        Accept & Create Agreement
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
      </div>
    </div>
  );
};
