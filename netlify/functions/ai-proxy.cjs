// This is the FINAL code for: netlify/functions/ai-proxy.cjs
const fetch = require('node-fetch');

// Very lightweight in-memory rate limiter (per-IP per minute)
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute
const buckets = new Map();

function getClientKey(event) {
  const xfwd = event.headers['x-forwarded-for'] || event.headers['client-ip'] || '';
  const ip = Array.isArray(xfwd) ? xfwd[0] : (xfwd.split(',')[0] || 'unknown');
  return ip.trim();
}

function isRateLimited(key, now = Date.now()) {
  const bucket = buckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start > RATE_LIMIT_WINDOW_MS) {
    buckets.set(key, { start: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  buckets.set(key, bucket);
  return bucket.count > RATE_LIMIT_MAX;
}

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

  const azureUrl = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2025-01-01-preview`;

  try {
    const clientKey = getClientKey(event);
    if (isRateLimited(clientKey)) {
      return { statusCode: 429, body: JSON.stringify({ error: { code: 'rate_limited', message: 'Too many requests, please slow down.' } }) };
    }

    const { messages } = JSON.parse(event.body || '{}');
    if (!Array.isArray(messages) || messages.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: { code: 'bad_request', message: 'Missing messages array.' } }) };
    }

    // Guardrails: limit history size and message length
    const MAX_MESSAGES = 30;
    const MAX_CHARS = 4000;
    const safeMessages = messages
      .slice(-MAX_MESSAGES)
      .map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content.slice(0, MAX_CHARS) : m.content,
      }));
    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      // o4-mini expects max_completion_tokens on this API version
      body: JSON.stringify({ messages: safeMessages, max_completion_tokens: 1200 }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { statusCode: response.status, body: errorBody };
    }

    const data = await response.json();

    // Normalize content to a single string for the client
    const extractText = (payload) => {
      if (!payload) return '';
      if (typeof payload === 'string') return payload;
      if (Array.isArray(payload)) return payload.map(extractText).join('');
      if (typeof payload.text === 'string') return payload.text;
      if (payload.message) return extractText(payload.message);
      if (payload.delta) return extractText(payload.delta);
      if (payload.content) return extractText(payload.content);
      if (payload.output_text) return extractText(payload.output_text);
      if (payload.output) return extractText(payload.output);
      if (payload.choices) return extractText(payload.choices[0]);
      return '';
    };

    const rawPreferred = data?.choices?.[0]?.message?.content;
    let content = extractText(rawPreferred).trim();
    if (!content) content = extractText(data).trim();

    if (!content) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: { code: 'bad_ai_response', message: 'AI returned no usable text.' }, raw: data })
      };
    }

    return { statusCode: 200, body: JSON.stringify({ content, raw: undefined }) };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: { code: 'server_error', message: 'Internal function error.' } }) };
  }
}; 