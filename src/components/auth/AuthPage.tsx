import React, { useEffect } from 'react';
import { Suspense } from 'react'
import { Auth } from '@supabase/auth-ui-react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useAuth } from '@/contexts/AuthContext';
import { motion, motionValue, useTransform, animate as fmAnimate } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';
import '@fontsource/space-grotesk/index.css';

// Animated Subtle Grid Background Component
const AnimatedGridBackground = () => {
  // Create motion values for x and y position
  const backgroundX = motionValue(0);
  const backgroundY = motionValue(0);

  // Animate the motion values
  useEffect(() => {
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

const tuftiMessages = [
  "You are about to step into your own reality. Are you aware?",
  "Attention, dear one. Your intention is the key.",
  "You are not a passenger. You are the scriptwriter.",
  "Pause. Observe yourself as you sign in. This is the beginning.",
  "Remember: Reality responds to your gaze. Where will you look today?",
];

const AuthPage: React.FC = () => {
  const { supabase } = useAuth();

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
    <div className="h-screen w-screen overflow-hidden relative bg-gradient-to-br from-indigo-950 via-slate-950 to-tufti-black text-gray-200 flex flex-col items-center justify-center p-4 font-modern">
      {/* Backgrounds */}
      <AnimatedGridBackground />
      <PatternCircle className="w-[50vw] h-[50vw] md:w-[40vw] md:h-[40vw] top-[-25%] left-[-15%]" />
      <PatternCircle className="w-[45vw] h-[45vw] md:w-[35vw] md:h-[35vw] bottom-[-20%] right-[-10%]" />

      {/* Tufti Dialogue Area - Now Animated and Persona-based */}
      <div className="relative z-10 mb-8 text-center h-12 md:h-16 max-w-md">
        <TypeAnimation
          sequence={[
            ...tuftiMessages.flatMap(msg => [msg, 6000, ' ', 500]), // Type, pause, clear, pause
          ]}
          wrapper="p"
          speed={60}
          className="text-base md:text-lg text-gray-400 italic font-light"
          repeat={Infinity}
          cursor={true}
        />
      </div>

      {/* Auth Form Container */}
      <motion.div 
        className="relative z-10 w-full max-w-sm sm:max-w-md p-8 bg-black/20 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-semibold text-tufti-white mb-4 font-modern">
            Reality Film
          </h1>
          <p className="text-gray-300 text-base">
            Sign in to continue
          </p>
        </div>
        <Suspense fallback={<div className="text-center text-gray-400 py-8">Loading auth…</div>}>
        <Auth
          supabaseClient={supabase}
          appearance={{ 
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(220, 70%, 65%)',
                  brandAccent: 'hsl(220, 80%, 75%)',
                  brandButtonText: '#FFFFFF',
                  defaultButtonBackground: '#FFFFFF',
                  defaultButtonBackgroundHover: '#F2F2F2',
                  defaultButtonBorder: 'rgba(200, 200, 200, 0.3)',
                  defaultButtonText: '#333333',
                  dividerBackground: 'rgba(255, 255, 255, 0.1)',
                  inputBackground: 'rgba(255, 255, 255, 0.05)',
                  inputBorder: 'rgba(255, 255, 255, 0.15)',
                  inputBorderHover: 'rgba(255, 255, 255, 0.3)',
                  inputBorderFocus: 'hsl(220, 70%, 65%)',
                  inputText: '#E5E5E7',
                  inputLabelText: '#A0AEC0',
                  inputPlaceholder: 'rgba(255, 255, 255, 0.4)',
                  messageText: '#E5E5E7',
                  messageTextDanger: '#FCA5A5',
                  anchorTextColor: 'hsl(220, 60%, 70%)',
                  anchorTextHoverColor: '#FFFFFF',
                },
                space: {
                  buttonPadding: '16px 28px',
                  socialAuthSpacing: '0px',
                  inputPadding: '10px 12px',
                },
                fontSizes: {
                  baseButtonSize: '18px',
                },
                fonts: {
                  bodyFontFamily: 'inherit',
                  buttonFontFamily: 'inherit',
                  inputFontFamily: 'inherit',
                  labelFontFamily: 'inherit',
                },
              },
            },
            className: {
              button: 'focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/10 focus:ring-blue-400 transition-shadow duration-200 shadow-md hover:shadow-lg'
            }
          }}
          providers={['google']}
          redirectTo={`${window.location.origin}/`}
          localization={{
            variables: {
              sign_in: {
                social_provider_text: 'Sign in with Google',
              },
            },
          }}
          socialLayout="horizontal"
          onlyThirdPartyProviders={true}
          view="sign_in"
        />
        </Suspense>
      </motion.div>
    </div>
  );
};

export default AuthPage; 