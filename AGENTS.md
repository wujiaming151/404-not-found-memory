# Repository Guidelines

## Project Status & Architecture

This Next.js application turns drawings into particle animations and rule-based fragrance suggestions. Development is authorized. Do not use Sites skills for this repository.

## Project Structure & Module Organization

Keep modules separated by responsibility:

- `src/app/`: App Router pages and server endpoints; keep `/research` separate from participant flows.
- `src/components/`: drawing tools, particle canvas, fragrance cards, and visualizations.
- `src/lib/`: independent image-analysis, fragrance-rule, report-export, and persistence modules.
- `src/lib/particles/`: bounded parameters, GPU engine, and shaders; keep renderer effects independent of locale.
- `src/i18n/` and `messages/`: next-intl provider and four matching translation dictionaries.
- `src/lib/demo.ts`: generated demonstration artwork.
- `src/lib/db.ts`: SQLite schema and queries; generated `data/` is ignored by Git.
- `tests/`: integration and end-to-end tests; colocate unit tests as `*.test.ts`.

## Build, Test, and Development Commands

Use Node.js 22.13+ and pnpm with the committed lockfile:

- `pnpm dev`: start local development.
- `pnpm build`: validate the production build.
- `pnpm start`: serve the built application.
- `pnpm lint`: run ESLint.
- `pnpm test`: run unit tests.
- `pnpm test:e2e`: run browser flow tests against the running application.

`./start.ps1` locates the bundled Node runtime on Windows. Use `-Production` to build and serve.

## Coding Style & Naming Conventions

Use TypeScript, two-space indentation, single quotes, PascalCase components, and camelCase functions. ESLint and Prettier are configured. Keep canvas code client-side and database access server-side. Keep algorithms deterministic, independently testable, and versioned.

## Testing Guidelines

Use Vitest for blank images, color proportions, edge density, and fragrance totals of 100%. Playwright covers drawing, history, save retries, persistence, reports, and research access. Mark test submissions as demonstrations. Browser tests default to Edge; override `PLAYWRIGHT_BROWSER_PATH` if needed. Report simulated iPad checks separately from real hardware testing. No coverage threshold is established.

## Commit & Pull Request Guidelines

No existing commit convention is available. Adopt concise imperative messages, optionally prefixed with `feat:`, `fix:`, or `docs:`. PRs should describe behavior, link relevant issues, report actual validation, and include screenshots for interface changes. Document schema changes and limitations.

## Data & Configuration

Keep secrets out of source control. Use anonymous participant IDs, protect research routes, and separate demonstration records from research data. Preserve submitted snapshots and fragrance versions. Treat fragrance percentages as conceptual suggestions, not manufacturing concentrations.

Store language-independent IDs and descriptors. Adapt legacy records on read; never rewrite archived weights to translate them. Test locale changes without resetting drawing pixels or GPU time. Keep a Canvas2D fallback and dispose renderer resources.

Consult installed Next.js guides in `node_modules/next/dist/docs/` for framework APIs.
