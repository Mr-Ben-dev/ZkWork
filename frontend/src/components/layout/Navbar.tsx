import { FC, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useZKWorkWallet } from '../../hooks/useZKWorkWallet';
import { useUserStore } from '../../stores/userStore';
import { formatAddress } from '../../lib/aleo';
import { PrivacyShield } from '../icons';

const NAV_LINKS = [
  { to: '/jobs', label: 'Job Board' },
  { to: '/post-job', label: 'Post Job' },
  { to: '/agreements', label: 'Agreements' },
  { to: '/reputation', label: 'Reputation' },
  { to: '/dashboard', label: 'Dashboard' },
];

export const Navbar: FC = () => {
  const location = useLocation();
  const { walletAddress, connected, authenticate, disconnect } = useZKWorkWallet();
  const { isAuthenticated } = useUserStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleConnect = async () => {
    if (connected && !isAuthenticated) {
      await authenticate();
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <PrivacyShield className="w-7 h-7 text-accent group-hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.5)] transition-all" />
            <span className="text-lg font-bold tracking-tight">
              ZK<span className="text-accent">Work</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'text-accent bg-accent/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {connected && isAuthenticated && walletAddress ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs text-white/50 font-mono">
                  {formatAddress(walletAddress)}
                </span>
                <button onClick={disconnect} className="btn-secondary text-sm px-4 py-2">
                  Disconnect
                </button>
              </div>
            ) : connected ? (
              <button onClick={handleConnect} className="btn-primary text-sm px-4 py-2">
                Sign In
              </button>
            ) : (
              <WalletMultiButton className="btn-primary text-sm px-4 py-2" />
            )}

            <button
              className="md:hidden p-2 text-white/60 hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-white/5 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'text-accent bg-accent/10'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
