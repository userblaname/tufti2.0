import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image, Paperclip, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import Message from './chat/Message'
import { useChat } from '@/hooks/useChat'

const ClaudeChat = () => {
  const [inputValue, setInputValue] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { messages, isTyping, sendMessage } = useChat()

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages])

  const handleSend = async () => {
    if (inputValue.trim() && !isTyping) {
      await sendMessage(inputValue.trim())
      setInputValue('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-claude-bg">
      <header className="flex items-center justify-between px-4 py-2 border-b border-claude-border">
        <div className="flex items-center space-x-2">
          <span className="text-claude-accent text-2xl">✺</span>
          <h1 className="text-lg font-medium">Claude</h1>
        </div>
        <Button variant="ghost" size="sm">
          Friendly Assistance Requested
        </Button>
      </header>

      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center space-x-2 text-sm text-gray-500"
            >
              <span className="text-claude-accent">✺</span>
              <span>Claude is thinking...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>

      <div className="border-t border-claude-border p-4">
        <div className="max-w-4xl mx-auto flex items-end space-x-2">
          <div className="flex-1 bg-white rounded-lg shadow-sm">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Message Claude..."
              className="min-h-[44px] bg-transparent border-0 focus:ring-0"
              disabled={isTyping}
            />
          </div>
          <div className="flex space-x-2">
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
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClaudeChat