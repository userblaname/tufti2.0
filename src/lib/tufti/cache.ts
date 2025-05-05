import { TUFTI_CHAPTERS, RT_CHAPTERS } from './chapters'
import type { TuftiChapterKey, RTChapterKey } from './types'

interface CacheEntry {
  data: any
  timestamp: number
}

const CACHE_DURATION = 1000 * 60 * 60 // 1 hour

class ChapterCache {
  private cache = new Map<string, CacheEntry>()

  get(key: TuftiChapterKey | RTChapterKey) {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  set(key: TuftiChapterKey | RTChapterKey, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  clear() {
    this.cache.clear()
  }
}

export const chapterCache = new ChapterCache()

// Enhanced chapter getters with caching
export const getTuftiChapter = (key: TuftiChapterKey) => {
  const cached = chapterCache.get(key)
  if (cached) return cached
  
  const chapter = TUFTI_CHAPTERS[key]
  chapterCache.set(key, chapter)
  return chapter
}

export const getRTChapter = (key: RTChapterKey) => {
  const cached = chapterCache.get(key)
  if (cached) return cached
  
  const chapter = RT_CHAPTERS[key]
  chapterCache.set(key, chapter)
  return chapter
}