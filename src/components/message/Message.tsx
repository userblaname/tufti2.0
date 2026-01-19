import { memo, useState } from 'react'
import { cn } from '@/lib/utils'
import MessageContent from './MessageContent'
import MessageActions from './MessageActions'
import { useMessage } from '@/contexts/MessageContext'
import type { Message as MessageType } from '@/lib/types'

interface MessageProps {
  message: MessageType
  showRetry?: boolean
  isLastAIMessage?: boolean
  isGenerating?: boolean
  isThinking?: boolean
  onEdit?: (messageId: string, newText: string) => void
  className?: string
}

const Message = memo(({ message, isLastAIMessage, isGenerating, isThinking, onEdit, className }: MessageProps) => {
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(message.text)
  const { toggleSpeak, isSpeakingMessage } = useMessage()

  const handleCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleStartEdit = () => {
    setEditText(message.text)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setEditText(message.text)
    setIsEditing(false)
  }

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message.text && onEdit) {
      onEdit(message.id, editText.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit()
    }
    if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        "flex mb-2 md:mb-3 transition-all duration-300",
        className
      )}
    >
      <div
        className={cn(
          "relative group max-w-[90%]",
          message.sender === "user" ? "ml-auto w-fit" : "w-full"
        )}
      >
        {/* Edit mode for user messages */}
        {message.sender === "user" && isEditing ? (
          <div className="flex flex-col gap-2 w-full min-w-[300px]">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3 bg-[#2a2a2e] border border-zinc-600 rounded-xl text-[#D1D1CB] 
                         resize-none focus:outline-none focus:border-[#D97757] transition-colors"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editText.trim() || editText === message.text}
                className="px-4 py-1.5 text-sm bg-[#D97757] text-white rounded-lg 
                           hover:bg-[#c96747] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save & Resend
              </button>
            </div>
          </div>
        ) : (
          <>
            <MessageContent
              message={message}
              isThinking={isLastAIMessage && isGenerating && isThinking}
              isStreaming={isLastAIMessage && isGenerating && !isThinking}
            />

            {message.sender === "tufti" && (
              <>
                <div
                  className={cn(
                    "transition-opacity duration-200",
                    isLastAIMessage ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                >
                  <MessageActions
                    text={message.text}
                    copied={copied}
                    onCopied={handleCopied}
                    messageId={message.id}
                    isAIMessage={true}
                    isSpeaking={isSpeakingMessage(message.id)}
                    onToggleSpeak={() => toggleSpeak(message.text, message.id)}
                  />
                </div>
                {isLastAIMessage && (
                  <p className="text-[11px] text-zinc-600 mt-3 pl-4 flex items-center gap-1.5 select-none">
                    <span className="w-1 h-1 rounded-full bg-zinc-600/50"></span>
                    <span className="opacity-70">Tufti can make mistakes. Please double-check responses.</span>
                  </p>
                )}
              </>
            )}

            {/* Edit button for user messages - appears below on hover */}
            {message.sender === "user" && onEdit && (
              <div className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
                  title="Edit message"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                  </svg>
                  Edit
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
})

Message.displayName = 'Message'

export default Message