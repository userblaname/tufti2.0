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
    const aiMessage = data.choices[0]?.message?.content;

    if (!aiMessage) {
      throw new Error("The AI response was not in the expected format.");
    }

    return aiMessage;

  } catch (error) {
    console.error("Error communicating with the chat service:", error);
    throw error; // Pass the error up so the UI component can handle it
  }
}