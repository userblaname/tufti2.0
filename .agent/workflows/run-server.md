---
description: How to run the local development servers for the Tufti Reality Film project
---

# Run Server Workflow

This workflow starts both the **backend** (Node.js Express server) and the **frontend** (Vite React dev server).

## Prerequisites

Environment files must exist:
- `backend/.env` - Contains all backend config (Anthropic, Pinecone, Azure)
- `.env.local` - Contains frontend config (Supabase)

## Steps

1. Kill any existing server processes:
```bash
pkill -f "node.*server" 2>/dev/null; pkill -f "vite" 2>/dev/null; lsof -ti :3001 | xargs kill -9 2>/dev/null; lsof -ti :5173 | xargs kill -9 2>/dev/null
```

// turbo
2. Start the backend server from the backend directory (IMPORTANT: must cd to backend folder):
```bash
cd /Users/nobody1/Downloads/project\ 18/backend && node server.js &
```

// turbo
3. Start the frontend dev server:
```bash
cd /Users/nobody1/Downloads/project\ 18 && npm run dev &
```

// turbo
4. Verify both servers are running with RAG initialized:
```bash
sleep 3 && lsof -i :3001 && lsof -i :5173 && echo "Servers running!"
```

5. Open the application in browser: [http://localhost:5173/](http://localhost:5173/)

## Critical Configuration Notes

### Backend (`backend/.env`) MUST contain:
```
# Anthropic (Claude)
ANTHROPIC_ENDPOINT=...
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-opus-4-5

# RAG - Pinecone (Vector DB)
PINECONE_API_KEY=...
PINECONE_INDEX=tufti-knowledge

# Azure Embeddings
AZURE_EMBEDDING_ENDPOINT=...
AZURE_EMBEDDING_KEY=...
AZURE_EMBEDDING_DEPLOYMENT=text-embedding-3-large-2

# Azure TTS
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=swedencentral
```

### Frontend (`.env.local`) MUST contain:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Troubleshooting

**RAG not initializing?**
- Ensure you run backend from `backend/` directory: `cd backend && node server.js`
- Check `backend/.env` has all Pinecone/Azure config
- The dotenv loads from `__dirname` (backend folder)

**Frontend can't connect to backend?**
- Backend must be on port 3001
- Check CORS is enabled in server.js
