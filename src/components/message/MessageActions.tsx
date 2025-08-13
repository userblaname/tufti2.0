import { memo } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMessage } from '@/contexts/MessageContext'
import { cn } from '@/lib/utils'
// import type { Message } from '@/lib/types'

interface MessageActionsProps {
  text: string
  copied: boolean
  className?: string
  onCopied?: () => void
}

const actionVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.2 }
  }
}

const MessageActions = memo(({ text, copied, className, onCopied }: MessageActionsProps) => {
  const { copyMessage } = useMessage()

  const handleCopy = async () => {
    await copyMessage(text)
    onCopied?.()
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
        className="h-8 w-8 rounded-xl bg-navy-deep/80 hover:bg-navy-deep text-gray-100 border border-teal-accent/30"
        aria-label={copied ? "Copied" : "Copy message"}
      >
        {copied ? (
          <CheckCircle2 className="h-4 w-4 text-tufti-gold" />
        ) : (
          // Tufti brand clipboard: minimal rounded square with notch
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4 text-teal-accent" aria-hidden="true">
            <path fill="currentColor" d="M15 3h-2.1a2 2 0 0 0-3.8 0H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h6.5c.83 0 1.5-.67 1.5-1.5V6h1a1 1 0 0 1 1 1v10.5A2.5 2.5 0 0 1 14.5 20H7a4 4 0 0 1-4-4V5a4 4 0 0 1 4-4h2.1a2 2 0 0 1 3.8 0H15a3 3 0 0 1 3 3v1.5A1.5 1.5 0 0 1 16.5 7H15V3Z"/>
          </svg>
        )}
      </Button>
    </motion.div>
  )
})

MessageActions.displayName = 'MessageActions'

export default MessageActions