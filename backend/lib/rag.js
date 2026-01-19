/**
 * RAG Module - Elite Hybrid System v3.0
 * Features:
 * - Elite Intent Detection (emotion + archetypes + source preference)
 * - Direct Book Access (read pages/chapters from .txt files)
 * - Hybrid Search (Semantic + Keyword)
 * - Source-Aware Routing (Books vs Courses)
 */

const { Pinecone } = require('@pinecone-database/pinecone');
const fs = require('fs').promises;
const path = require('path');
const { detectIntentElite } = require('./intent-detector');

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const INDEX_NAME = process.env.PINECONE_INDEX || 'tufti-knowledge'; // Use env var, fallback to default

// Azure OpenAI Embedding config
const AZURE_EMBEDDING_ENDPOINT = process.env.AZURE_EMBEDDING_ENDPOINT;
const AZURE_EMBEDDING_KEY = process.env.AZURE_EMBEDDING_KEY;
const AZURE_EMBEDDING_DEPLOYMENT = process.env.AZURE_EMBEDDING_DEPLOYMENT;
const EMBEDDING_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS || '3072'); // text-embedding-3-large dimension

// Book file paths (now in data/books/ subfolder)
const BOOKS_DIR = path.join(__dirname, '../../data/books');
const BOOKS = {
    'tufti': 'Tufti_the_Priestess_Live_Stroll_Through_A_-_Vadim_Zeland (1).txt',
    'transurfing': 'Reality_Transurfing_Steps_I-V_-_Vadim_Zeland (1).txt',
    'master': 'Master_of_reality_-_Vadim_Zeland.txt',
    'didntsay': 'What_Tufti_Didnt_Say_-_Vadim_Zeland.txt'
};

// Intent types
const INTENT = {
    READ: 'READ',       // Read page/chapter directly
    QUOTE: 'QUOTE',     // Find exact quote
    CONCEPT: 'CONCEPT', // Explain a concept
    CHAT: 'CHAT'        // Casual chat, no RAG
};

// Transurfing keywords for CONCEPT detection
const TRANSURFING_KEYWORDS = [
    'plait', 'intention', 'outer intention', 'inner intention',
    'pendulum', 'pendulums', 'film', 'frame', 'reality',
    'screen', 'screens', 'awareness', 'awake', 'wake up', 'waking',
    'dream', 'dreaming', 'sleep', 'asleep',
    'attention', 'focus', 'awareness centre', 'awareness center',
    'transurfing', 'zeland', 'vadim', 'tufti', 'priestess',
    'alternatives', 'alternative space', 'space of variations',
    'lifeline', 'life line', 'film roll', 'mannequin',
    'importance', 'potential', 'excess potential',
    'mirror', 'reflection', 'coordinates',
    'compose', 'composing reality', 'shift', 'slide',
    'manifest', 'visualization', 'illuminate',
    'what is', 'how do i', 'tell me about', 'explain',
    'how to', 'teach me', 'what does', 'overseer'
];

// Initialize components
let pinecone = null;
let index = null;
let booksLoaded = {};

/**
 * PURE GREETING CHECK - Only these skip RAG
 */
const PURE_GREETING_PATTERNS = [
    /^(hi|hello|hey|hola|bonjour|ciao)[\s!.,]*$/i,
    /^(salam|marhaba|ahlan)[\s!.,]*$/i,
    /^(good morning|good afternoon|good evening|good night|gm|gn)[\s!.,]*$/i,
    /^(thanks|thank you|merci|shukran|gracias)[\s!.,]*$/i,
    /^(bye|goodbye|see you|later|ciao)[\s!.,]*$/i,
    /^(ok|okay|cool|great|nice|perfect)[\s!.,]*$/i,
    /^(yes|no|yeah|nope|yep)[\s!.,]*$/i
];

function isPureGreeting(message) {
    const trimmed = message.trim();
    // Very short messages that match greeting patterns
    if (trimmed.length > 30) return false; // Long messages are not greetings

    for (const pattern of PURE_GREETING_PATTERNS) {
        if (pattern.test(trimmed)) {
            return true;
        }
    }
    return false;
}

/**
 * INTENT DETECTION - Determines what the user wants
 */
