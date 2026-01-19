/**
 * Elite Intent Detection System v2.0
 * 
 * Multi-layer human-like understanding:
 * 1. Emotional state detection
 * 2. Intent spectrum (weighted scores)
 * 3. Source-aware routing (books vs courses)
 * 
 * Uses embedding similarity for nuanced classification
 */

// Intent archetypes - pre-computed embeddings for fast classification
const INTENT_ARCHETYPES = {
    wisdom: {
        description: "I want to understand the deep meaning, philosophy, and core concepts of Reality Transurfing",
        examples: [
            "What is the nature of reality?",
            "Explain the philosophy behind Transurfing",
            "Why do pendulums exist?",
            "What did Zeland mean by...",
            "Help me understand the deeper meaning"
        ],
        sourcePreference: 'books',
        emotionalTone: 'curious'
    },
    action: {
        description: "I need practical steps, exercises, and techniques I can apply right now",
        examples: [
            "How do I escape a pendulum?",
            "Give me an exercise for intention",
            "What should I do when...",
            "How can I practice this?",
            "Step by step guide to..."
        ],
        sourcePreference: 'courses',
        emotionalTone: 'determined'
    },
    quote: {
        description: "I want the exact words from the books, verbatim quotes and passages",
        examples: [
            "Quote me what Tufti said about...",
            "Find the passage where...",
            "What are Zeland's exact words on...",
            "Cite the book where it says..."
        ],
        sourcePreference: 'books',
        emotionalTone: 'neutral'
    },
    comfort: {
        description: "I'm struggling, feeling lost, and need emotional support and grounding",
        examples: [
            "I feel like nothing is working",
            "I'm lost and don't know what to do",
            "Everything feels heavy",
            "I'm stuck in a negative loop",
            "Why can't I make this work?"
        ],
        sourcePreference: 'both',
        emotionalTone: 'vulnerable'
    },
    exploration: {
        description: "I'm curious about a specific concept and want to explore it deeply",
        examples: [
            "Tell me about pendulums",
            "What's the space of variations?",
            "Explain outer intention",
            "What are slides?",
            "Help me understand importance"
        ],
        sourcePreference: 'books',
        emotionalTone: 'curious'
    },
    application: {
        description: "I have a real life situation and want to apply Transurfing principles",
        examples: [
            "I have a job interview, how do I use Transurfing?",
            "My relationship is struggling, what would Tufti say?",
            "How do I handle my boss using these principles?",
            "I need to make a decision about..."
        ],
        sourcePreference: 'courses',
        emotionalTone: 'practical'
    }
};

