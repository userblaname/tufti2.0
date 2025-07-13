import { memo, useRef, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageProvider } from '@/contexts/MessageContext'
import { cn } from '@/lib/utils'
import Message from '@/components/message/Message'
import LoadingIndicator from './LoadingIndicator'
import type { Message as MessageType } from '@/lib/types'
import React from 'react'

interface MessageListProps {
  messages: MessageType[]
  isTyping: boolean
  onRetry?: () => void
  onFeedback?: (messageId: string, feedback: MessageType['feedback']) => void
  className?: string
}

const MessageList = memo(({ messages, isTyping, onRetry, onFeedback, className }: MessageListProps) => {
  console.log("MessageList rendering. Messages:", messages);
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [loadMoreRef, inView] = useInView()
  const lastMessageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (lastMessageRef.current && messages.length > 0) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const messageContextValue = {
    updateMessageFeedback: (messageId: string, feedback: MessageType['feedback']) => {
      onFeedback?.(messageId, feedback)
    },
    retryMessage: (messageId: string) => {
      console.log("Retrying message (ID not currently used by handler):", messageId);
      onRetry?.()
    },
    copyMessage: async (text: string): Promise<void> => {
      try {
        await navigator.clipboard.writeText(text)
      } catch (err) {
        console.error("Failed to copy text: ", err)
      }
    }
  }

  return (
    <MessageProvider value={messageContextValue}>
      <ScrollArea 
        ref={scrollAreaRef} 
        className={cn("flex-1 px-4 md:px-6", className)}
        onScrollCapture={(e) => {
          const target = e.currentTarget
          if (target.scrollTop === 0 && inView) {
            // Handle load more if needed
          }
        }}
      >
        <div className="max-w-3xl mx-auto py-6 space-y-4">
          <div ref={loadMoreRef} className="h-1" />
          
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <React.Fragment key={message.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  ref={index === messages.length - 1 ? lastMessageRef : null}
                >
                  <Message 
                    message={message}
                  />
                </motion.div>
              </React.Fragment>
            ))}

            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="pl-12 pt-4"
              >
                <LoadingIndicator />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </MessageProvider>
  )
})

MessageList.displayName = 'MessageList'

export default MessageList