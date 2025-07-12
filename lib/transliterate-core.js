const { escapeHtml } = require('./text-utils');
const { split } = require('sentence-splitter');

/**
 * Process a chapter's HTML/text, handling image placeholders and transliteration.
 * @param {string} text - The raw HTML/text of the chapter.
 * @param {Array<{placeholder: string, src: string}>} imagePlaceholders - List of image placeholders and their sources.
 * @param {Function} transliterateWithQuotes - Async function to transliterate a string.
 * @param {boolean} includeOriginal - Whether to include the original text.
 * @param {string} chapterTitle - Title of the chapter.
 * @param {string} chapterId - Unique ID for the chapter.
 * @returns {Promise<string>} - The processed HTML content for the chapter.
 */
async function processChapterText({
  text,
  imagePlaceholders = [],
  transliterateWithQuotes,
  includeOriginal = false,
  chapterTitle = '',
  chapterId = 'chapter-1',
}) {
  // Replace image tags with placeholders (already done in epub-utils)
  // Extract paragraphs from the raw HTML
  // We'll use a simple regex to extract <p>...</p> blocks, and also handle images as their own blocks
  const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const imageRegex = /__IMAGE_PLACEHOLDER_\d+__/g;

  // Find all paragraphs
  let paragraphs = [];
  let match;
  while ((match = paragraphRegex.exec(text)) !== null) {
    paragraphs.push({ type: 'text', content: match[1].trim() });
  }

  // If no paragraphs found, fallback to splitting by double newlines or the whole text
  if (paragraphs.length === 0) {
    const fallback = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    paragraphs = fallback.map(content => ({ type: 'text', content }));
  }

  // Insert image placeholders as their own blocks in the correct order
  // We'll split the text on image placeholders and interleave them
  let blocks = [];
  let lastIndex = 0;
  let imgMatch;
  imageRegex.lastIndex = 0;
  while ((imgMatch = imageRegex.exec(text)) !== null) {
    const before = text.slice(lastIndex, imgMatch.index);
    if (before.trim()) {
      // Extract paragraphs from this chunk
      let paraMatch;
      paragraphRegex.lastIndex = 0;
      while ((paraMatch = paragraphRegex.exec(before)) !== null) {
        blocks.push({ type: 'text', content: paraMatch[1].trim() });
      }
    }
    blocks.push({ type: 'image', placeholder: imgMatch[0] });
    lastIndex = imgMatch.index + imgMatch[0].length;
  }
  // Add any remaining paragraphs after the last image
  const after = text.slice(lastIndex);
  if (after.trim()) {
    let paraMatch;
    paragraphRegex.lastIndex = 0;
    while ((paraMatch = paragraphRegex.exec(after)) !== null) {
      blocks.push({ type: 'text', content: paraMatch[1].trim() });
    }
  }
  // If no blocks found, fallback to paragraphs
  if (blocks.length === 0) blocks = paragraphs;

  // Split long paragraphs into chunks of max 3 sentences using robust sentence splitter
  const splitLongParagraphs = (content) => {
    // Use the robust sentence-splitter library
    const nodes = split(content);
    const sentences = nodes
      .filter(node => node.type === 'Sentence')
      .map(node => node.raw.trim())
      .filter(sentence => sentence.length > 0);
    
    if (sentences.length <= 3) {
      return [content]; // No splitting needed
    }
    
    // Split into chunks of 3 sentences
    const chunks = [];
    for (let i = 0; i < sentences.length; i += 3) {
      const chunk = sentences.slice(i, i + 3).join(' ').replace(/\s+/g, ' ').trim();
      if (chunk) {
        chunks.push(chunk);
      }
    }
    return chunks;
  };

  // Create paragraph pairs (Shavian + Original if enabled)
  const paragraphPairs = [];
  for (const block of blocks) {
    if (block.type === 'image') {
      const imgObj = imagePlaceholders.find(p => p.placeholder === block.placeholder);
      if (imgObj) {
        const fileName = imgObj.src.split('/').pop();
        const imageTag = `<img src="images/${fileName}" alt="Image" style="max-width: 100%; height: auto;"/>`;
        paragraphPairs.push(`<p class="calibre5">${imageTag}</p>`);
        if (includeOriginal) {
          // Optionally, output a caption or nothing
        }
      }
    } else if (block.type === 'text' && block.content) {
      // Split long paragraphs into chunks of max 3 sentences
      const chunks = splitLongParagraphs(block.content);
      
      for (const chunk of chunks) {
        // Transliterate each chunk as a unit
        const shavianChunk = await transliterateWithQuotes(chunk);
        const escaped = escapeHtml(shavianChunk);
        paragraphPairs.push(`<p class="calibre2">${escaped}</p>`);
        if (includeOriginal) {
          const escapedOriginal = escapeHtml(chunk);
          paragraphPairs.push(`<p class="original-text">${escapedOriginal}</p>`);
        }
      }
    }
  }

  const paragraphsHtml = paragraphPairs.join('\n');
  let finalContent = `<h1 id="${chapterId}">${chapterTitle}</h1>\n<p class="calibre5"></p>\n${paragraphsHtml}`;
  return finalContent;
}

module.exports = { processChapterText }; 