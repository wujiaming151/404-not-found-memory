'use client';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { getMessages, isLocale, type Locale, type Copy } from './messages';
const LocaleContext = createContext<{
  locale: Locale;
  changeLocale: (locale: Locale) => void;
}>({ locale: 'en', changeLocale: () => {} });
export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState(initialLocale);
  const changeLocale = useCallback((next: Locale) => {
    setLocale(next);
    try {
      localStorage.setItem('memory-locale', next);
    } catch {}
    document.cookie = `memory-locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('memory-locale');
      if (isLocale(saved) && saved !== initialLocale)
        requestAnimationFrame(() => changeLocale(saved));
    } catch {}
  }, [initialLocale, changeLocale]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = getMessages(locale).metaTitle;
  }, [locale]);
  return (
    <LocaleContext.Provider value={{ locale, changeLocale }}>
      <NextIntlClientProvider
        locale={locale}
        messages={getMessages(locale)}
        timeZone="UTC"
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
export const useLanguage = () => useContext(LocaleContext);
export function useCopy(): Copy {
  const t = useTranslations();
  return (key, values) => t(t.has(key) ? key : 'unknownError', values);
}
