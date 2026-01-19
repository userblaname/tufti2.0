import { useState, useRef, memo, useEffect, useCallback } from 'react'
import { Plus, ArrowUp, Mic, History as HistoryIcon, ChevronDown, FileText, X, Sparkles, FlaskConical } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInputValidation } from '@/hooks/useInputValidation'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import { cn } from '@/lib/utils'
import TextareaAutosize from 'react-textarea-autosize'
import { Button } from '@/components/ui/button'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

// Constants for long input handling
const LONG_INPUT_THRESHOLD = 500 // Characters before collapsing
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB max per image
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// Image types
type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

type UploadedImage = {
  data: string
  mediaType: MediaType
  preview: string
}

type ApiImage = {
  data: string
  mediaType: MediaType
}

interface ChatInputProps {
  onSendMessage: (message: string, images?: ApiImage[]) => void
  disabled?: boolean
  isGenerating?: boolean
  className?: string
  isThinkingEnabled?: boolean
  onToggleThinking?: () => void
  droppedFiles?: File[]
  onClearDroppedFiles?: () => void
  onCancelGeneration?: () => void
  pendingSuggestion?: string
  onClearSuggestion?: () => void
  isDeepResearchEnabled?: boolean
  onToggleDeepResearch?: () => void
  isDeepExperimentEnabled?: boolean
  onToggleDeepExperiment?: () => void
}

