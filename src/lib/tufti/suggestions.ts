import type { UserProfile } from '@/lib/types'
import { RT_CHAPTERS, TUFTI_CHAPTERS } from './chapters'

export interface Suggestion {
  key: string
  label: string
  prompt: string
}

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

export const buildSuggestions = (user: UserProfile | null): Suggestion[] => {
  const suggestions: Suggestion[] = []

  // Personalized based on profile
  if (user?.transformationIntent) {
    suggestions.push({
      key: `intent-${user.transformationIntent}`,
      label: truncate(`Start: ${user.transformationIntent.replace('_', ' ')}`, 24),
      prompt: `Begin a short plan for my ${user.transformationIntent.replace('_', ' ')}.`
    })
  }
  if (user?.realityFocus) {
    suggestions.push({
      key: `focus-${user.realityFocus}`,
      label: truncate(`Apply to ${user.realityFocus.replace('_', ' ')}`, 24),
      prompt: `Apply two screens to my ${user.realityFocus.replace('_', ' ')}.`
    })
  }

  // Core Tufti topics
  const core: Array<[string, string]> = [
    ['twoScreens', 'Two screens'],
    ['intentionPlait', 'Plait activation'],
    ['pendulums', 'Spot pendulums'],
    ['beingPresent', 'Be present'],
    ['composingReality', 'Compose next frame'],
  ]
  core.forEach(([key, label]) => {
    if ((TUFTI_CHAPTERS as any)[key] || (RT_CHAPTERS as any)[key]) {
      suggestions.push({
        key: `chapter-${key}`,
        label,
        prompt: label === 'Two screens'
          ? 'Guide me through the two screens in daily life.'
          : label === 'Plait activation'
          ? 'Help me activate the plait for a small goal.'
          : label === 'Spot pendulums'
          ? 'Help me spot pendulums in my current scene.'
          : label === 'Be present'
          ? 'Start a 3-step awareness practice with me.'
          : 'Show me how to compose the next frame of reality.'
      })
    }
  })

  // Deduplicate by key and cap to 6
  const dedup = new Map<string, Suggestion>()
  for (const s of suggestions) {
    if (!dedup.has(s.key)) dedup.set(s.key, s)
    if (dedup.size >= 6) break
  }
  return Array.from(dedup.values())
}


