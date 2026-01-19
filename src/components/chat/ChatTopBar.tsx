import { Search, PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCommandPalette } from '@/hooks/useCommandPalette'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Get Tufti-style time awareness
 * Returns human-readable, emotionally resonant time strings
 */
function getTuftiTime(): { primary: string; secondary: string } {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDate()
    const month = now.getMonth()
    const dayOfWeek = now.getDay()

    // Special days
    const isNewYearsEve = month === 11 && day === 31
    const isNewYearsDay = month === 0 && day === 1
    const isChristmas = month === 11 && (day === 24 || day === 25)
    const isSolstice = (month === 11 && day === 21) || (month === 5 && day === 21)

    // Time of day
    let timeOfDay: string
    if (hour >= 5 && hour < 8) timeOfDay = 'dawn'
    else if (hour >= 8 && hour < 12) timeOfDay = 'morning'
    else if (hour >= 12 && hour < 14) timeOfDay = 'midday'
    else if (hour >= 14 && hour < 17) timeOfDay = 'afternoon'
    else if (hour >= 17 && hour < 20) timeOfDay = 'evening'
    else if (hour >= 20 && hour < 23) timeOfDay = 'night'
    else timeOfDay = 'midnight'

    // Day name
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = dayNames[dayOfWeek]

    // Build primary and secondary strings
    let primary: string
    let secondary: string

    if (isNewYearsEve) {
        primary = "New Year's Eve"
        secondary = `last ${timeOfDay} of ${now.getFullYear()}`
    } else if (isNewYearsDay) {
        primary = "New Year's Day"
        secondary = `first ${timeOfDay} of ${now.getFullYear()}`
    } else if (isChristmas) {
        primary = day === 24 ? "Christmas Eve" : "Christmas Day"
        secondary = timeOfDay
    } else if (isSolstice) {
        primary = month === 11 ? "Winter Solstice" : "Summer Solstice"
        secondary = timeOfDay
    } else {
        // Regular day - elegant minimal format
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December']
        primary = `${dayName}, ${monthNames[month]} ${day}`
        secondary = timeOfDay
    }

    return { primary, secondary }
}

interface ChatTopBarProps {
    title?: string
    onToggleSidebar?: () => void
}

export default function ChatTopBar({ onToggleSidebar }: ChatTopBarProps) {
    const { setIsOpen } = useCommandPalette()
    const [tuftiTime, setTuftiTime] = useState(getTuftiTime())

    // Update time every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setTuftiTime(getTuftiTime())
        }, 60000)
        return () => clearInterval(interval)
    }, [])

    return (
        <header className="h-12 flex items-center justify-between px-5 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm">
            {/* Left: Time Display */}
            <motion.div
                className="flex items-baseline gap-2"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <AnimatePresence mode="wait">
                    <motion.span
                        key={tuftiTime.primary}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-[13px] font-light tracking-wide text-zinc-300"
                    >
                        {tuftiTime.primary}
                    </motion.span>
                </AnimatePresence>
                <AnimatePresence mode="wait">
                    <motion.span
                        key={tuftiTime.secondary}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-[11px] text-zinc-600 font-light"
                    >
                        · {tuftiTime.secondary}
                    </motion.span>
                </AnimatePresence>
            </motion.div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1">
                {/* Sidebar Toggle */}
                {onToggleSidebar && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleSidebar}
                        className="w-8 h-8 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                    >
                        <PanelLeft className="w-4 h-4" />
                    </Button>
                )}

                {/* Search */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(true)}
                    className="h-7 px-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                >
                    <Search className="w-3.5 h-3.5" />
                    <kbd className="ml-2 text-[10px] text-zinc-600 font-light">⌘K</kbd>
                </Button>
            </div>
        </header>
    )
}

