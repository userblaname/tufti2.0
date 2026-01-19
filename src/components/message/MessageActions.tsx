import { memo } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMessage } from '@/contexts/MessageContext'
import { cn } from '@/lib/utils'

interface MessageActionsProps {
  text: string
  copied: boolean
  className?: string
  onCopied?: () => void
  // TTS props
  messageId?: string
  isAIMessage?: boolean
  isSpeaking?: boolean
  onToggleSpeak?: () => void
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
  text,
  copied,
  className,
  onCopied,
  isAIMessage,
  isSpeaking,
  onToggleSpeak
}: MessageActionsProps) => {
  const { copyMessage } = useMessage()

  const handleCopy = async () => {
    await copyMessage(text)
    onCopied?.()
  }

  return (
    <motion.div
      className={cn(
        "flex items-center justify-end gap-1 mt-2 mr-4",
        className
      )}
      variants={actionVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Speaker button for AI messages */}
      {isAIMessage && onToggleSpeak && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSpeak}
          className={cn(
            "h-7 w-7 rounded-lg border transition-all duration-200",
            isSpeaking
              ? "bg-teal-500/20 text-teal-400 border-teal-500/30 hover:bg-teal-500/30"
              : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 border-white/5 hover:border-white/10"
          )}
          aria-label={isSpeaking ? "Stop speaking" : "Read aloud"}
          title={isSpeaking ? "Stop speaking" : "Read aloud"}
        >
          {isSpeaking ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </Button>
      )}

      {/* Copy button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 border border-white/5 hover:border-white/10 transition-all duration-200"
        aria-label={copied ? "Copied" : "Copy message"}
      >
        {copied ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        )}
      </Button>
    </motion.div>
  )
})

MessageActions.displayName = 'MessageActions'

export default MessageActions