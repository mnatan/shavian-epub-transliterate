import { describe, it, expect, vi } from 'vitest';
import { processChapterText } from './transliterate-core.js';

describe('processChapterText', () => {
  // Mock that simulates the Python latin2shaw module behavior
  const mockTransliterate = vi.fn(async (text) => {
    // Simulate the Python module which converts quotes to « and »
    // This is a simplified version - the real Python module uses smartypants for proper quote conversion
    let result = text;
    let quoteCount = 0;
    result = result.replace(/"/g, (match) => {
      quoteCount++;
      return quoteCount % 2 === 1 ? '«' : '»';
    });
    return result;
  });

  it('handles text with image placeholders and transliteration', async () => {
    // Use a <p> for text, and images as separate placeholders
    const text = '<p>Hello world!</p> __IMAGE_PLACEHOLDER_0__ __IMAGE_PLACEHOLDER_1__';
    const imagePlaceholders = [
      { placeholder: '__IMAGE_PLACEHOLDER_0__', src: 'img0.jpg' },
      { placeholder: '__IMAGE_PLACEHOLDER_1__', src: 'img1.jpg' },
    ];
    const result = await processChapterText({
      text,
      imagePlaceholders,
      transliterateWithQuotes: mockTransliterate,
      includeOriginal: true,
      chapterTitle: 'Test Chapter',
      chapterId: 'ch1',
    });
    expect(result).toContain('<h1 id="ch1">Test Chapter</h1>');
    expect(result).toContain('<img src="images/img0.jpg"');
    expect(result).toContain('<img src="images/img1.jpg"');
    // Now, the whole paragraph is transliterated as a unit
    expect(result).toContain('Hello world!');
    expect(result).toContain('<p class="original-text">Hello world!</p>');
  });

  it('handles text with no images', async () => {
    const text = '<p>Just text. More text!</p>';
    const result = await processChapterText({
      text,
      imagePlaceholders: [],
      transliterateWithQuotes: mockTransliterate,
      includeOriginal: false,
      chapterTitle: 'No Images',
      chapterId: 'ch2',
    });
    // The whole paragraph is transliterated as a unit
    expect(result).toContain('Just text. More text!');
    expect(result).not.toContain('original-text');
  });

  it('handles only images', async () => {
    const text = '__IMAGE_PLACEHOLDER_0____IMAGE_PLACEHOLDER_1__';
    const imagePlaceholders = [
      { placeholder: '__IMAGE_PLACEHOLDER_0__', src: 'img0.jpg' },
      { placeholder: '__IMAGE_PLACEHOLDER_1__', src: 'img1.jpg' },
    ];
    const result = await processChapterText({
      text,
      imagePlaceholders,
      transliterateWithQuotes: mockTransliterate,
      includeOriginal: false,
      chapterTitle: 'Only Images',
      chapterId: 'ch3',
    });
    expect(result).toContain('<img src="images/img0.jpg"');
    expect(result).toContain('<img src="images/img1.jpg"');
  });

  it('handles empty input', async () => {
    const result = await processChapterText({
      text: '',
      imagePlaceholders: [],
      transliterateWithQuotes: mockTransliterate,
      includeOriginal: false,
      chapterTitle: 'Empty',
      chapterId: 'empty',
    });
    expect(result).toContain('<h1 id="empty">Empty</h1>');
    // Should not throw or crash
  });

  it('handles input with only punctuation or whitespace', async () => {
    const result = await processChapterText({
      text: '   ...   !!!   ',
      imagePlaceholders: [],
      transliterateWithQuotes: mockTransliterate,
      includeOriginal: false,
      chapterTitle: 'Punct',
      chapterId: 'punct',
    });
    expect(result).toContain('<h1 id="punct">Punct</h1>');
  });

  it('handles nested and unclosed quotes as a single paragraph', async () => {
    const text = '<p>He said, "This is a \"nested quote\" and this is unclosed: "Hello.</p>';
    const result = await processChapterText({
      text,
      imagePlaceholders: [],
      transliterateWithQuotes: mockTransliterate,
      includeOriginal: false,
      chapterTitle: 'Quotes',
      chapterId: 'quotes',
    });
    // The whole paragraph is transliterated as a unit, and quotes are converted to « and »
    expect(result).toContain('He said, «This is a »nested quote« and this is unclosed: »Hello.');
  });

  it('splits long paragraphs into chunks of max 3 sentences', async () => {
    const text = '<p>First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence. Sixth sentence.</p>';
    const result = await processChapterText({
      text,
      imagePlaceholders: [],
      transliterateWithQuotes: mockTransliterate,
      includeOriginal: true,
      chapterTitle: 'Long Paragraph',
      chapterId: 'long',
    });
    // Should be split into 2 chunks of 3 sentences each
    expect(result).toContain('First sentence. Second sentence. Third sentence.');
    expect(result).toContain('Fourth sentence. Fifth sentence. Sixth sentence.');
    expect(result).toContain('<p class="original-text">First sentence. Second sentence. Third sentence.</p>');
    expect(result).toContain('<p class="original-text">Fourth sentence. Fifth sentence. Sixth sentence.</p>');
  });

  it('does not split short paragraphs', async () => {
    const text = '<p>First sentence. Second sentence. Third sentence.</p>';
    const result = await processChapterText({
      text,
      imagePlaceholders: [],
      transliterateWithQuotes: mockTransliterate,
      includeOriginal: false,
      chapterTitle: 'Short Paragraph',
      chapterId: 'short',
    });
    // Should not be split since it's exactly 3 sentences
    expect(result).toContain('First sentence. Second sentence. Third sentence.');
    // Should only have one transliterated paragraph
    const shavianParagraphs = (result.match(/<p class="calibre2">/g) || []).length;
    expect(shavianParagraphs).toBe(1);
  });

  it('handles abbreviations correctly with sentence splitter', async () => {
    const text = '<p>Dr. Smith said hello! Mr. Jones replied. Mrs. Brown agreed.</p>';
    const result = await processChapterText({
      text,
      imagePlaceholders: [],
      transliterateWithQuotes: mockTransliterate,
      includeOriginal: false,
      chapterTitle: 'Abbreviations',
      chapterId: 'abbrev',
    });
    // Should handle Dr., Mr., Mrs. correctly and not split on them
    expect(result).toContain('Dr. Smith said hello! Mr. Jones replied. Mrs. Brown agreed.');
    // Should only have one transliterated paragraph (no false splits on abbreviations)
    const shavianParagraphs = (result.match(/<p class="calibre2">/g) || []).length;
    expect(shavianParagraphs).toBe(1);
  });

  it('handles complex punctuation and quotes', async () => {
    const text = '<p>He said "Hello!" and she replied "How are you?" I am fine.</p>';
    const result = await processChapterText({
      text,
      imagePlaceholders: [],
      transliterateWithQuotes: mockTransliterate,
      includeOriginal: false,
      chapterTitle: 'Complex Punctuation',
      chapterId: 'complex',
    });
    // Should handle quotes and multiple punctuation marks correctly (converted to « and »)
    expect(result).toContain('He said «Hello!» and she replied «How are you?» I am fine.');
    // Should only have one transliterated paragraph
    const shavianParagraphs = (result.match(/<p class="calibre2">/g) || []).length;
    expect(shavianParagraphs).toBe(1);
  });
}); 