'use client';
import { useCopy } from '@/i18n/LocaleProvider';
import { Header } from '@/components/Header';
import Link from 'next/link';
export default function NotFound() {
  const t = useCopy();

  return (
    <>
      {' '}
      <Header studio />
      <main className="login">
        <h1>{t('notFound')}</h1>
        <p>{t('notFoundBody')}</p>
        <Link className="button primary" href="/">
          {t('home')}
        </Link>
      </main>
    </>
  );
}
