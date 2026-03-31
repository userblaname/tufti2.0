/**
 * Backfill User Profile Dossiers
 *
 * Reads recent messages from Supabase for each user and generates
 * a condensed profile dossier using Claude. Run this once to bootstrap
 * profiles for existing users.
 *
 * Usage: cd backend && node scripts/backfill-profiles.js
 */

const path = require('path');
// Try local .env first, fall back to main project .env
const localEnv = path.join(__dirname, '..', '.env');
const mainEnv = path.resolve(__dirname, '..', '..', '..', '..', '..', 'backend', '.env');
const fs = require('fs');
const envPath = fs.existsSync(localEnv) ? localEnv : mainEnv;
require('dotenv').config({ path: envPath });
const ProfileManager = require('../lib/profile-manager');

const profileManager = new ProfileManager(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function backfill() {
    console.log('=== Profile Dossier Backfill ===\n');

    // Get all users who have conversations
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data: conversations } = await supabase
        .from('conversations')
        .select('user_id')
        .is('archived_at', null)
        .is('deleted_at', null);

    if (!conversations || conversations.length === 0) {
        console.log('No conversations found.');
        return;
    }

    // Get unique user IDs
    const userIds = [...new Set(conversations.map(c => c.user_id))];
    console.log(`Found ${userIds.length} users with active conversations.\n`);

    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (const userId of userIds) {
        // Check if profile already exists
        const existing = await profileManager.getProfile(userId);
        if (existing && existing.dossier_text && existing.dossier_text.length > 50) {
            console.log(`[SKIP] ${userId.substring(0, 8)}... — already has profile (${existing.dossier_text.length} chars)`);
            skipped++;
            continue;
        }

        console.log(`[PROCESSING] ${userId.substring(0, 8)}...`);

        // Fetch recent messages
        const messages = await profileManager.fetchRecentMessages(userId, 100);
        if (messages.length < 5) {
            console.log(`  → Too few messages (${messages.length}), skipping`);
            skipped++;
            continue;
        }

        console.log(`  → Found ${messages.length} messages, extracting profile...`);

        // Extract profile
        const dossier = await profileManager.extractProfile(
            null,
            messages,
            process.env.ANTHROPIC_ENDPOINT,
            process.env.ANTHROPIC_API_KEY
        );

        if (dossier) {
            // Get message count from journey if available
            const { data: journey } = await supabase
                .from('user_journey')
                .select('message_count')
                .eq('user_id', userId)
                .single();

            const msgCount = journey?.message_count || messages.length;

            await profileManager.saveProfile(userId, dossier, msgCount);
            console.log(`  → ✅ Profile saved (${dossier.length} chars)`);
            success++;
        } else {
            console.log(`  → ❌ Extraction failed`);
            failed++;
        }

        // Rate limit: wait 2s between API calls
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log(`\n=== Backfill Complete ===`);
    console.log(`✅ Success: ${success}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
}

backfill().catch(console.error);
