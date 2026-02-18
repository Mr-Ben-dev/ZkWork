import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useZKWorkWallet } from '../hooks/useZKWorkWallet';
import { useUserStore } from '../stores/userStore';
import { apiClient } from '../lib/api';
import { displayToMicro } from '../lib/aleo';
import { stringToField, randomField } from '../lib/commitment';
import { JobContract } from '../components/icons';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const SKILL_OPTIONS = [
  'Solidity', 'Leo', 'Rust', 'TypeScript', 'React', 'Node.js',
  'Python', 'Smart Contracts', 'Frontend', 'Backend', 'DevOps',
  'Security Audit', 'UI/UX Design', 'Data Science', 'Machine Learning',
];

export const PostJob: FC = () => {
  const navigate = useNavigate();
  const { connected, executeTransition, authenticate } = useZKWorkWallet();
  const { isAuthenticated } = useUserStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState<'aleo' | 'usdcx'>('aleo');
  const [skills, setSkills] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = async () => {
    if (!connected) return;
    if (!isAuthenticated) {
      await authenticate();
      return;
    }
    if (!title.trim()) { setError('Title is required'); return; }
    if (!description.trim()) { setError('Description is required'); return; }
    if (!budget || parseFloat(budget) <= 0) { setError('Budget must be positive'); return; }
    if (skills.length === 0) { setError('Select at least one skill'); return; }
    if (!deadline) { setError('Deadline is required'); return; }

    setError('');
    setSubmitting(true);

    try {
      const salt = randomField();
      const descriptionHash = stringToField(title.trim() + '|' + description.trim());
      const categoryHash = stringToField(skills.join(','));
      const budgetMicro = displayToMicro(parseFloat(budget));
      const deadlineBlock = Math.floor(new Date(deadline).getTime() / 1000);
      const currencyCode = currency === 'aleo' ? '0u8' : '1u8';

      const txId = await executeTransition(
        'post_job',
        [
          descriptionHash,
          `${budgetMicro}u64`,
          currencyCode,
          categoryHash,
          `${deadlineBlock}u64`,
          salt,
        ],
        500_000,
        'post_job',
        { title, description, skills }
      );

      if (!txId) {
        setError('Transaction was rejected by the wallet');
        setSubmitting(false);
        return;
      }

      const commitment = salt;

      await apiClient.createJob({
        commitment,
        title: title.trim(),
        description: description.trim(),
        budget: parseFloat(budget),
        currency,
        skills,
        deadline,
        txId,
      });

      navigate('/jobs');
    } catch (err: any) {
      setError(err.message || 'Failed to post job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <JobContract className="w-10 h-10 text-accent" />
          <div>
            <h1 className="text-2xl font-bold">Post a Job</h1>
            <p className="text-sm text-white/40">Job details stored off-chain. Only commitments go on-chain.</p>
          </div>
        </div>

        <div className="glass p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Job Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Leo Smart Contract Developer"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the job requirements, deliverables, and timeline..."
              rows={5}
              className="input-field resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Required Skills</label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((skill) => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                    skills.includes(skill)
                      ? 'bg-accent/20 border-accent/40 text-accent'
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Budget</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="100.00"
                min="0"
                step="0.01"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'aleo' | 'usdcx')}
                className="input-field"
              >
                <option value="aleo">ALEO</option>
                <option value="usdcx">USDCx</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input-field"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <LoadingSpinner size={18} />
                Posting...
              </>
            ) : (
              'Post Job'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
