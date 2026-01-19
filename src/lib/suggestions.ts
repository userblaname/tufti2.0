/**
 * Transurfing Concept Suggestions
 * Maps detected concepts in Tufti's responses to relevant follow-up questions
 */

export interface ConceptSuggestion {
    concept: string;
    keywords: string[];
    questions: string[];
}

export const TRANSURFING_CONCEPTS: ConceptSuggestion[] = [
    {
        concept: 'pendulum',
        keywords: ['pendulum', 'pendulums', 'adherent', 'energy vampire', 'group thinking'],
        questions: [
            'How do I recognize which pendulums control my life?',
            'What\'s the difference between fighting and extinguishing a pendulum?',
            'Can pendulums ever be beneficial?',
            'How do I stop being an adherent of negative pendulums?'
        ]
    },
    {
        concept: 'intention',
        keywords: ['intention', 'outer intention', 'inner intention', 'intent', 'will'],
        questions: [
            'What\'s the difference between inner and outer intention?',
            'How do I activate outer intention?',
            'Why doesn\'t willpower alone create results?',
            'How do intention and desire differ?'
        ]
    },
    {
        concept: 'importance',
        keywords: ['importance', 'excess potential', 'balance', 'attachment', 'letting go', 'stress', 'anxious', 'worried'],
        questions: [
            'How do I reduce importance around this?',
            'What creates excess potential here?',
            'How do I release the grip on this?',
            'What balanced forces might be at play?'
        ]
    },
    {
        concept: 'alternatives',
        keywords: ['alternatives', 'space', 'variants space', 'lifeline', 'lifelines', 'sector', 'slide'],
        questions: [
            'How do I shift to a different lifeline?',
            'What determines which sector I\'m in?',
            'Can I visualize myself into a new reality?',
            'How does the slide technique work?'
        ]
    },
    {
        concept: 'mirror',
        keywords: ['mirror', 'reflection', 'reality mirror', 'dual mirror', 'reflected'],
        questions: [
            'Why is reality like a mirror?',
            'How long does it take for the mirror to reflect changes?',
            'What breaks the mirror principle?',
            'How do I use the mirror to my advantage?'
        ]
    },
    {
        concept: 'soul',
        keywords: ['soul', 'heart', 'mind', 'unity', 'inner voice', 'intuition', 'feel', 'feeling'],
        questions: [
            'How do I know if my soul and mind are aligned?',
            'What happens when soul and mind conflict?',
            'How do I hear my soul\'s voice?',
            'Why does the mind often override the soul?'
        ]
    },
    {
        concept: 'goal',
        keywords: ['goal', 'door', 'your goal', 'true goal', 'purpose', 'destination', 'want', 'manifest', 'achieve'],
        questions: [
            'How do I find my true goal versus false goals?',
            'What\'s the door metaphor about?',
            'How do I manifest this without squeezing?',
            'Am I moving toward or away from my goal?'
        ]
    },
    {
        concept: 'plait',
        keywords: ['plait', 'fres', 'energy', 'central channels', 'fountain', 'flow'],
        questions: [
            'How do I activate my energy plait?',
            'What is the fres and how do I feel it?',
            'How does energy flow affect manifestation?',
            'What blocks the central energy channels?'
        ]
    },
    {
        concept: 'frame',
        keywords: ['frame', 'film', 'reality film', 'wake up', 'awake', 'observer', 'watching', 'aware', 'awareness'],
        questions: [
            'How do I wake up in this frame?',
            'What frame am I composing right now?',
            'How do I direct this scene differently?',
            'What would Tufti see that I\'m missing?'
        ]
    },
    {
        concept: 'coordination',
        keywords: ['coordination', 'coordination of intention', 'declare', 'state', 'affirm'],
        questions: [
            'How does coordination of intention work?',
            'What\'s the right way to declare intentions?',
            'Why is the form of declaration important?',
            'How often should I practice coordination?'
        ]
    },
    {
        concept: 'wave',
        keywords: ['wave', 'fortune', 'wave of fortune', 'luck', 'lucky', 'flow'],
        questions: [
            'How do I catch my wave of fortune?',
            'What keeps me off the wave?',
            'Can I create luck intentionally?',
            'How do I recognize my wave when it comes?'
        ]
    },
    {
        concept: 'dreaming',
        keywords: ['dream', 'dreaming', 'lucid', 'transurfing dream', 'waking dream', 'sleep'],
        questions: [
            'How do dreams connect to reality creation?',
            'What is lucid living?',
            'Can I surf realities while dreaming?',
            'How do I wake up from the waking dream?'
        ]
    },
    {
        concept: 'relationship',
        keywords: ['relationship', 'love', 'partner', 'friend', 'family', 'person', 'people', 'him', 'her', 'they'],
        questions: [
            'What pendulum might be affecting this relationship?',
            'How do I reduce importance around this person?',
            'What am I projecting onto them?',
            'How do I detach without disconnecting?'
        ]
    },
    {
        concept: 'work',
        keywords: ['work', 'job', 'career', 'boss', 'interview', 'business', 'money', 'financial'],
        questions: [
            'What pendulum is my workplace?',
            'How do I reduce importance around my career?',
            'Am I following my soul\'s path here?',
            'What frame should I compose for success?'
        ]
    },
    {
        concept: 'fear',
        keywords: ['fear', 'afraid', 'scared', 'terrified', 'worry', 'anxious', 'anxiety', 'nervous'],
        questions: [
            'What is this fear protecting me from?',
            'How is this fear creating what I fear?',
            'What would happen if I released this fear?',
            'What frame is this fear composing?'
        ]
    }
];

/**
 * Detect concepts in text (can be user message or Tufti's response)
 * Returns matching concepts sorted by relevance (number of keyword matches)
 */
export function detectConcepts(text: string): ConceptSuggestion[] {
    const lowerText = text.toLowerCase();

    const matches = TRANSURFING_CONCEPTS.map(concept => {
        const matchCount = concept.keywords.filter(kw =>
            lowerText.includes(kw.toLowerCase())
        ).length;
        return { concept, matchCount };
    })
        .filter(m => m.matchCount > 0)
        .sort((a, b) => b.matchCount - a.matchCount);

    return matches.map(m => m.concept);
}

/**
 * Get predictive suggestion questions based on BOTH user message AND Tufti's response
 * Prioritizes concepts from user's original question for better prediction
 */
export function getSuggestions(
    responseText: string,
    maxSuggestions = 3,
    userMessage?: string
): string[] {
    // Combine context: prioritize user message concepts
    const userConcepts = userMessage ? detectConcepts(userMessage) : [];
    const responseConcepts = detectConcepts(responseText);

    // Merge concepts, prioritizing user's topics
    const allConcepts = [...userConcepts];
    responseConcepts.forEach(c => {
        if (!allConcepts.find(uc => uc.concept === c.concept)) {
            allConcepts.push(c);
        }
    });

    if (allConcepts.length === 0) {
        // Fallback to contextual questions if no concepts detected
        return [
            'What would Tufti see that I\'m missing?',
            'How do I apply this wisdom right now?',
            'What frame should I compose next?'
        ].slice(0, maxSuggestions);
    }

    // Gather questions from matched concepts
    const allQuestions = allConcepts.flatMap(c => c.questions);

    // Remove duplicates and shuffle
    const uniqueQuestions = [...new Set(allQuestions)];
    const shuffled = uniqueQuestions.sort(() => Math.random() - 0.5);

    return shuffled.slice(0, maxSuggestions);
}

