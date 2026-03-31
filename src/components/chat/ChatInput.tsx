import { useState, useRef, memo, useEffect, useCallback } from 'react'
import { Plus, ArrowUp, Mic, History as HistoryIcon, ChevronDown, FileText, X, Sparkles, FlaskConical, MapPin, File, Code } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInputValidation } from '@/hooks/useInputValidation'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import { cn } from '@/lib/utils'
import TextareaAutosize from 'react-textarea-autosize'
import { Button } from '@/components/ui/button'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useToast } from '@/components/ui/use-toast'
import { useRealityAnchor } from '@/hooks/useRealityAnchor'
import { FileAttachmentCard, AttachmentCounter } from './FileAttachmentCard'

// Constants for long input handling
const LONG_INPUT_THRESHOLD = 500 // Characters before collapsing

// 🎯 PRODUCTION-GRADE FILE SETTINGS (Based on Claude AI specs)
// Source: Anthropic docs + Perplexity research (Jan 2026)
const FILE_SETTINGS = {
  // Image settings
  MAX_IMAGE_DIMENSION: 1200,
  JPEG_QUALITY: 0.8,
  MAX_IMAGE_ORIGINAL_DIMENSION: 8000,
  // PDF settings (Anthropic limits)
  MAX_PDF_SIZE: 32 * 1024 * 1024,   // 32MB per PDF
  MAX_PDF_PAGES: 100,                // 100 pages max
  // Text file settings
  MAX_TEXT_SIZE: 100 * 1024,         // 100KB for text files
  // General
  MAX_FILE_SIZE: 32 * 1024 * 1024,   // 32MB general limit
}

// 📁 SUPPORTED FILE TYPES
const SUPPORTED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf'],
  text: ['text/plain', 'text/markdown', 'text/csv'],
  code: [
    'text/javascript', 'application/javascript',
    'text/typescript', 'application/typescript',
    'text/x-python', 'application/x-python',
    'text/html', 'text/css',
    'application/json', 'text/json'
  ]
}

// File extension to MIME type mapping (for files without proper MIME)
const EXTENSION_TO_MIME: Record<string, string> = {
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.js': 'text/javascript',
  '.jsx': 'text/javascript',
  '.ts': 'text/typescript',
  '.tsx': 'text/typescript',
  '.py': 'text/x-python',
  '.html': 'text/html',
  '.css': 'text/css',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
}

// All supported MIME types flattened
const ALL_SUPPORTED_TYPES = [
  ...SUPPORTED_FILE_TYPES.images,
  ...SUPPORTED_FILE_TYPES.documents,
  ...SUPPORTED_FILE_TYPES.text,
  ...SUPPORTED_FILE_TYPES.code
]

// Legacy support
const SUPPORTED_IMAGE_TYPES = SUPPORTED_FILE_TYPES.images

// Image types - Production-grade with Blob URLs
type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

// 📎 UNIFIED ATTACHMENT TYPE (replaces UploadedImage)
type AttachmentType = 'image' | 'document' | 'text'

type UploadedAttachment = {
  id: string
  attachmentType: AttachmentType   // 'image' | 'document' | 'text'
  data: string                     // Base64 for images/PDFs, raw text for text files
  mediaType: string                // MIME type
  preview: string                  // Blob URL for images, empty for others
  isLoading: boolean
  fileName: string
  fileSize: number
}

// Legacy type for backwards compatibility
type UploadedImage = {
  id: string
  data: string
  mediaType: MediaType
  preview: string
  isLoading: boolean
  fileName: string
}

// API payload types
type ApiImage = {
  data: string
  mediaType: MediaType
}

type ApiAttachment = {
  type: AttachmentType
  data: string
  mediaType: string
  fileName?: string
}

interface ChatInputProps {
  onSendMessage: (message: string, images?: ApiImage[], realityContext?: string) => void
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
  const { error, validate, clearError } = useInputValidation()
  const { lightTap, success } = useHapticFeedback()
  const { toast } = useToast()

  // Voice input
  const {
    isListening,
    fullTranscript,
    isSupported: isVoiceSupported,
    toggleListening,
    clearTranscript
  } = useSpeechRecognition()

  // 🌍 ELITE REALITY ANCHOR
  const { isActive: isRealityAnchorActive, toggleAnchor: toggleRealityAnchor, getRealityPrompt, context: realityContextState } = useRealityAnchor()

  // Monitor Reality Anchor errors
  useEffect(() => {
    if (realityContextState.error) {
      toast({
        title: "Reality Anchor Failed",
        description: realityContextState.error + ". Please enable Location access in your browser.",
        variant: "destructive"
      });
    }
  }, [realityContextState.error, toast]);

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

