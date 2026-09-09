'use client';
import { useEffect, useRef, useState } from 'react';
import { useCopy, useLanguage } from '@/i18n/LocaleProvider';
import { locales, languageNames } from '@/i18n/messages';
export function LanguageSwitcher() {
  const { locale, changeLocale } = useLanguage(),
    t = useCopy(),
    [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    function close(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  return (
    <div
      className="language-switcher"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        className="language-trigger"
        disabled={!hydrated}
        aria-label={t('language')}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        {languageNames[locale]} <span aria-hidden>⌄</span>
      </button>
      {open && (
        <div className="language-menu" aria-label={t('language')}>
          {locales.map((l) => (
            <button
              key={l}
              lang={l}
              aria-pressed={locale === l}
              onClick={() => {
                changeLocale(l);
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              {languageNames[l]}
              {locale === l && <span aria-hidden> ✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