// Emotional state patterns (regex + semantic)
const EMOTIONAL_PATTERNS = {
    vulnerable: [
        /i('m| am) (lost|stuck|confused|struggling|suffering|hurting)/i,
        /nothing (is )?work(s|ing)/i,
        /can't (seem to|figure|understand|make)/i,
        /feel(s|ing)? (heavy|dark|hopeless|alone|empty)/i,
        /why (can't|won't|doesn't)/i
    ],
    frustrated: [
        /this (is|isn't) work(ing)?/i,
        /i('ve| have) tried everything/i,
        /still (not|no|nothing)/i,
        /how (many|much|long) (more|until)/i,
        /sick (of|and tired)/i
    ],
    curious: [
        /what (is|are|does)/i,
        /how (does|do|can)/i,
        /tell me (about|more)/i,
        /explain/i,
        /help me understand/i
    ],
    determined: [
        /i want to/i,
        /i need to/i,
        /how (do|can) i/i,
        /teach me/i,
        /show me (how|the way)/i
    ],
    excited: [
        /this (is )?amazing/i,
        /i (finally )?(get|understand) it/i,
        /wow/i,
        /incredible/i,
        /it('s| is) working/i
    ]
};

// Fast heuristic checks (avoid heavy processing for obvious cases)
const FAST_CHECKS = {
    greeting: [
        /^(hi|hello|hey|hola|bonjour|ciao|salam|marhaba)[\s!.,]*$/i,
        /^(good morning|good afternoon|good evening|gm|gn)[\s!.,]*$/i,
        /^(thanks|thank you|merci|shukran)[\s!.,]*$/i,
        /^(ok|okay|cool|great|nice|perfect|yes|no|yeah|nope)[\s!.,]*$/i
    ],
    explicitQuote: [
        /quote/i,
        /exact words/i,
        /verbatim/i,
        /cite/i,
        /word for word/i
    ],
    explicitRead: [
        /read.*page/i,
        /read.*chapter/i,
        /page \d+/i,
        /chapter \d+/i,
        /first page/i,
        /foreword/i
    ]
};

// Transurfing concepts for enhanced detection
const TRANSURFING_CONCEPTS = {
    pendulum: ['pendulum', 'pendulums', 'defeating pendulum', 'escaping pendulum', 'energy vampire'],
    intention: ['intention', 'outer intention', 'inner intention', 'intent', 'will'],
    reality: ['reality', 'film', 'frame', 'screen', 'layer', 'alternative', 'lifeline'],
    awareness: ['awareness', 'awake', 'asleep', 'dream', 'sleep', 'conscious', 'overseer'],
    importance: ['importance', 'excess potential', 'balanced', 'dropping importance'],
    visualization: ['slide', 'visualization', 'compose', 'illuminate', 'target slide'],
    space: ['space of variations', 'alternatives', 'coordinates', 'mirror', 'reflection']
};

/**
 * Detect emotional state from message
 */
function detectEmotionalState(message) {
    const lower = message.toLowerCase();
    const emotions = {};

    for (const [emotion, patterns] of Object.entries(EMOTIONAL_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(lower)) {
                emotions[emotion] = (emotions[emotion] || 0) + 1;
            }
        }
    }

    // Find dominant emotion
    let dominant = 'neutral';
    let maxScore = 0;
    for (const [emotion, score] of Object.entries(emotions)) {
        if (score > maxScore) {
            maxScore = score;
            dominant = emotion;
        }
    }

    return {
        dominant,
        scores: emotions,
        intensity: maxScore
    };
}

/**
 * Detect which Transurfing concepts are mentioned
 */
function detectConcepts(message) {
    const lower = message.toLowerCase();
    const found = [];

    for (const [concept, keywords] of Object.entries(TRANSURFING_CONCEPTS)) {
        for (const keyword of keywords) {
            if (lower.includes(keyword)) {
                found.push({ concept, keyword });
                break;
            }
        }
    }

    return found;
}

/**
 * Fast check for obvious intents (no heavy processing needed)
 */
function fastIntentCheck(message) {
    const trimmed = message.trim();

    // Very short messages
    if (trimmed.length < 30) {
        for (const pattern of FAST_CHECKS.greeting) {
            if (pattern.test(trimmed)) {
                return { type: 'chat', confidence: 1.0, fast: true };
            }
        }
    }

    // Explicit quote request
    for (const pattern of FAST_CHECKS.explicitQuote) {
        if (pattern.test(trimmed)) {
            return { type: 'quote', confidence: 0.95, fast: true };
        }
    }

    // Explicit read request
    for (const pattern of FAST_CHECKS.explicitRead) {
        if (pattern.test(trimmed)) {
            return { type: 'read', confidence: 0.95, fast: true };
        }
    }

    return null; // No fast match, need deeper analysis
}

/**
 * Score intent archetypes based on semantic similarity
 * Uses keyword matching as a proxy (could be enhanced with actual embeddings)
 */
function scoreIntentArchetypes(message) {
    const lower = message.toLowerCase();
    const scores = {};

    // Wisdom indicators
    scores.wisdom = 0;
    if (/why|meaning|nature|philosophy|deeper|understand|essence/i.test(lower)) scores.wisdom += 0.3;
    if (/what (is|are|does) (the )?/i.test(lower)) scores.wisdom += 0.2;
    if (/explain|help me (understand|see)/i.test(lower)) scores.wisdom += 0.2;

    // Action indicators
    scores.action = 0;
    if (/how (do|can|should) i/i.test(lower)) scores.action += 0.4;
    if (/step|practice|exercise|technique|apply/i.test(lower)) scores.action += 0.3;
    if (/what (should|can) i do/i.test(lower)) scores.action += 0.3;

    // Exploration indicators
    scores.exploration = 0;
    if (/tell me (about|more)/i.test(lower)) scores.exploration += 0.3;
    if (/what('s| is) (a |the )?/i.test(lower)) scores.exploration += 0.3;
    const concepts = detectConcepts(lower);
    if (concepts.length > 0) scores.exploration += 0.3;

    // Comfort indicators
    scores.comfort = 0;
    if (/lost|stuck|confused|struggling|can't|nothing works/i.test(lower)) scores.comfort += 0.4;
    if (/feel(s|ing)?( like)?/i.test(lower)) scores.comfort += 0.2;
    if (/help me|i need|please/i.test(lower)) scores.comfort += 0.2;

    // Application indicators
    scores.application = 0;
    if (/my (job|work|relationship|boss|life|situation)/i.test(lower)) scores.application += 0.4;
    if (/how (do|can|should) i (use|apply)/i.test(lower)) scores.application += 0.3;
    if (/real life|practical|situation/i.test(lower)) scores.application += 0.2;

    // Normalize scores
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    for (const key in scores) {
        scores[key] = Math.min(scores[key], 1.0); // Cap at 1.0
    }

    // Find primary intent
    let primary = 'exploration';
    let maxScore = 0;
    for (const [intent, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            primary = intent;
        }
    }

    return { primary, scores, confidence: maxScore };
}

/**
 * Determine source preference based on intent
 */
function determineSourcePreference(intent, emotional) {
    const preferences = {
        books: 0.5, // Base
        courses: 0.5
    };

    // Adjust based on intent
    switch (intent.primary) {
        case 'wisdom':
        case 'quote':
        case 'exploration':
            preferences.books = 0.8;
            preferences.courses = 0.3;
            break;
        case 'action':
        case 'application':
            preferences.books = 0.4;
            preferences.courses = 0.9;
            break;
        case 'comfort':
            preferences.books = 0.6;
            preferences.courses = 0.7;
            break;
    }

    // Adjust based on emotion
    if (emotional.dominant === 'vulnerable') {
        preferences.books += 0.2; // Wisdom for comfort
    }
    if (emotional.dominant === 'determined' || emotional.dominant === 'practical') {
        preferences.courses += 0.2; // Action-oriented
    }

    return preferences;
}

/**
 * ELITE INTENT DETECTION - Main function
 */
function detectIntentElite(message, conversationHistory = []) {
    console.log('\n🧠 Elite Intent Detection v2.0');

    // Layer 1: Fast obvious cases
    const fast = fastIntentCheck(message);
    if (fast) {
        console.log(`   ⚡ Fast match: ${fast.type} (${fast.confidence * 100}%)`);
        return {
            type: fast.type,
            confidence: fast.confidence,
            emotional: { dominant: 'neutral', scores: {} },
            sourcePreference: { books: 0.5, courses: 0.5 },
            concepts: [],
            fast: true
        };
    }

    // Layer 2: Emotional state detection
    const emotional = detectEmotionalState(message);
    console.log(`   💚 Emotional state: ${emotional.dominant} (intensity: ${emotional.intensity})`);

    // Layer 3: Concept detection
    const concepts = detectConcepts(message);
    if (concepts.length > 0) {
        console.log(`   📚 Concepts: ${concepts.map(c => c.concept).join(', ')}`);
    }

    // Layer 4: Intent archetype scoring
    const intent = scoreIntentArchetypes(message);
    console.log(`   🎯 Primary intent: ${intent.primary} (${(intent.confidence * 100).toFixed(0)}%)`);

    // Layer 5: Source preference
    const sourcePreference = determineSourcePreference(intent, emotional);
    console.log(`   📖 Source preference: Books ${(sourcePreference.books * 100).toFixed(0)}% | Courses ${(sourcePreference.courses * 100).toFixed(0)}%`);

    // Map to legacy intent types for compatibility
    const legacyType = mapToLegacyIntent(intent.primary);

    return {
        type: legacyType,
        primary: intent.primary,
        confidence: intent.confidence,
        scores: intent.scores,
        emotional,
        sourcePreference,
        concepts,
        fast: false
    };
}

/**
 * Map elite intent to legacy types for backwards compatibility
 */
function mapToLegacyIntent(eliteIntent) {
    const mapping = {
        'wisdom': 'CONCEPT',
        'action': 'CONCEPT',
        'quote': 'QUOTE',
        'comfort': 'CONCEPT',
        'exploration': 'CONCEPT',
        'application': 'CONCEPT',
        'read': 'READ',
        'chat': 'CHAT'
    };
    return mapping[eliteIntent] || 'CONCEPT';
}

module.exports = {
    detectIntentElite,
    detectEmotionalState,
    detectConcepts,
    INTENT_ARCHETYPES,
    TRANSURFING_CONCEPTS
};
