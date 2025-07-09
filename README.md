# Shavian Transliteration Tool

A Node.js tool that transliterates English text in EPUB files to the Shavian alphabet, preserving the original book cover and metadata.

## Features

- **Enhanced phonetic transliteration**: Advanced IPA-to-Shavian mapping with context-aware pronunciation rules
- **Improved image handling**: Better preservation and positioning of images within the text flow
- **Quote-aware text processing**: Intelligent handling of quoted dialogue and text segments
- **Fallback transliteration**: Phonetic fallback for words not found in the dictionary
- **Image preservation**: Extracts and preserves all images from the original EPUB
- **Cover preservation**: Automatically detects and includes the original book cover
- **Multiple output formats**: Generates HTML, EPUB, and MOBI files
- **Kindle-compatible navigation**: Uses proper HTML structure for native Kindle TOC and navigation
- **Metadata preservation**: Keeps title, author, and chapter names in Latin script for compatibility
- **Contraction handling**: Properly transliterates English contractions
- **Comprehensive testing**: Unit tests for core functionality using Vitest

## Prerequisites

- **Node.js** (v14 or higher)
- **Python 3** (for enhanced phonetic transliteration)
- **Calibre** (for EPUB/MOBI conversion)
  - macOS: Install via [calibre-ebook.com](https://calibre-ebook.com/)
  - The script expects Calibre at `/Applications/calibre.app/Contents/MacOS/ebook-convert`

## Installation

1. Clone or download this repository
2. Install Node.js and Python
3. Install node dependencies:
   ```bash
   npm install
   ```

**Note**: The script automatically detects and uses the virtual environment, so you don't need to manually activate it each time.

## Usage

### Basic Usage

1. **Place your EPUB file(s)** in the `input/` folder
2. **Run the transliteration**:
   ```bash
   node transliterate.js
   ```

The script will automatically:
- Find all EPUB files in the `input/` folder
- Process each one individually
- Generate output files in the `output/` folder
- Show progress with a nice interface

### Running Tests

```bash
npm test
```

This will run the comprehensive test suite covering:
- Text processing utilities
- Image segment extraction
- Sentence splitting with quotes
- Core transliteration functionality

### Example

```bash
# Place EPUB files in input/
# Run the script
node transliterate.js

# Run tests
npm test
```

### Output

For each EPUB file, the script generates:
- `output/[filename]-shavian.html` - HTML version with images
- `output/[filename]-shavian.epub` - EPUB version with cover and images
- `output/[filename]-shavian.mobi` - MOBI version with cover and images
- `output/cover.jpg` - Extracted cover image
- `output/images/` - Directory containing all extracted images

## Project Structure

```
shavian/
├── input/                    # Source files
│   ├── .gitkeep             # Git tracking
│   └── *.epub               # Input EPUB files
├── output/                   # Generated files
│   ├── *.html               # HTML output
│   ├── *.epub               # EPUB output
│   ├── *.mobi               # MOBI output
│   ├── cover.jpg            # Extracted cover
│   ├── images/              # Extracted images
│   │   └── *.jpg/png/gif    # All images from EPUB
│   └── .gitkeep             # Git tracking
├── lib/                      # Core library files
│   ├── latin2shaw-wrapper.js # Python wrapper for transliteration
│   ├── latin2shaw.py        # Enhanced Python transliteration engine
│   ├── text-utils.js        # Text processing utilities
│   ├── text-utils.test.js   # Tests for text utilities
│   ├── transliterate-core.js # Core transliteration logic
│   └── transliterate-core.test.js # Tests for core logic
├── scripts/                  # Build scripts
│   └── download-readlex.js   # Downloads ReadLex dictionary
├── transliterate.js          # Main script
├── test_splitting.js         # Sentence splitting test utility
├── package.json             # Dependencies and scripts
└── README.md               # This file
```

## How It Works

1. **Extract images**: Finds and extracts all images from the EPUB, including the cover
2. **Parse EPUB**: Reads all chapters and metadata
3. **Enhanced transliteration**: 
   - Uses dictionary-based transliteration first
   - Falls back to advanced phonetic mapping for unknown words
   - Handles proper nouns with namer dots (·)
   - Processes contractions and special cases
4. **Improved text processing**:
   - Intelligently splits sentences while preserving quoted dialogue
   - Handles image placeholders within text flow
   - Maintains proper paragraph structure
5. **Preserve images**: Maintains all illustrations and diagrams in the output
6. **Generate navigation**: Creates proper HTML structure for Kindle TOC and navigation
7. **Generate output**: Creates HTML, EPUB, and MOBI files with cover and images

## Transliteration Details

### Dictionary-Based Transliteration
- Uses the ReadLex dictionary for accurate word-to-word mapping
- Handles English contractions like "don't", "you're", etc.
- Preserves proper nouns with namer dots (·)

### Phonetic Fallback System
- **IPA mapping**: Converts English text to International Phonetic Alphabet
- **Context-aware rules**: Handles pronunciation variations based on word context
- **Shavian conversion**: Maps IPA symbols to appropriate Shavian characters
- **Fallback indicator**: Adds 🔤 symbol to phonetically transliterated words

### Enhanced Features
- **Quote preservation**: Maintains quoted dialogue structure
- **Image integration**: Seamlessly integrates images within text flow
- **HTML entity handling**: Processes apostrophes and quotes correctly
- **Virtual environment detection**: Automatically uses project's Python environment

## Customization

### Adding Custom Words

Edit the `contractionMappings` object in `input/transliterate.js`:

```javascript
const contractionMappings = {
    'custom-word': '𐑒𐑳𐑕𐑑𐑩𐑥-𐑢𐑻𐑛',
    // ... existing mappings
};
```

### Changing Output Paths

Modify the output file paths in the script:

```javascript
const outputFile = 'output/your-custom-name.html';
```

## Testing

The project includes comprehensive tests for core functionality:

```bash
# Run all tests
npm test

# Run specific test files
npx vitest lib/text-utils.test.js
npx vitest lib/transliterate-core.test.js
```

### Test Coverage
- **Text utilities**: Image segment extraction and sentence splitting
- **Core transliteration**: Chapter processing with images and quotes
- **Edge cases**: Various text scenarios and image placements

## Troubleshooting

### Calibre Not Found
- Ensure Calibre is installed at `/Applications/calibre.app/`
- For other systems, update the path in the script

### Cover Not Extracted
- The script automatically detects and extracts cover images
- It tries multiple common cover filenames and locations
- Check that your EPUB contains a cover image

### Transliteration Issues
- Check the console output for any errors
- Verify the input EPUB is valid and readable
- Words with 🔤 symbol are phonetically transliterated (fallback)

### Python Environment Issues
- The script automatically detects the project's virtual environment
- Ensure Python 3 is installed and accessible
- Check that required Python packages are installed

## Dependencies

### Node.js Dependencies
- `epub`: EPUB parsing
- `epub-gen`: EPUB generation
- `epub2`: Alternative EPUB handling
- `phonetic`: Phonetic processing
- `sentence-splitter`: Advanced sentence splitting
- `text-to-ipa`: Text to IPA conversion
- `vitest`: Testing framework

### Python Dependencies
- `spacy`: Natural language processing
- `en_core_web_sm`: English language model for spaCy

## License

This project is open source. Feel free to modify and distribute.

## Contributing

1. Fork the repository
2. Make your changes
3. Add tests for new functionality
4. Test with different EPUB files
5. Submit a pull request

## Notes

- The script preserves chapter titles and metadata in Latin script for Kindle compatibility
- Generated files are placed in the `output/` folder
- All images (including cover) are automatically extracted from the original EPUB
- The output uses Kindle-compatible HTML structure for proper navigation and TOC
- Phonetically transliterated words are marked with 🔤 for easy identification
- The enhanced transliteration system provides better accuracy for unknown words 