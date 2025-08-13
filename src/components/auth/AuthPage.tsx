import React, { useEffect, useMemo, useState } from 'react';
import { Suspense } from 'react'
import { Auth } from '@supabase/auth-ui-react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useAuth } from '@/contexts/AuthContext';
import { motion, motionValue, useTransform, animate as fmAnimate } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';
import '@fontsource/space-grotesk/index.css';
import { Button } from '@/components/ui/button'

// Animated Subtle Grid Background Component
const AnimatedGridBackground = () => {
  // Create motion values for x and y position
  const backgroundX = motionValue(0);
  const backgroundY = motionValue(0);

  // Animate the motion values
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const controlsX = fmAnimate(backgroundX, [0, -40], { 
      duration: 5, 
      repeat: Infinity, 
      repeatType: "loop", 
      ease: "linear" 
    });
    const controlsY = fmAnimate(backgroundY, [0, -40], { 
      duration: 5, 
      repeat: Infinity, 
      repeatType: "loop", 
      ease: "linear" 
    });
    
    // Cleanup function to stop animation on unmount
    return () => {
      controlsX.stop();
      controlsY.stop();
    };
  }, [backgroundX, backgroundY]);

  // Transform motion values into a backgroundPosition string
  const backgroundPosition = useTransform(
    [backgroundX, backgroundY],
    ([x, y]) => `${x}px ${y}px`
  );

  return (
    <div className="absolute inset-0 overflow-hidden z-0">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5"/>
          </pattern>
          {/* Apply backgroundPosition via style prop */}
          <motion.pattern 
            id="animatedGrid" 
            width="40" 
            height="40" 
            patternUnits="userSpaceOnUse"
            style={{ backgroundPosition }} // Use motion value here
            // Remove direct animate/transition props for backgroundPosition
          >
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </motion.pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#animatedGrid)" />
      </svg>
    </div>
  );
};

// Subtle Pulsing Circle Background Component
const PatternCircle = ({ className }: { className?: string }) => (
  <motion.div 
    className={`absolute rounded-full bg-gradient-to-tr from-purple-600/10 via-indigo-600/5 to-purple-600/10 blur-xl ${className}`}
    animate={{
      scale: [1, 1.03, 1],
      opacity: [0.6, 0.8, 0.6],
    }}
    transition={{
      duration: 18, // Slower duration
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
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
      try { localStorage.setItem(key, String(seed)) } catch {}
    }
    // deterministic shuffle by seed (simple LCG)
    const lcg = (a: number) => () => (a = (a * 48271) % 0x7fffffff)
    const rnd = lcg(seed)
    const arr = [...TUFTI_OPENING_LINES]
    arr.sort(() => (rnd() / 0x7fffffff) - 0.5)
    return arr.slice(0, 3)
  }, [])
  const [showEmail, setShowEmail] = useState(false)

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
      <AnimatedGridBackground />
      <PatternCircle className="w-[50vw] h-[50vw] md:w-[40vw] md:h-[40vw] top-[-25%] left-[-15%]" />
      <PatternCircle className="w-[45vw] h-[45vw] md:w-[35vw] md:h-[35vw] bottom-[-20%] right-[-10%]" />

      {/* Tufti Dialogue Area - brief and randomized */}
      <div className="relative z-10 mb-6 text-center h-10 md:h-12 max-w-md">
        <TypeAnimation
          sequence={[
            ...seededLines.flatMap(msg => [msg, 6000, ' ', 500]),
          ]}
          speed={60}
          className="text-sm md:text-base text-gray-400 italic font-light"
          repeat={Infinity}
          cursor={false}
        />
      </div>

      {/* Auth Form Container */}
      <motion.div 
        className="relative z-10 w-full max-w-sm sm:max-w-md p-6 md:p-8 bg-black/25 backdrop-blur-md border border-teal-accent/20 rounded-none shadow-2xl transition-all duration-300 hover:border-teal-accent/40 hover:shadow-[0_0_0_1px_rgba(56,178,172,0.35)]"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        aria-busy={isLoading}
      >
        <div className="text-center mb-5 md:mb-6">
          <h2 className="text-2xl md:text-3xl font-semibold text-tufti-white font-baroque">Compose your reality</h2>
          <p className="text-gray-300 text-sm md:text-base">Sign in to save scenes across devices</p>
        </div>

        {/* Primary: Google OAuth */}
        <div className="space-y-3">
          <Button onClick={signInWithGoogle} disabled={isLoading} className="w-full h-11 text-base rounded-none bg-teal-accent/20 hover:bg-teal-accent/30 text-teal-accent border border-teal-accent/30 shadow-[inset_0_0_0_1px_rgba(56,178,172,0.25)] hover:shadow-[0_0_18px_rgba(56,178,172,0.25)] transition-all">
            Continue with Google
          </Button>
          <button
            type="button"
            onClick={() => setShowEmail(v => !v)}
            className="w-full text-center text-sm text-gray-300 hover:text-white underline underline-offset-4 transition-colors"
            aria-expanded={showEmail}
          >
            {showEmail ? 'Hide email options' : 'Use email instead'}
          </button>
        </div>

        {/* Email sign-in */}
        {showEmail && (
          <div className="mt-4">
            <Suspense fallback={<div className="text-center text-gray-400 py-6">Loading…</div>}>
              <Auth
                supabaseClient={supabase}
                appearance={{ 
                  theme: ThemeSupa, 
                  className: { 
                    button: 'rounded-none h-10 bg-teal-accent/20 hover:bg-teal-accent/30 text-teal-accent border border-teal-accent/30 focus:ring-2 focus:ring-teal-accent/40',
                    input: 'rounded-none bg-white/5 border-white/20 focus:border-teal-accent focus:ring-1 focus:ring-teal-accent/40 text-gray-100 placeholder:text-gray-400',
                    label: 'text-gray-300',
                    anchor: 'text-teal-accent hover:text-teal-accent/80'
                  } 
                }}
                providers={[]}
                view="sign_in"
              />
            </Suspense>
          </div>
        )}

        {/* Error region */}
        <div className="mt-3 min-h-[20px]" aria-live="polite">
          {authError && <p className="text-sm text-red-400 text-center">{authError}</p>}
        </div>

        {/* Privacy row */}
        <div className="mt-4 text-center text-xs text-gray-400">
          We only use your email for authentication. <a href="#" className="underline hover:text-gray-200">Privacy</a> · <a href="#" className="underline hover:text-gray-200">Terms</a>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div role="dialog" aria-label="Signing in" className="absolute inset-0 rounded-none bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <span className="text-sm text-gray-200">Redirecting to Google…</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AuthPage; 