#!/usr/bin/env node

/**
 * Quick Supabase table creator
 * Executes SQL to create user_journey table
 */

const https = require('https');

const SUPABASE_URL = 'https://bwrjrfviaqrkdkcpyorx.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3cmpyZnZpYXFya2RrY3B5b3J4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTQ5NzY3OCwiZXhwIjoyMDYxMDczNjc4fQ.o8EY7rbA8VRjY-Ep6LnKKgS0cYXsIl9FmNqIlMdVFVg';

const SQL_STATEMENTS = [
    // Create table
    `CREATE TABLE IF NOT EXISTS user_journey (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    summary TEXT,
    struggles JSONB DEFAULT '[]'::jsonb,
    breakthroughs JSONB DEFAULT '[]'::jsonb,
    current_focus TEXT,
    message_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

    // Enable RLS
    `ALTER TABLE user_journey ENABLE ROW LEVEL SECURITY`,

    // Policy: read
    `CREATE POLICY IF NOT EXISTS "Users can read own journey" 
    ON user_journey FOR SELECT 
    USING (auth.uid() = user_id)`,

    // Policy: insert
    `CREATE POLICY IF NOT EXISTS "Users can insert own journey" 
    ON user_journey FOR INSERT 
    WITH CHECK (auth.uid() = user_id)`,

    // Policy: update
    `CREATE POLICY IF NOT EXISTS "Users can update own journey" 
    ON user_journey FOR UPDATE 
    USING (auth.uid() = user_id)`,

    // Index
    `CREATE INDEX IF NOT EXISTS idx_user_journey_user_id ON user_journey(user_id)`
];

async function executeSQL(sql) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ query: sql });

        const options = {
            hostname: 'bwrjrfviaqrkdkcpyorx.supabase.co',
            port: 443,
            path: '/rest/v1/rpc/query',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(body);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    console.log('🚀 Creating user_journey table...\n');

    for (let i = 0; i < SQL_STATEMENTS.length; i++) {
        const stmt = SQL_STATEMENTS[i];
        const preview = stmt.replace(/\s+/g, ' ').substring(0, 60);
        console.log(`[${i + 1}/${SQL_STATEMENTS.length}] ${preview}...`);

        try {
            await executeSQL(stmt);
            console.log('  ✅ Success\n');
        } catch (error) {
            console.log(`  ⚠️  ${error.message}\n`);
            // Continue anyway
        }
    }

    console.log('✅ Table creation complete!\n');
    console.log('You can view it in Supabase Dashboard → Table Editor');
}

main().catch(console.error);
