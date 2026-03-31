const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('🚀 Running user_profiles migration...\n');

    try {
        const sqlPath = path.join(__dirname, '../migrations/create-user-profiles.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');

        // Execute via Supabase client using postgres function if available, otherwise just use fetch to rest endpoint or let user know
        // Supabase-js doesn't have a direct raw SQL method unless 'exec' rpc is defined.
        console.log('Attempting to create table user_profiles via REST API (if rpc exec fails, we may need to run this manually via Supabase SQL Editor)');
        
        const statements = sql.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'));

        for (const stmt of statements) {
            console.log(`Executing: ${stmt.substring(0, 50)}...`);
            const { error } = await supabase.rpc('exec', { sql: stmt });
            if (error) {
                console.error('❌ Error executing statement. You may need to run the SQL manually in Supabase SQL Editor:');
                console.log(stmt + ';');
            } else {
                console.log('✅ Success');
            }
        }
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    }
}

runMigration();
