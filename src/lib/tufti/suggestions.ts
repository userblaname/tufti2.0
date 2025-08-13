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

export function buildContextualSuggestions(lastUserText: string): Suggestion[] {
  const text = (lastUserText || '').trim()
  if (!text) return []

  function make(label: string, prompt: string, keyHint: string): Suggestion {
    return { key: `cx-${keyHint}-${label.toLowerCase().replace(/\s+/g, '-')}`.slice(0, 60), label, prompt }
  }

  const lower = text.toLowerCase()
  const topic = text.length > 80 ? text.slice(0, 80) + '…' : text

  const out: Suggestion[] = []
  const push = (s: Suggestion) => {
    if (!out.find(x => x.key === s.key)) out.push(s)
  }

  if (/\bhow\b|\bsteps?\b|\bplan\b/.test(lower)) {
    push(make('Step-by-step plan', `Give me a concise step-by-step plan for: ${topic}`, 'steps'))
    push(make('Simple example', `Show a minimal example to get started with: ${topic}`, 'example'))
  }

  if (/\bcompare\b|vs\b|versus\b|\boption\b|\bchoose\b/.test(lower)) {
    push(make('Compare options', `Compare the main options for: ${topic} with pros and cons`, 'compare'))
    push(make('Best recommendation', `Given my context, recommend the best option for: ${topic}`, 'recommend'))
  }

  if (/\bwhy\b|\bproblem\b|\bissue\b|\bnot working\b/.test(lower)) {
    push(make('Troubleshoot', `Diagnose likely causes and fixes for: ${topic}`, 'troubleshoot'))
    push(make('Checklist', `Give a quick checklist to validate and fix: ${topic}`, 'checklist'))
  }

  if (out.length === 0) {
    push(make('Summarize', `Summarize my request in 3 bullets, then ask 2 clarifying questions about: ${topic}`, 'summarize'))
    push(make('Action checklist', `Create a small action checklist for: ${topic}`, 'actions'))
  }

  return out.slice(0, 4)
}


