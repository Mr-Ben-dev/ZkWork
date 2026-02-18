import { FC } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { VideoPlayer } from '../components/ui/VideoPlayer';
import { PrivacyShield, AnonAvatar, EscrowLock, ZKBadge, ReputationStar, JobContract } from '../components/icons';

const MUX_URL = import.meta.env.VITE_MUX_STREAM_URL || 'https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8';

const stagger = {
  container: {
    hidden: {},
    show: { transition: { staggerChildren: 0.12 } },
  },
  item: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  },
};

const FEATURES = [
  {
    icon: PrivacyShield,
    title: 'Zero-Knowledge Privacy',
    desc: 'Your identity never leaves your wallet. All on-chain data uses BHP256 commitments — no addresses, no amounts exposed.',
  },
  {
    icon: EscrowLock,
    title: 'Trustless Escrow',
    desc: 'Funds are locked on-chain. Released atomically on completion, or automatically refunded after timeout. No middlemen.',
  },
  {
    icon: ReputationStar,
    title: 'Private Reputation',
    desc: 'Build verifiable work history without revealing your identity. Prove you exceed thresholds without showing exact scores.',
  },
  {
    icon: AnonAvatar,
    title: 'Anonymous Profiles',
    desc: 'Register as a worker with skills and rates. Your profile is a private record — only you control who sees what.',
  },
  {
    icon: JobContract,
    title: 'On-Chain Agreements',
    desc: 'Every agreement is a Leo record. Deliverables, completions, and payments are cryptographically bound.',
  },
  {
    icon: ZKBadge,
    title: 'ZK Credentials',
    desc: 'Prove your threshold of completed jobs to any verifier without revealing your total count or identity.',
  },
];

export const Home: FC = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute bottom-[35vh] left-0 right-0" style={{ height: '80vh' }}>
          <VideoPlayer src={MUX_URL} className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/70 to-black" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      <div className="relative z-10">
        <motion.div
          variants={stagger.container}
          initial="hidden"
          animate="show"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20"
        >
          <motion.div variants={stagger.item} className="flex flex-wrap gap-3 mb-8">
            <span className="badge-glass">
              <PrivacyShield className="w-3.5 h-3.5 text-accent" />
              Built on Aleo
            </span>
            <span className="badge-glass">
              <EscrowLock className="w-3.5 h-3.5 text-accent" />
              Trustless Escrow
            </span>
            <span className="badge-glass">
              <ZKBadge className="w-3.5 h-3.5 text-accent" />
              ZK Reputation
            </span>
          </motion.div>

          <motion.h1
            variants={stagger.item}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
          >
            Work Without
            <br />
            <span className="text-accent">Exposure.</span>
          </motion.h1>

          <motion.p
            variants={stagger.item}
            className="text-lg sm:text-xl text-white/50 max-w-2xl mb-10 leading-relaxed"
          >
            The first privacy-preserving freelance marketplace on Aleo. Post jobs, hire talent,
            escrow payments, and build reputation — all without revealing your identity.
          </motion.p>

          <motion.div variants={stagger.item} className="flex flex-wrap gap-4">
            <Link to="/jobs" className="btn-primary text-base">
              Browse Jobs
            </Link>
            <Link to="/register" className="btn-secondary text-base">
              Register as Worker
            </Link>
          </motion.div>
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Privacy by <span className="text-accent">Design</span>
            </h2>
            <p className="text-white/40 max-w-xl mx-auto">
              Every feature is built around zero-knowledge proofs and private records.
              Nothing leaks. Nothing is stored publicly.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="glass-hover p-6 group"
              >
                <feature.icon className="w-8 h-8 text-accent mb-4 group-hover:drop-shadow-[0_0_10px_rgba(0,240,255,0.4)] transition-all" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass p-8 sm:p-12 text-center"
          >
            <h2 className="text-3xl font-bold mb-4">Ready to work anonymously?</h2>
            <p className="text-white/40 mb-8 max-w-lg mx-auto">
              Connect your wallet, register your skills, and start earning — all while keeping
              your identity completely private.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register" className="btn-primary">
                Get Started
              </Link>
              <Link to="/jobs" className="btn-secondary">
                Explore Jobs
              </Link>
            </div>
          </motion.div>
        </div>

        <footer className="border-t border-white/5 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <PrivacyShield className="w-5 h-5 text-accent" />
              <span className="text-sm font-semibold">
                ZK<span className="text-accent">Work</span>
              </span>
            </div>
            <p className="text-xs text-white/30">
              Built on Aleo. Privacy preserved. No data leaked.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};
