const express = require('express');
const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const client = new OpenAIClient(
  process.env.AZURE_OPENAI_ENDPOINT,
  new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY),
);

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  try {
    const events = await client.streamChatCompletions(process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'o4-mini', messages);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const event of events) {
      for (const choice of event.choices) {
        if (choice.delta?.content) {
          res.write(`data: ${JSON.stringify({ content: choice.delta.content })}\n\n`);
        }
      }
    }
    res.end();
  } catch (error) {
    console.error('Error streaming response from Azure OpenAI:', error);
    res.status(500).send('Error streaming response from Azure OpenAI');
  }
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});
