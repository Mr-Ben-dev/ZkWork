import { FC, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useZKWorkWallet } from '../../hooks/useZKWorkWallet';
import { useUserStore } from '../../stores/userStore';
import { formatAddress } from '../../lib/aleo';

const NAV_LINKS = [
  { to: '/jobs', label: 'Job Board' },
  { to: '/post-job', label: 'Post Job' },
  { to: '/agreements', label: 'Agreements' },
  { to: '/reputation', label: 'Reputation' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/profile', label: 'Profile' },
];

export const Navbar: FC = () => {
  const location = useLocation();
  const { walletAddress, connected, authenticate, disconnect } = useZKWorkWallet();
  const { isAuthenticated } = useUserStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleConnect = async () => {
    if (connected && !isAuthenticated) await authenticate();
  };

  return (
    <>
      {/* Floating pill navbar */}
      <nav
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between px-5 py-2.5 w-[calc(100%-2rem)] max-w-[900px]"
        style={{
          background: 'rgba(31,25,37,0.55)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '9999px',
          boxShadow: '0 0 32px rgba(135,255,139,0.04), 0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-accent-dark text-xs font-black"
            style={{ background: '#87FF8B', boxShadow: '0 0 12px rgba(135,255,139,0.4)' }}
          >
            â¬¡
          </div>
          <span className="text-sm font-bold tracking-tight uppercase text-white group-hover:text-accent transition-colors">
            ZKWork
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-all duration-200 ${
                  active
                    ? 'text-accent-dark bg-accent'
                    : 'text-white/55 hover:text-white hover:bg-white/[0.06]'
                }`}
                style={active ? { boxShadow: '0 0 12px rgba(135,255,139,0.3)' } : {}}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Wallet button */}
        <div className="flex items-center gap-2 shrink-0">
          {connected && isAuthenticated && walletAddress ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[11px] text-white/40 font-mono tracking-wider">
                {formatAddress(walletAddress)}
              </span>
              <button
                onClick={disconnect}
                className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide text-white/70 border border-white/10 hover:border-danger/40 hover:text-danger transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                Disconnect
              </button>
            </div>
          ) : connected ? (
            <button
              onClick={handleConnect}
              className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider text-accent-dark bg-accent hover:shadow-[0_0_20px_rgba(135,255,139,0.4)] transition-all duration-200 active:scale-95"
            >
              Sign In
            </button>
          ) : (
            <WalletMultiButton
              className="!px-4 !py-1.5 !rounded-full !text-xs !font-black !uppercase !tracking-wider !text-accent-dark !bg-accent hover:!shadow-[0_0_20px_rgba(135,255,139,0.4)] !transition-all !duration-200 !active:scale-95 !border-0"
            />
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 text-white/50 hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed top-20 left-4 right-4 z-40 rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(17,12,23,0.95)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
            }}
          >
            <div className="p-4 flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const active = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold uppercase tracking-wide transition-all ${
                      active
                        ? 'text-accent-dark bg-accent'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
