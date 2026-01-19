/**
 * Clean ALL Knowledge for RAG - GOD MODE
 * 
 * Cleans BOTH books and courses with proper paragraphing
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const BOOKS_DIR = path.join(DATA_DIR, 'books');
const COURSES_DIR = path.join(DATA_DIR, 'courses/renee-garcia');

// Book name mappings for headers
const BOOK_NAMES = {
    'Master_of_reality': 'Master of Reality',
    'Reality_Transurfing': 'Reality Transurfing Steps I-V',
    'Tufti_the_Priestess': 'Tufti the Priestess',
    'What_Tufti_Didnt_Say': 'What Tufti Didn\'t Say'
};

function cleanContent(content, source, chapter = '') {
    // Remove common artifacts
    let cleaned = content
        .replace(/\[Music\]/gi, '')
        .replace(/\[Applause\]/gi, '')
        .replace(/^#.*\n##.*\n\n---\n\n/m, '')
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')  // Max 2 newlines
        .replace(/\s+/g, ' ')
        .trim();

    // Split into words
    const words = cleaned.split(' ').filter(w => w.trim());
    const paragraphs = [];

    // Create paragraphs of ~80 words each
    const WORDS_PER_PARA = 80;
    for (let i = 0; i < words.length; i += WORDS_PER_PARA) {
        const chunk = words.slice(i, Math.min(i + WORDS_PER_PARA, words.length));
        if (chunk.length > 10) {  // Ignore tiny chunks
            paragraphs.push(chunk.join(' '));
        }
    }

    // Add header
    const header = `# ${source}${chapter ? '\n## ' + chapter : ''}\n\n---\n\n`;

    return header + paragraphs.join('\n\n');
}

function processBooks() {
    console.log('\n📚 PROCESSING BOOKS (Vadim Zeland)\n' + '─'.repeat(40));

    const files = fs.readdirSync(BOOKS_DIR).filter(f => f.endsWith('.txt'));
    let totalParagraphs = 0;

    for (const file of files) {
        const filePath = path.join(BOOKS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Determine book name
        let bookName = 'Vadim Zeland';
        for (const [key, name] of Object.entries(BOOK_NAMES)) {
            if (file.includes(key)) {
                bookName = name;
                break;
            }
        }

        const cleaned = cleanContent(content, bookName);
        const paragraphCount = cleaned.split('\n\n').filter(p =>
            p.trim() && !p.startsWith('#') && !p.startsWith('---')
        ).length;
        totalParagraphs += paragraphCount;

        fs.writeFileSync(filePath, cleaned);
        console.log(`   ✓ ${bookName}: ${paragraphCount} paragraphs`);
    }

    console.log(`   📊 Books Total: ${totalParagraphs} paragraphs`);
    return totalParagraphs;
}

function processCourses() {
    console.log('\n🎓 PROCESSING COURSES (Renee Garcia)\n' + '─'.repeat(40));

    let totalParagraphs = 0;

    // Process root course files (Reality 2.0)
    const rootFiles = fs.readdirSync(COURSES_DIR).filter(f => f.endsWith('.txt'));
    console.log(`\n   📁 Reality 2.0 (${rootFiles.length} files)`);

    for (const file of rootFiles) {
        const filePath = path.join(COURSES_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lessonName = path.basename(file, '.txt');

        const cleaned = cleanContent(content, 'Reality 2.0', lessonName);
        const paragraphCount = cleaned.split('\n\n').filter(p =>
            p.trim() && !p.startsWith('#') && !p.startsWith('---')
        ).length;
        totalParagraphs += paragraphCount;

        fs.writeFileSync(filePath, cleaned);
        console.log(`      ✓ ${lessonName}: ${paragraphCount} paragraphs`);
    }

    // Process subdirectories (Becoming Magnetic, Mo Money)
    const subDirs = fs.readdirSync(COURSES_DIR).filter(f => {
        const stat = fs.statSync(path.join(COURSES_DIR, f));
        return stat.isDirectory();
    });

    for (const dir of subDirs) {
        const dirPath = path.join(COURSES_DIR, dir);
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.txt'));
        console.log(`\n   📁 ${dir} (${files.length} files)`);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const lessonName = path.basename(file, '.txt');

            const cleaned = cleanContent(content, dir.trim(), lessonName);
            const paragraphCount = cleaned.split('\n\n').filter(p =>
                p.trim() && !p.startsWith('#') && !p.startsWith('---')
            ).length;
            totalParagraphs += paragraphCount;

            fs.writeFileSync(filePath, cleaned);
            console.log(`      ✓ ${lessonName}: ${paragraphCount} paragraphs`);
        }
    }

    console.log(`\n   📊 Courses Total: ${totalParagraphs} paragraphs`);
    return totalParagraphs;
}

// ═══════════════════════════════════════════════════════════
// MAIN - GOD MODE
// ═══════════════════════════════════════════════════════════
console.log('\n');
console.log('═'.repeat(50));
console.log('   🔥 CLEAN ALL KNOWLEDGE - GOD MODE 🔥');
console.log('═'.repeat(50));

const booksParagraphs = processBooks();
const coursesParagraphs = processCourses();

console.log('\n' + '═'.repeat(50));
console.log(`   📚 Books:   ${booksParagraphs} paragraphs`);
console.log(`   🎓 Courses: ${coursesParagraphs} paragraphs`);
console.log(`   ══════════════════════════════`);
console.log(`   🎯 TOTAL:   ${booksParagraphs + coursesParagraphs} paragraphs`);
console.log('═'.repeat(50));
console.log('   ✅ ALL KNOWLEDGE CLEANED!');
console.log('═'.repeat(50));
