'use client';
import { useCopy } from '@/i18n/LocaleProvider';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PencilSimple,
  Eraser,
  ArrowCounterClockwise,
  ArrowClockwise,
  Trash,
  ArrowUpRight,
  Palette,
} from '@phosphor-icons/react';
import { Header } from './Header';
import { ConfirmDialog } from './ConfirmDialog';
import { analyzeCanvas } from '@/lib/analysis';
import { createDemo } from '@/lib/demo';
import {
  writePending,
  loadDraft,
  saveDraft,
  saveDraftTitle,
} from '@/lib/draft';
import { newId } from '@/lib/id';
const colors = [
  '#334c41',
  '#819889',
  '#b3c7ba',
  '#d0b389',
  '#be897c',
  '#aa9eb8',
  '#769ba9',
  '#313435',
];
export function DrawingStudio() {
  const t = useCopy();

  const router = useRouter(),
    params = useSearchParams(),
    canvas = useRef<HTMLCanvasElement>(null),
    history = useRef<string[]>([]),
    cursor = useRef(0),
    pointer = useRef<number | null>(null),
    last = useRef({ x: 0, y: 0 }),
    titleRef = useRef(''),
    persistQueue = useRef<Promise<void>>(Promise.resolve()),
    persistVersion = useRef(0);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen'),
    [color, setColor] = useState(colors[0]),
    [size, setSize] = useState(12),
    [title, setTitle] = useState(''),
    [participant, setParticipant] = useState(''),
    [ready, setReady] = useState(false),
    [dirty, setDirty] = useState(false),
    [historyState, setHistoryState] = useState([0, 1]),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false),
    [confirm, setConfirm] = useState(false),
    [status, setStatus] = useState('draftAuto');
  const demoRef = useRef(false);
  function paintImage(src: string) {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.current?.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, 1920, 1440);
          ctx.drawImage(img, 0, 0, 1920, 1440);
        }
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }
  async function persist(imageOverride?: string) {
    if (!canvas.current) return;
    const snapshot = {
      image: imageOverride ?? canvas.current.toDataURL(),
      title: titleRef.current,
      history: [...history.current],
      index: cursor.current,
      demo: demoRef.current,
    };
    const version = ++persistVersion.current;
    setStatus('draftSaving');
    const operation = persistQueue.current.then(() => saveDraft(snapshot));
    persistQueue.current = operation.catch(() => undefined);
    try {
      await operation;
      if (version === persistVersion.current) setStatus('draftSaved');
    } catch {
      if (version === persistVersion.current) setStatus('draftUnavailable');
    }
  }
  function record() {
    const image = canvas.current!.toDataURL();
    history.current = history.current.slice(0, cursor.current + 1);
    history.current.push(image);
    if (history.current.length > 25) history.current.shift();
    cursor.current = history.current.length - 1;
    setHistoryState([cursor.current, history.current.length]);
    setDirty(analyzeCanvas(canvas.current!).colors.length > 0);
    void persist();
  }
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const p =
        localStorage.getItem('memory-participant') ||
        `M-${newId().slice(0, 8).toUpperCase()}`;
      localStorage.setItem('memory-participant', p);
      setParticipant(p);
      const ctx = canvas.current!.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 1920, 1440);
      const blank = canvas.current!.toDataURL();
      history.current = [blank];
      cursor.current = 0;
      try {
        const edit = params.get('edit');
        if (edit) {
          const response = await fetch(`/api/experiences/${edit}`);
          if (!response.ok) throw Error('originalError');
          const e = await response.json();
          if (cancelled) return;
          await paintImage(e.image);
          setTitle(e.title);
          titleRef.current = e.title;
          demoRef.current = e.demo;
          history.current = [blank, canvas.current!.toDataURL()];
          cursor.current = 1;
        } else if (params.get('demo')) {
          await paintImage(createDemo());
          setTitle('@demo');
          titleRef.current = '@demo';
          demoRef.current = true;
          history.current = [blank, canvas.current!.toDataURL()];
          cursor.current = 1;
        } else {
          const draft = await loadDraft();
          if (cancelled) return;
          if (draft) {
            await paintImage(draft.image);
            history.current = draft.history.length
              ? draft.history
              : [draft.image];
            cursor.current = draft.index;
            setTitle(draft.title);
            titleRef.current = draft.title;
            demoRef.current = draft.demo ?? false;
          }
        }
        setDirty(analyzeCanvas(canvas.current!).colors.length > 0);
        setHistoryState([cursor.current, history.current.length]);
      } catch {
        setError('draftError');
      }
      if (!cancelled) setReady(true);
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [params]);
  async function undo(direction: number) {
    const index = cursor.current + direction;
    if (index < 0 || index >= history.current.length) return;
    cursor.current = index;
    const image = history.current[index];
    setHistoryState([index, history.current.length]);
    void persist(image);
    await paintImage(image);
    setDirty(analyzeCanvas(canvas.current!).colors.length > 0);
  }
  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * 1920) / rect.width,
      y: ((e.clientY - rect.top) * 1440) / rect.height,
    };
  }
  function stroke(e: React.PointerEvent<HTMLCanvasElement>, start = false) {
    const ctx = canvas.current!.getContext('2d')!;
    const p = point(e);
    const pressure =
      e.pointerType === 'pen' && e.pressure > 0
        ? 0.7 + Math.min(1, e.pressure) * 0.45
        : 1;
    e.currentTarget.dataset.pointerType = e.pointerType;
    e.currentTarget.dataset.brushPressure = pressure.toFixed(2);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = size * 2 * pressure * (tool === 'eraser' ? 2 : 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (start) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    last.current = p;
  }
  function end(e: React.PointerEvent<HTMLCanvasElement>) {
    if (pointer.current !== e.pointerId) return;
    pointer.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    record();
  }
  async function submit() {
    const memoryName = titleRef.current.trim();
    if (!memoryName || memoryName === '@untitled') {
      setError('titleRequired');
      return;
    }
    if (!canvas.current || !dirty) {
      setError('blankError');
      return;
    }
    setSaving(true);
    setError('');
    await persist();
    const id = newId();
    const pending = {
      id,
      participantId: participant,
      title: memoryName,
      image: canvas.current.toDataURL('image/png'),
      demo: demoRef.current,
      sourceId: params.get('edit') || undefined,
    };
    try {
      await writePending(id, JSON.stringify(pending));
      router.push(`/experience/${id}/analyzing`);
    } catch {
      setError('storageError');
      setSaving(false);
    }
  }
  return (
    <>
      <Header studio />
      <main className="studio">
        <div className="page-heading">
          <div>
            <h1>{t('drawTitle')}</h1>
            <p>{t('drawIntro')}</p>
          </div>
          <div className="studio-meta">
            <span>{participant}</span>
            <label className="memory-name-field">
              <span>{t('memoryTitle')}</span>
              <input
                aria-label={t('memoryTitle')}
                placeholder={t('titlePlaceholder')}
                value={
                  title === '@demo'
                    ? t('demoTitle')
                    : title === '@untitled'
                      ? ''
                      : title
                }
                maxLength={80}
                onChange={(e) => {
                  setTitle(e.target.value);
                  titleRef.current = e.target.value;
                  saveDraftTitle(e.target.value);
                  if (error === 'titleRequired') setError('');
                }}
                onBlur={() => void persist()}
              />
            </label>
          </div>
        </div>
        {error && (
          <div role="alert" className="error">
            {t(error)}
          </div>
        )}
        <div className="workspace">
          <div className="tools" role="toolbar" aria-label={t('tools')}>
            <button
              title={t('brush')}
              aria-label={t('brush')}
              aria-pressed={tool === 'pen'}
              className={`icon-button ${tool === 'pen' ? 'active' : ''}`}
              onClick={() => setTool('pen')}
            >
              <PencilSimple size={23} />
            </button>
            <button
              title={t('eraser')}
              aria-label={t('eraser')}
              aria-pressed={tool === 'eraser'}
              className={`icon-button ${tool === 'eraser' ? 'active' : ''}`}
              onClick={() => setTool('eraser')}
            >
              <Eraser size={23} />
            </button>
            <div className="tool-divider" />
            <button
              aria-label={t('undo')}
              title={t('undo')}
              className="icon-button"
              disabled={historyState[0] === 0}
              onClick={() => void undo(-1)}
            >
              <ArrowCounterClockwise size={21} />
            </button>
            <button
              aria-label={t('redo')}
              title={t('redo')}
              className="icon-button"
              disabled={historyState[0] >= historyState[1] - 1}
              onClick={() => void undo(1)}
            >
              <ArrowClockwise size={21} />
            </button>
            <div className="tool-divider" />
            <button
              aria-label={t('clear')}
              title={t('clear')}
              className="icon-button"
              disabled={!dirty}
              onClick={() => setConfirm(true)}
            >
              <Trash size={21} />
            </button>
          </div>
          <div className="canvas-area">
            <div className="canvas-wrap">
              <canvas
                ref={canvas}
                width={1920}
                height={1440}
                aria-label={t('canvas')}
                className="drawing-canvas"
                onContextMenu={(e) => e.preventDefault()}
                onPointerDown={(e) => {
                  if (
                    !ready ||
                    !e.isPrimary ||
                    pointer.current !== null ||
                    e.button > 0
                  )
                    return;
                  e.preventDefault();
                  pointer.current = e.pointerId;
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {
                    /* Synthetic and older Safari pointer events may not capture. */
                  }
                  stroke(e, true);
                  setDirty(true);
                }}
                onPointerMove={(e) => {
                  if (pointer.current === e.pointerId) {
                    e.preventDefault();
                    stroke(e);
                  }
                }}
                onPointerUp={end}
                onPointerCancel={end}
                onLostPointerCapture={end}
              />
              {!dirty && (
                <div className="canvas-empty">
                  <PencilSimple size={30} weight="thin" />
                  <p>{ready ? t('firstStroke') : t('preparingCanvas')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="settings-bar">
          <div className="swatches" aria-label={t('presetColors')}>
            {colors.map((c) => (
              <button
                key={c}
                className={`swatch ${color === c ? 'selected' : ''}`}
                style={{ background: c }}
                aria-label={t('chooseColor', { color: c })}
                aria-pressed={color === c}
                onClick={() => {
                  setColor(c);
                  setTool('pen');
                }}
              />
            ))}
            <label title={t('customColor')}>
              <input
                type="color"
                aria-label={t('customColor')}
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  setTool('pen');
                }}
              />
            </label>
          </div>
          <label className="brush-size">
            {t('brushSize')}{' '}
            <input
              type="range"
              min="2"
              max="70"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
            <span>{size}px</span>
          </label>
          <Palette size={17} color={color} />
        </div>
        <div className="studio-bottom">
          <div>
            <p>{t(status)}</p>
            <p>{t('consent')}</p>
          </div>
          <button
            className="button primary"
            disabled={!ready || saving}
            onClick={() => void submit()}
          >
            {saving ? t('preparing') : t('generate')}
            <ArrowUpRight size={19} />
          </button>
        </div>
      </main>
      {confirm && (
        <ConfirmDialog
          title={t('clearTitle')}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            const ctx = canvas.current!.getContext('2d')!;
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, 1920, 1440);
            record();
            setConfirm(false);
          }}
        >
          {t('clearBody')}
        </ConfirmDialog>
      )}
    </>
  );
}
