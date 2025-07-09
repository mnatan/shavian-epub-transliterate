const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');
const { URL } = require('url');

const READLEX_REPO = 'https://raw.githubusercontent.com/Shavian-info/readlex/main';
const READLEX_DIR = path.join(__dirname, '..', 'readlex');

// Files required by latin2shaw.py
const REQUIRED_FILES = [
    'readlex_converter.json',
    'readlex_converter_phrases.json'
];

console.log('📥 Checking Read Lexicon static files...');

try {
    // Create readlex directory if it doesn't exist
    if (!fs.existsSync(READLEX_DIR)) {
        console.log('📁 Creating readlex directory...');
        fs.mkdirSync(READLEX_DIR, { recursive: true });
    }

    // Check which files need to be downloaded
    const filesToDownload = [];
    for (const filename of REQUIRED_FILES) {
        const filePath = path.join(READLEX_DIR, filename);
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${filename} already exists, skipping download`);
        } else {
            filesToDownload.push(filename);
        }
    }

    // Download only missing files
    if (filesToDownload.length === 0) {
        console.log('✅ All required files already exist');
    } else {
        console.log(`📄 Downloading ${filesToDownload.length} missing file(s)...`);
        
        for (const filename of filesToDownload) {
            const fileUrl = `${READLEX_REPO}/${filename}`;
            const filePath = path.join(READLEX_DIR, filename);
            
            console.log(`📄 Downloading ${filename}...`);
            
            const file = fs.createWriteStream(filePath);
            https.get(fileUrl, (response) => {
                if (response.statusCode === 200) {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`✅ Downloaded ${filename}`);
                    });
                } else {
                    console.error(`❌ Failed to download ${filename}: ${response.statusCode}`);
                    process.exit(1);
                }
            }).on('error', (err) => {
                console.error(`❌ Error downloading ${filename}:`, err.message);
                process.exit(1);
            });
        }
    }

    // Install Python dependencies
    console.log('🐍 Installing Python dependencies...');
    try {
        execSync('source venv/bin/activate && pip install -r requirements.txt', { 
            cwd: path.join(__dirname, '..'), 
            stdio: 'inherit',
            shell: true 
        });
        
        console.log('📚 Installing spaCy English model...');
        execSync('source venv/bin/activate && python -m spacy download en_core_web_sm', { 
            cwd: path.join(__dirname, '..'), 
            stdio: 'inherit',
            shell: true 
        });
    } catch (error) {
        console.log('⚠️  Python dependencies installation failed, but continuing...');
        console.log('   You may need to install them manually:');
        console.log('   source venv/bin/activate && pip install -r requirements.txt');
        console.log('   source venv/bin/activate && python -m spacy download en_core_web_sm');
    }

    console.log('✅ Read Lexicon setup completed successfully!');
} catch (error) {
    console.error('❌ Error setting up Read Lexicon:', error.message);
    process.exit(1);
} 