const fs = require('fs');
const path = require('path');
const EPub = require('epub');
const toShavian = require('to-shavian');

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

function logProgress(current, total, message) {
    const percentage = Math.round((current / total) * 100);
    const barLength = 20;
    const filledLength = Math.round((barLength * current) / total);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    process.stdout.write(`\r${colors.cyan}[${bar}] ${percentage}% - ${message}${colors.reset}`);
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#39;');
}

// English to Shavian phonetic mapping for fallback
const englishToShavian = {
    // Vowels
    'a': '𐑨', 'e': '𐑧', 'i': '𐑦', 'o': '𐑭', 'u': '𐑳',
    'ay': '𐑱', 'ai': '𐑱', 'ee': '𐑰', 'oo': '𐑵', 'ow': '𐑶',
    'oy': '𐑶', 'ar': '𐑸', 'er': '𐑻', 'ir': '𐑻', 'or': '𐑹',
    'ur': '𐑻', 'aw': '𐑷', 'ew': '𐑵', 'ue': '𐑵',
    
    // Consonants
    'b': '𐑚', 'c': '𐑒', 'd': '𐑛', 'f': '𐑓', 'g': '𐑜',
    'h': '𐑣', 'j': '𐑡', 'k': '𐑒', 'l': '𐑤', 'm': '𐑥',
    'n': '𐑯', 'p': '𐑐', 'q': '𐑒', 'r': '𐑮', 's': '𐑕',
    't': '𐑑', 'v': '𐑝', 'w': '𐑢', 'x': '𐑒𐑕', 'y': '𐑘',
    'z': '𐑟',
    
    // Common combinations
    'ch': '𐑗', 'sh': '𐑖', 'th': '𐑔', 'ph': '𐑓',
    'wh': '𐑣𐑢', 'qu': '𐑒𐑢', 'ng': '𐑙', 'ck': '𐑒',
    'gh': '𐑓', 'kn': '𐑯', 'wr': '𐑮', 'mb': '𐑥',
    'gn': '𐑯', 'ps': '𐑕', 'rh': '𐑮', 'sc': '𐑕',
    'dg': '𐑡', 'tch': '𐑗',
    
    // Additional combinations for problematic words
    'mc': '𐑥𐑒', 'mg': '𐑥𐑜', 'gg': '𐑜', 'll': '𐑤',
    'ss': '𐑕', 'tt': '𐑑', 'pp': '𐑐', 'bb': '𐑚',
    'dd': '𐑛', 'ff': '𐑓', 'mm': '𐑥', 'nn': '𐑯',
    'rr': '𐑮', 'cc': '𐑒', 'kk': '𐑒'
};

// No specific mappings - using phonetic transliteration for all words

// Contraction mappings
const contractionMappings = {
    'you\'ve': '𐑿𐑝',
    'you\'re': '𐑿𐑼',
    'you\'ll': '𐑿𐑤',
    'you\'d': '𐑿𐑛',
    'I\'ve': '𐑲𐑝',
    'I\'m': '𐑲𐑥',
    'I\'ll': '𐑲𐑤',
    'I\'d': '𐑲𐑛',
    'he\'s': '𐑣𐑰𐑟',
    'he\'ll': '𐑣𐑰𐑤',
    'he\'d': '𐑣𐑰𐑛',
    'she\'s': '𐑖𐑰𐑟',
    'she\'ll': '𐑖𐑰𐑤',
    'she\'d': '𐑖𐑰𐑛',
    'it\'s': '𐑦𐑑𐑕',
    'it\'ll': '𐑦𐑑𐑤',
    'it\'d': '𐑦𐑑𐑛',
    'we\'ve': '𐑢𐑰𐑝',
    'we\'re': '𐑢𐑰𐑼',
    'we\'ll': '𐑢𐑰𐑤',
    'we\'d': '𐑢𐑰𐑛',
    'they\'ve': '𐑞𐑱𐑝',
    'they\'re': '𐑞𐑱𐑼',
    'they\'ll': '𐑞𐑱𐑤',
    'they\'d': '𐑞𐑱𐑛',
    'don\'t': '𐑛𐑴𐑯𐑑',
    'doesn\'t': '𐑛𐑳𐑟𐑩𐑯1',
    'didn\'t': '𐑛𐑦𐑛𐑩𐑯1',
    'won\'t': '𐑢𐑴𐑯1',
    'can\'t': '𐑒𐑨𐑯1',
    'couldn\'t': '𐑒𐑵𐑛𐑩𐑯1',
    'shouldn\'t': '𐑖𐑵𐑛𐑩𐑯1',
    'wouldn\'t': '𐑢𐑵𐑛𐑩𐑯1',
    'isn\'t': '𐑦𐑟𐑩𐑯1',
    'aren\'t': '𐑸𐑯1',
    'wasn\'t': '𐑢𐑪𐑟𐑩𐑯1',
    'weren\'t': '𐑢𐑻𐑯1',
    'hasn\'t': '𐑣𐑨𐑟𐑩𐑯1',
    'haven\'t': '𐑣𐑨𐑝𐑩𐑯1',
    'hadn\'t': '𐑣𐑨𐑛𐑩𐑯1'
};

