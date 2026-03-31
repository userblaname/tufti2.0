-- Memory Architecture Migration
-- Week 1, Day 1: Foundation Tables
-- Run this in Supabase SQL Editor

-- 1. Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Memory Embeddings Table
-- Stores vectorized message content for semantic retrieval
CREATE TABLE IF NOT EXISTS memory_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    embedding vector(3072), -- Azure text-embedding-3-large dimensions
    importance_score FLOAT DEFAULT 0.5, -- 0.0-1.0, higher = more important
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast similarity search
CREATE INDEX IF NOT EXISTS memory_embeddings_embedding_idx 
ON memory_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for user filtering
CREATE INDEX IF NOT EXISTS memory_embeddings_user_id_idx 
ON memory_embeddings(user_id);

-- 3. User Facts Table (Structured Knowledge Graph)
-- Stores extracted entities and relationships
CREATE TABLE IF NOT EXISTS user_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fact_type TEXT NOT NULL CHECK (fact_type IN ('person', 'place', 'event', 'preference', 'relationship', 'goal')),
    subject TEXT NOT NULL,          -- e.g., "NAAFRI"
    predicate TEXT NOT NULL,        -- e.g., "is_cousin_of"
    object TEXT NOT NULL,           -- e.g., "user"
    confidence FLOAT DEFAULT 1.0,   -- 0.0-1.0
    source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    last_referenced_at TIMESTAMPTZ DEFAULT NOW(),
    reference_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fact retrieval
CREATE INDEX IF NOT EXISTS user_facts_user_id_idx ON user_facts(user_id);
CREATE INDEX IF NOT EXISTS user_facts_subject_idx ON user_facts(subject);
CREATE INDEX IF NOT EXISTS user_facts_fact_type_idx ON user_facts(fact_type);

-- 4. Memory Sessions Table
-- Tracks conversation sessions and their summaries
CREATE TABLE IF NOT EXISTS memory_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    session_start TIMESTAMPTZ NOT NULL,
    session_end TIMESTAMPTZ,
    message_count INT DEFAULT 0,
    summary TEXT,
    key_topics TEXT[], -- Array of main topics discussed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS memory_sessions_user_id_idx ON memory_sessions(user_id);
CREATE INDEX IF NOT EXISTS memory_sessions_conversation_id_idx ON memory_sessions(conversation_id);

-- 5. Memory Health Table
-- Tracks memory system health for monitoring
CREATE TABLE IF NOT EXISTS memory_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_type TEXT NOT NULL CHECK (check_type IN ('embedding', 'retrieval', 'fact_extraction', 'database')),
    status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'failed')),
    details JSONB,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies (Row Level Security)
ALTER TABLE memory_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own memories
CREATE POLICY "Users can view own embeddings" ON memory_embeddings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own embeddings" ON memory_embeddings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own facts" ON user_facts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own facts" ON user_facts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" ON memory_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON memory_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role bypass for backend operations
CREATE POLICY "Service role full access embeddings" ON memory_embeddings
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access facts" ON user_facts
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access sessions" ON memory_sessions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Helper function for semantic search
CREATE OR REPLACE FUNCTION search_memories(
    query_embedding vector(3072),
    match_user_id UUID,
    match_count INT DEFAULT 10,
    match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity FLOAT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        me.id,
        me.content,
        1 - (me.embedding <=> query_embedding) AS similarity,
        me.created_at
    FROM memory_embeddings me
    WHERE me.user_id = match_user_id
    AND 1 - (me.embedding <=> query_embedding) > match_threshold
    ORDER BY me.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Success message
SELECT 'Memory Architecture tables created successfully!' AS status;
