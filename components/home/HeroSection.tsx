'use client';

import { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, type Transition } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';

export function HeroSection() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const springCfg = { damping: 30, stiffness: 80 };
  const orb1x = useSpring(useTransform(mouseX, [0, 1], [-30, 30]), springCfg);
  const orb1y = useSpring(useTransform(mouseY, [0, 1], [-30, 30]), springCfg);
  const orb2x = useSpring(useTransform(mouseX, [0, 1], [25, -25]), springCfg);
  const orb2y = useSpring(useTransform(mouseY, [0, 1], [25, -25]), springCfg);
  const orb3x = useSpring(useTransform(mouseX, [0, 1], [-15, 15]), springCfg);
  const orb3y = useSpring(useTransform(mouseY, [0, 1], [15, -15]), springCfg);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = username.trim().replace(/^@/, '');
    if (!clean) {
      setError('Enter a username to get started');
      return;
    }
    router.push(`/wall/${clean}`);
  }

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.65, delay, ease: 'easeOut' } satisfies Transition,
  });

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Background gradient base */}
      <div className="absolute inset-0 bg-canvas" />

      {/* Orb 1 — primary */}
      <motion.div
        className="absolute top-[20%] left-[15%] w-[480px] h-[480px] rounded-full bg-primary opacity-[0.12] blur-[80px] pointer-events-none"
        style={{ x: orb1x, y: orb1y }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Orb 2 — teal */}
      <motion.div
        className="absolute bottom-[15%] right-[10%] w-[400px] h-[400px] rounded-full bg-teal opacity-[0.10] blur-[90px] pointer-events-none"
        style={{ x: orb2x, y: orb2y }}
        animate={{ scale: [1.05, 1, 1.05] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Orb 3 — warm accent */}
      <motion.div
        className="absolute top-[50%] right-[30%] w-[300px] h-[300px] rounded-full bg-warm opacity-[0.08] blur-[70px] pointer-events-none"
        style={{ x: orb3x, y: orb3y }}
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-4 w-full max-w-2xl mx-auto">
        <motion.div {...fadeUp(0)} className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 bg-surface/70 backdrop-blur-md text-primary text-sm font-medium px-4 py-1.5 rounded-full border border-border-subtle shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Anonymous compliments
          </span>
        </motion.div>

        <motion.h1
          {...fadeUp(0.1)}
          className="text-5xl sm:text-7xl font-bold text-ink leading-[1.08] tracking-tight mb-6"
        >
          Spread kindness,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-light to-teal">
            anonymously
          </span>
        </motion.h1>

        <motion.p
          {...fadeUp(0.2)}
          className="text-lg text-ink-muted leading-relaxed mb-12 max-w-lg mx-auto"
        >
          Send heartfelt compliments to someone who deserves to hear it.
          No account needed — your identity stays yours.
        </motion.p>

        {/* Username form — the main CTA */}
        <motion.div {...fadeUp(0.3)}>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto"
          >
            <div className="relative flex-1 w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted text-base select-none pointer-events-none">
                @
              </span>
              <input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                placeholder="their username"
                className="w-full pl-8 pr-4 py-4 rounded-2xl border-2 border-border-subtle bg-surface/80 backdrop-blur-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary transition-colors text-base shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-7 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-2xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-lg shadow-primary/30 whitespace-nowrap w-full sm:w-auto"
            >
              Send a compliment
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-500 mt-3"
            >
              {error}
            </motion.p>
          )}
        </motion.div>

        <motion.div
          {...fadeUp(0.45)}
          className="mt-10 flex items-center justify-center gap-6 text-sm text-ink-muted"
        >
          <a href="/signup" className="hover:text-ink transition-colors font-medium">
            Create account
          </a>
          <span className="opacity-30 text-lg leading-none">·</span>
          <a href="/signin" className="hover:text-ink transition-colors">
            Sign in
          </a>
        </motion.div>
      </div>
    </div>
  );
}
