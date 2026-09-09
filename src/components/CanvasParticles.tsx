'use client';
import { useEffect, useRef } from 'react';
import { useCopy } from '@/i18n/LocaleProvider';
import { isBlank, type Analysis } from '@/lib/analysis';
import {
  particleParameters,
  type ParticleMode,
} from '@/lib/particles/parameters';
/** Low-cost projected particles when WebGL is unavailable. */
export function CanvasParticles({
  image,
  analysis,
  hero = false,
  paused = false,
  mode = 'drift',
  energy = 1,
}: {
  image: string;
  analysis?: Analysis;
  hero?: boolean;
  paused?: boolean;
  mode?: ParticleMode;
  energy?: number;
}) {
  const t = useCopy(),
    ref = useRef<HTMLCanvasElement>(null),
    state = useRef({ analysis, paused, mode, energy });
  useEffect(() => {
    state.current = { analysis, paused, mode, energy };
  }, [analysis, paused, mode, energy]);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let disposed = false,
      raf = 0,
      visible = true,
      time = 0,
      last = 0,
      ready = false;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const particles: { x: number; y: number; color: string; phase: number }[] =
      [];
    const pointer = { x: 0, y: 0, amount: 0 };
    const pulse = { x: 0, y: 0, start: -100 };
    function draw(now: number) {
      raf = 0;
      if (disposed || !visible || document.hidden || !ready) return;
      const c = canvas!,
        x = ctx!,
        rect = c.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio || 1, 1.4),
        w = Math.max(1, Math.round(rect.width * dpr)),
        h = Math.max(1, Math.round(rect.height * dpr));
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
      }
      const delta = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      const p = particleParameters(state.current.analysis);
      if (!state.current.paused && !reduced.matches) time += delta * p.speed;
      x.clearRect(0, 0, w, h);
      const scale = Math.min(w / 3.8, h / 2.8) * (hero ? 1.08 : 1);
      const spread = reduced.matches
        ? 0
        : Math.min(time / 2, 1) *
          (0.5 - 0.5 * Math.cos(time * 0.7)) *
          Math.min(1.8, Math.max(0.4, state.current.energy));
      pointer.amount *= Math.exp(-delta * 3);
      for (const q of particles) {
        let px = q.x + Math.sin(time + q.phase) * p.amplitude * spread,
          py =
            q.y + Math.cos(time * 0.7 + q.phase) * p.amplitude * 0.5 * spread,
          z = Math.sin(q.phase * 3 + time) * p.depth * spread;
        if (state.current.mode === 'wave') {
          py += Math.sin(q.x * 4 + time) * 0.25 * spread;
          z += Math.cos(q.y * 3 + time) * 0.3 * spread;
        }
        if (state.current.mode === 'vortex') {
          const angle = spread * 0.5 * Math.sin(time * 0.4),
            old = px;
          px = px * Math.cos(angle) - py * Math.sin(angle);
          py = old * Math.sin(angle) + py * Math.cos(angle);
        }
        const perspective = 3.5 / (3.5 - z);
        let sx = w * 0.5 + px * scale * perspective,
          sy = h * 0.5 - py * scale * perspective;
        const dx = sx - pointer.x * dpr,
          dy = sy - pointer.y * dpr,
          force =
            Math.exp(-(dx * dx + dy * dy) / (120 * dpr) ** 2) *
            pointer.amount *
            (reduced.matches ? 0 : 1);
        sx += dx * force * 0.3;
        sy += dy * force * 0.3;
        const age = time - pulse.start;
        if (!reduced.matches && age >= 0 && age < 3) {
          const rx = sx - pulse.x * dpr,
            ry = sy - pulse.y * dpr;
          const distance = Math.hypot(rx, ry);
          const ripple =
            Math.exp(-Math.pow((distance - age * scale) / (35 * dpr), 2)) *
            Math.exp(-age * 1.5);
          sx += rx * ripple * 0.2;
          sy += ry * ripple * 0.2;
        }
        x.fillStyle = q.color;
        x.globalAlpha = 0.8;
        x.beginPath();
        x.arc(sx, sy, Math.max(0.8, 1.6 * dpr * perspective), 0, Math.PI * 2);
        x.fill();
      }
      x.globalAlpha = 1;
      c.dataset.time = time.toFixed(3);
      raf = requestAnimationFrame(draw);
    }
    function resume() {
      if (!disposed && visible && !document.hidden && !raf && ready) {
        last = 0;
        raf = requestAnimationFrame(draw);
      }
    }
    function visibility() {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else resume();
    }
    function move(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.amount = 1;
    }
    function press(e: PointerEvent) {
      move(e);
      pulse.x = pointer.x;
      pulse.y = pointer.y;
      pulse.start = time;
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else resume();
    });
    observer.observe(canvas);
    document.addEventListener('visibilitychange', visibility);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerdown', press);
    const img = new Image();
    img.onload = () => {
      if (disposed) return;
      const source = document.createElement('canvas');
      source.width = 240;
      source.height = 180;
      const sc = source.getContext('2d')!;
      sc.drawImage(img, 0, 0, 240, 180);
      const data = sc.getImageData(0, 0, 240, 180).data;
      for (let y = 0; y < 180; y += 2)
        for (let x = 0; x < 240; x += 2) {
          const i = (y * 240 + x) * 4;
          if (isBlank(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;
          particles.push({
            x: (x / 240 - 0.5) * 3.2,
            y: (0.5 - y / 180) * 2.4,
            color: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`,
            phase:
              (Math.abs(Math.sin(x * 12.98 + y * 78.23) * 43758.54) % 1) *
              Math.PI *
              2,
          });
        }
      canvas.dataset.count = String(particles.length);
      ready = true;
      resume();
    };
    img.src = image;
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerdown', press);
      img.onload = null;
      img.src = '';
    };
  }, [image, hero]);
  return (
    <canvas
      ref={ref}
      className="particle-canvas"
      data-particles
      data-renderer="canvas2d"
      aria-label={t('particleLabel')}
    />
  );
}
