import { memo, useRef, useEffect, useCallback, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MessageProvider } from '@/contexts/MessageContext'
import { ScrollArea } from '@/components/ui/scroll-area'
import Message from './Message'
import LoadingIndicator from '@/components/ui/loading-spinner'
import { useTTS } from '@/hooks/useTTS'
import { cn } from '@/lib/utils'
import type { Message as MessageType } from '@/lib/types'

interface VirtualMessageListProps {
  messages: MessageType[]
  isTyping: boolean
  isThinking?: boolean
  isLoadingHistory?: boolean
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

/**
 * VirtualMessageList - Renders ALL messages with IDs for navigation
 * Premium smooth loading with staggered animations
 */
const VirtualMessageList = memo(({
  messages,
  isTyping,
  isThinking,
  isLoadingHistory,
  onRetry,
  onFeedback,
  onEdit,
  onSuggestionClick,
  className,
  onLoadMore,
  hasMoreMessages,
  isLoadingMore
}: VirtualMessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const lastMessageCount = useRef(messages.length)
  const lastMessageId = useRef<string | null>(messages.length > 0 ? messages[messages.length - 1].id : null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  // Track the initial message count to know which messages are "historical"
  // Messages at or below this index don't get animation (were loaded from DB)
  const initialLoadComplete = useRef(false)
  const historicalMessageCount = useRef(0)

  // Once we have messages and loading is done, mark initial load as complete
  useEffect(() => {
    if (!isLoadingHistory && messages.length > 0 && !initialLoadComplete.current) {
      initialLoadComplete.current = true
      historicalMessageCount.current = messages.length
    }
  }, [isLoadingHistory, messages.length])

  // Intersection observer to detect scrolling near top for loading more
  const [topRef, topInView] = useInView({
    threshold: 0,
    rootMargin: '200px 0px 0px 0px' // Trigger 200px before reaching top
  })

  // Track scroll state for position preservation when prepending messages
  const prevScrollHeightRef = useRef<number>(0)
  const prevMessageCountRef = useRef<number>(messages.length)
  const shouldRestoreScrollRef = useRef<boolean>(false)

  // Before messages change (when loading more), capture scroll state
  useEffect(() => {
    if (isLoadingMore) {
      const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
      if (scrollContainer) {
        prevScrollHeightRef.current = scrollContainer.scrollHeight
        shouldRestoreScrollRef.current = true
      }
    }
  }, [isLoadingMore])

  // After messages are prepended, restore scroll position
  useEffect(() => {
    if (shouldRestoreScrollRef.current && messages.length > prevMessageCountRef.current) {
      const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
      if (scrollContainer) {
        const heightDiff = scrollContainer.scrollHeight - prevScrollHeightRef.current
        scrollContainer.scrollTop += heightDiff
        console.log('[VirtualMessageList] Restored scroll position, heightDiff:', heightDiff)
      }
      shouldRestoreScrollRef.current = false
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length])

  // Trigger load when scrolling near top
  useEffect(() => {
    if (topInView && hasMoreMessages && !isLoadingMore && onLoadMore) {
      onLoadMore()
    }
  }, [topInView, hasMoreMessages, isLoadingMore, onLoadMore])

  // Find the index of the last AI message
  const lastAIMessageIndex = messages.slice().reverse().findIndex(m => m.sender === 'tufti')
  const actualLastAIMessageIndex = lastAIMessageIndex === -1 ? -1 : messages.length - 1 - lastAIMessageIndex

  // Auto-scroll to bottom ONLY when a NEW message is added at the END
  // NOT when older messages are prepended at the start
  useEffect(() => {
    const currentLastId = messages.length > 0 ? messages[messages.length - 1].id : null
    const wasMessageAddedAtEnd = currentLastId && currentLastId !== lastMessageId.current

    if (messages.length > lastMessageCount.current && wasMessageAddedAtEnd) {
      // New message at the end - scroll to it
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    // Otherwise: messages were prepended (loading history) - DON'T scroll

    lastMessageCount.current = messages.length
    lastMessageId.current = currentLastId
  }, [messages])

  // Scroll to bottom on initial load (when messages are loaded from history)
  useEffect(() => {
    // Small delay to ensure messages are rendered
    const timer = setTimeout(() => {
      endRef.current?.scrollIntoView({ behavior: 'auto' })
    }, 100)
    return () => clearTimeout(timer)
  }, []) // Empty dependency = only runs on mount

  // Track scroll position to show/hide scroll button
  useEffect(() => {
    const scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollHeight, scrollTop, clientHeight } = scrollElement as HTMLElement;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
      setShowScrollButton(!isAtBottom && messages.length > 10);
    };

    scrollElement.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position

    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  // TTS for reading Tufti's responses
  const tts = useTTS()

  const isSpeakingMessage = useCallback((messageId: string) => {
    return tts.isSpeaking && tts.currentMessageId === messageId
  }, [tts.isSpeaking, tts.currentMessageId])

  const messageContextValue = {
    updateMessageFeedback: onFeedback || (() => { }),
    retryMessage: () => onRetry?.(),
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

  return (
    <MessageProvider value={messageContextValue}>
      <ScrollArea
        ref={scrollRef}
        className={cn("flex-1 px-4 md:px-6 relative", className)}
      >
        <div className="max-w-3xl mx-auto py-6 pb-48 space-y-4">

          {/* Loading skeleton while fetching history */}
          {isLoadingHistory && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={`skeleton-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    "rounded-2xl animate-pulse",
                    i % 2 === 0
                      ? "h-16 bg-zinc-800/40 w-full"
                      : "h-12 bg-zinc-800/30 w-2/3 ml-auto"
                  )}
                />
              ))}
            </div>
          )}

          {/* Scroll trigger for loading more messages */}
          <div ref={topRef} className="h-1" />

          {/* Loading indicator for pagination */}
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-400" />
            </div>
          )}

          {/* Show hint if more messages available */}
          {hasMoreMessages && !isLoadingMore && !isLoadingHistory && (
            <div className="text-center text-zinc-500 text-xs py-2">
              Scroll up for older messages
            </div>
          )}

          {/* Render ALL messages with IDs for navigation */}
          <AnimatePresence initial={false}>
            {!isLoadingHistory && messages.map((message, index) => {
              const isLastAIMessage = index === actualLastAIMessageIndex

              // Historical messages (loaded from DB) render instantly - no animation
              // Only NEW messages (added during this session) get the premium animation
              const isHistoricalMessage = index < historicalMessageCount.current

              // For new messages, apply stagger based on position after historical
              const newMessageIndex = index - historicalMessageCount.current
              const staggerDelay = isHistoricalMessage ? 0 : Math.min(newMessageIndex * 0.05, 0.2)

              return (
                <motion.div
                  key={message.id}
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
                >
                  <Message
                    message={message}
                    isLastAIMessage={isLastAIMessage}
                    isGenerating={isTyping && isLastAIMessage}
                    isThinking={isThinking && isLastAIMessage}
                    onEdit={onEdit}
                  />
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Loading indicator */}
          <AnimatePresence>
            {isTyping && (
              <div className="pl-12 mt-4">
                <LoadingIndicator />
              </div>
            )}
          </AnimatePresence>

          {/* Scroll anchor */}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      {/* Calm Minimal Scroll Button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-28 right-6 z-50"
          >
            <motion.button
              onClick={() => endRef.current?.scrollIntoView({ behavior: 'smooth' })}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="h-9 w-9 rounded-full bg-zinc-800/90 border border-zinc-700/50 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-zinc-700/90 hover:border-zinc-600/50 transition-all duration-200 shadow-lg"
            >
              <ArrowDown className="w-4 h-4 text-zinc-400" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </MessageProvider>
  )
})

VirtualMessageList.displayName = 'VirtualMessageList'

export default VirtualMessageList