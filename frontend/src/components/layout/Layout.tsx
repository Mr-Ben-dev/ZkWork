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
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      {pendingCount > 0 && (
        <div className="fixed top-16 left-0 right-0 z-40 bg-accent/10 border-b border-accent/20 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-accent/80">
              {pendingCount} transaction{pendingCount > 1 ? 's' : ''} pending confirmation...
            </span>
          </div>
        </div>
      )}
      <main className={`pt-16 ${pendingCount > 0 ? 'mt-10' : ''}`}>
        {children}
      </main>
    </div>
  );
};
