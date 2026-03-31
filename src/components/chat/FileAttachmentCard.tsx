// FileAttachmentCard.tsx - Premium file attachment preview component
// Supports images, PDFs, code files, and text files with visual differentiation

import { X, FileText, Code2, FileType, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

// File type configuration for visual styling - subtle, premium colors
const FILE_TYPE_CONFIG = {
    image: {
        label: 'IMG',
        color: 'rgba(34, 197, 94, 0.7)', // Muted green
        bgColor: 'rgba(34, 197, 94, 0.08)',
        icon: undefined as undefined, // No icon for images (uses thumbnail)
    },
    pdf: {
        label: 'PDF',
        color: 'rgba(239, 68, 68, 0.7)', // Muted red
        bgColor: 'rgba(239, 68, 68, 0.08)',
        icon: FileText,
    },
    code: {
        label: 'CODE',
        color: 'rgba(168, 85, 247, 0.7)', // Muted purple
        bgColor: 'rgba(168, 85, 247, 0.08)',
        icon: Code2,
    },
    text: {
        label: 'TXT',
        color: 'rgba(96, 165, 250, 0.7)', // Muted blue
        bgColor: 'rgba(96, 165, 250, 0.08)',
        icon: FileType,
    },
}

// Get file category from MIME type
function getFileTypeCategory(mediaType: string): keyof typeof FILE_TYPE_CONFIG {
    if (mediaType.startsWith('image/')) return 'image'
    if (mediaType === 'application/pdf') return 'pdf'
    if (mediaType.startsWith('text/') && (
        mediaType.includes('javascript') ||
        mediaType.includes('typescript') ||
        mediaType.includes('python') ||
        mediaType.includes('css') ||
        mediaType.includes('html')
    )) return 'code'
    if (mediaType === 'application/json') return 'code'
    return 'text'
}

// Get display extension from filename
function getExtension(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    return ext ? `.${ext}` : ''
}

interface FileAttachmentCardProps {
    id: string
    data: string
    mediaType: string
    preview?: string
    fileName?: string
    isLoading?: boolean
    onRemove: (id: string) => void
}

export function FileAttachmentCard({
    id,
    data: _data, // Kept for API compatibility
    mediaType,
    preview,
    fileName = 'file',
    isLoading = false,
    onRemove,
}: FileAttachmentCardProps) {
    const category = getFileTypeCategory(mediaType)
    const config = FILE_TYPE_CONFIG[category]
    const extension = getExtension(fileName)
    const isImage = category === 'image'

    // Truncate long filenames elegantly
    const displayName = fileName.length > 14
        ? fileName.slice(0, 10) + '…' + extension
        : fileName

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
                position: 'relative',
                width: isImage ? '56px' : 'auto',
                minWidth: isImage ? '56px' : '80px',
                maxWidth: '120px',
                height: isImage ? '56px' : '64px',
                borderRadius: '10px',
                border: `1px solid ${config.color}`,
                background: 'rgba(20, 20, 25, 0.8)',
                backdropFilter: 'blur(8px)',
                overflow: 'visible',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isImage ? '0' : '6px 10px',
                cursor: 'default',
                transition: 'all 0.2s ease',
            }}
            whileHover={{
                borderColor: config.color.replace('0.7', '1'),
                background: 'rgba(30, 30, 35, 0.9)',
            }}
        >
            {/* Subtle remove button - appears on hover */}
            <motion.button
                onClick={(e) => { e.stopPropagation(); onRemove(id) }}
                initial={{ opacity: 0.4 }}
                whileHover={{ opacity: 1, scale: 1.1 }}
                style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'rgba(60, 60, 65, 0.95)',
                    border: '1px solid rgba(100, 100, 105, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 10,
                }}
                aria-label={`Remove ${fileName}`}
            >
                <X size={9} color="rgba(200, 200, 200, 0.9)" strokeWidth={2.5} />
            </motion.button>

            {/* Loading overlay */}
            {isLoading && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 5,
                }}>
                    <Loader2 size={18} color={config.color} className="animate-spin" />
                </div>
            )}

            {/* Image preview */}
            {isImage && preview && (
                <img
                    src={preview}
                    alt={fileName}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '9px',
                    }}
                />
            )}

            {/* Non-image file display */}
            {!isImage && (
                <>
                    {/* Icon */}
                    {config.icon && (
                        <config.icon
                            size={18}
                            color={config.color}
                            strokeWidth={1.5}
                        />
                    )}

                    {/* Filename */}
                    <span style={{
                        fontSize: '9px',
                        fontWeight: 500,
                        color: 'rgba(180, 180, 185, 0.9)',
                        marginTop: '3px',
                        textAlign: 'center',
                        lineHeight: 1.1,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        {displayName}
                    </span>

                    {/* Type badge - very subtle */}
                    <span style={{
                        fontSize: '7px',
                        fontWeight: 600,
                        color: config.color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                        marginTop: '2px',
                        opacity: 0.8,
                    }}>
                        {config.label}
                    </span>
                </>
            )}
        </motion.div>
    )
}

// Smart counter label component - minimal style
export function AttachmentCounter({
    attachments
}: {
    attachments: Array<{ mediaType: string }>
}) {
    const counts = { images: 0, pdfs: 0, code: 0, text: 0 }

    attachments.forEach(a => {
        const cat = getFileTypeCategory(a.mediaType)
        if (cat === 'image') counts.images++
        else if (cat === 'pdf') counts.pdfs++
        else if (cat === 'code') counts.code++
        else counts.text++
    })

    const parts: string[] = []
    if (counts.images > 0) parts.push(`${counts.images} image${counts.images > 1 ? 's' : ''}`)
    if (counts.pdfs > 0) parts.push(`${counts.pdfs} PDF${counts.pdfs > 1 ? 's' : ''}`)
    if (counts.code > 0) parts.push(`${counts.code} code`)
    if (counts.text > 0) parts.push(`${counts.text} text`)

    const label = parts.join(' · ')

    return label ? (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '10px',
            fontWeight: 500,
            color: 'rgba(120, 120, 130, 0.9)',
            letterSpacing: '0.3px',
            marginBottom: '6px',
            textTransform: 'uppercase',
        }}>
            <span style={{ opacity: 0.6 }}>📎</span>
            {label}
        </div>
    ) : null
}
