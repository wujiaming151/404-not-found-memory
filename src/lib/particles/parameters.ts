import type { Analysis } from '../analysis';

export type ParticleMode = 'drift' | 'wave' | 'vortex' | 'reassemble';
export function particleBackground(brightness: number) {
  return brightness < 40
    ? '#1c2825'
    : `hsl(140 11% ${75 + Math.max(0, Math.min(100, brightness)) * 0.2}%)`;
}
export const modes: ParticleMode[] = ['drift', 'wave', 'vortex', 'reassemble'];
const unit = (value: number | undefined, fallback: number) =>
  Math.max(0, Math.min(1, Number.isFinite(value) ? value! / 100 : fallback));

/** Bounded, reproducible visual mapping. Rhythm describes form, not psychology. */
export function particleParameters(a?: Analysis) {
  const brightness = unit(a?.brightness, 0.65);
  const saturation = unit(a?.saturation, 0.4);
  const whitespace = unit(a?.whitespace, 0.5);
  const complexity = unit(a?.complexity, 0.2);
  const density = unit(a?.lineDensity ?? a?.complexity, 0.2);
  const warm = unit(a?.warm, 0.4),
    cool = unit(a?.cool, 0.6);
  return {
    brightness,
    saturation,
    whitespace,
    complexity,
    speed: 0.14 + complexity * 0.25 + (1 - whitespace) * 0.06,
    amplitude: 0.18 + complexity * 0.38,
    depth: 0.32 + complexity * 0.42,
    radius: 0.18 + complexity * 0.2,
    cohesion: 0.45 + density * 0.4,
    glow: 0.2 + brightness * 0.65,
    warmth: warm + cool ? warm / (warm + cool) : 0.5,
    density: 0.22 + (1 - whitespace) * 0.78,
    rhythm:
      whitespace > 0.65 ? 'quiet' : complexity > 0.5 ? 'flowing' : 'gentle',
    version: 'particles-2.0',
  };
}

export function particleBudget(
  coarse: boolean,
  cores: number,
  density: number,
) {
  const ceiling = coarse || cores <= 4 ? 16000 : 42000;
  return Math.round(
    Math.max(2400, ceiling * Math.max(0.18, Math.min(1, density))),
  );
}
