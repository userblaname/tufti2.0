import type { ChapterMetadata, TuftiChapterKey, RTChapterKey } from './types'

export const chapterMetadata: Record<TuftiChapterKey | RTChapterKey, ChapterMetadata> = {
  twoScreens: {
    category: 'basics',
    tags: ['awareness', 'attention', 'consciousness'],
    difficulty: 1,
    relatedChapters: ['trackingAttention', 'beingPresent']
  },
  strollThroughDream: {
    category: 'practice',
    tags: ['awareness', 'observation', 'daily practice'],
    difficulty: 1,
    relatedChapters: ['firstEntryIntoReality', 'beingPresent']
  },
  // Add metadata for all chapters...
} as const

export const getChaptersByCategory = (category: ChapterMetadata['category']) => {
  return Object.entries(chapterMetadata)
    .filter(([_, meta]) => meta.category === category)
    .map(([key]) => key)
}

export const getChaptersByTag = (tag: string) => {
  return Object.entries(chapterMetadata)
    .filter(([_, meta]) => meta.tags.includes(tag))
    .map(([key]) => key)
}

export const getRelatedChapters = (chapterKey: TuftiChapterKey | RTChapterKey) => {
  return chapterMetadata[chapterKey].relatedChapters
}