function englishToShavianPhonetic(word) {
    word = word.toLowerCase();
    let result = '';
    let i = 0;
    
    while (i < word.length) {
        let matched = false;
        
        // Try 3-character combinations first
        if (i < word.length - 2) {
            const threeChar = word.slice(i, i + 3);
            if (englishToShavian[threeChar]) {
                result += englishToShavian[threeChar];
                i += 3;
                matched = true;
            }
        }
        
        // Try 2-character combinations
        if (!matched && i < word.length - 1) {
            const twoChar = word.slice(i, i + 2);
            if (englishToShavian[twoChar]) {
                result += englishToShavian[twoChar];
                i += 2;
                matched = true;
            }
        }
        
        // Try single character
        if (!matched && englishToShavian[word[i]]) {
            result += englishToShavian[word[i]];
            i++;
            matched = true;
        }
        
        // If no match, skip the character
        if (!matched) {
            i++;
        }
    }
    
    return result;
}

function transliterateWithPhoneticFallback(text) {
    // First check contraction mappings (keep these as they're special cases)
    if (contractionMappings[text]) {
        return contractionMappings[text];
    }

    // Minimal override for specific problematic words
    const minimalOverrides = {
        'there': '𐑞𐑺',
        'their': '𐑞𐑺',
        'new': '𐑯𐑿',
        'seen': '𐑕𐑰𐑯'
    };
    if (minimalOverrides[text.toLowerCase()]) {
        const result = minimalOverrides[text.toLowerCase()];
        // Proper noun prefix if needed
        if (text[0] === text[0].toUpperCase() && text.length > 1) {
            return '·' + result;
        }
        return result;
    }

    // Try the main transliteration
    const standardResult = toShavian(text);
    if (standardResult !== text) {
        return standardResult;
    }

    // Otherwise, use the phonetic fallback
    const phoneticResult = englishToShavianPhonetic(text);
    if (phoneticResult) {
        if (text[0] === text[0].toUpperCase() && text.length > 1) {
            return '·' + phoneticResult;
        }
        return phoneticResult;
    }

    // If all else fails, return the input
    return text;
}

