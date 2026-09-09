import en from '../../messages/en.json';
import zh from '../../messages/zh-CN.json';
import ko from '../../messages/ko.json';
import ja from '../../messages/ja.json';
import { createTranslator } from 'next-intl';
export const locales = ['en', 'zh-CN', 'ko', 'ja'] as const;
export type Locale = (typeof locales)[number];
export type Copy = (
  key: string,
  values?: Record<string, string | number>,
) => string;
export const languageNames = {
  en: en.languageShortEnglish,
  'zh-CN': en.languageShortChinese,
  ko: en.languageKorean,
  ja: en.languageJapanese,
};
const dictionaries = { en, 'zh-CN': zh, ko, ja };
export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
}
export function detectLocale(value: string): Locale {
  const language = value.split(',')[0].trim().toLowerCase();
  return language.startsWith('zh')
    ? 'zh-CN'
    : language.startsWith('ko')
      ? 'ko'
      : language.startsWith('ja')
        ? 'ja'
        : 'en';
}
export function getMessages(locale: Locale) {
  return { ...en, ...dictionaries[locale] };
}
export function createCopy(locale: Locale): Copy {
  const messages = getMessages(locale);
  const translate = createTranslator({ locale, messages });
  return (key, values) =>
    translate(
      (key in messages ? key : 'unknownError') as keyof typeof messages,
      values,
    );
}
