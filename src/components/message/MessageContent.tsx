import { memo, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'
import { Volume2, VolumeX, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/types'
import { ThinkingIndicator } from '@/components/chat/ThinkingIndicator'
import { MultiAgentThinking } from '@/components/chat/MultiAgentThinking'
import { useAudio } from '@/hooks/useAudio'

interface MessageContentProps {
  message: Message
  className?: string
  isThinking?: boolean
  isStreaming?: boolean  // Show blinking cursor when streaming
}


const MessageContent = memo(({ message, className, isThinking, isStreaming }: MessageContentProps) => {
  const isTuftiMessage = message.sender === "tufti";
  const isEmpty = isTuftiMessage && !message.text;
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [slideState, setSlideState] = useState<{ isLoading: boolean; imageBase64: string | null; error: string | null }>({
    isLoading: false,
    imageBase64: null,
    error: null
  });

  // Audio playback hook
  const { audioState, generateAndPlayAudio, stopAudio, isMessagePlaying } = useAudio();
  const isPlaying = isMessagePlaying(message.id);

  // Spotlight mouse tracking for user bubbles
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!bubbleRef.current) return;
    const rect = bubbleRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Display full text without truncation - ADD NULL FALLBACK
  let displayText = message.text || ''
  let extractedThoughts = message.thoughts || ''

  // Strip the <suggestions> block from display (it's parsed separately)
  if (displayText && displayText.includes('<suggestions>')) {
    displayText = displayText.replace(/<suggestions>[\s\S]*?<\/suggestions>/gi, '').trim();
  }

  // Extract and strip [COMPOSE_SLIDE: ...] tag for slide generation
  let slideDescription: string | null = null;
  if (displayText && displayText.includes('[COMPOSE_SLIDE:')) {
    const slideMatch = displayText.match(/\[COMPOSE_SLIDE:\s*([^\]]+)\]/i);
    if (slideMatch) {
      slideDescription = slideMatch[1].trim();
      displayText = displayText.replace(/\[COMPOSE_SLIDE:[^\]]+\]/gi, '').trim();
    }
  }

  // Generate slide handler
  const handleGenerateSlide = async () => {
    if (!slideDescription || slideState.isLoading) return;

    setSlideState({ isLoading: true, imageBase64: null, error: null });

    try {
      const response = await fetch('http://localhost:3001/api/slide/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: slideDescription })
      });

      const data = await response.json();

      if (data.success && data.imageBase64) {
        setSlideState({ isLoading: false, imageBase64: data.imageBase64, error: null });
      } else {
        setSlideState({ isLoading: false, imageBase64: null, error: data.error || 'Failed to generate' });
      }
    } catch (error) {
      setSlideState({ isLoading: false, imageBase64: null, error: 'Connection failed' });
    }
  };

  // Client-side fix for leaked <thinking> tags
  // This handles cases where the backend sends raw thinking tags in the content
  if (!extractedThoughts && displayText && displayText.trim().startsWith('<thinking>')) {
    const thinkingStart = displayText.indexOf('<thinking>')
    const thinkingEnd = displayText.indexOf('</thinking>')

    if (thinkingEnd !== -1) {
      // Complete thinking block found
      extractedThoughts = displayText.substring(thinkingStart + 10, thinkingEnd) // 10 is length of <thinking>
      displayText = displayText.substring(thinkingEnd + 11).trim() // 11 is length of </thinking>
    } else {
      // Incomplete/Streaming thinking block
      extractedThoughts = displayText.substring(thinkingStart + 10)
      displayText = "" // Hide text while thinking is streaming
    }
  }

  // Common content rendered via Markdown
  const content = isEmpty ? (
    <div className="flex items-center gap-3 h-6 pl-1 select-none">
      {/* Single Orbit Container */}
      <div className="relative w-6 h-6 flex items-center justify-center">

        {/* Core Nucleus */}
        <div className="w-1.5 h-1.5 bg-teal-200 rounded-full shadow-[0_0_8px_currentColor] z-10" />

        {/* The Ring (Inset to prevent clipping) */}
        <div className="absolute inset-[3px] border-[1px] border-teal-500/30 rounded-full w-[calc(100%-6px)] h-[calc(100%-6px)]" />

        {/* Orbiting Dot Container */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-[3px] w-[calc(100%-6px)] h-[calc(100%-6px)]"
        >
          {/* The Dot (Centered on the ring line) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_6px_currentColor]" />
        </motion.div>

        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-teal-400/5 blur-sm rounded-full" />
      </div>

      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-[10px] tracking-[0.2em] text-teal-300/90 font-mono font-medium uppercase"
      >
        Materializing
      </motion.span>

      {/* Concept Matrix: Floating abstract frames */}
      <div className="absolute -right-20 top-0 flex gap-2 pointer-events-none">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{
              opacity: [0, 0.4, 0.1, 0.3],
              scale: 1,
              y: [-2, 2, -1, 3],
              x: [0, i * 2, -i * 1]
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut"
            }}
            className={cn(
              "w-4 h-6 rounded border border-white/5 bg-teal-500/5 backdrop-blur-[2px]",
              i === 1 && "h-8 w-5 mt-1",
              i === 2 && "h-5 w-4 -mt-1"
            )}
          >
            {/* Interior "Data" line */}
            <motion.div
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2, repeat: Infinity, delay: i }}
              className="absolute inset-x-1 top-2 h-[1px] bg-teal-300/20"
            />
          </motion.div>
        ))}
      </div>
    </div>
  ) : (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Premium italic/emphasis styling for *stage directions*
        em: ({ children }) => (
          <em className="text-amber-200/90 not-italic font-medium bg-amber-500/5 px-1.5 py-0.5 rounded-md border-l-2 border-amber-400/40">
            {children}
          </em>
        ),
        // Strong text styling
        strong: ({ children }) => (
          <strong className="text-white font-semibold">{children}</strong>
        ),
        // Paragraph styling with proper em dash handling
        p: ({ children }) => (
          <p className="my-2 leading-relaxed">{children}</p>
        ),
        // Link styling
        a: ({ children, href }) => (
          <a href={href} className="text-teal-400 hover:text-teal-300 underline underline-offset-2 transition-colors">{children}</a>
        ),
        // Code styling
        code: ({ children }) => (
          <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-amber-200">{children}</code>
        ),
        // List styling
        ul: ({ children }) => (
          <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>
        ),
      }}
    >
      {displayText}
    </ReactMarkdown>
  );

  // Update ThinkingIndicator to use extractedThoughts if available
  // This needs to be passed to where ThinkingIndicator is rendered below


  // Conditional rendering based on sender
  if (message.sender === "user") {
    // User message: Compact, right-aligned bubble with spotlight effect
    return (
      <div
        ref={bubbleRef}
        onMouseMove={handleMouseMove}
        className={cn(
          "relative rounded-2xl overflow-hidden group/bubble",
          "bg-[#212126] border border-white/5", // Neutral Claude-style dark bubble
          "px-3 py-2",
          "flex items-start gap-2",
          "max-w-2xl break-words",
          "ml-auto w-fit",
          "transition-all duration-300",
          "hover:border-white/10",
          className
        )}
      >
        {/* Spotlight Glow Effect */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(300px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 255, 255, 0.06), transparent 40%)`
          }}
        />
        {/* Display uploaded images if present */}
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.images.map((img, index) => (
              <div
                key={index}
                className="relative group overflow-hidden rounded-xl"
              >
                {/* Film frame border effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-transparent to-teal-500/20 opacity-60 pointer-events-none" />

                <img
                  src={`data:${img.mediaType};base64,${img.data}`}
                  alt={`Uploaded image ${index + 1}`}
                  className="max-w-[200px] max-h-[200px] object-cover rounded-lg border border-white/10 shadow-lg"
                />

                {/* Subtle film grain overlay */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=&quot;0 0 200 200&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cfilter id=&quot;noiseFilter&quot;%3E%3CfeTurbulence type=&quot;fractalNoise&quot; baseFrequency=&quot;0.65&quot; numOctaves=&quot;3&quot; stitchTiles=&quot;stitch&quot;/%3E%3C/filter%3E%3Crect width=&quot;100%25&quot; height=&quot;100%25&quot; filter=&quot;url(%23noiseFilter)&quot;/%3E%3C/svg%3E')] opacity-[0.03] pointer-events-none" />
              </div>
            ))}
          </div>
        )}

        {/* Avatar removed for compact user bubble */}
        <div
          className={cn(
            "prose prose-invert prose-sm md:prose-base",
            "font-sans text-[#D1D1CB]", // Claude text color
            "prose-p:text-[#D1D1CB] prose-strong:text-white",
            "py-0.5",
            "break-words"
          )}
        >
          {content}
        </div>
      </div>
    );
  } else {
    // AI message: Claude-like, bubble-less presentation
    return (
      <div className={cn("flex flex-col w-full", className)}>
        {/* Render Multi-Agent Thinking if exists */}
        {message.agentThoughts && message.agentThoughts.length > 0 && (
          <MultiAgentThinking agents={message.agentThoughts!} />
        )}

        {/* Render Single-Agent Thinking Process if exists (and no multi-agent) */}
        {(!message.agentThoughts || message.agentThoughts.length === 0) && (
          <div className="w-full mb-1">
            <ThinkingIndicator isThinking={isThinking} thoughts={extractedThoughts || message.thoughts} />
          </div>
        )}

        <div className="flex items-start">
          <div
            className={cn(
              "flex-1 overflow-hidden",
              "prose prose-invert",
              "text-[#D1D1CB]",
              "prose-p:font-sans prose-p:text-[#D1D1CB] prose-p:leading-relaxed",
              "prose-headings:font-serif-display prose-headings:text-white",
              "prose-strong:text-white",
              "prose-h1:mt-2 prose-h1:mb-3 prose-h2:mt-2 prose-h2:mb-2 prose-h3:mt-2 prose-h3:mb-2",
              "max-w-none",
              "break-words",
              "px-4"
            )}
          >
            <motion.div
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="inline"
            >
              {content}
              {/* Blinking cursor while streaming */}
              {isStreaming && message.text && (
                <motion.span
                  className="inline-block w-[2px] h-[1.1em] bg-teal-400 ml-0.5 align-middle"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </motion.div>
          </div>
        </div>

        {/* Audio Controls - Premium Speak Button */}
        {!isStreaming && !isThinking && message.text && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 mt-3 px-4"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (isPlaying) {
                  stopAudio();
                } else {
                  generateAndPlayAudio(message.text, message.id);
                }
              }}
              disabled={audioState.isLoading}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg",
                "text-[11px] font-bold uppercase tracking-[0.1em] italic",
                "transition-all duration-300",
                "border backdrop-blur-sm",
                audioState.isLoading && "opacity-50 cursor-wait",
                isPlaying
                  ? "bg-teal-500/20 text-teal-400 border-teal-500/30 shadow-[0_0_12px_rgba(45,212,191,0.2)]"
                  : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-zinc-300"
              )}
            >
              {audioState.isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isPlaying ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <span>{isPlaying ? 'Stop' : 'Listen'}</span>
            </motion.button>

            {audioState.error && (
              <span className="text-[10px] text-red-400/70 italic">
                {audioState.error}
              </span>
            )}
          </motion.div>
        )}
      </div>
    );
  }
})

MessageContent.displayName = 'MessageContent'

export default MessageContent