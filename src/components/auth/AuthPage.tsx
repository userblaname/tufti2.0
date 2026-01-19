import React, { useEffect, useMemo } from 'react';
import { Suspense } from 'react'
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';
import '@fontsource/space-grotesk/index.css';
import CinemaBackdrop from '@/components/background/CinemaBackdrop'
import { Button } from '@/components/ui/button'

// Cinematic Grain/Noise Overlay
const CinematicGrain = () => (
  <div className="pointer-events-none absolute inset-0 z-[5] opacity-[0.03] mix-blend-overlay">
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <filter id="noiseFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noiseFilter)" />
    </svg>
  </div>
);


const TUFTI_OPENING_LINES = [
  "A new frame opens. Where shall we place your gaze first?",
  "Your gaze composes reality. What intention do you set now?",
  "We begin not with control, but with intention. What is yours?",
  "Two screens on: you and the world. Which scene shall we light?",
  "The reel is ready, dear one. What shall the next frame contain?",
  "Step into awareness. What scene are we composing today?",
];

const AuthPage: React.FC = () => {
  const { supabase, signInWithGoogle, isLoading, authError } = useAuth();
  const seededLines = useMemo(() => {
    if (typeof window === 'undefined') return TUFTI_OPENING_LINES.slice(0, 3)
    const key = 'tufti_opening_seed'
    let seed = Number(localStorage.getItem(key))
    if (!seed || Number.isNaN(seed)) {
      seed = Math.floor(Math.random() * 100000)
      try { localStorage.setItem(key, String(seed)) } catch { }
    }
    // deterministic shuffle by seed (simple LCG)
    const lcg = (a: number) => () => (a = (a * 48271) % 0x7fffffff)
    const rnd = lcg(seed)
    const arr = [...TUFTI_OPENING_LINES]
    arr.sort(() => (rnd() / 0x7fffffff) - 0.5)
    return arr.slice(0, 3)
  }, [])

  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        console.log('AuthPage Auth State Changed:', event, session);
      }
    );

    return () => subscription?.unsubscribe();
  }, [supabase]);

  if (!supabase) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-navy-deep">
        <p className="text-red-400 font-sans">Supabase client is not available. Check AuthProvider.</p>
      </div>
    );
  }


  return (
    <div className="h-screen w-screen overflow-hidden relative bg-gradient-to-br from-navy-deep via-slate-950 to-tufti-black text-gray-200 flex flex-col items-center justify-center p-4 font-modern">
      {/* Backgrounds */}
      <CinemaBackdrop />
      <CinematicGrain />

      {/* Tufti Dialogue Area - brief and randomized */}
      <div className="relative z-10 mb-8 text-center h-10 md:h-12 max-w-md">
        <TypeAnimation
          sequence={[
            ...seededLines.flatMap(msg => [msg, 6000, ' ', 500]),
          ]}
          speed={60}
          className="text-xs md:text-sm text-white/40 italic font-light tracking-wide"
          repeat={Infinity}
          cursor={false}
        />
      </div>

      {/* Auth Form Container */}
      <motion.div
        className="relative z-10 w-full max-w-sm p-10 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] flex flex-col items-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        aria-busy={isLoading}
      >
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          <h2 className="text-4xl md:text-5xl font-serif-display text-white mb-3 tracking-tight">Reality Film</h2>
          <p className="text-white/30 text-[10px] md:text-xs uppercase tracking-[0.3em] font-light">Compose your existence</p>
        </motion.div>

        {/* Primary Option: Animated Google Button */}
        <div className="w-full">
          <motion.button
            onClick={signInWithGoogle}
            disabled={isLoading}
            className="group relative w-full h-14 overflow-hidden rounded-none bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 transition-all duration-500 flex items-center justify-center gap-3 px-6"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />

            <motion.svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              initial={{ rotate: -10, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </motion.svg>
            <span className="text-[#D97757] text-xs uppercase tracking-[0.2em] font-medium group-hover:text-[#e08d74] transition-colors">
              Enter with Google
            </span>
          </motion.button>
        </div>

        {/* Error region */}
        <div className="mt-4 min-h-[20px]" aria-live="polite">
          {authError && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] uppercase tracking-widest text-red-400 font-light text-center"
            >
              {authError}
            </motion.p>
          )}
        </div>

        {/* Privacy row */}
        <div className="mt-6 text-center text-[10px] text-white/20 uppercase tracking-[0.1em] font-light">
          By entering, you accept our <a href="#" className="hover:text-white/40 border-b border-white/10">Terms</a>
        </div>

        {/* Loading overlay - more cinematic */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center z-20"
          >
            <div className="w-12 h-[1px] bg-white/20 relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-[#D97757]"
                animate={{ x: ['100%', '-100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              />
            </div>
            <span className="mt-4 text-[10px] uppercase tracking-[0.4em] text-white/40 animate-pulse">Syncing Reality</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default AuthPage; 