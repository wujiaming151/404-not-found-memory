import * as THREE from 'three';
import { isBlank, type Analysis } from '../analysis';
import {
  modes,
  particleBudget,
  particleParameters,
  type ParticleMode,
} from './parameters';
import { vertexShader, fragmentShader } from './shaders';

export type ParticleEngine = {
  update: (
    analysis: Analysis | undefined,
    mode: ParticleMode,
    paused: boolean,
    energy?: number,
  ) => void;
  capture: () => string;
  dispose: () => void;
};

export async function createParticleEngine(
  canvas: HTMLCanvasElement,
  image: string,
  hero: boolean,
  onFailure: () => void,
  signal: AbortSignal,
): Promise<ParticleEngine> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const value = new Image();
    value.onload = () => resolve(value);
    value.onerror = reject;
    value.src = image;
  });
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'default',
  });
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 30);
  camera.position.z = 4.2;
  let geometry: THREE.BufferGeometry | undefined,
    material: THREE.ShaderMaterial | undefined;
  try {
    const coarse = matchMedia('(pointer: coarse)').matches;
    const sample = document.createElement('canvas');
    sample.width = coarse ? 360 : 520;
    sample.height = Math.round((sample.width * img.height) / img.width);
    const context = sample.getContext('2d', { willReadFrequently: true })!;
    context.imageSmoothingEnabled = false;
    context.drawImage(img, 0, 0, sample.width, sample.height);
    const data = context.getImageData(0, 0, sample.width, sample.height).data;
    const indices: number[] = [];
    for (let i = 0; i < data.length; i += 4)
      if (!isBlank(data[i], data[i + 1], data[i + 2], data[i + 3]))
        indices.push(i / 4);
    // Seeded shuffle permits unbiased drawRange reductions without cropping the image.
    let seed = 42;
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const count = Math.min(
      indices.length,
      hero ? 9000 : coarse ? 16000 : 42000,
    );
    const positions = new Float32Array(count * 3),
      colors = new Float32Array(count * 3),
      phases = new Float32Array(count);
    const color = new THREE.Color();
    for (let n = 0; n < count; n++) {
      const p = indices[n],
        i = p * 4;
      positions[n * 3] = ((p % sample.width) / sample.width - 0.5) * 3.2;
      positions[n * 3 + 1] =
        (0.5 - Math.floor(p / sample.width) / sample.height) * 2.4;
      color
        .setRGB(
          data[i] / 255,
          data[i + 1] / 255,
          data[i + 2] / 255,
          THREE.SRGBColorSpace,
        )
        .toArray(colors, n * 3);
      phases[n] = random() * Math.PI * 2;
    }
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('sourceColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        mode: { value: 0 },
        amplitude: { value: 0.3 },
        depth: { value: 0.5 },
        cohesion: { value: 0.6 },
        radius: { value: 0.25 },
        intensity: { value: 0.9 },
        pointScale: { value: 12 },
        reduced: { value: 0 },
        pointer: { value: new THREE.Vector3(10, 10, 0) },
        pulse: { value: new THREE.Vector3(0, 0, -10000) },
        clock: { value: 0 },
        energy: { value: 1 },
        ambientField: { value: hero ? 1 : 0 },
        saturation: { value: 0.4 },
        glow: { value: 0.5 },
        brightness: { value: 0.65 },
      },
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
    const g = geometry,
      m = material;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let time = 0,
      last = 0,
      raf = 0,
      disposed = false,
      visible = true,
      paused = false;
    let params = particleParameters(),
      targetMode = 0,
      quality = 1,
      frames = 0,
      elapsed = 0,
      slowWindows = 0;
    let rotationX = 0,
      rotationY = 0,
      drag: { id: number; x: number; y: number } | undefined;
    let lastInput = -1000;
    const targetPointer = new THREE.Vector3(10, 10, 0);
    function resize() {
      const rect = canvas.getBoundingClientRect();
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, coarse ? 1.4 : 1.8) *
          Math.max(0.75, quality),
      );
      renderer.setSize(
        Math.max(1, rect.width),
        Math.max(1, rect.height),
        false,
      );
      camera.aspect = rect.width / Math.max(rect.height, 1);
      camera.position.z = Math.max(hero ? 3.5 : 3.9, 2.1 / camera.aspect);
      camera.updateProjectionMatrix();
      m.uniforms.pointScale.value =
        Math.min(24, Math.max(12, rect.height / 30)) *
        renderer.getPixelRatio() *
        (hero ? 0.82 : 1);
    }
    function draw(now: number) {
      raf = 0;
      if (disposed || document.hidden || !visible) return;
      const delta = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      if (!paused) time += delta * params.speed * (reduced.matches ? 0.12 : 1);
      m.uniforms.time.value = time;
      m.uniforms.clock.value = now / 1000;
      m.uniforms.reduced.value = reduced.matches ? 1 : 0;
      // Smooth transition between motions without rebuilding buffers or restarting time.
      m.uniforms.mode.value +=
        (targetMode - m.uniforms.mode.value) * Math.min(1, delta * 3);
      if (now - lastInput > 180) targetPointer.z *= Math.exp(-delta * 3);
      (m.uniforms.pointer.value as THREE.Vector3).lerp(
        targetPointer,
        Math.min(1, delta * 8),
      );
      if (!drag) {
        rotationX *= Math.exp(-delta * 0.7);
        rotationY *= Math.exp(-delta * 0.7);
      }
      points.rotation.x +=
        ((reduced.matches ? 0 : rotationX + Math.sin(time * 0.4) * 0.07) -
          points.rotation.x) *
        Math.min(1, delta * 3);
      points.rotation.y +=
        ((reduced.matches ? 0 : rotationY + Math.sin(time * 0.3) * 0.16) -
          points.rotation.y) *
        Math.min(1, delta * 3);
      renderer.render(scene, camera);
      canvas.dataset.time = time.toFixed(3);
      frames++;
      elapsed += delta;
      if (elapsed > 3 && frames > 15) {
        const fps = frames / elapsed;
        slowWindows = fps < 22 && quality <= 0.41 ? slowWindows + 1 : 0;
        if (slowWindows >= 2) {
          onFailure();
          return;
        }
        if (fps < 32 && quality > 0.4) {
          quality = Math.max(0.4, quality * 0.8);
          resize();
        } else if (fps > 55 && quality < 1) {
          quality = Math.min(1, quality + 0.05);
          resize();
        }
        g.setDrawRange(
          0,
          Math.min(
            count,
            Math.round(
              particleBudget(
                coarse,
                navigator.hardwareConcurrency || 4,
                params.density,
              ) * quality,
            ),
          ),
        );
        canvas.dataset.fps = fps.toFixed(0);
        canvas.dataset.count = String(g.drawRange.count);
        frames = 0;
        elapsed = 0;
      }
      raf = requestAnimationFrame(draw);
    }
    function resume() {
      if (!disposed && visible && !document.hidden && !raf) {
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
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else resume();
    });
    observer.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    function move(e: PointerEvent) {
      const r = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector3(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        1 - ((e.clientY - r.top) / r.height) * 2,
        0.5,
      ).unproject(camera);
      const ray = ndc.sub(camera.position).normalize();
      const hit = camera.position
        .clone()
        .add(ray.multiplyScalar(-camera.position.z / ray.z));
      targetPointer.set(hit.x, hit.y, 1);
      lastInput = performance.now();
      if (drag?.id === e.pointerId && e.pointerType === 'mouse') {
        rotationY = THREE.MathUtils.clamp(
          rotationY + (e.clientX - drag.x) * 0.004,
          -0.5,
          0.5,
        );
        rotationX = THREE.MathUtils.clamp(
          rotationX + (e.clientY - drag.y) * 0.003,
          -0.35,
          0.35,
        );
        drag.x = e.clientX;
        drag.y = e.clientY;
      }
    }
    function down(e: PointerEvent) {
      move(e);
      (m.uniforms.pulse.value as THREE.Vector3).set(
        targetPointer.x,
        targetPointer.y,
        performance.now() / 1000,
      );
      canvas.dataset.pulses = String(Number(canvas.dataset.pulses || 0) + 1);
      if (e.button === 0 && e.pointerType === 'mouse') {
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
      }
    }
    function up() {
      drag = undefined;
      targetPointer.z = 0;
    }
    function lost(e: Event) {
      e.preventDefault();
      onFailure();
    }
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', up);
    canvas.addEventListener('webglcontextlost', lost);
    document.addEventListener('visibilitychange', visibility);
    resize();
    g.setDrawRange(
      0,
      Math.min(
        count,
        particleBudget(
          coarse,
          navigator.hardwareConcurrency || 4,
          params.density,
        ),
      ),
    );
    resume();
    canvas.dataset.renderer = 'webgl';
    return {
      update(a, mode, stop, energy = 1) {
        params = particleParameters(a);
        paused = stop;
        targetMode = modes.indexOf(mode);
        m.uniforms.energy.value = Math.max(0.4, Math.min(1.8, energy));
        canvas.dataset.energy = String(m.uniforms.energy.value);
        for (const key of [
          'amplitude',
          'depth',
          'cohesion',
          'radius',
          'saturation',
          'glow',
          'brightness',
        ] as const)
          m.uniforms[key].value = params[key];
        g.setDrawRange(
          0,
          Math.min(
            count,
            Math.round(
              particleBudget(
                coarse,
                navigator.hardwareConcurrency || 4,
                params.density,
              ) * quality,
            ),
          ),
        );
      },
      capture() {
        renderer.render(scene, camera);
        return canvas.toDataURL('image/png');
      },
      dispose() {
        disposed = true;
        cancelAnimationFrame(raf);
        ro.disconnect();
        observer.disconnect();
        document.removeEventListener('visibilitychange', visibility);
        canvas.removeEventListener('pointermove', move);
        canvas.removeEventListener('pointerdown', down);
        canvas.removeEventListener('pointerup', up);
        canvas.removeEventListener('pointercancel', up);
        canvas.removeEventListener('pointerleave', up);
        canvas.removeEventListener('webglcontextlost', lost);
        g.dispose();
        m.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
      },
    };
  } catch (error) {
    geometry?.dispose();
    material?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    throw error;
  }
}
