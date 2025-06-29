module.exports = async function (context, req) {
    context.log('Test chat API called');
    
    // Simple test response
    context.res = {
        status: 200,
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        },
        body: `data: ${JSON.stringify({ content: "Hello! This is a test response from the API." })}\n\ndata: ${JSON.stringify({ content: " How can I help you today?" })}\n\n`
    };
}; 