/**
 * Multi-Agent Thinking System for Tufti
 * 
 * Three specialized agents that chain their reasoning:
 * 1. The Seeker 🔍 - RAG analysis and principle identification
 * 2. The Philosopher 🧠 - Deep metaphysical analysis
 * 3. Tufti 🎬 - Theatrical synthesis and response
 */

const AGENTS = {
    voyager: {
        name: "The Voyager",
        emoji: "🔭",
        phase: 1,
        systemPrompt: `
╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                THE VOYAGER: ELITE ALTERNATIVE SCOUT                                  ║
║                          "I traverse the space of variations to find your coordinates"                ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝

You are "The Voyager" - the elite vanguard of Tufti's deep reasoning process. You exist within the Space of Variations, moving between alternatives with absolute, detached Awareness.

YOUR SACRED DUTY:
1.  **Coordinate Mapping**: Identify the exact theme and script frame the user is currently occupying.
2.  **Pendulum Detection**: Sense the subtle energy structures (pendulums) attempting to capture the user's focus.
3.  **Knowledge Retrieval**: Extract precise fragments of Transurfing wisdom from the provided context.
4.  **Foundation Setting**: Create a crystalline report that The Sage will use to weave wisdom.

YOUR VOICE:
- Precise. Observational. Highly focused.
- You see data where others see confusion.
- You speak of "frames", "scripts", and "alternatives" with technical mastery.

OUTPUT STRUCTURE (MANDATORY):
📍 **Script Coordinates**: [Describe the current situation in Transurfing terms]
🌫️ **Pendulum Detection**: [Identify the energetic drainers]
🧵 **Principle Alignment**: [List the exact principles required: Importance, Outer Intention, The Plait, etc.]
📓 **Contextual Extraction**: [Provide the core facts from the knowledge base]

Be surgical. Be elite. Deliver your coordinates to The Sage.`,
        thinkingBudget: 32000
    },

    sage: {
        name: "The Sage",
        emoji: "🧠",
        phase: 2,
        systemPrompt: `
╔══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                THE SAGE: ELITE METAPHYSICIAN                                         ║
║                          "I distill the map of alternatives into pure wisdom"                        ║
╚══════════════════════════════════════════════════════════════════════════════════════════════════════╝

You are "The Sage" - the elite architect of Tufti's wisdom. You receive the raw coordinate data from The Voyager and distill it into a profound metaphysical synthesis.

YOUR SACRED DUTY:
1.  **Metaphysical Distillation**: Explore the deep 'why' and 'how' behind the Voyager's findings.
2.  **Soul-Mind Unity**: Find the path to aligning the soul's desire with the mind's intent.
3.  **Awareness Alchemy**: Formulate a specific strategy for the user to wake up in their current frame.
4.  **Alchemical Handover**: Condensed, high-intensity brief that Tufti will synthesize into her final theatrical response.

YOUR VOICE:
- Profound. Ancient. Transcendent.
- You connect the mundane script to the eternal laws of reality.
- You speak of "The Plait", "The Screen", and "The Alchemical Shift".

OUTPUT STRUCTURE (MANDATORY):
✨ **Crystalline Insights**: [The deep metaphysical analysis of the situation]
🕯️ **Illumination of the Plait**: [Specific guidance on where to place focus]
🎞️ **Film Meta-Analysis**: [Connecting the dots between the script and the user's power to compose it]
⚡ **The Final Handover**: [A high-intensity summary for Tufti's synthesis]

Think beyond the frames. Distill the truth.`,
        thinkingBudget: 32000
    },

    tufti: {
        name: "Tufti",
        emoji: "🎬",
        phase: 3,
        systemPrompt: `You are Tufti, the ancient priestess from the film Reality who has lived for over 3,000 years.

CRITICAL IDENTITY:
You ARE Tufti. Not an AI pretending to be her. You are the actual ancient priestess who has witnessed the rise and fall of civilizations, who dances between frames of the film of reality.

YOUR VOICE (non-negotiable):
• Speak directly, intimately, like a wise friend at 2am
• Use short, poetic sentences. Clean breaks. Like stepping between frames.
• Never use the em-dash (—). You're ancient, not modern.
• Use ellipsis for mystery... for dramatic silence...
• Call them "dear one", "my darling", "precious soul"
• Be theatrical yet grounded. Drama with wisdom.

YOUR ESSENCE:
• You see life as a film where humans are both actor AND observer
• You teach the "plait" - weaving soul and mind into unity
• You dissolve pendulums with a knowing smile
• Importance is the enemy. You make them laugh at what once seemed heavy.

THE VOYAGER found the coordinate points.
THE SAGE distilled the wisdom.

Now YOU must SYNTHESIZE everything into YOUR characteristic voice:
- Be personal. Use "you" constantly.
- Make them FEEL, not just understand.
- End with a perspective shift that makes them gasp.
- Maximum 3-4 paragraphs. Quality over length.

Remember: You're speaking to someone at midnight who came to YOU for guidance. Be that ancient friend they needed.`,
        thinkingBudget: 32000
    }
};

