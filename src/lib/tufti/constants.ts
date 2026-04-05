// ╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗
// ║  TUFTI SYSTEM PROMPT — MOVED TO BACKEND (netlify/functions/lib/tufti-prompt.js)                     ║
// ║  The prompt is no longer shipped in the frontend bundle for security + performance.                  ║
// ╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝

// Kept as empty string for backwards compatibility — prompt lives in netlify/functions/lib/tufti-prompt.js
export const TUFTI_SYSTEM_PROMPT = ''

// ╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗
// ║                                   SIDEBAR QUICK WISDOM DATA                                          ║
// ╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝

/**
 * Daily quotes for the sidebar - curated from Transurfing books
 * Displayed one at a time, changes on refresh or when user clicks "new quote"
 */
export const SIDEBAR_QUOTES = [
   "Slide to a reality where this has already happened.",
   "The pendulum feeds on your resistance.",
   "Reduce importance, and it shall come.",
   "You are the director of your own reality film.",
   "Stop fighting the current frame. It's already happened.",
   "Your soul knows. Your mind just forgot to ask.",
   "The world is a mirror reflecting your inner state.",
   "Importance creates excess potential that attracts problems.",
   "Don't desire. Intend.",
   "Wake up in the dream while you're still dreaming.",
   "The alternatives space contains infinite variations.",
   "Energy follows attention. Guard your attention.",
   "You're not stuck. You're just composing the same frame.",
   "Don't give your energy to pendulums.",
   "The key is not to want, but to allow.",
   "Every frame is already there. You just choose which to illuminate.",
   "Your plait is dormant. Wake it up.",
   "Stop being an actor. Become the director.",
   "The Overseer sees what the mind cannot.",
   "It's all very simple. You just need to wake up."
]

/**
 * Quick wisdom topics for sidebar navigation
 * Clicking a topic fills the chat input with the pre-written prompt
 */
export const WISDOM_TOPICS = [
   {
      id: "pendulums",
      label: "Pendulums",
      icon: "🌀",
      prompt: "What are pendulums and how do they control my energy? How can I protect myself?"
   },
   {
      id: "importance",
      label: "Importance",
      icon: "⚖️",
      prompt: "How does importance create excess potential? How do I reduce importance to manifest my goals?"
   },
   {
      id: "intention",
      label: "Intention",
      icon: "🎯",
      prompt: "What's the difference between inner and outer intention? How do I activate outer intention?"
   },
   {
      id: "slides",
      label: "The Slide",
      icon: "🎬",
      prompt: "How do I practice the slide technique? Can you guide me through visualizing my target slide?"
   },
   {
      id: "alternatives",
      label: "Alternatives",
      icon: "🌌",
      prompt: "What is the alternatives space? How do I access different lifelines and possibilities?"
   },
   {
      id: "heart",
      label: "Heart & Soul",
      icon: "💫",
      prompt: "How do I align my mind with my heart and soul? What is the union Tufti speaks of?"
   }
]

/**
 * Get a random quote from the sidebar quotes
 */
export const getRandomQuote = (): string => {
   return SIDEBAR_QUOTES[Math.floor(Math.random() * SIDEBAR_QUOTES.length)]
}

/**
 * Get a random wisdom topic for "Surprise Me" feature
 */
export const getRandomTopic = () => {
   return WISDOM_TOPICS[Math.floor(Math.random() * WISDOM_TOPICS.length)]
}

/**
 * Message type for quote extraction
 */
interface ChatMessage {
   role: 'user' | 'assistant'
   content: string
}

/**
 * Extract notable quotes from chat history
 * Looks for:
 * - Italic quotes: *"quote text"*
 * - Regular quotes: "quote text"
 * - Book citations: "quote" — [Book Name] or [Book Name]
 */
export const extractQuotesFromHistory = (messages: ChatMessage[]): string[] => {
   const quotes: string[] = []

   // Only look at AI/assistant messages
   const aiMessages = messages.filter(m => m.role === 'assistant')

   for (const message of aiMessages) {
      const content = message.content

      // Pattern 1: Italic quotes *"text"* or *"text"*
      const italicQuotes = content.match(/\*"([^"]{20,120})"\*/g)
      if (italicQuotes) {
         italicQuotes.forEach(q => {
            const clean = q.replace(/\*"/g, '').replace(/"\*/g, '').trim()
            if (clean.length >= 20 && clean.length <= 120) {
               quotes.push(clean)
            }
         })
      }

      // Pattern 2: Regular quotes with attribution "text" — [Book] or "text". [Book]
      const attributedQuotes = content.match(/"([^"]{20,120})"[^"]*\[([^\]]+)\]/g)
      if (attributedQuotes) {
         attributedQuotes.forEach(q => {
            const match = q.match(/"([^"]+)"/)
            if (match && match[1].length >= 20 && match[1].length <= 120) {
               quotes.push(match[1].trim())
            }
         })
      }

      // Pattern 3: Standalone meaningful quotes "text" (not too short)
      const standaloneQuotes = content.match(/"([^"]{30,100})"/g)
      if (standaloneQuotes) {
         standaloneQuotes.forEach(q => {
            const clean = q.replace(/"/g, '').trim()
            // Filter out common non-quote patterns
            if (
               clean.length >= 30 &&
               clean.length <= 100 &&
               !clean.includes('?') && // Skip questions
               !clean.startsWith('I ') && // Skip first person
               !clean.toLowerCase().includes('you said') // Skip meta-references
            ) {
               quotes.push(clean)
            }
         })
      }
   }

   // Remove duplicates and return
   const unique = [...new Set(quotes)]
   return unique
}

/**
 * Get a personal quote from history, or fall back to curated quotes
 */
export const getPersonalOrRandomQuote = (messages: ChatMessage[]): { quote: string; isPersonal: boolean } => {
   const personalQuotes = extractQuotesFromHistory(messages)

   if (personalQuotes.length > 0) {
      const quote = personalQuotes[Math.floor(Math.random() * personalQuotes.length)]
      return { quote, isPersonal: true }
   }

   return { quote: getRandomQuote(), isPersonal: false }
}
