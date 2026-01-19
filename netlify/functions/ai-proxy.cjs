/**
 * Tufti AI Proxy - Netlify Serverless Function
 * 
 * Full Tufti backend with:
 * - Elite Intent Detection
 * - RAG with Pinecone (Books + Courses)
 * - Memory Handler
 * - Claude via Azure Anthropic
 */

const { Pinecone } = require('@pinecone-database/pinecone');

// ============================================
// CONFIGURATION
// ============================================
const ANTHROPIC_ENDPOINT = process.env.ANTHROPIC_ENDPOINT;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-5';
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX || 'tufti-knowledge-v2';
const AZURE_EMBEDDING_ENDPOINT = process.env.AZURE_EMBEDDING_ENDPOINT;
const AZURE_EMBEDDING_KEY = process.env.AZURE_EMBEDDING_KEY;
const AZURE_EMBEDDING_DEPLOYMENT = process.env.AZURE_EMBEDDING_DEPLOYMENT;
const EMBEDDING_DIMENSIONS = 3072;

// Rate limiting
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 30;
const buckets = new Map();

// Pinecone client
let pinecone = null;
let index = null;

// ============================================
// INTENT DETECTION (Elite v2.0)
// ============================================
const EMOTIONAL_PATTERNS = {
  vulnerable: [/i('m| am) (lost|stuck|confused|struggling)/i, /nothing (is )?work(s|ing)/i, /can't (seem to|figure)/i],
  frustrated: [/this (is|isn't) work(ing)?/i, /i('ve| have) tried everything/i],
  curious: [/what (is|are|does)/i, /how (does|do|can)/i, /tell me (about|more)/i],
  determined: [/i want to/i, /i need to/i, /how (do|can) i/i]
};

const TRANSURFING_CONCEPTS = ['pendulum', 'intention', 'outer intention', 'reality', 'film', 'frame', 'slide', 'importance', 'awareness', 'dream'];

function detectEmotionalState(message) {
  const lower = message.toLowerCase();
  for (const [emotion, patterns] of Object.entries(EMOTIONAL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lower)) return emotion;
    }
  }
  return 'neutral';
}

function detectIntent(message) {
  const lower = message.toLowerCase();

  // Greetings
  if (/^(hi|hello|hey|salam|thanks|bye|ok|yes|no)[\s!.,]*$/i.test(message.trim())) {
    return { type: 'chat', sourcePreference: { books: 0.5, courses: 0.5 } };
  }

  // Quote request
  if (/quote|exact words|verbatim|cite/i.test(lower)) {
    return { type: 'quote', sourcePreference: { books: 0.9, courses: 0.2 } };
  }

  // Action request
  if (/how (do|can|should) i/i.test(lower) || /exercise|practice|step/i.test(lower)) {
    return { type: 'action', sourcePreference: { books: 0.4, courses: 0.9 } };
  }

  // Concept exploration
  for (const concept of TRANSURFING_CONCEPTS) {
    if (lower.includes(concept)) {
      return { type: 'concept', sourcePreference: { books: 0.8, courses: 0.5 } };
    }
  }

  // Default
  return { type: 'concept', sourcePreference: { books: 0.6, courses: 0.6 } };
}

// ============================================
// RAG FUNCTIONS
// ============================================
async function initPinecone() {
  if (!pinecone && PINECONE_API_KEY) {
    pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    index = pinecone.Index(PINECONE_INDEX);
    console.log('✓ Pinecone connected');
  }
}

async function getEmbedding(text) {
  const url = `${AZURE_EMBEDDING_ENDPOINT}/openai/deployments/${AZURE_EMBEDDING_DEPLOYMENT}/embeddings?api-version=2024-02-01`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': AZURE_EMBEDDING_KEY },
    body: JSON.stringify({ input: text, dimensions: EMBEDDING_DIMENSIONS })
  });
  const data = await response.json();
  return data.data[0].embedding;
}

async function searchRAG(query, topK = 5) {
  if (!index) return [];

  try {
    const embedding = await getEmbedding(query);
    const results = await index.query({
      vector: embedding,
      topK: topK,
      includeMetadata: true
    });

    return results.matches.map(m => ({
      text: m.metadata.text,
      source: m.metadata.source,
      source_type: m.metadata.source_type || 'book',
      author: m.metadata.author,
      score: m.score
    }));
  } catch (error) {
    console.error('RAG search error:', error.message);
    return [];
  }
}

