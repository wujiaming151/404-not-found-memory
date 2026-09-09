'use client';
import { useLanguage, useCopy } from '@/i18n/LocaleProvider';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from './Header';
import { titleText } from '@/lib/localization';
import type { Experience } from '@/lib/types';
export function ResearchLogin() {
  const t = useCopy();

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <>
      <Header studio />
      <main className="login">
        <h1 style={{ fontSize: 27 }}>{t('researchTitle')}</h1>
        <p>{t('researchOnly')}</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const r = await fetch('/api/research/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
              });
              const result = await r.json();
              if (!r.ok) throw Error(result.error);
              router.push('/research');
            } catch (e) {
              setError(e instanceof Error ? e.message : 'loginError');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {t('password')}
            <input
              type="password"
              disabled={!hydrated}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <div className="error" role="alert">
              {t(error)}
            </div>
          )}
          <button className="button primary" disabled={busy || !hydrated}>
            {busy ? t('loggingIn') : t('login')}
          </button>
        </form>
      </main>
    </>
  );
}
export function Research() {
  const t = useCopy();
  const { locale } = useLanguage();

  const [records, setRecords] = useState<Experience[]>([]),
    [q, setQ] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [demo, setDemo] = useState(false),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const router = useRouter();
  const query = new URLSearchParams({
    q,
    from,
    to,
    demo: demo ? '1' : '0',
  }).toString();
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/research?${query}`);
      if (r.status === 401) {
        router.replace('/research/login');
        return;
      }
      if (!r.ok) throw Error('readError');
      setRecords(await r.json());
    } catch {
      setError('recordsError');
    } finally {
      setLoading(false);
    }
  }, [query, router]);
  useEffect(() => {
    // Query changes begin a new network request and expose its loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  return (
    <>
      <Header studio />
      <main className="research">
        <div className="page-heading">
          <div>
            <h1>{t('archive')}</h1>
            <p>{t('archiveIntro')}</p>
          </div>
          <button
            className="text-button"
            onClick={async () => {
              await fetch('/api/research/login', { method: 'DELETE' });
              router.push('/research/login');
            }}
          >
            {t('logout')}
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <input
            aria-label={t('filterId')}
            placeholder={t('searchId')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <label>
            {t('from')}{' '}
            <input
              aria-label={t('startDate')}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            {t('to')}{' '}
            <input
              aria-label={t('endDate')}
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={demo}
              onChange={(e) => setDemo(e.target.checked)}
            />
            {t('includeDemo')}
          </label>
          <a
            className="button primary"
            href={`/api/research?${query}&format=csv`}
          >
            {t('csv')}
          </a>
        </form>
        {error && (
          <div className="error" role="alert">
            {t(error)}
          </div>
        )}
        <p className="notice">
          {loading ? t('loading') : t('recordCount', { count: records.length })}
        </p>
        <div className="records">
          {records.map((e) => (
            <article className="record" key={e.id}>
              <img src={e.image} alt={titleText(e.title, t)} />
              <div>
                {e.title}
                <small>
                  {e.participantId} ·{' '}
                  {new Date(e.createdAt).toLocaleString(locale)}
                  {e.demo ? t('sample') : ''}
                </small>
              </div>
              <Link href={`/research/${e.id}`}>{t('viewRecord')}</Link>
            </article>
          ))}
        </div>
        {!loading && !records.length && <p>{t('noRecords')}</p>}
      </main>
    </>
  );
}
