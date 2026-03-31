/**
 * One-time script to extract journey summary from recent messages
 * Uses JourneyManager's extractJourney + Claude to analyze the user's journey
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const JourneyManager = require('../lib/journey-manager');

const USER_ID = 'ed008933-74a5-43ac-b128-7b0121413d0f';

async function run() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const journeyManager = new JourneyManager(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    console.log('📚 Fetching recent messages for journey extraction...');

    // Fetch last 100 messages (mix of user and tufti) to give Claude good context
    const { data: messages, error } = await supabase
        .from('messages')
        .select('role, text, created_at')
        .eq('user_id', USER_ID)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error('❌ Failed to fetch messages:', error.message);
        process.exit(1);
    }

    console.log(`✅ Fetched ${messages.length} messages`);

    // Reverse to chronological order, format for extraction
    const formatted = messages.reverse().map(m => ({
        role: m.role === 'tufti' ? 'assistant' : m.role,
        // Truncate long messages to keep within limits
        content: (m.text || '').substring(0, 500)
    }));

    console.log('🧠 Calling Claude to extract journey summary...');
    const extracted = await journeyManager.extractJourney(
        formatted,
        process.env.ANTHROPIC_ENDPOINT,
        process.env.ANTHROPIC_API_KEY
    );

    if (!extracted) {
        console.error('❌ Extraction failed');
        process.exit(1);
    }

    console.log('\n📋 Extracted Journey:');
    console.log('Summary:', extracted.summary);
    console.log('Struggles:', extracted.struggles);
    console.log('Breakthroughs:', extracted.breakthroughs);
    console.log('Current Focus:', extracted.current_focus);

    console.log('\n💾 Saving to Supabase...');
    const success = await journeyManager.updateJourney(USER_ID, extracted);

    if (success) {
        console.log('✅ Journey summary saved successfully!');
    } else {
        console.error('❌ Failed to save journey');
    }

    process.exit(0);
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
