exports.handler = async (event, context) => {
  console.log("ai-proxy.cjs (simplified) function invoked.");
  return {
    statusCode: 200,
    body: "Hello from Netlify Function!\nPath: " + event.path,
  };
}; 