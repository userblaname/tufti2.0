import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import React from 'react'
const LazyMarkdown = React.lazy(async () => ({ default: ReactMarkdown }))
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface MessageContentProps {
  message: Message
  className?: string
}

const MessageContent = memo(({ message, className }: MessageContentProps) => {
  console.log("MessageContent rendering. Message text:", message.text);
  const isTuftiMessage = message.sender === "tufti";
  const isEmpty = isTuftiMessage && !message.text;
  
  // Common content rendered via Markdown for better structure (headings, lists)
  const content = isEmpty ? (
    <span className="inline-block ml-1">▋</span>
  ) : (
    <LazyMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ node, ...props }) => (
          <h1 className="mt-2 mb-3 text-2xl font-semibold text-teal-accent" {...props} />
        ),
        h2: ({ node, ...props }) => (
          <h2 className="mt-2 mb-2 text-xl font-semibold text-teal-accent" {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h3 className="mt-2 mb-2 text-lg font-semibold text-teal-accent" {...props} />
        ),
        p: ({ node, ...props }) => <p className="leading-relaxed" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1" {...props} />,
        li: ({ node, ...props }) => <li className="marker:text-teal-accent" {...props} />,
        blockquote: ({ node, ...props }) => (
          <blockquote className="border-l-2 border-teal-accent/40 pl-3 italic text-gray-300" {...props} />
        ),
        code: ({ inline, className, children, ...props }) =>
          inline ? (
            <code className="px-1 py-0.5 rounded bg-white/10 text-gray-100" {...props}>{children}</code>
          ) : (
            <pre className="rounded bg-white/5 p-3 overflow-x-auto">
              <code {...props}>{children}</code>
            </pre>
          ),
      }}
    >
      {message.text}
    </LazyMarkdown>
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
          "prose-h1:mt-2 prose-h1:mb-3 prose-h2:mt-2 prose-h2:mb-2 prose-h3:mt-2 prose-h3:mb-2",
          "max-w-none",
          "break-words"
        )}>
          {content}
        </div>
      </div>
    );
  }
})

MessageContent.displayName = 'MessageContent'

export default MessageContent