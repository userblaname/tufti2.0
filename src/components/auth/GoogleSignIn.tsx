import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

export default function GoogleSignIn() {
  const { signInWithGoogle } = useAuth()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <Button
        onClick={signInWithGoogle}
        variant="outline"
        size="lg"
        className="w-full bg-tufti-surface/30 backdrop-blur-sm border-tufti-red/20 hover:bg-tufti-surface/40 hover:border-tufti-red/30 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        
        <div className="flex items-center justify-center gap-3">
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="w-5 h-5"
          />
          <span className="text-tufti-white font-baroque">Continue with Google</span>
        </div>
      </Button>

      <p className="mt-4 text-center text-sm text-tufti-silver/60">
        By continuing, you agree to our{' '}
        <a href="#" className="text-tufti-red hover:text-tufti-red/80 transition-colors">
          Terms of Service
        </a>
        {' '}and{' '}
        <a href="#" className="text-tufti-red hover:text-tufti-red/80 transition-colors">
          Privacy Policy
        </a>
      </p>
    </motion.div>
  )
}