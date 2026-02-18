import { FC } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { VideoPlayer } from '../components/ui/VideoPlayer';
import { AnimatedBackground } from '../components/ui/AnimatedBackground';
import { PrivacyShield, AnonAvatar, EscrowLock, ZKBadge, ReputationStar, JobContract } from '../components/icons';

const MUX_URL = import.meta.env.VITE_MUX_STREAM_URL || 'https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8';

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.15 } } },
  item: {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.4, 0.25, 1] } },
  },
};

const FEATURES = [
  { icon: PrivacyShield, title: 'Zero-Knowledge Privacy', desc: 'Your identity never leaves your wallet. All on-chain data uses BHP256 commitments — no addresses, no amounts exposed.', gradient: 'from-cyan-500/20 to-blue-500/20' },
  { icon: EscrowLock, title: 'Trustless Escrow', desc: 'Funds are locked on-chain. Released atomically on completion, or automatically refunded after timeout. No middlemen.', gradient: 'from-blue-500/20 to-purple-500/20' },
  { icon: ReputationStar, title: 'Private Reputation', desc: 'Build verifiable work history without revealing your identity. Prove you exceed thresholds without showing exact scores.', gradient: 'from-purple-500/20 to-pink-500/20' },
  { icon: AnonAvatar, title: 'Anonymous Profiles', desc: 'Register as a worker with skills and rates. Your profile is a private record — only you control who sees what.', gradient: 'from-pink-500/20 to-orange-500/20' },
  { icon: JobContract, title: 'On-Chain Agreements', desc: 'Every agreement is a Leo record. Deliverables, completions, and payments are cryptographically bound.', gradient: 'from-orange-500/20 to-yellow-500/20' },
  { icon: ZKBadge, title: 'ZK Credentials', desc: 'Prove your threshold of completed jobs to any verifier without revealing your total count or identity.', gradient: 'from-yellow-500/20 to-cyan-500/20' },
];

const STEPS = [
  { num: '01', title: 'Connect Wallet', desc: 'Use Shield wallet for maximum privacy. Your address stays hidden.', icon: PrivacyShield },
  { num: '02', title: 'Post or Apply', desc: 'Create a job or browse available work. All stored as private records.', icon: JobContract },
  { num: '03', title: 'Escrow Payment', desc: 'Funds locked on-chain. Trustless, atomic, no middlemen needed.', icon: EscrowLock },
  { num: '04', title: 'Build Reputation', desc: 'Claim ZK reputation. Prove experience without revealing identity.', icon: ReputationStar },
];

const STATS = [
  { value: '14', label: 'Smart Contract Transitions', suffix: '' },
  { value: '100', label: 'Privacy Preserved', suffix: '%' },
  { value: '0', label: 'Data Leaked', suffix: '' },
  { value: '2', label: 'Payment Currencies', suffix: '' },
];

