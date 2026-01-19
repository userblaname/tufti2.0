// This is the full code for: src/lib/chat-service.ts

// Defines the structure for a message in the conversation
import { TUFTI_SYSTEM_PROMPT } from '@/lib/tufti'

// Image content block for Claude Vision API
interface ImageContent {
  type: 'image'
  source: {
    type: 'base64'
    media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    data: string
  }
}

// Text content block
interface TextContent {
  type: 'text'
  text: string
}

// Message can have string content or content blocks (for images)
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | (TextContent | ImageContent)[];
}

// Image data passed from useChat
interface ImageData {
  data: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
}

// Multi-agent and experiment event types
export interface AgentEvent {
  type: 'chain_start' | 'agent_start' | 'agent_thinking' | 'agent_complete' | 'chain_complete' | 'agent_error' | 'chain_error' |
  'experiment_start' | 'experiment_pass_start' | 'experiment_thinking' | 'experiment_pass_complete' | 'experiment_complete' | 'experiment_error'
  agent?: {
    name: string
    emoji: string
    phase: number
    isFinal?: boolean
  }
  thinking?: string
  summary?: string
  error?: string
  totalAgents?: number
  agents?: { name: string; emoji: string }[]
  // Experiment-specific fields
  totalPasses?: number
  estimatedDuration?: string
  pass?: { phase: number; name: string; emoji: string }
  phase?: number
}

/**
 * Securely sends the conversation to our backend and returns the AI's response.
 * @param conversationHistory An array of chat messages.
 * @param images Optional array of images to include with the latest message
 * @returns The AI's response message as a string.
 */
