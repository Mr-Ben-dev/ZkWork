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
import { AnimatedBackground } from '../components/ui/AnimatedBackground';
import { AnonAvatar, JobContract, EscrowLock, ReputationStar } from '../components/icons';

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
      <div className="relative min-h-[70vh] flex items-center justify-center">
        <AnimatedBackground />
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-6">
            <AnonAvatar className="w-10 h-10 text-white/20" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Dashboard</h1>
          <p className="text-white/40">Connect your wallet and sign in to view your dashboard.</p>
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
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-10">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <AnonAvatar className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Dashboard</h1>
            <p className="text-white/40 text-sm font-mono mt-1">{formatAddress(walletAddress || '')}</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {[
          { icon: JobContract, label: 'My Jobs', value: myJobs.length, gradient: 'from-blue-500/10 to-blue-600/5', glow: 'rgba(59,130,246,0.08)' },
          { icon: EscrowLock, label: 'Active Agreements', value: activeAgreements.length, gradient: 'from-purple-500/10 to-purple-600/5', glow: 'rgba(168,85,247,0.08)' },
          { icon: ReputationStar, label: 'Jobs Completed', value: reputation?.claimedJobs ?? 0, gradient: 'from-amber-500/10 to-amber-600/5', glow: 'rgba(245,158,11,0.08)' },
          { icon: AnonAvatar, label: 'Pending TXs', value: pendingCount, gradient: 'from-cyan-500/10 to-cyan-600/5', glow: 'rgba(0,240,255,0.08)' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="stat-card group hover:shadow-lg transition-all duration-500"
            style={{ boxShadow: `0 0 30px ${stat.glow}` }}
          >
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="relative z-10">
              <stat.icon className="w-6 h-6 text-accent mb-3" />
              <p className="text-3xl font-bold mb-1">{stat.value}</p>
              <p className="text-xs text-white/40">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {profile && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-glow p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AnonAvatar className="w-5 h-5 text-accent" />
            Worker Profile
          </h2>
          <p className="text-sm text-white/50 mb-3 leading-relaxed">{profile.bio}</p>
          <div className="flex flex-wrap gap-2">
            {profile.skills?.map((s: string) => (
              <span key={s} className="badge-accent">{s}</span>
            ))}
          </div>
        </motion.div>
      )}

      {myAgreements.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-glow p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <EscrowLock className="w-5 h-5 text-accent" />
            Recent Agreements
          </h2>
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
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-glow p-6 sm:p-8">
          <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
          <div className="space-y-2">
            {transactions.slice(-8).reverse().map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.04]"
              >
                <div>
                  <p className="text-sm font-mono text-white/60">
                    {tx.id.slice(0, 20)}...
                  </p>
                  <p className="text-xs text-white/30">{tx.type}</p>
                </div>
                <StatusBadge status={tx.status} />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {myJobs.length === 0 && myAgreements.length === 0 && !profile && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-glow p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <JobContract className="w-8 h-8 text-accent" />
          </div>
          <p className="text-white/40 mb-6 text-lg">No activity yet. Get started:</p>
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
