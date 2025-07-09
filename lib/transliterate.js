const fs = require('fs');
const path = require('path');
const EPub = require('epub');
const { split } = require('sentence-splitter');
const { latin2shaw, closePythonProcess } = require('./lib/latin2shaw-wrapper');
const { extractAllImages, getEpubMetadata } = require('./lib/epub-utils');
const { processChapterText } = require('./lib/transliterate-core');
const { generateHtml, convertToEpub, convertToMobi } = require('./lib/output-utils');

// ANSI color codes for nicer output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function renderProgressBar(current, total, width = 40) {
    const percent = current / total;
    const filled = Math.round(percent * width);
    const bar = '█'.repeat(filled) + '-'.repeat(width - filled);
    process.stdout.write(`\r[${bar}] ${current}/${total} (${Math.round(percent * 100)}%)`);
    if (current === total) process.stdout.write('\n');
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#39;');
}

async function transliterateWithQuotes(text) {
    // First, decode HTML entities
    text = text.replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'")
               .replace(/&apos;/g, "'");
    // Split text into quoted and non-quoted segments
    const segments = [];
    let currentIndex = 0;
    let inQuotes = false;
    let quoteStart = -1;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            if (!inQuotes) {
                if (i > currentIndex) {
                    segments.push({ text: text.slice(currentIndex, i), isQuoted: false });
                }
                quoteStart = i;
                inQuotes = true;
            } else {
                segments.push({ text: text.slice(quoteStart + 1, i), isQuoted: true });
                inQuotes = false;
                currentIndex = i + 1;
            }
        }
    }
    if (currentIndex < text.length) {
        segments.push({ text: text.slice(currentIndex), isQuoted: false });
    }
    // Transliterate each segment and preserve quotes
    const transliteratedSegments = await Promise.all(segments.map(async segment => {
        const transliterated = await latin2shaw(segment.text);
        return segment.isQuoted ? `"${transliterated}"` : transliterated;
    }));
    return transliteratedSegments.join('');
}

