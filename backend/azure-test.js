const { AzureOpenAI } = require('openai');

// Set explicit environment variables
process.env.AZURE_OPENAI_API_KEY = "CbkAPAnJPM9fHwWkncxJXW37ZBmia3RVytKpE4Vbvz4Rjd1brPulJQQJ99BDACHYHv6XJ3w3AAABACOGyfyy";
process.env.AZURE_OPENAI_ENDPOINT = "https://asktufti25.openai.azure.com/";
process.env.OPENAI_API_VERSION = "2025-01-01-preview"; // Note this naming

// Direct credentials for logging
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.OPENAI_API_VERSION;
const deployment = "gpt-4.5-preview";

console.log("Testing Azure OpenAI credentials:");
console.log(`Endpoint: ${endpoint}`);
console.log(`API Key: ${apiKey.substring(0, 5)}...`);
console.log(`API Version: ${apiVersion}`);
console.log(`Deployment: ${deployment}`);

async function testAzure() {
  try {
    // Initialize client with separate parameter
    const client = new AzureOpenAI({
      apiVersion: apiVersion,
    });

    console.log("Client initialized, attempting simple completion...");

    // Create a simple completion
    const completion = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello, how are you?" }
      ],
      max_tokens: 100,
    });

    console.log("Completion successful!");
    console.log("Response:", completion.choices[0].message.content);
    return true;
  } catch (error) {
    console.error("Error testing Azure OpenAI:");
    console.error(error);
    return false;
  }
}

// Run the test
testAzure().then(success => {
  if (success) {
    console.log("Azure OpenAI test completed successfully!");
  } else {
    console.log("Azure OpenAI test failed!");
  }
});
