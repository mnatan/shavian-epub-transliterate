# Shavian Transliteration Tool

Converts English EPUB files to Shavian script while preserving original formatting, images, and metadata.

## Features

- **Dictionary-based transliteration** using ReadLex with phonetic fallback
- **Contraction handling** (don't, can't, etc.) with proper Shavian equivalents
- **Image preservation** including covers and illustrations
- **Multiple outputs**: HTML, EPUB, and MOBI formats
- **Quote-aware processing** that maintains dialogue structure
- **Proper noun marking** with namer dots (·)

## Prerequisites

- Node.js (v14+)
- Python 3 with spaCy and English model (`pip install spacy && python -m spacy download en_core_web_sm`)
- espeak (for phonetic transliteration)
- Calibre (for EPUB/MOBI conversion)

## Installation

```bash
git clone <repository>
cd shavian
npm install
```

## Usage

1. Place EPUB files in `input/` directory
2. Run: `npm run transliterate`
3. Find outputs in `output/` directory

## Project Structure

```
shavian/
├── input/                    # Source EPUB files
├── output/                   # Generated files
├── lib/                      # Core library
│   ├── transliterate.js      # Main entry point
│   ├── latin2shaw.py         # Python transliteration engine
│   ├── transliterate-core.js # Core processing logic
│   ├── epub-utils.js         # EPUB handling
│   ├── output-utils.js       # Output formatting
│   └── text-utils.js         # Text processing
├── scripts/
│   └── download-readlex.js   # Dictionary downloader
└── readlex/                  # ReadLex dictionary data
```

## Testing

```bash
npm test
```

## How It Works

1. Extracts images and metadata from EPUB
2. Processes text through ReadLex dictionary
3. Falls back to phonetic transliteration for unknown words
4. Handles contractions and special cases
5. Preserves images and formatting
6. Generates HTML, EPUB, and MOBI outputs

## Dependencies

- **Node.js**: epub, sentence-splitter, text-to-ipa
- **Python**: spacy, en_core_web_sm, unidecode, beautifulsoup4, smartypants
- **System**: espeak 