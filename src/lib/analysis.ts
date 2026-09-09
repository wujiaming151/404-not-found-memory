export type Color = { hex: string; name: string; percent: number };
export type Analysis = {
  brightness: number;
  saturation: number;
  warm: number;
  cool: number;
  neutral: number;
  whitespace: number;
  complexity: number;
  lineDensity?: number;
  colors: Color[];
  version: string;
};
export function hsv(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  let h =
    d === 0
      ? 0
      : max === r
        ? ((g - b) / d) % 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: max === 0 ? 0 : d / max, v: max };
}
export function isBlank(r: number, g: number, b: number, a = 255) {
  return a < 20 || (r > 244 && g > 244 && b > 244);
}
function colorName(r: number, g: number, b: number) {
  const { h, s, v } = hsv(r, g, b);
  if (v < 0.2) return 'colorBlack';
  if (s < 0.13) return 'colorGray';
  return h < 20 || h >= 345
    ? 'colorRed'
    : h < 48
      ? 'colorOrange'
      : h < 75
        ? 'colorYellow'
        : h < 165
          ? 'colorGreen'
          : h < 200
            ? 'colorCyan'
            : h < 265
              ? 'colorBlue'
              : 'colorPurple';
}
export function percentages(weights: number[]) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (!total) return weights.map(() => 0);
  const raw = weights.map((w) => (w / total) * 100),
    values = raw.map(Math.floor);
  const order = raw
    .map((v, i) => ({ i, r: v - values[i] }))
    .sort((a, b) => b.r - a.r);
  const remaining = 100 - values.reduce((a, b) => a + b, 0);
  for (let n = 0; n < remaining; n++) values[order[n].i]++;
  return values;
}
export function analyzePixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Analysis {
  let count = 0,
    light = 0,
    sat = 0,
    warm = 0,
    cool = 0,
    neutral = 0,
    edges = 0,
    pairs = 0;
  const bins = new Map<
    string,
    { r: number; g: number; b: number; n: number }
  >();
  const gray = new Float32Array(width * height);
  for (let p = 0; p < width * height; p++) {
    const i = p * 4,
      r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    gray[p] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (isBlank(r, g, b, data[i + 3])) continue;
    count++;
    light += gray[p];
    const c = hsv(r, g, b);
    sat += c.s;
    if (c.s < 0.13) neutral++;
    else if (c.h < 85 || c.h > 325) warm++;
    else cool++;
    const key = [r, g, b].map((v) => Math.floor(v / 48)).join(',');
    const old = bins.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    old.r += r;
    old.g += g;
    old.b += b;
    old.n++;
    bins.set(key, old);
  }
  for (let y = 1; y < height; y++)
    for (let x = 1; x < width; x++) {
      const p = y * width + x;
      const strength =
        Math.abs(gray[p] - gray[p - 1]) + Math.abs(gray[p] - gray[p - width]);
      if (strength > 0.12) edges++;
      pairs++;
    }
  const sorted = [...bins.values()].sort((a, b) => b.n - a.n);
  const groups = sorted.slice(0, 5).map((v) => ({ ...v }));
  for (const bin of sorted.slice(5)) {
    let nearest = 0,
      distance = Infinity;
    groups.forEach((g, i) => {
      const d =
        (g.r / g.n - bin.r / bin.n) ** 2 +
        (g.g / g.n - bin.g / bin.n) ** 2 +
        (g.b / g.n - bin.b / bin.n) ** 2;
      if (d < distance) {
        distance = d;
        nearest = i;
      }
    });
    const g = groups[nearest];
    g.r += bin.r;
    g.g += bin.g;
    g.b += bin.b;
    g.n += bin.n;
  }
  groups.sort((a, b) => b.n - a.n);
  const shares = percentages(groups.map((g) => g.n)),
    temperatures = percentages([warm, cool, neutral]);
  return {
    brightness: count ? Math.round((light / count) * 100) : 100,
    saturation: count ? Math.round((sat / count) * 100) : 0,
    warm: temperatures[0],
    cool: temperatures[1],
    neutral: temperatures[2],
    whitespace: Math.round((1 - count / (width * height)) * 100),
    lineDensity: Math.min(100, Math.round((edges / Math.max(pairs, 1)) * 100)),
    complexity: Math.min(100, Math.round((edges / Math.max(pairs, 1)) * 400)),
    colors: groups.map((g, i) => {
      const rgb = [g.r, g.g, g.b].map((v) => Math.round(v / g.n));
      return {
        hex: '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join(''),
        name: colorName(rgb[0], rgb[1], rgb[2]),
        percent: shares[i],
      };
    }),
    version: 'visual-2.0',
  };
}
export function analyzeCanvas(canvas: HTMLCanvasElement) {
  const small = document.createElement('canvas');
  small.width = 256;
  small.height = 192;
  const ctx = small.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0, 256, 192);
  return analyzePixels(ctx.getImageData(0, 0, 256, 192).data, 256, 192);
}
