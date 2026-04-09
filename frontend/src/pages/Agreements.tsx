import { FC, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUserStore } from '../stores/userStore';
import { apiClient } from '../lib/api';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';


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
      <div className="relative min-h-screen flex items-center justify-center" style={{ background: '#0d0812' }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6" style={{ background: 'rgba(135,255,139,0.06)', border: '1px solid rgba(135,255,139,0.1)' }}>🔒</div>
          <h1 className="text-2xl font-bold mb-2">Agreements</h1>
          <p style={{ color: 'rgba(212,190,236,0.45)' }}>Sign in to view your agreements.</p>
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
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{ background: 'rgba(135,255,139,0.08)', border: '1px solid rgba(135,255,139,0.15)' }}>🔒</div>
          <div>
            <h1 className="text-3xl font-bold">Agreements</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(212,190,236,0.45)' }}>
              {agreements.length} agreement{agreements.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </motion.div>

      {agreements.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="liquid-glass p-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6" style={{ background: 'rgba(135,255,139,0.06)', border: '1px solid rgba(135,255,139,0.1)' }}>🔒</div>
          <p className="text-lg mb-4" style={{ color: 'rgba(212,190,236,0.45)' }}>No agreements yet.</p>
          <Link to="/jobs" className="btn-primary text-sm">
            Browse jobs to get started
          </Link>
        </motion.div>
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
                    <p className="font-mono text-sm" style={{ color: 'rgba(212,190,236,0.6)' }}>
                      {ag.commitment.slice(0, 20)}...
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <span className="font-bold" style={{ color: '#87FF8B' }}>
                        {ag.amount} {ag.currency?.toUpperCase()}
                      </span>
                      <span style={{ color: 'rgba(212,190,236,0.3)' }}>
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
    </div>
  );
};
