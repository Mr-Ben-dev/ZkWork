import { FC, memo } from 'react';
import { motion } from 'framer-motion';

/** Floating orbs + grid overlay — used as a page-level background. */
export const AnimatedBackground: FC<{ variant?: 'default' | 'hero' }> = memo(({ variant = 'default' }) => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base dark */}
      <div className="absolute inset-0 bg-black" />

      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px',
        }}
      />

      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,240,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating orbs */}
      <motion.div
        animate={{ y: [-20, 20, -20], x: [-10, 10, -10] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[15%] left-[10%] w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0,240,255,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <motion.div
        animate={{ y: [15, -25, 15], x: [10, -15, 10] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute top-[50%] right-[5%] w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0,240,255,0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <motion.div
        animate={{ y: [10, -15, 10] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="absolute bottom-[10%] left-[30%] w-[350px] h-[350px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0,140,255,0.05) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {variant === 'hero' && (
        <>
          {/* Extra hero orb — brighter */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.2, 0.12] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[20%] left-[40%] w-[600px] h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(0,240,255,0.12) 0%, transparent 60%)',
              filter: 'blur(100px)',
            }}
          />
          {/* Horizontal glow line */}
          <div
            className="absolute top-[45%] left-0 right-0 h-[2px]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.15), transparent)',
            }}
          />
        </>
      )}

      {/* Top-to-bottom gradient fade */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" />
    </div>
  );
});

AnimatedBackground.displayName = 'AnimatedBackground';
