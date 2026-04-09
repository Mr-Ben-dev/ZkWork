import { FC, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useZKWorkWallet } from '../hooks/useZKWorkWallet';
import { useUserStore } from '../stores/userStore';
import { usePendingTxStore } from '../stores/pendingTxStore';
import { apiClient } from '../lib/api';
import { formatAddress } from '../lib/aleo';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export const Dashboard: FC = () => {
  const { walletAddress, connected } = useZKWorkWallet();
  const { isAuthenticated } = useUserStore();
  const { transactions } = usePendingTxStore();

  const [profile, setProfile] = useState<any>(null);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [myAgreements, setMyAgreements] = useState<any[]>([]);
  const [reputation, setReputation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!isAuthenticated) return;
    if (!silent) setLoading(true);

    try {
      const [profileRes, jobsRes, agreementsRes, repRes] = await Promise.allSettled([
        apiClient.getWorkerProfile(),
        apiClient.getMyJobs(),
        apiClient.getMyAgreements(),
        apiClient.getMyReputation(),
      ]);

      if (profileRes.status === 'fulfilled') setProfile((profileRes.value as any).worker);
      if (jobsRes.status === 'fulfilled') setMyJobs((jobsRes.value as any).jobs || []);
      if (agreementsRes.status === 'fulfilled') setMyAgreements((agreementsRes.value as any).agreements || []);
      if (repRes.status === 'fulfilled') setReputation((repRes.value as any).reputation);
    } catch {
      // Partial load OK
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(() => loadDashboard(true), 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  if (!connected || !isAuthenticated) {
    return (
      <div className="relative min-h-[70vh] flex items-center justify-center" style={{ background: '#0d0812' }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6" style={{ background: 'rgba(135,255,139,0.06)', border: '1px solid rgba(135,255,139,0.1)' }}>👤</div>
          <h1 className="text-3xl font-bold mb-3">Dashboard</h1>
          <p style={{ color: 'rgba(212,190,236,0.45)' }}>Connect your wallet and sign in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  const pendingCount = transactions.filter((t) => t.status === 'pending').length;
  const activeAgreements = myAgreements.filter((a) => a.status === 'active' || a.status === 'delivered');

  return (
    <div className="relative min-h-screen" style={{ background: '#0d0812' }}>
      <div className="orb orb-green w-[500px] h-[500px] -top-40 -right-48" style={{ opacity: 0.06 }} />
      <div className="orb orb-purple w-[400px] h-[400px] top-1/2 -left-32" style={{ opacity: 0.07 }} />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-10">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(135,255,139,0.08)', border: '1px solid rgba(135,255,139,0.15)' }}>👤</div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Dashboard</h1>
            <p className="text-sm font-mono mt-1" style={{ color: 'rgba(212,190,236,0.45)' }}>{formatAddress(walletAddress || '')}</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {[
          { icon: '💼', label: 'My Jobs', value: myJobs.length },
          { icon: '🔒', label: 'Active Agreements', value: activeAgreements.length },
          { icon: '⭐', label: 'Jobs Completed', value: reputation?.claimedJobs ?? 0 },
          { icon: '⏳', label: 'Pending TXs', value: pendingCount },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.5 }} className="stat-card">
            <p className="text-3xl mb-3">{stat.icon}</p>
            <p className="text-3xl font-bold mb-1" style={{ color: '#87FF8B' }}>{stat.value}</p>
            <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(212,190,236,0.45)' }}>{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {profile && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="liquid-glass p-6 sm:p-8 mb-6">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">⚡ Worker Profile</h2>
          <p className="text-sm mb-3 leading-relaxed" style={{ color: 'rgba(212,190,236,0.55)' }}>{profile.bio}</p>
          <div className="flex flex-wrap gap-2">
            {profile.skills?.map((s: string) => (
              <span key={s} className="badge-accent">{s}</span>
            ))}
          </div>
        </motion.div>
      )}

      {myAgreements.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="liquid-glass p-6 sm:p-8 mb-6">
          <h2 className="text-base font-bold mb-4">🔒 Recent Agreements</h2>
          <div className="space-y-3">
            {myAgreements.slice(0, 5).map((ag) => (
              <Link
                key={ag.commitment}
                to={`/agreements/${ag.commitment}`}
                className="block p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium font-mono text-white/70">
                      {ag.commitment.slice(0, 16)}...
                    </p>
                    <p className="text-xs text-white/30 mt-1">
                      {ag.amount} {ag.currency?.toUpperCase()}
                    </p>
                  </div>
                  <StatusBadge status={ag.status} />
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {transactions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="liquid-glass p-6 sm:p-8">
          <h2 className="text-base font-bold mb-4">📡 Recent Transactions</h2>
          <div className="space-y-2">
            {transactions.slice(-8).reverse().map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(26,19,37,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <p className="text-sm font-mono" style={{ color: 'rgba(212,190,236,0.6)' }}>
                    {tx.id.slice(0, 20)}...
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(212,190,236,0.35)' }}>{tx.type}</p>
                </div>
                <StatusBadge status={tx.status} />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {myJobs.length === 0 && myAgreements.length === 0 && !profile && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="liquid-glass p-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6" style={{ background: 'rgba(135,255,139,0.06)', border: '1px solid rgba(135,255,139,0.1)' }}>💼</div>
          <p className="mb-6 text-lg" style={{ color: 'rgba(212,190,236,0.45)' }}>No activity yet. Get started:</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn-primary text-sm">Register as Worker</Link>
            <Link to="/post-job" className="btn-secondary text-sm">Post a Job</Link>
          </div>
        </motion.div>
      )}
      </div>
    </div>
  );
};
