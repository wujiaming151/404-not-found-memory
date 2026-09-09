# Particle and language architecture

## Integration decision

The official [Particleify home](https://particleify.talizen.com/) and [generator](https://particleify.talizen.com/generator) advertise standalone Interactive HTML export. The generator marks HTML export as Pro and requests sign-in. A public integration API, SDK, dynamic-image replacement contract, source redistribution license, fixed checkout price, and API CORS policy were not established during inspection. No account was created, purchase made, undocumented endpoint called, or restricted code copied.

This project implements its own Three.js scene. It does not embed or depend on Particleify. There are no external rendering API charges or editor CORS requirements. Drawing images come from this application's same-origin endpoint.

## Rendering lifecycle

`MemoryParticles` lazily loads `lib/particles/engine.ts`. Image loading completes before creating a WebGL renderer; an abort signal prevents obsolete mounts from allocating a context. Geometry and per-pixel linear colors remain on the GPU. A shader animates position and depth, preserving the initial silhouette and periodically reassembling it. A brief original-image fade introduces the work.

Brightness, saturation, whitespace, complexity, line density and temperature map to bounded parameters in `parameters.ts`. Rhythm describes visual form, not measured emotion. Initial ceilings are 42,000 particles on desktop and 16,000 for coarse pointers, then adjusted by painted density, core count and measured frame rate. Seeded shuffling makes draw-range reductions spatially unbiased. Pixel ratio is capped and adaptive. This targets 30–60 FPS, not a hardware-independent guarantee.

Pointer movement disturbs particles; desktop dragging rotates the field. `touch-action: pan-y` allows scrolling and touch disturbance until the browser claims a vertical gesture. There is no sensor access. Canvas2D provides projected particles when WebGL fails. Reduced-motion users receive minimal movement. Visibility and intersection observers suspend frames. Disposal removes observers, listeners, buffers, materials and the context.

Snapshots render synchronously before reading the canvas. `preserveDrawingBuffer` remains disabled. PNG reports use the current locale and measured, segmented text wrapping.

## Localization and stored data

`LocaleProvider` uses next-intl without language URL prefixes. The initial locale comes from an explicit cookie or Accept-Language. A localStorage preference is restored after hydration. Selection updates the provider, cookie, localStorage and document language without navigation. Drawing initialization and renderer effects never depend on locale or translation functions.

Fixed UI strings reside in `messages/{en,zh-CN,ko,ja}.json`, with English merged as fallback. Unit tests verify matching keys and ICU arguments. Fragrance families, ingredients, colors and explanation descriptors use stable IDs. `localization.ts` adapts old Chinese records on read without changing archived snapshots or weights. Participant-entered titles are preserved; default/sample titles use reserved IDs.

The drawing backing canvas is 1920 × 1440. Draft history and pending submissions use IndexedDB. Server analysis remains independent at 256 × 192. SQLite stores PNG data, descriptors and versioned particle parameters. Existing results remain readable; only new analyses receive version 2 fields.

## Verification

Vitest covers mapping bounds, dictionary parity, descriptors, legacy conversion and analysis rules. Playwright covers four languages across participant/research/error pages, canvas pixels, renderer time, saved results, multilingual PNG downloads, reduced motion and WebGL failure. Tablet checks emulate an iPad-sized Chromium viewport with touch; physical iPad Safari and Apple Pencil validation is separate.
