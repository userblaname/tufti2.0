import { useState, useRef, memo, useEffect, useCallback } from 'react'
import { Plus, ArrowUp, Mic, History as HistoryIcon, ChevronDown, FileText, X, Sparkles, FlaskConical, FileIcon, File as FileIconDoc } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInputValidation } from '@/hooks/useInputValidation'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import { cn } from '@/lib/utils'
import TextareaAutosize from 'react-textarea-autosize'
import { Button } from '@/components/ui/button'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useToast } from '@/components/ui/use-toast'

// File size constants
const LONG_INPUT_THRESHOLD = 500
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024 // 20MB

// Supported types
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

// Type definitions
type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
type DocumentType = 'application/pdf' | 'text/plain' | 'text/markdown' | 'application/msword' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

type UploadedImage = {
  id: string
  data: string
  mediaType: MediaType
  preview: string
  fileName: string
  type: 'image'
}

type UploadedDocument = {
  id: string
  data: string
  documentType: DocumentType
  fileName: string
  fileSize: number
  preview: string
  type: 'document'
}

type UploadedFile = UploadedImage | UploadedDocument

type ApiImage = {
  data: string
  mediaType: MediaType
}

type ApiDocument = {
  data: string
  documentType: DocumentType
  fileName: string
}

interface ChatInputProps {
  onSendMessage: (message: string, images?: ApiImage[], documents?: ApiDocument[]) => void
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
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
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

  // Helper functions
  const getFileCategory = useCallback((mimeType: string): 'image' | 'document' | null => {
    if (SUPPORTED_IMAGE_TYPES.includes(mimeType as any)) return 'image'
    if (SUPPORTED_DOCUMENT_TYPES.includes(mimeType as any)) return 'document'
    return null
  }, [])

  const isImageFile = (file: UploadedFile): file is UploadedImage => file.type === 'image'
  const isDocumentFile = (file: UploadedFile): file is UploadedDocument => file.type === 'document'

