import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useZKWorkWallet } from '../hooks/useZKWorkWallet';
import { useUserStore } from '../stores/userStore';
import { apiClient } from '../lib/api';
import { formatAddress } from '../lib/aleo';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { AnonAvatar, ReputationStar } from '../components/icons';

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
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <AnonAvatar className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Profile</h1>
        <p className="text-white/40">Connect and sign in to view your profile.</p>
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
    <div className="max-w-3xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="glass p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
              <AnonAvatar className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Anonymous Profile</h1>
              <p className="text-sm font-mono text-white/30">
                {formatAddress(walletAddress || '')}
              </p>
            </div>
          </div>

          {profile ? (
            <div className="space-y-4">
              <div>
                <span className="text-xs text-white/40 uppercase tracking-wider">Bio</span>
                <p className="text-white/70 mt-1">{profile.bio}</p>
              </div>
              <div>
                <span className="text-xs text-white/40 uppercase tracking-wider">Skills</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.skills?.map((s: string) => (
                    <span key={s} className="badge-glass">{s}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-white/40 uppercase tracking-wider">Rate</span>
                  <p className="text-accent font-semibold mt-1">
                    {profile.ratePerHour} {profile.currency?.toUpperCase()}/hr
                  </p>
                </div>
                <div>
                  <span className="text-xs text-white/40 uppercase tracking-wider">Registered</span>
                  <p className="text-white/70 mt-1">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-white/40">No worker profile registered.</p>
          )}
        </div>

        <div className="glass p-6">
          <div className="flex items-center gap-2 mb-4">
            <ReputationStar className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Reputation</h2>
          </div>
          {reputation && reputation.claimedJobs > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-accent">{reputation.claimedJobs}</span>
              </div>
              <div>
                <p className="font-medium">Jobs Completed</p>
                <p className="text-xs text-white/40">
                  Last claim: {new Date(reputation.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-white/40 text-sm">No reputation claimed yet.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};
