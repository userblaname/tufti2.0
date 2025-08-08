// This is the full code for: src/lib/chat-service.ts

// Defines the structure for a message in the conversation
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
    const message = data?.choices?.[0]?.message;
    let aiMessage: string | undefined;

    if (message) {
      // Newer Azure/OpenAI models may return content as an array of parts
      const content = message.content as unknown;
      if (typeof content === 'string') {
        aiMessage = content;
      } else if (Array.isArray(content)) {
        // Join any text parts together
        aiMessage = content
          .filter((part: any) => part?.type === 'text' && typeof part?.text === 'string')
          .map((part: any) => part.text)
          .join('') || undefined;
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