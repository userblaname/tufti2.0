import type { Message } from '@/lib/types'

interface Keyword {
    word: string
    count: number
}

// Common stop words to filter out
const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'i', 'me', 'my', 'you', 'your', 'he', 'she', 'it', 'we', 'they',
    'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
    'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only',
    'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now',
    'here', 'there', 'then', 'if', 'else', 'because', 'about', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'between',
    'under', 'again', 'further', 'once', 'any', 'out', 'up', 'down',
    'off', 'over', 'well', 'ok', 'okay', 'yes', 'no', 'hi', 'hello',
    'hey', 'please', 'thanks', 'thank', 'sure', 'like', 'just', 'really',
    'want', 'know', 'think', 'make', 'get', 'go', 'see', 'look', 'come',
    'take', 'use', 'find', 'give', 'tell', 'try', 'ask', 'work', 'seem',
    'feel', 'let', 'put', 'keep', 'begin', 'seem', 'help', 'show', 'hear',
    'play', 'run', 'move', 'live', 'believe', 'hold', 'bring', 'happen',
    'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include',
    'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch',
    'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend',
    'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider',
    'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build',
    'stay', 'fall', 'cut', 'reach', 'kill', 'remain', 'suggest', 'raise',
    'pass', 'sell', 'require', 'report', 'decide', 'pull', 'mean', 'im',
    'dont', 'cant', 'wont', 'its', 'thats', 'whats', 'hows', 'lets',
])

// Tufti/Transurfing related keywords to boost
const PRIORITY_KEYWORDS = new Set([
    'transurfing', 'tufti', 'plait', 'pendulum', 'pendulums', 'frame',
    'intention', 'reality', 'film', 'director', 'script', 'importance',
    'awareness', 'consciousness', 'screen', 'screens', 'outer', 'inner',
    'alternatives', 'space', 'wave', 'fortune', 'harmony', 'balance',
    'energy', 'overseer', 'soul', 'mind', 'heart', 'goal', 'slide',
    'visualization', 'mirror', 'reflection', 'composition', 'meditation',
    'practice', 'exercise', 'technique', 'method', 'transform', 'awaken'
])

/**
 * Extract meaningful keywords from messages
 */
export function extractKeywords(messages: Message[]): Keyword[] {
    const wordCounts = new Map<string, number>()

    for (const msg of messages) {
        if (!msg.text) continue

        // Only analyze user messages (more intentional)
        if (msg.sender !== 'user') continue

        // Tokenize and clean
        const words = msg.text
            .toLowerCase()
            .replace(/[^\w\s'-]/g, ' ') // Keep apostrophes and hyphens
            .split(/\s+/)
            .filter(word => {
                // Filter criteria
                if (word.length < 3) return false
                if (word.length > 20) return false
                if (STOP_WORDS.has(word)) return false
                if (/^\d+$/.test(word)) return false // Pure numbers
                return true
            })

        // Count words
        for (const word of words) {
            const normalizedWord = word.replace(/['-]/g, '')
            const current = wordCounts.get(normalizedWord) || 0
            wordCounts.set(normalizedWord, current + 1)
        }
    }

    // Convert to array and sort
    const keywords: Keyword[] = []

    for (const [word, count] of wordCounts.entries()) {
        // Only include words that appear more than once OR are priority keywords
        if (count >= 2 || PRIORITY_KEYWORDS.has(word)) {
            keywords.push({ word, count })
        }
    }

    // Sort by: priority keywords first, then by count
    keywords.sort((a, b) => {
        const aPriority = PRIORITY_KEYWORDS.has(a.word) ? 1 : 0
        const bPriority = PRIORITY_KEYWORDS.has(b.word) ? 1 : 0

        if (aPriority !== bPriority) return bPriority - aPriority
        return b.count - a.count
    })

    return keywords.slice(0, 20) // Top 20 keywords
}

/**
 * Extract keywords from a single message text
 */
export function extractKeywordsFromText(text: string): string[] {
    const words = text
        .toLowerCase()
        .replace(/[^\w\s'-]/g, ' ')
        .split(/\s+/)
        .filter(word => {
            if (word.length < 3) return false
            if (word.length > 20) return false
            if (STOP_WORDS.has(word)) return false
            if (/^\d+$/.test(word)) return false
            return true
        })
        .map(word => word.replace(/['-]/g, ''))

    // Deduplicate
    return [...new Set(words)]
}

/**
 * Check if a keyword is a priority Tufti/Transurfing term
 */
export function isPriorityKeyword(word: string): boolean {
    return PRIORITY_KEYWORDS.has(word.toLowerCase())
}
