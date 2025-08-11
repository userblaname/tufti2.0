import { memo } from 'react'
import { Copy, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from './button'
import type { Message } from '@/lib/types'

interface MessageActionsProps {
  onCopy: () => void
  copied: boolean
  hasFeedback: boolean
}

const actionVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.2 }
  }
}

const MessageActions = memo(({ onCopy, copied }: MessageActionsProps) => (
  <motion.div 
    className="absolute right-0 top-full mt-2 flex items-center space-x-2"
    variants={actionVariants}
    initial="hidden"
    animate="visible"
  >
    <Button
      variant="ghost"
      size="icon"
      onClick={onCopy}
      className="h-8 w-8 bg-tufti-black/80 hover:bg-tufti-black text-tufti-white border border-tufti-red/20"
      aria-label={copied ? "Copied" : "Copy message"}
    >
      {copied ? (
        <CheckCircle2 className="h-4 w-4 text-tufti-gold" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  </motion.div>
))

MessageActions.displayName = 'MessageActions'

export default MessageActions