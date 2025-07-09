import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as epubUtils from './epub-utils.js';
const { getEpubMetadata, extractAllImages } = epubUtils;

// Mock dependencies
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn()
  }
}));

vi.mock('child_process', () => ({
  exec: vi.fn()
}));

describe('epub-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getEpubMetadata', () => {
    it('returns metadata field if present', async () => {
      class FakeEpub {
        constructor() { 
          this.metadata = { 
            title: 'Test Book', 
            creator: 'Test Author',
            language: 'en',
            identifier: 'test-123'
          }; 
        }
        on(event, cb) { 
          if (event === 'end') setTimeout(() => cb(), 1); 
        }
        parse() {}
      }
      
      const result = await getEpubMetadata('test.epub', 'title', FakeEpub);
      expect(result).toBe('Test Book');
    });

    it('returns null if metadata field is missing', async () => {
      class FakeEpub {
        constructor() { 
          this.metadata = { 
            title: 'Test Book',
            creator: 'Test Author'
          }; 
        }
        on(event, cb) { 
          if (event === 'end') setTimeout(() => cb(), 1); 
        }
        parse() {}
      }
      
      const result = await getEpubMetadata('test.epub', 'language', FakeEpub);
      expect(result).toBeNull();
    });

    it('returns null if error event occurs', async () => {
      class FakeEpub {
        constructor() { 
          this.metadata = { title: 'Test Book' }; 
        }
        on(event, cb) { 
          if (event === 'error') setTimeout(() => cb(new Error('EPUB error')), 1); 
        }
        parse() {}
      }
      
      const result = await getEpubMetadata('test.epub', 'title', FakeEpub);
      expect(result).toBeNull();
    });

    it('handles empty metadata object', async () => {
      class FakeEpub {
        constructor() { 
          this.metadata = {}; 
        }
        on(event, cb) { 
          if (event === 'end') setTimeout(() => cb(), 1); 
        }
        parse() {}
      }
      
      const result = await getEpubMetadata('test.epub', 'title', FakeEpub);
      expect(result).toBeNull();
    });

    it('handles undefined metadata gracefully', async () => {
      class FakeEpub {
        constructor() { 
          this.metadata = undefined; 
        }
        on(event, cb) { 
          if (event === 'end') setTimeout(() => cb(), 1); 
        }
        parse() {}
      }
      
      const result = await getEpubMetadata('test.epub', 'title', FakeEpub);
      expect(result).toBeNull();
    });
  });
}); 