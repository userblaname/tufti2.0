// src/components/Chat.tsx

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useChat } from '@/hooks/useChat';
import Sidebar from './chat/Sidebar';
import ChatTopBar from './chat/ChatTopBar';
import MessageList from './chat/MessageList';
import ChatInput from './chat/ChatInput';
import { OnboardingOptions } from './onboarding/OnboardingOptions';
import CommandPalette from './command-palette/CommandPalette';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastAction } from '@/components/ui/toast';

interface ChatProps {
  userProfile: UserProfile;
  signOut: () => Promise<void>;
}

export default function Chat({ userProfile, signOut }: ChatProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    messages,
    isTyping,
    isGenerating,
    isSending,
    sendMessage,
    editMessage,
    updateMessageFeedback,
    retryLastMessage,
    clearChat,
    chatError,
    isLoadingHistory,
    isOnboarding,
    currentOnboardingQuestion,
    handleOnboardingAnswer,
    isThinkingEnabled,
    toggleThinkingMode,
    isDeepResearchEnabled,
    toggleDeepResearch,
    cancelGeneration,
    isThinking,
    isDeepExperimentEnabled,
    toggleDeepExperiment,
    // Pagination
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore,
  } = useChat(userProfile);

  const { toast, toasts, removeToast } = useToast();

  const handleNavigateToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash effect to highlight
      element.animate(
        [
          { backgroundColor: 'rgba(56, 178, 172, 0.1)' },
          { backgroundColor: 'transparent' }
        ],
        { duration: 2000, easing: 'ease-out' }
      );
    }
  };

  return (
    <ToastProvider>
      <div className="flex h-screen-safe bg-zinc-950 relative overflow-hidden safe-area-inset">
        <CommandPalette
          messages={messages}
          onNavigateToMessage={handleNavigateToMessage}
        />
        {/* Sidebar - left panel */}
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onClearChat={clearChat}
          onFillInput={sendMessage}
          signOut={signOut}
          userName={userProfile.name || 'User'}
          messageCount={messages.length}
        />

        {/* Main Chat Area */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="flex flex-col flex-1 relative"
        >
          <div className="relative z-10 flex flex-col h-full">

            <ChatTopBar
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            />

            <MessageList
              messages={messages}
              isTyping={isTyping || isGenerating}
              isThinking={isThinking}
              onRetry={retryLastMessage}
              onFeedback={updateMessageFeedback}
              onEdit={editMessage}
              onLoadMore={loadMoreMessages}
              hasMoreMessages={hasMoreMessages}
              isLoadingMore={isLoadingMore}
            />

            {/* Conditionally render onboarding options */}
            {isOnboarding && currentOnboardingQuestion?.type === 'choice' && (
              <OnboardingOptions
                question={currentOnboardingQuestion}
                onAnswer={handleOnboardingAnswer}
              />
            )}



            {chatError && (
              <div className="px-4 py-2 text-center text-red-500 bg-red-900/30 border-t border-b border-red-800/50 text-sm">
                {chatError}
              </div>
            )}

            {!(isOnboarding && currentOnboardingQuestion?.type === 'choice') && (
              <ChatInput
                onSendMessage={sendMessage}
                disabled={isSending}
                isGenerating={isGenerating}
                isThinkingEnabled={isThinkingEnabled}
                onToggleThinking={toggleThinkingMode}
                isDeepResearchEnabled={isDeepResearchEnabled}
                onToggleDeepResearch={toggleDeepResearch}
                isDeepExperimentEnabled={isDeepExperimentEnabled}
                onToggleDeepExperiment={toggleDeepExperiment}
                onCancelGeneration={cancelGeneration}
              />
            )}
          </div>

          {toasts.map((t) => (
            <Toast key={t.id} onOpenChange={(open) => { if (!open) removeToast(t.id); }}>
              {t.title && <ToastTitle>{t.title}</ToastTitle>}
              {t.description && <ToastDescription>{t.description}</ToastDescription>}
              <ToastAction altText="Retry" onClick={() => retryLastMessage()}>Retry</ToastAction>
            </Toast>
          ))}
          <ToastViewport />
        </motion.div>
      </div>
    </ToastProvider>
  );
}