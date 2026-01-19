const express = require('express');
const cors = require('cors');
const http = require('http');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const MemoryHandler = require('./memory-handler');
const JourneyManager = require('./lib/journey-manager');
const { initRAG, retrieveContext, formatPassagesForPrompt, isRAGReady } = require('./lib/rag');
const { isComplexQuestion, runAgentChain } = require('./lib/multi-agent');
const { generateAudio, getAvailableVoices, VOICES, DEFAULT_VOICE } = require('./lib/audio-service');
const { generateSlide, isFluxReady } = require('./lib/slide-service');
const { runDeepExperiment } = require('./lib/deep-experiment');

// ============================================
// STARTUP VALIDATION - Check critical env vars
// ============================================
const REQUIRED_ENV = ['ANTHROPIC_API_KEY', 'ANTHROPIC_ENDPOINT', 'PINECONE_API_KEY', 'AZURE_EMBEDDING_KEY'];
const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('⚠️  Missing required environment variables:', missing.join(', '));
  console.error('   Make sure backend/.env exists with all required config!');
}

const app = express();
const port = process.env.PORT || 3001;

// Initialize memory handler
const memoryHandler = new MemoryHandler('./memories');

// Initialize journey manager
const journeyManager = new JourneyManager(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Initialize RAG on startup (async)
(async () => {
  try {
    await initRAG();
  } catch (error) {
    console.error('Failed to initialize RAG:', error.message);
  }
})();

// ============================================
// SECURITY: Rate limiting (HIGH LIMITS FOR TESTING)
// ============================================
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute (testing)
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const memoryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 600, // 600 memory operations per minute (testing)
  message: { error: 'Too many memory operations, please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// VALIDATION SCHEMAS (Zod) - Flexible but secure
// ============================================

// Content can be string OR array of content blocks (for images)
const ContentSchema = z.union([
  z.string(),
  z.array(z.object({
    type: z.string(),
    text: z.string().optional(),
    source: z.object({
      type: z.string(),
      media_type: z.string().optional(),
      data: z.string().optional()
    }).optional()
  }))
]);

const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: ContentSchema
  })).min(1),
  systemPrompt: z.string().optional(),
  userId: z.string().optional(),
  thinkingEnabled: z.boolean().optional(),
  deepResearchEnabled: z.boolean().optional(),
  deepExperimentEnabled: z.boolean().optional(),
  memoryEnabled: z.boolean().optional()
}).passthrough(); // Allow extra fields

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for image uploads

// ============================================
// TWO-PHASE APPROACH FOR THINKING + TOOLS
// Phase 1: Extended thinking (no tools) - get reasoning
// Phase 2: Tools with thinking context - execute tools
// ============================================

