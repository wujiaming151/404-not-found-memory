'use client';
import { useCopy } from '@/i18n/LocaleProvider';
import { useEffect, useState } from 'react';
import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { DrawingStudio } from './DrawingStudio';

export function MemoryGuide({ enabled }: { enabled: boolean }) {
  const t = useCopy();
  const [finished, setFinished] = useState(!enabled);
  const [sound, setSound] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    // Browser storage is unavailable during the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSound(localStorage.getItem('memory-guide-sound') === 'on');
    const timer = window.setTimeout(() => setFinished(true), 5000);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  if (finished) return <DrawingStudio />;
  return (
    <main className="memory-guide" data-memory-guide>
      <div className="memory-guide-glow" aria-hidden="true" />
      <div className="memory-guide-copy" aria-live="polite">
        <p>{t('guideFirst')}</p>
        <p>{t('guideSecond')}</p>
      </div>
      <button
        className="sound-toggle"
        type="button"
        aria-pressed={sound}
        onClick={() => {
          const next = !sound;
          setSound(next);
          localStorage.setItem('memory-guide-sound', next ? 'on' : 'off');
        }}
      >
        {sound ? <SpeakerHigh size={18} /> : <SpeakerSlash size={18} />}
        {t('soundLabel')}：{t(sound ? 'soundOn' : 'soundOff')}
      </button>
    </main>
  );
}
