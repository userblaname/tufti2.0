/**
 * Memory Embeddings Service
 * Week 1, Day 2: Semantic Retrieval Layer
 * 
 * Handles:
 * - Embedding messages using Azure text-embedding-3-large
 * - Storing embeddings in Supabase pgvector
 * - Semantic search for relevant context
 */

const { createClient } = require('@supabase/supabase-js');

class MemoryEmbeddings {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        this.embeddingEndpoint = process.env.AZURE_EMBEDDING_ENDPOINT;
        this.embeddingKey = process.env.AZURE_EMBEDDING_KEY;
        this.embeddingDeployment = process.env.AZURE_EMBEDDING_DEPLOYMENT || 'text-embedding-3-large-2';

        // Embedding dimensions for text-embedding-3-large
        this.dimensions = 3072;

        // Batch settings
        this.maxBatchSize = 20;

        console.log('[MemoryEmbeddings] Initialized');
    }

    /**
     * Generate embedding for text using Azure OpenAI
     */
    async embed(text) {
        if (!text || text.trim().length === 0) {
            throw new Error('Cannot embed empty text');
        }

        // Truncate if too long (max ~8000 tokens for embedding model)
        const maxChars = 30000;
        const truncatedText = text.length > maxChars
            ? text.substring(0, maxChars) + '...[truncated]'
            : text;

        try {
            const url = `${this.embeddingEndpoint}/openai/deployments/${this.embeddingDeployment}/embeddings?api-version=2024-02-01`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': this.embeddingKey
                },
                body: JSON.stringify({
                    input: truncatedText,
                    dimensions: this.dimensions
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Embedding API error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            return data.data[0].embedding;
        } catch (error) {
            console.error('[MemoryEmbeddings] Embed error:', error);
            throw error;
        }
    }

    /**
     * Store a message with its embedding
     */
    async storeMessage(userId, messageId, content, importance = 0.5) {
        try {
            // Generate embedding
            const embedding = await this.embed(content);

            // Format embedding for pgvector (array to string)
            const embeddingString = `[${embedding.join(',')}]`;

            // Insert into database
            const { data, error } = await this.supabase
                .from('memory_embeddings')
                .insert({
                    user_id: userId,
                    message_id: messageId,
                    content: content,
                    embedding: embeddingString,
                    importance_score: importance
                })
                .select('id')
                .single();

            if (error) {
                throw new Error(`Store error: ${error.message}`);
            }

            console.log('[MemoryEmbeddings] Stored message:', data.id);
            return data.id;
        } catch (error) {
            console.error('[MemoryEmbeddings] Store error:', error);
            throw error;
        }
    }

    /**
     * Search for semantically similar memories
     */
    async search(userId, query, limit = 15, threshold = 0.40) {
        try {
            // Generate query embedding
            const queryEmbedding = await this.embed(query);
            const embeddingString = `[${queryEmbedding.join(',')}]`;

            // Use the search_memories function we created in migration
            const { data, error } = await this.supabase
                .rpc('search_memories', {
                    query_embedding: embeddingString,
                    match_user_id: userId,
                    match_count: limit,
                    match_threshold: threshold
                });

            if (error) {
                throw new Error(`Search error: ${error.message}`);
            }

            console.log(`[MemoryEmbeddings] Found ${data?.length || 0} relevant memories (semantic)`);
            return (data || []).map(m => ({ ...m, _source: 'semantic' }));
        } catch (error) {
            console.error('[MemoryEmbeddings] Search error:', error);
            return [];
        }
    }

    /**
     * Extract keywords from a user query for fallback search
     */
    extractKeywords(query) {
        // Remove common stop words and short words
        const stopWords = new Set([
            'the', 'a', 'an', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'can', 'shall', 'about', 'what', 'when',
            'where', 'who', 'how', 'which', 'that', 'this', 'these', 'those',
            'with', 'from', 'into', 'for', 'not', 'but', 'and', 'or', 'if',
            'then', 'than', 'too', 'very', 'just', 'don', 'now', 'here',
            'there', 'why', 'all', 'each', 'every', 'both', 'few', 'more',
            'most', 'other', 'some', 'such', 'only', 'own', 'same', 'so',
            'you', 'your', 'me', 'my', 'i', 'we', 'our', 'they', 'them',
            'she', 'her', 'he', 'him', 'it', 'its', 'of', 'in', 'on', 'at',
            'to', 'up', 'out', 'no', 'yes', 'say', 'said', 'tell', 'told',
            'last', 'time', 'remember', 'forgot', 'forget', 'know', 'think',
            'like', 'want', 'need', 'got', 'get', 'give', 'gave', 'did',
            'something', 'anything', 'thing'
        ]);

        return query
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 3 && !stopWords.has(w));
    }

    /**
     * Keyword-based fallback search using text matching
     */
    async keywordSearch(userId, query, limit = 10) {
        try {
            const keywords = this.extractKeywords(query);
            if (keywords.length === 0) {
                console.log('[MemoryEmbeddings] No keywords extracted for fallback');
                return [];
            }

            console.log(`[MemoryEmbeddings] Keyword fallback search: [${keywords.join(', ')}]`);

            // Build OR conditions for each keyword
            const orConditions = keywords.map(kw => `content.ilike.%${kw}%`).join(',');

            // Fetch more results than needed so we can filter out Tufti's wrong answers
            const { data, error } = await this.supabase
                .from('memory_embeddings')
                .select('id, content, created_at, importance_score')
                .eq('user_id', userId)
                .or(orConditions)
                .order('importance_score', { ascending: false })
                .limit(limit * 3);

            if (error) {
                throw new Error(`Keyword search error: ${error.message}`);
            }

            // Filter out Tufti's own denial responses to prevent feedback loops
            // When Tufti says "I don't know X", that gets embedded and then
            // outranks the original user data in future searches
            const denialPatterns = [
                "i don't know who",
                "i don't have that name",
                "not in my memories",
                "i still don't know",
                "same answer",
                "i won't pretend",
                "not mentioned before",
                "you haven't told me",
                "i don't have anything about",
                "i cannot find",
                "my memory of"
            ];

            const filtered = (data || []).filter(m => {
                const lower = m.content.toLowerCase();
                return !denialPatterns.some(pattern => lower.includes(pattern));
            });

            console.log(`[MemoryEmbeddings] Found ${data?.length || 0} keyword matches, ${filtered.length} after filtering denials`);
            return filtered.slice(0, limit).map(m => ({ ...m, _source: 'keyword' }));
        } catch (error) {
            console.error('[MemoryEmbeddings] Keyword search error:', error);
            return [];
        }
    }

    /**
     * Hybrid search: ALWAYS runs semantic + keyword in parallel.
     *
     * Previous version skipped keyword search if semantic returned ≥5 results.
     * This caused proper nouns (names like "naafri") to be missed because
     * semantic models score them poorly vs. common words, yet unrelated
     * messages filled the "sufficient" quota and blocked the keyword fallback.
     *
     * Fix: Run both in parallel every time, then merge and rank by source.
     * Semantic results are preferred; keyword results fill unique gaps.
     */
    async hybridSearch(userId, query, limit = 15) {
        // Run BOTH searches simultaneously — never skip keyword for proper nouns
        const [semanticResults, keywordResults] = await Promise.all([
            this.search(userId, query, limit, 0.35), // slightly lower threshold for better recall
            this.keywordSearch(userId, query, limit)
        ]);

        console.log(`[MemoryEmbeddings] Hybrid parallel: ${semanticResults.length} semantic, ${keywordResults.length} keyword`);

        // Merge: semantic results first (higher quality), then fill with unique keyword hits
        const seenIds = new Set(semanticResults.map(m => m.id));
        const merged = [...semanticResults];

        for (const kwResult of keywordResults) {
            if (!seenIds.has(kwResult.id) && merged.length < limit) {
                seenIds.add(kwResult.id);
                merged.push(kwResult);
            }
        }

        console.log(`[MemoryEmbeddings] Hybrid final: ${merged.length} total (${semanticResults.length} semantic + ${merged.length - semanticResults.length} keyword-only)`);
        return merged;
    }

    /**
     * Batch embed multiple messages (for backfill)
     */
    async batchStore(userId, messages) {
        const results = [];
        const batches = [];

        // Split into batches
        for (let i = 0; i < messages.length; i += this.maxBatchSize) {
            batches.push(messages.slice(i, i + this.maxBatchSize));
        }

        console.log(`[MemoryEmbeddings] Processing ${batches.length} batches`);

        for (const batch of batches) {
            const batchResults = await Promise.allSettled(
                batch.map(msg => this.storeMessage(
                    userId,
                    msg.id,
                    msg.text,
                    msg.importance || 0.5
                ))
            );

            results.push(...batchResults);

            // Rate limiting - wait between batches
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        console.log(`[MemoryEmbeddings] Batch complete: ${successful} success, ${failed} failed`);
        return { successful, failed };
    }

    /**
     * Format retrieved memories for injection into prompt
     */
    formatForPrompt(memories) {
        if (!memories || memories.length === 0) {
            return '';
        }

        const formatted = memories.map((m, i) => {
            const date = new Date(m.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            const source = m._source === 'keyword' ? '🔑' : '🧠';
            // Truncate very long memories to keep prompt manageable
            const content = m.content?.length > 500
                ? m.content.substring(0, 500) + '...'
                : m.content;
            return `${source} [${date}] ${content}`;
        }).join('\n\n');

        return `
═══════════════════════════════════════════════════════════════
📚 RELEVANT MEMORIES FROM PAST CONVERSATIONS
═══════════════════════════════════════════════════════════════
🧠 = semantically related | 🔑 = keyword match

${formatted}

═══════════════════════════════════════════════════════════════
CRITICAL: Use these memories to maintain continuity. When the user
asks about something from the past, CHECK these memories first.
Reference specific dates and details naturally. NEVER say "I don't
remember" if the answer is in these memories.
═══════════════════════════════════════════════════════════════`;
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            // Test embedding API
            const testEmbed = await this.embed('health check test');
            if (!testEmbed || testEmbed.length !== this.dimensions) {
                return { status: 'failed', error: 'Embedding dimensions mismatch' };
            }

            // Test database connection
            const { error } = await this.supabase
                .from('memory_embeddings')
                .select('id')
                .limit(1);

            if (error) {
                return { status: 'degraded', error: error.message };
            }

            return { status: 'healthy' };
        } catch (error) {
            return { status: 'failed', error: error.message };
        }
    }
}

module.exports = MemoryEmbeddings;