export const Home: FC = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground variant="hero" />

      {/* ───── Hero Section ───── */}
      <section className="relative z-10">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 right-0" style={{ height: '110vh' }}>
            <VideoPlayer src={MUX_URL} className="w-full h-full object-cover opacity-40" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80" />
          <div className="absolute bottom-0 left-0 right-0 h-[40vh] bg-gradient-to-t from-black to-transparent" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 sm:pt-44 pb-32">
          <motion.div variants={stagger.container} initial="hidden" animate="show">
            <motion.div variants={stagger.item} className="flex flex-wrap gap-3 mb-10">
              {[{ icon: PrivacyShield, text: 'Built on Aleo' }, { icon: EscrowLock, text: 'Trustless Escrow' }, { icon: ZKBadge, text: 'ZK Reputation' }].map((b) => (
                <span key={b.text} className="badge-accent"><b.icon className="w-3.5 h-3.5" />{b.text}</span>
              ))}
            </motion.div>
            <motion.h1 variants={stagger.item} className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-8">
              Work Without<br /><span className="text-accent text-glow">Exposure.</span>
            </motion.h1>
            <motion.p variants={stagger.item} className="text-lg sm:text-xl text-white/50 max-w-2xl mb-12 leading-relaxed">
              The first privacy-preserving freelance marketplace on Aleo. Post jobs, hire talent, escrow payments, and build reputation — all without revealing your identity.
            </motion.p>
            <motion.div variants={stagger.item} className="flex flex-wrap gap-4">
              <Link to="/jobs" className="btn-primary text-base px-8 py-4 text-lg">Browse Jobs</Link>
              <Link to="/register" className="btn-secondary text-base px-8 py-4 text-lg">Register as Worker</Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ───── Stats Bar ───── */}
      <section className="relative z-10 border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/[0.06]">
            {STATS.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }} className="py-10 sm:py-14 px-6 text-center">
                <p className="text-3xl sm:text-5xl font-bold text-accent text-glow mb-2">{s.value}{s.suffix}</p>
                <p className="text-xs sm:text-sm text-white/40 uppercase tracking-wider">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Privacy by Design ───── */}
      <section className="relative z-10 py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-20">
            <span className="badge-accent mb-6 inline-flex"><PrivacyShield className="w-3.5 h-3.5" />Core Architecture</span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">Privacy by{' '}<span className="text-accent text-glow">Design</span></h2>
            <p className="text-white/40 max-w-2xl mx-auto text-lg leading-relaxed">Every feature is built around zero-knowledge proofs and private records. Nothing leaks. Nothing is stored publicly.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.6 }} className="card-gradient p-6 sm:p-8 group cursor-default">
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 group-hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-all duration-500">
                    <f.icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{f.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed group-hover:text-white/60 transition-colors duration-500">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── How It Works ───── */}
      <section className="relative z-10 py-24 sm:py-32">
        <div className="section-divider mb-24" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-20">
            <span className="badge-accent mb-6 inline-flex"><JobContract className="w-3.5 h-3.5" />Simple Flow</span>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">How It{' '}<span className="text-accent text-glow">Works</span></h2>
            <p className="text-white/40 max-w-xl mx-auto text-lg">Four steps to privacy-preserving freelance work.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <motion.div key={step.num} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.6 }} className="relative">
                {i < STEPS.length - 1 && <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-accent/20 to-transparent" />}
                <div className="glass-glow p-6 sm:p-8 text-center relative overflow-hidden group">
                  <span className="text-5xl font-bold text-accent/10 absolute top-4 right-4 select-none group-hover:text-accent/20 transition-colors duration-500">{step.num}</span>
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-accent/20 group-hover:shadow-[0_0_25px_rgba(0,240,255,0.15)] transition-all duration-500">
                    <step.icon className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Video Showcase ───── */}
      <section className="relative z-10 py-24 sm:py-32">
        <div className="section-divider mb-24" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">See It in <span className="text-accent text-glow">Action</span></h2>
            <p className="text-white/40 max-w-lg mx-auto">Watch how ZKWork enables private, trustless freelance agreements on Aleo.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_0_60px_rgba(0,240,255,0.06)]">
            <div className="aspect-video bg-surface-900"><VideoPlayer src={MUX_URL} className="w-full h-full object-cover" /></div>
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 0 40px rgba(0,240,255,0.04)' }} />
          </motion.div>
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section className="relative z-10 py-24 sm:py-32">
        <div className="section-divider mb-24" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="relative glass-glow p-10 sm:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.04] via-transparent to-accent/[0.02] pointer-events-none" />
            <div className="relative z-10">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-8">
                <PrivacyShield className="w-8 h-8 text-accent" />
              </motion.div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">Ready to work{' '}<span className="text-accent text-glow">anonymously?</span></h2>
              <p className="text-white/40 mb-10 max-w-lg mx-auto text-lg leading-relaxed">Connect your wallet, register your skills, and start earning — all while keeping your identity completely private.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/register" className="btn-primary text-lg px-8 py-4">Get Started</Link>
                <Link to="/jobs" className="btn-secondary text-lg px-8 py-4">Explore Jobs</Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><PrivacyShield className="w-4 h-4 text-accent" /></div>
            <span className="text-sm font-bold tracking-tight">ZK<span className="text-accent">Work</span></span>
          </div>
          <p className="text-xs text-white/25">Built on Aleo &middot; Zero-Knowledge Proofs &middot; Privacy Preserved</p>
          <a href="https://github.com/Mr-Ben-dev/ZkWork" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-accent transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
        </div>
      </footer>
    </div>
  );
};
