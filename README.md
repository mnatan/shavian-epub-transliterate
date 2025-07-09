# Shavian Transliteration Tool

A Node.js tool that transliterates English text in EPUB files to the Shavian alphabet, preserving the original book cover and metadata.

## Features

- **Phonetic transliteration**: Converts English text to Shavian using phonetic mapping
- **Cover preservation**: Extracts and includes the original book cover
- **Multiple output formats**: Generates HTML, EPUB, and MOBI files
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
- `output/[filename]-shavian.html` - HTML version
- `output/[filename]-shavian.epub` - EPUB version with cover
- `output/[filename]-shavian.mobi` - MOBI version with cover
- `output/cover.jpg` - Extracted cover image

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
│   └── .gitkeep             # Git tracking
├── transliterate.js          # Main script
├── package.json             # Dependencies
└── README.md               # This file
```

## How It Works

1. **Extract cover**: Finds and extracts the original book cover
2. **Parse EPUB**: Reads all chapters and metadata
3. **Transliterate text**: Converts English text to Shavian using phonetic mapping
4. **Preserve metadata**: Keeps titles and navigation in Latin script
5. **Generate output**: Creates HTML, EPUB, and MOBI files with cover

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
- The script tries `calibre_raster_cover.jpg` first, then `cover.jpeg`
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
- Cover images are automatically extracted from the original EPUB 