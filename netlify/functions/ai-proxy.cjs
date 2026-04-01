/**
 * Tufti AI Proxy - Netlify Serverless Function
 * 
 * Full Tufti backend with:
 * - Elite Intent Detection
 * - RAG with Pinecone (Books + Courses)
 * - Memory Handler Setup Support
 * - Claude via Azure Anthropic
 */

const { Pinecone } = require('@pinecone-database/pinecone');
const Sentry = require('@sentry/node');
const { createClient } = require('@supabase/supabase-js');

// ============================================
// CONFIGURATION
// ============================================
const SENTRY_DSN = process.env.SENTRY_DSN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

const ANTHROPIC_ENDPOINT = process.env.ANTHROPIC_ENDPOINT;
// Support both new and legacy env var names for the Azure Anthropic API key
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.AZURE_OPENAI_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-5';
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX || 'tufti-knowledge-v2';
const AZURE_EMBEDDING_ENDPOINT = process.env.AZURE_EMBEDDING_ENDPOINT;
const AZURE_EMBEDDING_KEY = process.env.AZURE_EMBEDDING_KEY;
const AZURE_EMBEDDING_DEPLOYMENT = process.env.AZURE_EMBEDDING_DEPLOYMENT;
const EMBEDDING_DIMENSIONS = 3072;

// Initialize Sentry
if (SENTRY_DSN) {
  Sentry.init({ 
    dsn: SENTRY_DSN,
    tracesSampleRate: 1.0
  });
}

// Initialize Supabase
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// Rate limiting
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 20;
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
// PROFILE & JOURNEY (Supabase)
// ============================================
async function getProfileContext(userId) {
  if (!supabase || !userId) return '';
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('dossier, dossier_text')
      .eq('user_id', userId)
      .single();
    if (error || (!data?.dossier && !data?.dossier_text)) return '';

    // Prefer structured dossier, fall back to text
    if (data.dossier && Object.keys(data.dossier).length > 0) {
      const d = data.dossier;
      let prompt = '\n═══════════════════════════════════════════════════════════════\n📋 USER PROFILE DOSSIER — PERMANENT MEMORY\n═══════════════════════════════════════════════════════════════\n\n';
      if (d.identity) {
        prompt += 'IDENTITY:\n';
        if (d.identity.name) prompt += `  Name: ${d.identity.name}\n`;
        if (d.identity.location) prompt += `  Location: ${d.identity.location}\n`;
        if (d.identity.occupation) prompt += `  Occupation: ${d.identity.occupation}\n`;
        if (d.identity.languages?.length) prompt += `  Languages: ${d.identity.languages.join(', ')}\n`;
        prompt += '\n';
      }
      if (d.people && Object.keys(d.people).length > 0) {
        prompt += 'IMPORTANT PEOPLE:\n';
        for (const [name, info] of Object.entries(d.people)) {
          const rel = typeof info === 'object' ? info.relationship : info;
          prompt += `  • ${name}: ${rel}\n`;
        }
        prompt += '\n';
      }
      if (d.current_state) {
        if (d.current_state.goals?.length > 0) {
          prompt += 'ACTIVE GOALS:\n';
          d.current_state.goals.forEach(g => prompt += `  • ${g}\n`);
          prompt += '\n';
        }
        if (d.current_state.focus) prompt += `CURRENT FOCUS: ${d.current_state.focus}\n\n`;
      }
      if (d.important_facts?.length > 0) {
        prompt += 'IMPORTANT FACTS:\n';
        d.important_facts.forEach(f => prompt += `  • ${f}\n`);
        prompt += '\n';
      }
      prompt += '═══════════════════════════════════════════════════════════════\nCRITICAL: These are verified facts. NEVER contradict them.\n═══════════════════════════════════════════════════════════════';
      return prompt;
    }

    if (data.dossier_text) {
      return `\n═══════════════════════════════════════════════════════════════\n📋 PERMANENT MEMORY — WHAT YOU KNOW ABOUT THIS PERSON\n═══════════════════════════════════════════════════════════════\n\n${data.dossier_text}\n\n═══════════════════════════════════════════════════════════════\nCRITICAL: These are CONFIRMED facts. Never contradict them.\n═══════════════════════════════════════════════════════════════`;
    }
    return '';
  } catch (err) {
    console.error('[Profile] Fetch error:', err.message);
    return '';
  }
}

async function getJourneyContext(userId) {
  if (!supabase || !userId) return '';
  try {
    const { data, error } = await supabase
      .from('user_journey')
      .select('summary, struggles, breakthroughs, current_focus')
      .eq('user_id', userId)
      .single();
    if (error || !data?.summary) return '';

    const struggles = Array.isArray(data.struggles) ? data.struggles : [];
    const breakthroughs = Array.isArray(data.breakthroughs) ? data.breakthroughs : [];

    return `\n═══════════════════════════════════════════════════════════════\n🧠 TUFTI'S MEMORY OF THIS SOUL\n═══════════════════════════════════════════════════════════════\n\nJOURNEY SO FAR:\n${data.summary}\n\n${struggles.length > 0 ? `CURRENT STRUGGLES:\n${struggles.map(s => `• ${s}`).join('\n')}\n\n` : ''}${breakthroughs.length > 0 ? `BREAKTHROUGHS:\n${breakthroughs.map(b => `• ${b}`).join('\n')}\n\n` : ''}${data.current_focus ? `CURRENT FOCUS:\n${data.current_focus}\n\n` : ''}═══════════════════════════════════════════════════════════════\nUse this context to personalize your guidance.\n═══════════════════════════════════════════════════════════════`;
  } catch (err) {
    console.error('[Journey] Fetch error:', err.message);
    return '';
  }
}