function formatRAGContext(passages, intent, emotional) {
  if (!passages.length) return '';

  const books = passages.filter(p => p.source_type === 'book');
  const courses = passages.filter(p => p.source_type === 'course');

  let formatted = '';

  if (books.length > 0) {
    formatted += `\n📚 ZELAND'S BOOKS:\n${books.map(p => `"${p.text.substring(0, 500)}..." — [${p.source}]`).join('\n\n')}`;
  }

  if (courses.length > 0) {
    formatted += `\n\n🎓 PRACTITIONER COURSES:\n${courses.map(p => `"${p.text.substring(0, 500)}..." — [${p.author}: ${p.source}]`).join('\n\n')}`;
  }

  let emotionalGuidance = '';
  if (emotional === 'vulnerable') {
    emotionalGuidance = '\n⚠️ EMOTIONAL CONTEXT: User seems vulnerable. Lead with compassion.';
  } else if (emotional === 'frustrated') {
    emotionalGuidance = '\n⚠️ EMOTIONAL CONTEXT: User seems frustrated. Acknowledge their struggle.';
  }

  // Anti-hallucination source manifest
  const sourceManifest = `
⚠️ CRITICAL: YOUR AVAILABLE KNOWLEDGE SOURCES
You have access to ONLY these sources. DO NOT invent or hallucinate others:

📚 BOOKS (by Vadim Zeland):
• Reality Transurfing Steps I-V
• Tufti the Priestess
• What Tufti Didn't Say
• Master of Reality

🎓 COURSES (by Renee Garcia):
• Reality 2.0 (Pendulums, Alternatives Space, Wave of Fortune, etc.)
• Becoming Magnetic (Self-love, relationships, declarations)
• Mo Money (Wealth, limiting beliefs, materialization)

⛔ IF YOU DON'T HAVE IT ABOVE, IT DOESN'T EXIST IN YOUR KNOWLEDGE.
Do NOT make up course names, quotes, or teachings that aren't retrieved.`;

  return `\n═══════════════════════════════════════\n📚 RETRIEVED KNOWLEDGE${emotionalGuidance}\n═══════════════════════════════════════${formatted}\n═══════════════════════════════════════\n${sourceManifest}\n═══════════════════════════════════════`;
}

// ============================================
// RATE LIMITING
// ============================================
function getClientIP(event) {
  const xff = event.headers['x-forwarded-for'] || '';
  return xff.split(',')[0].trim() || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = buckets.get(ip) || { start: now, count: 0 };
  if (now - bucket.start > RATE_LIMIT_WINDOW_MS) {
    buckets.set(ip, { start: now, count: 1 });
    return false;
  }
  bucket.count++;
  buckets.set(ip, bucket);
  return bucket.count > RATE_LIMIT_MAX;
}

// ============================================
// MAIN HANDLER
// ============================================
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const clientIP = getClientIP(event);
  if (isRateLimited(clientIP)) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Rate limited' }) };
  }

  try {
    await initPinecone();

    const { messages, systemPrompt } = JSON.parse(event.body || '{}');

    if (!Array.isArray(messages) || messages.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing messages' }) };
    }

    // Get user message for RAG
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const userMessage = typeof lastUserMsg?.content === 'string'
      ? lastUserMsg.content
      : lastUserMsg?.content?.find(b => b.type === 'text')?.text || '';

    // Elite intent detection
    const intent = detectIntent(userMessage);
    const emotional = detectEmotionalState(userMessage);

    console.log(`🎯 Intent: ${intent.type} | Emotional: ${emotional}`);

    // RAG retrieval with source preference
    let ragContext = '';
    if (intent.type !== 'chat' && PINECONE_API_KEY && AZURE_EMBEDDING_KEY) {
      const passages = await searchRAG(userMessage, 10);

      // Apply source preference weighting
      const weighted = passages.map(p => ({
        ...p,
        adjustedScore: p.score * (p.source_type === 'book' ? intent.sourcePreference.books : intent.sourcePreference.courses)
      }));
      weighted.sort((a, b) => b.adjustedScore - a.adjustedScore);

      ragContext = formatRAGContext(weighted.slice(0, 5), intent, emotional);
    }

    // Build full system prompt
    const fullSystemPrompt = (systemPrompt || '') + ragContext;

    // Call Claude
    const response = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 4096,
        system: fullSystemPrompt,
        messages: messages.map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : m.content
        }))
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude error:', error);
      return { statusCode: response.status, body: error };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    };

  } catch (error) {
    console.error('Function error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};