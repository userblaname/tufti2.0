import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string | null
  isFocused?: boolean
}

const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(({
  className,
  error,
  isFocused,
  ...props
}, ref) => (
  <div className="relative">
    <motion.div
      animate={{
        scale: isFocused ? 1.02 : 1,
        transition: { duration: 0.2 }
      }}
    >
      <Input
        ref={ref}
        className={cn(
          "w-full bg-transparent text-tufti-white",
          "placeholder:text-tufti-silver/40",
          "border-tufti-silver/20 focus:border-tufti-red",
          "focus:ring-1 focus:ring-tufti-red",
          error && "border-red-500 focus:border-red-500",
          className
        )}
        {...props}
      />
    </motion.div>
    {error && (
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute -bottom-6 left-0 text-sm text-red-500"
      >
        {error}
      </motion.p>
    )}
  </div>
))

AnimatedInput.displayName = 'AnimatedInput'

export default AnimatedInput