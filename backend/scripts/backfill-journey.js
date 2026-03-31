require('dotenv').config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');
const JourneyManager = require('../lib/journey-manager');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const anthropicEndpoint = process.env.ANTHROPIC_ENDPOINT;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

if (!supabaseUrl || !supabaseKey || !anthropicEndpoint || !anthropicKey) {
    console.error('Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const jm = new JourneyManager(supabaseUrl, supabaseKey);

const USER_ID = 'ed008933-74a5-43ac-b128-7b0121413d0f';
const START_DATE = '2026-02-15T00:00:00.000Z';
const LIMIT = 200;

async function run() {
    try {
        console.log(`[Backfill] Fetching top ${LIMIT} most important messages since ${START_DATE}...`);
        
        // 1. Fetch top N most important messages
        const { data: topMessages, error } = await supabase
            .from('memory_embeddings')
            .select('content, created_at, importance_score')
            .eq('user_id', USER_ID)
            .gte('created_at', START_DATE)
            .order('importance_score', { ascending: false })
            .limit(LIMIT);
            
        if (error) throw error;
        
        console.log(`[Backfill] Fetched ${topMessages.length} messages. Importance thresholds: max=${topMessages[0]?.importance_score}, min=${topMessages[topMessages.length-1]?.importance_score}`);
        
        // 2. Sort them chronologically so the AI reads the story in the correct order
        topMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        // Format for extraction
        const chatMessages = topMessages.map(m => ({
            role: m.role || 'user', // Default to user if null
            content: m.content
        }));
        
        console.log('[Backfill] Running extraction through JourneyManager (this may take 15-30 seconds)...');
        
        // 3. Run extraction
        const extractedJourney = await jm.extractJourney(chatMessages, anthropicEndpoint, anthropicKey);
        
        if (!extractedJourney) {
            throw new Error('Extraction returned null. Check logs for API errors.');
        }
        
        console.log('\n=============================================');
        console.log('✨ EXTRACTED MASTER JOURNEY SUMMARY');
        console.log('=============================================');
        console.log(JSON.stringify(extractedJourney, null, 2));
        console.log('=============================================\n');
        
        // 4. Update the database
        console.log('[Backfill] Saving to database...');
        const success = await jm.updateJourney(USER_ID, extractedJourney);
        
        if (success) {
            console.log('✅ Backfill Complete! Tufti is now fully up to date on your last month.');
        } else {
            console.error('❌ Failed to save to Supabase.');
        }
        
    } catch (error) {
        console.error('Fatal Error:', error);
    }
}

run();