  // 🎯 PRODUCTION-GRADE: Image compression using Canvas API
  // Based on Claude AI specs from Perplexity research
  const compressImage = useCallback((file: File): Promise<{ blob: Blob; base64: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const blobUrl = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(blobUrl) // Cleanup temporary blob

        // Check if exceeds Anthropic's hard limit
        if (img.width > FILE_SETTINGS.MAX_IMAGE_ORIGINAL_DIMENSION ||
          img.height > FILE_SETTINGS.MAX_IMAGE_ORIGINAL_DIMENSION) {
          reject(new Error(`Image exceeds ${FILE_SETTINGS.MAX_IMAGE_ORIGINAL_DIMENSION}px limit`))
          return
        }

        // Calculate new dimensions (maintain aspect ratio)
        let { width, height } = img
        const maxDim = FILE_SETTINGS.MAX_IMAGE_DIMENSION

        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
          console.log(`[📸 COMPRESS] Resizing ${img.width}x${img.height} → ${width}x${height}`)
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // High quality settings (as per research)
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to JPEG blob with quality setting
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }

            // Also get base64 for API
            const reader = new FileReader()
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1]
              console.log(`[📸 COMPRESS] ✅ ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(blob.size / 1024 / 1024).toFixed(2)}MB (${Math.round((1 - blob.size / file.size) * 100)}% reduction)`)
              resolve({ blob, base64 })
            }
            reader.onerror = () => reject(new Error('Failed to read compressed blob'))
            reader.readAsDataURL(blob)
          },
          'image/jpeg',
          FILE_SETTINGS.JPEG_QUALITY
        )
      }

      img.onerror = () => {
        URL.revokeObjectURL(blobUrl)
        reject(new Error(`Failed to load image: ${file.name}`))
      }

      img.src = blobUrl
    })
  }, [])

  // 📎 HELPER: Determine file type category
  const getFileCategory = useCallback((file: File): AttachmentType | null => {
    // Check by MIME type first
    if (SUPPORTED_FILE_TYPES.images.includes(file.type)) return 'image'
    if (SUPPORTED_FILE_TYPES.documents.includes(file.type)) return 'document'
    if (SUPPORTED_FILE_TYPES.text.includes(file.type)) return 'text'
    if (SUPPORTED_FILE_TYPES.code.includes(file.type)) return 'text'

    // Fallback: check by extension (for files with missing/wrong MIME)
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (ext && EXTENSION_TO_MIME[ext]) {
      const mime = EXTENSION_TO_MIME[ext]
      if (SUPPORTED_FILE_TYPES.images.includes(mime)) return 'image'
      if (SUPPORTED_FILE_TYPES.documents.includes(mime)) return 'document'
      if (SUPPORTED_FILE_TYPES.text.includes(mime) || SUPPORTED_FILE_TYPES.code.includes(mime)) return 'text'
    }

    return null
  }, [])

  // 📄 HELPER: Read file as text (for .txt, .md, .js, etc.)
  const readFileAsText = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }, [])

  // 📄 HELPER: Read file as base64 (for PDFs)
  const readFileAsBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }, [])

  // Process dropped files from drag-drop (supports all file types)
  useEffect(() => {
    if (!droppedFiles || droppedFiles.length === 0) return

    const processDroppedFiles = async () => {
      for (const file of droppedFiles) {
        const category = getFileCategory(file)

        if (!category) {
          console.warn('[📎 DROP] Unsupported file type:', file.type, file.name)
          toast({ title: "Unsupported File", description: `"${file.name}" is not a supported file type.`, variant: "destructive" })
          continue
        }

        // Check file size limits
        if (category === 'document' && file.size > FILE_SETTINGS.MAX_PDF_SIZE) {
          toast({ title: "PDF Too Large", description: `"${file.name}" exceeds the 32MB limit.`, variant: "destructive" })
          continue
        }
        if (category === 'image' && file.size > FILE_SETTINGS.MAX_FILE_SIZE) {
          toast({ title: "File Too Large", description: `"${file.name}" exceeds the 32MB limit.`, variant: "destructive" })
          continue
        }

        const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        // ===== IMAGE HANDLING =====
        if (category === 'image') {
          const blobUrl = URL.createObjectURL(file)
          setUploadedImages(prev => [...prev, {
            id: fileId, data: '', mediaType: 'image/jpeg' as MediaType,
            preview: blobUrl, isLoading: true, fileName: file.name
          }])
          try {
            const { base64 } = await compressImage(file)
            setUploadedImages(prev => prev.map(img =>
              img.id === fileId ? { ...img, data: base64, isLoading: false } : img
            ))
            console.log(`[📎 DROP] ✅ Image ready: ${file.name}`)
          } catch (error) {
            console.error(`[📎 DROP] ❌ Failed:`, error)
            setUploadedImages(prev => prev.filter(img => img.id !== fileId))
            URL.revokeObjectURL(blobUrl)
            toast({ title: "Failed to Process", description: `Could not process "${file.name}".`, variant: "destructive" })
          }
          continue
        }

        // ===== PDF HANDLING =====
        if (category === 'document') {
          setUploadedImages(prev => [...prev, {
            id: fileId, data: '', mediaType: 'application/pdf' as any,
            preview: '', isLoading: true, fileName: file.name
          }])
          try {
            const base64 = await readFileAsBase64(file)
            setUploadedImages(prev => prev.map(img =>
              img.id === fileId ? { ...img, data: base64, isLoading: false } : img
            ))
            console.log(`[📎 DROP] ✅ PDF ready: ${file.name}`)
            toast({ title: "PDF Added", description: `"${file.name}" ready for Claude.` })
          } catch (error) {
            setUploadedImages(prev => prev.filter(img => img.id !== fileId))
            toast({ title: "Failed to Process", description: `Could not process "${file.name}".`, variant: "destructive" })
          }
          continue
        }

        // ===== TEXT/CODE FILE HANDLING =====
        if (category === 'text') {
          setUploadedImages(prev => [...prev, {
            id: fileId, data: '', mediaType: file.type || 'text/plain' as any,
            preview: '', isLoading: true, fileName: file.name
          }])
          try {
            let textContent = await readFileAsText(file)
            if (textContent.length > FILE_SETTINGS.MAX_TEXT_SIZE) {
              textContent = textContent.substring(0, FILE_SETTINGS.MAX_TEXT_SIZE) + '\n\n[... truncated ...]'
            }
            setUploadedImages(prev => prev.map(img =>
              img.id === fileId ? { ...img, data: textContent, isLoading: false } : img
            ))
            console.log(`[📎 DROP] ✅ Text ready: ${file.name}`)
            toast({ title: "File Added", description: `"${file.name}" ready for Claude.` })
          } catch (error) {
            setUploadedImages(prev => prev.filter(img => img.id !== fileId))
            toast({ title: "Failed to Process", description: `Could not read "${file.name}".`, variant: "destructive" })
          }
        }
      }

      onClearDroppedFiles?.()
    }

    processDroppedFiles()
  }, [droppedFiles, onClearDroppedFiles, toast, compressImage, getFileCategory, readFileAsText, readFileAsBase64])


  // 🚀 PRODUCTION-GRADE: Universal file handler
  // Supports images, PDFs, and text/code files
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    console.log(`[📎 FILE UPLOAD] Processing ${files.length} file(s)...`)

    for (const file of Array.from(files)) {
      // Determine file category
      const category = getFileCategory(file)

      if (!category) {
        console.warn('[📎 FILE UPLOAD] Unsupported file type:', file.type, file.name)
        toast({
          title: "Unsupported File",
          description: `"${file.name}" is not a supported file type.`,
          variant: "destructive"
        })
        continue
      }

      // Check file size limits
      if (category === 'document' && file.size > FILE_SETTINGS.MAX_PDF_SIZE) {
        toast({
          title: "PDF Too Large",
          description: `"${file.name}" exceeds the 32MB PDF limit.`,
          variant: "destructive"
        })
        continue
      }

      if (category === 'text' && file.size > FILE_SETTINGS.MAX_TEXT_SIZE) {
        toast({
          title: "Text File Warning",
          description: `"${file.name}" is large (${(file.size / 1024).toFixed(0)}KB). It will be truncated.`,
        })
      }

      if (category === 'image' && file.size > FILE_SETTINGS.MAX_FILE_SIZE) {
        toast({
          title: "File Too Large",
          description: `"${file.name}" exceeds the 32MB limit.`,
          variant: "destructive"
        })
        continue
      }

      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      console.log(`[📎 FILE UPLOAD] Processing ${category}: ${file.name}`)

      // ===== IMAGE HANDLING =====
      if (category === 'image') {
        const blobUrl = URL.createObjectURL(file)

        setUploadedImages(prev => [...prev, {
          id: fileId,
          data: '',
          mediaType: 'image/jpeg' as MediaType,
          preview: blobUrl,
          isLoading: true,
          fileName: file.name
        }])

        try {
          const { base64 } = await compressImage(file)
          setUploadedImages(prev => prev.map(img =>
            img.id === fileId
              ? { ...img, data: base64, isLoading: false }
              : img
          ))
          console.log(`[📎 FILE UPLOAD] ✅ Image ready: ${file.name}`)
        } catch (error) {
          console.error(`[📎 FILE UPLOAD] ❌ Failed to process image ${file.name}:`, error)
          setUploadedImages(prev => prev.filter(img => img.id !== fileId))
          URL.revokeObjectURL(blobUrl)
          toast({
            title: "Failed to Process",
            description: `Could not process "${file.name}".`,
            variant: "destructive"
          })
        }
        continue
      }

      // ===== PDF HANDLING (Anthropic native document support) =====
      if (category === 'document') {
        setUploadedImages(prev => [...prev, {
          id: fileId,
          data: '',
          mediaType: 'application/pdf' as any,  // PDF MIME type
          preview: '',  // No preview for PDFs
          isLoading: true,
          fileName: file.name
        }])

        try {
          const base64 = await readFileAsBase64(file)
          setUploadedImages(prev => prev.map(img =>
            img.id === fileId
              ? { ...img, data: base64, isLoading: false }
              : img
          ))
          console.log(`[📎 FILE UPLOAD] ✅ PDF ready: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
          toast({
            title: "PDF Added",
            description: `"${file.name}" ready for Claude to analyze.`,
          })
        } catch (error) {
          console.error(`[📎 FILE UPLOAD] ❌ Failed to process PDF ${file.name}:`, error)
          setUploadedImages(prev => prev.filter(img => img.id !== fileId))
          toast({
            title: "Failed to Process",
            description: `Could not process "${file.name}".`,
            variant: "destructive"
          })
        }
        continue
      }

      // ===== TEXT/CODE FILE HANDLING =====
      if (category === 'text') {
        setUploadedImages(prev => [...prev, {
          id: fileId,
          data: '',
          mediaType: file.type || 'text/plain' as any,
          preview: '',
          isLoading: true,
          fileName: file.name
        }])

        try {
          let textContent = await readFileAsText(file)

          // Truncate if too large (keep first 100KB)
          if (textContent.length > FILE_SETTINGS.MAX_TEXT_SIZE) {
            textContent = textContent.substring(0, FILE_SETTINGS.MAX_TEXT_SIZE) + '\n\n[... truncated ...]'
          }

          setUploadedImages(prev => prev.map(img =>
            img.id === fileId
              ? { ...img, data: textContent, isLoading: false }
              : img
          ))

          const lineCount = textContent.split('\n').length
          console.log(`[📎 FILE UPLOAD] ✅ Text file ready: ${file.name} (${lineCount} lines)`)
          toast({
            title: "File Added",
            description: `"${file.name}" (${lineCount} lines) ready for Claude.`,
          })
        } catch (error) {
          console.error(`[📎 FILE UPLOAD] ❌ Failed to process text file ${file.name}:`, error)
          setUploadedImages(prev => prev.filter(img => img.id !== fileId))
          toast({
            title: "Failed to Process",
            description: `Could not read "${file.name}".`,
            variant: "destructive"
          })
        }
        continue
      }
    }

    // Clear input value so same file can be selected again
    e.target.value = ''
  }, [toast, compressImage, getFileCategory, readFileAsText, readFileAsBase64])

  // Remove an uploaded image + cleanup Blob URL (prevents memory leaks)
  const removeImage = useCallback((index: number) => {
    setUploadedImages(prev => {
      const imageToRemove = prev[index]
      // Revoke blob URL to free memory (important for performance!)
      if (imageToRemove?.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(imageToRemove.preview)
        console.log(`[📸 ELITE IMAGE] 🧹 Cleaned up blob for ${imageToRemove.fileName}`)
      }
      return prev.filter((_, i) => i !== index)
    })
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
    const imagesStillLoading = uploadedImages.some(img => img.isLoading)

    console.log('handleSend attempt:', {
      inputValue: inputValue,
      trimmed: inputValue.trim(),
      disabled: disabled,
      hasImages: hasImages,
      imagesLoading: imagesStillLoading,
      conditionMet: (hasText || hasImages) && !disabled && !imagesStillLoading
    });

    // Block sending if images are still encoding base64
    if (imagesStillLoading) {
      console.log('[📸 ELITE IMAGE] ⏳ Waiting for images to finish encoding...')
      toast({
        title: "Please Wait",
        description: "Images are still processing...",
      })
      return
    }

    // Allow sending with images even without text
    // But block sending if currently generating (typing is still allowed)
    if ((hasText || hasImages) && !disabled && !isGenerating && (hasText ? validate(inputValue) : true)) {
      console.log('--- DEV_LOG: ChatInput handleSend calling onSendMessage with', uploadedImages.length, 'images ---');
      success()

      // Send with attachments (stripped of preview for API, keeping fileName for text files)
      const attachmentsForApi = uploadedImages.map(({ data, mediaType, fileName }) => ({
        data,
        mediaType,
        fileName  // Pass fileName for text/code files
      }))

      // 🌍 ELITE: Include reality context if active
      const realityContext = getRealityPrompt() || undefined

      onSendMessage(inputValue.trim() || 'What do you see in this file?', attachmentsForApi.length > 0 ? attachmentsForApi : undefined, realityContext)

      // 🧹 Cleanup: Revoke all blob URLs to free memory
      uploadedImages.forEach(img => {
        if (img.preview?.startsWith('blob:')) {
          URL.revokeObjectURL(img.preview)
        }
      })
      console.log(`[📸 ELITE IMAGE] 🧹 Cleaned up ${uploadedImages.length} blob URLs after send`)

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

        {/* File Attachments - Premium Gallery */}
        <AnimatePresence>
          {uploadedImages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pb-3"
            >
              {/* Smart counter label */}
              <AttachmentCounter attachments={uploadedImages} />

              {/* Attachment cards */}
              <div className="flex flex-wrap gap-3">
                {uploadedImages.map((file, index) => (
                  <FileAttachmentCard
                    key={file.id}
                    id={file.id}
                    data={file.data}
                    mediaType={file.mediaType}
                    preview={file.preview}
                    fileName={file.fileName}
                    isLoading={file.isLoading}
                    onRemove={() => removeImage(index)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        <div className="flex items-center justify-between pt-2 gap-2">
          <div className="flex gap-2 items-center overflow-x-auto scrollbar-hide flex-1 min-w-0">
            {/* Plus Button - triggers image/file upload */}
            <div className="relative">
              <input
                type="file"
                id="file-upload"
                className="sr-only"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.txt,.md,.csv,.js,.jsx,.ts,.tsx,.py,.html,.css,.json"
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
                aria-label="Upload image, PDF, or text file"
              >
                <Plus className="w-5 h-5" />
              </label>
            </div>
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

                  {/* Text Label with Glow - hidden on mobile */}
                  <span
                    className={cn(
                      "hidden sm:inline text-[11px] font-bold tracking-[0.12em] z-10 relative uppercase italic",
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
                    "hidden sm:inline text-[11px] font-bold tracking-[0.12em] z-10 relative uppercase italic",
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
                    "hidden sm:inline text-[11px] font-bold tracking-[0.12em] z-10 relative uppercase italic",
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

            {/* Reality Anchor Toggle */}
            <div className="relative group">
              <motion.button
                onClick={toggleRealityAnchor}
                disabled={disabled}
                className={cn(
                  "relative h-9 px-4 rounded-xl overflow-hidden group",
                  "transition-all duration-500 ease-out",
                  "flex items-center gap-2",
                  "border backdrop-blur-xl",
                  "focus:outline-none focus-visible:outline-none",
                  isRealityAnchorActive
                    ? "bg-gradient-to-r from-emerald-500/25 via-green-500/15 to-transparent border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.02]"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:scale-[1.02]"
                )}
                aria-label="Toggle Reality Anchor"
                title={isRealityAnchorActive ? "Reality Anchor On" : "Reality Anchor Off"}
              >
                {isRealityAnchorActive && (
                  <motion.div
                    className="absolute inset-0 opacity-40"
                    animate={{
                      background: [
                        'linear-gradient(90deg, transparent, rgba(16,185,129,0.15), transparent)',
                        'linear-gradient(90deg, transparent, rgba(16,185,129,0.25), transparent)',
                        'linear-gradient(90deg, transparent, rgba(16,185,129,0.15), transparent)',
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <div className="relative z-10">
                  <motion.div
                    animate={isRealityAnchorActive ? {
                      scale: [1, 1.2, 1],
                    } : { scale: 1 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <MapPin className={cn(
                      "w-4 h-4 transition-all duration-500",
                      isRealityAnchorActive
                        ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                        : "text-zinc-400 group-hover:text-zinc-300"
                    )} />
                  </motion.div>
                </div>
                <span className={cn(
                  "hidden sm:inline text-[11px] font-bold tracking-[0.12em] z-10 relative uppercase italic",
                  isRealityAnchorActive ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"
                )}>
                  Reality
                </span>
              </motion.button>
            </div>
          </div>

          {/* Right side: Voice + Send buttons - always visible */}
          <div className="flex items-center gap-1 shrink-0">
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