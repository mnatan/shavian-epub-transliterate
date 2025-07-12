const fs = require('fs');
const path = require('path');
const { latin2shaw, closePythonProcess } = require('./latin2shaw-wrapper');
const { processEpubFile, transliterateEpub } = require('./epub-utils');
const { log } = require('./utils');

async function transliterateWithQuotes(text) {
    // The Python latin2shaw module already handles quote conversion to « and »
    // So we can just call it directly without any additional processing
    return await latin2shaw(text);
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