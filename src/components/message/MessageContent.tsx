import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
    <ReactMarkdown
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
    </ReactMarkdown>
  );

  // Conditional rendering based on sender
  if (message.sender === "user") {
    // User message: Apply precise Claude bubble style
    return (
      <div
        className={cn(
          "relative rounded-xl",
          // Dark bubble to avoid white flash
          "bg-white/7 border border-white/15",
          "px-4 py-3",
          "flex items-start gap-2",
          "max-w-2xl break-words",
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
            "prose prose-invert prose-sm md:prose-base",
            "font-modern text-gray-200",
            "prose-p:text-gray-200 prose-strong:text-gray-100",
            "py-0.5",
            "break-words"
          )}
        >
          {content}
        </div>
      </div>
    );
  } else {
    // AI message: Render directly (bubble-less)
    return (
      <div
        className={cn(
          "relative rounded-xl",
          "bg-teal-accent/10 border border-teal-accent/25 shadow-[0_0_0_1px_rgba(56,178,172,0.15)]",
          "px-4 py-3",
          className
        )}
      >
        <div className="absolute left-0 top-0 h-full w-0.5 bg-teal-accent/60 rounded-l-xl" aria-hidden="true" />
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