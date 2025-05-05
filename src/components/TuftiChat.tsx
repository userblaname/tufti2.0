import { useState, lazy, Suspense } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useChat } from "@/hooks/useChat"
import Header from "./chat/Header"
import MessageList from "./chat/MessageList"
import ChatInput from "./ChatInput"
import LoadingSpinner from "./ui/loading-spinner"

const WelcomeScreen = lazy(() => import("./WelcomeScreen"))

export default function TuftiChat() {
  const [showWelcome, setShowWelcome] = useState(true)
  const { 
    messages, 
    isTyping, 
    isGenerating, 
    sendMessage, 
    updateMessageFeedback, 
    retryLastMessage,
    clearChat 
  } = useChat()

  const handleSendMessage = async (text: string) => {
    if (showWelcome) {
      setShowWelcome(false)
    }
    await sendMessage(text)
  }

  return (
    <div className="flex flex-col h-screen bg-[#F0EEE5]">
      <AnimatePresence mode="wait">
        {showWelcome ? (
          <Suspense fallback={<LoadingSpinner />}>
            <WelcomeScreen key="welcome" onStart={handleSendMessage} />
          </Suspense>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex flex-col h-screen max-w-6xl mx-auto p-4 md:p-6 rounded-lg shadow-lg text-[#100804]"
          >
            <Header onClearChat={clearChat} />
            
            <MessageList
              messages={messages}
              isTyping={isTyping}
              onRetry={retryLastMessage}
              onFeedback={updateMessageFeedback}
            />

            <ChatInput 
              onSendMessage={handleSendMessage} 
              disabled={isTyping} 
              isGenerating={isGenerating}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}