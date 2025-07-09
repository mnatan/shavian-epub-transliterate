import { describe, it, expect } from 'vitest';
import { extractImageSegments, splitSentencesWithQuotes } from './text-utils.js';

describe('extractImageSegments', () => {
  it('splits text and image placeholders correctly', () => {
    const text = 'Hello __IMAGE_PLACEHOLDER_0__ world __IMAGE_PLACEHOLDER_1__!';
    const imagePlaceholders = [
      { placeholder: '__IMAGE_PLACEHOLDER_0__', src: 'img0.jpg' },
      { placeholder: '__IMAGE_PLACEHOLDER_1__', src: 'img1.jpg' },
    ];
    const segments = extractImageSegments(text, imagePlaceholders);
    expect(segments).toEqual([
      { type: 'text', content: 'Hello' },
      { type: 'image', placeholder: '__IMAGE_PLACEHOLDER_0__' },
      { type: 'text', content: 'world' },
      { type: 'image', placeholder: '__IMAGE_PLACEHOLDER_1__' },
      { type: 'text', content: '!' },
    ]);
  });

  it('handles text with no placeholders', () => {
    const text = 'Just text.';
    const imagePlaceholders = [];
    const segments = extractImageSegments(text, imagePlaceholders);
    expect(segments).toEqual([
      { type: 'text', content: 'Just text.' },
    ]);
  });

  it('handles text with only placeholders', () => {
    const text = '__IMAGE_PLACEHOLDER_0____IMAGE_PLACEHOLDER_1__';
    const imagePlaceholders = [
      { placeholder: '__IMAGE_PLACEHOLDER_0__', src: 'img0.jpg' },
      { placeholder: '__IMAGE_PLACEHOLDER_1__', src: 'img1.jpg' },
    ];
    const segments = extractImageSegments(text, imagePlaceholders);
    expect(segments).toEqual([
      { type: 'image', placeholder: '__IMAGE_PLACEHOLDER_0__' },
      { type: 'image', placeholder: '__IMAGE_PLACEHOLDER_1__' },
    ]);
  });
});

describe('splitSentencesWithQuotes', () => {
  it('splits sentences on punctuation', () => {
    const text = 'Hello world! How are you? I am fine.';
    const sentences = splitSentencesWithQuotes(text);
    expect(sentences).toEqual([
      'Hello world!',
      'How are you?',
      'I am fine.'
    ]);
  });

  it('returns the whole text if no punctuation', () => {
    const text = 'No punctuation here';
    const sentences = splitSentencesWithQuotes(text);
    expect(sentences).toEqual(['No punctuation here']);
  });
}); 