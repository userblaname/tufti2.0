import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface MessageContentProps {
  message: Message
  className?: string
}

const MessageContent = memo(({ message, className }: MessageContentProps) => {
  const isTuftiMessage = message.sender === "tufti";
  const isEmpty = isTuftiMessage && !message.text;
  
  // Common content rendered via ReactMarkdown
  const content = isEmpty ? (
    <span className="inline-block ml-1">▋</span>
  ) : (
    <ReactMarkdown>{message.text}</ReactMarkdown> 
  );

  // Conditional rendering based on sender
  if (message.sender === "user") {
    // User message: Apply precise Claude bubble style
    return (
      <div
        className={cn(
          "relative rounded-xl", // Keep rounding
          "bg-white", // Updated user message background to white
          "pl-2.5 py-2.5 pr-6", 
          "flex items-start gap-2", // Changed gap from 3 to 2
          "max-w-2xl break-words", // Add max-width and break-words
          className
        )}
      >
        {/* Updated User Avatar for contrast */}
        <Avatar className="flex-shrink-0 w-7 h-7">
          {/* Navy background, white text */}
          <AvatarFallback className="bg-navy-deep text-white font-bold text-xs">U</AvatarFallback>
        </Avatar>
        {/* Text Content Area */}
        <div 
          className={cn(
            "prose prose-sm md:prose-base", // Removed max-w-none previously, relying on parent constraint
            "font-modern text-navy-deep", // Updated user message text color to navy-deep
            "prose-p:text-navy-deep prose-strong:text-navy-deep", // Ensure specific prose elements are also navy-deep
            "py-0.5", // Added vertical padding for text alignment like Claude
            "break-words" // Add break-words here as well
          )}
        >
          {content}
        </div>
      </div>
    );
  } else {
    // AI message: Render directly (bubble-less)
    return (
      <div className={cn(
        "flex items-start space-x-3",
        "p-3",
        className
      )}>
        {/* Apply prose styles directly to the content wrapper */}
        <div className={cn(
          "flex-1 overflow-hidden",
          "prose prose-invert",
          "text-gray-200",
          "prose-p:font-modern prose-p:text-gray-200",
          "prose-headings:text-teal-accent prose-strong:text-gray-100",
          "max-w-none",
          "break-words" // Add break-words here too for safety
        )}>
          {content}
        </div>
      </div>
    );
  }
})

MessageContent.displayName = 'MessageContent'

export default MessageContent