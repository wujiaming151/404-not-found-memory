'use client';
import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react';
import type { Analysis } from '@/lib/analysis';
import {
  particleParameters,
  particleBackground,
  type ParticleMode,
} from '@/lib/particles/parameters';
import type { ParticleEngine } from '@/lib/particles/engine';
import { CanvasParticles } from './CanvasParticles';
import { useCopy } from '@/i18n/LocaleProvider';
export type ParticleHandle = { capture: () => string };
export const MemoryParticles = forwardRef<
  ParticleHandle,
  {
    image: string;
    analysis?: Analysis;
    hero?: boolean;
    paused?: boolean;
    mode?: ParticleMode;
    energy?: number;
  }
>(function MemoryParticles(
  { image, analysis, hero = false, paused = false, mode = 'drift', energy = 1 },
  ref,
) {
  const t = useCopy(),
    canvas = useRef<HTMLCanvasElement>(null),
    host = useRef<HTMLDivElement>(null),
    engine = useRef<ParticleEngine | null>(null);
  const [failedImage, setFailedImage] = useState('');
  const failed = failedImage === image;
  const current = useRef({ analysis, mode, paused, energy });
  useEffect(() => {
    current.current = { analysis, mode, paused, energy };
    engine.current?.update(analysis, mode, paused, energy);
  }, [analysis, mode, paused, energy]);
  useImperativeHandle(
    ref,
    () => ({
      capture: () => {
        if (engine.current) return engine.current.capture();
        const c = host.current?.querySelector('canvas');
        if (!c || !c.width) throw Error('snapshotUnavailable');
        return c.toDataURL('image/png');
      },
    }),
    [],
  );
  useEffect(() => {
    if (failed || !image || !canvas.current) return;
    let alive = true,
      local: ParticleEngine | undefined;
    const target = canvas.current;
    const controller = new AbortController();
    import('@/lib/particles/engine')
      .then(({ createParticleEngine }) =>
        createParticleEngine(
          target,
          image,
          hero,
          () => {
            if (alive) setFailedImage(image);
          },
          controller.signal,
        ),
      )
      .then((value) => {
        if (!alive) {
          value.dispose();
          return;
        }
        local = value;
        engine.current = value;
        value.update(
          current.current.analysis,
          current.current.mode,
          current.current.paused,
          current.current.energy,
        );
      })
      .catch((error) => {
        if (alive) {
          console.warn('Particle renderer unavailable', error);
          setFailedImage(image);
        }
      });
    return () => {
      alive = false;
      controller.abort();
      local?.dispose();
      engine.current = null;
    };
  }, [image, hero, failed]);
  const p = particleParameters(analysis);
  return (
    <div
      ref={host}
      className="particle-surface"
      style={
        {
          background: `radial-gradient(ellipse at 50% 45%, ${p.warmth > 0.5 ? 'rgba(218,164,98,' : 'rgba(105,153,182,'}${0.06 + p.glow * 0.08}), transparent 65%)`,
          '--particle-light': p.brightness,
          backgroundColor: analysis
            ? particleBackground(analysis.brightness)
            : undefined,
        } as React.CSSProperties
      }
    >
      <img
        className={`particle-source ${hero ? 'hero-source' : ''}`}
        src={image}
        alt=""
        aria-hidden="true"
      />
      {failed ? (
        <CanvasParticles
          image={image}
          analysis={analysis}
          hero={hero}
          paused={paused}
          mode={mode}
          energy={energy}
        />
      ) : (
        <canvas
          key={image}
          ref={canvas}
          className="particle-canvas"
          data-particles
          aria-label={t('particleLabel')}
        />
      )}
      {failed && !hero && (
        <span className="particle-fallback">{t('fallback')}</span>
      )}
    </div>
  );
});
