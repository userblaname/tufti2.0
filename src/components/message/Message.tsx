import { memo, useState } from 'react'
import { cn } from '@/lib/utils'
// MessageAvatar import is no longer needed if component is removed
// import MessageAvatar from './MessageAvatar' 
import MessageContent from './MessageContent'
import MessageActions from './MessageActions'
import type { Message as MessageType } from '@/lib/types'

interface MessageProps {
  message: MessageType
  showRetry?: boolean
  isLastAIMessage?: boolean
  className?: string
}

const Message = memo(({ message, isLastAIMessage, className }: MessageProps) => {
  const [copied, setCopied] = useState(false)

  // Temporary copied visual toggle when child copy occurs
  const handleCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    // Outermost div - Removed alignment and horizontal padding
    <div 
      className={cn(
        "flex mb-2 md:mb-3", // Removed px-2 md:px-0
        className
      )}
    >
      {/* Message Content container */}
      <div className="relative group max-w-[90%]">
        <MessageContent message={message} />
        
        {message.sender === "tufti" && (
          <>
            <div 
              className={cn(
                "transition-opacity duration-200",
                // Actions visibility logic (show if last AI msg or on hover)
                isLastAIMessage ? "opacity-100" : "opacity-0 group-hover:opacity-100" 
              )}
            >
              <MessageActions
                text={message.text}
                copied={copied}
                onCopied={handleCopied}
              />
            </div>
            {isLastAIMessage && (
              <p className="text-xs text-gray-500 mt-1.5 pl-1 absolute left-0 top-full whitespace-nowrap">
                Tufti can make mistakes. Please double-check responses.
              </p>
            )}
          </>
        )}
         {/* Add Actions for User messages if needed */}
         {message.sender === "user" && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
               {/* Placeholder for potential user message actions */}
            </div>
         )}
      </div>
    </div>
  )
})

Message.displayName = 'Message'

export default Message