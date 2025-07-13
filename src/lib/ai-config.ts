import { AzureKeyCredential } from "@azure/openai"

export const azureConfig = {
  endpoint: "/api/chat", // Now points to our Netlify Function
  // apiKey and deploymentName are no longer needed here as the Netlify Function handles Azure authentication
  apiVersion: "2023-05-15" 
}

// Helper to create credential
export const createAzureCredential = () => 
  new AzureKeyCredential(azureConfig.apiKey)
