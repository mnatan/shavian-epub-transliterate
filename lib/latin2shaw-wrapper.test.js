import { describe, it, expect, afterAll } from 'vitest';
import { latin2shaw, closePythonProcess } from './latin2shaw-wrapper.js';

describe('latin2shaw-wrapper', () => {
  afterAll(() => {
    closePythonProcess();
  });

  it('transliterates simple text to Shavian', async () => {
    const result = await latin2shaw('hello');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    // Check for a Shavian character (U+10450–U+1047F, surrogate pairs)
    expect(result).toMatch(/\uD801[\uDC50-\uDC7F]/);
  });

  it('handles multiple requests in sequence', async () => {
    const r1 = await latin2shaw('test');
    const r2 = await latin2shaw('world');
    expect(typeof r1).toBe('string');
    expect(typeof r2).toBe('string');
    expect(r1).not.toBe(r2);
  });

  it('handles multiple concurrent requests', async () => {
    const results = await Promise.all([
      latin2shaw('alpha'),
      latin2shaw('beta'),
      latin2shaw('gamma'),
      latin2shaw('delta'),
    ]);
    results.forEach(res => {
      expect(typeof res).toBe('string');
      expect(res.length).toBeGreaterThan(0);
    });
    expect(new Set(results).size).toBe(results.length); // All unique
  });

  it('handles very large input', async () => {
    const big = 'hello '.repeat(10000); // > 9999 chars
    const result = await latin2shaw(big);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles malformed input (binary data)', async () => {
    const weird = String.fromCharCode(0, 255, 128, 200) + 'abc';
    const result = await latin2shaw(weird);
    expect(typeof result).toBe('string');
  });

  it('rejects all pending requests if the process is closed', async () => {
    const p1 = latin2shaw('test1');
    const p2 = latin2shaw('test2');
    closePythonProcess();
    await expect(p1).rejects.toThrow();
    await expect(p2).rejects.toThrow();
  });

  it('closePythonProcess does not throw when called multiple times', () => {
    expect(() => {
      closePythonProcess();
      closePythonProcess();
    }).not.toThrow();
  });
}); 