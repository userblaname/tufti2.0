const express = require('express');
const { AzureOpenAI } = require('openai');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load .env file FIRST
dotenv.config({ path: path.resolve(__dirname, '.env') });

// SECRETS REMOVED - Ensure AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT are set in the .env file or Azure App Settings

// Set other necessary env vars, using process.env now that .env is loaded
process.env.OPENAI_API_VERSION = process.env.OPENAI_API_VERSION || "2024-12-01-preview"; // Default if not set
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4.5-preview"; 

// Debug output - Will show undefined if not set in .env
console.log("Environment variables loaded:");
console.log(`Endpoint: ${process.env.AZURE_OPENAI_ENDPOINT}`);
console.log(`API Key: ${process.env.AZURE_OPENAI_API_KEY ? process.env.AZURE_OPENAI_API_KEY.substring(0, 5) + '...' : 'Not Set'}`);
console.log(`API Version: ${process.env.OPENAI_API_VERSION}`);
console.log(`Deployment: ${deployment}`);

const app = express();
const port = process.env.PORT || 3001;

// Initialize the Azure OpenAI client (will fail if key/endpoint are missing)
const client = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: process.env.OPENAI_API_VERSION,
});

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Serve static files from the 'dist' folder
app.use(express.static(path.join(__dirname, '..', 'dist')));

// --- API Endpoint for Chat ---
app.post('/api/chat', async (req, res) => {
  let streamFinishedNaturally = false; // Flag to track stream completion
  try {
    const { messages, systemPrompt } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request body: "messages" array is required.' });
    }

    const messagesToSend = systemPrompt ? [{ role: 'system', content: systemPrompt }, ...messages] : messages;

    console.log(`Received ${messages.length} messages.`);
    if (systemPrompt) {
        console.log(`Applying system prompt: ${systemPrompt.substring(0, 50)}...`);
    }

    // --- Restore Azure call and streaming --- 
    console.log(`Calling Azure OpenAI...`);
    const stream = await client.chat.completions.create({
        model: deployment,
        messages: messagesToSend,
        stream: true,
        max_tokens: 800, // Restore params if needed
        temperature: 1.0,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
    });

    console.log("Azure OpenAI stream initiated. Setting headers and preparing to stream response...");

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    console.log("Starting stream iteration..."); // Log before loop
    for await (const chunk of stream) {
        if (chunk.choices && chunk.choices[0]?.delta?.content) {
            const content = chunk.choices[0].delta.content;
            console.log("Streaming content chunk:", content); // Log content chunk
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
            if (res.flush) {
                res.flush(); // Attempt to flush buffer
            }
        } else {
             console.log("Received stream chunk without expected content structure.");
        }
    }
    streamFinishedNaturally = true; // Set flag if loop completes
    console.log("Finished stream iteration (for await loop completed).");
    // --- END Restore --- 

    res.end(); // End the response after the stream finishes

  } catch (error) {
    console.error('Error during /api/chat processing:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2)); 
    // Ensure response ends even in catch block
    if (!res.headersSent) {
        // If error happened before headers sent (e.g., during Azure client call itself)
        res.status(500).json({ error: 'Internal Server Error before streaming.' });
    } else if (!streamFinishedNaturally) {
        // If error happened DURING streaming (headers already sent)
        console.log("Attempting to write error chunk to stream...");
        // Try to write an error message to the stream before ending
        try {
          res.write(`data: ${JSON.stringify({ error: 'Error during stream processing.' })}\n\n`);
        } catch (writeError) {
          console.error("Failed to write error chunk to stream:", writeError);
        }
        res.end(); // End the response
    } else {
        // Error happened after stream finished naturally? Unlikely but end response.
        res.end();
    }
  }
});

// Catch-all route for serving the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..' , 'dist', 'index.html'));
});

// --- Global Error Handling ---
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, cleanup, or exit
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Application specific logging, cleanup, or exit
  process.exit(1); // Exit in case of uncaught exception to prevent undefined behavior
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});
