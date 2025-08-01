import { AzureKeyCredential } from "@azure/openai"

export const azureConfig = {
  endpoint: "https://navigator31.openai.azure.com",
  apiKey: "a388d7b6f0624893b7e734dd1cd3a4d5",
  deploymentName: "o4-mini",
  apiVersion: "2023-05-15"
}

// Helper to create credential
export const createAzureCredential = () => 
  new AzureKeyCredential(azureConfig.apiKey)