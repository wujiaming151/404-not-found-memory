import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { analyzePixels } from './analysis';
import { generateFragrance } from './fragrance';
import { localizeFragrance, normalizeFragrance } from './localization';
import { createCopy, detectLocale, locales } from '../i18n/messages';
import { particleBudget, particleParameters } from './particles/parameters';
const a = analyzePixels(
  new Uint8ClampedArray(
    Array.from({ length: 16 }, () => [60, 150, 90, 255]).flat(),
  ),
  4,
  4,
);
describe('four-language data', () => {
  it('has identical nonempty keys and ICU arguments in all dictionaries', () => {
    const messages = locales.map(
      (l) =>
        JSON.parse(readFileSync(`messages/${l}.json`, 'utf8')) as Record<
          string,
          string
        >,
    );
    for (const m of messages) {
      expect(Object.keys(m).sort()).toEqual(Object.keys(messages[0]).sort());
      for (const [key, value] of Object.entries(m)) {
        expect(value.trim()).not.toBe('');
        expect((value.match(/\{\w+\}/g) || []).sort()).toEqual(
          (messages[0][key].match(/\{\w+\}/g) || []).sort(),
        );
      }
    }
  });
  it('localizes the same stored descriptors without regenerating the result', () => {
    const f = generateFragrance(a),
      before = JSON.stringify(f);
    const text = locales.map((l) => localizeFragrance(f, a, createCopy(l)));
    expect(new Set(text.map((f) => f.explanation)).size).toBe(4);
    for (const result of text) {
      expect(result.ratios.reduce((n, r) => n + r.percent, 0)).toBe(100);
      expect(result.explanation).not.toMatch(/\{\w+\}/);
      expect(result.explanation).not.toContain('Could not complete');
    }
    expect(JSON.stringify(f)).toBe(before);
    expect(f.descriptor?.fragranceFamily).toBeTruthy();
    expect(f.explanation).toBe('');
  });
  it('reads historical Chinese scent data without changing stored weights', () => {
    const f = generateFragrance(a),
      old = {
        ...f,
        name: '静庭',
        type: '绿叶 · 花香',
        top: ['佛手柑'],
        base: ['白麝香'],
        ratios: [{ name: '绿叶', percent: 100, color: '#78957f' }],
        descriptor: undefined,
      };
    const normalized = normalizeFragrance(old, a);
    expect(normalized.name).toBe('garden');
    expect(normalized.top).toEqual(['bergamot']);
    expect(normalized.ratios[0].percent).toBe(100);
    expect(localizeFragrance(old, a, createCopy('ko')).top).toEqual([
      '베르가모트',
    ]);
  });
  it('uses browser language families and safe English fallback', () => {
    expect(detectLocale('zh-TW,zh;q=0.8')).toBe('zh-CN');
    expect(detectLocale('ko-KR')).toBe('ko');
    expect(detectLocale('ja-JP')).toBe('ja');
    expect(detectLocale('fr-FR')).toBe('en');
    expect(createCopy('en')('missing.key')).toContain('Please try again');
  });
});
describe('particle parameter bounds', () => {
  it('keeps extreme, missing and invalid measurements finite and visible', () => {
    for (const value of [-100, 0, 100, 999, NaN, Infinity]) {
      const p = particleParameters({
        ...a,
        brightness: value,
        complexity: value,
        whitespace: value,
        saturation: value,
        warm: value,
        cool: value,
        lineDensity: value,
      });
      for (const v of Object.values(p))
        if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
      expect(p.speed).toBeGreaterThan(0);
      expect(p.amplitude).toBeLessThanOrEqual(0.56);
      expect(particleBudget(true, 4, p.density)).toBeGreaterThanOrEqual(2400);
      expect(particleBudget(false, 8, p.density)).toBeLessThanOrEqual(42000);
    }
  });
  it('responds to density, brightness and complexity independently', () => {
    const quiet = particleParameters({
      ...a,
      whitespace: 95,
      complexity: 0,
      brightness: 10,
    });
    const rich = particleParameters({
      ...a,
      whitespace: 10,
      complexity: 90,
      brightness: 90,
    });
    expect(rich.speed).toBeGreaterThan(quiet.speed);
    expect(rich.depth).toBeGreaterThan(quiet.depth);
    expect(rich.glow).toBeGreaterThan(quiet.glow);
    expect(particleBudget(false, 8, rich.density)).toBeGreaterThan(
      particleBudget(false, 8, quiet.density),
    );
  });
});