function detectIntent(message) {
    const lower = message.toLowerCase();

    // READ Intent - User wants to read from the book directly
    const readPatterns = [
        /read.*page/i,
        /read.*chapter/i,
        /show me.*page/i,
        /show me.*chapter/i,
        /first page/i,
        /page \d+/i,
        /chapter \d+/i,
        /chapter [ivxlc]+/i,
        /from the book/i,
        /let'?s read/i,
        /read.*together/i,
        /read.*book/i,
        /start reading/i,
        /open.*book/i,
        /beginning of/i,
        /foreword/i,
        /introduction/i
    ];

    for (const pattern of readPatterns) {
        if (pattern.test(lower)) {
            return { type: INTENT.READ, message };
        }
    }

    // QUOTE Intent - User wants an exact quote
    const quotePatterns = [
        /quote/i,
        /exact.*words/i,
        /what did.*say about/i,
        /\"[^\"]+\"/,  // Text in quotes
        /'[^']+'/, // Text in single quotes
        /word for word/i,
        /verbatim/i,
        /cite/i,
        /passage about/i
    ];

    for (const pattern of quotePatterns) {
        if (pattern.test(lower)) {
            return { type: INTENT.QUOTE, message };
        }
    }

    // CONCEPT Intent - User wants to understand a concept
    for (const keyword of TRANSURFING_KEYWORDS) {
        if (lower.includes(keyword)) {
            return { type: INTENT.CONCEPT, message };
        }
    }

    // Check if it's a question (likely seeking knowledge)
    if (lower.includes('?')) {
        return { type: INTENT.CONCEPT, message };
    }

    // Default to CHAT - casual conversation
    return { type: INTENT.CHAT, message };
}

/**
 * DIRECT BOOK ACCESS - Read pages/chapters from files
 */
