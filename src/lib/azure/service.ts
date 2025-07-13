import { OpenAIClient } from "@azure/openai"
import { azureConfig, createAzureCredential } from "./config"
import { TUFTI_SYSTEM_PROMPT } from "@/lib/tufti"
import type { UserProfile } from "@/lib/types"

const MAX_CONTEXT_MESSAGES = 20

export class AzureService {
  private static instance: AzureService
  private client: OpenAIClient | null = null
  private conversationHistory: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = []

  private readonly maxRetries = 3
  private readonly initialRetryDelay = 1000
  private streamController: AbortController | null = null

  private constructor() {
    this.initializeClient()
    this.resetConversation()
  }

  private async initializeWithRetry(attempt = 1): Promise<boolean> {
    if (attempt > this.maxRetries) {
      return false
    }

    try {
      await this.client?.getChatCompletions(
        azureConfig.deploymentName,
        [{ role: 'system', content: 'test' }],
        { maxTokens: 1 }
      )
      return true
    } catch (error: unknown) {
      const err = error as { name?: string; code?: string };
      console.warn(`Azure initialization attempt ${attempt} failed:`, err);
      const delay = this.initialRetryDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.initializeWithRetry(attempt + 1);
    }
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    attempt = 1
  ): Promise<T> {
    try {
      return await operation()
    } catch (error: unknown) {
      const err = error as { name?: string; code?: string };
      if (attempt > this.maxRetries || !this.shouldRetry(err)) {
        throw error
      }

      const delay = this.initialRetryDelay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
      return this.retryOperation(operation, attempt + 1)
    }
  }

  private shouldRetry(error: { name?: string; code?: string }): boolean {
    const retryableCodes = ['REQUEST_SEND_ERROR', 'TIMEOUT_ERROR', 'NETWORK_ERROR']
    return retryableCodes.includes(error?.code ?? '') || error?.name === 'AbortError'
  }

  private async streamWithRetry(
    messages: Array<{ role: string, content: string }>,
    onProgress?: (text: string) => void
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Azure client not initialized')
    }

    let fullResponse = ''
    const stream = await this.client.streamChatCompletions(
      azureConfig.deploymentName,
      messages,
      {
        temperature: 0.7,
        maxTokens: 1500,
        topP: 0.92,
        frequencyPenalty: 0.18,
        presencePenalty: 0.15,
        stop: ["Human:", "Assistant:"],
        abortSignal: this.streamController?.signal
      }
    )

    try {
      for await (const event of stream) {
        const content = event.choices[0]?.delta?.content || ''
        fullResponse += content
        onProgress?.(fullResponse)
      }
      return fullResponse
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err?.name === 'AbortError') {
        throw new Error('Stream cancelled')
      }
      throw error
    }
  }

  static getInstance(): AzureService {
    if (!AzureService.instance) {
      AzureService.instance = new AzureService()
    }
    return AzureService.instance
  }

  private initializeClient() {
    const { endpoint } = azureConfig
    if (!endpoint) {
      throw new Error("Azure OpenAI endpoint not configured")
    }

    const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint

    try {
      this.client = new OpenAIClient(
        cleanEndpoint,
        createAzureCredential()
      )
    } catch (error: unknown) {
      const err = error as { name?: string };
      console.error("Failed to initialize Azure client:", err);
      throw error;
    }
  }

  private resetConversation() {
    this.conversationHistory = [{
      role: "system",
      content: TUFTI_SYSTEM_PROMPT
    }]
  }

  private addToHistory(role: 'user' | 'assistant', content: string) {
    this.conversationHistory.push({ role, content })
    
    if (this.conversationHistory.length > MAX_CONTEXT_MESSAGES + 1) {
      const systemPrompt = this.conversationHistory[0]
      this.conversationHistory = [
        systemPrompt,
        ...this.conversationHistory.slice(-(MAX_CONTEXT_MESSAGES))
      ]
    }
  }

  async generateResponse(
    userMessage: string, 
    userProfile?: UserProfile,
    onProgress?: (text: string) => void
  ): Promise<string> {
    if (this.streamController) {
      this.streamController.abort()
    }
    this.streamController = new AbortController()

    try {
      if (!this.client) {
        this.initializeClient()
        const initialized = await this.initializeWithRetry()
        if (!initialized) {
          throw new Error("Failed to initialize Azure OpenAI client after multiple attempts")
        }
      }

      if (userProfile) {
        this.conversationHistory[0].content += `\n\nCurrent user: ${userProfile.name}\nExperience level: ${userProfile.rtExperience}\nFocus area: ${userProfile.realityFocus}\nTransformation goal: ${userProfile.transformationIntent}`
      }

      this.addToHistory("user", userMessage)

      const fullResponse = await this.retryOperation(() => 
        this.streamWithRetry(this.conversationHistory, onProgress)
      )

      this.addToHistory("assistant", fullResponse)
      this.streamController = null

      return fullResponse
    } catch (error: unknown) {
      const err = error as { code?: string; name?: string };
      if (err?.code === 'REQUEST_SEND_ERROR') {
        throw new Error('Failed to connect to Azure OpenAI. Please check your network connection.')
      } else if (err?.code === 'RATE_LIMIT_EXCEEDED') {
        throw new Error('Rate limit exceeded. Please try again in a moment.')
      } else if (err?.name === 'AbortError') {
        throw new Error('Response generation cancelled')
      }
      console.error("Failed to generate response:", error)
      throw new Error('An unexpected error occurred while generating the response.')
    }
  }

  cancelGeneration() {
    if (this.streamController) {
      this.streamController.abort()
      this.streamController = null
    }
  }

  clearHistory() {
    this.resetConversation()
    this.cancelGeneration()
  }
}