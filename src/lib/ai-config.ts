import { AzureKeyCredential } from "@azure/openai"

export const azureConfig = {
  endpoint: "https://abdel-m27xpjov-eastus2.openai.azure.com",  // Removed trailing slash
  apiKey: "a388d7b6f0624893b7e734dd1cd3a4d5",
  deploymentName: "gpt-4o-4OK",
  apiVersion: "2023-05-15"  // Added API version
}

// Helper to create credential
export const createAzureCredential = () => 
  new AzureKeyCredential(azureConfig.apiKey)
