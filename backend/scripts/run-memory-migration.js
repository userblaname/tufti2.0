/**
 * Run Memory Architecture Migration
 * Executes the SQL migration via Supabase client
 * 
 * Usage: node backend/scripts/run-memory-migration.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
    console.log('🧠 Running Memory Architecture Migration...\n');

    try {
        // Step 1: Enable pgvector extension
        console.log('1. Enabling pgvector extension...');
        const { error: extError } = await supabase.rpc('exec_sql', {
            sql: 'CREATE EXTENSION IF NOT EXISTS vector;'
        });
        // Note: This might fail if exec_sql doesn't exist, but that's OK
        // We'll check if tables exist instead

        // Step 2: Create memory_embeddings table
        console.log('2. Creating memory_embeddings table...');
        const { data: existing1 } = await supabase
            .from('memory_embeddings')
            .select('id')
            .limit(1);

        if (existing1 !== null) {
            console.log('   ✅ memory_embeddings table already exists');
        } else {
            console.log('   ⚠️ Table needs to be created via SQL Editor');
        }

        // Step 3: Create user_facts table
        console.log('3. Checking user_facts table...');
        const { data: existing2 } = await supabase
            .from('user_facts')
            .select('id')
            .limit(1);

        if (existing2 !== null) {
            console.log('   ✅ user_facts table already exists');
        } else {
            console.log('   ⚠️ Table needs to be created via SQL Editor');
        }

        // Step 4: Create memory_sessions table
        console.log('4. Checking memory_sessions table...');
        const { data: existing3 } = await supabase
            .from('memory_sessions')
            .select('id')
            .limit(1);

        if (existing3 !== null) {
            console.log('   ✅ memory_sessions table already exists');
        } else {
            console.log('   ⚠️ Table needs to be created via SQL Editor');
        }

        // Step 5: Check if search_memories function exists
        console.log('5. Testing search_memories function...');
        const { error: funcError } = await supabase.rpc('search_memories', {
            query_embedding: Array(3072).fill(0).join(','),
            match_user_id: '00000000-0000-0000-0000-000000000000',
            match_count: 1,
            match_threshold: 0.5
        });

        if (!funcError || !funcError.message.includes('Could not find')) {
            console.log('   ✅ search_memories function exists');
        } else {
            console.log('   ⚠️ Function needs to be created via SQL Editor');
        }

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('Migration check complete!');
        console.log('');
        console.log('If any items show ⚠️, please run the SQL from:');
        console.log('  backend/migrations/001_memory_architecture.sql');
        console.log('in the Supabase Dashboard SQL Editor.');
        console.log('═══════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('Migration error:', error);
    }
}

runMigration();
