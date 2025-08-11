// This is the full code for: src/lib/chat-service.ts

// Defines the structure for a message in the conversation
import { TUFTI_SYSTEM_PROMPT } from '@/lib/tufti'
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Securely sends the conversation to our backend and returns the AI's response.
 * @param conversationHistory An array of chat messages.
 * @returns The AI's response message as a string.
 */
export async function getAiResponse(conversationHistory: ChatMessage[]): Promise<string> {
  try {
    // Always prepend Tufti system prompt unless the caller provided one already
    const messagesWithSystem =
      conversationHistory[0]?.role === 'system'
        ? conversationHistory
        : [
            { role: 'system', content: TUFTI_SYSTEM_PROMPT },
            // Force dialog cadence: nudge the assistant to respond briefly and ask a question back
            { role: 'system', content: 'Policy: Keep replies brief (2–6 sentences). End with a single, clear question.' },
            ...conversationHistory,
          ]

    // This URL points to our secure Netlify Function, not directly to Azure.
    const response = await fetch('/.netlify/functions/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messagesWithSystem }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`The server returned an error: ${errorText}`);
    }

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
    const preferred = data?.content ?? data?.choices?.[0]?.message?.content;
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