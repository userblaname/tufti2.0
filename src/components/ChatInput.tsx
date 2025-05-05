import { useState, useRef, memo } from "react"
import { Send, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useHapticFeedback } from "@/hooks/useHapticFeedback"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled: boolean
  isGenerating: boolean
}

const inputVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
}

const buttonVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: "easeIn"
    }
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
      ease: "easeInOut"
    }
  }
}

const loadingVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear"
    }
  }
}

const ChatInput = memo(({ onSendMessage, disabled, isGenerating }: ChatInputProps) => {
  const [inputValue, setInputValue] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { lightTap, success } = useHapticFeedback()

  const handleSend = () => {
    if (inputValue.trim() && !disabled) {
      success()
      onSendMessage(inputValue.trim())
      setInputValue("")
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
    lightTap()
  }

  return (
    <motion.div
      variants={inputVariants}
      initial="hidden"
      animate="visible"
      className="relative p-3"
      role="form"
      aria-label="Message input"
    >
      <div className="max-w-3xl mx-auto">
        <div className={cn(
          "relative group transition-all duration-300",
          isFocused && "scale-[1.02]"
        )}>
          <div className={cn(
            "absolute inset-0 rounded-lg transition-all duration-300",
            "bg-gradient-to-r from-tufti-red/20 via-tufti-gold/20 to-tufti-red/20",
            "opacity-0 group-hover:opacity-100",
            isFocused && "opacity-100 blur-sm"
          )} />

          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              placeholder="Direct your scene..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={handleFocus}
              onBlur={() => setIsFocused(false)}
              disabled={disabled}
              className={cn(
                "w-full bg-input-bg text-input-text placeholder-tufti-silver/60",
                "border-none focus:ring-0 pr-12 py-3 px-4",
                "rounded-lg transition-all duration-300",
                "focus:shadow-[0_0_20px_rgba(255,0,51,0.15)]",
                "hover:shadow-[0_0_15px_rgba(255,0,51,0.1)]",
                "text-base",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              aria-label="Message input"
            />
            
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loading"
                  variants={buttonVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="absolute right-2"
                >
                  <motion.div
                    variants={loadingVariants}
                    animate="animate"
                    className="w-7 h-7 rounded-lg bg-tufti-red/10 flex items-center justify-center"
                  >
                    <Loader2 className="w-4 h-4 text-tufti-red" />
                  </motion.div>
                </motion.div>
              ) : (
                <motion.button
                  key="send"
                  variants={buttonVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={handleSend}
                  disabled={!inputValue.trim() || disabled}
                  className={cn(
                    "absolute right-2",
                    "w-7 h-7 rounded-lg",
                    "bg-gradient-to-r from-tufti-red to-tufti-red/80",
                    "flex items-center justify-center",
                    "transition-all duration-200",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "hover:shadow-[0_0_15px_rgba(255,0,51,0.3)]"
                  )}
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm text-tufti-silver/60 font-baroque italic"
          >
            Composing the next scene...
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
})

ChatInput.displayName = "ChatInput"

export default ChatInput