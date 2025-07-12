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

  describe('Book Title Filtering', () => {
    it('filters out book title paragraphs from chapter content', async () => {
      const text = '<p>Harry Potter and the Sorcerer\'s Stone</p><p>CHAPTER ONE</p><p>Mr. and Mrs. Dursley, of number four, Privet Drive, were proud to say that they were perfectly normal, thank you very much.</p>';
      const result = await processChapterText({
        text,
        imagePlaceholders: [],
        transliterateWithQuotes: mockTransliterate,
        includeOriginal: false,
        chapterTitle: 'Chapter 1',
        chapterId: 'chapter-1',
      });
      
      // Should NOT contain the book title
      expect(result).not.toContain('Harry Potter and the Sorcerer\'s Stone');
      // Should contain the chapter content
      expect(result).toContain('CHAPTER ONE');
      expect(result).toContain('Mr. and Mrs. Dursley');
    });

    it('filters book title regardless of case or punctuation', async () => {
      const text = '<p>HARRY POTTER AND THE SORCERER\'S STONE!</p><p>Chapter content here.</p>';
      const result = await processChapterText({
        text,
        imagePlaceholders: [],
        transliterateWithQuotes: mockTransliterate,
        includeOriginal: false,
        chapterTitle: 'Chapter 1',
        chapterId: 'chapter-1',
      });
      
      // Should NOT contain the book title (even with different case/punctuation)
      expect(result).not.toContain('HARRY POTTER AND THE SORCERER\'S STONE!');
      // Should contain the chapter content
      expect(result).toContain('Chapter content here.');
    });

    it('does not filter paragraphs that contain but are not exactly the book title', async () => {
      const text = '<p>This is about Harry Potter and the Sorcerer\'s Stone</p><p>Another paragraph about the book.</p>';
      const result = await processChapterText({
        text,
        imagePlaceholders: [],
        transliterateWithQuotes: mockTransliterate,
        includeOriginal: false,
        chapterTitle: 'Chapter 1',
        chapterId: 'chapter-1',
      });
      
      // Should contain paragraphs that mention the book title but are not exactly the title
      // Note: HTML entities are escaped in the output
      expect(result).toContain('This is about Harry Potter and the Sorcerer&#39;s Stone');
      expect(result).toContain('Another paragraph about the book.');
    });

    it('filters book title with extra whitespace', async () => {
      const text = '<p>  Harry Potter and the Sorcerer\'s Stone  </p><p>Chapter content.</p>';
      const result = await processChapterText({
        text,
        imagePlaceholders: [],
        transliterateWithQuotes: mockTransliterate,
        includeOriginal: false,
        chapterTitle: 'Chapter 1',
        chapterId: 'chapter-1',
      });
      
      // Should NOT contain the book title (even with extra whitespace)
      expect(result).not.toContain('Harry Potter and the Sorcerer\'s Stone');
      // Should contain the chapter content
      expect(result).toContain('Chapter content.');
    });

    it('handles multiple book title paragraphs in the same chapter', async () => {
      const text = '<p>Harry Potter and the Sorcerer\'s Stone</p><p>Some content.</p><p>Harry Potter and the Sorcerer\'s Stone</p><p>More content.</p>';
      const result = await processChapterText({
        text,
        imagePlaceholders: [],
        transliterateWithQuotes: mockTransliterate,
        includeOriginal: false,
        chapterTitle: 'Chapter 1',
        chapterId: 'chapter-1',
      });
      
      // Should NOT contain any book title instances
      expect(result).not.toContain('Harry Potter and the Sorcerer\'s Stone');
      // Should contain the actual content
      expect(result).toContain('Some content.');
      expect(result).toContain('More content.');
    });
  });

  describe('--skip-original Flag Behavior', () => {
    it('does not split paragraphs when includeOriginal is false', async () => {
      const text = '<p>First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence. Sixth sentence.</p>';
      const result = await processChapterText({
        text,
        imagePlaceholders: [],
        transliterateWithQuotes: mockTransliterate,
        includeOriginal: false, // --skip-original flag
        chapterTitle: 'Long Paragraph',
        chapterId: 'long',
      });
      
      // Should NOT be split into chunks when includeOriginal is false
      expect(result).toContain('First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence. Sixth sentence.');
      // Should only have one transliterated paragraph (no splitting)
      const shavianParagraphs = (result.match(/<p class="calibre2">/g) || []).length;
      expect(shavianParagraphs).toBe(1);
    });

    it('does not include original text when includeOriginal is false', async () => {
      const text = '<p>Hello world!</p>';
      const result = await processChapterText({
        text,
        imagePlaceholders: [],
        transliterateWithQuotes: mockTransliterate,
        includeOriginal: false, // --skip-original flag
        chapterTitle: 'Test Chapter',
        chapterId: 'test',
      });
      
      // Should contain the transliterated text
      expect(result).toContain('Hello world!');
      // Should NOT contain any original-text paragraphs
      expect(result).not.toContain('original-text');
      expect(result).not.toContain('<p class="original-text">');
    });

    it('includes original text when includeOriginal is true', async () => {
      const text = '<p>Hello world!</p>';
      const result = await processChapterText({
        text,
        imagePlaceholders: [],
        transliterateWithQuotes: mockTransliterate,
        includeOriginal: true, // Default behavior
        chapterTitle: 'Test Chapter',
        chapterId: 'test',
      });
      
      // Should contain both transliterated and original text
      expect(result).toContain('Hello world!');
      expect(result).toContain('<p class="original-text">Hello world!</p>');
    });

    it('splits paragraphs when includeOriginal is true', async () => {
      const text = '<p>First. Second. Third. Fourth. Fifth. Sixth.</p>';
      const result = await processChapterText({
        text,
        imagePlaceholders: [],
        transliterateWithQuotes: mockTransliterate,
        includeOriginal: true, // Default behavior
        chapterTitle: 'Test Chapter',
        chapterId: 'test',
      });
      
      // Should be split into chunks when includeOriginal is true
      expect(result).toContain('First. Second. Third.');
      expect(result).toContain('Fourth. Fifth. Sixth.');
      // Should have multiple transliterated paragraphs
      const shavianParagraphs = (result.match(/<p class="calibre2">/g) || []).length;
      expect(shavianParagraphs).toBe(2);
    });
  });

  describe('Quote Handling and Guillemet Conversion', () => {
    it('converts quotes to guillemets via Python module', async () => {
      const text = '<p>He said "Hello world" and left.</p>';
      const result = await processChapterText({
        text,
        imagePlaceholders: [],
        transliterateWithQuotes: mockTransliterate,
        includeOriginal: false,
        chapterTitle: 'Quote Test',
        chapterId: 'quote-test',
      });
      
      // Should convert quotes to « and » (via the mock that simulates Python module)
      expect(result).toContain('He said «Hello world» and left.');
      // Should NOT contain straight quotes in the output
      expect(result).not.toContain('"Hello world"');
    });

    it('handles mixed quote types correctly', async () => {
      const text = '<p>He said "Hello" and she said \'Goodbye\'.</p>';
      const result = await processChapterText({
        text,
        imagePlaceholders: [],
        transliterateWithQuotes: mockTransliterate,
        includeOriginal: false,
        chapterTitle: 'Mixed Quotes',
        chapterId: 'mixed-quotes',
      });
      
      // Should handle both double and single quotes
      // Note: Single quotes are HTML-escaped in the output
      expect(result).toContain('He said «Hello» and she said &#39;Goodbye&#39;.');
    });

    it('handles multiple quote pairs in sequence', async () => {
      const text = '<p>"First quote" then "second quote" and "third quote".</p>';
      const result = await processChapterText({
        text,
        imagePlaceholders: [],
        transliterateWithQuotes: mockTransliterate,
        includeOriginal: false,
        chapterTitle: 'Multiple Quotes',
        chapterId: 'multiple-quotes',
      });
      
      // Should convert all quote pairs to guillemets
      expect(result).toContain('«First quote» then «second quote» and «third quote».');
    });

    it('handles quotes with punctuation inside', async () => {
      const text = '<p>He shouted "Stop!" and asked "How are you?"</p>';
      const result = await processChapterText({
        text,
        imagePlaceholders: [],
        transliterateWithQuotes: mockTransliterate,
        includeOriginal: false,
        chapterTitle: 'Quotes with Punctuation',
        chapterId: 'quotes-punct',
      });
      
      // Should preserve punctuation inside quotes
      expect(result).toContain('He shouted «Stop!» and asked «How are you?»');
    });

    it('handles unclosed quotes gracefully', async () => {
      const text = '<p>He started to say "Hello but never finished.</p>';
      const result = await processChapterText({
        text,
        imagePlaceholders: [],
        transliterateWithQuotes: mockTransliterate,
        includeOriginal: false,
        chapterTitle: 'Unclosed Quotes',
        chapterId: 'unclosed-quotes',
      });
      
      // Should handle unclosed quotes (mock alternates « and »)
      expect(result).toContain('He started to say «Hello but never finished.');
    });

    it('handles quotes with HTML entities', async () => {
      const text = '<p>He said &quot;Hello world&quot; and left.</p>';
      const result = await processChapterText({
        text,
        imagePlaceholders: [],
        transliterateWithQuotes: mockTransliterate,
        includeOriginal: false,
        chapterTitle: 'HTML Entities',
        chapterId: 'html-entities',
      });
      
      // Should handle HTML-encoded quotes (they remain as HTML entities)
      expect(result).toContain('He said &amp;quot;Hello world&amp;quot; and left.');
    });

    it('handles quotes in dialogue with attribution', async () => {
      const text = '<p>"Hello," said Harry. "How are you?" asked Hermione.</p>';
      const result = await processChapterText({
        text,
        imagePlaceholders: [],
        transliterateWithQuotes: mockTransliterate,
        includeOriginal: false,
        chapterTitle: 'Dialogue',
        chapterId: 'dialogue',
      });
      
      // Should handle complex dialogue with attribution
      expect(result).toContain('«Hello,» said Harry. «How are you?» asked Hermione.');
    });
  });
}); 