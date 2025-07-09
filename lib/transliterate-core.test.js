import { describe, it, expect, vi } from 'vitest';
import { processChapterText } from './transliterate-core.js';

describe('processChapterText', () => {
  const mockTransliterate = vi.fn(async (s) => `[SHA:${s}]`);

  it('handles text with image placeholders and transliteration', async () => {
    const text = 'Hello <img src="img0.jpg" alt="img0"/> world! <img src="img1.jpg" alt="img1"/>';
    const imagePlaceholders = [
      { placeholder: '__IMAGE_PLACEHOLDER_0__', src: 'img0.jpg' },
      { placeholder: '__IMAGE_PLACEHOLDER_1__', src: 'img1.jpg' },
    ];
    // Replace <img> tags with placeholders for test input
    const html = text.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, (match, src) => {
      const found = imagePlaceholders.find(p => p.src === src);
      return found ? found.placeholder : match;
    });
    const result = await processChapterText({
      text: html,
      imagePlaceholders,
      transliterateWithQuotes: mockTransliterate,
      includeOriginal: true,
      chapterTitle: 'Test Chapter',
      chapterId: 'ch1',
    });
    expect(result).toContain('<h1 id="ch1">Test Chapter</h1>');
    expect(result).toContain('<img src="images/img0.jpg"');
    expect(result).toContain('<img src="images/img1.jpg"');
    expect(result).toContain('[SHA:Hello]');
    expect(result).toContain('[SHA:world!]');
    expect(result).toContain('<p class="original-text">Hello</p>');
    expect(result).toContain('<p class="original-text">world!</p>');
  });

  it('handles text with no images', async () => {
    const text = 'Just text. More text!';
    const result = await processChapterText({
      text,
      imagePlaceholders: [],
      transliterateWithQuotes: mockTransliterate,
      includeOriginal: false,
      chapterTitle: 'No Images',
      chapterId: 'ch2',
    });
    expect(result).toContain('[SHA:Just text.]');
    expect(result).toContain('[SHA:More text!]');
    expect(result).not.toContain('original-text');
  });

  it('handles only images', async () => {
    const text = '<img src="img0.jpg" alt="img0"/><img src="img1.jpg" alt="img1"/>';
    const imagePlaceholders = [
      { placeholder: '__IMAGE_PLACEHOLDER_0__', src: 'img0.jpg' },
      { placeholder: '__IMAGE_PLACEHOLDER_1__', src: 'img1.jpg' },
    ];
    const html = text.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, (match, src) => {
      const found = imagePlaceholders.find(p => p.src === src);
      return found ? found.placeholder : match;
    });
    const result = await processChapterText({
      text: html,
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

  it('handles nested and unclosed quotes', async () => {
    const text = 'He said, "This is a \"nested quote\" and this is unclosed: "Hello.';
    const result = await processChapterText({
      text,
      imagePlaceholders: [],
      transliterateWithQuotes: mockTransliterate,
      includeOriginal: false,
      chapterTitle: 'Quotes',
      chapterId: 'quotes',
    });
    // Quotes are HTML-escaped in output
    expect(result).toContain('[SHA:He said, &quot;This is a &quot;nested quote&quot; and this is unclosed: &quot;Hello.]');
  });
}); 