'use client';
import { useLanguage, useCopy } from '@/i18n/LocaleProvider';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  DownloadSimple,
  ArrowClockwise,
  PencilSimple,
  Plus,
  Pause,
  Play,
  X,
  Check,
  ArrowsOut,
} from '@phosphor-icons/react';
import { Header } from './Header';
import { type ParticleHandle, MemoryParticles } from './MemoryParticles';
import { ConfirmDialog } from './ConfirmDialog';
import type { Experience } from '@/lib/types';
import type { Fragrance } from '@/lib/fragrance';
import { downloadReport } from '@/lib/report';
import { localizeFragrance, titleText, canonical } from '@/lib/localization';
import { modes, type ParticleMode } from '@/lib/particles/parameters';
import { clearDraft } from '@/lib/draft';
export function ResultView({ id }: { id: string }) {
  const t = useCopy();
  const { locale } = useLanguage();
  const [mode, setMode] = useState<ParticleMode>('drift');
  const [energy, setEnergy] = useState(1);
  const [immersive, setImmersive] = useState(false);
  const particle = useRef<ParticleHandle>(null);

  const [e, setE] = useState<Experience>(),
    [rawF, setF] = useState<Fragrance>(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(''),
    [paused, setPaused] = useState(false),
    [full, setFull] = useState(false),
    [confirm, setConfirm] = useState(false);
  const art = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (!immersive) return;
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    art.current
      ?.querySelector<HTMLButtonElement>('[data-close-immersive]')
      ?.focus();
    function keys(event: KeyboardEvent) {
      if (event.key === 'Escape') setImmersive(false);
      if (event.key === 'Tab') {
        const buttons = Array.from(
          art.current?.querySelectorAll<HTMLButtonElement>(
            'button:not(:disabled)',
          ) || [],
        ).filter((button) => button.offsetParent !== null);
        const first = buttons[0],
          last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener('keydown', keys);
    return () => {
      document.removeEventListener('keydown', keys);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [immersive]);
  const localized =
    rawF && e ? localizeFragrance(rawF, e.analysis, t) : undefined;
  const f =
    localized && e
      ? {
          ...localized,
          name: titleText(e.title, t),
          english: titleText(e.title, t),
        }
      : undefined;
  useEffect(() => {
    let alive = true;
    fetch(`/api/experiences/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        if (alive) {
          setE(data);
          setF(data.variants?.at(-1) || data.fragrance);
        }
      })
      .catch((error) => {
        if (alive) setError(error.message);
      });
    return () => {
      alive = false;
    };
  }, [id]);
  async function regenerate() {
    setBusy('regenerate');
    setError('');
    try {
      const r = await fetch(`/api/experiences/${id}/regenerate`, {
        method: 'POST',
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setF(data);
      setE((old) =>
        old ? { ...old, variants: [...(old.variants || []), data] } : old,
      );
    } catch {
      setError('regenerateError');
    } finally {
      setBusy('');
    }
  }
  async function report() {
    if (!e || !f) return;
    setBusy('download');
    setError('');
    try {
      if (!rawF || !particle.current) throw Error('snapshotUnavailable');
      await downloadReport(e, rawF, particle.current.capture(), locale, mode);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'reportError');
    } finally {
      setBusy('');
    }
  }
  if (!e || !f)
    return (
      <>
        <Header studio />
        <main className="shell notice">
          {error ? t(error) : t('opening')}
          {error && (
            <p>
              <Link href="/draw">{t('backDraw')}</Link>
            </p>
          )}
        </main>
      </>
    );
  const a = e.analysis;
  return (
    <>
      <Header studio />
      <main
        className="shell result"
        style={{ '--personal': a.colors[0]?.hex } as React.CSSProperties}
      >
        <div className="result-topline">
          <Link href={`/draw?edit=${id}`} className="text-button">
            <ArrowLeft size={15} /> {t('backDraw')}
          </Link>
          <span>
            <Check size={12} style={{ display: 'inline', marginRight: 6 }} />
            {t('saved')}
            {e.participantId}
            {e.demo ? t('demoExperience') : ''}
          </span>
        </div>
        <p className="result-name-label">{t('memoryNameLabel')}</p>
        <h1>{titleText(e.title, t)}</h1>
        <p style={{ fontSize: 12 }}>{t('resultIntro')}</p>
        <div
          className={`result-hero ${immersive ? 'is-immersive' : ''}`}
          role={immersive ? 'dialog' : undefined}
          aria-modal={immersive || undefined}
          aria-label={immersive ? t('immersive') : undefined}
          ref={art}
          style={{ background: a.brightness < 40 ? '#26332e' : undefined }}
        >
          <MemoryParticles
            ref={particle}
            image={e.image}
            analysis={a}
            paused={paused}
            mode={mode}
            energy={energy}
          />
          <div
            className="particle-modes"
            role="group"
            aria-label={t('visualModes')}
          >
            {modes.map((value) => (
              <button
                key={value}
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
              >
                {t(value)}
              </button>
            ))}
          </div>
          <button
            className="original-card"
            onClick={() => setFull(true)}
            aria-label={t('enlarge')}
          >
            <img src={e.image} alt={t('originalAlt')} />
            <span>{t('originalCaption')}</span>
          </button>
          <div className="particle-controls">
            <button
              className="icon-button"
              style={{ background: 'var(--panel)' }}
              onClick={() => setPaused(!paused)}
              aria-label={paused ? t('play') : t('pause')}
            >
              {paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
          </div>
          {immersive && (
            <button
              data-close-immersive
              className="button immersive-close"
              onClick={() => setImmersive(false)}
            >
              <X size={18} />
              {t('exitImmersive')}
            </button>
          )}
        </div>
        <div className="visual-settings">
          <label>
            {t('flowEnergy')}
            <input
              type="range"
              min="40"
              max="180"
              value={Math.round(energy * 100)}
              onChange={(event) => setEnergy(Number(event.target.value) / 100)}
            />
            <output>{Math.round(energy * 100)}%</output>
          </label>
          <button className="text-button" onClick={() => setImmersive(true)}>
            <ArrowsOut size={18} />
            {t('immersive')}
          </button>
        </div>
        <p className="particle-hint">{t('particleHint')}</p>
        <section className="result-intro">
          <h2>{t('interpretationTitle')}</h2>
          <p>{f.explanation}</p>
        </section>
        <div className="result-grid">
          <section className="fragrance-card">
            <span className="fragrance-label">{t('fragranceNameLabel')}</span>
            <h2>{f.name}</h2>
            <span className="fragrance-type">{f.type}</span>
            <div className="notes">
              {[
                [t('top'), f.top, t('topCaption')],
                [t('middle'), f.middle, t('middleCaption')],
                [t('base'), f.base, t('baseCaption')],
              ].map(([label, notes, sub]) => (
                <div className="note-row" key={String(label)}>
                  <span>{label}</span>
                  <div>
                    {(notes as string[]).join(' · ')}
                    <p>{sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="card-foot">
              {t('conceptVersion', { number: f.seed + 1 })}
              <br />
              <span>
                {t('ingredients')}
                {f.ingredients.join('、')}
              </span>
            </div>
          </section>
          <div>
            <section className="features">
              <h2>{t('features')}</h2>
              <p style={{ fontSize: 11 }}>{t('featureNotice')}</p>
              <div className="metrics">
                {[
                  [t('brightness'), a.brightness],
                  [t('saturation'), a.saturation],
                  [t('whitespace'), a.whitespace],
                  [t('complexity'), a.complexity],
                ].map(([name, value]) => (
                  <div className="metric" key={String(name)}>
                    <span>{name}</span>
                    <strong>{value}</strong>
                    <small>/ 100</small>
                  </div>
                ))}
              </div>
              <div className="temperature">
                <div className="temperature-label">
                  <span>
                    {t('warm')} {a.warm}%
                  </span>
                  <span>
                    {t('neutral')} {a.neutral}%
                  </span>
                  <span>
                    {t('cool')} {a.cool}%
                  </span>
                </div>
                <div className="color-track">
                  <span
                    style={{ width: `${a.warm}%`, background: '#c99e80' }}
                  />
                  <span
                    style={{ width: `${a.neutral}%`, background: '#aaa9a1' }}
                  />
                  <span
                    style={{ width: `${a.cool}%`, background: '#89a7b1' }}
                  />
                </div>
              </div>
            </section>
            <section className="palette">
              <h2>{t('palette')}</h2>
              <div className="palette-swatches">
                {a.colors.map((c) => (
                  <div
                    key={c.hex}
                    title={`${t(canonical(c.name))} ${c.percent}%`}
                    style={{ width: `${c.percent}%`, background: c.hex }}
                  />
                ))}
              </div>
              <div className="palette-labels">
                {a.colors.map((c) => (
                  <span key={c.hex}>
                    <i style={{ background: c.hex }} />
                    {t(canonical(c.name))} {c.percent}%
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 10, marginTop: 12 }}>
                {t('paletteNotice')}
              </p>
            </section>
          </div>
        </div>
        <section className="composition">
          <h2>{t('composition')}</h2>
          <div className="composition-grid">
            <div
              className="donut"
              role="img"
              aria-label={f.ratios
                .map((r) => `${r.name}${r.percent}%`)
                .join('，')}
            >
              <svg viewBox="0 0 120 120">
                {f.ratios.map((r, index) => {
                  const start = f.ratios
                    .slice(0, index)
                    .reduce((sum, item) => sum + item.percent, 0);
                  return (
                    <circle
                      key={r.name}
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      stroke={r.color}
                      strokeWidth="11"
                      pathLength="100"
                      strokeDasharray={`${Math.max(0, r.percent - 0.7)} ${100 - Math.max(0, r.percent - 0.7)}`}
                      strokeDashoffset={-start}
                    />
                  );
                })}
              </svg>
              <div className="donut-center">
                <strong>
                  100<span style={{ display: 'inline', fontSize: 15 }}>%</span>
                </strong>
                <span>{t('compositionLabel')}</span>
              </div>
            </div>
            <div className="legend">
              {f.ratios.map((r) => (
                <div className="legend-row" key={r.name}>
                  <i style={{ background: r.color }} />
                  <span>{r.name}</span>
                  <span>{r.percent}%</span>
                </div>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 10, marginTop: 20 }}>{t('formulaNotice')}</p>
        </section>
        {(e.variants?.length || 0) > 0 && (
          <label className="notice">
            {t('savedVersions')}{' '}
            <select
              aria-label={t('fragranceVersion')}
              value={f.seed}
              onChange={(event) =>
                setF(
                  [e.fragrance, ...(e.variants || [])].find(
                    (v) => v.seed === Number(event.target.value),
                  )!,
                )
              }
              style={{
                marginLeft: 12,
                padding: 8,
                background: 'var(--panel)',
                border: '1px solid var(--line)',
                borderRadius: 6,
              }}
            >
              {[e.fragrance, ...(e.variants || [])].map((v) => (
                <option key={v.seed} value={v.seed}>
                  {t('versionLabel', { number: v.seed + 1 })} ·{' '}
                  {t(canonical(v.name))}
                </option>
              ))}
            </select>
          </label>
        )}
        {error && (
          <div role="alert" className="error">
            {t(error)}
          </div>
        )}
        <div className="result-actions">
          <div className="action-group">
            <button
              className="button primary"
              disabled={!!busy}
              onClick={() => void report()}
            >
              <DownloadSimple size={18} />
              {busy === 'download' ? t('reportPreparing') : t('download')}
            </button>
            <button
              className="button"
              disabled={!!busy}
              onClick={() => void regenerate()}
            >
              <ArrowClockwise size={18} />
              {busy === 'regenerate' ? t('generating') : t('regenerate')}
            </button>
          </div>
          <div className="action-group">
            <Link href={`/draw?edit=${id}`} className="text-button">
              <PencilSimple size={16} /> {t('edit')}
            </Link>
            <button className="text-button" onClick={() => setConfirm(true)}>
              <Plus size={16} /> {t('restart')}
            </button>
          </div>
        </div>
      </main>
      {full && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={t('original')}
          onClick={() => setFull(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setFull(false);
          }}
        >
          <div>
            <button
              autoFocus
              className="button"
              onClick={() => setFull(false)}
              style={{ marginBottom: 12 }}
            >
              <X size={17} /> {t('close')}
            </button>
            <img className="full-image" src={e.image} alt={t('fullOriginal')} />
          </div>
        </div>
      )}
      {confirm && (
        <ConfirmDialog
          title={t('restartTitle')}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            void clearDraft()
              .then(() => router.push('/draw'))
              .catch(() => setError('clearDraftError'));
          }}
        >
          {t('restartBody')}
        </ConfirmDialog>
      )}
    </>
  );
}
