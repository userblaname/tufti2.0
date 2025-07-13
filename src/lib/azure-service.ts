import { OpenAIClient, AzureKeyCredential } from "@azure/openai"
import { azureConfig } from "./ai-config"
import { TUFTI_SYSTEM_PROMPT } from "./tufti"
import type { Message, UserProfile } from "./types"

export class AzureService {
  private static instance: AzureService
  private client: OpenAIClient | null = null

  private constructor() {
    const { endpoint, apiKey, deploymentName } = azureConfig

    if (!endpoint || !apiKey) {
      console.error("Azure OpenAI endpoint or API key not found")
      return
    }

    if (!deploymentName) {
      console.error("Azure deployment name not configured")
      return
    }

    try {
      // Ensure endpoint doesn't end with a slash for proper URL construction
      const baseEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint
      
      // Log the full endpoint URL for debugging
      console.log(`Initializing Azure OpenAI client with endpoint: ${baseEndpoint}/openai/deployments/${deploymentName}/chat/completions`)
      
      this.client = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey))
      console.log("Azure OpenAI client initialized successfully")
    } catch (error) {
      console.error("Failed to initialize Azure OpenAI client:", error)
      this.client = null
    }
  }

  static getInstance(): AzureService {
    if (!AzureService.instance) {
      AzureService.instance = new AzureService()
    }
    return AzureService.instance
  }

  async generateResponse(userMessage: string, context: Message[], userProfile?: UserProfile): Promise<string> {
    if (!this.client) {
      throw new Error("Azure OpenAI client not initialized. Please check your credentials and deployment configuration.")
    }

    const { deploymentName } = azureConfig

    try {
      const messages = [
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

      const response = await this.client.getChatCompletions(
        deploymentName,
        messages,
        {
          temperature: 0.7,
          maxTokens: 1500,
          topP: 0.92,
          frequencyPenalty: 0.18,
          presencePenalty: 0.15
        }
      )

      const generatedText = response.choices[0]?.message?.content
      if (!generatedText) {
        throw new Error("No response generated")
      }

      console.log("Successfully generated response from Azure OpenAI")
      return generatedText
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      console.error("Failed to generate response from Azure OpenAI:", errorMessage)
      throw error
    }
  }
}