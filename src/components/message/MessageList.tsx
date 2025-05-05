import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Message from './Message'
import LoadingIndicator from '../chat/LoadingIndicator'
import type { Message as MessageType } from '@/lib/types'

interface MessageListProps {
  messages: MessageType[]
  isTyping: boolean
  className?: string
}

export default function MessageList({ messages, isTyping, className = '' }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const lastMessageLengthRef = useRef<number>(0)
  const lastMessagesLengthRef = useRef<number>(0)
  
  // Scroll to bottom when new messages are added or content streams in
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }
    
    // Check if messages were added or last message content changed
    const lastMessage = messages[messages.length - 1]
    const isNewMessage = messages.length !== lastMessagesLengthRef.current
    
    if (isNewMessage) {
      // Immediate scroll on new message
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
      }
    } else {
      // Check if text content is meaningfully different
      const lastMessageText = lastMessage?.text || '';
      const previousLength = lastMessageLengthRef.current || 0;
      
      // Only scroll if text has changed substantially (added more than 20 chars)
      if (lastMessageText.length > previousLength + 20) {
        // Smoother scroll during streaming if user hasn't scrolled up
        const container = messagesContainerRef.current;
        if (container) {
          const isScrolledToBottom = 
            container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
          
          if (isScrolledToBottom) {
            scrollToBottom();
          }
        }
        
        // Update length reference after scroll decision
        lastMessageLengthRef.current = lastMessageText.length;
      }
    }
    
    // Update messages length reference
    lastMessagesLengthRef.current = messages.length;
  }, [messages])
  
  return (
    <div ref={messagesContainerRef} className={`flex flex-col space-y-4 overflow-y-auto ${className}`}>
      <div className="flex flex-col space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            <Message message={message} />
          </div>
        ))}
        
        {isTyping && (
          <div className="pl-12">
            <LoadingIndicator />
          </div>
        )}
      </div>
      <div ref={messagesEndRef} />
    </div>
  )
}