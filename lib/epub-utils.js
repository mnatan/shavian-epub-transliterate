const fs = require('fs');
const path = require('path');

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
            resolve(epub.metadata[field]);
        });
        epub.on('error', () => {
            resolve(null);
        });
        epub.parse();
    });
}

module.exports = {
    extractAllImages,
    getEpubMetadata,
}; 