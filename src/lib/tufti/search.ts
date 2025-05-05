import { TUFTI_CHAPTERS, RT_CHAPTERS } from './chapters'
import { chapterMetadata } from './metadata'
import type { SearchResult, TuftiChapterKey, RTChapterKey } from './types'

// Simple in-memory cache
const searchCache = new Map<string, SearchResult[]>()

export const searchChapters = (query: string): SearchResult[] => {
  // Check cache first
  const cacheKey = query.toLowerCase().trim()
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!
  }

  const results: SearchResult[] = []
  const searchTerms = cacheKey.split(' ')

  // Search Tufti chapters
  Object.entries(TUFTI_CHAPTERS).forEach(([key, chapter]) => {
    const relevance = calculateRelevance(searchTerms, chapter.title, chapter.content)
    if (relevance > 0) {
      results.push({
        key,
        title: chapter.title,
        content: chapter.content,
        relevance,
        metadata: chapterMetadata[key as TuftiChapterKey]
      })
    }
  })

  // Search RT chapters
  Object.entries(RT_CHAPTERS).forEach(([key, chapter]) => {
    const relevance = calculateRelevance(searchTerms, chapter.title, chapter.content)
    if (relevance > 0) {
      results.push({
        key,
        title: chapter.title,
        content: chapter.content,
        relevance,
        metadata: chapterMetadata[key as RTChapterKey]
      })
    }
  })

  // Sort by relevance
  const sortedResults = results.sort((a, b) => b.relevance - a.relevance)
  
  // Cache results
  searchCache.set(cacheKey, sortedResults)
  
  return sortedResults
}

const calculateRelevance = (terms: string[], title: string, content: string): number => {
  let score = 0
  const normalizedTitle = title.toLowerCase()
  const normalizedContent = content.toLowerCase()

  terms.forEach(term => {
    // Title matches worth more
    if (normalizedTitle.includes(term)) {
      score += 3
    }
    // Content matches
    if (normalizedContent.includes(term)) {
      score += 1
    }
    // Exact phrase matches worth more
    if (normalizedContent.includes(term)) {
      score += 2
    }
  })

  return score
}

// Clear cache periodically
setInterval(() => searchCache.clear(), 1000 * 60 * 30) // Clear every 30 minutes