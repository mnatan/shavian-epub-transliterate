# Shavian Transliteration Tool

A Node.js tool that transliterates English text in EPUB files to the Shavian alphabet, preserving the original book cover and metadata.

## Features

- **Phonetic transliteration**: Converts English text to Shavian using phonetic mapping
- **Image preservation**: Extracts and preserves all images from the original EPUB
- **Cover preservation**: Automatically detects and includes the original book cover
- **Multiple output formats**: Generates HTML, EPUB, and MOBI files
- **Kindle-compatible navigation**: Uses proper HTML structure for native Kindle TOC and navigation
- **Metadata preservation**: Keeps title, author, and chapter names in Latin script for compatibility
- **Contraction handling**: Properly transliterates English contractions

## Prerequisites

- **Node.js** (v14 or higher)
- **Calibre** (for EPUB/MOBI conversion)
  - macOS: Install via [calibre-ebook.com](https://calibre-ebook.com/)
  - The script expects Calibre at `/Applications/calibre.app/Contents/MacOS/ebook-convert`

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

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

### Example

```bash
# Place EPUB files in input/
# Run the script
node transliterate.js
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
├── transliterate.js          # Main script
├── package.json             # Dependencies
└── README.md               # This file
```

## How It Works

1. **Extract images**: Finds and extracts all images from the EPUB, including the cover
2. **Parse EPUB**: Reads all chapters and metadata
3. **Transliterate text**: Converts English text to Shavian using phonetic mapping
4. **Preserve images**: Maintains all illustrations and diagrams in the output
5. **Generate navigation**: Creates proper HTML structure for Kindle TOC and navigation
6. **Generate output**: Creates HTML, EPUB, and MOBI files with cover and images

## Transliteration Details

- **Phonetic mapping**: Uses English-to-Shavian phonetic rules
- **Proper nouns**: Adds the `·` prefix for capitalized words
- **Contractions**: Handles English contractions like "don't", "you're", etc.
- **HTML entities**: Processes apostrophes and quotes correctly

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

## Dependencies

- `epub`: EPUB parsing
- `to-shavian`: Basic Shavian transliteration
- `child_process`: System commands for Calibre

## License

This project is open source. Feel free to modify and distribute.

## Contributing

1. Fork the repository
2. Make your changes
3. Test with different EPUB files
4. Submit a pull request

## Notes

- The script preserves chapter titles and metadata in Latin script for Kindle compatibility
- Generated files are placed in the `output/` folder
- All images (including cover) are automatically extracted from the original EPUB
- The output uses Kindle-compatible HTML structure for proper navigation and TOC 