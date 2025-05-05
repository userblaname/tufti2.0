import type { TUFTI_CHAPTERS, RT_CHAPTERS } from './chapters'

export type TuftiChapterKey = keyof typeof TUFTI_CHAPTERS
export type RTChapterKey = keyof typeof RT_CHAPTERS

export type ChapterCategory = 
  | 'basics'
  | 'techniques'
  | 'concepts'
  | 'practice'
  | 'advanced'

export interface ChapterMetadata {
  category: ChapterCategory
  tags: string[]
  difficulty: 1 | 2 | 3 // 1=beginner, 2=intermediate, 3=advanced
  relatedChapters: string[]
}

export interface SearchResult {
  key: string
  title: string
  content: string
  relevance: number
  metadata: ChapterMetadata
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ConversationContext {
  messages: ConversationMessage[]
  metadata: {
    tokenCount: number
    lastUpdated: number
  }
}