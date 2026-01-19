import { useRef, useState, useCallback, useEffect } from 'react'
import type { Message } from '@/lib/types'

interface UseScrollBotPhysicsOptions {
    messages: Message[]
    isTyping: boolean
    containerRef: React.RefObject<HTMLDivElement>
    viewportSelector?: string
}

export function useScrollBotPhysics({
    messages,
    isTyping,
    containerRef,
    viewportSelector = '[data-radix-scroll-area-viewport]'
}: UseScrollBotPhysicsOptions) {
    const [isAtBottom, setIsAtBottom] = useState(true)
    const [showScrollButton, setShowScrollButton] = useState(false)

    const scrollAnimationRef = useRef<number>()
    const springVelocityRef = useRef<number>(0)
    const isAutoScrollingRef = useRef(false)
    const lastMessageIdRef = useRef<string | null>(messages.length > 0 ? messages[messages.length - 1].id : null)

    const stopAnimation = useCallback(() => {
        if (scrollAnimationRef.current) {
            cancelAnimationFrame(scrollAnimationRef.current)
            scrollAnimationRef.current = undefined
        }
        isAutoScrollingRef.current = false
        springVelocityRef.current = 0
    }, [])

    const scrollToBottom = useCallback(() => {
        const scrollContainer = containerRef.current?.querySelector(viewportSelector) as HTMLElement
        if (!scrollContainer) return

        stopAnimation()

        const tension = 180
        const friction = 28
        const mass = 1.5
        let lastTime = performance.now()

        const animatePhysics = (currentTime: number) => {
            const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1)
            lastTime = currentTime

            const currentScroll = scrollContainer.scrollTop
            const targetScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight
            const displacement = targetScroll - currentScroll

            if (Math.abs(displacement) < 0.5 && Math.abs(springVelocityRef.current) < 1) {
                scrollContainer.scrollTop = targetScroll
                stopAnimation()
                return
            }

            const springForce = tension * displacement
            const dampingForce = -friction * springVelocityRef.current
            const acceleration = (springForce + dampingForce) / mass

            springVelocityRef.current += acceleration * deltaTime
            scrollContainer.scrollTop = currentScroll + springVelocityRef.current * deltaTime

            scrollAnimationRef.current = requestAnimationFrame(animatePhysics)
        }

        isAutoScrollingRef.current = true
        scrollAnimationRef.current = requestAnimationFrame(animatePhysics)
    }, [containerRef, viewportSelector, stopAnimation])

    const handleScroll = useCallback(() => {
        const scrollContainer = containerRef.current?.querySelector(viewportSelector) as HTMLElement
        if (!scrollContainer) return

        const { scrollTop, scrollHeight, clientHeight } = scrollContainer
        const scrollBottom = scrollHeight - scrollTop - clientHeight

        const isBottom = scrollBottom < 20
        setIsAtBottom(isBottom)

        if (isBottom) {
            setShowScrollButton(false)
            // If we reached bottom naturally (not by animation), we can clear the ref
            if (!scrollAnimationRef.current) {
                isAutoScrollingRef.current = false
            }
        }
    }, [containerRef, viewportSelector])

    // Bot-specific logic: When should we trigger auto-scroll?
    // IMPORTANT: Only scroll when a NEW message is added at the END, not when history is prepended
    useEffect(() => {
        const lastMessage = messages[messages.length - 1]
        if (!lastMessage) return

        const currentLastId = lastMessage.id
        const wasNewMessageAdded = currentLastId !== lastMessageIdRef.current

        // Update the ref for next comparison
        lastMessageIdRef.current = currentLastId

        // If the last message didn't change, older history was prepended - DON'T scroll
        if (!wasNewMessageAdded) return

        const isUserMessage = lastMessage.sender === 'user'
        const isBotActivity = isTyping || lastMessage.sender === 'tufti'

        // Condition 1: User sent a message -> Always scroll
        // Condition 2: Bot is typing/responded AND we were already following at the bottom
        if (isUserMessage || (isAtBottom && isBotActivity)) {
            scrollToBottom()
        } else if (isBotActivity && !isAtBottom) {
            // User is scrolled up and bot is active -> Show "New Messages" button
            setShowScrollButton(true)
        }
    }, [messages, isTyping, isAtBottom, scrollToBottom])

    // External event handlers to stop animation on manual interaction
    const interactionHandlers = {
        onWheel: stopAnimation,
        onTouchStart: stopAnimation,
        onMouseDown: stopAnimation
    }

    return {
        isAtBottom,
        showScrollButton,
        scrollToBottom,
        handleScroll,
        interactionHandlers,
        stopAnimation
    }
}
