/**
 * Profile Manager - User Dossier System
 *
 * Maintains a condensed text profile per user containing key facts
 * (name, family, relationships, life events, goals, preferences).
 * Injected into every prompt so Tufti always knows core facts
 * without needing to search or fit everything in the context window.
 *
 * Auto-updates every 50 messages by reading recent conversation
 * and merging new facts into the existing dossier.
 */

const { createClient } = require('@supabase/supabase-js');

class ProfileManager {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.UPDATE_INTERVAL = 50; // Messages between dossier updates
    }

    /**
     * Get user's current profile dossier
     */
    async getProfile(userId) {
        try {
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('[ProfileManager] Error fetching profile:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('[ProfileManager] Error:', error);
            return null;
        }
    }

    /**
     * Check if profile should be updated based on journey message count
     */
    shouldUpdate(messageCount, lastBackfillCount) {
        const messagesSinceBackfill = messageCount - (lastBackfillCount || 0);
        return messagesSinceBackfill >= this.UPDATE_INTERVAL;
    }

    /**
     * Fetch recent messages from the messages table for a user
     */
    async fetchRecentMessages(userId, limit = 80) {
        try {
            // Get user's conversation
            const { data: convos } = await this.supabase
                .from('conversations')
                .select('id')
                .eq('user_id', userId)
                .is('archived_at', null)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(1);

            if (!convos || convos.length === 0) return [];

            const { data: messages, error } = await this.supabase
                .from('messages')
                .select('role, text, created_at')
                .eq('conversation_id', convos[0].id)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('[ProfileManager] Error fetching messages:', error);
                return [];
            }

            // Return in chronological order, filter out empty
            return (messages || [])
                .reverse()
                .filter(m => m.text && m.text.length > 10)
                .map(m => ({
                    role: m.role === 'tufti' ? 'assistant' : m.role,
                    content: typeof m.text === 'string' ? m.text.substring(0, 500) : ''
                }));
        } catch (error) {
            console.error('[ProfileManager] fetchRecentMessages error:', error);
            return [];
        }
    }

    /**
     * Extract/update profile dossier from conversation using Claude
     */
    async extractProfile(existingDossier, recentMessages, anthropicEndpoint, anthropicKey) {
        const messagesText = recentMessages
            .map(m => `${m.role}: ${m.content}`)
            .join('\n\n');

        const extractionPrompt = `You are building a persistent memory dossier for an AI assistant called Tufti.

${existingDossier ? `EXISTING DOSSIER (update and expand, never delete confirmed facts):\n${existingDossier}\n\n` : ''}RECENT CONVERSATION MESSAGES:\n${messagesText}

Extract ALL personal facts about the user from these messages and merge with the existing dossier.

Write a concise dossier (max 1500 chars) covering these categories. Only include categories where you have actual information:

**IDENTITY**: Name, nicknames, location, language, age, birthday
**FAMILY**: Parents (alive/deceased), siblings, children, spouse
**KEY PEOPLE**: Friends, mentors, romantic interests — name + relationship + key context
**LIFE EVENTS**: Major events with approximate dates (deaths, moves, breakthroughs, milestones)
**DAILY LIFE**: Work, habits, routines, spiritual practices, diet
**GOALS & DREAMS**: What they're building, aiming for, their target slide
**TRANSURFING LEVEL**: How advanced they are, what concepts they practice, streaks

Rules:
- Be factual, not poetic. Write like a CRM entry, not a story.
- Use bullet points. Keep each fact to one line.
- Include dates when known (e.g., "Father passed away - mentioned Jan 6")
- Never invent facts. If unsure, don't include it.
- Merge new facts with existing ones. Never remove confirmed facts.
- If a fact contradicts an existing one, keep both with a note.

Return ONLY the dossier text, no JSON wrapper, no explanation.`;

        try {
            const response = await fetch(anthropicEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-5',
                    max_tokens: 1000,
                    messages: [{ role: 'user', content: extractionPrompt }]
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error('[ProfileManager] API error:', response.status, errText.substring(0, 200));
                return null;
            }

            const data = await response.json();
            const content = data.content?.[0]?.text;

            if (!content || content.length < 20) {
                console.error('[ProfileManager] Empty or too short response');
                return null;
            }

            return content.trim();
        } catch (error) {
            console.error('[ProfileManager] Extraction error:', error);
            return null;
        }
    }

    /**
     * Save updated profile to Supabase
     */
    async saveProfile(userId, dossierText, messageCount) {
        try {
            const { error } = await this.supabase
                .from('user_profiles')
                .upsert({
                    user_id: userId,
                    dossier_text: dossierText,
                    last_backfill_message_count: messageCount,
                    version: 1,
                    updated_at: new Date().toISOString()
                });

            if (error) {
                console.error('[ProfileManager] Save error:', error);
                return false;
            }

            console.log('[ProfileManager] Profile saved for user:', userId.substring(0, 8));
            return true;
        } catch (error) {
            console.error('[ProfileManager] Error:', error);
            return false;
        }
    }

    /**
     * Format profile dossier for injection into system prompt
     */
    formatProfileForPrompt(profile) {
        if (!profile || !profile.dossier_text) {
            return '';
        }

        return `

═══════════════════════════════════════════════════════════════
📋 PERMANENT MEMORY — WHAT YOU KNOW ABOUT THIS PERSON
═══════════════════════════════════════════════════════════════

${profile.dossier_text}

═══════════════════════════════════════════════════════════════
CRITICAL: These are CONFIRMED facts. Never contradict them.
Never say "I don't know" about information listed above.
If the user asks about something here, reference it naturally.
═══════════════════════════════════════════════════════════════`;
    }
}

module.exports = ProfileManager;
