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
    // This URL points to our secure Netlify Function, not directly to Azure.
    const response = await fetch('/.netlify/functions/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversationHistory }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`The server returned an error: ${errorText}`);
    }

    const data = await response.json();

    // The official, normalized path for the response text
    const aiMessage = data?.content;

    if (typeof aiMessage !== 'string' || aiMessage.trim().length === 0) {
      console.warn('AI response was not in the expected format, searching for text.', data);
      throw new Error('AI response was not in the expected format.');
    }

    return aiMessage.trim();
    
  } catch (error) {
    console.error("Error communicating with the chat service:", error);
    throw error; // Pass the error up so the UI component can handle it
  }
}