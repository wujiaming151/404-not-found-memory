import { describe, it, expect } from 'vitest';
import { analyzePixels, percentages } from './analysis';
import { generateFragrance } from './fragrance';
function pixels(colors: number[][]) {
  return new Uint8ClampedArray(colors.flatMap((c) => [...c, 255]));
}
describe('visual analysis', () => {
  it('recognizes blank canvas', () => {
    const a = analyzePixels(pixels(Array(16).fill([255, 255, 255])), 4, 4);
    expect(a.whitespace).toBe(100);
    expect(a.colors).toEqual([]);
  });
  it('separates whitespace and painted color shares', () => {
    const a = analyzePixels(
      pixels([
        [255, 255, 255],
        [255, 255, 255],
        [220, 20, 20],
        [20, 50, 200],
      ]),
      2,
      2,
    );
    expect(a.whitespace).toBe(50);
    expect(a.colors.map((c) => c.percent)).toEqual([50, 50]);
    expect(a.warm + a.cool + a.neutral).toBe(100);
  });
  it('keeps grayscale neutral', () => {
    const a = analyzePixels(pixels(Array(16).fill([110, 110, 110])), 4, 4);
    expect(a.saturation).toBe(0);
    expect(a.neutral).toBe(100);
  });
  it('detects more edges in alternating marks', () => {
    const flat = analyzePixels(pixels(Array(64).fill([80, 80, 80])), 8, 8);
    const busy = analyzePixels(
      pixels(
        Array.from({ length: 64 }, (_, i) =>
          ((i % 8) + Math.floor(i / 8)) % 2 ? [20, 20, 20] : [255, 255, 255],
        ),
      ),
      8,
      8,
    );
    expect(busy.complexity).toBeGreaterThan(flat.complexity);
  });
  it('normalizes rounding to exactly 100', () => {
    expect(percentages([1, 1, 1])).toEqual([34, 33, 33]);
  });
  it('maps dark pictures toward wood and reproduces seeded results', () => {
    const a = analyzePixels(pixels(Array(16).fill([30, 30, 30])), 4, 4),
      f = generateFragrance(a, 3);
    expect(f.ratios.reduce((s, r) => s + r.percent, 0)).toBe(100);
    expect(f.ratios.find((r) => r.name === 'woody')!.percent).toBeGreaterThan(
      f.ratios.find((r) => r.name === 'citrus')!.percent,
    );
    expect(generateFragrance(a, 3)).toEqual(f);
    expect(generateFragrance(a, 4).ratios).not.toEqual(f.ratios);
  });
});
