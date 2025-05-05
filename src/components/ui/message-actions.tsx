import { memo } from 'react'
import { Copy, CheckCircle2, RotateCcw, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from './button'
import type { Message } from '@/lib/types'

interface MessageActionsProps {
  onCopy: () => void
  onRetry?: () => void
  onFeedback?: (feedback: Message['feedback']) => void
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

const MessageActions = memo(({ onCopy, onRetry, onFeedback, copied, hasFeedback }: MessageActionsProps) => (
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

    {onRetry && (
      <Button
        variant="ghost"
        size="icon"
        onClick={onRetry}
        className="h-8 w-8 bg-tufti-black/80 hover:bg-tufti-black text-tufti-white border border-tufti-red/20"
        aria-label="Retry message"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    )}

    {!hasFeedback && onFeedback && (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onFeedback({ liked: true })}
          className="h-8 w-8 bg-tufti-black/80 hover:bg-tufti-black text-tufti-white border border-tufti-red/20"
          aria-label="Like message"
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onFeedback({ liked: false })}
          className="h-8 w-8 bg-tufti-black/80 hover:bg-tufti-black text-tufti-white border border-tufti-red/20"
          aria-label="Dislike message"
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onFeedback({ reported: true })}
          className="h-8 w-8 bg-tufti-black/80 hover:bg-tufti-black text-tufti-white border border-tufti-red/20"
          aria-label="Report message"
        >
          <AlertCircle className="h-4 w-4" />
        </Button>
      </>
    )}
  </motion.div>
))

MessageActions.displayName = 'MessageActions'

export default MessageActions