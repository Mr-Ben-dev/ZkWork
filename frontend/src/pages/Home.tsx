import { FC, ReactNode, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiClient } from '../lib/api';

const IconShield = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconLock = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);
const IconStar = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconUser = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconFile = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IconKey = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
);
const IconLink = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
);
const IconEdit = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconDollar = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="16"/>
    <path d="M14.5 10H10.5a2 2 0 000 4h3a2 2 0 010 4H9"/>
  </svg>
);
const IconAward = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="6"/>
    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
  </svg>
);
const IconZap = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const fade = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.65, ease: [0.25, 0.4, 0.25, 1] } }),
};

const FEATURES: { icon: ReactNode; title: string; desc: string }[] = [
  { icon: <IconShield />, title: 'Zero-Knowledge Privacy', desc: 'Your identity never leaves your wallet. All on-chain data uses BHP256 commitments — no addresses, no amounts exposed.' },
  { icon: <IconLock />, title: 'Trustless Escrow', desc: 'Funds locked on-chain in Leo smart contracts. Released atomically on completion. No middlemen, no custody risk.' },
  { icon: <IconStar />, title: 'Private Reputation', desc: 'Build verifiable work history without revealing identity. Prove you exceed job thresholds without showing exact scores.' },
  { icon: <IconUser />, title: 'Anonymous Profiles', desc: 'Register as a worker with skills and rates. Your profile is a private Leo record — only you control what is visible.' },
  { icon: <IconFile />, title: 'On-Chain Agreements', desc: 'Every agreement is a cryptographically signed Leo record. Deliverables, completions, and payments are all bound on-chain.' },
  { icon: <IconKey />, title: 'ZK Credentials', desc: 'Prove your completed job threshold to any verifier without revealing your total count or identity. Native ZK circuits.' },
];

