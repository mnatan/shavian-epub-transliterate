const fs = require('fs');
const path = require('path');
const { renderProgressBar } = require('./utils');

// Extract all images from EPUB and preserve them
function extractAllImages(inputFile, callback) {
    const { exec } = require('child_process');
    // Create images directory if it doesn't exist
    const imagesDir = 'output/images';
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }
    // First, list all files in the EPUB to find images
    exec(`unzip -l "${inputFile}"`, (error, stdout, stderr) => {
        if (error) {
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
                        callback('output/cover.jpg');
                    }
                });
            }
            tryCover(coverAttempts, 0);
            return;
        }
        // Extract all images
        let extractedCount = 0;
        let coverFile = null;
        function extractNext(index) {
            if (index >= imageFiles.length) {
                callback(coverFile || false);
                return;
            }
            const imageFile = imageFiles[index];
            const fileName = path.basename(imageFile);
            const outputPath = path.join(imagesDir, fileName);
            exec(`unzip -p "${inputFile}" "${imageFile}" > "${outputPath}" 2>/dev/null`, (error, stdout, stderr) => {
                if (!error) {
                    extractedCount++;
                    // Check if this might be the cover
                    const lowerFileName = fileName.toLowerCase();
                    if (!coverFile && (lowerFileName.includes('cover') || lowerFileName.includes('calibre_raster'))) {
                        coverFile = outputPath;
                    }
                }
                extractNext(index + 1);
            });
        }
        extractNext(0);
    });
}

// Get EPUB metadata (title, author, etc.)
function getEpubMetadata(inputFile, field, EPubClass) {
    EPubClass = EPubClass || require('epub');
    return new Promise((resolve) => {
        const epub = new EPubClass(inputFile);
        epub.on('end', () => {
            if (!epub.metadata || typeof epub.metadata[field] === 'undefined') {
                resolve(null);
            } else {
                resolve(epub.metadata[field]);
            }
        });
        epub.on('error', () => {
            resolve(null);
        });
        epub.parse();
    });
}

const { processChapterText } = require('./transliterate-core');
const { generateHtml, convertToEpub, convertToMobi } = require('./output-utils');
const { latin2shaw, closePythonProcess } = require('./latin2shaw-wrapper');
const EPub = require('epub');

async function transliterateEpub(inputPath, outputPath, includeOriginal = false, log = () => {}, transliterateWithQuotes = latin2shaw) {
    return new Promise((resolve, reject) => {
        const epub = new EPub(inputPath);
        epub.on('error', (err) => {
            log('EPUB error: ' + err, 'red');
            reject(err);
        });
        epub.on('end', async () => {
            try {
                const chapters = [];
                log(`📖 Processing ${epub.flow.length} chapters...`, 'blue');
                for (let i = 0; i < epub.flow.length; i++) {
                    const chapter = epub.flow[i];
                    // Progress bar is optional
                    await new Promise((res) => {
                        epub.getChapterRaw(chapter.id, async (err, text) => {
                            if (err) {
                                log(`Error extracting chapter ${i + 1}: ${err}`, 'red');
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
                            // Pass the raw HTML (with placeholders) to processChapterText
                            if (processedText.length > 0) {
                                const chapterId = `chapter-${i + 1}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                                const finalContent = await processChapterText({
                                    text: processedText,
                                    imagePlaceholders,
                                    transliterateWithQuotes,
                                    includeOriginal,
                                    chapterTitle: chapter.title || `Chapter ${i + 1}`,
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
                    renderProgressBar(i + 1, epub.flow.length);
                }
                if (chapters.length === 0) {
                    log('No chapters with content found.', 'red');
                    return reject(new Error('No chapters with content found.'));
                }
                // Generate HTML file with Kindle-compatible structure
                const htmlContent = generateHtml({
                    chapters,
                    metadata: {
                        title: epub.metadata.title || 'Transliterated Book',
                        creator: epub.metadata.creator || 'Unknown Author',
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

async function processEpubFile(inputFile, includeOriginal = false, log = () => {}, transliterateEpubFn = transliterateEpub, findEbookConvert = () => null, transliterateWithQuotes = latin2shaw) {
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
        await transliterateEpubFn(inputFile, outputFile, includeOriginal, log, transliterateWithQuotes);
        // Find ebook-convert path
        const EBOOK_CONVERT = findEbookConvert();
        if (!EBOOK_CONVERT) {
            throw new Error('Could not find ebook-convert! Please install Calibre and ensure ebook-convert is in your PATH or set EBOOK_CONVERT_PATH.');
        }
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

module.exports = {
    extractAllImages,
    getEpubMetadata,
    transliterateEpub,
    processEpubFile,
}; 