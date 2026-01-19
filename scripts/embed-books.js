/**
 * Tufti RAG - Book Embedding Script (LOCAL)
 * 
 * Uses @xenova/transformers for local embeddings - no API needed!
 * Reads all books from /data, chunks them, embeds locally,
 * and uploads to Pinecone for semantic search.
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { pipeline } from '@xenova/transformers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Get directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const INDEX_NAME = process.env.PINECONE_INDEX || 'tufti-knowledge';

console.log('🔧 Configuration:');
console.log('   Pinecone API Key:', PINECONE_API_KEY ? '✓' : '✗');
console.log('   Index:', INDEX_NAME);
console.log('   Embeddings: LOCAL (all-MiniLM-L6-v2)\n');

// Initialize Pinecone
const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });

// Book files to process
const DATA_DIR = path.join(__dirname, '../data');

// Embedding model (384 dimensions)
let embedder = null;

async function initEmbedder() {
    console.log('📥 Loading local embedding model (first run downloads ~23MB)...');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('   ✓ Model loaded!\n');
}

/**
 * Embed text locally
 */
async function embed(text) {
    const result = await embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
}

/**
 * Split text into chunks of roughly 400 words with overlap
 */
function chunkText(text, chunkSize = 400, overlap = 50) {
    const words = text.split(/\s+/);
    const chunks = [];

    for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        if (chunk.trim().length > 100) {
            chunks.push(chunk.trim());
        }
    }

    return chunks;
}

/**
 * Process a single book file
 */
async function processBook(filePath) {
    const fileName = path.basename(filePath, '.txt');
    const bookTitle = fileName
        .replace(/_/g, ' ')
        .replace(/\s*\(\d+\)\s*/g, '')
        .replace(/\s+-\s+Vadim Zeland/g, '')
        .trim();

    console.log(`📖 Processing: ${bookTitle}`);

    const text = fs.readFileSync(filePath, 'utf-8');
    const chunks = chunkText(text);

    console.log(`   📄 Created ${chunks.length} chunks`);

    return chunks.map((chunk, index) => ({
        id: `${fileName.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}-${index}`,
        text: chunk,
        book: bookTitle,
        chunkIndex: index,
    }));
}

/**
 * Embed chunks locally
 */
async function embedChunks(chunks) {
    console.log(`\n🧠 Embedding ${chunks.length} chunks locally...`);

    const embeddings = [];
    const startTime = Date.now();

    for (let i = 0; i < chunks.length; i++) {
        const embedding = await embed(chunks[i].text);
        embeddings.push(embedding);

        // Progress update every 50 chunks
        if ((i + 1) % 50 === 0 || i === chunks.length - 1) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const rate = ((i + 1) / elapsed * 60).toFixed(0);
            console.log(`   ✓ Embedded ${i + 1}/${chunks.length} (${rate}/min)`);
        }
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ✅ Done in ${totalTime}s\n`);

    return embeddings;
}

/**
 * Create Pinecone index if it doesn't exist
 */
async function ensureIndex() {
    console.log(`🔧 Checking Pinecone index: ${INDEX_NAME}`);

    try {
        const indexes = await pinecone.listIndexes();
        const indexNames = indexes.indexes?.map(i => i.name) || [];

        if (!indexNames.includes(INDEX_NAME)) {
            console.log(`   Creating new index...`);
            await pinecone.createIndex({
                name: INDEX_NAME,
                dimension: 384, // all-MiniLM-L6-v2 dimension
                metric: 'cosine',
                spec: {
                    serverless: {
                        cloud: 'aws',
                        region: 'us-east-1',
                    },
                },
            });

            console.log(`   Waiting for index to be ready (60s)...`);
            await new Promise(r => setTimeout(r, 60000));
        } else {
            console.log(`   ✓ Index exists`);
        }

        return pinecone.Index(INDEX_NAME);
    } catch (error) {
        console.error('   ✗ Error with Pinecone:', error.message);
        throw error;
    }
}

/**
 * Upload embeddings to Pinecone
 */
async function uploadToPinecone(index, chunks, embeddings) {
    console.log(`\n📤 Uploading ${chunks.length} vectors to Pinecone...`);

    const vectors = chunks.map((chunk, i) => ({
        id: chunk.id,
        values: embeddings[i],
        metadata: {
            text: chunk.text.substring(0, 3500),
            book: chunk.book,
            chunkIndex: chunk.chunkIndex,
        },
    }));

    // Upload in batches
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        try {
            await index.upsert(batch);
            console.log(`   ✓ Uploaded ${Math.min(i + batchSize, vectors.length)}/${vectors.length}`);
        } catch (error) {
            console.error(`   ✗ Error uploading batch at ${i}:`, error.message);
        }
    }

    console.log(`\n✅ Upload complete!`);
}

/**
 * Main function
 */
async function main() {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║   TUFTI RAG - Local Embedding Script               ║');
    console.log('║   No API rate limits! Runs entirely on your Mac    ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    // Initialize local embedder
    await initEmbedder();

    // Get all book files
    const bookFiles = fs.readdirSync(DATA_DIR)
        .filter(f => f.endsWith('.txt'))
        .map(f => path.join(DATA_DIR, f));

    console.log(`📚 Found ${bookFiles.length} books to process\n`);

    // Process all books
    let allChunks = [];
    for (const file of bookFiles) {
        const chunks = await processBook(file);
        allChunks = allChunks.concat(chunks);
    }

    console.log(`\n📊 Total chunks: ${allChunks.length}`);

    // Embed all chunks locally
    const embeddings = await embedChunks(allChunks);

    // Ensure Pinecone index exists
    const index = await ensureIndex();

    // Upload to Pinecone
    await uploadToPinecone(index, allChunks, embeddings);

    console.log('\n' + '═'.repeat(52));
    console.log('🎉 RAG KNOWLEDGE BASE READY!');
    console.log('═'.repeat(52));
    console.log(`   Index: ${INDEX_NAME}`);
    console.log(`   Vectors: ${allChunks.length}`);
    console.log(`   Dimension: 384 (all-MiniLM-L6-v2)`);
    console.log('═'.repeat(52) + '\n');
}

main().catch(console.error);
