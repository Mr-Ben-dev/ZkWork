import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useZKWorkWallet } from '../hooks/useZKWorkWallet';
import { useUserStore } from '../stores/userStore';
import { apiClient } from '../lib/api';
import { formatAddress } from '../lib/aleo';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';


export const Profile: FC = () => {
  const { walletAddress, connected } = useZKWorkWallet();
  const { isAuthenticated } = useUserStore();

  const [profile, setProfile] = useState<any>(null);
  const [reputation, setReputation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [profileRes, repRes] = await Promise.allSettled([
        apiClient.getWorkerProfile(),
        apiClient.getMyReputation(),
      ]);
      if (profileRes.status === 'fulfilled') setProfile((profileRes.value as any).worker);
      if (repRes.status === 'fulfilled') setReputation((repRes.value as any).reputation);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (!connected || !isAuthenticated) {
    return (
      <div className="relative min-h-screen flex items-center justify-center" style={{ background: '#0d0812' }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-4xl" style={{ background: 'rgba(135,255,139,0.06)', border: '1px solid rgba(135,255,139,0.1)' }}>👤</div>
          <h1 className="text-2xl font-bold mb-2">Profile</h1>
          <p style={{ color: 'rgba(212,190,236,0.45)' }}>Connect and sign in to view your profile.</p>
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
        <div className="liquid-glass p-8 sm:p-10 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'rgba(135,255,139,0.08)', border: '1px solid rgba(135,255,139,0.15)' }}>👤</div>
            <div>
              <h1 className="text-2xl font-bold">Anonymous Profile</h1>
              <p className="text-sm font-mono" style={{ color: 'rgba(212,190,236,0.35)' }}>
                {formatAddress(walletAddress || '')}
              </p>
            </div>
          </div>

          {profile ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl" style={{ background: 'rgba(26,19,37,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(212,190,236,0.45)' }}>Bio</span>
                <p className="mt-1" style={{ color: 'rgba(212,190,236,0.7)' }}>{profile.bio}</p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(212,190,236,0.45)' }}>Skills</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.skills?.map((s: string) => (
                    <span key={s} className="badge-accent">{s}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl" style={{ background: 'rgba(26,19,37,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(212,190,236,0.45)' }}>Rate</span>
                  <p className="text-accent font-semibold mt-1">
                    {profile.ratePerHour} {profile.currency?.toUpperCase()}/hr
                  </p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'rgba(26,19,37,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(212,190,236,0.45)' }}>Registered</span>
                  <p className="mt-1" style={{ color: 'rgba(212,190,236,0.7)' }}>
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'rgba(212,190,236,0.45)' }}>No worker profile registered.</p>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">⭐</span>
            <h2 className="text-lg font-semibold">Reputation</h2>
          </div>
          {reputation && reputation.claimedJobs > 0 ? (
            <div className="flex items-center gap-4 p-3 rounded-xl" style={{ background: 'rgba(26,19,37,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(135,255,139,0.1)', border: '1px solid rgba(135,255,139,0.2)' }}>
                <span className="text-2xl font-bold text-accent">{reputation.claimedJobs}</span>
              </div>
              <div>
                <p className="font-medium">Jobs Completed</p>
                <p className="text-xs" style={{ color: 'rgba(212,190,236,0.4)' }}>
                  Last claim: {new Date(reputation.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'rgba(212,190,236,0.45)' }}>No reputation claimed yet.</p>
          )}
        </motion.div>
      </motion.div>
      </div>
    </div>
  );
};
