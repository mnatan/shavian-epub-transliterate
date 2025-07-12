import { describe, it, expect, vi } from 'vitest';
import { processChapterText } from '../lib/transliterate-core.js';
import { generateHtml } from '../lib/output-utils.js';

describe('Full Pipeline Integration', () => {
  it('processes a chapter and generates HTML output', async () => {
    const mockTransliterate = vi.fn(async (s) => `[SHA:${s}]`);
    const imagePlaceholders = [
      { placeholder: '__IMAGE_PLACEHOLDER_0__', src: 'img0.jpg' },
      { placeholder: '__IMAGE_PLACEHOLDER_1__', src: 'img1.jpg' },
    ];
    // Use a <p> block for text, and images as separate placeholders
    const text = '<p>Hello world!</p> __IMAGE_PLACEHOLDER_0__ __IMAGE_PLACEHOLDER_1__';
    const chapterHtml = await processChapterText({
      text,
      imagePlaceholders,
      transliterateWithQuotes: mockTransliterate,
      includeOriginal: true,
      chapterTitle: 'Integration Chapter',
      chapterId: 'integration-1',
    });
    const html = generateHtml({
      chapters: [{ content: chapterHtml }],
      metadata: { title: 'Integration Test', creator: 'Test Author' },
    });
    expect(html).toContain('<title>Shavian: Integration Test</title>');
    expect(html).toContain('By Test Author');
    expect(html).toContain('<h1 id="integration-1">Integration Chapter</h1>');
    expect(html).toContain('<img src="images/img0.jpg"');
    expect(html).toContain('<img src="images/img1.jpg"');
    // Now, the whole paragraph is transliterated as a unit
    expect(html).toContain('[SHA:Hello world!]');
    expect(html).toContain('<p class="original-text">Hello world!</p>');
  });
}); 