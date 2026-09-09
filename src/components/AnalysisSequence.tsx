'use client';
import { useCopy } from '@/i18n/LocaleProvider';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from './Header';
import { MemoryParticles } from './MemoryParticles';
import { readPending, removePending } from '@/lib/draft';
import { analyzeCanvas, type Analysis } from '@/lib/analysis';
const stages = ['stage0', 'stage1', 'stage2', 'stage3', 'stage4'];
export function AnalysisSequence({ id }: { id: string }) {
  const t = useCopy();

  const router = useRouter();
  const [image, setImage] = useState(''),
    [analysis, setAnalysis] = useState<Analysis>(),
    [stage, setStage] = useState(0),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const start = Date.now();
    const timer = setInterval(() => {
      if (alive) setStage(Math.min(4, Math.floor((Date.now() - start) / 2000)));
    }, 250);
    let exitTimer: ReturnType<typeof setTimeout>;
    async function run() {
      try {
        const raw = await readPending(id);
        if (!raw) {
          const existing = await fetch(`/api/experiences/${id}`);
          if (existing.ok) {
            router.replace(`/experience/${id}`);
            return;
          }
          throw Error('pendingError');
        }
        const pending = JSON.parse(raw);
        if (!alive) return;
        setImage(pending.image);
        const img = new Image();
        img.onload = () => {
          if (!alive) return;
          const c = document.createElement('canvas');
          c.width = 960;
          c.height = 720;
          c.getContext('2d')!.drawImage(img, 0, 0, 960, 720);
          setAnalysis(analyzeCanvas(c));
        };
        img.src = pending.image;
        const response = await fetch('/api/experiences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: raw,
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw Error(result.error || 'saveError');
        if (!alive) return;
        exitTimer = setTimeout(
          () => {
            void removePending(id).catch(() => {});
            router.replace(`/experience/${id}`);
          },
          Math.max(0, 10000 - (Date.now() - start)),
        );
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'saveError');
      }
    }
    void run();
    return () => {
      alive = false;
      controller.abort();
      clearInterval(timer);
      clearTimeout(exitTimer);
    };
  }, [id, router, retry]);
  return (
    <>
      <Header studio />
      <main className="analysis-page">
        <div className="analysis-art">
          {image && <MemoryParticles image={image} analysis={analysis} />}
        </div>
        {error ? (
          <>
            <div role="alert" className="error">
              {t(error)}
            </div>
            <div className="action-group">
              <button
                className="button primary"
                onClick={() => {
                  setError('');
                  setStage(0);
                  setRetry(retry + 1);
                }}
              >
                {t('retrySave')}
              </button>
              <Link className="button" href="/draw">
                {t('backDraw')}
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 key={stage} aria-live="polite">
              {t(stages[stage])}
            </h1>
            <p>{t('analysisCaption')}</p>
            <div
              className="stage-dots"
              aria-label={t('stageProgress', { number: stage + 1 })}
            >
              {stages.map((s, i) => (
                <span key={s} className={i <= stage ? 'done' : ''} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
