-- Create user_journey table for Rolling Journey Summary
-- This stores a compressed summary of each user's Transurfing journey

CREATE TABLE user_journey (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT,                      -- Overall journey narrative
  struggles JSONB DEFAULT '[]',      -- Array of current struggles
  breakthroughs JSONB DEFAULT '[]',  -- Array of breakthroughs
  current_focus TEXT,                -- What they're working on now
  message_count INTEGER DEFAULT 0,   -- Track for triggering updates
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_journey ENABLE ROW LEVEL SECURITY;

-- Users can read own journey
CREATE POLICY "Users can read own journey" 
  ON user_journey 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert own journey
CREATE POLICY "Users can insert own journey" 
  ON user_journey 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update own journey
CREATE POLICY "Users can update own journey" 
  ON user_journey 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_user_journey_user_id ON user_journey(user_id);
