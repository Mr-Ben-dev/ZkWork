import { FC, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiClient } from '../lib/api';
import { useUserStore } from '../stores/userStore';
import { useJobStore } from '../stores/jobStore';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { AnimatedBackground } from '../components/ui/AnimatedBackground';
import { JobContract } from '../components/icons';

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
    } catch {
      // Silent fail
    } finally {
      if (!silent) setLoading(false);
    }
  }, [setJobs, setLoading]);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(() => loadJobs(true), 30000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  const filtered = jobs.filter((job) => {
    const matchText =
      !filter ||
      job.title.toLowerCase().includes(filter.toLowerCase()) ||
      job.skills?.some((s: string) => s.toLowerCase().includes(filter.toLowerCase()));
    const matchCurrency = currencyFilter === 'all' || job.currency === currencyFilter;
    return matchText && matchCurrency;
  });

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <JobContract className="w-5 h-5 text-accent" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold">Job Board</h1>
              </div>
              <p className="text-white/40 text-sm ml-[52px]">
                {filtered.length} job{filtered.length !== 1 ? 's' : ''} available
              </p>
            </div>
            {isAuthenticated && (
              <Link to="/post-job" className="btn-primary text-sm">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Post a Job
                </span>
              </Link>
            )}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="glass-glow p-4 mb-8 flex flex-wrap gap-3 items-center"
        >
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search by title or skill..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input-field pl-10 !bg-white/[0.03] !border-white/[0.06]"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'aleo', 'usdcx'].map((c) => (
              <button
                key={c}
                onClick={() => setCurrencyFilter(c)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  currencyFilter === c
                    ? 'bg-accent/15 text-accent border border-accent/30 shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                    : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/70'
                }`}
              >
                {c === 'all' ? 'All' : c.toUpperCase()}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-32">
            <LoadingSpinner size={40} />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-32"
          >
            <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-6">
              <JobContract className="w-10 h-10 text-white/20" />
            </div>
            <p className="text-white/40 text-lg mb-2">No jobs found</p>
            <p className="text-white/25 text-sm">Try adjusting your filters or post a new job.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((job, i) => (
              <motion.div
                key={job.commitment}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
              >
                <Link
                  to={`/jobs/${job.commitment}`}
                  className="block card-gradient p-6 h-full group hover:shadow-[0_8px_40px_rgba(0,240,255,0.06)] transition-all duration-500"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold line-clamp-2 flex-1 mr-3 group-hover:text-accent transition-colors duration-300">{job.title}</h3>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="text-sm text-white/35 line-clamp-3 mb-5 leading-relaxed">
                    {job.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {job.skills?.slice(0, 4).map((skill: string) => (
                      <span key={skill} className="badge-glass text-[10px]">{skill}</span>
                    ))}
                    {(job.skills?.length ?? 0) > 4 && (
                      <span className="badge-glass text-[10px] text-accent/60">+{job.skills!.length - 4}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                    <span className="text-accent font-semibold text-sm flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {job.budget} {job.currency?.toUpperCase()}
                    </span>
                    <span className="text-white/25 text-xs">
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
