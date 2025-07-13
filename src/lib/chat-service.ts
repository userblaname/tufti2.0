import { AzureService } from "./azure-service"
import type { Message } from "./types"

export class ChatService {
  private static instance: ChatService
  private context: Message[] = []
  private azure: AzureService

  private constructor() {
    this.azure = AzureService.getInstance()
  }

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  async generateResponse(userMessage: string): Promise<{ text: string; metadata: any }> {
    try {
      const response = await this.azure.generateResponse(userMessage, this.context)
      
      return {
        text: response,
        metadata: {
          relevanceScore: 0.9,
          cached: false,
          sourceConfidence: 1.0
        }
      }
    } catch (error) {
      console.error("Chat service error:", error)
      throw error
    }
  }

  clearContext() {
    this.context = []
  }
}