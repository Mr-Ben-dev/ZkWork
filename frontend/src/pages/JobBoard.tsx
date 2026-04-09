import { FC, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiClient } from '../lib/api';
import { useUserStore } from '../stores/userStore';
import { useJobStore } from '../stores/jobStore';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const CURRENCY_ICONS: Record<string, string> = { aleo: '⚡', usdcx: '💵', usad: '🪙' };

export const JobBoard: FC = () => {
  const { isAuthenticated } = useUserStore();
  const { jobs, setJobs, loading, setLoading } = useJobStore();
  const [filter, setFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');

  const loadJobs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.getAvailableJobs();
      setJobs(res.jobs || []);
    } catch { /* silent */ } finally {
      if (!silent) setLoading(false);
    }
  }, [setJobs, setLoading]);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(() => loadJobs(true), 30000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  const filtered = jobs.filter((job) => {
    const matchText = !filter || job.title.toLowerCase().includes(filter.toLowerCase()) || job.skills?.some((s: string) => s.toLowerCase().includes(filter.toLowerCase()));
    const matchCurrency = currencyFilter === 'all' || job.currency === currencyFilter;
    return matchText && matchCurrency;
  });

  return (
    <div className="relative min-h-screen" style={{ background: '#0d0812' }}>
      <div className="orb orb-green w-[500px] h-[500px] -top-40 -right-48" style={{ opacity: 0.06 }} />
      <div className="orb orb-purple w-[400px] h-[400px] top-1/2 -left-32" style={{ opacity: 0.07 }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{ background: 'rgba(135,255,139,0.08)', border: '1px solid rgba(135,255,139,0.15)' }}>💼</div>
                <h1 className="text-3xl sm:text-4xl font-bold">Job Board</h1>
              </div>
              <p className="text-sm ml-[52px]" style={{ color: 'rgba(212,190,236,0.45)' }}>
                {filtered.length} private job{filtered.length !== 1 ? 's' : ''} available on-chain
              </p>
            </div>
            {isAuthenticated && (
              <Link to="/post-job" className="btn-primary text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Post a Job
              </Link>
            )}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.45 }}
          className="glass-card p-4 mb-8 flex flex-wrap gap-3 items-center"
        >
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(212,190,236,0.3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search by title or skill..." value={filter} onChange={(e) => setFilter(e.target.value)} className="input-field pl-10" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'aleo', 'usdcx', 'usad'].map((c) => (
              <button key={c} onClick={() => setCurrencyFilter(c)}
                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  currencyFilter === c
                    ? 'text-accent-dark shadow-[0_0_15px_rgba(135,255,139,0.2)]'
                    : 'hover:opacity-80'
                }`}
                style={currencyFilter === c
                  ? { background: '#87FF8B', color: '#00390c' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(212,190,236,0.5)' }
                }
              >
                {c === 'all' ? 'All' : c.toUpperCase()}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-32"><LoadingSpinner size={40} /></div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-32">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6" style={{ background: 'rgba(135,255,139,0.05)', border: '1px solid rgba(135,255,139,0.08)' }}>💼</div>
            <p className="text-lg mb-2" style={{ color: 'rgba(212,190,236,0.4)' }}>No jobs found</p>
            <p className="text-sm" style={{ color: 'rgba(212,190,236,0.25)' }}>Try adjusting your filters or post a new job.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((job, i) => (
              <motion.div key={job.commitment} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.45 }}>
                <Link to={`/jobs/${job.commitment}`} className="block glass-hover p-6 h-full group">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-base font-bold line-clamp-2 flex-1 mr-3 group-hover:text-accent transition-colors duration-300">{job.title}</h3>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="text-sm line-clamp-3 mb-5 leading-relaxed" style={{ color: 'rgba(212,190,236,0.45)' }}>{job.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {job.skills?.slice(0, 4).map((skill: string) => (
                      <span key={skill} className="px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider" style={{ background: 'rgba(135,255,139,0.06)', border: '1px solid rgba(135,255,139,0.1)', color: 'rgba(135,255,139,0.7)' }}>{skill}</span>
                    ))}
                    {(job.skills?.length ?? 0) > 4 && (
                      <span className="px-2.5 py-1 rounded-full text-[10px]" style={{ background: 'rgba(135,255,139,0.04)', color: 'rgba(135,255,139,0.5)' }}>+{job.skills!.length - 4}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="font-bold text-sm flex items-center gap-1.5" style={{ color: '#87FF8B' }}>
                      <span>{CURRENCY_ICONS[job.currency] ?? '💰'}</span>
                      {job.budget} {job.currency?.toUpperCase()}
                    </span>
                    <span className="text-xs" style={{ color: 'rgba(212,190,236,0.3)' }}>
                      {job.applicantCount ?? 0} applicant{(job.applicantCount ?? 0) !== 1 ? 's' : ''}
                    </span>
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
