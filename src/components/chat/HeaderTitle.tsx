import { memo } from 'react'
import { Film, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface HeaderTitleProps {
  className?: string
}

const titleVariants = {
  initial: { opacity: 0, y: -20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
}

const decorationVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: "easeOut",
      delay: 0.2
    }
  }
}

const iconVariants = {
  rotate: {
    rotate: [0, 360],
    transition: { 
      duration: 20, 
      repeat: Infinity, 
      ease: "linear" 
    }
  },
  pulse: {
    scale: [1, 1.05, 1],
    transition: { 
      duration: 2.5,
      repeat: Infinity, 
      ease: "easeInOut" 
    }
  }
}

const HeaderTitle = memo(({ className }: HeaderTitleProps) => (
  <motion.div 
    className={cn("relative flex items-center justify-center gap-3 py-3", className)}
    variants={titleVariants}
    initial="initial"
    animate="animate"
    role="banner"
    aria-label="Tufti's Reality Film"
  >
    {/* Decorative elements - Updated colors */}
    <motion.div 
      variants={decorationVariants}
      className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-accent to-transparent opacity-30"
    />
    <motion.div 
      variants={decorationVariants}
      className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-accent to-transparent opacity-30"
    />
    
    {/* Main title content */}
    <div className="flex items-center gap-3">
      <motion.div
        variants={iconVariants}
        animate={["rotate", "pulse"]}
        className="relative"
      >
        <Film 
          className="w-7 h-7 text-teal-accent baroque-float" 
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-teal-accent/20 to-transparent rounded-full" />
      </motion.div>

      <div className="flex flex-col items-center">
        <h1 className="text-xl md:text-2xl font-baroque text-gray-100 tracking-wide">
          Tufti&apos;s Reality Film
        </h1>
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xs text-teal-accent/70 font-modern tracking-widest uppercase mt-0.5"
        >
          Compose Your Reality
        </motion.div>
      </div>
    </div>
  </motion.div>
))

HeaderTitle.displayName = 'HeaderTitle'

export default HeaderTitle