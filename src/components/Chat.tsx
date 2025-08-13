// src/components/Chat.tsx

import { motion } from 'framer-motion';
import { useChat } from '@/hooks/useChat';
import Header from './chat/Header';
import MessageList from './chat/MessageList';
import Suggestions from './chat/Suggestions'
import { buildSuggestions, buildContextualSuggestions } from '@/lib/tufti/suggestions'
import ChatInput from './chat/ChatInput';
import { OnboardingOptions } from './onboarding/OnboardingOptions'; // Import our new component
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastAction } from '@/components/ui/toast';

interface ChatProps {
  userProfile: UserProfile
  signOut: () => Promise<void>
}

export default function Chat({ userProfile, signOut }: ChatProps) {
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
    isLoadingHistory,
    // Get the new state from our hook
    isOnboarding,
    currentOnboardingQuestion,
    handleOnboardingAnswer,
  } = useChat(userProfile);

  const { toast, toasts, removeToast } = useToast();

  return (
    <ToastProvider>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="flex flex-col h-screen bg-navy-deep relative"
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="h-2 bg-gradient-to-r from-teal-accent/20 via-teal-accent to-teal-accent/20" />
        
        <Header 
          onClearChat={clearChat} 
          userName={userProfile.name} 
          signOut={signOut}
        />
        
        <MessageList
          messages={messages}
          isTyping={isTyping || isGenerating} // Show typing indicator during generation
          onRetry={retryLastMessage}
          onFeedback={updateMessageFeedback}
        />

        {/* Conditionally render onboarding options */}
        {isOnboarding && currentOnboardingQuestion?.type === 'choice' && (
          <OnboardingOptions 
            question={currentOnboardingQuestion}
            onAnswer={handleOnboardingAnswer}
          />
        )}

        {/* Context-aware suggestions: hide during onboarding and when last AI message is a question */}
        {(() => {
          const lastAi = [...messages].reverse().find(m => m.sender === 'tufti')
          const lastUser = [...messages].reverse().find(m => m.sender === 'user')
          const isQuestion = !!lastAi?.text?.trim()?.match(/[?]$/)
          const base = !isOnboarding && !isQuestion ? buildSuggestions(userProfile) : []
          const contextual = !isOnboarding && !isQuestion && lastUser?.text ? buildContextualSuggestions(lastUser.text) : []
          const items = [...contextual, ...base].slice(0, 4)
          if (!items || items.length === 0) return null
          return (
            <Suggestions
              suggestions={items}
              onSelect={(s) => sendMessage(s.prompt)}
            />
          )
        })()}

        {chatError && (
          <div className="px-4 py-2 text-center text-red-500 bg-red-900/30 border-t border-b border-red-800/50 text-sm">
            {chatError}
          </div>
        )}

        {!(isOnboarding && currentOnboardingQuestion?.type === 'choice') && (
          <ChatInput 
            onSendMessage={sendMessage} 
            // During onboarding text question we still allow typing; otherwise standard gating
            disabled={isSending || isGenerating}
            isGenerating={isGenerating}
          />
        )}
        
        <div className="h-2 bg-gradient-to-r from-teal-accent/20 via-teal-accent to-teal-accent/20" />
      </div>
      
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
  );
}