const STEPS: { num: string; icon: ReactNode; title: string; desc: string }[] = [
  { num: '01', icon: <IconLink />, title: 'Connect Shield Wallet', desc: 'Connect your Shield wallet with maximum privacy. Your Aleo address is never shared publicly.' },
  { num: '02', icon: <IconEdit />, title: 'Post or Apply', desc: 'Create a private job listing or browse available work. Everything stored as encrypted Leo records.' },
  { num: '03', icon: <IconDollar />, title: 'Escrow Payment', desc: 'Funds locked on-chain in ALEO, USDCx, or USAD. Trustless, atomic, instant settlement.' },
  { num: '04', icon: <IconAward />, title: 'Build Reputation', desc: 'Claim ZK reputation tokens. Prove your experience to anyone on-chain without revealing your identity.' },
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
  const [stats, setStats] = useState<{ jobs?: number; openJobs?: number; workers?: number; agreements?: number; activeAgreements?: number }>({});

  useEffect(() => {
    apiClient.getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#0d0812' }}>
      {/* Ambient orbs */}
      <div className="orb orb-green w-[600px] h-[600px] -top-48 left-1/2 -translate-x-1/2" style={{ opacity: 0.08 }} />
      <div className="orb orb-purple w-[400px] h-[400px] top-1/3 -left-32" style={{ opacity: 0.07 }} />
      <div className="orb orb-green w-[500px] h-[500px] bottom-1/4 -right-48" style={{ opacity: 0.06 }} />

      {/* Hero */}
      <section className="relative z-10 min-h-[92vh] flex flex-col items-center justify-center text-center px-4 pt-8 pb-16" style={{ overflow: 'hidden' }}>
        <div className="absolute inset-0">
          {/* Deep space bg fallback */}
          <div className="absolute inset-0" style={{ background: '#060408' }} />
          {/* Background video */}
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.72 }}
          >
            <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260309_042944_4a2205b7-b061-490a-852b-92d9e9955ce9.mp4" type="video/mp4" />
          </video>
          {/* Top fade to space */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #060408 0%, rgba(6,4,8,0.55) 15%, transparent 45%)' }} />
          {/* Bottom fade to page bg */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0d0812 0%, rgba(13,8,18,0.7) 20%, transparent 50%)' }} />
          {/* Side vignettes */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(6,4,8,0.55) 0%, transparent 30%, transparent 70%, rgba(6,4,8,0.55) 100%)' }} />
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
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:shadow-[0_0_24px_rgba(135,255,139,0.2)] text-accent"
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
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-all duration-300 text-accent"
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

      {/* ZK Stack */}
      <section className="relative z-10 py-24 px-4">
        <div className="section-divider mb-24" />
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16">
            <span className="badge-accent mb-6 inline-flex">Live Protocol</span>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">The ZK <span style={{ color: '#87FF8B', textShadow: '0 0 30px rgba(135,255,139,0.3)' }}>Stack</span></h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: 'rgba(212,190,236,0.6)' }}>Real on-chain activity. Real privacy. Fully verifiable smart contracts.</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Leo Terminal */}
            <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0}>
              <div className="liquid-glass rounded-2xl overflow-hidden h-full">
                <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'rgba(135,255,139,0.08)', background: 'rgba(0,0,0,0.35)' }}>
                  <span className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                  <span className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                  <span className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                  <span className="ml-3 text-[11px] font-mono" style={{ color: 'rgba(212,190,236,0.4)' }}>zkwork.leo  ·  Leo v2.1  ·  Aleo Testnet</span>
                </div>
                <pre className="p-6 text-[11px] sm:text-xs leading-7 overflow-x-auto font-mono select-none">
                  <code>
                    <span style={{ color: 'rgba(155,136,184,0.55)' }}>{'// post_job — creates a private Job record'}</span>{' \n'}
                    <span style={{ color: '#87FF8B' }}>{'transition'}</span>{' '}<span style={{ color: '#60d9ff' }}>{'post_job'}</span>{'(\n'}
                    {'    '}<span style={{ color: '#a78bfa' }}>{'desc_hash'}</span>{': '}<span style={{ color: '#fbbf24' }}>{'field'}</span>{',\n'}
                    {'    '}<span style={{ color: '#a78bfa' }}>{'budget'}</span>{': '}<span style={{ color: '#fbbf24' }}>{'u64'}</span>{',\n'}
                    {'    '}<span style={{ color: '#a78bfa' }}>{'currency'}</span>{': '}<span style={{ color: '#fbbf24' }}>{'u8'}</span>{',\n'}
                    {'    '}<span style={{ color: '#a78bfa' }}>{'deadline'}</span>{': '}<span style={{ color: '#fbbf24' }}>{'u64'}</span>{',\n'}
                    {'    '}<span style={{ color: '#a78bfa' }}>{'salt'}</span>{': '}<span style={{ color: '#fbbf24' }}>{'field'}</span>{',\n'}
                    {') -> '}<span style={{ color: '#fbbf24' }}>{'Job'}</span>{' {\n'}
                    {'    '}<span style={{ color: '#87FF8B' }}>{'let'}</span>{' commitment: '}<span style={{ color: '#fbbf24' }}>{'field'}</span>{' =\n'}
                    {'        '}<span style={{ color: '#60d9ff' }}>{'BHP256'}</span>{'::'}<span style={{ color: '#60d9ff' }}>{'hash_to_field'}</span>{'(\n'}
                    {'            desc_hash + salt\n'}
                    {'        );\n'}
                    {'\n'}
                    {'    '}<span style={{ color: '#87FF8B' }}>{'return'}</span>{' Job {\n'}
                    {'        owner: '}<span style={{ color: '#60d9ff' }}>{'self.caller'}</span>{',\n'}
                    {'        commitment,\n'}
                    {'        budget,\n'}
                    {'        status: '}<span style={{ color: '#fbbf24' }}>{'0u8'}</span>{',\n'}
                    {'    };\n'}
                    {'}'}
                  </code>
                </pre>
              </div>
            </motion.div>

            {/* Right column */}
            <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1} className="flex flex-col gap-5">
              {/* Live Stats */}
              <div className="liquid-glass rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#87FF8B', boxShadow: '0 0 8px #87FF8B' }} />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: '#87FF8B' }}>Live Network · Aleo Testnet</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { label: 'Jobs Posted', value: stats.jobs, icon: <IconFile /> },
                    { label: 'Registered Workers', value: stats.workers, icon: <IconUser /> },
                    { label: 'Agreements', value: stats.agreements, icon: <IconEdit /> },
                    { label: 'Active Escrows', value: stats.activeAgreements, icon: <IconLock /> },
                  ] as { label: string; value: number | undefined; icon: ReactNode }[]).map((item) => (
                    <div key={item.label} className="p-4 rounded-xl" style={{ background: 'rgba(135,255,139,0.04)', border: '1px solid rgba(135,255,139,0.08)' }}>
                      <div className="text-accent mb-2">{item.icon}</div>
                      <div className="text-2xl font-black mb-0.5" style={{ color: '#87FF8B', textShadow: '0 0 20px rgba(135,255,139,0.2)' }}>
                        {item.value !== undefined ? item.value : '—'}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(212,190,236,0.4)' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security guarantees */}
              <div className="liquid-glass rounded-2xl p-6 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-4" style={{ color: 'rgba(212,190,236,0.35)' }}>Security Guarantees</p>
                {[
                  { label: 'Commitment Scheme', value: 'BHP256' },
                  { label: 'Proof System', value: 'ZK-SNARK' },
                  { label: 'Smart Contract', value: 'Leo v2.1' },
                  { label: 'Network', value: 'Aleo Testnet' },
                  { label: 'Identity Leaked', value: 'ZERO' },
                ].map((item, idx, arr) => (
                  <div key={item.label} className="flex items-center justify-between py-2.5" style={idx < arr.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}>
                    <span className="text-xs" style={{ color: 'rgba(212,190,236,0.5)' }}>{item.label}</span>
                    <span className="text-xs font-bold font-mono" style={{ color: item.value === 'ZERO' ? '#87FF8B' : 'rgba(212,190,236,0.85)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ZK Proof Lifecycle */}
          <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} custom={2}>
            <div className="liquid-glass rounded-2xl p-8">
              <p className="text-center text-[10px] font-bold uppercase tracking-[0.3em] mb-8" style={{ color: 'rgba(212,190,236,0.3)' }}>ZK Proof Lifecycle</p>
              <div className="flex items-start justify-center gap-0 flex-wrap">
                {[
                  { step: '01', label: 'Commit', desc: 'BHP256 hashes job data on-chain without revealing content' },
                  { step: '02', label: 'Prove', desc: 'Leo generates a SNARK proof of valid state transition' },
                  { step: '03', label: 'Verify', desc: 'Validators confirm proof without seeing private inputs' },
                  { step: '04', label: 'Release', desc: 'Escrow releases atomically on verified completion' },
                ].map((item, i) => (
                  <div key={item.step} className="flex items-center">
                    <div className="flex flex-col items-center text-center w-[112px] sm:w-[130px]">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black mb-3"
                        style={{ background: 'rgba(135,255,139,0.1)', border: '1px solid rgba(135,255,139,0.2)', color: '#87FF8B' }}
                      >{item.step}</div>
                      <span className="text-sm font-bold mb-1">{item.label}</span>
                      <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(212,190,236,0.45)' }}>{item.desc}</p>
                    </div>
                    {i < 3 && (
                      <div className="hidden sm:flex items-center pb-8 mx-1">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(135,255,139,0.3)' }}>
                          <path d="M5 12h14M13 6l6 6-6 6"/>
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8" style={{ background: 'rgba(135,255,139,0.1)', border: '1px solid rgba(135,255,139,0.2)', color: '#87FF8B' }}><IconZap /></div>
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
