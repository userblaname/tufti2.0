/**
 * Journey Manager - Rolling Summary System
 * 
 * Manages user journey summaries in Supabase
 * Auto-summarizes every 20 messages
 */

const { createClient } = require('@supabase/supabase-js');

class JourneyManager {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.UPDATE_INTERVAL = 20; // Messages between updates
        this.initialized = false;
    }

    /**
     * Ensure table exists (auto-create if needed)
     */
    async ensureTable() {
        if (this.initialized) return;

        try {
            // Try to select from table
            const { error } = await this.supabase
                .from('user_journey')
                .select('user_id')
                .limit(1);

            if (!error || error.code !== 'PGRST116') {
                // Table exists or other error
                this.initialized = true;
                console.log('[JourneyManager] Table ready');
                return;
            }

            console.log('[JourneyManager] Table not found, cannot auto-create via API');
            console.log('[JourneyManager] Please run: node backend/run-migration.js');
        } catch (error) {
            console.error('[JourneyManager] Init error:', error);
        }
    }

    /**
     * Get user's current journey from Supabase
     */
    async getJourney(userId) {
        try {
            const { data, error } = await this.supabase
                .from('user_journey')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = not found
                console.error('[JourneyManager] Error fetching journey:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('[JourneyManager] Error:', error);
            return null;
        }
    }

    /**
     * Check if journey should be updated based on message count
     */
    shouldUpdate(messageCount) {
        return messageCount > 0 && messageCount % this.UPDATE_INTERVAL === 0;
    }

    /**
     * Increment message count for user
     */
    async incrementMessageCount(userId) {
        try {
            // Try to increment existing record
            const { data: existing } = await this.supabase
                .from('user_journey')
                .select('message_count')
                .eq('user_id', userId)
                .single();

            if (existing) {
                const newCount = (existing.message_count || 0) + 1;
                await this.supabase
                    .from('user_journey')
                    .update({ message_count: newCount })
                    .eq('user_id', userId);
                return newCount;
            } else {
                // Create new record
                await this.supabase
                    .from('user_journey')
                    .insert({ user_id: userId, message_count: 1 });
                return 1;
            }
        } catch (error) {
            console.error('[JourneyManager] Error incrementing count:', error);
            return 0;
        }
    }

    /**
     * Extract journey summary from conversation using Claude
     */
    async extractJourney(messages, anthropicEndpoint, anthropicKey) {
        const extractionPrompt = `You are analyzing a user's Reality Transurfing journey.
Review their recent conversation messages and extract:

1. SUMMARY: A 2-3 sentence narrative of their journey so far
2. STRUGGLES: Array of current challenges (max 3)
3. BREAKTHROUGHS: Array of "aha moments" or realizations (max 3)
4. CURRENT_FOCUS: What they're actively working on (1 sentence)

Recent messages:
${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}

Return ONLY a JSON object in this exact format:
{
  "summary": "...",
  "struggles": ["...", "..."],
  "breakthroughs": ["...", "..."],
  "current_focus": "..."
}`;

        try {
            const response = await fetch(anthropicEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-opus-4-5',
                    max_tokens: 500,
                    messages: [{ role: 'user', content: extractionPrompt }]
                })
            });

            const data = await response.json();
            const content = data.content[0].text;

            // Parse JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            throw new Error('Failed to extract JSON from response');
        } catch (error) {
            console.error('[JourneyManager] Extraction error:', error);
            return null;
        }
    }

    /**
     * Update user journey in Supabase
     */
    async updateJourney(userId, extractedData) {
        try {
            const { error } = await this.supabase
                .from('user_journey')
                .upsert({
                    user_id: userId,
                    summary: extractedData.summary,
                    struggles: extractedData.struggles,
                    breakthroughs: extractedData.breakthroughs,
                    current_focus: extractedData.current_focus,
                    updated_at: new Date().toISOString()
                });

            if (error) {
                console.error('[JourneyManager] Update error:', error);
                return false;
            }

            console.log('[JourneyManager] Journey updated for user:', userId);
            return true;
        } catch (error) {
            console.error('[JourneyManager] Error:', error);
            return false;
        }
    }

    /**
     * Format journey for injection into system prompt
     */
    formatJourneyForPrompt(journey) {
        if (!journey || !journey.summary) {
            return '';
        }

        const struggles = Array.isArray(journey.struggles) ? journey.struggles : [];
        const breakthroughs = Array.isArray(journey.breakthroughs) ? journey.breakthroughs : [];

        return `
═══════════════════════════════════════════════════════════════
🧠 TUFTI'S MEMORY OF THIS SOUL
═══════════════════════════════════════════════════════════════

JOURNEY SO FAR:
${journey.summary}

${struggles.length > 0 ? `CURRENT STRUGGLES:
${struggles.map(s => `• ${s}`).join('\n')}
` : ''}
${breakthroughs.length > 0 ? `BREAKTHROUGHS:
${breakthroughs.map(b => `• ${b}`).join('\n')}
` : ''}
${journey.current_focus ? `CURRENT FOCUS:
${journey.current_focus}
` : ''}
═══════════════════════════════════════════════════════════════
Use this context to personalize your guidance. Reference past
breakthroughs when relevant. Be aware of ongoing struggles.
═══════════════════════════════════════════════════════════════`;
    }
}

module.exports = JourneyManager;
