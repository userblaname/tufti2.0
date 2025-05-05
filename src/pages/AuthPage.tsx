import { useEffect } from 'react'
import { motion } from 'framer-motion'
import AuthHeader from '@/components/auth/AuthHeader'
import AuthForm from '@/components/auth/AuthForm'
import { AuthService } from '@/lib/firebase/auth-service'

export default function AuthPage() {
  useEffect(() => {
    // Check for existing session
    const authService = AuthService.getInstance()
    authService.getCurrentUser()
  }, [])

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-tufti-black flex flex-col items-center justify-center p-4"
    >
      <div className="w-full max-w-lg mx-auto">
        <AuthHeader />
        <AuthForm />
      </div>

      {/* Ambient background effects */}
      <div className="fixed inset-0 bg-gradient-to-b from-tufti-black via-tufti-surface/5 to-tufti-black pointer-events-none" />
      <div 
        className="fixed inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0z' fill='%23ffffff' fill-opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}
      />
    </motion.div>
  )
}