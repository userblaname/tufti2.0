/**
 * Delete and recreate Pinecone index with correct dimensions
 */

import { Pinecone } from '@pinecone-database/pinecone';
import 'dotenv/config';

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const INDEX_NAME = process.env.PINECONE_INDEX || 'tufti-knowledge';

const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });

async function main() {
    console.log('🗑️  Deleting old index:', INDEX_NAME);

    try {
        await pinecone.deleteIndex(INDEX_NAME);
        console.log('   ✓ Deleted');

        console.log('\n⏳ Waiting 10 seconds...');
        await new Promise(r => setTimeout(r, 10000));

        console.log('\n🔧 Creating new index with 384 dimensions...');
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

        console.log('   ✓ Index created!');
        console.log('\n⏳ Waiting 60 seconds for index to be ready...');
        await new Promise(r => setTimeout(r, 60000));

        console.log('\n✅ Done! Now run embed-books.js again.');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
