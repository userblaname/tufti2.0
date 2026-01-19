import React, { memo, useRef, useEffect, Suspense, lazy, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { MessageProvider } from '@/contexts/MessageContext'
import { useScrollBotPhysics } from '@/hooks/useScrollBotPhysics'
import { useTTS } from '@/hooks/useTTS'
import { cn } from '@/lib/utils'
import Message from '@/components/message/Message'
const VirtualMessageList = lazy(() => import('@/components/message/VirtualMessageList'))

import type { Message as MessageType } from '@/lib/types'

interface MessageListProps {
  messages: MessageType[]
  isTyping: boolean
  isThinking?: boolean
  onRetry?: () => void
  onFeedback?: (messageId: string, feedback: MessageType['feedback']) => void
  onEdit?: (messageId: string, newText: string) => void
  onSuggestionClick?: (suggestion: string) => void
  className?: string
  // Pagination props
  onLoadMore?: () => void
  hasMoreMessages?: boolean
  isLoadingMore?: boolean
}

const MessageList = memo(({ messages, isTyping, isThinking, onRetry, onFeedback, onEdit, onSuggestionClick, className, onLoadMore, hasMoreMessages, isLoadingMore }: MessageListProps) => {
  console.log("MessageList rendering. Messages:", messages);
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const lastMessageRef = useRef<HTMLDivElement>(null)

  // Track initial message count to skip animation on historical messages
  const initialLoadComplete = useRef(false)
  const historicalMessageCount = useRef(0)

  // Once we have messages on first render, mark them as historical
  useEffect(() => {
    if (messages.length > 0 && !initialLoadComplete.current) {
      initialLoadComplete.current = true
      historicalMessageCount.current = messages.length
    }
  }, [messages.length])

  // Intersection observer to detect scrolling near top for loading more
  const [topRef, topInView] = useInView({
    threshold: 0,
    rootMargin: '200px 0px 0px 0px' // Trigger 200px before reaching top
  })

  // Trigger load when scrolling near top
  useEffect(() => {
    if (topInView && hasMoreMessages && !isLoadingMore && onLoadMore) {
      onLoadMore()
    }
  }, [topInView, hasMoreMessages, isLoadingMore, onLoadMore])

  const {
    showScrollButton,
    scrollToBottom,
    handleScroll,
    interactionHandlers
  } = useScrollBotPhysics({
    messages,
    isTyping,
    containerRef: scrollAreaRef
  })

  // TTS for reading Tufti's responses
  const tts = useTTS()

  const isSpeakingMessage = useCallback((messageId: string) => {
    return tts.isSpeaking && tts.currentMessageId === messageId
  }, [tts.isSpeaking, tts.currentMessageId])

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
    },
    // TTS methods
    toggleSpeak: tts.toggleSpeak,
    isSpeakingMessage,
    currentSpeakingMessageId: tts.currentMessageId
  }

  // Use virtualized list for long threads (50+ messages) for smooth scrolling
  // @tanstack/react-virtual enables navigation to ANY message
  if (messages.length > 50) {
    return (
      <Suspense fallback={<div className="flex-1 px-4 md:px-6" />}>
        <VirtualMessageList
          messages={messages}
          isTyping={isTyping}
          isThinking={isThinking}
          onRetry={onRetry}
          onFeedback={onFeedback as any}
          onEdit={onEdit}
          onSuggestionClick={onSuggestionClick}
          className={className}
          onLoadMore={onLoadMore}
          hasMoreMessages={hasMoreMessages}
          isLoadingMore={isLoadingMore}
        />
      </Suspense>
    )
  }

  return (
    <MessageProvider value={messageContextValue}>
      <ScrollArea
        ref={scrollAreaRef}
        className={cn("flex-1 px-4 md:px-6 relative", className)}
        onScrollCapture={handleScroll}
        {...interactionHandlers}
      >
        {/* Messages container */}
        <div className="max-w-3xl mx-auto py-6 pb-48 space-y-4">
          {/* Scroll trigger for loading more messages */}
          <div ref={topRef} className="h-1" />

          {/* Loading indicator for pagination */}
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-400" />
            </div>
          )}

          {/* Show hint if more messages available */}
          {hasMoreMessages && !isLoadingMore && (
            <div className="text-center text-zinc-500 text-xs py-2">
              Scroll up for older messages
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
              // Historical messages (loaded from DB) render instantly - no animation
              // Only NEW messages (added during this session) get the premium animation
              const isHistoricalMessage = index < historicalMessageCount.current

              // For new messages, apply stagger based on position after historical
              const newMessageIndex = index - historicalMessageCount.current
              const staggerDelay = isHistoricalMessage ? 0 : Math.min(newMessageIndex * 0.05, 0.2)

              return (
                <React.Fragment key={message.id}>
                  <motion.div
                    id={`message-${message.id}`}
                    // Historical messages start fully visible, new ones start hidden
                    initial={isHistoricalMessage ? false : {
                      opacity: 0,
                      y: 15,
                      scale: 0.98,
                      filter: "blur(4px)"
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      filter: "blur(0px)"
                    }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={isHistoricalMessage ? { duration: 0 } : {
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1], // Smooth cubic-bezier
                      delay: staggerDelay
                    }}
                    ref={index === messages.length - 1 ? lastMessageRef : null}
                  >
                    <Message
                      message={message}
                      isLastAIMessage={index === messages.length - 1}
                      isGenerating={isTyping}
                      isThinking={isThinking}
                      onEdit={onEdit}
                    />
                  </motion.div>
                </React.Fragment>
              )
            })}


          </AnimatePresence>

        </div>
      </ScrollArea>

      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-24 right-8 z-50"
          >
            <Button
              onClick={scrollToBottom}
              size="icon"
              className={cn(
                "h-10 w-10 rounded-full shadow-2xl transition-all",
                "bg-[#27272a] border border-white/10 text-zinc-400 hover:text-white hover:bg-[#3f3f46]",
                "backdrop-blur-md"
              )}
            >
              <ArrowDown className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </MessageProvider>
  )
})

MessageList.displayName = 'MessageList'

export default MessageList