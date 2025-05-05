import { memo } from 'react'
import { motion } from 'framer-motion'
import { Copy, CheckCircle2, RotateCcw, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMessage } from '@/contexts/MessageContext'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/types'

interface MessageActionsProps {
  messageId: number
  text: string
  hasFeedback: boolean
  copied: boolean
  showRetry?: boolean
  className?: string
}

const actionVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.2 }
  }
}

const MessageActions = memo(({ 
  messageId, 
  text, 
  hasFeedback, 
  copied, 
  showRetry,
  className 
}: MessageActionsProps) => {
  const { updateMessageFeedback, retryMessage, copyMessage } = useMessage()

  const handleCopy = async () => {
    await copyMessage(text)
  }

  return (
    <motion.div 
      className={cn(
        "absolute right-0 top-full mt-2 flex items-center space-x-2",
        className
      )}
      variants={actionVariants}
      initial="hidden"
      animate="visible"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="h-8 w-8 bg-tufti-black/80 hover:bg-tufti-black text-tufti-white border border-tufti-red/20"
        aria-label={copied ? "Copied" : "Copy message"}
      >
        {copied ? (
          <CheckCircle2 className="h-4 w-4 text-tufti-gold" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>

      {showRetry && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => retryMessage(messageId)}
          className="h-8 w-8 bg-tufti-black/80 hover:bg-tufti-black text-tufti-white border border-tufti-red/20"
          aria-label="Retry message"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}

      {!hasFeedback && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => updateMessageFeedback(messageId, { liked: true })}
            className="h-8 w-8 bg-tufti-black/80 hover:bg-tufti-black text-tufti-white border border-tufti-red/20"
            aria-label="Like message"
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => updateMessageFeedback(messageId, { liked: false })}
            className="h-8 w-8 bg-tufti-black/80 hover:bg-tufti-black text-tufti-white border border-tufti-red/20"
            aria-label="Dislike message"
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => updateMessageFeedback(messageId, { reported: true })}
            className="h-8 w-8 bg-tufti-black/80 hover:bg-tufti-black text-tufti-white border border-tufti-red/20"
            aria-label="Report message"
          >
            <AlertCircle className="h-4 w-4" />
          </Button>
        </>
      )}
    </motion.div>
  )
})

MessageActions.displayName = 'MessageActions'

export default MessageActions