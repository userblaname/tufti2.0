import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Message } from '@/lib/types'

interface MessageContentProps {
  message: Message
}

const MessageContent = memo(({ message }: MessageContentProps) => (
  <div
    className={`
      relative rounded-lg shadow-md
      ${message.sender === "user" 
        ? "bg-gradient-to-br from-tufti-silver/90 to-tufti-silver/80 text-tufti-black rounded-tr-sm" 
        : "bg-tufti-surface text-tufti-white rounded-tl-sm"}
      prose prose-sm md:prose-base prose-invert max-w-none p-2 md:p-3 
    `}
  >
    <ReactMarkdown>{message.text}</ReactMarkdown>
  </div>
))

MessageContent.displayName = 'MessageContent'

export default MessageContent