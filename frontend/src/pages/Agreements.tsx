import { FC, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUserStore } from '../stores/userStore';
import { apiClient } from '../lib/api';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EscrowLock } from '../components/icons';

export const Agreements: FC = () => {
  const { isAuthenticated } = useUserStore();
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAgreements = useCallback(async (silent = false) => {
    if (!isAuthenticated) return;
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.getMyAgreements();
      setAgreements(res.agreements || []);
    } catch {
      //
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadAgreements();
    const interval = setInterval(() => loadAgreements(true), 30000);
    return () => clearInterval(interval);
  }, [loadAgreements]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <EscrowLock className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Agreements</h1>
        <p className="text-white/40">Sign in to view your agreements.</p>
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold">Agreements</h1>
        <p className="text-white/40 text-sm mt-1">
          {agreements.length} agreement{agreements.length !== 1 ? 's' : ''}
        </p>
      </motion.div>

      {agreements.length === 0 ? (
        <div className="text-center py-16">
          <EscrowLock className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">No agreements yet.</p>
          <Link to="/jobs" className="text-accent text-sm hover:underline mt-2 inline-block">
            Browse jobs to get started
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {agreements.map((ag, i) => (
            <motion.div
              key={ag.commitment}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/agreements/${ag.commitment}`}
                className="block glass-hover p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm text-white/60">
                      {ag.commitment.slice(0, 20)}...
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <span className="text-accent font-semibold">
                        {ag.amount} {ag.currency?.toUpperCase()}
                      </span>
                      <span className="text-white/30">
                        {new Date(ag.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={ag.status} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