function transliterateWithQuotes(text) {
    // First, decode HTML entities
    text = text.replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'")
               .replace(/&apos;/g, "'");
    
    // Handle contractions first before any other processing
    for (const [contraction, shavian] of Object.entries(contractionMappings)) {
        const regex = new RegExp(`\\b${contraction.replace(/'/g, "\\'")}\\b`, 'gi');
        text = text.replace(regex, shavian);
    }
    
    // Split text into quoted and non-quoted segments
    const segments = [];
    let currentIndex = 0;
    let inQuotes = false;
    let quoteStart = -1;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        if (char === '"' || char === '"' || char === '"') {
            if (!inQuotes) {
                // Start of quote
                if (i > currentIndex) {
                    segments.push({
                        text: text.slice(currentIndex, i),
                        isQuoted: false
                    });
                }
                quoteStart = i;
                inQuotes = true;
            } else {
                // End of quote
                segments.push({
                    text: text.slice(quoteStart + 1, i),
                    isQuoted: true
                });
                inQuotes = false;
                currentIndex = i + 1;
            }
        }
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
        segments.push({
            text: text.slice(currentIndex),
            isQuoted: false
        });
    }
    
    // Transliterate each segment with phonetic fallback
    const transliteratedSegments = segments.map(segment => {
        if (segment.isQuoted) {
            return `"${transliterateWithPhoneticFallback(segment.text)}"`;
        } else {
            // Split non-quoted text into words and transliterate each
            const words = segment.text.split(/\b/);
            return words.map(word => {
                // Handle words with apostrophes (contractions)
                if (/^[A-Za-z']+$/.test(word)) {
                    return transliterateWithPhoneticFallback(word);
                }
                return word;
            }).join('');
        }
    });
    
    return transliteratedSegments.join('');
}

