import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getEpubMetadata, extractAllImages } from './epub-utils.js';


describe('epub-utils', () => {
  describe('getEpubMetadata', () => {
    let EPubMock;
    beforeEach(() => {
      EPubMock = vi.fn();
      vi.doMock('epub', () => EPubMock, { virtual: true });
    });
    afterEach(() => {
      vi.resetModules();
    });

    it('returns metadata field if present', async () => {
      class FakeEpub {
        constructor() { this.metadata = { title: 'T', author: 'A' }; }
        on(event, cb) { if (event === 'end') setTimeout(() => cb(), 1); }
        parse() {}
      }
      const result = await getEpubMetadata('file', 'title', FakeEpub);
      expect(result).toBe('T');
    });

    it('returns null if error event', async () => {
      const fakeEpub = {
        on: (event, cb) => {
          if (event === 'error') setTimeout(cb, 1);
        },
        parse: () => {},
        metadata: {},
      };
      EPubMock.mockImplementation(() => fakeEpub);
      const { getEpubMetadata } = await import('./epub-utils.js');
      const result = await getEpubMetadata('file', 'title');
      expect(result).toBeNull();
    });
  });

  describe('extractAllImages', () => {
    let execMock, fsMock;
    beforeEach(() => {
      execMock = vi.spyOn(require('child_process'), 'exec');
      fsMock = vi.spyOn(require('fs'), 'existsSync');
    });
    afterEach(() => {
      execMock.mockRestore();
      fsMock.mockRestore();
    });

    it('calls callback with false if error in unzip', () => {
      execMock.mockImplementation((cmd, cb) => cb(new Error('fail'), '', ''));
      return new Promise((resolve) => {
        extractAllImages('file.epub', (result) => {
          expect(result).toBe(false);
          resolve();
        });
      });
    });

    it('calls callback with cover path if cover extracted', () => {
      execMock.mockImplementationOnce((cmd, cb) => cb(null, '', ''));
      execMock.mockImplementationOnce((cmd, cb) => cb(null, '', ''));
      return new Promise((resolve) => {
        extractAllImages('file.epub', (result) => {
          expect(result).toBe('output/cover.jpg');
          resolve();
        });
      });
    });
  });
}); 