const ChatInput = memo(({
  onSendMessage,
  disabled,
  isGenerating,
  className,
  isThinkingEnabled,
  onToggleThinking,
  droppedFiles,
  onClearDroppedFiles,
  onCancelGeneration,
  pendingSuggestion,
  onClearSuggestion,
  isDeepResearchEnabled,
  onToggleDeepResearch,
  isDeepExperimentEnabled,
  onToggleDeepExperiment
}: ChatInputProps) => {
  console.log("ChatInput rendering. isGenerating:", isGenerating);

  const [inputValue, setInputValue] = useState('')
  const [isInputExpanded, setIsInputExpanded] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { error, validate, clearError } = useInputValidation()
  const { lightTap, success } = useHapticFeedback()

  // Voice input
  const {
    isListening,
    fullTranscript,
    isSupported: isVoiceSupported,
    toggleListening,
    clearTranscript
  } = useSpeechRecognition()

  // Auto-fill from suggestion click
  useEffect(() => {
    if (pendingSuggestion && pendingSuggestion.trim()) {
      setInputValue(pendingSuggestion);
      setIsInputExpanded(true);
      inputRef.current?.focus();
      onClearSuggestion?.();
    }
  }, [pendingSuggestion, onClearSuggestion]);

  // Sync voice transcript to input
  useEffect(() => {
    if (fullTranscript) {
      setInputValue(prev => {
        // If already has content, append with space
        if (prev && !prev.endsWith(' ')) {
          return prev + ' ' + fullTranscript
        }
        return fullTranscript
      })
    }
  }, [fullTranscript])

  // Clear transcript when we successfully use it
  useEffect(() => {
    if (!isListening && fullTranscript) {
      clearTranscript()
    }
  }, [isListening, fullTranscript, clearTranscript])

  // Check if input is long enough to collapse
  const isLongInput = inputValue.length > LONG_INPUT_THRESHOLD
  const shouldShowCollapsed = isLongInput && !isInputExpanded

  // Process dropped files from drag-drop
  useEffect(() => {
    if (!droppedFiles || droppedFiles.length === 0) return

    const processFiles = async () => {
      for (const file of droppedFiles) {
        // Validate file type
        if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
          console.warn('Unsupported file type:', file.type)
          continue
        }

        // Validate file size
        if (file.size > MAX_IMAGE_SIZE) {
          console.warn('File too large:', file.size)
          continue
        }

        // Convert to base64
        const reader = new FileReader()
        reader.onload = (event) => {
          const result = event.target?.result as string
          if (result) {
            const base64Data = result.split(',')[1]
            const preview = result

            setUploadedImages(prev => [...prev, {
              data: base64Data,
              mediaType: file.type as MediaType,
              preview
            }])
          }
        }
        reader.readAsDataURL(file)
      }

      // Clear dropped files after processing
      onClearDroppedFiles?.()
    }

    processFiles()
  }, [droppedFiles, onClearDroppedFiles])

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      // Validate file type
      if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        console.warn('Unsupported file type:', file.type)
        continue
      }

      // Validate file size
      if (file.size > MAX_IMAGE_SIZE) {
        console.warn('File too large:', file.size)
        continue
      }

      // Convert to base64
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        if (result) {
          // Extract base64 data (remove data:image/xxx;base64, prefix)
          const base64Data = result.split(',')[1]
          const preview = result // Full data URL for preview

          setUploadedImages(prev => [...prev, {
            data: base64Data,
            mediaType: file.type as MediaType,
            preview
          }])
        }
      }
      reader.readAsDataURL(file)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Remove an uploaded image
  const removeImage = useCallback((index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }, [])

  useEffect(() => {
    console.log('ChatInput State:', { inputValue, disabled, isGenerating });
  }, [inputValue, disabled, isGenerating]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    console.log("handleInputChange called, value:", e.target.value);
    setInputValue(e.target.value);
  };

  const handleSend = async () => {
    const hasText = inputValue.trim().length > 0
    const hasImages = uploadedImages.length > 0

    console.log('handleSend attempt:', {
      inputValue: inputValue,
      trimmed: inputValue.trim(),
      disabled: disabled,
      hasImages: hasImages,
      conditionMet: (hasText || hasImages) && !disabled
    });

    // Allow sending with images even without text
    // But block sending if currently generating (typing is still allowed)
    if ((hasText || hasImages) && !disabled && !isGenerating && (hasText ? validate(inputValue) : true)) {
      console.log('--- DEV_LOG: ChatInput handleSend calling onSendMessage with', uploadedImages.length, 'images ---');
      success()

      // Send with images (stripped of preview for API)
      const imagesForApi: ApiImage[] = uploadedImages.map(({ data, mediaType }) => ({ data, mediaType }))
      onSendMessage(inputValue.trim() || 'What do you see in this image?', imagesForApi.length > 0 ? imagesForApi : undefined)

      setInputValue('')
      setUploadedImages([]) // Clear images after sending
      try { localStorage.removeItem('chat_draft') } catch { }
      clearError()
      inputRef.current?.focus()
    } else {
      console.log('Send condition NOT MET.');
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    console.log("handleKeyPress called, key:", e.key);
    if (e.key === 'Enter' && !e.shiftKey && !(e.metaKey || e.ctrlKey)) {
      console.log("Enter pressed without shift. Preventing default and calling handleSend.");
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
    // Cancel generation with Escape key
    if (e.key === 'Escape' && isGenerating && onCancelGeneration) {
      e.preventDefault()
      onCancelGeneration()
    }
  }

  const handleFocus = () => {
    // setIsFocused(true)
    lightTap()
  }

  const handleBlur = () => {
    // setIsFocused(false)
  }

  useEffect(() => {
    // restore draft
    try {
      const draft = localStorage.getItem('chat_draft')
      if (draft) setInputValue(draft)
    } catch { }
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    // persist draft
    try { localStorage.setItem('chat_draft', inputValue) } catch { }
  }, [inputValue])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Updated to Shift + Cmd + E as per premium mockup
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        if (onToggleThinking && !disabled) {
          onToggleThinking()
        }
      }
      // Add Shift + Cmd + D for Deep Research
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        if (onToggleDeepResearch && !disabled) {
          onToggleDeepResearch()
        }
      }
      // Add Shift + Cmd + X for Deep Experiment
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        if (onToggleDeepExperiment && !disabled) {
          onToggleDeepExperiment()
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [onToggleThinking, onToggleDeepResearch, onToggleDeepExperiment, disabled])

  return (
    <motion.div
      className={cn("pt-0 pb-4 px-4 safe-area-bottom", className)} /* Safe area for iPhone home bar */
      role="form"
    >
      <div className={cn(
        "relative max-w-3xl mx-auto flex flex-col gap-2 rounded-3xl p-3 md:p-3.5",
        "transition-all duration-300 ease-in-out",
        "bg-zinc-900/40 border border-white/10 shadow-2xl backdrop-blur-2xl", // Transparent glass effect
        "focus-within:bg-zinc-900/50 focus-within:border-white/20 focus-within:ring-1 focus-within:ring-teal-500/20"
      )}>
        {/* Collapsible Preview for Long Input */}
        <AnimatePresence>
          {shouldShowCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2"
            >
              <div className="bg-[#252529] rounded-xl border border-white/[0.06] p-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-zinc-400">Pasted content</span>
                      <span className="text-[10px] text-zinc-600 px-1.5 py-0.5 bg-white/5 rounded">
                        {inputValue.length.toLocaleString()} chars
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 line-clamp-2">
                      {inputValue.slice(0, 150)}...
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsInputExpanded(true)}
                  className="flex items-center gap-1.5 mt-2 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Expand to edit</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area - Collapsed or Expanded */}
        <div className={cn("relative", shouldShowCollapsed && "hidden")}>
          {isLongInput && isInputExpanded && (
            <button
              onClick={() => setIsInputExpanded(false)}
              className="absolute -top-6 right-0 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5 rotate-180" />
              <span>Collapse</span>
            </button>
          )}
          <TextareaAutosize
            ref={inputRef as any}
            placeholder="How can I help you today?"
            aria-label="Chat message input"
            value={inputValue}
            minRows={1}
            maxRows={isInputExpanded ? 15 : 6}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            className={cn(
              "w-full flex-1 resize-none overflow-y-auto",
              "bg-transparent border-transparent",
              "font-modern text-[16px] leading-relaxed",
              "focus-visible:outline-none focus:ring-0",
              "text-white/90 placeholder:text-zinc-500",
              "caret-[#D97757]",
              error && "ring-1 ring-destructive"
            )}
          />
        </div>

        {/* Image Previews - Artistic Gallery Style */}
        <AnimatePresence>
          {uploadedImages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pb-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-amber-400/80 font-medium">
                  📎 {uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} attached
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {uploadedImages.map((img, index) => (
                  <motion.div
                    key={index}
                    className="relative group"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {/* Film frame effect */}
                    <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/30 via-transparent to-teal-500/30 rounded-xl opacity-60" />
                    <img
                      src={img.preview}
                      alt={`Upload ${index + 1}`}
                      className="relative w-20 h-20 object-cover rounded-lg border-2 border-white/20 shadow-lg"
                    />
                    {/* Always visible remove button */}
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2 items-center">
            {/* Plus Button - triggers image/file upload */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Upload image or file"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="w-5 h-5" />
            </Button>
            {onToggleThinking && (
              <div
                className="relative group"
              >
                {/* Premium Thinking Mode Toggle */}
                <motion.button
                  onClick={onToggleThinking}
                  disabled={disabled}
                  className={cn(
                    "relative h-9 px-3.5 rounded-xl overflow-hidden group",
                    "transition-colors transition-opacity duration-500 ease-out",
                    "flex items-center gap-2",
                    "border backdrop-blur-xl",
                    "focus:outline-none focus-visible:outline-none",
                    isThinkingEnabled
                      ? "bg-gradient-to-r from-[#4A90E2]/15 via-[#4A90E2]/8 to-transparent border-[#4A90E2]/30 shadow-[0_0_12px_rgba(74,144,226,0.2)]"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                  aria-label="Toggle Extended Thinking"
                  title={isThinkingEnabled ? "Extended thinking On (⇧⌘E)" : "Extended thinking Off (⇧⌘E)"}
                >
                  {/* Animated Background Gradient */}
                  {isThinkingEnabled && (
                    <motion.div
                      className="absolute inset-0 opacity-40"
                      animate={{
                        background: [
                          'linear-gradient(90deg, transparent, rgba(74,144,226,0.15), transparent)',
                          'linear-gradient(90deg, transparent, rgba(74,144,226,0.25), transparent)',
                          'linear-gradient(90deg, transparent, rgba(74,144,226,0.15), transparent)',
                        ]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}

                  {/* Shimmer Overlay */}
                  {isThinkingEnabled && (
                    <motion.div
                      className="absolute inset-0 opacity-30"
                      style={{
                        background: 'linear-gradient(110deg, transparent 25%, rgba(74,144,226,0.4) 50%, transparent 75%)',
                      }}
                      animate={{
                        x: ['-200%', '200%']
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear",
                        repeatDelay: 2
                      }}
                    />
                  )}

                  {/* Icon with Advanced Animations */}
                  <div className="relative z-10">
                    {/* Spinning Circle Border */}
                    {isThinkingEnabled && (
                      <motion.div
                        className="absolute inset-0 -m-1.5"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      >
                        <svg className="w-7 h-7" viewBox="0 0 28 28">
                          <circle
                            cx="14"
                            cy="14"
                            r="12"
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeDasharray="75 150"
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#4A90E2" stopOpacity="0.8" />
                              <stop offset="50%" stopColor="#4A90E2" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#4A90E2" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </motion.div>
                    )}

                    <motion.div
                      animate={isThinkingEnabled ? {
                        rotate: [0, 360]
                      } : {
                        rotate: 0
                      }}
                      whileHover={{
                        rotate: isThinkingEnabled ? undefined : 15
                      }}
                      transition={{
                        rotate: { duration: 20, repeat: Infinity, ease: "linear" }
                      }}
                    >
                      <HistoryIcon className={cn(
                        "w-4 h-4 transition-all duration-500",
                        isThinkingEnabled
                          ? "text-[#4A90E2] drop-shadow-[0_0_8px_rgba(74,144,226,0.7)] filter brightness-110"
                          : "text-zinc-400 group-hover:text-zinc-300 group-hover:drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]"
                      )} />
                    </motion.div>
                  </div>

                  {/* Text Label with Glow */}
                  <span
                    className={cn(
                      "text-[11px] font-bold tracking-[0.12em] z-10 relative uppercase italic",
                      isThinkingEnabled ? "text-[#4A90E2]" : "text-zinc-500 group-hover:text-zinc-300"
                    )}>
                    Presence
                  </span>

                  {/* Breathing Border Glow */}
                  {isThinkingEnabled && (
                    <motion.div
                      className="absolute inset-0 rounded-xl opacity-50 pointer-events-none"
                      animate={{
                        boxShadow: [
                          '0 0 12px rgba(74,144,226,0.2), inset 0 0 12px rgba(74,144,226,0.1)',
                          '0 0 20px rgba(74,144,226,0.4), inset 0 0 16px rgba(74,144,226,0.2)',
                          '0 0 12px rgba(74,144,226,0.2), inset 0 0 12px rgba(74,144,226,0.1)',
                        ]
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}

                  {/* Corner Accent Particles */}
                  {isThinkingEnabled && (
                    <>
                      <motion.div
                        className="absolute top-0 right-0 w-1 h-1 bg-[#4A90E2] rounded-full opacity-60"
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 0.8, 0]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: 0
                        }}
                      />
                      <motion.div
                        className="absolute bottom-0 left-0 w-1 h-1 bg-[#4A90E2] rounded-full opacity-60"
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 0.8, 0]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: 1
                        }}
                      />
                    </>
                  )}

                  {/* Hover Magnetic Effect Background */}
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#4A90E2]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  />
                </motion.button>

                {/* Keyboard Shortcut Hint */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 rounded-md border border-white/10 backdrop-blur-xl pointer-events-none whitespace-nowrap"
                >
                  <span className="text-[10px] text-zinc-400 font-mono">⇧⌘E</span>
                </motion.div>
              </div>
            )}

            {onToggleDeepResearch && (
              <div className="relative group">
                <motion.button
                  onClick={onToggleDeepResearch}
                  disabled={disabled}
                  className={cn(
                    "relative h-9 px-4 rounded-xl overflow-hidden group",
                    "transition-all duration-500 ease-out",
                    "flex items-center gap-2",
                    "border backdrop-blur-xl",
                    "focus:outline-none focus-visible:outline-none",
                    isDeepResearchEnabled
                      ? "bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-transparent border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-[1.02]"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:scale-[1.02]"
                  )}
                  aria-label="Toggle Oracle Search"
                  title={isDeepResearchEnabled ? "Oracle On (⇧⌘D)" : "Oracle Off (⇧⌘D)"}
                >
                  {isDeepResearchEnabled && (
                    <motion.div
                      className="absolute inset-0 opacity-40"
                      animate={{
                        background: [
                          'linear-gradient(90deg, transparent, rgba(245,158,11,0.15), transparent)',
                          'linear-gradient(90deg, transparent, rgba(245,158,11,0.25), transparent)',
                          'linear-gradient(90deg, transparent, rgba(245,158,11,0.15), transparent)',
                        ]
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                  <div className="relative z-10">
                    <motion.div
                      animate={isDeepResearchEnabled ? {
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, -10, 0]
                      } : { scale: 1, rotate: 0 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Sparkles className={cn(
                        "w-4 h-4 transition-all duration-500",
                        isDeepResearchEnabled
                          ? "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]"
                          : "text-zinc-400 group-hover:text-zinc-300"
                      )} />
                    </motion.div>
                  </div>
                  <span className={cn(
                    "text-[11px] font-bold tracking-[0.12em] z-10 relative uppercase italic",
                    isDeepResearchEnabled ? "text-amber-400" : "text-zinc-500 group-hover:text-zinc-300"
                  )}>
                    Oracle
                  </span>
                </motion.button>

                {/* Keyboard Shortcut Hint */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 rounded-md border border-white/10 backdrop-blur-xl pointer-events-none whitespace-nowrap"
                >
                  <span className="text-[10px] text-zinc-400 font-mono">⇧⌘D</span>
                </motion.div>
              </div>
            )}

            {/* Deep Experiment Toggle */}
            {onToggleDeepExperiment && (
              <div className="relative group">
                <motion.button
                  onClick={onToggleDeepExperiment}
                  disabled={disabled}
                  className={cn(
                    "relative h-9 px-4 rounded-xl overflow-hidden group",
                    "transition-all duration-500 ease-out",
                    "flex items-center gap-2",
                    "border backdrop-blur-xl",
                    "focus:outline-none focus-visible:outline-none",
                    isDeepExperimentEnabled
                      ? "bg-gradient-to-r from-violet-500/25 via-purple-500/15 to-transparent border-violet-500/50 shadow-[0_0_20px_rgba(139,92,246,0.3)] scale-[1.02]"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:scale-[1.02]"
                  )}
                  aria-label="Toggle Deep Experiment"
                  title={isDeepExperimentEnabled ? "Experiment On (⇧⌘X)" : "Experiment Off (⇧⌘X)"}
                >
                  {isDeepExperimentEnabled && (
                    <motion.div
                      className="absolute inset-0 opacity-40"
                      animate={{
                        background: [
                          'linear-gradient(90deg, transparent, rgba(139,92,246,0.15), transparent)',
                          'linear-gradient(90deg, transparent, rgba(139,92,246,0.25), transparent)',
                          'linear-gradient(90deg, transparent, rgba(139,92,246,0.15), transparent)',
                        ]
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                  <div className="relative z-10">
                    <motion.div
                      animate={isDeepExperimentEnabled ? {
                        scale: [1, 1.15, 1],
                        rotate: [0, -5, 5, 0]
                      } : { scale: 1, rotate: 0 }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <FlaskConical className={cn(
                        "w-4 h-4 transition-all duration-500",
                        isDeepExperimentEnabled
                          ? "text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.7)]"
                          : "text-zinc-400 group-hover:text-zinc-300"
                      )} />
                    </motion.div>
                  </div>
                  <span className={cn(
                    "text-[11px] font-bold tracking-[0.12em] z-10 relative uppercase italic",
                    isDeepExperimentEnabled ? "text-violet-400" : "text-zinc-500 group-hover:text-zinc-300"
                  )}>
                    Experiment
                  </span>
                </motion.button>

                {/* Keyboard Shortcut Hint */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 rounded-md border border-white/10 backdrop-blur-xl pointer-events-none whitespace-nowrap"
                >
                  <span className="text-[10px] text-zinc-400 font-mono">⇧⌘X</span>
                </motion.div>
              </div>
            )}
          </div>

          {/* Right side: Voice + Send buttons */}
          <div className="flex items-center gap-1">
            {/* Voice Input Button */}
            {isVoiceSupported && (
              <motion.button
                onClick={toggleListening}
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center transition-all",
                  isListening
                    ? "bg-red-500/20 text-red-400 border border-red-500/50"
                    : "bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                )}
                animate={isListening ? { scale: [1, 1.05, 1] } : {}}
                transition={isListening ? { duration: 1, repeat: Infinity } : {}}
                aria-label={isListening ? "Stop recording" : "Start voice input"}
                title={isListening ? "Stop recording" : "Voice input"}
              >
                <Mic className="w-4 h-4" />
              </motion.button>
            )}

            {/* Send Button OR Stop Button */}
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="stop"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Claude-style Stop Button */}
                  <button
                    onClick={onCancelGeneration}
                    className="h-10 w-10 rounded-full bg-[#D97757] flex items-center justify-center hover:bg-[#c96a4d] active:scale-95 transition-all cursor-pointer"
                    aria-label="Stop generation"
                    title="Stop generating (Esc)"
                  >
                    <div className="w-3.5 h-3.5 bg-white rounded-[2px]" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="send"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="relative"
                >
                  {/* Animated Gradient Border Ring */}
                  {inputValue.trim() && !disabled && (
                    <motion.div
                      className="absolute inset-0 rounded-[14px] shiny-button-wrapper"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        background: 'conic-gradient(from var(--gradient-angle), transparent 0%, #F59E0B 10%, #D97757 25%, #F59E0B 40%, transparent 50%)',
                        padding: '2px',
                        borderRadius: '14px',
                      }}
                    >
                      <div className="w-full h-full rounded-[12px] bg-[#1a1a1e]" />
                    </motion.div>
                  )}

                  {/* Pulse Glow when ready */}
                  {inputValue.trim() && !disabled && (
                    <motion.div
                      className="absolute inset-0 rounded-[14px] pointer-events-none"
                      animate={{
                        boxShadow: [
                          '0 0 15px rgba(217, 119, 87, 0.3)',
                          '0 0 25px rgba(245, 158, 11, 0.5)',
                          '0 0 15px rgba(217, 119, 87, 0.3)',
                        ]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}

                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || disabled}
                    size="icon"
                    className={cn(
                      "relative h-10 w-10 rounded-[14px] transition-all duration-300 z-10",
                      "bg-[#D97757] text-white shadow-lg",
                      "hover:bg-[#e88868] hover:scale-105 active:scale-95",
                      "disabled:bg-[#1a1a1e] disabled:text-zinc-700 disabled:shadow-none",
                      inputValue.trim() && !disabled && "shadow-[0_0_20px_rgba(217,119,87,0.4)]"
                    )}
                    aria-label="Send message"
                  >
                    <ArrowUp className="w-5 h-5" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
})

ChatInput.displayName = 'ChatInput'

export default ChatInput