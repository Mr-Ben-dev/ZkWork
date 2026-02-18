import { FC, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiClient } from '../lib/api';
import { useUserStore } from '../stores/userStore';
import { useJobStore } from '../stores/jobStore';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Job Board</h1>
            <p className="text-white/40 text-sm mt-1">
              {filtered.length} job{filtered.length !== 1 ? 's' : ''} available
            </p>
          </div>
          {isAuthenticated && (
            <Link to="/post-job" className="btn-primary text-sm">
              Post a Job
            </Link>
          )}
        </div>
      </motion.div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by title or skill..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input-field max-w-xs"
        />
        <select
          value={currencyFilter}
          onChange={(e) => setCurrencyFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All Currencies</option>
          <option value="aleo">ALEO</option>
          <option value="usdcx">USDCx</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size={40} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <JobContract className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">No jobs found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((job, i) => (
            <motion.div
              key={job.commitment}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={`/jobs/${job.commitment}`}
                className="block glass-hover p-5 h-full"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold line-clamp-2 flex-1 mr-2">{job.title}</h3>
                  <StatusBadge status={job.status} />
                </div>
                <p className="text-sm text-white/40 line-clamp-3 mb-4">
                  {job.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {job.skills?.slice(0, 4).map((skill: string) => (
                    <span key={skill} className="badge-glass text-[10px]">{skill}</span>
                  ))}
                  {(job.skills?.length ?? 0) > 4 && (
                    <span className="badge-glass text-[10px]">+{job.skills!.length - 4}</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-accent font-semibold">
                    {job.budget} {job.currency?.toUpperCase()}
                  </span>
                  <span className="text-white/30 text-xs">
                    {job.applicantCount ?? 0} applicant{(job.applicantCount ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
