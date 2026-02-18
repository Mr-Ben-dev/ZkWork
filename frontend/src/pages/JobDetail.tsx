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
import { JobContract } from '../components/icons';

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
      const [jobRes, appRes] = await Promise.allSettled([
        apiClient.getJob(commitment),
        apiClient.getJobApplications(commitment),
      ]);
      if (jobRes.status === 'fulfilled') setJob((jobRes.value as any).job || jobRes.value);
      if (appRes.status === 'fulfilled') setApplications((appRes.value as any).applications || []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [commitment]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  const handleApply = async () => {
    if (!connected || !isAuthenticated) {
      await authenticate();
      return;
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
      setError(err.message || 'Application failed');
    } finally {
      setApplying(false);
    }
  };

  const handleCreateAgreement = async (app: any) => {
    if (!connected || !isAuthenticated) return;

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
        { jobCommitment: commitment, workerCommitment: app.workerCommitment }
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
          amount: app.proposedRate,
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
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <JobContract className="w-12 h-12 text-white/20 mx-auto mb-4" />
        <p className="text-white/40">Job not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="glass p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-bold flex-1 mr-4">{job.title}</h1>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-white/50 mb-4 leading-relaxed">{job.description}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {job.skills?.map((s: string) => (
              <span key={s} className="badge-glass">{s}</span>
            ))}
          </div>
          <div className="flex items-center gap-6 text-sm">
            <span className="text-accent font-semibold">
              {job.budget} {job.currency?.toUpperCase()}
            </span>
            <span className="text-white/30">
              Deadline: {new Date(job.deadline).toLocaleDateString()}
            </span>
            <span className="text-white/30">
              {applications.length} applicant{applications.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {job.status === 'open' && isAuthenticated && (
          <div className="glass p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Apply for this Job</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Cover Letter</label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Why are you the right person for this job?"
                  rows={4}
                  className="input-field resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Proposed Rate</label>
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
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
              <button
                onClick={handleApply}
                disabled={applying}
                className="btn-primary flex items-center gap-2"
              >
                {applying ? <><LoadingSpinner size={16} /> Applying...</> : 'Submit Application'}
              </button>
            </div>
          </div>
        )}

        {applications.length > 0 && (
          <div className="glass p-6">
            <h2 className="text-lg font-semibold mb-4">Applications</h2>
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.id} className="p-4 rounded-xl bg-white/5">
                  <p className="text-sm text-white/60 mb-2">{app.coverLetter}</p>
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
          </div>
        )}
      </motion.div>
    </div>
  );
};
