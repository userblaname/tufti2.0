import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '@/hooks/useChat'
import Header from './chat/Header'
import MessageList from './chat/MessageList'
import Suggestions from './chat/Suggestions'
import ChatInput from './chat/ChatInput'
import type { UserProfile } from '@/lib/types'
import { buildSuggestions } from '@/lib/tufti/suggestions'
import { useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastAction } from '@/components/ui/toast'

interface ChatProps {
  userProfile: UserProfile
  signOut: () => Promise<void>
}

export default function Chat({ userProfile, signOut }: ChatProps) {
  console.log("--- DEV_LOG: Chat component rendered ---");
  // Use chat hook first to avoid order violations
  const { 
    messages, 
    isTyping, 
    isGenerating, 
    isSending,
    sendMessage, 
    updateMessageFeedback, 
    retryLastMessage,
    clearChat,
    chatError,
    isLoadingHistory
  } = useChat(userProfile)

  const { toast, toasts, removeToast } = useToast()

  useEffect(() => {
    if (chatError) {
      toast({ title: 'Chat error', description: chatError, variant: 'destructive', duration: 5000 })
    }
  }, [chatError, toast])

  return (
    <ToastProvider>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex flex-col h-screen bg-navy-deep relative"
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="h-2 bg-gradient-to-r from-teal-accent/20 via-teal-accent to-teal-accent/20" />
        
        <Header 
          onClearChat={clearChat} 
          userName={userProfile.name} 
          signOut={signOut}
        />
        
        <AnimatePresence mode="wait">
          {isLoadingHistory ? (
            <motion.div
              key="history-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center text-gray-400"
            >
              Loading history...
            </motion.div>
          ) : messages.length > 0 ? (
            <MessageList
              key="messages"
              messages={messages}
              isTyping={isTyping}
              onRetry={retryLastMessage}
              onFeedback={updateMessageFeedback}
            />
          ) : (
            <>
              <Suggestions
                suggestions={buildSuggestions(userProfile)}
                onSelect={(s) => sendMessage(s.prompt)}
              />
              <motion.div
                key="no-messages"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center text-gray-500"
              >
                Send a message to start the conversation.
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {chatError && (
          <div className="px-4 py-2 text-center text-red-500 bg-red-900/30 border-t border-b border-red-800/50 text-sm">
            {chatError}
          </div>
        )}

        <ChatInput 
          onSendMessage={sendMessage} 
          disabled={isTyping || isGenerating || isSending}
          isGenerating={isGenerating}
        />
        
        <div className="h-2 bg-gradient-to-r from-teal-accent/20 via-teal-accent to-teal-accent/20" />
      </div>
      {/* Toasts */}
      {toasts.map((t) => (
        <Toast key={t.id} onOpenChange={(open) => { if (!open) removeToast(t.id) }}>
          {t.title && <ToastTitle>{t.title}</ToastTitle>}
          {t.description && <ToastDescription>{t.description}</ToastDescription>}
          <ToastAction altText="Retry" onClick={() => retryLastMessage()}>Retry</ToastAction>
        </Toast>
      ))}
      <ToastViewport />
    </motion.div>
    </ToastProvider>
  )
}