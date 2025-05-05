import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { motion, MotionProps } from 'framer-motion'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children?: ReactNode
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, className, label, ...props }, ref) => {
    const motionProps: MotionProps = {
      whileHover: { scale: 1.05 },
      whileTap: { scale: 0.95 },
      className: cn(
        "relative p-1.5 rounded-xl text-gray-300 hover:text-gray-100",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-accent/50",
        "transition-colors duration-200",
        className
      ),
      'aria-label': label,
      ...(props as any)
    };

    return (
      <motion.button
        ref={ref}
        {...motionProps}
      >
        {children}
        <div className="absolute inset-0 rounded-xl border border-teal-accent/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.button>
    )
  }
)

IconButton.displayName = 'IconButton'

export default IconButton