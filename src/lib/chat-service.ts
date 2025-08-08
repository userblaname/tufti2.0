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
        : [{ role: 'system', content: TUFTI_SYSTEM_PROMPT }, ...conversationHistory]

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

    const extractText = (payload: any): string => {
      if (!payload) return '';
      if (typeof payload === 'string') return payload;
      if (Array.isArray(payload)) return payload.map(extractText).join('');
      // Try common shapes
      if (typeof payload.text === 'string') return payload.text;
      if (payload.message) return extractText(payload.message);
      if (payload.content) return extractText(payload.content);
      if (payload.output_text) return extractText(payload.output_text);
      if (payload.output) return extractText(payload.output);
      if (payload.choices) return extractText(payload.choices[0]);
      return '';
    };

    // Prefer choices.message.content when present; otherwise fall back to best-effort extraction
    const preferred = data?.choices?.[0]?.message?.content;
    let aiMessage: string | undefined = extractText(preferred).trim();
    if (!aiMessage) aiMessage = extractText(data).trim();

    if (!aiMessage || aiMessage.trim().length === 0) {
      throw new Error("The AI response was not in the expected format.");
    }

    return aiMessage;

  } catch (error) {
    console.error("Error communicating with the chat service:", error);
    throw error; // Pass the error up so the UI component can handle it
  }
}