function transliterateHtmlEntities(htmlText) {
    // First, decode HTML entities to regular apostrophes
    let result = htmlText
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
    
    // Helper to check if a string contains any Shavian character
    function containsShavian(str) {
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            if (code >= 0x10450 && code <= 0x1047F) return true;
        }
        return false;
    }
    
    // Now apply phonetic transliteration to any remaining English words
    return result.replace(/\b[A-Za-z']+\b/g, (match) => {
        // Skip if it's already transliterated or is a contraction
        if (contractionMappings[match] || containsShavian(match)) {
            return match;
        }
        return transliterateWithPhoneticFallback(match);
    });
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
                    logProgress(i + 1, epub.flow.length, `Chapter ${i + 1}: ${chapter.title || chapter.id}`);
                    await new Promise((res, rej) => {
                        epub.getChapter(chapter.id, (err, text) => {
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
                            
                            // Remove other HTML tags, collapse whitespace
                            const textContent = processedText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                            
                            if (textContent.length > 0) {
                                const shavianText = transliterateWithQuotes(textContent);
                                
                                // Split into paragraphs by double newlines or periods (as fallback)
                                const originalParagraphs = textContent.split(/\n\s*\n|(?<=\.) /g).map(p => p.trim()).filter(p => p.length > 0);
                                const shavianParagraphs = shavianText.split(/\n\s*\n|(?<=\.) /g).map(p => p.trim()).filter(p => p.length > 0);
                                
                                // Create paragraph pairs (Shavian + Original if enabled)
                                const paragraphPairs = [];
                                for (let j = 0; j < shavianParagraphs.length; j++) {
                                    const shavianPara = shavianParagraphs[j];
                                    const originalPara = j < originalParagraphs.length ? originalParagraphs[j] : '';
                                    
                                    // Escape HTML for Shavian text (HTML entities already handled in transliteration)
                                    const escaped = escapeHtml(shavianPara);
                                    paragraphPairs.push(`<p class="calibre3">${escaped}</p>`);
                                    
                                    // Add original text if enabled and available
                                    if (includeOriginal && originalPara) {
                                        const escapedOriginal = escapeHtml(originalPara);
                                        paragraphPairs.push(`<p class="original-text">${escapedOriginal}</p>`);
                                    }
                                }
                                
                                const paragraphs = paragraphPairs.join('\n');
                                
                                // Generate unique ID for chapter
                                const chapterId = `chapter-${i + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                                
                                // Add images back to the content
                                let finalContent = `<h1 id=\"${chapterId}\">${escapeHtml(chapter.title || `Chapter ${i + 1}`)}</h1>\n<p class=\"calibre5\"></p>\n${paragraphs}`;
                                
                                // Insert images at appropriate positions (after paragraphs)
                                if (imagePlaceholders.length > 0) {
                                    finalContent += '\n';
                                    imagePlaceholders.forEach(({ placeholder, src }) => {
                                        const fileName = path.basename(src);
                                        finalContent += `<p class=\"calibre5\"><img src=\"images/${fileName}\" alt=\"Image\" style=\"max-width: 100%; height: auto;\"/></p>\n`;
                                    });
                                }
                                
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
                const htmlContent = `<?xml version='1.0' encoding='utf-8'?>
<html xmlns=\"http://www.w3.org/1999/xhtml\">
<head>
    <title>Shavian: ${escapeHtml(epub.metadata.title || 'Transliterated Book')}</title>
    <meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"/>
    <style>
        .calibre {
            display: block;
            font-size: 1em;
            padding-left: 0;
            padding-right: 0;
            text-align: justify;
            margin: 0 5pt;
        }
        .calibre1 {
            background-color: white;
            color: black;
            display: block;
            font-size: 2em;
            font-style: normal;
            font-weight: bold;
            line-height: 1.2;
            text-align: center;
            width: 100%;
            margin: 0.67em 0 8px;
        }
        .calibre3 {
            display: block;
            text-align: justify;
            text-indent: 1em;
            margin: 0;
        }
        .calibre4 {
            font-weight: bold;
        }
        .calibre5 {
            display: block;
            text-align: justify;
            text-indent: 1em;
            margin: 0 0 1em;
        }
        .calibre6 {
            font-style: italic;
        }
        .original-text {
            display: block;
            text-align: justify;
            text-indent: 1em;
            margin: 0 0 0.5em 2em;
            font-size: 0.8em;
            color: #666666;
            font-style: italic;
            border-left: 2px solid #cccccc;
            padding-left: 1em;
        }
    </style>
</head>
<body class=\"calibre\">
    <p class=\"calibre1\"> <b class=\"calibre4\">Shavian: ${escapeHtml(epub.metadata.title || 'Transliterated Book')}</b> </p>
    <p class=\"calibre5\"></p>
    <p class=\"calibre3\"> <i class=\"calibre6\">By ${escapeHtml(epub.metadata.creator || 'Unknown Author')}</i> </p>
    <p class=\"calibre5\"></p>
    <!-- Chapter Content -->
    ${chapters.map(chapter => chapter.content).join('\n')}
</body>
</html>`;
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

// Extract all images from EPUB and preserve them
function extractAllImages(inputFile, callback) {
    const { exec } = require('child_process');
    const fs = require('fs');
    
    // Create images directory if it doesn't exist
    const imagesDir = 'output/images';
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    // First, list all files in the EPUB to find images
    exec(`unzip -l "${inputFile}"`, (error, stdout, stderr) => {
        if (error) {
            log('⚠️  Could not read EPUB contents', 'yellow');
            callback(false);
            return;
        }
        
        // Find all image files in the EPUB
        const imageFiles = [];
        const lines = stdout.split('\n');
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'];
        
        for (const line of lines) {
            const match = line.match(/\s+(\d+)\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+(.+)$/);
            if (match) {
                const fileName = match[2].trim();
                const ext = path.extname(fileName).toLowerCase();
                if (imageExtensions.includes(ext)) {
                    imageFiles.push(fileName);
                }
            }
        }
        
        if (imageFiles.length === 0) {
            log('⚠️  No images found in EPUB', 'yellow');
            // Still try to extract common cover files even if not detected as images
            const coverAttempts = [
                'calibre_raster_cover.jpg',
                'cover.jpeg',
                'cover.jpg',
                'OEBPS/cover.jpg',
                'OEBPS/cover.jpeg',
                'OEBPS/calibre_raster_cover.jpg'
            ];
            
            function tryCover(attempts, index) {
                if (index >= attempts.length) {
                    callback(false);
                    return;
                }
                
                const coverFile = attempts[index];
                exec(`unzip -p "${inputFile}" "${coverFile}" > output/cover.jpg 2>/dev/null`, (error, stdout, stderr) => {
                    if (error) {
                        tryCover(attempts, index + 1);
                    } else {
                        log(`✅ Cover image extracted: ${coverFile}`, 'green');
                        callback('output/cover.jpg');
                    }
                });
            }
            
            tryCover(coverAttempts, 0);
            return;
        }
        
        log(`📷 Found ${imageFiles.length} image(s) in EPUB`, 'cyan');
        
        // Extract all images
        let extractedCount = 0;
        let coverFile = null;
        
        function extractNext(index) {
            if (index >= imageFiles.length) {
                log(`✅ Extracted ${extractedCount} image(s) to ${imagesDir}/`, 'green');
                callback(coverFile || false);
                return;
            }
            
            const imageFile = imageFiles[index];
            const fileName = path.basename(imageFile);
            const outputPath = path.join(imagesDir, fileName);
            
            exec(`unzip -p "${inputFile}" "${imageFile}" > "${outputPath}" 2>/dev/null`, (error, stdout, stderr) => {
                if (!error) {
                    extractedCount++;
                    log(`📷 Extracted: ${fileName}`, 'cyan');
                    
                    // Check if this might be the cover
                    const lowerFileName = fileName.toLowerCase();
                    if (!coverFile && (lowerFileName.includes('cover') || lowerFileName.includes('calibre_raster'))) {
                        coverFile = outputPath;
                        log(`📷 Using as cover: ${fileName}`, 'green');
                    }
                }
                
                extractNext(index + 1);
            });
        }
        
        extractNext(0);
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
        await convertToEpub(outputFile, `output/${fileName}-shavian.epub`, finalCoverFile);
        
        log('🔄 Converting to MOBI...', 'blue');
        await convertToMobi(`output/${fileName}-shavian.epub`, `output/${fileName}-shavian.mobi`, finalCoverFile);
        
        log(`✅ Successfully processed: ${path.basename(inputFile)}`, 'green');
        return true;
    } catch (error) {
        log(`❌ Error processing ${path.basename(inputFile)}: ${error.message}`, 'red');
        return false;
    }
}

function getEpubMetadata(inputFile, field) {
    return new Promise((resolve) => {
        const epub = new EPub(inputFile);
        epub.on('end', () => {
            resolve(epub.metadata[field]);
        });
        epub.on('error', () => {
            resolve(null);
        });
        epub.parse();
    });
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

function convertToEpub(htmlFile, epubFile, coverFile) {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        let command = `${EBOOK_CONVERT} "${htmlFile}" "${epubFile}"`;
        
        // Add EPUB-specific options for better compatibility
        command += ` --output-profile kindle --insert-metadata`;
        
        // Add cover if available
        if (coverFile && fs.existsSync(coverFile)) {
            command += ` --cover "${coverFile}"`;
            log(`📷 Using cover: ${path.basename(coverFile)}`, 'cyan');
        }
        
        log(`🔧 Running: ${command}`, 'magenta');
        exec(command, (error, stdout, stderr) => {
            if (error) {
                if (error.code === 127) {
                    log('❌ ebook-convert not found! Please install Calibre and ensure ebook-convert is in your PATH, or set EBOOK_CONVERT_PATH.', 'red');
                }
                reject(error);
            } else {
                log(`✅ EPUB created: ${path.basename(epubFile)}`, 'green');
                resolve();
            }
        });
    });
}

function convertToMobi(epubFile, mobiFile, coverFile) {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        let command = `${EBOOK_CONVERT} "${epubFile}" "${mobiFile}"`;
        
        // Add Kindle-specific options for better compatibility
        command += ` --mobi-file-type both --output-profile kindle --insert-metadata`;
        
        // Add cover if available
        if (coverFile && fs.existsSync(coverFile)) {
            command += ` --cover "${coverFile}"`;
            log(`📷 Using cover: ${path.basename(coverFile)}`, 'cyan');
        }
        
        log(`🔧 Running: ${command}`, 'magenta');
        exec(command, (error, stdout, stderr) => {
            if (error) {
                if (error.code === 127) {
                    log('❌ ebook-convert not found! Please install Calibre and ensure ebook-convert is in your PATH, or set EBOOK_CONVERT_PATH.', 'red');
                }
                reject(error);
            } else {
                log(`✅ MOBI created: ${path.basename(mobiFile)}`, 'green');
                resolve();
            }
        });
    });
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
}

// Run the main function
main().catch(error => {
    log(`❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
}); 