/**
 * Clean Course Transcripts for RAG - v4 (Word Count Split)
 * 
 * Simple approach: split every ~80 words (~500 chars)
 */

const fs = require('fs');
const path = require('path');

const COURSES_DIR = path.join(__dirname, '../../data/courses/renee-garcia');

function cleanTranscript(content, courseName, lessonName) {
    // Remove artifacts and existing headers
    let cleaned = content
        .replace(/\[Music\]/gi, '')
        .replace(/\[Applause\]/gi, '')
        .replace(/^#.*\n##.*\n\n---\n\n/m, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Split into words
    const words = cleaned.split(' ').filter(w => w.trim());
    const paragraphs = [];

    // Create paragraphs of ~80 words each
    const WORDS_PER_PARA = 80;
    for (let i = 0; i < words.length; i += WORDS_PER_PARA) {
        const chunk = words.slice(i, Math.min(i + WORDS_PER_PARA, words.length));
        paragraphs.push(chunk.join(' '));
    }

    // Add header
    const header = `# ${courseName}\n## ${lessonName}\n\n---\n\n`;

    return header + paragraphs.join('\n\n');
}

function processCourse(courseDir, courseName) {
    if (!fs.existsSync(courseDir)) {
        console.log(`   ⚠️ Directory not found: ${courseDir}`);
        return;
    }

    const files = fs.readdirSync(courseDir).filter(f => f.endsWith('.txt'));
    console.log(`\n📚 Processing: ${courseName} (${files.length} files)`);

    let totalParagraphs = 0;
    for (const file of files) {
        const filePath = path.join(courseDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lessonName = path.basename(file, '.txt');

        const cleaned = cleanTranscript(content, courseName, lessonName);
        const paragraphCount = cleaned.split('\n\n').filter(p => p.trim() && !p.startsWith('#') && !p.startsWith('---')).length;
        totalParagraphs += paragraphCount;

        fs.writeFileSync(filePath, cleaned);
        console.log(`   ✓ ${file}: ${paragraphCount} paragraphs`);
    }
    console.log(`   📊 Total: ${totalParagraphs} paragraphs`);
    return totalParagraphs;
}

// Main
console.log('🧹 Clean Transcripts v4 (Word Count Split)\n');
console.log('='.repeat(50));

let grand = 0;

// Process Reality 2.0 (root course files)
grand += processCourse(COURSES_DIR, 'Reality 2.0') || 0;

// Process Becoming Magnetic
grand += processCourse(path.join(COURSES_DIR, 'BECOMING MAGNETIC '), 'Becoming Magnetic') || 0;

// Process Mo Money
grand += processCourse(path.join(COURSES_DIR, 'MO MONEY'), 'Mo Money') || 0;

console.log('\n' + '='.repeat(50));
console.log(`✅ Done! Grand Total: ${grand} paragraphs`);