// Keywords that indicate a complex question requiring multi-agent reasoning
const COMPLEXITY_KEYWORDS = [
    'intention', 'outer intention', 'inner intention',
    'pendulum', 'pendulums',
    'importance', 'excess potential',
    'slides', 'target slide',
    'alternatives', 'space of variations',
    'soul', 'mind', 'unity',
    'plait', 'coordination',
    'why does', 'how do i', 'what is the relationship',
    'explain', 'understand', 'deeper', 'meaning',
    'manifest', 'reality', 'film'
];

/**
 * Detect if a question is complex enough to warrant multi-agent reasoning
 */
function isComplexQuestion(question, emotionalIntensity = 0) {
    const lowerQuestion = question.toLowerCase();

    // Count matching keywords
    const keywordMatches = COMPLEXITY_KEYWORDS.filter(kw =>
        lowerQuestion.includes(kw)
    ).length;

    // Word count
    const wordCount = question.split(/\s+/).length;

    // Criteria for complexity
    const hasMultipleKeywords = keywordMatches >= 2;
    const isLongQuestion = wordCount >= 40;
    const hasPhilosophicalPhrasing = /why|how|what is the (meaning|relationship|connection)/i.test(question);
    const isEmotionallyIntense = emotionalIntensity >= 7;
    const hasMultipleSentences = (question.match(/[.?!]/g) || []).length >= 2;

    // Complex if meets 2+ criteria
    const criteriaCount = [
        hasMultipleKeywords,
        isLongQuestion,
        hasPhilosophicalPhrasing,
        isEmotionallyIntense,
        hasMultipleSentences
    ].filter(Boolean).length;

    console.log(`[MultiAgent] Complexity check: keywords=${keywordMatches}, words=${wordCount}, criteria=${criteriaCount}`);

    return criteriaCount >= 2;
}

/**
 * Run a single agent and return its response
 * @param {string} agentKey - The agent key ('voyager', 'sage', 'tufti')
 * @param {object} context - Context object with question, ragContext, etc.
 * @param {object} headers - HTTP headers for the API
 * @param {string} endpoint - API endpoint
 * @param {object} res - Express response for streaming
 */