app.post('/api/chat', chatLimiter, async (req, res) => {
  // Validate request body with Zod
  const validation = ChatRequestSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid request format',
      details: validation.error.errors
    });
  }

  const { messages, systemPrompt: providedSystemPrompt } = req.body;
  const userId = req.body.userId || 'default-user';
  const thinkingEnabled = req.body.thinkingEnabled || false;
  const deepResearchEnabled = req.body.deepResearchEnabled !== false; // Default to true
  const deepExperimentEnabled = req.body.deepExperimentEnabled || false;
  const memoryEnabled = req.body.memoryEnabled !== false;

  // Extract system prompt from messages if not provided as separate field
  // Frontend embeds system prompt as first message(s) with role: 'system'
  const systemMessages = messages.filter(m => m.role === 'system');
  const systemPrompt = providedSystemPrompt ||
    (systemMessages.length > 0
      ? systemMessages.map(m => m.content).join('\n\n')
      : 'You are a helpful assistant.');

  // RAG: Get the user's latest message for context retrieval
  // Handle both string content and content blocks (for images)
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  let userMessage = '';
  let imageBlocks = [];  // Extract image blocks for multi-agent processing
  if (lastUserMessage) {
    if (typeof lastUserMessage.content === 'string') {
      userMessage = lastUserMessage.content;
    } else if (Array.isArray(lastUserMessage.content)) {
      // Extract text from content blocks
      const textBlocks = lastUserMessage.content.filter(b => b.type === 'text');
      userMessage = textBlocks.map(b => b.text).join(' ');

      // Extract image blocks for multi-agent chain
      imageBlocks = lastUserMessage.content.filter(b => b.type === 'image');
      if (imageBlocks.length > 0) {
        console.log(`[IMAGE] Extracted ${imageBlocks.length} image(s) from user message`);
      }
    }
  }

  // ========== DEBUG LOGGING ==========
  console.log('[DEBUG] ===== INCOMING MESSAGE ANALYSIS =====');
  console.log('[DEBUG] Total messages received:', messages.length);
  console.log('[DEBUG] Last user message role:', lastUserMessage?.role);
  console.log('[DEBUG] Last user message content type:', typeof lastUserMessage?.content);
  console.log('[DEBUG] Is content array?:', Array.isArray(lastUserMessage?.content));
  if (Array.isArray(lastUserMessage?.content)) {
    console.log('[DEBUG] Content block types:', lastUserMessage.content.map(b => b.type));
  }
  console.log('[DEBUG] Extracted userMessage length:', userMessage.length);
  console.log('[DEBUG] Extracted userMessage preview:', userMessage.substring(0, 100));
  console.log('[DEBUG] Extracted imageBlocks count:', imageBlocks.length);
  console.log('[DEBUG] ===================================');

  // RAG: Retrieve relevant book passages using Elite Hybrid RAG
  let ragContext = '';
  if (isRAGReady() && userMessage) {
    try {
      const ragResult = await retrieveContext(userMessage, 5);
      ragContext = formatPassagesForPrompt(ragResult);
    } catch (error) {
      console.error('RAG retrieval error:', error.message);
    }
  }

  // JOURNEY: Fetch and inject user's journey summary
  let journeyContext = '';
  if (userId) {
    try {
      const journey = await journeyManager.getJourney(userId);
      if (journey) {
        journeyContext = journeyManager.formatJourneyForPrompt(journey);
        console.log(`[Journey] Loaded for user ${userId.substring(0, 8)}...`);
      }
    } catch (error) {
      console.error('[Journey] Fetch error:', error.message);
    }
  }

  // Track if streaming has started for proper error handling
  let streamingStarted = false;

  // SSE helper: safely write to stream
  const safeWrite = (data) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  // SSE helper: safely end stream
  const safeEnd = () => {
    if (!res.writableEnded) {
      res.end();
    }
  };

  // SSE helper: send error (works before or after streaming starts)
  const sendError = (message, statusCode = 500) => {
    if (!streamingStarted && !res.headersSent) {
      res.status(statusCode).json({ error: message });
    } else {
      safeWrite({ error: message });
      safeEnd();
    }
  };

  try {
    // Convert messages to Anthropic format - handle both string and content blocks
    const anthropicMessages = messages.map(msg => {
      // Get the content - could be string or content blocks array
      let content = msg.content;

      // If content is an array (has images), keep it as-is
      // Otherwise ensure it's a valid non-empty string
      if (Array.isArray(content)) {
        // Content blocks format - validate it has content
        if (content.length === 0) return null;

        // Log details about content blocks for debugging
        const imageBlocks = content.filter(b => b.type === 'image');
        const textBlocks = content.filter(b => b.type === 'text');
        console.log('[DEBUG] Message with content blocks:', {
          total: content.length,
          images: imageBlocks.length,
          texts: textBlocks.length,
          imageTypes: imageBlocks.map(b => b.source?.media_type),
          imageDataLengths: imageBlocks.map(b => b.source?.data?.length || 0)
        });
      } else if (typeof content === 'string') {
        if (!content.trim()) return null;
      } else {
        return null;
      }

      if (msg.role === 'assistant') {
        return { role: 'assistant', content };
      }
      return { role: 'user', content };
    }).filter(Boolean); // Remove null entries

    // Ensure messages alternate user/assistant
    // CRITICAL: Iterate BACKWARDS to always preserve the LAST message (may contain images)
    // Remove earlier duplicates, not the latest one
    let validatedMessages = [];
    let lastRole = null;
    for (let i = anthropicMessages.length - 1; i >= 0; i--) {
      const msg = anthropicMessages[i];
      if (msg.role !== lastRole) {
        validatedMessages.unshift(msg); // Add to front to maintain order
        lastRole = msg.role;
      } else {
        console.log('[DEBUG] Alternation skip - dropping earlier duplicate:', msg.role, 'message at index', i);
      }
    }

    // DEBUG: Check if image blocks survived message validation
    const lastValidated = validatedMessages[validatedMessages.length - 1];
    console.log('[DEBUG] After validation - Last message content type:', typeof lastValidated?.content);
    console.log('[DEBUG] After validation - Is array?:', Array.isArray(lastValidated?.content));
    if (Array.isArray(lastValidated?.content)) {
      console.log('[DEBUG] After validation - Block types:', lastValidated.content.map(b => b.type));
    }

    // ============================================
    // CONTEXT TRUNCATION: Keep under token limit
    // System prompt ~40k, RAG ~10k, so messages max ~100k tokens
    // Estimate ~4 chars per token.
    // ============================================
    const MAX_CONTEXT_CHARS = 100000 * 4; // ~100k tokens for messages
    const estimateChars = (msgs) => msgs.reduce((sum, m) => {
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return sum + content.length;
    }, 0);

    let totalChars = estimateChars(validatedMessages);
    if (totalChars > MAX_CONTEXT_CHARS) {
      console.log(`[CONTEXT] Truncating: ${totalChars} chars > ${MAX_CONTEXT_CHARS} limit`);

      // IMPORTANT: Always preserve the LAST message (current user message with potential images)
      const lastMessage = validatedMessages[validatedMessages.length - 1];
      const firstMessage = validatedMessages[0];

      // Start with last message (most important - contains current user input + images)
      let trimmedMessages = [];

      // Calculate last message size (don't count image data against limit - it's handled by Claude)
      const lastMsgChars = typeof lastMessage.content === 'string'
        ? lastMessage.content.length
        : lastMessage.content.filter(b => b.type === 'text').reduce((sum, b) => sum + (b.text?.length || 0), 0);

      // Add messages from oldest to newest until we hit limit (excluding first and last)
      const middleMessages = validatedMessages.slice(1, -1);
      let currentChars = lastMsgChars;

      // Add first message if it fits
      const firstMsgChars = typeof firstMessage.content === 'string'
        ? firstMessage.content.length
        : JSON.stringify(firstMessage.content).length;
      if (currentChars + firstMsgChars < MAX_CONTEXT_CHARS && firstMessage !== lastMessage) {
        trimmedMessages.push(firstMessage);
        currentChars += firstMsgChars;
      }

      // Add recent messages (from the end of middle) until limit
      for (let i = middleMessages.length - 1; i >= 0; i--) {
        const msg = middleMessages[i];
        const msgChars = typeof msg.content === 'string' ? msg.content.length : JSON.stringify(msg.content).length;
        if (currentChars + msgChars < MAX_CONTEXT_CHARS) {
          trimmedMessages.splice(trimmedMessages.length === 0 ? 0 : 1, 0, msg);
          currentChars += msgChars;
        }
      }

      // Always add the last message at the end
      trimmedMessages.push(lastMessage);

      console.log(`[CONTEXT] Trimmed from ${validatedMessages.length} to ${trimmedMessages.length} messages`);
      console.log(`[CONTEXT] Last message preserved with ${Array.isArray(lastMessage.content) ? lastMessage.content.filter(b => b.type === 'image').length : 0} image(s)`);
      validatedMessages = trimmedMessages;
    }

    // ============================================
    // IMAGE PRESERVATION SAFEGUARD
    // If we extracted images earlier but they got lost during validation/truncation,
    // re-inject them into the final message. This is a critical safety net.
    // ============================================
    if (imageBlocks.length > 0) {
      const lastMsg = validatedMessages[validatedMessages.length - 1];
      const lastHasImages = Array.isArray(lastMsg?.content) &&
        lastMsg.content.some(b => b.type === 'image');

      if (!lastHasImages) {
        console.log('[IMAGE SAFEGUARD] ⚠️ Images were lost during processing! Re-injecting...');

        // Build new content with preserved images + original text
        const originalText = typeof lastMsg.content === 'string'
          ? lastMsg.content
          : (Array.isArray(lastMsg.content)
            ? lastMsg.content.filter(b => b.type === 'text').map(b => b.text).join(' ')
            : '');

        const restoredContent = [
          ...imageBlocks,
          { type: 'text', text: originalText }
        ];

        validatedMessages[validatedMessages.length - 1] = {
          role: lastMsg.role,
          content: restoredContent
        };

        console.log(`[IMAGE SAFEGUARD] ✅ Restored ${imageBlocks.length} image(s) to last message`);
      } else {
        console.log(`[IMAGE SAFEGUARD] ✅ Images preserved correctly (${lastMsg.content.filter(b => b.type === 'image').length})`);
      }
    }

    // Final verification log
    const finalLastMsg = validatedMessages[validatedMessages.length - 1];
    const finalImageCount = Array.isArray(finalLastMsg?.content)
      ? finalLastMsg.content.filter(b => b.type === 'image').length
      : 0;
    console.log(`[FINAL CHECK] Last message has ${finalImageCount} image(s), role: ${finalLastMsg?.role}`);

    console.log('[DEBUG] Model:', process.env.ANTHROPIC_MODEL);
    console.log('[DEBUG] Thinking Enabled:', thinkingEnabled);
    console.log('[DEBUG] Memory Enabled:', memoryEnabled);

    // Build headers - include effort beta for token efficiency control
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'output-128k-2025-02-19,effort-2025-11-24'
    };

    // Set SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let thinkingContext = '';

    // ============================================
    // DEEP EXPERIMENT MODE: 3-Pass Pipeline (~3 minutes)
    // Takes priority over multi-agent if enabled
    // ============================================
    if (deepExperimentEnabled) {
      console.log('[DEEP-EXPERIMENT] Activating 3-pass deep experiment pipeline (~3 min)');

      try {
        await runDeepExperiment(
          userMessage,
          ragContext,
          journeyContext,
          validatedMessages,
          headers,
          process.env.ANTHROPIC_ENDPOINT,
          res
        );

        console.log('[DEEP-EXPERIMENT] Pipeline complete');
        safeEnd();
        return; // Early return - deep experiment handles everything
      } catch (error) {
        console.error('[DEEP-EXPERIMENT] Pipeline failed:', error);
        safeWrite({ error: 'Deep Experiment failed: ' + error.message });
        safeEnd();
        return;
      }
    }

    // ============================================
    // MULTI-AGENT CHECK: Use 2 agents for research for complex questions
    // ============================================
    let multiAgentResearch = null;
    if (deepResearchEnabled && thinkingEnabled && isComplexQuestion(userMessage, 0)) {
      console.log('[MULTI-AGENT] Question is complex - activating research agents');

      try {
        const research = await runAgentChain(
          userMessage,
          ragContext,
          journeyContext,
          headers,
          process.env.ANTHROPIC_ENDPOINT,
          res,
          validatedMessages,
          imageBlocks  // Pass image blocks to the research chain
        );

        multiAgentResearch = research;
        console.log('[MULTI-AGENT] Research complete, injecting findings into main request');

        // Notify frontend that we are switching to final Tufti synthesis
        res.write(`data: ${JSON.stringify({
          agent_start: {
            name: "Tufti",
            emoji: "🎬",
            phase: 3,
            isFinal: true
          }
        })}\n\n`);

      } catch (error) {
        console.error('[MULTI-AGENT] Research failed, falling back to original Tufti:', error);
      }
    }

    // ============================================
    // PHASE 2: FINAL TUFTI CALL (Enriched if research exists)
    // ============================================

    // Inject research into user message if available
    let finalUserMessage = userMessage;
    if (multiAgentResearch) {
      finalUserMessage = `RESEARCH FINDINGS FOR YOUR ANALYSIS:
---
SEEKER'S ANALYSIS:
${multiAgentResearch.seekerFindings}

---
PHILOSOPHER'S INSIGHTS:
${multiAgentResearch.philosopherInsights}

---
USER QUESTION: ${userMessage}

Synthesize these research findings into your final response. Speak as the REAL Tufti from the film Reality. Be theatrical, intimate, and profound.`;
    }

    // Create the final message array
    const finalMessages = [...validatedMessages];
    // Replace the last user message with the enriched one if research exists
    // IMPORTANT: Preserve image content blocks if present
    if (multiAgentResearch) {
      const lastMsg = finalMessages[finalMessages.length - 1];
      const originalContent = lastMsg.content;

      // Check if original content had image blocks
      if (Array.isArray(originalContent)) {
        // Preserve images and add enriched text
        const preservedImages = originalContent.filter(b => b.type === 'image');
        const enrichedContent = [
          ...preservedImages,
          { type: 'text', text: finalUserMessage }
        ];
        finalMessages[finalMessages.length - 1].content = enrichedContent;
        console.log(`[MULTIAGENT] Preserved ${preservedImages.length} image(s) in final message`);
      } else {
        // Plain text, just replace
        finalMessages[finalMessages.length - 1].content = finalUserMessage;
      }
    }

    // We can now use the existing final processing logic...
    // But we need to make sure we don't restart the stream headers if they were already sent
    // Actually, headers are sent at the start of the req handler, so we are fine.

    // ============================================
    // PHASE 1: Extended Thinking (no tools)
    // Only if thinking is enabled
    // ============================================
    if (thinkingEnabled) {
      console.log('[PHASE 1] Starting extended thinking (no tools)');

      // ========== DEBUG: Log what we're sending to Claude ==========
      console.log('[DEBUG] ===== FINAL MESSAGES TO CLAUDE =====');
      console.log('[DEBUG] finalMessages count:', finalMessages.length);
      const lastFinal = finalMessages[finalMessages.length - 1];
      console.log('[DEBUG] Last final message role:', lastFinal?.role);
      console.log('[DEBUG] Last final message content type:', typeof lastFinal?.content);
      if (Array.isArray(lastFinal?.content)) {
        console.log('[DEBUG] Content block types:', lastFinal.content.map(b => b.type));
        console.log('[DEBUG] Text content preview:', lastFinal.content.find(b => b.type === 'text')?.text?.substring(0, 100));
      } else {
        console.log('[DEBUG] Content preview:', lastFinal?.content?.substring?.(0, 100));
      }
      console.log('[DEBUG] ========================================');

      const thinkingRequestBody = {
        model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-5',
        max_tokens: 64000,  // Model maximum limit
        system: (systemPrompt || 'You are a helpful assistant.') + journeyContext + ragContext,
        messages: finalMessages,
        stream: true,
        thinking: {
          type: 'enabled',
          budget_tokens: 32000  // High thinking power while leaving room for response
        },
        // Effort parameter for token efficiency (high = best quality for complex reasoning)
        output_config: {
          effort: 'high'
        }
        // NO TOOLS in Phase 1
      };

      const thinkingResponse = await fetch(process.env.ANTHROPIC_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(thinkingRequestBody)
      });

      if (!thinkingResponse.ok) {
        const errorText = await thinkingResponse.text();
        console.error('[PHASE 1] Thinking API error:', thinkingResponse.status, errorText);
        res.write(`data: ${JSON.stringify({ error: errorText })}\n\n`);
        res.end();
        return;
      }

      // Process thinking stream
      const reader = thinkingResponse.body.getReader();
      const decoder = new TextDecoder();
      let thinkingBlockActive = false;
      let responseText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'content_block_start') {
                if (parsed.content_block?.type === 'thinking') {
                  thinkingBlockActive = true;
                  res.write(`data: ${JSON.stringify({ thinking_start: true })}\n\n`);
                }
              }

              if (parsed.type === 'content_block_delta') {
                // DEBUG: Log what type of delta we're receiving
                if (!this.debugLogged) {
                  console.log('[DEBUG] First content_block_delta received, delta type:', parsed.delta?.type);
                  this.debugLogged = true;
                }

                if (parsed.delta?.type === 'thinking_delta' && parsed.delta?.thinking) {
                  thinkingContext += parsed.delta.thinking;
                  res.write(`data: ${JSON.stringify({ thinking: parsed.delta.thinking })}\n\n`);
                } else if (parsed.delta?.type === 'text_delta' && parsed.delta?.text) {
                  responseText += parsed.delta.text;
                  res.write(`data: ${JSON.stringify({ content: parsed.delta.text })}\n\n`);
                }
              }

              if (parsed.type === 'content_block_stop') {
                if (thinkingBlockActive) {
                  thinkingBlockActive = false;
                  res.write(`data: ${JSON.stringify({ thinking_end: true })}\n\n`);
                }
              }
            } catch (e) {
              // Skip non-JSON lines
            }
          }
        }
      }

      console.log('[PHASE 1] Thinking complete. Thinking context length:', thinkingContext.length);
      console.log('[PHASE 1] Response text length:', responseText.length);

      // If no tools enabled, we're done after Phase 1
      if (!memoryEnabled) {
        console.log('[PHASE 1] No tools enabled, ending response');
        safeEnd();
        return;
      }

      // If thinking mode provided a complete response, skip Phase 2
      // Only proceed to Phase 2 if we need to use tools
      if (responseText && responseText.length > 0) {
        console.log('[PHASE 1] Got complete response in thinking mode, skipping Phase 2');
        safeEnd();
        return;
      }
    }

    // ============================================
    // PHASE 2: Tools with thinking context
    // ============================================
    console.log('[PHASE 2] Starting tool-enabled response');

    // Build tools array - use 'custom' type for Azure compatibility
    const tools = [];
    if (memoryEnabled) {
      tools.push({
        name: "memory",
        description: "Read or write to user's persistent memory. Use this to remember important information about the user across conversations.",
        input_schema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["read", "write"],
              description: "Whether to read or write to memory"
            },
            content: {
              type: "string",
              description: "Content to write (only needed for write action)"
            }
          },
          required: ["action"]
        }
      });
    }

    // If we have thinking context, inject it as system context
    const enhancedSystemPrompt = thinkingContext
      ? `${systemPrompt || 'You are a helpful assistant.'}${journeyContext}\n\n[Your internal reasoning from thinking phase]:\n${thinkingContext.substring(0, 2000)}...${ragContext}`
      : (systemPrompt || 'You are a helpful assistant.') + journeyContext + ragContext;

    // Tool use handling loop
    let currentMessages = [...finalMessages];
    let continueLoop = true;
    let loopIteration = 0;
    const MAX_TOOL_ITERATIONS = 10;

    while (continueLoop && loopIteration < MAX_TOOL_ITERATIONS) {
      loopIteration++;
      console.log(`[PHASE 2] Tool loop iteration ${loopIteration}`);

      const requestBody = {
        model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-5',
        max_tokens: 16000,
        system: enhancedSystemPrompt,
        messages: currentMessages,
        stream: true,
        // Effort: medium for balanced speed/quality in non-thinking mode
        output_config: {
          effort: thinkingEnabled ? 'high' : 'medium'
        },
        // NO THINKING in Phase 2 - avoids signature issues
        ...(tools.length > 0 ? { tools } : {})
      };

      const response = await fetch(process.env.ANTHROPIC_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PHASE 2] API error:', response.status, errorText);
        res.write(`data: ${JSON.stringify({ error: errorText })}\n\n`);
        res.end();
        return;
      }

      // Parse the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let assistantContent = [];
      let hasToolUse = false;
      let currentToolUse = null;
      let currentTextBlock = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              // Handle content block start
              if (parsed.type === 'content_block_start') {
                const blockType = parsed.content_block?.type;

                if (blockType === 'text') {
                  currentTextBlock = '';
                } else if (blockType === 'tool_use') {
                  hasToolUse = true;
                  currentToolUse = {
                    type: 'tool_use',
                    id: parsed.content_block.id,
                    name: parsed.content_block.name,
                    input: parsed.content_block.input || {},
                    inputJson: ''
                  };
                  console.log(`[PHASE 2] Tool use started: ${parsed.content_block.name}`);
                }
              }

              // Handle content block deltas
              if (parsed.type === 'content_block_delta') {
                if (parsed.delta?.type === 'text_delta' && parsed.delta?.text) {
                  currentTextBlock += parsed.delta.text;
                  res.write(`data: ${JSON.stringify({ content: parsed.delta.text })}\n\n`);
                } else if (parsed.delta?.type === 'input_json_delta' && parsed.delta?.partial_json) {
                  if (currentToolUse) {
                    currentToolUse.inputJson += parsed.delta.partial_json;
                  }
                }
              }

              // Handle content block stop
              if (parsed.type === 'content_block_stop') {
                if (currentTextBlock) {
                  assistantContent.push({ type: 'text', text: currentTextBlock });
                  currentTextBlock = '';
                } else if (currentToolUse) {
                  if (currentToolUse.inputJson) {
                    try {
                      currentToolUse.input = JSON.parse(currentToolUse.inputJson);
                    } catch (e) {
                      console.error('[ERROR] Failed to parse tool input JSON');
                    }
                  }
                  delete currentToolUse.inputJson;
                  assistantContent.push(currentToolUse);
                  currentToolUse = null;
                }
              }

            } catch (e) {
              // Skip non-JSON lines
            }
          }
        }
      }

      // Check if we need to execute tools
      const toolUseBlocks = assistantContent.filter(block => block.type === 'tool_use');

      if (toolUseBlocks.length > 0) {
        console.log(`[PHASE 2] Found ${toolUseBlocks.length} tool use blocks, executing...`);

        // Add assistant message with tool use (no thinking blocks to worry about!)
        currentMessages.push({
          role: 'assistant',
          content: assistantContent
        });

        // Execute each tool
        const toolResults = [];
        for (const toolUse of toolUseBlocks) {
          console.log(`[PHASE 2] Executing tool: ${toolUse.name}`);

          let resultContent = '';

          if (toolUse.name === 'memory') {
            try {
              resultContent = await memoryHandler.execute(toolUse.input, userId);
              console.log(`[PHASE 2] Memory tool result:`, resultContent.substring(0, 100) + '...');
            } catch (error) {
              resultContent = `Error: ${error.message}`;
              console.error(`[PHASE 2] Memory tool error:`, error);
            }
          } else {
            resultContent = `Error: Unknown tool: ${toolUse.name}`;
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: resultContent
          });
        }

        // Add tool results as user message
        currentMessages.push({
          role: 'user',
          content: toolResults
        });

        continueLoop = true;
      } else {
        continueLoop = false;
      }
    }

    if (loopIteration >= MAX_TOOL_ITERATIONS) {
      console.error('[ERROR] Max tool iterations reached');
      safeWrite({ content: '\n\n[Tool iteration limit reached]' });
    }

    // JOURNEY: Auto-update after response
    if (userId) {
      try {
        const newCount = await journeyManager.incrementMessageCount(userId);
        console.log(`[Journey] Message count: ${newCount}`);

        if (journeyManager.shouldUpdate(newCount)) {
          console.log('[Journey] Triggering summary update...');

          // Fetch recent messages for summarization (this would come from Supabase normally)
          // For now, just use the current conversation
          const extractedJourney = await journeyManager.extractJourney(
            messages.slice(-40), // Last 40 messages
            process.env.ANTHROPIC_ENDPOINT,
            process.env.ANTHROPIC_API_KEY
          );

          if (extractedJourney) {
            await journeyManager.updateJourney(userId, extractedJourney);
            console.log('[Journey] Summary updated!');
          }
        }
      } catch (error) {
        console.error('[Journey] Update error:', error);
      }
    }

    safeEnd();
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    sendError(error.message);
  }
});

