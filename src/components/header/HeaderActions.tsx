import { memo } from 'react'
import { History, Film } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import ActionButton from './ActionButton'
import NotificationButton from './NotificationButton'
import SearchButton from './SearchButton'
import UserMenu from './UserMenu'

interface HeaderActionsProps {
  onClearChat: () => void
  userName?: string
  className?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
}

const HeaderActions = memo(({ onClearChat, userName, className }: HeaderActionsProps) => (
  <motion.div 
    variants={containerVariants}
    initial="hidden"
    animate="visible"
    className={cn("flex items-center gap-3", className)}
    role="toolbar" 
    aria-label="Chat controls"
  >
    <motion.div variants={itemVariants}>
      <ActionButton
        icon={History}
        label="Clear film reel"
        onClick={onClearChat}
      />
    </motion.div>

    <motion.div variants={itemVariants}>
      <ActionButton
        icon={Film}
        label="Director's tools"
      />
    </motion.div>

    <motion.div variants={itemVariants}>
      <SearchButton />
    </motion.div>

    <motion.div variants={itemVariants}>
      <NotificationButton />
    </motion.div>

    <motion.div variants={itemVariants}>
      <UserMenu userName={userName} />
    </motion.div>
  </motion.div>
))

HeaderActions.displayName = 'HeaderActions'

export default HeaderActions