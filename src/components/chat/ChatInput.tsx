import { useState, useRef, memo, useEffect, useCallback } from 'react'
import { Plus, ArrowUp, Mic, History as HistoryIcon, ChevronDown, FileText, X, Sparkles, FlaskConical } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInputValidation } from '@/hooks/useInputValidation'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import { cn } from '@/lib/utils'
import TextareaAutosize from 'react-textarea-autosize'
import { Button } from '@/components/ui/button'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useToast } from '@/components/ui/use-toast'

const LONG_INPUT_THRESHOLD = 500
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

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
  const [inputValue, setInputValue] = useState('')
  const [isInputExpanded, setIsInputExpanded] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { error, validate, clearError } = useInputValidation()
  const { lightTap, success } = useHapticFeedback()
  const { toast } = useToast()

  const {
    isListening,
    fullTranscript,
    isSupported: isVoiceSupported,
    toggleListening,
    clearTranscript
  } = useSpeechRecognition()

  useEffect(() => {
    if (pendingSuggestion && pendingSuggestion.trim()) {
      setInputValue(pendingSuggestion)
      setIsInputExpanded(true)
      inputRef.current?.focus()
      onClearSuggestion?.()
    }
  }, [pendingSuggestion, onClearSuggestion])

  useEffect(() => {
    if (fullTranscript) {
      setInputValue(prev => {
        if (prev && !prev.endsWith(' ')) {
          return prev + ' ' + fullTranscript
        }
        return fullTranscript
      })
    }
  }, [fullTranscript])

  useEffect(() => {
    if (!isListening && fullTranscript) {
      clearTranscript()
    }
  }, [isListening, fullTranscript, clearTranscript])

  const isLongInput = inputValue.length > LONG_INPUT_THRESHOLD
  const shouldShowCollapsed = isLongInput && !isInputExpanded

  useEffect(() => {
    if (!droppedFiles || droppedFiles.length === 0) return

    const processFiles = async () => {
      for (const file of droppedFiles) {
        if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
          toast({
            title: "Unsupported File",
            description: `"${file.name}" is not a supported image type.`,
            variant: "destructive"
          })
          continue
        }

        if (file.size > MAX_IMAGE_SIZE) {
          toast({
            title: "File Too Large",
            description: `"${file.name}" exceeds the 5MB limit.`,
            variant: "destructive"
          })
          continue
        }

        const reader = new FileReader()
        reader.onload = (event) => {
          const result = event.target?.result as string
          if (result) {
            const base64Data = result.split(',')[1]
            setUploadedImages(prev => [...prev, {
              data: base64Data,
              mediaType: file.type as MediaType,
              preview: result
            }])
          }
        }
        reader.readAsDataURL(file)
      }
      onClearDroppedFiles?.()
    }

    processFiles()
  }, [droppedFiles, onClearDroppedFiles, toast])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    console.log('📎 Files selected:', files.length)

    for (const file of Array.from(files)) {
      if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        toast({
          title: "Unsupported File",
          description: `"${file.name}" is not a supported image type.`,
          variant: "destructive"
        })
        continue
      }

      if (file.size > MAX_IMAGE_SIZE) {
        toast({
          title: "File Too Large",
          description: `"${file.name}" exceeds the 5MB limit.`,
          variant: "destructive"
        })
        continue
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        if (result) {
          const base64Data = result.split(',')[1]
          // Add to state with full preview
          setUploadedImages(prev => {
            const updated = [...prev, {
              data: base64Data,
              mediaType: file.type as MediaType,
              preview: result
            }]
            console.log('✅ Image added! Total:', updated.length)
            return updated
          })
        }
      }
      reader.onerror = () => {
        console.error('❌ FileReader error:', file.name)
      }
      reader.readAsDataURL(file)
    }

    e.target.value = ''
  }, [toast])

  const removeImage = useCallback((index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }

  const handleSend = async () => {
    const hasText = inputValue.trim().length > 0
    const hasImages = uploadedImages.length > 0

    if ((hasText || hasImages) && !disabled && !isGenerating && (hasText ? validate(inputValue) : true)) {
      success()
      const imagesForApi: ApiImage[] = uploadedImages.map(({ data, mediaType }) => ({ data, mediaType }))
      onSendMessage(inputValue.trim() || 'What do you see in this image?', imagesForApi.length > 0 ? imagesForApi : undefined)
      setInputValue('')
      setUploadedImages([])
      try { localStorage.removeItem('chat_draft') } catch { }
      clearError()
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !(e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape' && isGenerating && onCancelGeneration) {
      e.preventDefault()
      onCancelGeneration()
    }
  }

  const handleFocus = () => {
    lightTap()
  }

  useEffect(() => {
    try {
      const draft = localStorage.getItem('chat_draft')
      if (draft) setInputValue(draft)
    } catch { }
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    try { localStorage.setItem('chat_draft', inputValue) } catch { }
  }, [inputValue])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        if (onToggleThinking && !disabled) onToggleThinking()
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        if (onToggleDeepResearch && !disabled) onToggleDeepResearch()
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault()
        if (onToggleDeepExperiment && !disabled) onToggleDeepExperiment()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [onToggleThinking, onToggleDeepResearch, onToggleDeepExperiment, disabled])

  return (
    <motion.div
      className={cn("pt-0 pb-4 px-4 safe-area-bottom", className)}
      role="form"
    >
      <div className={cn(
        "relative max-w-3xl mx-auto flex flex-col gap-2 rounded-3xl p-3 md:p-3.5",
        "transition-all duration-300 ease-in-out",
        "bg-zinc-900/40 border border-white/10 shadow-2xl backdrop-blur-2xl",
        "focus-within:bg-zinc-900/50 focus-within:border-white/20 focus-within:ring-1 focus-within:ring-teal-500/20"
      )}>
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

        {/* IMAGE PREVIEWS - NOW ALWAYS VISIBLE */}
        <AnimatePresence>
          {uploadedImages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="pb-3 border-t border-white/10 pt-3"
            >
              <div className="flex items-center gap-2 mb-3">
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
                    <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/30 via-transparent to-teal-500/30 rounded-xl opacity-60" />
                    <img
                      src={img.preview}
                      alt={`Upload ${index + 1}`}
                      className="relative w-24 h-24 object-cover rounded-lg border-2 border-white/20 shadow-lg"
                      loading="eager"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
                      aria-label="Remove image"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between pt-2 gap-2">
          <div className="flex gap-2 items-center overflow-x-auto scrollbar-hide flex-1 min-w-0">
            <div className="relative">
              <input
                type="file"
                id="file-upload"
                className="sr-only"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={handleFileSelect}
                disabled={disabled}
              />
              <label
                htmlFor="file-upload"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer transition-all active:scale-90",
                  disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                )}
                aria-label="Upload image or file"
                title="Click to upload images"
              >
                <Plus className="w-5 h-5" />
              </label>
            </div>
            {onToggleThinking && (
              <div className="relative group">
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
                >
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
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                  <div className="relative z-10">
                    <motion.div
                      animate={isThinkingEnabled ? { rotate: [0, 360] } : { rotate: 0 }}
                      transition={{ rotate: { duration: 20, repeat: Infinity, ease: "linear" } }}
                    >
                      <HistoryIcon className={cn(
                        "w-4 h-4 transition-all duration-500",
                        isThinkingEnabled
                          ? "text-[#4A90E2] drop-shadow-[0_0_8px_rgba(74,144,226,0.7)] filter brightness-110"
                          : "text-zinc-400 group-hover:text-zinc-300"
                      )} />
                    </motion.div>
                  </div>
                  <span className={cn(
                    "hidden sm:inline text-[11px] font-bold tracking-[0.12em] z-10 relative uppercase italic",
                    isThinkingEnabled ? "text-[#4A90E2]" : "text-zinc-500 group-hover:text-zinc-300"
                  )}>
                    Presence
                  </span>
                </motion.button>
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
                >
                  <div className="relative z-10">
                    <motion.div
                      animate={isDeepResearchEnabled ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : { scale: 1, rotate: 0 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Sparkles className={cn(
                        "w-4 h-4 transition-all duration-500",
                        isDeepResearchEnabled ? "text-amber-400" : "text-zinc-400 group-hover:text-zinc-300"
                      )} />
                    </motion.div>
                  </div>
                  <span className={cn(
                    "hidden sm:inline text-[11px] font-bold tracking-[0.12em] z-10 relative uppercase italic",
                    isDeepResearchEnabled ? "text-amber-400" : "text-zinc-500 group-hover:text-zinc-300"
                  )}>
                    Oracle
                  </span>
                </motion.button>
              </div>
            )}
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
                >
                  <div className="relative z-10">
                    <motion.div
                      animate={isDeepExperimentEnabled ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] } : { scale: 1, rotate: 0 }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <FlaskConical className={cn(
                        "w-4 h-4 transition-all duration-500",
                        isDeepExperimentEnabled ? "text-violet-400" : "text-zinc-400 group-hover:text-zinc-300"
                      )} />
                    </motion.div>
                  </div>
                  <span className={cn(
                    "hidden sm:inline text-[11px] font-bold tracking-[0.12em] z-10 relative uppercase italic",
                    isDeepExperimentEnabled ? "text-violet-400" : "text-zinc-500 group-hover:text-zinc-300"
                  )}>
                    Experiment
                  </span>
                </motion.button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
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
              >
                <Mic className="w-4 h-4" />
              </motion.button>
            )}

            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="stop"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <button
                    onClick={onCancelGeneration}
                    className="h-10 w-10 rounded-full bg-[#D97757] flex items-center justify-center hover:bg-[#c96a4d] active:scale-95 transition-all cursor-pointer"
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
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}

                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim() && uploadedImages.length === 0 || disabled}
                    size="icon"
                    className={cn(
                      "relative h-10 w-10 rounded-[14px] transition-all duration-300 z-10",
                      "bg-[#D97757] text-white shadow-lg",
                      "hover:bg-[#e88868] hover:scale-105 active:scale-95",
                      "disabled:bg-[#1a1a1e] disabled:text-zinc-700 disabled:shadow-none",
                      (inputValue.trim() || uploadedImages.length > 0) && !disabled && "shadow-[0_0_20px_rgba(217,119,87,0.4)]"
                    )}
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