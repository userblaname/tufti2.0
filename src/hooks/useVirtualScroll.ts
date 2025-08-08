import { useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Message } from '@/lib/types'

export function useVirtualScroll(messages: Message[], rowHeight = 100) {
  const parentRef = useRef<HTMLDivElement>(null)
  const scrollingRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollingRef.current,
    estimateSize: useCallback(() => rowHeight, [rowHeight]),
    overscan: 5,
  })

  const scrollToBottom = useCallback(() => {
    if (scrollingRef.current) {
      scrollingRef.current.scrollTo({
        top: scrollingRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [])

  return {
    parentRef,
    scrollingRef,
    virtualRows: rowVirtualizer.getVirtualItems(),
    totalSize: rowVirtualizer.getTotalSize(),
    scrollToBottom
  }
}