export async function getAiResponse(
  conversationHistory: ChatMessage[],
  onChunk?: (chunk: string) => void,
  onThinking?: (chunk: string) => void,
  thinkingEnabled: boolean = false,
  deepResearchEnabled: boolean = true,
  userId?: string,
  images?: ImageData[],
  signal?: AbortSignal,
  onAgentEvent?: (event: AgentEvent) => void,
  deepExperimentEnabled: boolean = false
): Promise<string> {
  try {
    // Get current date/time for temporal awareness
    const now = new Date()
    const timeString = now.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })

    // Inject current time into system prompt
    const systemPromptWithTime = TUFTI_SYSTEM_PROMPT.replace('{{CURRENT_TIME}}', timeString)

    // Add timestamps to conversation history so Tufti knows WHEN each message was sent
    const messagesWithTimestamps = conversationHistory.map((msg, index) => {
      // Only add timestamps to user messages, not system or assistant
      // Adding it to assistant messages confuses the model and makes it output timestamps in its replies
      if (msg.role !== 'user') return msg

      // Check if the message has a timestamp (from the Message type)
      const msgWithTs = msg as { timestamp?: Date; content: string; role: string }
      if (msgWithTs.timestamp) {
        const msgTime = new Date(msgWithTs.timestamp).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
        // Prefix the content with the timestamp
        const timestampPrefix = `[${msgTime}] `
        return {
          ...msg,
          content: typeof msg.content === 'string'
            ? timestampPrefix + msg.content
            : msg.content
        }
      }
      return msg
    })

    // Build base messages
    let messagesWithSystem: ChatMessage[] =
      conversationHistory[0]?.role === 'system'
        ? [...messagesWithTimestamps]
        : [
          { role: 'system', content: systemPromptWithTime },
          { role: 'system', content: 'Policy: Keep replies brief (2–6 sentences). End with a single, clear question.' },
          ...messagesWithTimestamps,
        ]

    // If images are provided, convert the last user message to content blocks format
    if (images && images.length > 0) {
      const lastMessageIndex = messagesWithSystem.length - 1
      const lastMessage = messagesWithSystem[lastMessageIndex]

      if (lastMessage && lastMessage.role === 'user') {
        // Build content blocks: images first, then text
        const contentBlocks: (TextContent | ImageContent)[] = []

        // Add image blocks
        for (const img of images) {
          contentBlocks.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.mediaType,
              data: img.data
            }
          })
        }

        // Add text block if there's text content
        const textContent = typeof lastMessage.content === 'string'
          ? lastMessage.content
          : ''
        if (textContent) {
          contentBlocks.push({
            type: 'text',
            text: textContent
          })
        }

        // Replace the last message with content blocks version
        messagesWithSystem[lastMessageIndex] = {
          role: 'user',
          content: contentBlocks
        }

        console.log('[chat-service] Added', images.length, 'image(s) to message')
      }
    }

    // Use local backend in development, Netlify function in production
    const API_URL = import.meta.env.DEV
      ? 'http://localhost:3001/api/chat'
      : '/.netlify/functions/ai-proxy';

    console.log('[chat-service] DEV mode:', import.meta.env.DEV);
    console.log('[chat-service] API_URL:', API_URL);
    console.log('[chat-service] Sending request with thinkingEnabled:', thinkingEnabled);
    console.log('[chat-service] Sending request with userId:', userId);
    console.log('[chat-service] Has images:', !!(images && images.length > 0));

    // DEBUG: Log the last message to see what's being sent
    const lastMsg = messagesWithSystem[messagesWithSystem.length - 1];
    console.log('[chat-service] DEBUG - Last message role:', lastMsg?.role);
    console.log('[chat-service] DEBUG - Last message content type:', typeof lastMsg?.content);
    if (Array.isArray(lastMsg?.content)) {
      console.log('[chat-service] DEBUG - Content blocks:', lastMsg.content.map((b: any) => ({ type: b.type, hasData: b.type === 'image' ? !!b.source?.data : !!b.text })));
    } else {
      console.log('[chat-service] DEBUG - Content preview:', lastMsg?.content?.substring?.(0, 100));
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messagesWithSystem,
        thinkingEnabled,
        deepResearchEnabled,
        deepExperimentEnabled,
        userId
      }),
      signal // Pass abort signal to fetch
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`The server returned an error: ${errorText}`);
    }

    // Handle streaming response from local backend (SSE format)
    if (import.meta.env.DEV) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (!reader) throw new Error("No response body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              const json = JSON.parse(data);

              // Handle regular thinking chunks
              if (json.thinking && onThinking) {
                onThinking(json.thinking);
              }

              // Handle regular content chunks
              if (json.content) {
                const textChunk = json.content;
                fullContent += textChunk;
                if (onChunk) onChunk(textChunk);
              }

              // Handle experiment mode events
              if (onAgentEvent) {
                if (json.experiment_start) {
                  onAgentEvent({
                    type: 'experiment_start',
                    totalPasses: json.experiment_start.totalPasses,
                    estimatedDuration: json.experiment_start.estimatedDuration
                  });
                }

                if (json.experiment_pass_start) {
                  onAgentEvent({
                    type: 'experiment_pass_start',
                    pass: json.experiment_pass_start
                  });
                }

                if (json.experiment_thinking) {
                  onAgentEvent({
                    type: 'experiment_thinking',
                    phase: json.experiment_thinking.phase,
                    thinking: json.experiment_thinking.content
                  });
                }

                if (json.experiment_pass_complete) {
                  onAgentEvent({
                    type: 'experiment_pass_complete',
                    pass: json.experiment_pass_complete
                  });
                }

                if (json.experiment_complete) {
                  onAgentEvent({ type: 'experiment_complete' });
                }

                if (json.experiment_error) {
                  onAgentEvent({
                    type: 'experiment_error',
                    phase: json.experiment_error.phase,
                    error: json.experiment_error.error
                  });
                }
              }

              // Handle multi-agent events
              if (onAgentEvent) {
                if (json.chain_start) {
                  onAgentEvent({
                    type: 'chain_start',
                    totalAgents: json.chain_start.totalAgents,
                    agents: json.chain_start.agents
                  });
                }

                if (json.agent_start) {
                  onAgentEvent({
                    type: 'agent_start',
                    agent: json.agent_start
                  });
                }

                if (json.agent_thinking) {
                  onAgentEvent({
                    type: 'agent_thinking',
                    agent: { name: json.agent_thinking.agent, emoji: '', phase: 0 },
                    thinking: json.agent_thinking.content
                  });
                }

                if (json.agent_complete) {
                  onAgentEvent({
                    type: 'agent_complete',
                    agent: json.agent_complete,
                    summary: json.agent_complete.summary
                  });
                }

                if (json.chain_complete) {
                  onAgentEvent({ type: 'chain_complete' });
                }

                if (json.agent_error) {
                  onAgentEvent({
                    type: 'agent_error',
                    agent: { name: json.agent_error.name, emoji: '', phase: 0 },
                    error: json.agent_error.error
                  });
                }

                if (json.chain_error) {
                  onAgentEvent({
                    type: 'chain_error',
                    error: json.chain_error
                  });
                }
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }

      if (fullContent.trim()) {
        return fullContent.trim();
      }

      // If we received agent/experiment events but no final content, return a placeholder or the last thinking to avoid a crash
      // accessing onAgentEvent is tricky here since it's a callback, but we can assume if no error was thrown, we might have just finished thinking.
      if (!fullContent && !import.meta.env.DEV) {
        // strict check for prod only? 
      }

      // Fallback: If we had a valid stream but no content, return empty string (hooks will handle the display of agents)
      return "";

      // throw new Error("No content received from AI"); // Removed strict throw
    }

    // Production: expect regular JSON response from Netlify function
    const data = await response.json();

    // Prefer normalized server content when available
    if (typeof data?.content === 'string' && data.content.trim().length > 0) {
      return data.content.trim();
    }

    const extractText = (payload: any): string => {
      if (!payload) return '';
      if (typeof payload === 'string') return payload;
      if (Array.isArray(payload)) return payload.map(extractText).join('');
      // Common shapes
      if (typeof payload.text === 'string') return payload.text;
      if (payload.message) return extractText(payload.message);
      if (payload.delta) return extractText(payload.delta);
      if (payload.content) return extractText(payload.content);
      if (payload.output_text) return extractText(payload.output_text);
      if (payload.output) return extractText(payload.output);
      if (payload.choices) return extractText(payload.choices[0]);
      return '';
    };

    // Heuristic: looks like natural language (avoid IDs like chatcmpl-...)
    const isNaturalLanguage = (s: string): boolean => {
      if (!s) return false;
      const trimmed = s.trim();
      if (trimmed.length < 8) return false; // too short
      if (/^(chatcmpl|cmpl|msg|gpt|o[0-9]|ftcomp|run|asst|conv)[-_]/i.test(trimmed)) return false; // id-like prefixes
      if (/^[A-Za-z0-9_-]{15,}$/.test(trimmed) && !/\s/.test(trimmed)) return false; // long token without spaces
      return /[a-zA-Z]/.test(trimmed) && /\s/.test(trimmed); // has letters and at least one space
    };

    // Fallback: deep search for the longest natural-language string
    const extractLongestString = (node: any): string => {
      let best = '';
      const visit = (n: any) => {
        if (n == null) return;
        if (typeof n === 'string') {
          const s = n.trim();
          if (isNaturalLanguage(s) && s.length > best.length) best = s;
          return;
        }
        if (Array.isArray(n)) {
          n.forEach(visit);
          return;
        }
        if (typeof n === 'object') {
          Object.values(n).forEach(visit);
        }
      };
      visit(node);
      return best;
    };

    // Prefer choices.message.content when present; otherwise fall back to best-effort extraction
    const preferred = data?.choices?.[0]?.message?.content;
    let aiMessage: string | undefined = extractText(preferred).trim();
    if (!aiMessage) aiMessage = extractText(data).trim();
    if (!aiMessage) aiMessage = extractLongestString(data);

    if (!aiMessage || aiMessage.trim().length === 0) {
      throw new Error("The AI response was not in the expected format.");
    }

    return aiMessage;

  } catch (error) {
    console.error("Error communicating with the chat service:", error);
    throw error; // Pass the error up so the UI component can handle it
  }
}