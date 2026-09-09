import type { Experience } from './types';
import type { Fragrance } from './fragrance';
import { createCopy, type Locale } from '@/i18n/messages';
import { localizeFragrance, canonical, titleText } from './localization';
import type { ParticleMode } from './particles/parameters';
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(Error('imageReadError'));
    image.src = src;
  });
}
export async function downloadReport(
  e: Experience,
  raw: Fragrance,
  snapshot: string,
  locale: Locale,
  mode: ParticleMode = 'drift',
) {
  await document.fonts.ready;
  const t = createCopy(locale),
    localized = localizeFragrance(raw, e.analysis, t),
    memoryName = titleText(e.title, t),
    f = { ...localized, name: memoryName, english: memoryName },
    a = e.analysis;
  const [original, visual] = await Promise.all([
    loadImage(e.image),
    loadImage(snapshot),
  ]);
  const sheet = document.createElement('canvas');
  sheet.width = 1400;
  sheet.height = 5000;
  // A large export must remain complete under concurrent WebGL pressure.
  // Use CPU-backed rendering for the offscreen report, independent of the live scene.
  const ctx = sheet.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 1400, 5000);
  const fonts =
    '"Inter Variable", "Noto Sans", "Noto Sans SC", "Noto Sans KR", "Noto Sans JP", "Microsoft YaHei", "Malgun Gothic", "Yu Gothic", "Apple SD Gothic Neo", sans-serif';
  function text(
    value: string,
    x: number,
    y: number,
    size = 23,
    color = '#ffffff',
  ) {
    ctx.fillStyle = color;
    ctx.font = `${size}px ${fonts}`;
    ctx.fillText(value, x, y);
  }
  // Word segments preserve English words; CJK segmentation allows natural wrapping.
  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
  function wrap(
    value: string,
    x: number,
    y: number,
    width: number,
    size = 23,
    lineHeight = size * 1.6,
  ) {
    let line = '';
    ctx.font = `${size}px ${fonts}`;
    for (const { segment } of segmenter.segment(value)) {
      const parts =
        ctx.measureText(segment).width > width ? [...segment] : [segment];
      for (const part of parts) {
        if (line && ctx.measureText(line + part).width > width) {
          text(line.trimEnd(), x, y, size);
          line = part.trimStart();
          y += lineHeight;
        } else line += part;
      }
    }
    if (line) text(line, x, y, size);
    return y + lineHeight;
  }
  function fit(
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
    bg: string,
  ) {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    const scale = Math.min(w / img.width, h / img.height);
    ctx.drawImage(
      img,
      x + (w - img.width * scale) / 2,
      y + (h - img.height * scale) / 2,
      img.width * scale,
      img.height * scale,
    );
  }
  let y = 90;
  text(t('brand'), 80, y, 28);
  y = wrap(t('reportHeading'), 80, y + 85, 1240, 44, 60);
  text(
    `${e.participantId} · ${new Date(e.createdAt).toLocaleString(locale)}`,
    80,
    y + 20,
    20,
    '#bdbdbd',
  );
  y = wrap(titleText(e.title, t), 80, y + 68, 1240, 25, 38) + 28;
  fit(original, 80, y, 600, 450, '#fff');
  fit(visual, 720, y, 600, 450, '#000000');
  y += 492;
  const nextLeft = wrap(t('original'), 80, y, 600, 22),
    nextRight = wrap(t('snapshot'), 720, y, 600, 22);
  y = Math.max(nextLeft, nextRight);
  y = wrap(t('modeReport', { mode: t(mode) }), 720, y, 600, 20) + 40;
  text(t('fragranceNameLabel'), 80, y, 22);
  y = wrap(f.name, 80, y + 62, 1240, 44, 59);
  if (locale !== 'en' && f.english !== f.name) {
    y = wrap(f.english, 80, y + 3, 1240, 25, 39);
  }
  y = wrap(f.type, 80, y + 12, 1240, 25, 38) + 25;
  for (const [key, notes] of [
    ['top', f.top],
    ['middle', f.middle],
    ['base', f.base],
  ] as const) {
    text(t(key), 80, y, 23);
    y = wrap(notes.join(' · '), 350, y, 970, 25, 40) + 14;
  }
  y =
    wrap(
      t('ingredients') + f.ingredients.join(' · '),
      80,
      y + 8,
      1240,
      22,
      36,
    ) + 28;
  y = wrap(f.explanation, 80, y, 1240, 23, 39) + 36;
  text(t('features'), 80, y, 30);
  y += 65;
  const metrics = [
    ['brightness', a.brightness],
    ['saturation', a.saturation],
    ['whitespace', a.whitespace],
    ['complexity', a.complexity],
  ] as const;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const [key, value] = metrics[row * 2 + col];
      text(t(key), 80 + col * 630, y, 23, '#bdbdbd');
      text(`${value} / 100`, 80 + col * 630, y + 51, 35);
    }
    y += 114;
  }
  y =
    wrap(
      `${t('warm')} ${a.warm}% · ${t('neutral')} ${a.neutral}% · ${t('cool')} ${a.cool}%`,
      80,
      y,
      1240,
      23,
    ) + 35;
  text(t('palette'), 80, y, 30);
  y += 30;
  let left = 80;
  for (const c of a.colors) {
    const w = (1240 * c.percent) / 100;
    ctx.fillStyle = c.hex;
    ctx.fillRect(left, y, w, 65);
    left += w;
  }
  y =
    wrap(
      a.colors.map((c) => `${t(canonical(c.name))} ${c.percent}%`).join(' · '),
      80,
      y + 105,
      1240,
      23,
    ) + 15;
  y = wrap(t('paletteNotice'), 80, y, 1240, 19) + 36;
  text(t('compositionLabel'), 80, y, 30);
  y += 30;
  left = 80;
  for (const r of f.ratios) {
    const w = (1240 * r.percent) / 100;
    ctx.fillStyle = r.color;
    ctx.fillRect(left, y, w, 18);
    left += w;
  }
  y += 65;
  for (let i = 0; i < f.ratios.length; i += 2) {
    let next = y;
    for (let j = 0; j < 2 && i + j < f.ratios.length; j++) {
      const r = f.ratios[i + j];
      ctx.fillStyle = r.color;
      ctx.fillRect(80 + j * 630, y - 18, 18, 18);
      next = Math.max(
        next,
        wrap(`${r.name} ${r.percent}%`, 115 + j * 630, y, 570, 24, 37),
      );
    }
    y = next + 18;
  }
  y =
    wrap(t('conceptVersion', { number: f.seed + 1 }), 80, y + 25, 1240, 22) +
    20;
  y = wrap(t('bodyReport'), 80, y, 1240, 20, 32) + 22;
  y = wrap(`${e.id} / ${a.version} / ${f.version}`, 80, y, 1240, 16, 26) + 70;
  const output = document.createElement('canvas');
  output.width = 1400;
  output.height = Math.ceil(y);
  output.getContext('2d', { willReadFrequently: true })!.drawImage(sheet, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) =>
    output.toBlob(
      (b) => (b ? resolve(b) : reject(Error('reportGenerateError'))),
      'image/png',
    ),
  );
  const url = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = url;
  link.download = `Memory-${e.participantId}-${f.english}-${locale}-v${f.seed + 1}.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
