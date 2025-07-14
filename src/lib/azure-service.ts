import { azureConfig } from "./ai-config"
import { TUFTI_SYSTEM_PROMPT } from "./tufti"
import type { Message, UserProfile } from "./types"

export class AzureService {
  private static instance: AzureService

  private constructor() {
    // No direct client initialization needed anymore, as we're hitting our Netlify Function
  }

  static getInstance(): AzureService {
    if (!AzureService.instance) {
      AzureService.instance = new AzureService()
    }
    return AzureService.instance
  }

  async generateResponse(userMessage: string, context: Message[], userProfile?: UserProfile): Promise<string> {
    try {
      const messagesToSend = [
        { role: "system", content: TUFTI_SYSTEM_PROMPT },
        ...(userProfile ? [{
          role: "system",
          content: `Current user: ${userProfile.name}\nExperience level: ${userProfile.rtExperience}\nFocus area: ${userProfile.realityFocus}\nTransformation goal: ${userProfile.transformationIntent}`
        }] : []),
        ...context.map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text
        })),
        { role: "user", content: userMessage }
      ]

      const response = await fetch(azureConfig.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: messagesToSend, systemPrompt: TUFTI_SYSTEM_PROMPT })
      });

      if (!response.ok || !response.body) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(`Server error: ${response.status} ${response.statusText} - ${errorData.error || 'No additional details'}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let generatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        // Split by data: and newlines, filter empty strings
        const lines = chunk.split(/\r?\n+/).filter(line => line.startsWith('data:'));

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const jsonStr = line.substring(5).trim();
            if (jsonStr) {
              try {
                const data = JSON.parse(jsonStr);
                if (data.content) {
                  generatedText += data.content;
                  // Here you might want to emit events or use a callback to update UI with streaming text
                  // For now, we'll just build the full text and return at the end.
                } else if (data.error) {
                  throw new Error(`Stream error: ${data.error}`);
                }
              } catch (e) {
                console.error("Failed to parse JSON from stream chunk:", jsonStr, e);
                // Continue processing other chunks even if one fails
              }
            }
          }
        }
      }

      console.log("Successfully received full response from Netlify Function");
      return generatedText;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Failed to generate response via Netlify Function:", errorMessage);
      throw error;
    }
  }
}