import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Image, Paperclip, Send, Star } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import MessageList from './chat/MessageList'
import { useChat } from '@/hooks/useChat'

export default function ChatInterface() {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { messages, isTyping, sendMessage } = useChat()

  const handleSend = async () => {
    if (inputValue.trim() && !isTyping) {
      await sendMessage(inputValue.trim())
      setInputValue('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-claude-bg">
      <header className="flex items-center justify-between px-6 py-3 border-b border-claude-border bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-claude-accent text-2xl">✺</span>
          <h1 className="text-lg font-medium">Claude</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-claude-text">
            Friendly Assistance Requested
          </Button>
          <Button variant="ghost" size="icon">
            <Star className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <MessageList messages={messages} isTyping={isTyping} />

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-t border-claude-border bg-white/50 backdrop-blur-sm p-4"
      >
        <div className="max-w-4xl mx-auto flex items-end gap-2">
          <div className="flex-1 bg-white rounded-lg shadow-sm">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Message Claude..."
              className="min-h-[44px] bg-transparent border-0 focus:ring-0 placeholder-gray-400"
              disabled={isTyping}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" disabled={isTyping}>
              <Image className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" disabled={isTyping}>
              <Paperclip className="w-5 h-5" />
            </Button>
            <Button 
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              variant="ghost"
              size="icon"
              className="text-claude-primary"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}