/**
 * embed-knowledge.js - Elite Multi-Source Embedding Pipeline v2
 * 
 * Uses PRE-CLEANED paragraphs (from clean-knowledge.js)
 * 
 * Handles:
 * - Books (data/books/) - Vadim Zeland's original texts
 * - Courses (data/courses/) - Practitioner content (Renee Garcia, etc.)
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
const INDEX_NAME = process.env.PINECONE_INDEX || 'tufti-knowledge-v2';

const DATA_DIR = path.join(__dirname, '../../data');
const BATCH_SIZE = 10;
const EMBEDDING_DIMENSIONS = 3072;

/**
 * Extract paragraphs from pre-cleaned content
 * Uses double-newlines as paragraph separators
 */
function extractParagraphs(content, sourceName, sourceType, author) {
    // Split on double newlines (our paragraph separator)
    const paragraphs = content
        .split('\n\n')
        .map(p => p.trim())
        .filter(p => p.length > 50 && !p.startsWith('#') && !p.startsWith('---'));

    return paragraphs.map((text, idx) => ({
        id: `${sourceName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${idx}`,
        text,
        metadata: {
            source: sourceName,
            source_type: sourceType,
            author
        }
    }));
}

/**
 * Embed batch using Azure OpenAI
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
 * Get or create Pinecone index
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
 * Process and embed paragraphs
 */
async function embedParagraphs(paragraphs, index) {
    let embedded = 0;
    const total = paragraphs.length;

    for (let i = 0; i < paragraphs.length; i += BATCH_SIZE) {
        const batch = paragraphs.slice(i, i + BATCH_SIZE);
        const texts = batch.map(p => p.text);

        try {
            const embeddings = await embedBatch(texts);

            const vectors = batch.map((para, idx) => ({
                id: para.id,
                values: embeddings[idx],
                metadata: {
                    text: para.text,
                    ...para.metadata
                }
            }));

            await index.upsert(vectors);
            embedded += batch.length;

            process.stdout.write(`   Progress: ${embedded}/${total} (${Math.round(embedded / total * 100)}%)\r`);
            await new Promise(r => setTimeout(r, 100));

        } catch (error) {
            console.error(`\n   ❌ Batch ${i}: ${error.message}`);
        }
    }

    return embedded;
}

/**
 * Process a directory recursively
 */
async function processDirectory(dir, sourceType, defaultAuthor, index) {
    let allParagraphs = [];

    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                // Recurse into subdirectories
                const subParagraphs = await processDirectory(fullPath, sourceType, entry.name, index);
                allParagraphs = allParagraphs.concat(subParagraphs);
            } else if (entry.name.endsWith('.txt')) {
                const content = await fs.readFile(fullPath, 'utf-8');

                // Extract source name from header if present
                let sourceName = entry.name.replace('.txt', '').replace(/_/g, ' ');
                const headerMatch = content.match(/^# (.+)$/m);
                if (headerMatch) sourceName = headerMatch[1];

                // Determine author
                let author = defaultAuthor;
                if (sourceType === 'book') author = 'Vadim Zeland';
                else if (defaultAuthor === 'renee-garcia') author = 'Renee Garcia';

                const paragraphs = extractParagraphs(content, sourceName, sourceType, author);
                console.log(`   📄 ${sourceName}: ${paragraphs.length} paragraphs`);
                allParagraphs = allParagraphs.concat(paragraphs);
            }
        }
    } catch (e) {
        console.log(`   ⚠️ Error reading ${dir}: ${e.message}`);
    }

    return allParagraphs;
}

/**
 * Main
 */
async function main() {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('   🚀 ELITE EMBEDDING PIPELINE v2');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(`   Index: ${INDEX_NAME}`);
    console.log(`   Dimensions: ${EMBEDDING_DIMENSIONS}`);
    console.log(`   Batch Size: ${BATCH_SIZE}\n`);

    // Initialize Pinecone
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = await getIndex(pinecone);

    // Clear existing vectors
    console.log('🗑️  Clearing existing vectors...');
    try {
        await index.deleteAll();
        console.log('   ✓ Index cleared\n');
    } catch (e) {
        console.log('   ⚠️ Could not clear index, continuing...\n');
    }

    let allParagraphs = [];

    // Process BOOKS
    console.log('═══════════════════════════════════════');
    console.log('📚 BOOKS (Vadim Zeland)');
    console.log('═══════════════════════════════════════');
    const booksDir = path.join(DATA_DIR, 'books');
    const bookParagraphs = await processDirectory(booksDir, 'book', 'Vadim Zeland', index);
    allParagraphs = allParagraphs.concat(bookParagraphs);
    console.log(`   📊 Books Total: ${bookParagraphs.length} paragraphs\n`);

    // Process COURSES
    console.log('═══════════════════════════════════════');
    console.log('🎓 COURSES (Renee Garcia)');
    console.log('═══════════════════════════════════════');
    const coursesDir = path.join(DATA_DIR, 'courses/renee-garcia');
    const courseParagraphs = await processDirectory(coursesDir, 'course', 'Renee Garcia', index);
    allParagraphs = allParagraphs.concat(courseParagraphs);
    console.log(`   📊 Courses Total: ${courseParagraphs.length} paragraphs\n`);

    // Embed all
    console.log('═══════════════════════════════════════');
    console.log('🔥 EMBEDDING TO PINECONE');
    console.log('═══════════════════════════════════════');
    console.log(`   Total paragraphs: ${allParagraphs.length}\n`);

    const embedded = await embedParagraphs(allParagraphs, index);

    console.log('\n\n═══════════════════════════════════════');
    console.log(`   ✅ DONE! Embedded ${embedded} paragraphs`);
    console.log('═══════════════════════════════════════\n');

    // Stats
    const stats = await index.describeIndexStats();
    console.log('📊 Index Stats:');
    console.log(`   Vectors: ${stats.totalRecordCount}`);
    console.log(`   Dimension: ${stats.dimension}`);
}

main().catch(console.error);
