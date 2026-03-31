-- Migration: Create search_memories vector similarity function
-- This function was missing from the schema, causing ALL semantic memory search to fail.
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Ensure the memory_embeddings table exists with the right schema
CREATE TABLE IF NOT EXISTS memory_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    message_id UUID,
    content TEXT NOT NULL,
    embedding vector(3072),
    importance_score FLOAT DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast vector similarity search
CREATE INDEX IF NOT EXISTS memory_embeddings_embedding_idx 
ON memory_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS memory_embeddings_user_id_idx 
ON memory_embeddings (user_id);

-- THE CRITICAL MISSING FUNCTION
-- This is the RPC function that memory-embeddings.js calls via supabase.rpc('search_memories', ...)
CREATE OR REPLACE FUNCTION public.search_memories(
    query_embedding vector(3072),
    match_user_id UUID,
    match_count INT DEFAULT 15,
    match_threshold FLOAT DEFAULT 0.40
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    created_at TIMESTAMPTZ,
    importance_score FLOAT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        me.id,
        me.content,
        me.created_at,
        me.importance_score,
        1 - (me.embedding <=> query_embedding) AS similarity
    FROM memory_embeddings me
    WHERE
        me.user_id = match_user_id
        AND 1 - (me.embedding <=> query_embedding) > match_threshold
    ORDER BY me.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant access to authenticated and service role
GRANT EXECUTE ON FUNCTION public.search_memories TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_memories TO service_role;

-- Verify it was created
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name = 'search_memories';
