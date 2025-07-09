import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateHtml, convertToEpub, convertToMobi } from './output-utils.js';
import fs from 'fs';

describe('output-utils', () => {
  describe('generateHtml', () => {
    it('produces valid HTML with metadata and chapters', () => {
      const html = generateHtml({
        chapters: [
          { content: '<p>Chapter 1 content</p>' },
          { content: '<p>Chapter 2 content</p>' },
        ],
        metadata: {
          title: 'Test Book',
          creator: 'Test Author',
        },
      });
      expect(html).toContain('<title>Shavian: Test Book</title>');
      expect(html).toContain('By Test Author');
      expect(html).toContain('<p>Chapter 1 content</p>');
      expect(html).toContain('<p>Chapter 2 content</p>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });
  });

  describe('convertToEpub and convertToMobi', () => {
    let execMock;
    let logMock;
    beforeEach(() => {
      execMock = vi.spyOn(require('child_process'), 'exec');
      logMock = vi.fn();
    });
    afterEach(() => {
      execMock.mockRestore();
    });

    it('convertToEpub resolves on success', async () => {
      execMock.mockImplementation((cmd, cb) => cb(null, '', ''));
      await expect(convertToEpub('a.html', 'b.epub', null, '/bin/true', logMock)).resolves.toBeUndefined();
      expect(logMock).toHaveBeenCalled();
    });

    it('convertToEpub rejects on error', async () => {
      execMock.mockImplementation((cmd, cb) => cb(new Error('fail'), '', ''));
      await expect(convertToEpub('a.html', 'b.epub', null, '/bin/true', logMock)).rejects.toThrow('fail');
    });

    it('convertToMobi resolves on success', async () => {
      execMock.mockImplementation((cmd, cb) => cb(null, '', ''));
      await expect(convertToMobi('a.epub', 'b.mobi', null, '/bin/true', logMock)).resolves.toBeUndefined();
      expect(logMock).toHaveBeenCalled();
    });

    it('convertToMobi rejects on error', async () => {
      execMock.mockImplementation((cmd, cb) => cb(new Error('fail'), '', ''));
      await expect(convertToMobi('a.epub', 'b.mobi', null, '/bin/true', logMock)).rejects.toThrow('fail');
    });
  });
}); 