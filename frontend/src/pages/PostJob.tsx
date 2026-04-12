import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useZKWorkWallet } from '../hooks/useZKWorkWallet';
import { useUserStore } from '../stores/userStore';
import { apiClient } from '../lib/api';
import { displayToMicro } from '../lib/aleo';
import { stringToField, randomField } from '../lib/commitment';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const SKILL_OPTIONS = [
  'Solidity', 'Leo', 'Rust', 'TypeScript', 'React', 'Node.js',
  'Python', 'Smart Contracts', 'Frontend', 'Backend', 'DevOps',
  'Security Audit', 'UI/UX Design', 'Data Science', 'Machine Learning',
];

const CURRENCY_META = {
  aleo: { icon: '⚡', label: 'ALEO' },
  usdcx: { icon: '💵', label: 'USDCx' },
  usad: { icon: '🪙', label: 'USAD' },
};

export const PostJob: FC = () => {
  const navigate = useNavigate();
  const { connected, executeTransition, authenticate } = useZKWorkWallet();
  const { isAuthenticated } = useUserStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState<'aleo' | 'usdcx' | 'usad'>('aleo');
  const [skills, setSkills] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleSkill = (skill: string) => {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  };

  const handleSubmit = async () => {
    if (!connected) return;
    if (!isAuthenticated) {
      const ok = await authenticate();
      if (!ok) { setError('Authentication failed. Please try again.'); return; }
    }
    if (!title.trim()) { setError('Title is required'); return; }
    if (!description.trim()) { setError('Description is required'); return; }
    if (!budget || parseFloat(budget) <= 0) { setError('Budget must be positive'); return; }
    if (skills.length === 0) { setError('Select at least one skill'); return; }
    if (!deadline) { setError('Deadline is required'); return; }

    const selectedDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate <= today) { setError('Deadline must be a future date. Past dates cause escrow timeout rejections on-chain.'); return; }

    setError('');
    setSubmitting(true);

    try {
      const salt = randomField();
      const descriptionHash = stringToField(title.trim() + '|' + description.trim());
      const categoryHash = stringToField(skills.join(','));
      const budgetMicro = displayToMicro(parseFloat(budget));
      const deadlineBlock = Math.floor(new Date(deadline).getTime() / 1000);
      const currencyCode = currency === 'aleo' ? '0u8' : currency === 'usdcx' ? '1u8' : '2u8';

      const txId = await executeTransition(
        'post_job',
        [descriptionHash, `${budgetMicro}u64`, currencyCode, categoryHash, `${deadlineBlock}u64`, salt],
        500_000, 'post_job',
        { title, description, skills }
      );

      if (!txId) {
        setError('Wallet did not respond. Please refresh the page, reconnect your wallet, and try again.');
        setSubmitting(false);
        return;
      }

      const commitment = salt;
      const jobPayload = { commitment, title: title.trim(), description: description.trim(), budget: parseFloat(budget), currency, skills, deadline, txId };

      try {
        await apiClient.createJob(jobPayload);
      } catch (apiErr: any) {
        if (apiErr.message?.includes('expired') || apiErr.message?.includes('401')) {
          const reauthed = await authenticate();
          if (reauthed) { await apiClient.createJob(jobPayload); }
          else { throw new Error('Transaction succeeded on-chain but failed to save. Re-authenticate and visit Dashboard to sync.'); }
        } else { throw apiErr; }
      }

      navigate('/jobs');
    } catch (err: any) {
      setError(err.message || 'Failed to post job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen" style={{ background: '#0d0812' }}>
      <div className="orb orb-green w-[500px] h-[500px] -top-48 left-1/2 -translate-x-1/2" style={{ opacity: 0.07 }} />
      <div className="orb orb-purple w-[400px] h-[400px] top-1/2 -right-48" style={{ opacity: 0.06 }} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(135,255,139,0.08)', border: '1px solid rgba(135,255,139,0.15)' }}>📝</div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Post a Job</h1>
              <p className="text-sm" style={{ color: 'rgba(212,190,236,0.45)' }}>Job details stored off-chain. Only commitments go on-chain.</p>
            </div>
          </div>

          <div className="liquid-glass p-6 sm:p-8 space-y-7">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(212,190,236,0.5)' }}>Job Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Leo Smart Contract Developer" className="input-field" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(212,190,236,0.5)' }}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the job requirements, deliverables, and timeline..." rows={5} className="input-field resize-none" />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(212,190,236,0.5)' }}>Required Skills</label>
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((skill) => (
                  <button key={skill} onClick={() => toggleSkill(skill)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300"
                    style={skills.includes(skill)
                      ? { background: '#87FF8B', color: '#00390c', boxShadow: '0 0 12px rgba(135,255,139,0.25)' }
                      : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(212,190,236,0.5)' }
                    }
                  >{skill}</button>
                ))}
              </div>
            </div>

            {/* Budget + Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(212,190,236,0.5)' }}>Budget</label>
                <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="100.00" min="0" step="0.01" className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(212,190,236,0.5)' }}>Currency</label>
                <div className="flex gap-2">
                  {(Object.entries(CURRENCY_META) as [string, { icon: string; label: string }][]).map(([c, meta]) => (
                    <button key={c} type="button" onClick={() => setCurrency(c as 'aleo' | 'usdcx' | 'usad')}
                      className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300"
                      style={currency === c
                        ? { background: '#87FF8B', color: '#00390c', boxShadow: '0 0 15px rgba(135,255,139,0.2)' }
                        : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(212,190,236,0.5)' }
                      }
                    >{meta.icon} {meta.label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(212,190,236,0.5)' }}>Deadline</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input-field" min={new Date().toISOString().split('T')[0]} />
            </div>

            {error && (
              <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgb(252,165,165)' }}>{error}</div>
            )}

            <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base">
              {submitting ? (<><LoadingSpinner size={18} />Posting on-chain...</>) : (<>📤 Post Job</>)}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
