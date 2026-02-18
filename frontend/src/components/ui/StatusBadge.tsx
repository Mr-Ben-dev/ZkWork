import { FC } from 'react';
import { motion } from 'framer-motion';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusColors: Record<string, string> = {
  open: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  assigned: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  delivered: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  refunded: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  locked: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  released: 'bg-green-500/20 text-green-400 border-green-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export const StatusBadge: FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const colorClass = statusColors[status.toLowerCase()] || 'bg-white/10 text-white/60 border-white/20';

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass} ${className}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </motion.span>
  );
};