// ============================================
// VOICE TRANSCRIPTION ENDPOINT (Azure Speech)
// ============================================
app.post('/api/transcribe', express.raw({ type: 'audio/*', limit: '10mb' }), async (req, res) => {
  try {
    const audioBuffer = req.body;

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;

    if (!endpoint || !apiKey) {
      return res.status(500).json({ error: 'Azure credentials not configured' });
    }

    // Use Azure Speech-to-Text REST API
    const speechEndpoint = endpoint.replace('cognitiveservices.azure.com', 'stt.speech.microsoft.com');
    const region = endpoint.match(/https:\/\/([^.]+)/)?.[1] || 'eastus';

    const response = await fetch(
      `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'audio/wav',
          'Accept': 'application/json'
        },
        body: audioBuffer
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Transcribe] Azure Speech error:', errorText);
      return res.status(response.status).json({ error: 'Transcription failed', details: errorText });
    }

    const result = await response.json();
    console.log('[Transcribe] Result:', result);

    res.json({
      text: result.DisplayText || result.RecognizedText || '',
      confidence: result.Confidence || 0
    });

  } catch (error) {
    console.error('[Transcribe] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AZURE NEURAL TTS ENDPOINT
// ============================================
app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION || 'swedencentral';
    const voiceName = process.env.AZURE_TTS_VOICE || 'en-GB-SoniaNeural';

    if (!speechKey) {
      return res.status(500).json({ error: 'Azure Speech not configured' });
    }

    // Clean text for speech (remove markdown, code blocks, etc.)
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '')         // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links to text
      .replace(/#+\s*/g, '')           // Remove headings
      .replace(/\*\*/g, '')            // Remove bold
      .replace(/\*/g, '')              // Remove italic
      .replace(/_/g, ' ')              // Underscores to spaces
      .replace(/~~/g, '')              // Remove strikethrough
      .trim();

    if (!cleanText) {
      return res.status(400).json({ error: 'No speakable text' });
    }

    // SSML for more natural speech
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-GB">
        <voice name="${voiceName}">
          <prosody rate="0.95" pitch="+5%">
            ${cleanText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
          </prosody>
        </voice>
      </speak>
    `;

    // Use the Cognitive Services resource endpoint directly
    // For multi-service resources, we use the resource hostname with /tts/cognitiveservices/v1 path
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT || '';
    const host = azureEndpoint.replace('https://', '').replace('http://', '');

    // Call Azure Speech TTS API using the resource's endpoint
    const response = await fetch(
      `https://${host}/tts/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': speechKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-160kbitrate-mono-mp3',
          'User-Agent': 'TuftiVoice'
        },
        body: ssml
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTS] Azure error:', response.status, errorText);
      return res.status(500).json({ error: 'TTS failed' });
    }

    // Stream the audio back
    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('[TTS] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GPT-AUDIO: Advanced Voice Synthesis
// Uses Azure gpt-audio model for high-fidelity speech
// ============================================
app.post('/api/audio/gpt', chatLimiter, async (req, res) => {
  try {
    const { text, voice } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Validate voice if provided
    const validVoice = voice && VOICES[voice] ? voice : DEFAULT_VOICE;

    console.log(`[GPT-Audio] Generating speech for ${text.length} chars with voice: ${validVoice}`);

    const result = await generateAudio(text, validVoice);

    // Return base64-encoded audio
    res.json({
      success: true,
      audioData: result.audioData,
      format: result.format,
      voice: result.voice
    });

  } catch (error) {
    console.error('[GPT-Audio] Error:', error);
    res.status(500).json({ error: error.message || 'Audio generation failed' });
  }
});

// GET available voices
app.get('/api/audio/voices', (req, res) => {
  res.json({
    voices: getAvailableVoices(),
    default: DEFAULT_VOICE
  });
});

// ============================================
// SLIDE GENERATION ENDPOINT (FLUX.2-pro)
// ============================================

// POST /api/slide/generate - Generate a Target Slide image
app.post('/api/slide/generate', chatLimiter, async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'description is required' });
    }

    if (!isFluxReady()) {
      return res.status(503).json({ error: 'Image generation service not configured' });
    }

    console.log('[Slide] Generating Target Slide:', description.substring(0, 100) + '...');

    const result = await generateSlide(description, {
      size: '1024x1024',
      enhanceWithStyle: true
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Generation failed' });
    }

    res.json({
      success: true,
      imageBase64: result.imageBase64,
      prompt: result.prompt
    });

  } catch (error) {
    console.error('[Slide] Error:', error);
    res.status(500).json({ error: error.message || 'Slide generation failed' });
  }
});

// GET /api/slide/status - Check if slide generation is available
app.get('/api/slide/status', (req, res) => {
  res.json({
    available: isFluxReady(),
    model: process.env.AZURE_FLUX_MODEL || 'FLUX.2-pro'
  });
});

// Create HTTP server and attach Express app
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
