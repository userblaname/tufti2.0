import { memo, useState } from "react"
import { motion } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import MessageContent from "@/components/ui/message-content"
import MessageActions from "@/components/ui/message-actions"
import type { Message as MessageType } from "@/lib/types"

interface MessageProps {
  message: MessageType
  onRetry?: () => void
  onFeedback?: (feedback: MessageType['feedback']) => void
}

const Message = memo(({ message, onRetry, onFeedback }: MessageProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div 
      className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} mb-4 md:mb-6 px-2 md:px-0`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className={`flex items-end ${message.sender === "user" ? "flex-row-reverse" : ""} group max-w-[90%] md:max-w-[80%]`}>
        <div
          className={`${message.sender === "user" ? "ml-2 md:ml-3" : "mr-2 md:mr-3"}`}
        >
          <Avatar 
            className={`w-6 h-6 md:w-8 md:h-8 ${message.sender === "tufti" ? "baroque-float" : ""}`}
            role="img"
            aria-label={`${message.sender === "user" ? "User" : "Tufti"} avatar`}
          >
            <AvatarFallback 
              className={`
                ${message.sender === "user" 
                  ? "bg-tufti-silver text-tufti-black font-modern"
                  : "bg-tufti-red text-tufti-white font-baroque"}
                text-xs md:text-sm
              `}
            >
              {message.sender === "user" ? "U" : "T"}
            </AvatarFallback>
            <AvatarImage 
              src={message.sender === "user" ? "/user-avatar.png" : "/assets/tufti-throne.png"}
              alt={message.sender === "user" ? "User" : "Tufti on baroque throne"}
              className={message.sender === "tufti" ? "object-cover" : ""}
            />
          </Avatar>
        </div>

        <div className="relative">
          <MessageContent message={message} />
          
          {message.sender === "tufti" && (
            <div 
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <MessageActions
                onCopy={handleCopy}
                copied={copied}
                hasFeedback={!!message.feedback}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
})

Message.displayName = "Message"

export default Message