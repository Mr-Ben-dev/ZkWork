import { FC } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const fade = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.65, ease: [0.25, 0.4, 0.25, 1] } }),
};

const FEATURES = [
  { icon: '🛡️', title: 'Zero-Knowledge Privacy', desc: 'Your identity never leaves your wallet. All on-chain data uses BHP256 commitments — no addresses, no amounts exposed.' },
  { icon: '🔒', title: 'Trustless Escrow', desc: 'Funds locked on-chain in Leo smart contracts. Released atomically on completion. No middlemen, no custody risk.' },
  { icon: '⭐', title: 'Private Reputation', desc: 'Build verifiable work history without revealing identity. Prove you exceed job thresholds without showing exact scores.' },
  { icon: '👤', title: 'Anonymous Profiles', desc: 'Register as a worker with skills and rates. Your profile is a private Leo record — only you control what is visible.' },
  { icon: '📜', title: 'On-Chain Agreements', desc: 'Every agreement is a cryptographically signed Leo record. Deliverables, completions, and payments are all bound on-chain.' },
  { icon: '🔏', title: 'ZK Credentials', desc: 'Prove your completed job threshold to any verifier without revealing your total count or identity. Native ZK circuits.' },
];

const STEPS = [
  { num: '01', icon: '🔗', title: 'Connect Shield Wallet', desc: 'Connect your Shield wallet with maximum privacy. Your Aleo address is never shared publicly.' },
  { num: '02', icon: '📝', title: 'Post or Apply', desc: 'Create a private job listing or browse available work. Everything stored as encrypted Leo records.' },
  { num: '03', icon: '💰', title: 'Escrow Payment', desc: 'Funds locked on-chain in ALEO, USDCx, or USAD. Trustless, atomic, instant settlement.' },
  { num: '04', icon: '🏆', title: 'Build Reputation', desc: 'Claim ZK reputation tokens. Prove your experience to anyone on-chain without revealing your identity.' },
];

const STATS = [
  { value: '15', label: 'Leo Transitions', suffix: '' },
  { value: '100', label: 'Private On-Chain', suffix: '%' },
  { value: '3', label: 'Payment Currencies', suffix: '' },
  { value: '0', label: 'Data Leaked', suffix: '' },
];

const PARTNERS = [
  'ZERO-ONE LABS', 'SHIELD PROTOCOL', 'OBSCURA CAPITAL', 'PRISM CORE', 'VAULT_XYZ', 'ALEO VENTURES',
  'ZERO-ONE LABS', 'SHIELD PROTOCOL', 'OBSCURA CAPITAL', 'PRISM CORE', 'VAULT_XYZ', 'ALEO VENTURES',
];

