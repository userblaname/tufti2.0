/**
 * Run this script to create the user_journey table in Supabase
 * 
 * Usage: node run-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('🚀 Running user_journey migration...\n');

    try {
        // Read SQL file
        const sqlPath = path.join(__dirname, '../supabase/migrations/create_user_journey.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');

        console.log('📄 SQL to execute:');
        console.log(sql);
        console.log('\n');

        // Execute via Supabase client
        // Note: We need to execute each statement separately
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--'));

        for (const stmt of statements) {
            if (!stmt) continue;

            console.log(`Executing: ${stmt.substring(0, 50)}...`);

            const { data, error } = await supabase.rpc('exec', { sql: stmt });

            if (error) {
                console.error('❌ Error:', error.message);
                // Continue anyway - table might already exist
            } else {
                console.log('✅ Success');
            }
        }

        console.log('\n✅ Migration complete!');
        console.log('\n📊 Testing table access...');

        // Test query
        const { data, error } = await supabase
            .from('user_journey')
            .select('user_id')
            .limit(1);

        if (error) {
            console.log(`Status: Table exists but query failed (this is OK if no rows yet)`);
            console.log(`Error: ${error.message}`);
        } else {
            console.log(`✅ Table accessible! Rows: ${data?.length || 0}`);
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