// ============================================
// MAIN HANDLER
// ============================================
exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { messages, userId, thinkingEnabled: reqThinkingEnabled } = JSON.parse(event.body || '{}');
    const uid = userId || 'default-user';
    const isAdmin = uid === ADMIN_USER_ID;

    // 1. Rate Limiting Check
    const clientIP = getClientIP(event);
    if (!isAdmin && isRateLimited(clientIP)) {
      return { statusCode: 429, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Rate limited' }) };
    }

    // 2. Daily Message Limit
    if (!isAdmin && supabase) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .gte('created_at', today.toISOString());

      if (!error && count >= 50) {
        return {
          statusCode: 429,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'daily_limit_reached',
            message: "You've walked far enough for today, dear one. The scene needs time to develop. Come back tomorrow, the alternatives space will still be there."
          })
        };
      }
    }

    await initPinecone();

    if (!Array.isArray(messages) || messages.length === 0) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Missing messages' }) };
    }

    // Separate system messages from conversation messages
    // Frontend sends Tufti system prompt as role:'system' in messages array
    // Anthropic API requires system as a separate parameter
    const systemMessages = messages.filter(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');
    const systemPrompt = systemMessages
      .map(m => typeof m.content === 'string' ? m.content : '')
      .filter(Boolean)
      .join('\n\n');

    // Get user message for RAG
    const lastUserMsg = [...chatMessages].reverse().find(m => m.role === 'user');
    const userMessage = typeof lastUserMsg?.content === 'string'
      ? lastUserMsg.content
      : lastUserMsg?.content?.find?.(b => b.type === 'text')?.text || '';

    // Elite intent detection
    const intent = detectIntent(userMessage);
    const emotional = detectEmotionalState(userMessage);

    console.log(`[Intent] ${intent.type} | Emotional: ${emotional} | User: ${uid.substring(0, 8)}... | Admin: ${isAdmin}`);

    // Parallel fetch: RAG + Profile + Journey
    const [ragContext, profileContext, journeyContext] = await Promise.all([
      (async () => {
        if (intent.type === 'chat' || !PINECONE_API_KEY || !AZURE_EMBEDDING_KEY) return '';
        const passages = await searchRAG(userMessage, 10);
        const weighted = passages.map(p => ({
          ...p,
          adjustedScore: p.score * (p.source_type === 'book' ? intent.sourcePreference.books : intent.sourcePreference.courses)
        }));
        weighted.sort((a, b) => b.adjustedScore - a.adjustedScore);
        return formatRAGContext(weighted.slice(0, 5), intent, emotional);
      })(),
      getProfileContext(uid),
      getJourneyContext(uid)
    ]);

    if (profileContext) console.log(`[Profile] Loaded dossier for ${uid.substring(0, 8)}...`);
    if (journeyContext) console.log(`[Journey] Loaded context for ${uid.substring(0, 8)}...`);

    // Build full system prompt: Tufti persona + profile + journey + RAG
    const fullSystemPrompt = systemPrompt + profileContext + journeyContext + ragContext;

    // 3. Thinking Mode — disabled on Azure AI Foundry (not supported)
    const thinkingEnabled = false;

    const fetchBody = {
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: fullSystemPrompt,
      messages: chatMessages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : m.content
      }))
    };

    // Call Claude via Azure AI Foundry
    const requestHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    };

    // Diagnostic logging — shows in Netlify function logs
    console.log('[Claude] → Sending to Azure:', ANTHROPIC_ENDPOINT);
    console.log('[Claude] → Model:', ANTHROPIC_MODEL, '| max_tokens:', fetchBody.max_tokens);
    console.log('[Claude] → System length:', fullSystemPrompt.length, 'chars');
    console.log('[Claude] → Messages:', JSON.stringify(fetchBody.messages.map(m => ({
      role: m.role,
      len: typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length
    }))));

    let response = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(fetchBody)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Claude] Azure error:', response.status, errorBody.substring(0, 1000));
      console.error('[Claude] Request model:', ANTHROPIC_MODEL, '| Messages:', chatMessages.length, '| System length:', fullSystemPrompt.length);
      let errorMsg;
      try { errorMsg = JSON.parse(errorBody)?.error?.message || errorBody; } catch { errorMsg = errorBody; }
      return { statusCode: response.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: errorMsg.substring(0, 500) }) };
    }

    const data = await response.json();
    // Handle both regular and thinking responses
    const content = data.content
      ?.filter(block => block.type === 'text')
      ?.map(block => block.text)
      ?.join('') || '';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    };

  } catch (error) {
    console.error('[Function] Error:', error);

    // 4. Capture Exceptions with Sentry
    if (SENTRY_DSN) {
      Sentry.captureException(error);
    }

    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: error.message }) };
  }
};