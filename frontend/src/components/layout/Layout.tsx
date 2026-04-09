import { FC, ReactNode } from 'react';
import { Navbar } from './Navbar';
import { usePendingTxStore } from '../../stores/pendingTxStore';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  const { transactions } = usePendingTxStore();
  const pendingCount = transactions.filter((t) => t.status === 'pending').length;

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: '#0d0812' }}>
      <Navbar />
      {pendingCount > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-[900px] rounded-full px-5 py-2 flex items-center gap-2 text-xs"
          style={{
            background: 'rgba(135,255,139,0.08)',
            border: '1px solid rgba(135,255,139,0.2)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ boxShadow: '0 0 8px #87FF8B' }} />
          <span className="text-accent font-semibold">
            {pendingCount} transaction{pendingCount > 1 ? 's' : ''} pending on-chain...
          </span>
        </div>
      )}
      <main className="pt-24">
        {children}
      </main>
    </div>
  );
};
