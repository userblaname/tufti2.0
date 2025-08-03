// This is the FINAL code for: netlify/functions/ai-proxy.cjs
const fetch = require('node-fetch');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // These secrets are read securely from the Netlify UI.
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  // This uses your correct model name, `o4-mini`.
  const deploymentName = 'o4-mini';

  if (!apiKey || !endpoint) {
    return {
      statusCode: 500,
      body: 'Administrator: API secrets are not configured in Netlify.',
    };
  }

  const azureUrl = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2023-05-15`;

  try {
    const { messages } = JSON.parse(event.body);
    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({ messages, max_tokens: 1500, temperature: 0.7 }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { statusCode: response.status, body: errorBody };
    }

    const data = await response.json();
    return { statusCode: 200, body: JSON.stringify(data) };

  } catch (error) {
    return { statusCode: 500, body: 'Internal function error.' };
  }
}; 