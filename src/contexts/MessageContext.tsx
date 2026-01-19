import { createContext, useContext, ReactNode } from 'react'
import type { Message } from '@/lib/types'

interface MessageContextValue {
  updateMessageFeedback: (messageId: string, feedback: Message['feedback']) => void
  retryMessage: (messageId: string) => void
  copyMessage: (text: string) => Promise<void>
  // TTS methods
  toggleSpeak: (text: string, messageId: string) => void
  isSpeakingMessage: (messageId: string) => boolean
  currentSpeakingMessageId: string | null
}

const MessageContext = createContext<MessageContextValue | undefined>(undefined)

export function MessageProvider({ children, value }: {
  children: ReactNode
  value: MessageContextValue
}) {
  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  )
}

export function useMessage() {
  const context = useContext(MessageContext)
  if (!context) {
    throw new Error('useMessage must be used within a MessageProvider')
  }
  return context
}