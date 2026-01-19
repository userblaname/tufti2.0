import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Trash2,
    LogOut,
    Sparkles,
    BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WISDOM_TOPICS, getRandomTopic } from '@/lib/tufti/constants'
import { getDailyQuote } from '@/lib/tufti/book-quotes'

interface SidebarProps {
    isOpen: boolean
    onToggle: () => void
    onClearChat: () => void
    onFillInput?: (text: string) => void
    signOut: () => Promise<void>
    userName: string
    messageCount?: number
}

const Sidebar = memo(({
    isOpen,
    onToggle,
    onClearChat,
    onFillInput,
    signOut,
    userName,
    messageCount = 0
}: SidebarProps) => {
    // Hybrid state: Open if parent says so (Pinned) OR if hovered
    const [isHovered, setIsHovered] = useState(false)
    const expanded = isOpen || isHovered

    // Get today's wisdom quote (same for everyone, changes daily)
    const dailyQuote = getDailyQuote()

    const handleTopicClick = (prompt: string) => {
        if (onFillInput) {
            onFillInput(prompt)
        }
    }

    const handleSurpriseMe = () => {
        const topic = getRandomTopic()
        if (onFillInput) {
            onFillInput(topic.prompt)
        }
    }

    return (
        <motion.aside
            initial={false}
            animate={{ width: expanded ? 240 : 52 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
                "hidden md:flex flex-col h-full shrink-0 overflow-hidden",
                "bg-[#0f0f11] border-r border-white/5"
            )}
        >
            {/* Top Section - Logo */}
            <div className="flex flex-col py-3 gap-1 px-1.5">
                <div className="flex items-center gap-2 w-full h-9 px-1.5 rounded-lg mb-1">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-teal-400 shrink-0" fill="currentColor">
                        <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
                    </svg>
                    <AnimatePresence>
                        {expanded && (
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="text-sm font-medium text-zinc-200 whitespace-nowrap"
                            >
                                Tufti AI
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Today's Wisdom - Quote Section */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-2.5 pb-3"
                    >
                        {/* Wisdom Card with Ambient Pulse Border */}
                        <motion.div
                            className="relative rounded-xl p-3 border border-white/5 overflow-hidden"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            {/* Animated gradient background */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-zinc-900/50 to-teal-500/10"
                                animate={{
                                    backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
                                }}
                                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                            />
                            {/* Subtle ambient pulse */}
                            <motion.div
                                className="absolute inset-0 rounded-xl"
                                animate={{
                                    boxShadow: [
                                        'inset 0 0 20px rgba(245,158,11,0.03)',
                                        'inset 0 0 30px rgba(245,158,11,0.08)',
                                        'inset 0 0 20px rgba(245,158,11,0.03)'
                                    ]
                                }}
                                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            <div className="relative z-10">
                                <span className="text-[10px] uppercase tracking-wider text-amber-400/80 font-medium flex items-center gap-1.5 mb-2">
                                    ✨ Today's Wisdom
                                </span>
                                <p className="text-xs text-zinc-300 leading-relaxed italic mb-2">
                                    "{dailyQuote.text}"
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                    — {dailyQuote.book}
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick Wisdom Section */}
            <div className="flex-1 flex flex-col py-2 gap-0.5 px-1.5 overflow-y-auto">
                {/* Section Header */}
                <div className="flex items-center gap-2 w-full h-8 px-1.5 mb-1">
                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-zinc-500" />
                    </div>
                    <AnimatePresence>
                        {expanded && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium"
                            >
                                Quick Wisdom
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                {/* Topic Buttons with Staggered Animation */}
                {WISDOM_TOPICS.map((topic, index) => (
                    <motion.button
                        key={topic.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        onClick={() => handleTopicClick(topic.prompt)}
                        className="flex items-center gap-2 w-full h-8 px-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-all group"
                        whileHover={{ x: 2 }}
                    >
                        <div className="w-6 h-6 flex items-center justify-center shrink-0 text-sm">
                            {topic.icon}
                        </div>
                        {expanded && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-xs whitespace-nowrap group-hover:text-amber-400 transition-colors"
                            >
                                {topic.label}
                            </motion.span>
                        )}
                    </motion.button>
                ))}

                {/* Surprise Me Button with Sparkle Effect */}
                <motion.button
                    onClick={handleSurpriseMe}
                    className="relative flex items-center gap-2 w-full h-8 px-1.5 rounded-lg mt-1 overflow-hidden"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {/* Animated gradient background */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-teal-500/10"
                        animate={{
                            opacity: [0.5, 0.8, 0.5]
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/20 to-teal-500/0"
                        animate={{
                            x: ['-100%', '100%']
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
                    />
                    <div className="w-6 h-6 flex items-center justify-center shrink-0 relative z-10">
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 3 }}
                        >
                            <Sparkles className="w-4 h-4 text-amber-400" />
                        </motion.div>
                    </div>
                    {expanded && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs whitespace-nowrap font-medium text-amber-400 relative z-10"
                        >
                            Surprise Me
                        </motion.span>
                    )}
                </motion.button>
            </div>

            {/* Bottom Section */}
            <div className="flex flex-col py-3 gap-1 px-1.5 border-t border-white/5">
                {/* Message Count */}
                {messageCount > 0 && (
                    <div className="flex items-center gap-2 w-full h-8 px-1.5 text-zinc-500">
                        <div className="w-6 h-6 flex items-center justify-center shrink-0 text-xs">
                            💬
                        </div>
                        {expanded && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-[11px] whitespace-nowrap"
                            >
                                {messageCount} messages
                            </motion.span>
                        )}
                    </div>
                )}

                {/* Clear Chat */}
                <button
                    onClick={onClearChat}
                    className="flex items-center gap-2 w-full h-9 px-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <Trash2 className="w-4 h-4" />
                    </div>
                    {expanded && <span className="text-xs whitespace-nowrap">Clear Chat</span>}
                </button>

                {/* Sign Out */}
                <button
                    onClick={signOut}
                    className="flex items-center gap-2 w-full h-9 px-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                >
                    <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <LogOut className="w-4 h-4" />
                    </div>
                    {expanded && <span className="text-xs whitespace-nowrap">Sign Out</span>}
                </button>

                {/* User Avatar */}
                <div className="flex items-center gap-2 w-full h-9 px-1.5 mt-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500/30 to-teal-500/30 flex items-center justify-center text-amber-400 text-xs font-medium shrink-0 border border-amber-500/20">
                        {userName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    {expanded && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-zinc-400 whitespace-nowrap truncate"
                        >
                            {userName || 'Director'}
                        </motion.span>
                    )}
                </div>
            </div>
        </motion.aside>
    )
})

Sidebar.displayName = 'Sidebar'

export default Sidebar