export const Home: FC = () => {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#0d0812' }}>
      {/* Ambient orbs */}
      <div className="orb orb-green w-[600px] h-[600px] -top-48 left-1/2 -translate-x-1/2" style={{ opacity: 0.08 }} />
      <div className="orb orb-purple w-[400px] h-[400px] top-1/3 -left-32" style={{ opacity: 0.07 }} />
      <div className="orb orb-green w-[500px] h-[500px] bottom-1/4 -right-48" style={{ opacity: 0.06 }} />

      {/* Hero */}
      <section className="relative z-10 min-h-[92vh] flex flex-col items-center justify-center text-center px-4 pt-8 pb-16" style={{ overflow: 'hidden' }}>
        <div className="absolute inset-0">
          {/* Deep space bg */}
          <div className="absolute inset-0" style={{ background: '#060408' }} />
          {/* Planet globe */}
          <div
            className="absolute left-1/2"
            style={{
              bottom: '-8%',
              width: '120vw',
              aspectRatio: '1 / 1',
              transform: 'translateX(-50%)',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at 68% 30%, rgba(0,220,190,0.55) 0%, rgba(5,130,210,0.68) 16%, rgba(6,65,155,0.83) 36%, rgba(4,28,75,0.93) 56%, rgba(2,10,35,0.99) 78%)',
              boxShadow: '0 0 260px rgba(0,140,255,0.28), 0 0 100px rgba(0,210,180,0.16)',
            }}
          />
          {/* Top fade to space */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #060408 0%, rgba(6,4,8,0.75) 18%, transparent 50%)' }} />
          {/* Bottom fade to page bg */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0d0812 0%, transparent 38%)' }} />
          {/* Side vignettes */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(6,4,8,0.6) 0%, transparent 35%, transparent 65%, rgba(6,4,8,0.6) 100%)' }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div variants={fade} initial="hidden" animate="show" custom={0}>
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] mb-10"
              style={{ background: 'rgba(135,255,139,0.08)', border: '1px solid rgba(135,255,139,0.2)', color: '#87FF8B' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ boxShadow: '0 0 6px #87FF8B' }} />
              WORK PRIVATELY. PROVE PUBLICLY.
            </span>
          </motion.div>

          <motion.h1
            variants={fade} initial="hidden" animate="show" custom={1}
            className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-8"
          >
            Work Beyond The<br />
            <span style={{ color: '#87FF8B', textShadow: '0 0 40px rgba(135,255,139,0.35)' }}>Visible Horizon</span>
          </motion.h1>

          <motion.p
            variants={fade} initial="hidden" animate="show" custom={2}
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
            style={{ color: 'rgba(212,190,236,0.7)' }}
          >
            The first zero-knowledge freelance marketplace on Aleo. Post jobs, hire talent, and get paid with total identity and payment privacy. Three currencies. Fully on-chain.
          </motion.p>

          <motion.div variants={fade} initial="hidden" animate="show" custom={3} className="flex flex-wrap justify-center gap-4">
            <Link to="/post-job" className="btn-primary text-base px-8 py-4">Post a Job</Link>
            <Link to="/jobs" className="btn-secondary text-base px-8 py-4">Browse Jobs</Link>
          </motion.div>
        </div>
      </section>

      {/* Ticker */}
      <div className="relative z-10 py-5 border-y" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(17,12,23,0.6)' }}>
        <div className="ticker-wrap">
          <div className="ticker-content">
            {PARTNERS.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-6 mx-8 text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: 'rgba(212,190,236,0.35)' }}>
                {p} <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(135,255,139,0.3)' }} />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <section className="relative z-10 py-24 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <motion.div key={s.label} variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i} className="stat-card text-center">
              <p className="text-4xl sm:text-5xl font-bold mb-2" style={{ color: '#87FF8B', textShadow: '0 0 30px rgba(135,255,139,0.3)' }}>{s.value}{s.suffix}</p>
              <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(212,190,236,0.5)' }}>{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0} className="text-center mb-16">
            <span className="badge-accent mb-6 inline-flex">Core Architecture</span>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">Privacy by <span style={{ color: '#87FF8B', textShadow: '0 0 30px rgba(135,255,139,0.3)' }}>Design</span></h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: 'rgba(212,190,236,0.6)' }}>Every feature is built around zero-knowledge proofs and private Leo records. Nothing leaks.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.5}>
                <div className="glass-hover p-7 h-full group cursor-default">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-5 transition-all duration-300 group-hover:shadow-[0_0_24px_rgba(135,255,139,0.2)]"
                    style={{ background: 'rgba(135,255,139,0.08)', border: '1px solid rgba(135,255,139,0.12)' }}
                  >{f.icon}</div>
                  <h3 className="text-base font-bold mb-2 tracking-tight">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(212,190,236,0.55)' }}>{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-24 px-4">
        <div className="section-divider mb-24" />
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <span className="badge-accent mb-6 inline-flex">Simple Flow</span>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">How It <span style={{ color: '#87FF8B', textShadow: '0 0 30px rgba(135,255,139,0.3)' }}>Works</span></h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((step, i) => (
              <motion.div key={step.num} variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i * 0.5}>
                <div className="liquid-glass p-7 text-center relative group h-full">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5 transition-all duration-300"
                    style={{ background: 'rgba(135,255,139,0.08)', border: '1px solid rgba(135,255,139,0.12)' }}
                  >{step.icon}</div>
                  <div className="text-6xl font-black absolute top-4 right-5 select-none" style={{ color: 'rgba(135,255,139,0.06)' }}>{step.num}</div>
                  <h3 className="text-sm font-bold mb-2 uppercase tracking-wider">{step.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(212,190,236,0.55)' }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Video */}
      <section className="relative z-10 py-24 px-4">
        <div className="section-divider mb-24" />
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">See ZKWork in <span style={{ color: '#87FF8B', textShadow: '0 0 30px rgba(135,255,139,0.3)' }}>Action</span></h2>
            <p style={{ color: 'rgba(212,190,236,0.5)' }}>Watch the full end-to-end flow on Aleo Testnet.</p>
          </motion.div>
          <motion.div
            variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="relative rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(135,255,139,0.1)', boxShadow: '0 0 60px rgba(135,255,139,0.04)' }}
          >
            <div className="aspect-video flex flex-col items-center justify-center gap-4" style={{ background: 'linear-gradient(135deg, #0d0812 0%, #110c17 50%, #1a1325 100%)' }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl" style={{ background: 'rgba(135,255,139,0.08)', border: '2px solid rgba(135,255,139,0.2)', boxShadow: '0 0 40px rgba(135,255,139,0.1)' }}>▶</div>
              <p className="text-sm font-medium" style={{ color: 'rgba(212,190,236,0.5)' }}>Demo video coming soon</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-4">
        <div className="section-divider mb-24" />
        <div className="max-w-3xl mx-auto">
          <motion.div
            variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="liquid-glass p-12 sm:p-16 text-center relative overflow-hidden"
          >
            <div className="orb orb-green w-64 h-64 -top-20 left-1/2 -translate-x-1/2" style={{ opacity: 0.08 }} />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-8" style={{ background: 'rgba(135,255,139,0.1)', border: '1px solid rgba(135,255,139,0.2)' }}>🚀</div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-5">
                Ready to work <span style={{ color: '#87FF8B', textShadow: '0 0 30px rgba(135,255,139,0.3)' }}>anonymously?</span>
              </h2>
              <p className="mb-10 max-w-lg mx-auto leading-relaxed" style={{ color: 'rgba(212,190,236,0.6)' }}>
                Connect your Shield wallet, register your skills, and start earning  all while keeping your identity completely private on Aleo.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/register" className="btn-primary px-8 py-4 text-base">Get Started Free</Link>
                <Link to="/jobs" className="btn-secondary px-8 py-4 text-base">Explore Jobs</Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(17,12,23,0.8)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="text-lg font-black uppercase tracking-tight mb-1" style={{ color: '#87FF8B' }}>ZKWORK</div>
            <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: 'rgba(212,190,236,0.35)' }}> 2026 ZKWork. Secured on Aleo Testnet.</p>
          </div>
          <div className="flex gap-10 text-[10px] uppercase tracking-widest">
            <div className="flex flex-col gap-3">
              <span className="font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>Platform</span>
              <a href="https://explorer.aleo.org" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-accent" style={{ color: 'rgba(212,190,236,0.5)' }}>Aleo Explorer</a>
              <a href="https://github.com/Mr-Ben-dev/ZkWork" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-accent" style={{ color: 'rgba(212,190,236,0.5)' }}>GitHub</a>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(212,190,236,0.35)' }}>Network Status</span>
            <span className="text-[10px] font-bold flex items-center gap-2" style={{ color: '#87FF8B' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#87FF8B', boxShadow: '0 0 8px #87FF8B' }} />
              Testnet Active
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
