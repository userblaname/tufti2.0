/**
 * User Profile Manager - Persistent Memory Dossier
 * 
 * Maintains a structured profile for each user containing:
 * - Personal facts (name, location, identity)
 * - Important people (family, friends, relationships)
 * - Key life events with dates
 * - Current goals and streaks
 * - Emotional patterns and preferences
 * 
 * Auto-updated every ~50 messages by Claude.
 * Injected into every prompt so Tufti ALWAYS knows core facts.
 * 
 * This is the permanent memory layer — unlike conversation context
 * (which gets truncated) or search (which can miss things), the
 * dossier is always present and always correct.
 */

const { createClient } = require('@supabase/supabase-js');

class UserProfileManager {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.UPDATE_INTERVAL = 50; // Messages between dossier updates
        this.initialized = false;
    }

    /**
     * Ensure the user_profiles table exists
     */
    async ensureTable() {
        if (this.initialized) return;

        try {
            const { error } = await this.supabase
                .from('user_profiles')
                .select('user_id')
                .limit(1);

            if (!error || error.code !== 'PGRST116') {
                this.initialized = true;
                console.log('[UserProfile] Table ready');
                return;
            }

            console.log('[UserProfile] Table not found — run migration first');
        } catch (error) {
            console.error('[UserProfile] Init error:', error);
        }
    }

    /**
     * Get user's profile dossier
     */
    async getProfile(userId) {
        try {
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('[UserProfile] Fetch error:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('[UserProfile] Error:', error);
            return null;
        }
    }

    /**
     * Check if profile should be updated based on message count
     */
    shouldUpdate(journey) {
        if (!journey) return false;
        const count = journey.message_count || 0;
        return count > 0 && count % this.UPDATE_INTERVAL === 0;
    }

    /**
     * Safely extract text from message content
     */
    safeContent(content) {
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
            return content
                .filter(block => block.type === 'text')
                .map(block => block.text || '')
                .join(' ');
        }
        if (content && typeof content === 'object' && content.text) {
            return content.text;
        }
        return '[non-text content]';
    }

    /**
     * Extract/update profile dossier using Claude
     * Takes the existing profile + recent messages → produces updated profile
     */
    async extractProfile(existingProfile, messages, anthropicEndpoint, anthropicKey) {
        const existingJson = existingProfile?.dossier
            ? JSON.stringify(existingProfile.dossier, null, 2)
            : '{}';

        // Serialize recent messages (truncate long ones)
        const serialized = messages.map(m => {
            const text = this.safeContent(m.content);
            const truncated = text.length > 600 ? text.substring(0, 600) + '...' : text;
            return `${m.role}: ${truncated}`;
        }).join('\n\n');

        const extractionPrompt = `You are a memory extraction system. Your job is to maintain a structured profile dossier of a user based on their conversations.

EXISTING PROFILE (update, don't replace — ADD new info, correct wrong info):
${existingJson}

RECENT MESSAGES TO ANALYZE:
${serialized}

Extract and merge into a JSON profile with these EXACT keys:

{
  "identity": {
    "name": "user's name",
    "location": "where they live",
    "occupation": "what they do",
    "age": "if known",
    "languages": ["languages they speak"]
  },
  "people": {
    "person_name": {
      "relationship": "who they are to the user",
      "key_facts": ["important things about them"],
      "last_mentioned": "YYYY-MM-DD"
    }
  },
  "life_events": [
    {
      "date": "YYYY-MM-DD or approximate",
      "event": "what happened",
      "emotional_weight": "high/medium/low"
    }
  ],
  "current_state": {
    "streaks": {"streak_name": "count or description"},
    "goals": ["active goals"],
    "focus": "what they're currently working on",
    "emotional_state": "recent emotional tone"
  },
  "preferences": {
    "communication_style": "how they like to be spoken to",
    "topics_of_interest": ["topics they care about"],
    "nicknames": ["names they use or are called"]
  },
  "important_facts": [
    "any other critical facts that don't fit above categories"
  ]
}

RULES:
- MERGE with existing data, never delete unless explicitly contradicted
- Use exact dates when mentioned, otherwise approximate
- Keep entries concise — this is a reference document, not a narrative
- If something is already in the existing profile and still true, keep it
- Maximum 20 people entries, 30 life events, 10 goals
- Return ONLY the JSON object, nothing else`;

        try {
            console.log(`[UserProfile] Extracting profile from ${messages.length} messages (prompt ~${extractionPrompt.length} chars)`);

            const response = await fetch(anthropicEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-opus-4-5',
                    max_tokens: 4000,
                    messages: [{ role: 'user', content: extractionPrompt }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[UserProfile] API error ${response.status}:`, errorText.substring(0, 300));
                return null;
            }

            const data = await response.json();
            const content = data.content?.[0]?.text;

            if (!content) {
                console.error('[UserProfile] Empty response');
                return null;
            }

            // Parse JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log('[UserProfile] Successfully extracted profile dossier');
                return parsed;
            }

            console.error('[UserProfile] No JSON found:', content.substring(0, 200));
            return null;
        } catch (error) {
            console.error('[UserProfile] Extraction error:', error.message);
            return null;
        }
    }

    /**
     * Save/update profile in Supabase
     */
    async updateProfile(userId, dossier) {
        try {
            const { error } = await this.supabase
                .from('user_profiles')
                .upsert({
                    user_id: userId,
                    dossier: dossier,
                    updated_at: new Date().toISOString()
                });

            if (error) {
                console.error('[UserProfile] Update error:', error);
                return false;
            }

            console.log('[UserProfile] Profile updated for user:', userId.substring(0, 8));
            return true;
        } catch (error) {
            console.error('[UserProfile] Save error:', error);
            return false;
        }
    }

    /**
     * Format dossier for injection into system prompt
     */
    formatForPrompt(profile) {
        if (!profile?.dossier) return '';

        const d = profile.dossier;
        let prompt = `
═══════════════════════════════════════════════════════════════
📋 USER PROFILE DOSSIER — PERMANENT MEMORY
═══════════════════════════════════════════════════════════════

`;

        // Identity
        if (d.identity) {
            const id = d.identity;
            prompt += `IDENTITY:\n`;
            if (id.name) prompt += `  Name: ${id.name}\n`;
            if (id.location) prompt += `  Location: ${id.location}\n`;
            if (id.occupation) prompt += `  Occupation: ${id.occupation}\n`;
            if (id.languages?.length) prompt += `  Languages: ${id.languages.join(', ')}\n`;
            prompt += '\n';
        }

        // People
        if (d.people && Object.keys(d.people).length > 0) {
            prompt += `IMPORTANT PEOPLE:\n`;
            for (const [name, info] of Object.entries(d.people)) {
                const rel = typeof info === 'object' ? info.relationship : info;
                const facts = typeof info === 'object' && info.key_facts ? ` — ${info.key_facts.join('; ')}` : '';
                prompt += `  • ${name}: ${rel}${facts}\n`;
            }
            prompt += '\n';
        }

        // Life events (recent/important ones only)
        if (d.life_events?.length > 0) {
            const topEvents = d.life_events
                .filter(e => e.emotional_weight === 'high')
                .slice(-10);
            if (topEvents.length > 0) {
                prompt += `KEY LIFE EVENTS:\n`;
                for (const event of topEvents) {
                    prompt += `  • [${event.date || '?'}] ${event.event}\n`;
                }
                prompt += '\n';
            }
        }

        // Current state
        if (d.current_state) {
            const cs = d.current_state;
            if (cs.streaks && Object.keys(cs.streaks).length > 0) {
                prompt += `CURRENT STREAKS:\n`;
                for (const [name, val] of Object.entries(cs.streaks)) {
                    prompt += `  • ${name}: ${val}\n`;
                }
                prompt += '\n';
            }
            if (cs.goals?.length > 0) {
                prompt += `ACTIVE GOALS:\n`;
                cs.goals.forEach(g => prompt += `  • ${g}\n`);
                prompt += '\n';
            }
            if (cs.focus) {
                prompt += `CURRENT FOCUS: ${cs.focus}\n\n`;
            }
        }

        // Important facts
        if (d.important_facts?.length > 0) {
            prompt += `IMPORTANT FACTS:\n`;
            d.important_facts.forEach(f => prompt += `  • ${f}\n`);
            prompt += '\n';
        }

        prompt += `═══════════════════════════════════════════════════════════════
CRITICAL: These are verified facts about this user. NEVER contradict
them. If the user asks about any person or event listed here, you
KNOW the answer — do NOT say "I don't know" or "I don't remember."
═══════════════════════════════════════════════════════════════`;

        return prompt;
    }
}

module.exports = UserProfileManager;
