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
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <AnonAvatar className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-white/40">Connect your wallet and sign in to view your dashboard.</p>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
        <p className="text-white/40 text-sm font-mono">{formatAddress(walletAddress || '')}</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { icon: JobContract, label: 'My Jobs', value: myJobs.length, color: 'text-blue-400' },
          { icon: EscrowLock, label: 'Active Agreements', value: activeAgreements.length, color: 'text-purple-400' },
          { icon: ReputationStar, label: 'Jobs Completed', value: reputation?.claimedJobs ?? 0, color: 'text-amber-400' },
          { icon: AnonAvatar, label: 'Pending TXs', value: pendingCount, color: 'text-accent' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass p-5"
          >
            <stat.icon className={`w-6 h-6 ${stat.color} mb-3`} />
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-white/40 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {profile && (
        <div className="glass p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Worker Profile</h2>
          <p className="text-sm text-white/50 mb-2">{profile.bio}</p>
          <div className="flex flex-wrap gap-2">
            {profile.skills?.map((s: string) => (
              <span key={s} className="badge-glass">{s}</span>
            ))}
          </div>
        </div>
      )}

      {myAgreements.length > 0 && (
        <div className="glass p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Recent Agreements</h2>
          <div className="space-y-3">
            {myAgreements.slice(0, 5).map((ag) => (
              <Link
                key={ag.commitment}
                to={`/agreements/${ag.commitment}`}
                className="block p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
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
        </div>
      )}

      {transactions.length > 0 && (
        <div className="glass p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
          <div className="space-y-2">
            {transactions.slice(-8).reverse().map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5"
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
        </div>
      )}

      {myJobs.length === 0 && myAgreements.length === 0 && !profile && (
        <div className="text-center py-16">
          <p className="text-white/30 mb-4">No activity yet. Get started:</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn-primary text-sm">Register as Worker</Link>
            <Link to="/post-job" className="btn-secondary text-sm">Post a Job</Link>
          </div>
        </div>
      )}
    </div>
  );
};