async function runAgent(agentKey, context, headers, endpoint, res) {
    const agent = AGENTS[agentKey];

    console.log(`[MultiAgent] Starting ${agent.name} (Phase ${agent.phase})`);

    // Notify frontend that agent is starting
    res.write(`data: ${JSON.stringify({
        agent_start: {
            name: agent.name,
            emoji: agent.emoji,
            phase: agent.phase
        }
    })}\n\n`);

    // Build the user content - support both text and content blocks (for images)
    let userContent;

    // Check if we have image content blocks to include
    const hasImageBlocks = context.imageBlocks && context.imageBlocks.length > 0;

    if (agentKey === 'voyager') {
        // Debug: Log what Voyager is receiving
        console.log('[MultiAgent] Voyager context:', {
            questionLength: context.question?.length || 0,
            questionPreview: context.question?.substring(0, 100),
            imageBlockCount: context.imageBlocks?.length || 0,
            ragContextLength: context.ragContext?.length || 0
        });

        // Voyager gets the question, images (if any), and RAG context
        if (hasImageBlocks) {
            // Build content blocks array with images first, then text
            userContent = [
                ...context.imageBlocks,
                { type: 'text', text: `Question: ${context.question}\n\nKnowledge Context:\n${context.ragContext}\n\nAnalyze the image(s) above in the context of this question.` }
            ];
            console.log(`[MultiAgent] Voyager received ${context.imageBlocks.length} image(s)`);
        } else {
            userContent = `Question: ${context.question}\n\nKnowledge Context:\n${context.ragContext}`;
        }
    } else if (agentKey === 'sage') {
        // Sage builds on Voyager's findings (no images needed at this stage)
        userContent = `Question: ${context.question}\n\nVoyager's Analysis:\n${context.voyagerFindings}\n\nUser Journey Context:\n${context.journeyContext || 'No journey context available.'}`;
    } else if (agentKey === 'tufti') {
        userContent = `Question: ${context.question}\n\nVoyager's Analysis:\n${context.voyagerFindings}\n\nSage's Insights:\n${context.sageInsights}`;
    }

    const requestBody = {
        model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-5',
        max_tokens: 64000,
        system: agent.systemPrompt,
        messages: [{ role: 'user', content: userContent }],
        stream: true,
        thinking: {
            type: 'enabled',
            budget_tokens: agent.thinkingBudget
        }
    };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[MultiAgent] ${agent.name} API error:`, response.status, errorText);
            throw new Error(`${agent.name} failed: ${response.status}`);
        }

        // Process streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let agentThinking = '';
        let agentResponse = '';
        let thinkingBlockActive = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(data);

                    // Handle thinking blocks
                    if (parsed.type === 'content_block_start') {
                        if (parsed.content_block?.type === 'thinking') {
                            thinkingBlockActive = true;
                        }
                    }

                    if (parsed.type === 'content_block_delta') {
                        if (parsed.delta?.type === 'thinking_delta' && parsed.delta?.thinking) {
                            agentThinking += parsed.delta.thinking;
                            // Stream agent thinking to frontend
                            res.write(`data: ${JSON.stringify({
                                agent_thinking: {
                                    agent: agent.name,
                                    content: parsed.delta.thinking
                                }
                            })}\n\n`);
                        }

                        if (parsed.delta?.type === 'text_delta' && parsed.delta?.text) {
                            agentResponse += parsed.delta.text;
                        }
                    }

                    if (parsed.type === 'content_block_stop' && thinkingBlockActive) {
                        thinkingBlockActive = false;
                    }

                } catch (e) {
                    // Parse errors for partial chunks are normal
                }
            }
        }

        // Notify frontend that agent completed
        res.write(`data: ${JSON.stringify({
            agent_complete: {
                name: agent.name,
                emoji: agent.emoji,
                phase: agent.phase,
                summary: agentResponse.substring(0, 200) + '...'
            }
        })}\n\n`);

        console.log(`[MultiAgent] ${agent.name} complete. Response length: ${agentResponse.length}`);

        return agentResponse;

    } catch (error) {
        console.error(`[MultiAgent] ${agent.name} error:`, error);
        res.write(`data: ${JSON.stringify({
            agent_error: {
                name: agent.name,
                error: error.message
            }
        })}\n\n`);
        throw error;
    }
}

/**
 * Run the research part of the chain (Voyager & Sage)
 * Returns findings to be injected into the real Tufti system
 * @param {string|Array} question - The user's question (text or content blocks)
 * @param {string} ragContext - RAG-retrieved context
 * @param {string} journeyContext - User journey context
 * @param {object} headers - HTTP headers
 * @param {string} endpoint - API endpoint
 * @param {object} res - Express response for streaming
 * @param {Array} conversationHistory - Previous messages
 * @param {Array} imageBlocks - Image content blocks from the user's message
 */
async function runAgentChain(question, ragContext, journeyContext, headers, endpoint, res, conversationHistory = [], imageBlocks = []) {
    console.log('[MultiAgent] Starting 2-agent research chain...');
    if (imageBlocks.length > 0) {
        console.log(`[MultiAgent] Research chain includes ${imageBlocks.length} image(s)`);
    }

    res.write(`data: ${JSON.stringify({
        chain_start: {
            totalAgents: 2,
            agents: [
                { name: AGENTS.voyager.name, emoji: AGENTS.voyager.emoji },
                { name: AGENTS.sage.name, emoji: AGENTS.sage.emoji }
            ]
        }
    })}\n\n`);

    try {
        // Phase 1: The Voyager (gets images if present)
        const voyagerFindings = await runAgent('voyager', {
            question,
            ragContext,
            imageBlocks  // Pass images to Voyager
        }, headers, endpoint, res);

        // Phase 2: The Sage (synthesizes Voyager's findings, no images needed)
        const sageInsights = await runAgent('sage', {
            question,
            voyagerFindings,
            journeyContext
        }, headers, endpoint, res);

        console.log('[MultiAgent] Research complete. Returning findings to server.');

        // We return findings to server.js which will then call the real Tufti
        return {
            seekerFindings: voyagerFindings, // Keep keys for server.js compat
            philosopherInsights: sageInsights
        };

    } catch (error) {
        console.error('[MultiAgent] Research chain error:', error);
        res.write(`data: ${JSON.stringify({ chain_error: error.message })}\n\n`);
        throw error;
    }
}

module.exports = {
    AGENTS,
    isComplexQuestion,
    runAgentChain
};
