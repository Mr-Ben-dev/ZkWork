import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useZKWorkWallet } from '../hooks/useZKWorkWallet';
import { useUserStore } from '../stores/userStore';
import { apiClient } from '../lib/api';
import { displayToMicro } from '../lib/aleo';
import { stringToField, randomField } from '../lib/commitment';
import { AnonAvatar } from '../components/icons';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { AnimatedBackground } from '../components/ui/AnimatedBackground';

const SKILL_OPTIONS = [
  'Solidity', 'Leo', 'Rust', 'TypeScript', 'React', 'Node.js',
  'Python', 'Smart Contracts', 'Frontend', 'Backend', 'DevOps',
  'Security Audit', 'UI/UX Design', 'Data Science', 'Machine Learning',
];

export const RegisterWorker: FC = () => {
  const navigate = useNavigate();
  const { walletAddress, connected, executeTransition, authenticate } = useZKWorkWallet();
  const { isAuthenticated } = useUserStore();

  const [skills, setSkills] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [ratePerHour, setRatePerHour] = useState('');
  const [currency, setCurrency] = useState<'aleo' | 'usdcx'>('aleo');
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
    if (skills.length === 0) {
      setError('Select at least one skill');
      return;
    }
    if (!bio.trim()) {
      setError('Bio is required');
      return;
    }
    if (!ratePerHour || parseFloat(ratePerHour) <= 0) {
      setError('Rate must be positive');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const salt = randomField();
      const skillsHash = stringToField(skills.join(','));
      const bioHash = stringToField(bio.trim());

      const txId = await executeTransition(
        'register_worker',
        [skillsHash, bioHash, salt],
        500_000,
        'register_worker',
        { skills, bio }
      );

      if (!txId) {
        setError('Transaction was rejected by the wallet');
        setSubmitting(false);
        return;
      }

      const commitment = salt;

      await apiClient.registerWorker({
        commitment,
        skills,
        bio: bio.trim(),
        ratePerHour: parseFloat(ratePerHour),
        currency,
        txId,
      });

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="glass-glow p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shadow-lg shadow-accent/10">
              <AnonAvatar className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Register as Worker</h1>
              <p className="text-sm text-white/40">Your profile stays private — stored as a Leo record.</p>
            </div>
          </div>
        </div>

        <div className="glass-glow p-6 sm:p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-3">Skills</label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((skill) => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${
                    skills.includes(skill)
                      ? 'bg-accent/20 border-accent/40 text-accent shadow-lg shadow-accent/20'
                      : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08]'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe your experience and expertise..."
              rows={4}
              className="input-field resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Rate / Hour</label>
              <input
                type="number"
                value={ratePerHour}
                onChange={(e) => setRatePerHour(e.target.value)}
                placeholder="25.00"
                min="0"
                step="0.01"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Currency</label>
              <div className="flex gap-2">
                {(['aleo', 'usdcx'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                      currency === c
                        ? 'bg-accent/20 border-accent/40 text-accent shadow-lg shadow-accent/20'
                        : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08]'
                    }`}
                  >
                    {c.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-base"
          >
            {submitting ? (
              <>
                <LoadingSpinner size={18} />
                Submitting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Register Profile
              </>
            )}
          </button>
        </div>
      </motion.div>
      </div>
    </div>
  );
};
