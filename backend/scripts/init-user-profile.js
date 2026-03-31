const { createClient } = require('@supabase/supabase-js');
const UserProfileManager = require('../lib/user-profile');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const anthropicEndpoint = process.env.ANTHROPIC_ENDPOINT;

if (!supabaseUrl || !supabaseKey || !anthropicKey) {
    console.error('❌ Missing environment variables in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const userProfileManager = new UserProfileManager(supabaseUrl, supabaseKey);

const TEST_USER_ID = 'ed008933-74a5-43ac-b128-7b0121413d0f';
const CONV_ID = '53f2861c-f422-4817-9298-7ede553b9073';

async function generateFirstProfile() {
    console.log('🚀 Generating initial User Profile Dossier...\n');

    try {
        // Fetch last 200 messages for rich context
        console.log('Fetching recent conversation history...');
        const { data: dbMessages, error } = await supabase
            .from('messages')
            .select('role, text')
            .eq('conversation_id', CONV_ID)
            .in('role', ['user', 'tufti', 'assistant'])
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) throw error;
        
        // Map database fields to the format expected by the profiler
        const messages = dbMessages.map(m => ({
            role: m.role,
            content: m.text
        }));
        
        // Reverse to maintain chronological order
        messages.reverse();

        console.log(`Found ${messages.length} messages. Extracting profile (this may take 10-20 seconds)...`);
        
        const existingProfile = null; // Fresh start

        const profile = await userProfileManager.extractProfile(
            existingProfile,
            messages,
            anthropicEndpoint,
            anthropicKey
        );

        if (!profile) {
            console.error('❌ Failed to extract profile from Claude');
            return;
        }

        console.log('\n✅ Extraction complete! Here is the dossier:');
        console.log(JSON.stringify(profile, null, 2));

        console.log('\nSaving to Supabase...');
        const success = await userProfileManager.updateProfile(TEST_USER_ID, profile);

        if (success) {
            console.log('\n🟢 Dossier perfectly saved and active in permanent memory.');
        } else {
            console.error('\n🔴 Failed to save dossier to Supabase.');
        }

    } catch (error) {
        console.error('❌ Script failed:', error.message);
    }
}

generateFirstProfile();
