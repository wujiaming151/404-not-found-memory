import { analysisDescriptor } from './localization';
import { Analysis, percentages } from './analysis';
export const families = [
  'citrus',
  'green',
  'floral',
  'marine',
  'woody',
  'musk',
  'earth',
  'smoke',
];
export const scentColors = [
  '#d0ac62',
  '#78957f',
  '#b9a0af',
  '#7eacb7',
  '#8c7860',
  '#b3aaa0',
  '#7d806b',
  '#696975',
];
export type Fragrance = {
  descriptor?: ReturnType<typeof analysisDescriptor>;
  name: string;
  english: string;
  type: string;
  top: string[];
  middle: string[];
  base: string[];
  ingredients: string[];
  ratios: { name: string; percent: number; color: string }[];
  explanation: string;
  seed: number;
  version: string;
};
export function generateFragrance(a: Analysis, seed = 0): Fragrance {
  const b = a.brightness / 100,
    w = a.whitespace / 100,
    c = a.complexity / 100,
    t = a.warm / 100;
  const green =
    a.colors
      .filter((x) => x.name === 'colorGreen')
      .reduce((s, x) => s + x.percent, 0) / 100;
  const weights = [
    8 + 25 * b + 12 * t,
    7 + 28 * green + 8 * w,
    9 + 12 * b + 10 * w,
    6 + 18 * b + (12 * a.cool) / 100,
    8 + 28 * (1 - b) + 8 * c,
    8 + 8 * w + 10 * (1 - b),
    3 + 13 * (1 - b) + 8 * c,
    1 + 7 * (1 - b) * c,
  ];
  const ratio = percentages(
    weights.map(
      (x, i) => x * (1 + (seed ? Math.sin(seed * 17 + i * 31) * 0.12 : 0)),
    ),
  );
  const ranks = ratio.map((v, i) => ({ v, i })).sort((x, y) => y.v - x.v);
  const dominant = ranks[0].i;
  const names = [
    ['sunlit', 'Sunlit Memory'],
    ['garden', 'Silent Garden'],
    ['petal', 'Petal Letters'],
    ['tides', 'Between Tides'],
    ['afternoon', 'Fading Afternoon'],
    ['distance', 'Soft Distance'],
    ['rain', 'After the Rain'],
    ['ember', 'Ember Memory'],
  ];
  const top =
    dominant === 3
      ? ['seaSalt', 'bergamot']
      : t > 0.5
        ? ['sweetOrange', 'bergamot']
        : ['bergamot', 'leaf'];
  const middle =
    green > 0.2
      ? ['violetLeaf', 'whiteTea']
      : a.saturation > 50
        ? ['orangeBlossom', 'jasmine']
        : ['whiteTea', 'lily'];
  const base =
    b < 0.45 ? ['cedar', 'vetiver', 'softMusk'] : ['whiteMusk', 'cedar'];
  const result: Fragrance = {
    name: names[dominant][0],
    english: names[dominant][1],
    type: ranks
      .slice(0, 3)
      .map((x) => families[x.i])
      .join(' · '),
    top,
    middle,
    base,
    ingredients: [...top, ...middle, ...base],
    ratios: families.map((name, i) => ({
      name,
      percent: ratio[i],
      color: scentColors[i],
    })),
    explanation: '',
    seed,
    version: 'scent-2.0',
  };
  result.descriptor = analysisDescriptor(a, result);
  return result;
}
