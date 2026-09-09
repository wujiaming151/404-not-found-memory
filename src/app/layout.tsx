import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { createCopy, detectLocale, isLocale } from '@/i18n/messages';
import './globals.css';
import '@fontsource-variable/inter';
import './constellation.css';
async function requestLocale() {
  const saved = (await cookies()).get('memory-locale')?.value;
  return isLocale(saved)
    ? saved
    : detectLocale((await headers()).get('accept-language') || 'en');
}
export async function generateMetadata(): Promise<Metadata> {
  const t = createCopy(await requestLocale());
  return { title: t('metaTitle'), description: t('metaDescription') };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await requestLocale();
  return (
    <html
      lang={locale}
      data-theme="dark"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body>
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
