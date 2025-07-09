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
}); 