async function transliterateEpub(inputPath, outputPath, includeOriginal = false) {
    return new Promise((resolve, reject) => {
        const epub = new EPub(inputPath);
        epub.on('error', (err) => {
            console.error('EPUB error:', err);
            reject(err);
        });
        epub.on('end', async () => {
            try {
                const chapters = [];
                log(`📖 Processing ${epub.flow.length} chapters...`, 'blue');
                for (let i = 0; i < epub.flow.length; i++) {
                    const chapter = epub.flow[i];
                    renderProgressBar(i + 1, epub.flow.length);
                    await new Promise((res, rej) => {
                        epub.getChapter(chapter.id, async (err, text) => {
                            if (err) {
                                console.error(`Error extracting chapter ${i + 1}:`, err);
                                return res();
                            }
                            // Process HTML content to preserve images and transliterate text
                            let processedText = text;
                            
                            // Preserve image tags by temporarily replacing them
                            const imagePlaceholders = [];
                            let imageIndex = 0;
                            processedText = processedText.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, (match, src) => {
                                const placeholder = `__IMAGE_PLACEHOLDER_${imageIndex}__`;
                                imagePlaceholders.push({ placeholder, src });
                                imageIndex++;
                                return placeholder;
                            });
                            
                            // Remove other HTML tags, collapse whitespace, but preserve image placeholders
                            const textContent = processedText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                            
                            if (textContent.length > 0) {
                                // Use processChapterText for all processing
                                const chapterId = `chapter-${i + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                                const finalContent = await processChapterText({
                                    text,
                                    imagePlaceholders,
                                    transliterateWithQuotes,
                                    includeOriginal,
                                    chapterTitle: escapeHtml(chapter.title || `Chapter ${i + 1}`),
                                    chapterId,
                                });
                                chapters.push({
                                    title: chapter.title || `Chapter ${i + 1}`,
                                    id: chapterId,
                                    content: finalContent
                                });
                            }
                            res();
                        });
                    });
                }
                console.log(); // New line after progress bar
                if (chapters.length === 0) {
                    console.error('No chapters with content found.');
                    return reject(new Error('No chapters with content found.'));
                }
                // Generate HTML file with Kindle-compatible structure
                const htmlContent = generateHtml({
                    chapters,
                    metadata: {
                        title: escapeHtml(epub.metadata.title || 'Transliterated Book'),
                        creator: escapeHtml(epub.metadata.creator || 'Unknown Author'),
                    },
                });
                fs.writeFileSync(outputPath, htmlContent, 'utf8');
                log(`✅ HTML file created: ${path.basename(outputPath)}`, 'green');
                resolve();
            } catch (error) {
                reject(error);
            }
        });
        epub.parse();
    });
}

async function processEpubFile(inputFile, includeOriginal = false) {
    const fileName = path.basename(inputFile, '.epub');
    const outputFile = `output/${fileName}-shavian.html`;
    
    log(`\n🚀 Processing: ${path.basename(inputFile)}`, 'bright');
    log(`📝 Author: ${await getEpubMetadata(inputFile, 'creator') || 'Unknown'}`, 'cyan');
    log(`📚 Title: ${await getEpubMetadata(inputFile, 'title') || 'Unknown'}`, 'cyan');
    
    try {
        // Extract all images first
        const coverFile = await new Promise((resolve) => {
            extractAllImages(inputFile, (coverFile) => {
                resolve(coverFile);
            });
        });
        
        // If no cover found in EPUB, try to use the extracted cover.jpg if it exists
        let finalCoverFile = coverFile;
        if (!coverFile && fs.existsSync('output/cover.jpg')) {
            finalCoverFile = 'output/cover.jpg';
            log('📷 Using previously extracted cover.jpg', 'cyan');
        }
        
        // Process the EPUB
        await transliterateEpub(inputFile, outputFile, includeOriginal);
        
        // Convert to EPUB and MOBI with cover
        log('🔄 Converting to EPUB...', 'blue');
        await convertToEpub(outputFile, `output/${fileName}-shavian.epub`, finalCoverFile, EBOOK_CONVERT, log);
        
        log('🔄 Converting to MOBI...', 'blue');
        await convertToMobi(`output/${fileName}-shavian.epub`, `output/${fileName}-shavian.mobi`, finalCoverFile, EBOOK_CONVERT, log);
        
        log(`✅ Successfully processed: ${path.basename(inputFile)}`, 'green');
        return true;
    } catch (error) {
        log(`❌ Error processing ${path.basename(inputFile)}: ${error.message}`, 'red');
        return false;
    }
}

function findEbookConvert() {
    const { execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    // 1. Environment variable
    if (process.env.EBOOK_CONVERT_PATH && fs.existsSync(process.env.EBOOK_CONVERT_PATH)) {
        return process.env.EBOOK_CONVERT_PATH;
    }
    // 2. PATH (which/where)
    try {
        const whichCmd = process.platform === 'win32' ? 'where' : 'which';
        const found = execSync(`${whichCmd} ebook-convert`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        if (found && fs.existsSync(found.split('\n')[0])) {
            return found.split('\n')[0];
        }
    } catch (e) {}
    // 3. Common locations
    const candidates = [
        // macOS
        '/Applications/calibre.app/Contents/MacOS/ebook-convert',
        // Linux
        '/usr/bin/ebook-convert',
        '/usr/local/bin/ebook-convert',
        // Windows
        'C:/Program Files/Calibre2/ebook-convert.exe',
        'C:/Program Files (x86)/Calibre2/ebook-convert.exe'
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}

const EBOOK_CONVERT = findEbookConvert();
if (!EBOOK_CONVERT) {
    console.error('❌ Could not find ebook-convert! Please install Calibre and ensure ebook-convert is in your PATH or set EBOOK_CONVERT_PATH.');
    process.exit(1);
}

// Main execution
async function main() {
    log('🎯 Shavian Transliteration Tool', 'bright');
    log('================================', 'bright');
    
    // Show help if requested
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        log('Usage: node transliterate.js [--skip-original]', 'cyan');
        log('', 'reset');
        log('Options:', 'bright');
        log('  --skip-original     Skip original Latin text (Shavian only)', 'cyan');
        log('  --help, -h          Show this help message', 'cyan');
        log('', 'reset');
        log('Examples:', 'bright');
        log('  node transliterate.js                    # Include original text for learning', 'cyan');
        log('  node transliterate.js --skip-original    # Shavian only', 'cyan');
        process.exit(0);
    }
    
    // Parse command line arguments
    const skipOriginal = process.argv.includes('--skip-original');
    const includeOriginal = !skipOriginal;
    if (includeOriginal) {
        log('📝 Original Latin text will be included after each paragraph', 'cyan');
    } else {
        log('📝 Shavian text only (original text skipped)', 'cyan');
    }
    
    // Ensure output directory exists
    if (!fs.existsSync('output')) {
        fs.mkdirSync('output');
        log('📁 Created output directory', 'blue');
    }
    
    // Find all EPUB files in input directory
    const inputDir = 'input';
    if (!fs.existsSync(inputDir)) {
        log(`❌ Input directory '${inputDir}' not found!`, 'red');
        log('Please create the input directory and place your EPUB files there.', 'yellow');
        process.exit(1);
    }
    
    const epubFiles = fs.readdirSync(inputDir)
        .filter(file => file.toLowerCase().endsWith('.epub'))
        .map(file => path.join(inputDir, file));
    
    if (epubFiles.length === 0) {
        log(`❌ No EPUB files found in '${inputDir}' directory!`, 'red');
        log('Please place your EPUB files in the input directory.', 'yellow');
        process.exit(1);
    }
    
    log(`📚 Found ${epubFiles.length} EPUB file(s) to process`, 'green');
    
    let successCount = 0;
    let totalCount = epubFiles.length;
    
    try {
        for (let i = 0; i < epubFiles.length; i++) {
            const success = await processEpubFile(epubFiles[i], includeOriginal);
            if (success) successCount++;
            
            if (i < epubFiles.length - 1) {
                log('\n' + '─'.repeat(50), 'blue');
            }
        }
        
        log('\n🎉 Processing Complete!', 'bright');
        log(`✅ Successfully processed: ${successCount}/${totalCount} files`, 'green');
        log(`📁 Output files are in the 'output' directory`, 'blue');
        
        if (successCount < totalCount) {
            log(`⚠️  ${totalCount - successCount} file(s) had errors`, 'yellow');
            process.exit(1);
        }
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'red');
        process.exit(1);
    } finally {
        try {
            closePythonProcess();
        } catch (error) {
            // Ignore cleanup errors
        }
    }
}

// Run the main function
main().catch(error => {
    log(`❌ Fatal error: ${error.message}`, 'red');
    closePythonProcess();
    process.exit(1);
});