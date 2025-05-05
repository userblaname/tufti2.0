const { AzureOpenAI } = require('@azure/openai');
const dotenv = require('dotenv');

// Load environment variables for the function
// Note: In Azure deployment, these should be set as Application Settings
dotenv.config({ path: process.env.AZURE_FUNCTION_ENV === 'Development' ? '../.env' : '' });

// Reusable OpenAI client (consider initializing outside the handler if performance is critical)
let openAIClient;
function getOpenAIClient(context) {
    if (!openAIClient) {
        const apiKey = process.env.AZURE_OPENAI_API_KEY;
        const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const apiVersion = process.env.OPENAI_API_VERSION || "2024-12-01-preview"; // Match the version used locally
        const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4.5-preview";

        if (!apiKey || !endpoint) {
            context.log.error('Azure OpenAI API Key or Endpoint not configured.');
            // Throwing error to be caught by the main handler's catch block
            throw new Error('Azure OpenAI environment variables not set.');
        }

        context.log('Initializing AzureOpenAI client with:');
        context.log(`Endpoint: ${endpoint}`);
        context.log(`API Key: ${apiKey.substring(0, 5)}...`);
        context.log(`API Version: ${apiVersion}`);
        context.log(`Deployment: ${deployment}`);
        
        openAIClient = new AzureOpenAI({
            endpoint: endpoint,
            apiKey: apiKey,
            apiVersion: apiVersion,
            deployment: deployment, 
        });
    }
    return openAIClient;
}

// Main Azure Function handler
module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    // Enable streaming response
    context.res.isStreaming = true;
    context.res.headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
    };
    // Sending headers immediately (or let Azure Functions handle it)
    // context.res.flushHeaders(); 

    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            context.log.warn('Invalid request body received.');
            context.res = {
                status: 400,
                body: JSON.stringify({ error: 'Invalid request body: "messages" array is required.' }),
                isStreaming: false, // Turn off streaming for error response
                headers: { 'Content-Type': 'application/json' }
            };
            return;
        }

        context.log(`Received ${messages.length} messages. Calling Azure OpenAI...`);
        const client = getOpenAIClient(context);
        const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4.5-preview";

        const stream = await client.chat.completions.create({
            model: deployment,
            messages: messages,
            stream: true,
            max_tokens: 800, 
            temperature: 1.0,
            top_p: 1.0,
            frequency_penalty: 0.0,
            presence_penalty: 0.0,
        });

        context.log("Azure OpenAI stream initiated. Pushing chunks...");

        // Iterate through the stream and push chunks to the response stream
        for await (const chunk of stream) {
            if (chunk.choices && chunk.choices[0]?.delta?.content) {
                const content = chunk.choices[0].delta.content;
                const chunkString = `data: ${JSON.stringify({ content })}\n\n`;
                // context.log.info(`Pushing chunk: ${content.substring(0, 20)}...`); // Verbose logging
                context.stream.push(chunkString);
            } else {
                // Log unexpected chunks but continue
                context.log.info("Received stream chunk without expected content structure.");
            }
        }

        context.log("Finished stream iteration.");
        // Signal the end of the stream (important for push streams)
        context.stream.push(null); 

    } catch (error) {
        context.log.error('Error during Azure Function execution:', error);
        // If headers haven't been sent (error before streaming started)
        // Note: For streaming=true, headers might be sent early by the runtime.
        // We try to push an error chunk if possible.
        try {
            const errorPayload = { error: error.message || 'Internal Server Error during processing.' };
            const errorChunk = `data: ${JSON.stringify(errorPayload)}\n\n`;
            context.stream.push(errorChunk);
            context.stream.push(null); // End the stream after error
        } catch (streamError) {
            context.log.error('Failed to push error chunk to stream:', streamError);
            // Fallback: If pushing fails, set a standard error response if possible (might be too late)
             context.res = {
                status: 500,
                body: JSON.stringify({ error: 'Internal Server Error and failed to write to stream.' }),
                isStreaming: false,
                headers: { 'Content-Type': 'application/json' }
            };
        }
        // Don't explicitly set context.res if we managed to push an error chunk
    }
}; 