  // Read file as base64
  const readFileAsBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const result = reader.result as string
          const base64 = result.split(',')[1]
          resolve(base64)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`))
      reader.readAsDataURL(file)
    })
  }, [])

  // Extract text preview
  const extractTextPreview = useCallback(async (file: File): Promise<string> => {
    try {
      const text = await file.text()
      return text.substring(0, 100) + (text.length > 100 ? '...' : '')
    } catch {
      return `📝 ${file.name}`
    }
  }, [])

  // Process dropped files
  useEffect(() => {
    if (!droppedFiles || droppedFiles.length === 0) return

    const processFiles = async () => {
      for (const file of droppedFiles) {
        const fileType = getFileCategory(file.type)
        if (!fileType) continue

        const maxSize = fileType === 'image' ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE
        if (file.size > maxSize) continue

        const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const base64Data = await readFileAsBase64(file)

        if (fileType === 'image') {
          const blobUrl = URL.createObjectURL(file)
          setUploadedFiles(prev => [...prev, {
            id: fileId,
            data: base64Data,
            mediaType: file.type as MediaType,
            preview: blobUrl,
            fileName: file.name,
            type: 'image'
          }])
        } else {
          const preview = await extractTextPreview(file)
          setUploadedFiles(prev => [...prev, {
            id: fileId,
            data: base64Data,
            documentType: file.type as DocumentType,
            fileName: file.name,
            fileSize: file.size,
            preview,
            type: 'document'
          }])
        }
      }
      onClearDroppedFiles?.()
    }
    processFiles()
  }, [droppedFiles, onClearDroppedFiles, getFileCategory, readFileAsBase64, extractTextPreview])

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    console.log('📎 Processing files:', files.length)

    for (const file of Array.from(files)) {
      try {
        const fileType = getFileCategory(file.type)

        if (!fileType) {
          console.warn('❌ Unsupported type:', file.type)
          toast({
            title: "Unsupported File",
            description: `"${file.name}" is not supported. Use images (JPG, PNG, GIF, WebP), PDF, or text files.`,
            variant: "destructive"
          })
          continue
        }

        const maxSize = fileType === 'image' ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE
        if (file.size > maxSize) {
          console.warn('❌ File too large:', file.size)
          toast({
            title: "File Too Large",
            description: `"${file.name}" exceeds the ${fileType === 'image' ? '5MB' : '20MB'} limit.`,
            variant: "destructive"
          })
          continue
        }

        const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        if (fileType === 'image') {
          const blobUrl = URL.createObjectURL(file)
          const base64Data = await readFileAsBase64(file)

          setUploadedFiles(prev => [...prev, {
            id: fileId,
            data: base64Data,
            mediaType: file.type as MediaType,
            preview: blobUrl,
            fileName: file.name,
            type: 'image'
          }])
          console.log(`✅ Image loaded: ${file.name}`)

        } else {
          const base64Data = await readFileAsBase64(file)
          const preview = await extractTextPreview(file)

          setUploadedFiles(prev => [...prev, {
            id: fileId,
            data: base64Data,
            documentType: file.type as DocumentType,
            fileName: file.name,
            fileSize: file.size,
            preview,
            type: 'document'
          }])
          console.log(`✅ Document loaded: ${file.name}`)
        }

      } catch (error) {
        console.error('❌ Error processing file:', file.name, error)
        toast({
          title: "Error Processing File",
          description: `Failed to process "${file.name}".`,
          variant: "destructive"
        })
      }
    }

    e.target.value = ''
  }, [getFileCategory, readFileAsBase64, extractTextPreview, toast])

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => {
      const removed = prev.find(f => f.id === fileId)
      if (removed && isImageFile(removed) && removed.preview.startsWith('blob:')) {
        URL.revokeObjectURL(removed.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }

  const handleSend = async () => {
    const hasText = inputValue.trim().length > 0
    const hasFiles = uploadedFiles.length > 0

    if ((hasText || hasFiles) && !disabled && !isGenerating && (hasText ? validate(inputValue) : true)) {
      success()

      const images = uploadedFiles.filter(isImageFile)
      const documents = uploadedFiles.filter(isDocumentFile)

      const imagesForApi: ApiImage[] = images.map(({ data, mediaType }) => ({ data, mediaType }))
      const documentsForApi: ApiDocument[] = documents.map(({ data, documentType, fileName }) => ({
        data,
        documentType,
        fileName
      }))

      console.log('📤 Sending:', imagesForApi.length, 'images,', documentsForApi.length, 'documents')

      onSendMessage(
        inputValue.trim() || 'What do you see in this?',
        imagesForApi.length > 0 ? imagesForApi : undefined,
        documentsForApi.length > 0 ? documentsForApi : undefined
      )

      uploadedFiles.forEach(file => {
        if (isImageFile(file) && file.preview.startsWith('blob:')) {
          URL.revokeObjectURL(file.preview)
        }
      })

      setInputValue('')
      setUploadedFiles([])
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

        {/* FILE PREVIEWS - Images + Documents */}
        <AnimatePresence>
          {uploadedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="pb-3 border-t border-white/10 pt-3"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-wider text-amber-400/80 font-medium">
                  📎 {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} attached
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {uploadedFiles.map((file, index) => (
                  <motion.div
                    key={file.id}
                    className="relative group"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.08 }}
                  >
                    {isImageFile(file) ? (
                      // IMAGE PREVIEW
                      <>
                        <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/30 via-transparent to-teal-500/30 rounded-xl opacity-60" />
                        <img
                          src={file.preview}
                          alt={file.fileName}
                          className="relative w-24 h-24 object-cover rounded-lg border-2 border-white/20 shadow-lg"
                          loading="eager"
                          decoding="async"
                        />
                      </>
                    ) : (
                      // DOCUMENT PREVIEW
                      <div className="relative w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg border-2 border-white/20 shadow-lg flex flex-col items-center justify-center p-2">
                        <div className="text-2xl">
                          {file.documentType === 'application/pdf' ? '📄' : '📝'}
                        </div>
                        <div className="text-[8px] text-center text-white/80 truncate w-full">
                          {file.fileName.split('.')[0].substring(0, 10)}
                        </div>
                      </div>
                    )}

                    {/* Remove button */}
                    <motion.button
                      onClick={() => removeFile(file.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </motion.button>
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
                accept="image/jpeg,image/png,image/gif,image/webp,.pdf,.txt,.md,.doc,.docx"
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
                aria-label="Upload files"
                title="Click to upload images, PDFs, or text files"
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
                    disabled={!inputValue.trim() && uploadedFiles.length === 0 || disabled}
                    size="icon"
                    className={cn(
                      "relative h-10 w-10 rounded-[14px] transition-all duration-300 z-10",
                      "bg-[#D97757] text-white shadow-lg",
                      "hover:bg-[#e88868] hover:scale-105 active:scale-95",
                      "disabled:bg-[#1a1a1e] disabled:text-zinc-700 disabled:shadow-none",
                      (inputValue.trim() || uploadedFiles.length > 0) && !disabled && "shadow-[0_0_20px_rgba(217,119,87,0.4)]"
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