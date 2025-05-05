import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LoginOptionsProps {
  onSelectGoogle: () => void
  onSelectAdmin: () => void
  className?: string
}

export default function LoginOptions({ onSelectGoogle, onSelectAdmin, className }: LoginOptionsProps) {
  const [showOptions, setShowOptions] = useState(false)

  return (
    <div className={cn("relative", className)}>
      <Button
        onClick={() => setShowOptions(!showOptions)}
        className="w-full bg-tufti-red hover:bg-tufti-red/90"
      >
        <LogIn className="w-5 h-5 mr-2" />
        Sign In
      </Button>

      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 p-2 bg-tufti-surface/95 backdrop-blur-md rounded-lg border border-tufti-red/20 shadow-lg z-50"
          >
            <div className="space-y-2">
              <Button
                onClick={() => {
                  setShowOptions(false)
                  onSelectGoogle()
                }}
                variant="ghost"
                className="w-full justify-start hover:bg-tufti-red/10"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="w-5 h-5 mr-2"
                />
                Continue with Google
              </Button>

              <Button
                onClick={() => {
                  setShowOptions(false)
                  onSelectAdmin()
                }}
                variant="ghost"
                className="w-full justify-start hover:bg-tufti-red/10"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Admin Login
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}