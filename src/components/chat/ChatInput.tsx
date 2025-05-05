import { useState, useRef, memo, useEffect } from 'react'
import { Plus, SlidersHorizontal, ArrowUp } from 'lucide-react'
import { useInputAnimation } from '@/hooks/useInputAnimation'
import { motion, AnimatePresence } from 'framer-motion'
import { useInputValidation } from '@/hooks/useInputValidation'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import { cn } from '@/lib/utils'
import TextareaAutosize from 'react-textarea-autosize'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  isGenerating?: boolean
  className?: string
}

const ChatInput = memo(({ 
  onSendMessage, 
  disabled, 
  isGenerating,
  className 
}: ChatInputProps) => {
  console.log("ChatInput rendering. isGenerating:", isGenerating);

  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { error, validate, clearError } = useInputValidation()
  const { lightTap, success } = useHapticFeedback()

  useEffect(() => {
    console.log('ChatInput State:', { inputValue, disabled, isGenerating });
  }, [inputValue, disabled, isGenerating]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log("handleInputChange called, value:", e.target.value);
    setInputValue(e.target.value);
  };

  const handleSend = async () => {
    console.log('handleSend attempt:', { 
      inputValue: inputValue,
      trimmed: inputValue.trim(), 
      disabled: disabled, 
      conditionMet: inputValue.trim() && !disabled && validate(inputValue)
    });
    if (inputValue.trim() && !disabled && validate(inputValue)) {
      console.log('Send condition MET. Calling onSendMessage...');
      success()
      onSendMessage(inputValue.trim())
      setInputValue('')
      clearError()
      inputRef.current?.focus()
    } else {
      console.log('Send condition NOT MET.');
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    console.log("handleKeyPress called, key:", e.key);
    if (e.key === 'Enter' && !e.shiftKey) {
      console.log("Enter pressed without shift. Preventing default and calling handleSend.");
      e.preventDefault()
      handleSend()
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
    lightTap()
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  return (
    <motion.div
      className={cn("p-3", className)}
      role="form"
    >
      <div className={cn(
        "relative max-w-3xl mx-auto flex flex-col gap-2.5 rounded-xl p-3",
        "transition-all duration-500 ease-in-out",
        isFocused 
          ? 'bg-white border-teal-accent shadow-lg'
          : 'bg-navy-deep/60 backdrop-blur-sm border border-teal-accent/20 shadow-md'
      )}>
        <div className="relative">
          <TextareaAutosize
            ref={inputRef as any}
            placeholder="Direct your scene..."
            aria-label="Chat message input"
            value={inputValue}
            minRows={1}
            maxRows={6}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            className={cn(
              "w-full flex-1 resize-none overflow-y-auto",
              "bg-transparent border-transparent focus:border-transparent",
              "font-modern",
              "focus-visible:outline-none",
              "rounded-lg",
              isFocused 
                ? 'text-gray-800 placeholder:text-gray-500' 
                : 'text-gray-100 placeholder:text-gray-400',
              error && "ring-1 ring-red-500"
            )}
          />
        </div>

        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                "text-center text-sm font-baroque italic overflow-hidden",
                isFocused ? "text-teal-accent/90" : "text-teal-accent/80"
              )}
            >
              Composing the next scene...
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between px-1 gap-2.5">
          <div className="flex gap-1">
            <Button 
              variant="ghost"
              size="icon"
              className={cn(
                "w-8 h-8 rounded-xl transition-colors duration-200",
                isFocused 
                  ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-200 border border-gray-300'
                  : 'text-gray-300 hover:text-gray-100 hover:bg-teal-accent/10 border border-teal-accent/20'
              )}
              aria-label="Attach file" 
              disabled={disabled}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost"
              size="icon"
              className={cn(
                "w-8 h-8 rounded-xl transition-colors duration-200",
                isFocused 
                  ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-200 border border-gray-300'
                  : 'text-gray-300 hover:text-gray-100 hover:bg-teal-accent/10 border border-teal-accent/20'
              )}
              aria-label="Adjust settings" 
              disabled={disabled}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>

          <div className={cn(
            "text-center text-xs mt-2 absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap transition-colors duration-300",
            isFocused ? 'text-gray-400' : 'text-teal-accent/60'
          )}>
            Scene Guidance: Tufti
          </div>

          <div className="relative w-8 h-8 flex-shrink-0">
            <Button
              key="send"
              onClick={handleSend}
              disabled={!inputValue.trim() || disabled}
              size="icon"
              className={cn(
                "absolute inset-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                isFocused ? 
                  'bg-gray-800 hover:bg-gray-900 text-white disabled:bg-gray-300 disabled:text-gray-500 focus-visible:ring-gray-800' : 
                  'bg-teal-accent/20 hover:bg-teal-accent/30 text-teal-accent disabled:bg-navy-deep/50 disabled:text-gray-500 focus-visible:ring-teal-accent',
                "disabled:cursor-not-allowed"
              )}
              aria-label="Send message"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
})

ChatInput.displayName = 'ChatInput'

export default ChatInput