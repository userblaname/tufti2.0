exports.handler = async (event, context) => {
  console.log("ai-proxy.cjs: ULTIMATE SIMPLIFIED FUNCTION INVOKED");
  console.log("Event path:", event.path);
  
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Hello from Netlify Function (Ultimate Simplified)!",
      path: event.path,
      method: event.httpMethod,
    }),
  };
}; 