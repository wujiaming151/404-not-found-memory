'use client';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useCopy } from '@/i18n/LocaleProvider';
import Link from 'next/link';
import { ArrowUpRight, Intersect, Sun, Moon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
export function Header({ studio = false }: { studio?: boolean }) {
  const t = useCopy();

  const [dark, setDark] = useState(true);
  useEffect(() => {
    const value = localStorage.getItem('memory-constellation-theme');
    const isDark = value !== 'light';
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    // The saved browser preference is unavailable during server rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(isDark);
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    localStorage.setItem('memory-constellation-theme', next ? 'dark' : 'light');
  }
  return (
    <header className="header">
      <Link href="/" className="brand">
        <Intersect size={32} weight="thin" />
        <span>
          {t('brand')}
          <span className="brand-en">{t('brandEnglish')}</span>
        </span>
      </Link>
      <nav>
        <LanguageSwitcher />
        <Link href="/#about">{t('about')}</Link>
        <Link href="/#process">{t('process')}</Link>
        <button
          className="icon-button"
          onClick={toggle}
          aria-label={t('theme')}
        >
          {dark ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        {!studio && (
          <Link className="nav-cta" href="/draw?guide=1">
            {t('enter')}
            <ArrowUpRight size={17} />
          </Link>
        )}
      </nav>
    </header>
  );
}
