import { useCallback, useRef } from 'react'
import type { Message } from '@/lib/types'

const CACHE_SIZE = 100

export function useMessageCache() {
  const cache = useRef<Map<number, Message>>(new Map())

  const addToCache = useCallback((message: Message) => {
    if (cache.current.size >= CACHE_SIZE) {
      const firstKey = cache.current.keys().next().value
      cache.current.delete(firstKey)
    }
    cache.current.set(message.id, message)
  }, [])

  const getFromCache = useCallback((id: number) => {
    return cache.current.get(id)
  }, [])

  const clearCache = useCallback(() => {
    cache.current.clear()
  }, [])

  return {
    addToCache,
    getFromCache,
    clearCache
  }
}