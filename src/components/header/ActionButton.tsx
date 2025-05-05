import { memo } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface ActionButtonProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  className?: string
}

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
  active: { 
    backgroundColor: 'rgba(158, 43, 37, 0.2)',
    transition: { duration: 0.2 }
  }
}

const ActionButton = memo(({ 
  icon: Icon, 
  label, 
  onClick, 
  disabled, 
  active,
  className 
}: ActionButtonProps) => (
  <motion.div
    variants={buttonVariants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
    animate={active ? "active" : "initial"}
  >
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="ghost"
      size="icon"
      className={cn(
        "bg-tufti-surface/40 hover:bg-tufti-surface/60",
        "backdrop-blur-sm border border-tufti-gold/10",
        "hover:border-tufti-gold/20 transition-all duration-300",
        className
      )}
      aria-label={label}
    >
      <Icon className="w-5 h-5 text-tufti-gold/80" />
    </Button>
  </motion.div>
))

ActionButton.displayName = 'ActionButton'

export default ActionButton