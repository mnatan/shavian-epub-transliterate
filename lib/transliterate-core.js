const { splitSentencesWithQuotes, escapeHtml, stripHtml, collapseWhitespace } = require('./text-utils');

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
  // Remove HTML tags, collapse whitespace, but preserve image placeholders
  let processedText = text.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, (match, src) => {
    const found = imagePlaceholders.find(p => p.src === src);
    return found ? found.placeholder : match;
  });
  const textContent = collapseWhitespace(stripHtml(processedText));

  // Split text into segments, separating image placeholders from regular text
  const segments = [];
  let currentText = textContent;
  imagePlaceholders.forEach(({ placeholder }) => {
    const parts = currentText.split(placeholder);
    if (parts.length > 1) {
      if (parts[0].trim()) {
        segments.push({ type: 'text', content: parts[0].trim() });
      }
      segments.push({ type: 'image', placeholder });
      currentText = parts.slice(1).join(placeholder);
    }
  });
  if (currentText.trim()) {
    segments.push({ type: 'text', content: currentText.trim() });
  }

  // Create paragraph pairs (Shavian + Original if enabled)
  const paragraphPairs = [];
  for (const segment of segments) {
    if (segment.type === 'image') {
      const imgObj = imagePlaceholders.find(p => p.placeholder === segment.placeholder);
      if (imgObj) {
        const fileName = imgObj.src.split('/').pop();
        const imageTag = `<img src="images/${fileName}" alt="Image" style="max-width: 100%; height: auto;"/>`;
        paragraphPairs.push(`<p class="calibre5">${imageTag}</p>`);
        if (includeOriginal) {
          // Optionally, output a caption or nothing
        }
      }
    } else {
      const sentences = splitSentencesWithQuotes(segment.content);
      for (const sentence of sentences) {
        const shavianSentence = await transliterateWithQuotes(sentence);
        const escaped = escapeHtml(shavianSentence);
        paragraphPairs.push(`<p class="calibre2">${escaped}</p>`);
        if (includeOriginal) {
          const escapedOriginal = escapeHtml(sentence);
          paragraphPairs.push(`<p class="original-text">${escapedOriginal}</p>`);
        }
      }
    }
  }

  const paragraphs = paragraphPairs.join('\n');
  let finalContent = `<h1 id="${chapterId}">${chapterTitle}</h1>\n<p class="calibre5"></p>\n${paragraphs}`;
  return finalContent;
}

module.exports = { processChapterText }; 