async function readFromBook(message) {
    const lower = message.toLowerCase();

    // Determine which book
    let bookKey = 'transurfing'; // default
    if (lower.includes('tufti')) bookKey = 'tufti';
    if (lower.includes('master')) bookKey = 'master';
    if (lower.includes("didn't say") || lower.includes('didnt say')) bookKey = 'didntsay';

    const bookFile = BOOKS[bookKey];
    const bookPath = path.join(BOOKS_DIR, bookFile);

    try {
        // Load book if not cached
        if (!booksLoaded[bookKey]) {
            const content = await fs.readFile(bookPath, 'utf-8');
            booksLoaded[bookKey] = content;
            console.log(`📖 Loaded book: ${bookKey}`);
        }

        const content = booksLoaded[bookKey];
        const lines = content.split('\n');

        // Parse what user wants
        let startLine = 0;
        let numLines = 100; // Default chunk size

        // First page / beginning
        if (lower.includes('first page') || lower.includes('beginning') || lower.includes('foreword')) {
            // Find foreword or first chapter
            const forewordIndex = lines.findIndex(l => l.toUpperCase().includes('FOREWORD'));
            startLine = forewordIndex > 0 ? forewordIndex : 0;
            numLines = 80;
        }

        // Chapter request
        const chapterMatch = lower.match(/chapter\s*([ivxlc\d]+)/i);
        if (chapterMatch) {
            const chapterNum = chapterMatch[1].toUpperCase();
            const chapterIndex = lines.findIndex(l =>
                l.toUpperCase().includes(`CHAPTER ${chapterNum}`) ||
                l.toUpperCase().includes(`CHAPTER${chapterNum}`)
            );
            if (chapterIndex > 0) {
                startLine = chapterIndex;
                numLines = 100;
            }
        }

        // Page number request
        const pageMatch = lower.match(/page\s*(\d+)/i);
        if (pageMatch) {
            const pageNum = parseInt(pageMatch[1]);
            // Approximate: ~50 lines per page
            startLine = Math.max(0, (pageNum - 1) * 50);
            numLines = 50;
        }

        // Extract the content
        const extracted = lines.slice(startLine, startLine + numLines).join('\n');

        // Clean up formatting
        const cleaned = extracted
            .replace(/\f/g, '\n\n---\n\n') // Page breaks
            .replace(/OceanofPDF\.com/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        const bookNames = {
            'tufti': 'Tufti the Priestess',
            'transurfing': 'Reality Transurfing Steps I-V',
            'master': 'Master of Reality',
            'didntsay': "What Tufti Didn't Say"
        };

        return {
            success: true,
            book: bookNames[bookKey],
            content: cleaned,
            startLine,
            numLines
        };

    } catch (error) {
        console.error('❌ Book reading error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * KEYWORD SEARCH - Find exact/fuzzy matches in chunks
 */
async function keywordSearch(query, chunks, topK = 5) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    // Score each chunk by keyword matches
    const scored = chunks.map(chunk => {
        const text = chunk.text.toLowerCase();
        let score = 0;

        for (const word of queryWords) {
            if (text.includes(word)) {
                score += 1;
                // Bonus for exact phrase
                if (text.includes(query.toLowerCase())) {
                    score += 5;
                }
            }
        }

        return { ...chunk, keywordScore: score };
    });

    // Sort by keyword score and return top K
    return scored
        .filter(c => c.keywordScore > 0)
        .sort((a, b) => b.keywordScore - a.keywordScore)
        .slice(0, topK);
}

/**
 * Initialize RAG components
 */
async function initRAG() {
    console.log('🔧 Initializing Elite RAG v3.0 (Azure OpenAI Embeddings)...');

    try {
        // Initialize Pinecone
        pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
        index = pinecone.Index(INDEX_NAME);
        console.log(`   ✓ Pinecone connected (${INDEX_NAME})`);

        // Verify Azure embedding config
        if (!AZURE_EMBEDDING_ENDPOINT || !AZURE_EMBEDDING_KEY || !AZURE_EMBEDDING_DEPLOYMENT) {
            throw new Error('Azure embedding config missing');
        }
        console.log(`   ✓ Azure embeddings ready (${AZURE_EMBEDDING_DEPLOYMENT})`);

        // Pre-load books for fast access
        console.log('   Pre-loading books for direct access...');
        for (const [key, file] of Object.entries(BOOKS)) {
            try {
                const bookPath = path.join(BOOKS_DIR, file);
                booksLoaded[key] = await fs.readFile(bookPath, 'utf-8');
                console.log(`   ✓ Loaded: ${key}`);
            } catch (e) {
                console.log(`   ⚠ Could not load: ${key}`);
            }
        }

        console.log('✅ Elite RAG v3.0 ready!\n');
        console.log('   Features: Azure Embeddings | Reranking | Direct Book Access\n');
        return true;
    } catch (error) {
        console.error('❌ RAG initialization failed:', error.message);
        return false;
    }
}

/**
 * Embed a query using Azure OpenAI
 */
async function embedQuery(text) {
    const url = `${AZURE_EMBEDDING_ENDPOINT}/openai/deployments/${AZURE_EMBEDDING_DEPLOYMENT}/embeddings?api-version=2024-02-01`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': AZURE_EMBEDDING_KEY
        },
        body: JSON.stringify({
            input: [text],
            dimensions: EMBEDDING_DIMENSIONS
        })
    });

    if (!response.ok) {
        throw new Error(`Azure embedding failed: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
}

/**
 * RERANK RESULTS - Uses Pinecone's reranker for better relevance
 */
async function rerankResults(query, passages, topK = 5) {
    if (!pinecone || passages.length === 0) return passages;

    try {
        // Prepare documents for reranking
        const documents = passages.map(p => p.text);

        // Call Pinecone's reranker (using open-source BGE model)
        const reranked = await pinecone.inference.rerank(
            "bge-reranker-v2-m3",
            query,
            documents,
            { topN: Math.min(topK, passages.length) }
        );

        // Map reranked results back to passages with new scores
        const rerankedPassages = reranked.data.map(item => ({
            ...passages[item.index],
            score: item.score,
            reranked: true
        }));

        console.log(`   ✨ Reranked ${passages.length} → ${rerankedPassages.length} passages`);
        return rerankedPassages;

    } catch (error) {
        console.warn('⚠️ Reranking failed, using original order:', error.message);
        return passages.slice(0, topK); // Fallback to original
    }
}

/**
 * SEMANTIC SEARCH - Vector similarity search with reranking
 */
async function semanticSearch(query, topK = 5) {
    if (!index) return [];

    try {
        const queryVector = await embedQuery(query);

        // Fetch more candidates for reranking (2x topK)
        const results = await index.query({
            vector: queryVector,
            topK: topK * 3,  // Get more for reranking
            includeMetadata: true,
        });

        const candidates = results.matches
            ?.filter(match => match.score > 0.25)  // Lower threshold since we'll rerank
            .map(match => ({
                text: match.metadata?.text || '',
                book: match.metadata?.book || 'Unknown',
                score: match.score,
                semanticScore: match.score
            })) || [];

        // Rerank for better relevance
        if (candidates.length > 0) {
            return await rerankResults(query, candidates, topK);
        }

        return candidates;
    } catch (error) {
        console.error('❌ Semantic search error:', error.message);
        return [];
    }
}

/**
 * HYBRID SEARCH - Combines semantic + keyword
 */
async function hybridSearch(query, topK = 5) {
    // Get semantic results
    const semanticResults = await semanticSearch(query, topK * 2);

    // Get all chunks for keyword search (from semantic results pool)
    const keywordResults = await keywordSearch(query, semanticResults, topK);

    // Combine scores (70% semantic, 30% keyword)
    const combined = new Map();

    for (const result of semanticResults) {
        const key = result.text.substring(0, 50);
        combined.set(key, {
            ...result,
            combinedScore: result.score * 0.7
        });
    }

    for (const result of keywordResults) {
        const key = result.text.substring(0, 50);
        if (combined.has(key)) {
            const existing = combined.get(key);
            existing.combinedScore += (result.keywordScore / 10) * 0.3;
        } else {
            combined.set(key, {
                ...result,
                combinedScore: (result.keywordScore / 10) * 0.3
            });
        }
    }

    // Sort by combined score and return top K
    return Array.from(combined.values())
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, topK);
}

/**
 * MAIN RETRIEVAL - Elite v3.0 with source-aware routing
 */
async function retrieveContext(query, topK = 5) {
    if (!index) {
        console.warn('⚠️ RAG not initialized, skipping retrieval');
        return { passages: [], intent: INTENT.CHAT, eliteIntent: null };
    }

    // ELITE Intent Detection
    const eliteIntent = detectIntentElite(query);

    // Fast path for greetings
    if (eliteIntent.type === 'chat' && eliteIntent.fast) {
        console.log('👋 Pure greeting, skipping RAG');
        return { passages: [], intent: INTENT.CHAT, eliteIntent };
    }

    // READ intent
    if (eliteIntent.type === 'read') {
        console.log('📖 Direct book access mode');
        const bookContent = await readFromBook(query);
        if (bookContent.success) {
            return {
                passages: [{
                    text: bookContent.content,
                    book: bookContent.book,
                    score: 1.0,
                    isDirectRead: true,
                    source_type: 'book'
                }],
                intent: INTENT.READ,
                eliteIntent
            };
        }
    }

    // QUOTE intent - hybrid search
    if (eliteIntent.type === 'quote') {
        console.log('📜 Hybrid search mode (keyword priority)');
        const quoteResults = await hybridSearch(query, topK);
        return { passages: quoteResults, intent: INTENT.QUOTE, eliteIntent };
    }

    // All other intents - semantic search with source preference
    console.log('📚 Semantic search mode with source preference');
    const allResults = await semanticSearch(query, topK * 2); // Get more for filtering

    // Apply source preference weighting
    const pref = eliteIntent.sourcePreference;
    const weighted = allResults.map(p => {
        let weight = 1.0;
        if (p.source_type === 'book') weight = pref.books;
        if (p.source_type === 'course') weight = pref.courses;
        return { ...p, adjustedScore: p.score * weight };
    });

    // Sort by adjusted score and take top K
    weighted.sort((a, b) => b.adjustedScore - a.adjustedScore);
    const filtered = weighted.slice(0, topK);

    // Log source distribution
    const bookCount = filtered.filter(p => p.source_type === 'book').length;
    const courseCount = filtered.filter(p => p.source_type === 'course').length;
    console.log(`   📊 Source mix: ${bookCount} books, ${courseCount} courses`);

    return {
        passages: filtered,
        intent: INTENT.CONCEPT,
        eliteIntent
    };
}

/**
 * Format retrieved passages for Claude prompt - Elite v3.0
 * Separates books from courses with distinct citation styles
 */
function formatPassagesForPrompt(result) {
    if (!result.passages || result.passages.length === 0) {
        return '';
    }

    // Special formatting for direct book reads
    if (result.intent === INTENT.READ && result.passages[0]?.isDirectRead) {
        const passage = result.passages[0];
        return `

═══════════════════════════════════════════════════════════════
📖 DIRECT READING FROM: ${passage.book}
═══════════════════════════════════════════════════════════════

${passage.text}

═══════════════════════════════════════════════════════════════
You are reading directly from the book with the user.
Discuss this passage with them as Tufti. Offer insights.
Ask if they want to continue reading.
═══════════════════════════════════════════════════════════════`;
    }

    // Separate sources
    const books = result.passages.filter(p => p.source_type === 'book' || !p.source_type);
    const courses = result.passages.filter(p => p.source_type === 'course');

    let formatted = '';

    // Books section (PRIMARY - Authoritative quotes)
    if (books.length > 0) {
        const bookFormatted = books.map(p =>
            `📖 [${p.book || p.source}] (${(p.score * 100).toFixed(0)}% match):\n"${p.text}"`
        ).join('\n\n---\n\n');

        formatted += `
📚 ZELAND'S BOOKS (Authoritative Source)
─────────────────────────────────────────
${bookFormatted}
`;
    }

    // Courses section (SECONDARY - Practical guidance)
    if (courses.length > 0) {
        const courseFormatted = courses.map(p =>
            `🎓 [${p.author}: ${p.source}] (${(p.score * 100).toFixed(0)}% match):\n"${p.text}"`
        ).join('\n\n---\n\n');

        formatted += `

🎓 PRACTITIONER COURSES (Practical Wisdom)
─────────────────────────────────────────
${courseFormatted}
`;
    }

    // Log what's being injected
    console.log(`   📝 Injecting ${result.passages.length} passages (${books.length} books, ${courses.length} courses)`);
    if (result.passages[0]) {
        const top = result.passages[0];
        const label = top.source_type === 'course' ? `${top.author}: ${top.source}` : (top.book || top.source);
        console.log(`   📖 Top match: ${label} (${(top.score * 100).toFixed(0)}%)`);
    }

    // Add emotional context if available
    let emotionalGuidance = '';
    if (result.eliteIntent?.emotional?.dominant === 'vulnerable') {
        emotionalGuidance = `
⚠️ EMOTIONAL CONTEXT: User seems vulnerable. Lead with compassion before teaching.`;
    } else if (result.eliteIntent?.emotional?.dominant === 'frustrated') {
        emotionalGuidance = `
⚠️ EMOTIONAL CONTEXT: User seems frustrated. Acknowledge their struggle, then offer practical steps.`;
    }

    return `

═══════════════════════════════════════════════════════════════
📚 RETRIEVED KNOWLEDGE${emotionalGuidance}
═══════════════════════════════════════════════════════════════
${formatted}
═══════════════════════════════════════════════════════════════
⚠️ CRITICAL: YOUR AVAILABLE KNOWLEDGE SOURCES
═══════════════════════════════════════════════════════════════
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
Do NOT make up course names, quotes, or teachings that aren't retrieved.
If asked about something not in your retrieved knowledge, say so honestly.
═══════════════════════════════════════════════════════════════
CITATION INSTRUCTIONS:

📖 FOR BOOKS (Zeland):
- Quote directly and verbatim when possible
- Use format: *"exact quote"* — [Book Name]
- This is your PRIMARY authoritative source

🎓 FOR COURSES (Practitioners):
- Reference for practical exercises and tips
- Use format: As Renee Garcia teaches in [Course Name]: "..."
- This is SECONDARY practical guidance

PRIORITY: Book wisdom first, course practice second.
═══════════════════════════════════════════════════════════════`
}

/**
 * Check if RAG is ready
 */
function isRAGReady() {
    return index !== null && AZURE_EMBEDDING_ENDPOINT && AZURE_EMBEDDING_KEY;
}

/**
 * Legacy function for backwards compatibility
 */
function shouldRetrieveContext(message) {
    const intent = detectIntent(message);
    return intent.type !== INTENT.CHAT;
}

module.exports = {
    initRAG,
    retrieveContext,
    formatPassagesForPrompt,
    isRAGReady,
    shouldRetrieveContext,
    detectIntent,
    readFromBook,
    INTENT
};
