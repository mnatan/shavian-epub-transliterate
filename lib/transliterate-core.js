const { splitSentencesWithQuotes } = require('./text-utils');

/**
 * Process a chapter's HTML/text, handling image placeholders and transliteration.
 * @param {string} text - The raw HTML/text of the chapter.
 * @param {Array<{placeholder: string, src: string}>} imagePlaceholders - List of image placeholders and their sources.
 * @param {Function} transliterateWithQuotes - Async function to transliterate a string.
 * @param {boolean} includeOriginal - Whether to include the original text.
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
  const textContent = processedText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

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
      paragraphPairs.push(`<p class="calibre2">${segment.placeholder}</p>`);
      if (includeOriginal) {
        paragraphPairs.push(`<p class="original-text">${segment.placeholder}</p>`);
      }
    } else {
      const sentences = splitSentencesWithQuotes(segment.content);
      for (const sentence of sentences) {
        const shavianSentence = await transliterateWithQuotes(sentence);
        paragraphPairs.push(`<p class="calibre2">${shavianSentence}</p>`);
        if (includeOriginal) {
          paragraphPairs.push(`<p class="original-text">${sentence}</p>`);
        }
      }
    }
  }

  const paragraphs = paragraphPairs.join('\n');
  let finalContent = `<h1 id="${chapterId}">${chapterTitle}</h1>\n<p class="calibre5"></p>\n${paragraphs}`;
  // Replace image placeholders with actual image tags
  imagePlaceholders.forEach(({ placeholder, src }) => {
    const fileName = src.split('/').pop();
    const imageTag = `<p class="calibre5"><img src="images/${fileName}" alt="Image" style="max-width: 100%; height: auto;"/></p>`;
    finalContent = finalContent.replace(placeholder, imageTag);
  });
  return finalContent;
}

module.exports = { processChapterText }; 