const express = require('express');
const { AzureOpenAI } = require('openai');
const dotenv = require('dotenv');
const cors = require('cors');
const serverless = require('serverless-http');

dotenv.config(); // Load .env from Netlify's environment

// Initialize the Azure OpenAI client
const client = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: process.env.OPENAI_API_VERSION || "2024-12-01-preview",
});

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- API Endpoint for Chat ---
app.post('/api/chat', async (req, res) => {
  let streamFinishedNaturally = false;
  try {
    const { messages, systemPrompt } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request body: "messages" array is required.' });
    }

    const messagesToSend = systemPrompt ? [{ role: 'system', content: systemPrompt }, ...messages] : messages;

    const stream = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4.5-preview",
      messages: messagesToSend,
      stream: true,
      max_tokens: 800,
      temperature: 1.0,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    for await (const chunk of stream) {
      if (chunk.choices && chunk.choices[0]?.delta?.content) {
        const content = chunk.choices[0].delta.content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
        if (res.flush) {
          res.flush();
        }
      }
    }
    streamFinishedNaturally = true;
    res.end();

  } catch (error) {
    console.error('Error during /api/chat processing:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error before streaming.' });
    } else if (!streamFinishedNaturally) {
      try {
        res.write(`data: ${JSON.stringify({ error: 'Error during stream processing.' })}\n\n`);
      } catch (writeError) {
        console.error("Failed to write error chunk to stream:", writeError);
      }
      res.end();
    } else {
      res.end();
    }
  }
});

// For local development with `netlify dev` only
if (process.env.NETLIFY_DEV) {
    const port = process.env.PORT || 3001;
    app.listen(port, () => {
        console.log(`Local Netlify Function proxy listening on http://localhost:${port}`);
    });
}

module.exports.handler = serverless(app); 