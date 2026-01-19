/**
 * embed-books.js - Embed all Transurfing books with Azure OpenAI
 * 
 * Memory-optimized version: processes one book at a time with small batches
 * 
 * Run: node scripts/embed-books.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs').promises;
const path = require('path');
const { Pinecone } = require('@pinecone-database/pinecone');

// Configuration
const AZURE_ENDPOINT = process.env.AZURE_EMBEDDING_ENDPOINT;
const AZURE_KEY = process.env.AZURE_EMBEDDING_KEY;
const AZURE_DEPLOYMENT = process.env.AZURE_EMBEDDING_DEPLOYMENT;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const INDEX_NAME = 'tufti-knowledge-v2';

// Books to embed
const BOOKS_DIR = path.join(__dirname, '../../data');
const BOOKS = {
    'Tufti the Priestess': 'Tufti_the_Priestess_Live_Stroll_Through_A_-_Vadim_Zeland (1).txt',
    'Reality Transurfing I-V': 'Reality_Transurfing_Steps_I-V_-_Vadim_Zeland (1).txt',
    'Master of Reality': 'Master_of_reality_-_Vadim_Zeland.txt',
    'What Tufti Didnt Say': 'What_Tufti_Didnt_Say_-_Vadim_Zeland.txt'
};

const CHUNK_SIZE = 300; // tokens (smaller for better precision)
const CHUNK_OVERLAP = 100; // tokens of overlap between chunks
const BATCH_SIZE = 10;
const EMBEDDING_DIMENSIONS = 3072;

/**
 * Split text into overlapping chunks for better context preservation
 */
function chunkText(text, bookName) {
    const chunks = [];
    const charChunkSize = CHUNK_SIZE * 4; // ~4 chars per token
    const charOverlap = CHUNK_OVERLAP * 4;

    // Clean text
    const cleanText = text
        .replace(/\f/g, '\n\n')
        .replace(/OceanofPDF\.com/g, '')
        .replace(/\n{4,}/g, '\n\n\n')
        .trim();

    let start = 0;
    let chunkIndex = 0;

    while (start < cleanText.length) {
        let end = Math.min(start + charChunkSize, cleanText.length);

        // Try to end at a sentence boundary (., !, ?)
        if (end < cleanText.length) {
            // Look for sentence endings
            let bestBreak = -1;
            for (const punct of ['. ', '! ', '? ', '.\n', '!\n', '?\n']) {
                const pos = cleanText.lastIndexOf(punct, end);
                if (pos > start + charChunkSize / 2 && pos > bestBreak) {
                    bestBreak = pos + 1; // Include the punctuation
                }
            }
            if (bestBreak > 0) {
                end = bestBreak;
            }
        }

        const chunkContent = cleanText.slice(start, end).trim();

        if (chunkContent.length > 50) {
            chunks.push({
                id: `${bookName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${chunkIndex}`,
                text: chunkContent,
                book: bookName,
                chunkIndex
            });
            chunkIndex++;
        }

        // Move start forward, but overlap with previous chunk
        start = end - charOverlap;

        // Prevent infinite loop
        if (start <= 0 || end >= cleanText.length) {
            if (end >= cleanText.length) break;
            start = end;
        }
    }

    return chunks;
}

/**
 * Call Azure OpenAI embedding API for a single batch
 */
async function embedBatch(texts) {
    const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/embeddings?api-version=2024-02-01`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': AZURE_KEY
        },
        body: JSON.stringify({
            input: texts,
            dimensions: EMBEDDING_DIMENSIONS
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Azure embedding failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data.map(item => item.embedding);
}

/**
 * Verify Pinecone index exists
 */
async function getIndex(pinecone) {
    const indexes = await pinecone.listIndexes();
    const indexExists = indexes.indexes?.some(idx => idx.name === INDEX_NAME);

    if (!indexExists) {
        console.log(`\n📦 Creating index: ${INDEX_NAME}`);
        await pinecone.createIndex({
            name: INDEX_NAME,
            dimension: EMBEDDING_DIMENSIONS,
            metric: 'cosine',
            spec: { serverless: { cloud: 'aws', region: 'us-east-1' } }
        });
        console.log('   Waiting 60s for index...');
        await new Promise(r => setTimeout(r, 60000));
    }

    return pinecone.Index(INDEX_NAME);
}

/**
 * Process one book at a time
 */
async function processBook(bookName, fileName, index) {
    console.log(`\n📖 ${bookName}`);

    const bookPath = path.join(BOOKS_DIR, fileName);
    const content = await fs.readFile(bookPath, 'utf-8');
    console.log(`   Read ${(content.length / 1024).toFixed(0)} KB`);

    const chunks = chunkText(content, bookName);
    console.log(`   ${chunks.length} chunks`);

    let embedded = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const texts = batch.map(c => c.text);

        try {
            const embeddings = await embedBatch(texts);

            const vectors = batch.map((chunk, idx) => ({
                id: chunk.id,
                values: embeddings[idx],
                metadata: { text: chunk.text, book: chunk.book }
            }));

            await index.upsert(vectors);
            embedded += batch.length;

            process.stdout.write(`   ${embedded}/${chunks.length}\r`);

            // Small delay to avoid rate limits
            await new Promise(r => setTimeout(r, 100));

        } catch (error) {
            console.error(`   ❌ Batch ${i}: ${error.message}`);
        }
    }

    console.log(`   ✓ Embedded ${embedded} chunks`);
    return embedded;
}

/**
 * Main
 */
async function main() {
    console.log('🚀 Azure OpenAI Embedding Pipeline v2.0 (Overlapping Chunks)\n');
    console.log(`   Chunk size: ${CHUNK_SIZE} tokens`);
    console.log(`   Overlap: ${CHUNK_OVERLAP} tokens`);
    console.log(`   Index: ${INDEX_NAME}\n`);

    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = await getIndex(pinecone);

    // Clear existing vectors for fresh re-embedding
    console.log('🗑️  Clearing existing vectors...');
    try {
        await index.deleteAll();
        console.log('   ✓ Index cleared\n');
    } catch (e) {
        console.log('   ⚠️ Could not clear index, continuing...\n');
    }

    let total = 0;

    for (const [bookName, fileName] of Object.entries(BOOKS)) {
        try {
            const count = await processBook(bookName, fileName, index);
            total += count;
        } catch (error) {
            console.error(`   ❌ ${bookName}: ${error.message}`);
        }
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`✅ Done! Embedded ${total} chunks to ${INDEX_NAME}`);
    console.log('═══════════════════════════════════════\n');

    const stats = await index.describeIndexStats();
    console.log('Index stats:', stats);
}

main().catch(console.error);
