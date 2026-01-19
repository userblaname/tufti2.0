/**
 * Environment Validation Script
 * Run this to check if all required env vars are set
 */

require('dotenv').config();

const REQUIRED_VARS = {
    // Core API
    'ANTHROPIC_ENDPOINT': 'Anthropic API endpoint for Claude',
    'ANTHROPIC_API_KEY': 'Anthropic API key',
    'ANTHROPIC_MODEL': 'Claude model name (e.g., claude-opus-4-5)',

    // RAG - Pinecone
    'PINECONE_API_KEY': 'Pinecone vector database API key',
    'PINECONE_INDEX': 'Pinecone index name (e.g., tufti-knowledge)',

    // Azure Embeddings
    'AZURE_EMBEDDING_ENDPOINT': 'Azure OpenAI endpoint for embeddings',
    'AZURE_EMBEDDING_KEY': 'Azure OpenAI API key',
    'AZURE_EMBEDDING_DEPLOYMENT': 'Azure embedding deployment name',

    // Azure TTS (optional but recommended)
    'AZURE_SPEECH_KEY': 'Azure Speech Services key for TTS',
    'AZURE_SPEECH_REGION': 'Azure Speech region (e.g., swedencentral)',
};

const OPTIONAL_VARS = {
    'VOYAGE_API_KEY': 'Voyage AI API key (alternative embeddings)',
    'AZURE_OPENAI_REALTIME_DEPLOYMENT': 'Azure Realtime voice deployment',
};

console.log('\n🔍 Environment Validation\n');
console.log('='.repeat(60));

let missing = [];
let set = [];

for (const [key, description] of Object.entries(REQUIRED_VARS)) {
    const value = process.env[key];
    if (value) {
        const preview = value.length > 20 ? value.substring(0, 15) + '...' : value;
        set.push(`✅ ${key}: ${preview}`);
    } else {
        missing.push(`❌ ${key}: ${description}`);
    }
}

console.log('\n📋 Required Variables:\n');
set.forEach(s => console.log(s));
missing.forEach(m => console.log(m));

if (missing.length > 0) {
    console.log('\n⚠️  Missing required environment variables!');
    console.log('   Add them to backend/.env');
    process.exit(1);
} else {
    console.log('\n✅ All required variables are set!');
}

console.log('\n📋 Optional Variables:\n');
for (const [key, description] of Object.entries(OPTIONAL_VARS)) {
    const value = process.env[key];
    if (value) {
        console.log(`✅ ${key}: SET`);
    } else {
        console.log(`⚪ ${key}: Not set (${description})`);
    }
}

console.log('\n' + '='.repeat(60));
console.log('🚀 Ready to start server!\n');
