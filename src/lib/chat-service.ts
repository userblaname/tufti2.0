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
    const message = data?.choices?.[0]?.message ?? data?.choices?.[0];
    let aiMessage: string | undefined;

    if (message) {
      // Content can be a string or an array of objects with a `text` field
      const content = message.content as unknown;
      if (typeof content === 'string') {
        aiMessage = content;
      } else if (Array.isArray(content)) {
        aiMessage = content
          .map((part: any) => {
            if (typeof part === 'string') return part;
            if (part && typeof part.text === 'string') return part.text;
            return '';
          })
          .join('')
          .trim() || undefined;
      }
      // Fallbacks some providers use
      if (!aiMessage && typeof (message?.text) === 'string') {
        aiMessage = message.text;
      }
    }

    if (!aiMessage || aiMessage.trim().length === 0) {
      throw new Error("The AI response was not in the expected format.");
    }

    return aiMessage;

  } catch (error) {
    console.error("Error communicating with the chat service:", error);
    throw error; // Pass the error up so the UI component can handle it
  }
}