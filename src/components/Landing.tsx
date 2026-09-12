'use client';
import { useCopy } from '@/i18n/LocaleProvider';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  PencilSimple,
  Wind,
  Fingerprint,
  Play,
} from '@phosphor-icons/react';
import { Header } from './Header';
import { MemoryParticles } from './MemoryParticles';
import { Reveal } from './Reveal';
import { createConstellation } from '@/lib/constellation';
import type { ParticleMode } from '@/lib/particles/parameters';
const journey = [
  {
    title: 'drawStep',
    body: 'drawStepBody',
    mode: 'reassemble',
    Icon: PencilSimple,
  },
  { title: 'awakeStep', body: 'awakeBody', mode: 'wave', Icon: Wind },
  { title: 'scentStep', body: 'scentBody', mode: 'vortex', Icon: Fingerprint },
] as const;
function ImageSlot({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <figure className="image-slot">
      <img src={src} alt={alt} />
    </figure>
  );
}
export function Landing() {
  const t = useCopy(),
    [image, setImage] = useState(''),
    [selected, setSelected] = useState(1);
  const rippleTimer = useRef<number>(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setImage(createConstellation()));
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(rippleTimer.current);
    };
  }, []);
  function nudge(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      '--shift-x',
      `${((event.clientX - rect.left) / rect.width - 0.5) * 7}px`,
    );
    event.currentTarget.style.setProperty(
      '--shift-y',
      `${((event.clientY - rect.top) / rect.height - 0.5) * 5}px`,
    );
  }
  function reset(event: React.PointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty('--shift-x', '0px');
    event.currentTarget.style.setProperty('--shift-y', '0px');
  }
  function ripple(event: React.PointerEvent<HTMLHeadingElement>) {
    const title = event.currentTarget;
    const rect = title.getBoundingClientRect();
    title.style.setProperty('--ripple-x', `${event.clientX - rect.left}px`);
    title.style.setProperty('--ripple-y', `${event.clientY - rect.top}px`);
    title.dataset.ripple = 'true';
    window.clearTimeout(rippleTimer.current);
    rippleTimer.current = window.setTimeout(
      () => delete title.dataset.ripple,
      700,
    );
  }
  return (
    <>
      <Header />
      <main className="constellation-home">
        <section className="hero shell">
          <div className="hero-copy">
            <h1
              className="pointer-responsive hero-title"
              onPointerMove={nudge}
              onPointerLeave={reset}
              onPointerDown={ripple}
            >
              {t('heroFirst')}
            </h1>
            <div
              className="system-subtitle pointer-responsive"
              onPointerMove={nudge}
              onPointerLeave={reset}
            >
              <span>{t('systemSubtitleEnglish')}</span>
              <span>{t('systemSubtitleChinese')}</span>
            </div>
            <p
              className="project-statement pointer-responsive"
              onPointerMove={nudge}
              onPointerLeave={reset}
            >
              {t('projectStatement')}
            </p>
            <div className="hero-actions">
              <Link
                href="/draw?guide=1"
                className="button primary pointer-responsive"
                onPointerMove={nudge}
                onPointerLeave={reset}
              >
                {t('start')}
                <ArrowUpRight size={20} />
              </Link>
              <Link href="/draw?demo=1" className="text-button">
                <Play size={15} />
                {t('demoAction')}
              </Link>
            </div>
          </div>
          <div className="hero-art">
            {image && <MemoryParticles image={image} hero />}
          </div>
        </section>
        <Reveal className="shell manifesto">
          <section id="about" className="concept-grid">
            <div>
              <span className="sensory-label">{t('senses')}</span>
              <h2>{t('aboutFirst')}</h2>
              <p>{t('aboutSecond')}</p>
            </div>
            <ImageSlot
              src="/assets/project-concept.webp"
              alt={t('conceptImage')}
            />
          </section>
        </Reveal>
        <Reveal className="shell process">
          <section id="process">
            <div className="process-lead">
              <div className="section-title">
                <h2>{t('journeyTitle')}</h2>
                <p>{t('journeyIntro')}</p>
              </div>
              <ImageSlot
                src="/assets/drawing-process.webp"
                alt={t('drawingImage')}
              />
            </div>
            <div className="conversion-media">
              <ImageSlot
                src="/assets/visual-olfactory-process.webp"
                alt={t('conversionImage')}
              />
              <div>
                <h3>{t('scentStep')}</h3>
                <p>{t('scentBody')}</p>
              </div>
            </div>
            <div className="journey-layout">
              <div className="journey-visual">
                {image && (
                  <MemoryParticles
                    image={image}
                    mode={journey[selected].mode as ParticleMode}
                  />
                )}
              </div>
              <div className="journey-choices">
                {journey.map(({ title, body, Icon }, i) => (
                  <button
                    className="journey-choice"
                    key={title}
                    aria-pressed={selected === i}
                    onClick={() => setSelected(i)}
                  >
                    <Icon size={25} weight="thin" />
                    <span>
                      <span className="journey-title">{t(title)}</span>
                      <span className="journey-body">{t(body)}</span>
                    </span>
                    <ArrowUpRight className="journey-arrow" size={20} />
                  </button>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
        <Reveal className="shell">
          <section className="closing">
            <h2>
              {t('noSkill')}
              <br />
              <span>{t('worthKeeping')}</span>
            </h2>
            <Link
              href="/draw?guide=1"
              aria-label={t('enterDraw')}
              className="round-link"
            >
              <ArrowUpRight size={36} />
            </Link>
          </section>
        </Reveal>
      </main>
      <footer className="shell footer">
        <span>{t('footerBrand')}</span>
        <span>{t('researchNotice')}</span>
        <span>{t('footerPoem')}</span>
      </footer>
    </>
  );
}
