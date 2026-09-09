import zh from '../../messages/zh-CN.json';
import en from '../../messages/en.json';
import type { Copy } from '@/i18n/messages';
import type { Analysis } from './analysis';
import type { Fragrance } from './fragrance';
import type { Experience } from './types';

const dataKeys = [
  'colorBlack',
  'colorGray',
  'colorRed',
  'colorOrange',
  'colorYellow',
  'colorGreen',
  'colorCyan',
  'colorBlue',
  'colorPurple',
  'citrus',
  'green',
  'floral',
  'marine',
  'woody',
  'musk',
  'earth',
  'smoke',
  'seaSalt',
  'bergamot',
  'sweetOrange',
  'leaf',
  'violetLeaf',
  'whiteTea',
  'orangeBlossom',
  'jasmine',
  'lily',
  'cedar',
  'vetiver',
  'softMusk',
  'whiteMusk',
  'sunlit',
  'garden',
  'petal',
  'tides',
  'afternoon',
  'distance',
  'rain',
  'ember',
  'untitled',
  'demoTitle',
] as const;
const legacy = new Map<string, string>(
  dataKeys.flatMap((key) => [
    [zh[key], key],
    [en[key], key],
  ]),
);
export function canonical(value: string) {
  return legacy.get(value) || value;
}
export function titleText(value: string, t: Copy) {
  return !value || value === '@untitled' || value === zh.untitled
    ? t('untitled')
    : value === '@demo' || value === zh.demoTitle
      ? t('demoTitle')
      : value;
}
export function analysisDescriptor(a: Analysis, f: Fragrance) {
  const ranks = [...f.ratios].sort((a, b) => b.percent - a.percent);
  return {
    brightness:
      a.brightness > 60 ? 'high' : a.brightness < 40 ? 'low' : 'medium',
    saturation:
      a.saturation > 60 ? 'high' : a.saturation < 30 ? 'low' : 'medium',
    temperature:
      a.warm > a.cool ? 'warm' : a.cool > a.warm ? 'cool' : 'neutral',
    complexity: a.complexity > 40 ? 'high' : 'low',
    space: a.whitespace > 65 ? 'high' : 'low',
    dominantColor: canonical(a.colors[0]?.name || 'colorGray'),
    fragranceFamily: canonical(ranks[0]?.name || 'floral'),
    secondaryFamily: canonical(ranks[1]?.name || 'green'),
  } as const;
}
/** Read-time compatibility: never rewrite the archived drawing or rule output. */
export function normalizeFragrance(f: Fragrance, a: Analysis): Fragrance {
  const normalized = {
    ...f,
    name: canonical(f.name),
    type: f.type.split(' · ').map(canonical).join(' · '),
    top: f.top.map(canonical),
    middle: f.middle.map(canonical),
    base: f.base.map(canonical),
    ingredients: f.ingredients.map(canonical),
    ratios: f.ratios.map((r) => ({ ...r, name: canonical(r.name) })),
    explanation: '',
  };
  return {
    ...normalized,
    descriptor: f.descriptor || analysisDescriptor(a, normalized),
  };
}
export function localizeFragrance(
  f: Fragrance,
  a: Analysis,
  t: Copy,
): Fragrance {
  const n = normalizeFragrance(f, a),
    d = n.descriptor!;
  return {
    ...n,
    name: dataKeys.includes(n.name as (typeof dataKeys)[number])
      ? t(n.name)
      : n.name,
    type: n.type
      .split(' · ')
      .map((k) => t(k))
      .join(' · '),
    top: n.top.map((k) => t(k)),
    middle: n.middle.map((k) => t(k)),
    base: n.base.map((k) => t(k)),
    ingredients: n.ingredients.map((k) => t(k)),
    ratios: n.ratios.map((r) => ({ ...r, name: t(r.name) })),
    explanation: t('explanation', {
      light: t(
        d.brightness === 'high'
          ? 'lightHigh'
          : d.brightness === 'low'
            ? 'lightLow'
            : 'lightMedium',
      ),
      color: t(d.dominantColor),
      space: t(d.space === 'high' ? 'spaceHigh' : 'spaceLow'),
      rhythm: t(d.complexity === 'high' ? 'rhythmHigh' : 'rhythmLow'),
      first: t(d.fragranceFamily),
      second: t(d.secondaryFamily),
      base: n.base.map((k) => t(k)).join(' · '),
    }),
  };
}
export function normalizeExperience(e: Experience): Experience {
  const analysis = {
    ...e.analysis,
    colors: e.analysis.colors.map((c) => ({ ...c, name: canonical(c.name) })),
  };
  return {
    ...e,
    analysis,
    fragrance: normalizeFragrance(e.fragrance, analysis),
    variants: e.variants?.map((f) => normalizeFragrance(f, analysis)),
  };
}
