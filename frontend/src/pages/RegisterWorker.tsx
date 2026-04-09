import { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useZKWorkWallet } from '../hooks/useZKWorkWallet';
import { useUserStore } from '../stores/userStore';
import { apiClient } from '../lib/api';
import { randomField } from '../lib/commitment';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const SKILL_OPTIONS = [
  'Solidity', 'Leo', 'Rust', 'TypeScript', 'React', 'Node.js',
  'Python', 'Smart Contracts', 'Frontend', 'Backend', 'DevOps',
  'Security Audit', 'UI/UX Design', 'Data Science', 'Machine Learning',
];

export const RegisterWorker: FC = () => {
  const navigate = useNavigate();
  const { walletAddress, connected, authenticate } = useZKWorkWallet();
  const { isAuthenticated } = useUserStore();

  const [skills, setSkills] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [ratePerHour, setRatePerHour] = useState('');
  const [currency, setCurrency] = useState<'aleo' | 'usdcx' | 'usad'>('aleo');
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
      const ok = await authenticate();
      if (!ok) { setError('Authentication failed. Please try again.'); return; }
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
      const commitment = salt;

      await apiClient.registerWorker({
        commitment,
        skills,
        bio: bio.trim(),
        ratePerHour: parseFloat(ratePerHour),
        currency,
        txId: `local_${Date.now()}`,
      });

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen" style={{ background: '#0d0812' }}>
      <div className="orb orb-green w-[500px] h-[500px] -top-48 left-1/2 -translate-x-1/2" style={{ opacity: 0.07 }} />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="liquid-glass p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(135,255,139,0.08)', border: '1px solid rgba(135,255,139,0.15)' }}>👤</div>
            <div>
              <h1 className="text-2xl font-bold">Register as Worker</h1>
              <p className="text-sm" style={{ color: 'rgba(212,190,236,0.45)' }}>Your profile stays private — stored as a Leo record.</p>
            </div>
          </div>
        </div>

        <div className="liquid-glass p-6 sm:p-8 space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(212,190,236,0.5)' }}>Skills</label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((skill) => (
                <button key={skill} onClick={() => toggleSkill(skill)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300"
                  style={skills.includes(skill)
                    ? { background: '#87FF8B', color: '#00390c', boxShadow: '0 0 12px rgba(135,255,139,0.25)' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(212,190,236,0.5)' }
                  }>{skill}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(212,190,236,0.5)' }}>Bio</label>
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
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(212,190,236,0.5)' }}>Rate / Hour</label>
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
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(212,190,236,0.5)' }}>Currency</label>
              <div className="flex gap-2">
                {(['aleo', 'usdcx', 'usad'] as const).map((c) => (
                  <button key={c} type="button" onClick={() => setCurrency(c)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                    style={currency === c
                      ? { background: '#87FF8B', color: '#00390c', boxShadow: '0 0 15px rgba(135,255,139,0.2)' }
                      : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(212,190,236,0.5)' }
                    }>{c.toUpperCase()}</button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgb(252,165,165)' }}>{error}</div>
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
