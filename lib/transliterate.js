const fs = require('fs');
const path = require('path');
const EPub = require('epub');
const { split } = require('sentence-splitter');
const { latin2shaw, closePythonProcess } = require('./latin2shaw-wrapper');
const { extractAllImages, getEpubMetadata, processEpubFile, transliterateEpub } = require('./epub-utils');
const { processChapterText } = require('./transliterate-core');
const { generateHtml, convertToEpub, convertToMobi } = require('./output-utils');
const { log, colors } = require('./utils');

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
    log('❌ Could not find ebook-convert! Please install Calibre and ensure ebook-convert is in your PATH or set EBOOK_CONVERT_PATH.', 'red');
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
            const success = await processEpubFile(
                epubFiles[i],
                includeOriginal,
                log,
                transliterateEpub,
                findEbookConvert,
                transliterateWithQuotes
            );
            if (!success) {
                log(`❌ Failed to process: ${epubFiles[i]}`, 'red');
            } else {
                successCount++;
            }
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