import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import Fuse from 'fuse.js'
import {
    Search,
    Clock,
    Hash,
    MessageCircle,
    Sparkles,
    User,
    Zap,
    Command as CommandIcon,
    CornerDownLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { extractKeywords } from '@/lib/keyword-extractor'
import type { Message } from '@/lib/types'

interface CommandPaletteProps {
    messages: Message[]
    onNavigateToMessage?: (messageId: string) => void
    onFilterByKeyword?: (keyword: string) => void
}

export default function CommandPalette({
    messages,
    onNavigateToMessage,
    onFilterByKeyword
}: CommandPaletteProps) {
    const { isOpen, setIsOpen, recentSearches, addRecentSearch, clearRecentSearches } = useCommandPalette()
    const [search, setSearch] = useState('')

    // Extract keywords from all messages - DEBOUNCED for performance
    const [keywords, setKeywords] = useState<ReturnType<typeof extractKeywords>>([])

    useEffect(() => {
        const timer = setTimeout(() => {
            setKeywords(extractKeywords(messages))
        }, 300) // Debounce 300ms
        return () => clearTimeout(timer)
    }, [messages])

    // Fuse.js instance - cached with ref to avoid re-indexing on every render
    const fuseRef = useRef<Fuse<Message> | null>(null)
    const messageCountRef = useRef(0)

    // Only re-create Fuse index when message count changes
    if (messages.length !== messageCountRef.current) {
        fuseRef.current = new Fuse(messages, {
            keys: ['text'],
            threshold: 0.4, // Slightly stricter for better relevance
            includeScore: true,
        })
        messageCountRef.current = messages.length
    }

    // Search results - use cached Fuse instance
    const searchResults = useMemo(() => {
        if (search.length <= 1 || !fuseRef.current) return []
        return fuseRef.current.search(search).slice(0, 8) // Show 8 results
    }, [search, messages.length])

    // Handle keyboard shortcut (⌘K / Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setIsOpen(!isOpen)
            }
            if (e.key === 'Escape') {
                setIsOpen(false)
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, setIsOpen])

    // Format timestamp
    const formatTime = (date: Date) => {
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        if (minutes < 1) return 'Just now'
        if (minutes < 60) return `${minutes}m ago`
        if (hours < 24) return `${hours}h ago`
        return date.toLocaleDateString()
    }

    // Handle message click
    const handleMessageClick = useCallback((msg: Message) => {
        if (onNavigateToMessage) {
            const sender = msg.sender === 'user' ? 'You' : 'Tufti'
            addRecentSearch({
                id: msg.id,
                preview: `${sender}: ${msg.text?.slice(0, 50) || 'Message'}`,
                type: 'message'
            })
            setIsOpen(false)
            setSearch('')
            setTimeout(() => onNavigateToMessage(msg.id), 100)
        }
    }, [onNavigateToMessage, addRecentSearch, setIsOpen])

    // Handle keyword click
    const handleKeywordClick = useCallback((keyword: string) => {
        setSearch(keyword)
        addRecentSearch({
            id: keyword,
            preview: keyword,
            type: 'keyword'
        })
    }, [addRecentSearch])

    // Handle recent click
    const handleRecentClick = useCallback((item: { id: string, preview: string, type: 'message' | 'keyword' }) => {
        if (item.type === 'message' && onNavigateToMessage) {
            setIsOpen(false)
            setSearch('')
            setTimeout(() => onNavigateToMessage(item.id), 100)
        } else if (item.type === 'keyword') {
            setSearch(item.preview)
        }
    }, [onNavigateToMessage, setIsOpen])

    // Filter valid recents
    const validRecents = useMemo(() =>
        recentSearches.filter(r => r.preview && r.preview !== '...' && r.preview.length > 2),
        [recentSearches]
    )

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Premium 2026 Backdrop - Gradient mesh with orbs */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 z-[100]"
                    >
                        {/* Base dark overlay */}
                        <div className="absolute inset-0 bg-black/80" />

                        {/* Gradient orbs for depth */}
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] animate-pulse" />
                            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[100px]" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[150px]" />
                        </div>

                        {/* Noise texture overlay */}
                        <div className="absolute inset-0 opacity-[0.015]" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
                        }} />

                        {/* Backdrop blur */}
                        <div className="absolute inset-0 backdrop-blur-xl" />
                    </motion.div>

                    {/* Command Dialog - Perfectly Centered */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh] px-4 pointer-events-none"
                    >
                        <Command
                            className={cn(
                                "overflow-hidden rounded-2xl w-full max-w-[640px] pointer-events-auto",
                                "bg-[#0f0f11]/95 backdrop-blur-2xl",
                                "border border-white/[0.08]",
                                "shadow-2xl shadow-black/60",
                                "ring-1 ring-white/[0.05]"
                            )}
                            loop
                        >
                            {/* Search Input - Premium Design */}
                            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06]">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/20">
                                    <Search className="w-4 h-4 text-teal-400" />
                                </div>
                                <Command.Input
                                    value={search}
                                    onValueChange={setSearch}
                                    placeholder="Search conversations, keywords..."
                                    className={cn(
                                        "flex-1 bg-transparent text-white text-base placeholder:text-zinc-500",
                                        "outline-none border-none font-medium"
                                    )}
                                    autoFocus
                                />
                                <div className="flex items-center gap-1.5">
                                    <kbd className="flex items-center justify-center px-2 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-[11px] text-zinc-500 font-medium min-w-[28px]">
                                        esc
                                    </kbd>
                                </div>
                            </div>

                            {/* Results */}
                            <Command.List className="max-h-[420px] overflow-y-auto">
                                <Command.Empty className="py-12 text-center">
                                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-800/50 flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-zinc-600" />
                                    </div>
                                    <p className="text-sm text-zinc-500">No results found</p>
                                    <p className="text-xs text-zinc-600 mt-1">Try different keywords</p>
                                </Command.Empty>

                                {/* RECENT - Only show if valid items exist */}
                                {!search && validRecents.length > 0 && (
                                    <Command.Group className="p-2">
                                        <div className="flex items-center gap-2 px-3 py-2">
                                            <Clock className="w-3.5 h-3.5 text-zinc-600" />
                                            <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wide">Recent</span>
                                        </div>
                                        {validRecents.slice(0, 4).map((item, i) => (
                                            <Command.Item
                                                key={`recent-${item.id}-${i}`}
                                                value={`recent-${item.id}-${item.preview}`}
                                                onSelect={() => handleRecentClick(item)}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg cursor-pointer",
                                                    "text-sm text-zinc-300",
                                                    "data-[selected=true]:bg-white/[0.06]",
                                                    "transition-colors duration-75"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                    item.type === 'message'
                                                        ? "bg-teal-500/10 text-teal-400"
                                                        : "bg-amber-500/10 text-amber-400"
                                                )}>
                                                    {item.type === 'message' ? (
                                                        <MessageCircle className="w-4 h-4" />
                                                    ) : (
                                                        <Hash className="w-4 h-4" />
                                                    )}
                                                </div>
                                                <span className="truncate flex-1 font-medium">{item.preview}</span>
                                                <CornerDownLeft className="w-3.5 h-3.5 text-zinc-600 opacity-0 group-data-[selected=true]:opacity-100" />
                                            </Command.Item>
                                        ))}
                                    </Command.Group>
                                )}

                                {/* KEYWORDS */}
                                {!search && keywords.length > 0 && (
                                    <Command.Group className="p-2 border-t border-white/[0.04]">
                                        <div className="flex items-center gap-2 px-3 py-2">
                                            <Zap className="w-3.5 h-3.5 text-zinc-600" />
                                            <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wide">Popular Keywords</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                                            {keywords.slice(0, 8).map((kw) => (
                                                <Command.Item
                                                    key={`keyword-${kw.word}`}
                                                    value={`keyword-${kw.word}`}
                                                    onSelect={() => handleKeywordClick(kw.word)}
                                                    className={cn(
                                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer",
                                                        "text-xs font-medium text-zinc-400",
                                                        "bg-white/[0.04] border border-white/[0.06]",
                                                        "data-[selected=true]:bg-teal-500/15 data-[selected=true]:border-teal-500/30 data-[selected=true]:text-teal-300",
                                                        "transition-all duration-75"
                                                    )}
                                                >
                                                    <span>{kw.word}</span>
                                                    <span className="text-zinc-600">{kw.count}</span>
                                                </Command.Item>
                                            ))}
                                        </div>
                                    </Command.Group>
                                )}

                                {/* SEARCH RESULTS */}
                                {search && searchResults.length > 0 && (
                                    <Command.Group className="p-2">
                                        <div className="flex items-center gap-2 px-3 py-2">
                                            <MessageCircle className="w-3.5 h-3.5 text-zinc-600" />
                                            <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wide">Messages</span>
                                            <span className="text-[10px] text-zinc-700 ml-auto">{searchResults.length} results</span>
                                        </div>
                                        {searchResults.map((result) => (
                                            <Command.Item
                                                key={`msg-${result.item.id}`}
                                                value={`message-${result.item.id}-${result.item.text?.slice(0, 30)}`}
                                                onSelect={() => handleMessageClick(result.item)}
                                                className={cn(
                                                    "flex items-start gap-3 px-3 py-3 mx-1 rounded-lg cursor-pointer group",
                                                    "data-[selected=true]:bg-white/[0.06]",
                                                    "transition-colors duration-75"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                    result.item.sender === 'user'
                                                        ? "bg-zinc-700/50 text-zinc-400"
                                                        : "bg-gradient-to-br from-teal-500/20 to-cyan-500/20 text-teal-400"
                                                )}>
                                                    {result.item.sender === 'user' ? (
                                                        <User className="w-4 h-4" />
                                                    ) : (
                                                        <Sparkles className="w-4 h-4" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-xs font-semibold text-zinc-400">
                                                            {result.item.sender === 'user' ? 'You' : 'Tufti'}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-600">
                                                            {formatTime(new Date(result.item.timestamp))}
                                                        </span>
                                                        {result.score && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 ml-auto">
                                                                {Math.round((1 - result.score) * 100)}% match
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-zinc-300 line-clamp-2">{result.item.text}</p>
                                                </div>
                                            </Command.Item>
                                        ))}
                                    </Command.Group>
                                )}

                                {/* ALL MESSAGES - Browse all, search finds all */}
                                {!search && messages.length > 0 && (
                                    <Command.Group className="p-2 border-t border-white/[0.04]">
                                        <div className="flex items-center gap-2 px-3 py-2">
                                            <MessageCircle className="w-3.5 h-3.5 text-zinc-600" />
                                            <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wide">All Messages</span>
                                            <span className="text-[10px] text-zinc-700 ml-auto">{messages.length} messages</span>
                                        </div>
                                        {[...messages].reverse().map((msg) => (
                                            <Command.Item
                                                key={`conv-${msg.id}`}
                                                value={`conv-${msg.id}-${msg.text?.slice(0, 20)}`}
                                                onSelect={() => handleMessageClick(msg)}
                                                className={cn(
                                                    "flex items-start gap-3 px-3 py-2.5 mx-1 rounded-lg cursor-pointer",
                                                    "data-[selected=true]:bg-white/[0.06]",
                                                    "transition-colors duration-75"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                    msg.sender === 'user'
                                                        ? "bg-zinc-700/50 text-zinc-400"
                                                        : "bg-gradient-to-br from-teal-500/20 to-cyan-500/20 text-teal-400"
                                                )}>
                                                    {msg.sender === 'user' ? (
                                                        <User className="w-4 h-4" />
                                                    ) : (
                                                        <Sparkles className="w-4 h-4" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-xs font-semibold text-zinc-400">
                                                            {msg.sender === 'user' ? 'You' : 'Tufti'}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-600">
                                                            {formatTime(new Date(msg.timestamp))}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-zinc-300 truncate">{msg.text?.slice(0, 80)}</p>
                                                </div>
                                            </Command.Item>
                                        ))}
                                    </Command.Group>
                                )}
                            </Command.List>

                            {/* Footer - Premium Design */}
                            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] bg-white/[0.02]">
                                <div className="flex items-center gap-4 text-[11px] text-zinc-600">
                                    <span className="flex items-center gap-1.5">
                                        <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-zinc-500">↑↓</kbd>
                                        <span>Navigate</span>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-zinc-500">↵</kbd>
                                        <span>Select</span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                                    <CommandIcon className="w-3 h-3" />
                                    <span>K to open</span>
                                </div>
                            </div>
                        </Command>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
