import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const locales = ['en', 'zh-CN', 'ko', 'ja'] as const;
type Locale = (typeof locales)[number];
const copy = (locale: Locale) =>
  JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')) as Record<
    string,
    string
  >;
async function switchLanguage(page: Page, locale: Locale) {
  await page.locator('.language-trigger').click();
  await page.locator(`.language-menu button[lang="${locale}"]`).click();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
async function seededResult(page: Page) {
  const image = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 960;
    c.height = 720;
    const x = c.getContext('2d')!;
    x.fillStyle = 'white';
    x.fillRect(0, 0, 960, 720);
    for (let i = 0; i < 8; i++) {
      x.fillStyle = ['#b67652', '#709289', '#ae99b6', '#497790'][i % 4];
      x.beginPath();
      x.ellipse(
        250 + i * 62,
        280 + Math.sin(i) * 100,
        75,
        110,
        i * 0.2,
        0,
        Math.PI * 2,
      );
      x.fill();
    }
    return c.toDataURL();
  });
  const response = await page.request.post('/api/experiences', {
    data: {
      id: crypto.randomUUID(),
      participantId: 'M-UPGRADE-TEST',
      title: 'Test memory',
      image,
      demo: true,
    },
  });
  expect(response.ok()).toBe(true);
  return await response.json();
}
test('four languages preserve canvas, analysis, result and GPU state, with localized reports', async ({
  page,
}) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/');
  for (const locale of locales) {
    await switchLanguage(page, locale);
    await expect(
      page.getByRole('heading', {
        name: copy(locale).heroFirst,
        level: 1,
        exact: true,
      }),
    ).toBeVisible();
    await noOverflow(page);
  }
  await page.getByRole('link', { name: copy('ja').start, exact: true }).click();
  await expect(page.locator('[data-memory-guide]')).toBeVisible();
  await expect(page.locator('.drawing-canvas')).toBeVisible({ timeout: 7000 });
  await page.getByLabel(copy('ja').memoryTitle).fill('四季の記憶');
  await expect(
    page.getByRole('button', { name: copy('ja').generate }),
  ).toBeEnabled();
  await page.getByRole('button', { name: copy('ja').generate }).click();
  const canvas = page.locator('.drawing-canvas'),
    box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.65, {
    steps: 20,
  });
  await page.mouse.up();
  const pixels = await canvas.evaluate((c) =>
    (c as HTMLCanvasElement).toDataURL(),
  );
  await page.locator('.studio-meta input').fill('Memory 2026');
  for (const locale of locales) {
    await switchLanguage(page, locale);
    await expect(
      page.getByRole('button', { name: copy(locale).undo, exact: true }),
    ).toBeEnabled();
    expect(
      await canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL()),
    ).toBe(pixels);
    await expect(page.locator('.studio-meta input')).toHaveValue('Memory 2026');
    await expect(page.locator('.studio [role=alert]')).toContainText(
      copy(locale).blankError,
    );
    await noOverflow(page);
  }
  await page.route('**/api/experiences', async (route) => {
    const body = route.request().postDataJSON();
    await route.continue({ postData: JSON.stringify({ ...body, demo: true }) });
  });
  await page.getByRole('button', { name: copy('ja').generate }).click();
  await expect(page).toHaveURL(/analyzing/);
  for (const locale of locales) {
    await switchLanguage(page, locale);
    await expect(page.locator('.analysis-page h1')).toContainText(
      new RegExp(
        [0, 1, 2, 3, 4]
          .map((i) =>
            copy(locale)[`stage${i}`].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          )
          .join('|'),
      ),
    );
  }
  await expect(page.locator('.result')).toBeVisible({ timeout: 25000 });
  await expect(page.locator('canvas[data-renderer="webgl"]')).toBeVisible({
    timeout: 15000,
  });
  const art = page.locator('canvas[data-renderer="webgl"]');
  await art.evaluate(
    (c) => ((c as HTMLCanvasElement).dataset.identity = 'retained'),
  );
  const initialTime = Number(await art.getAttribute('data-time'));
  const url = page.url();
  for (const locale of locales) {
    await switchLanguage(page, locale);
    await expect(
      page.getByRole('button', { name: copy(locale).download }),
    ).toBeVisible();
    await expect(art).toHaveAttribute('data-identity', 'retained');
    expect(Number(await art.getAttribute('data-time'))).toBeGreaterThanOrEqual(
      initialTime,
    );
    expect(page.url()).toBe(url);
    await expect(page.locator('.result-intro p')).not.toContainText(
      'unknownError',
    );
    await noOverflow(page);
    const waiting = page.waitForEvent('download');
    await page.getByRole('button', { name: copy(locale).download }).click();
    const download = await waiting;
    const path = `test-results/report-${locale}.png`;
    await download.saveAs(path);
    const png = PNG.sync.read(readFileSync(path));
    expect(png.width).toBe(1400);
    expect(png.height).toBeGreaterThan(2300);
    expect(png.height).toBeLessThan(5000);
    // Catch partially rendered large reports: the original image and lower charts
    // must contain visible pixels in every locale, not only a valid PNG header.
    const visibleIn = (x1: number, y1: number, x2: number, y2: number) => {
      let visible = 0;
      for (let y = y1; y < Math.min(y2, png.height); y += 4)
        for (let x = x1; x < x2; x += 4) {
          const i = (y * png.width + x) * 4;
          if (png.data[i] + png.data[i + 1] + png.data[i + 2] > 60) visible++;
        }
      return visible;
    };
    expect(visibleIn(80, 250, 680, 700)).toBeGreaterThan(10000);
    expect(visibleIn(80, 1400, 1320, 2400)).toBeGreaterThan(5000);
    await page.screenshot({
      path: `test-results/result-${locale}.png`,
      fullPage: true,
    });
  }
  const e = await (
    await page.request.get(url.replace('/experience/', '/api/experiences/'))
  ).json();
  const imageResponse = await page.request.get(e.image);
  const original = PNG.sync.read(await imageResponse.body());
  expect(original.width).toBe(1920);
  expect(original.height).toBe(1440);
  expect(e.fragrance.descriptor).toBeTruthy();
  expect(e.visual.version).toBe('particles-2.0');
  await page
    .getByRole('button', { name: copy('ja').wave, exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: copy('ja').wave, exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await switchLanguage(page, 'ko');
  await expect(
    page.getByRole('button', { name: copy('ko').wave, exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(art).toHaveAttribute('data-identity', 'retained');
  await page
    .getByRole('button', { name: copy('ko').pause, exact: true })
    .click();
  await page.waitForTimeout(100);
  const pausedTime = await art.getAttribute('data-time');
  await switchLanguage(page, 'en');
  await page.waitForTimeout(300);
  expect(await art.getAttribute('data-time')).toBe(pausedTime);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.studio-meta')).toHaveCount(0);
  await expect(page.locator('.result h1')).toHaveText('Memory 2026');
  expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
});
test('particle modes, mouse rotation, visibility suspension and context recovery', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/');
  await switchLanguage(page, 'en');
  const e = await seededResult(page);
  await page.goto(`/experience/${e.id}`);
  const art = page.locator('canvas[data-renderer="webgl"]');
  await expect(art).toBeVisible();
  await expect
    .poll(async () => Number(await art.getAttribute('data-time')), {
      timeout: 15000,
    })
    .toBeGreaterThan(1.5);
  const buffers: Buffer[] = [];
  for (const mode of ['drift', 'wave', 'vortex', 'reassemble']) {
    await page
      .getByRole('button', { name: copy('en')[mode], exact: true })
      .click();
    await page.waitForTimeout(500);
    buffers.push(
      await art.screenshot({ path: `test-results/particles-${mode}.png` }),
    );
  }
  expect(new Set(buffers.map((b) => b.toString('base64'))).size).toBe(4);
  await page
    .getByRole('button', { name: copy('en').pause, exact: true })
    .click();
  const before = await art.screenshot(),
    box = (await art.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.7, {
    steps: 15,
  });
  await page.mouse.up();
  await page.waitForTimeout(150);
  expect((await art.screenshot()).equals(before)).toBe(false);
  await page
    .getByRole('button', { name: copy('en').play, exact: true })
    .click();
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  const time = await art.getAttribute('data-time');
  await page.waitForTimeout(300);
  expect(await art.getAttribute('data-time')).toBe(time);
  await page.evaluate(() => scrollTo(0, 0));
  await expect
    .poll(async () => Number(await art.getAttribute('data-time')))
    .toBeGreaterThan(Number(time));
  await art.evaluate((c) =>
    (c as HTMLCanvasElement)
      .getContext('webgl2')
      ?.getExtension('WEBGL_lose_context')
      ?.loseContext(),
  );
  await expect(page.locator('canvas[data-renderer="canvas2d"]')).toBeVisible();
});
test('research, login, not found and empty records translate in every language', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('/research/login');
  for (const l of locales) {
    await switchLanguage(page, l);
    await expect(
      page.getByRole('heading', { name: copy(l).researchTitle }),
    ).toBeVisible();
    await noOverflow(page);
  }
  const env = readFileSync('.env.local', 'utf8'),
    password = env.match(/^RESEARCH_PASSWORD=(.+)$/m)![1].trim();
  await page.locator('input[type=password]').fill(password);
  await page
    .getByRole('button', { name: copy('ja').login, exact: true })
    .click();
  await expect(page).toHaveURL(/\/research$/);
  await page.locator('input').first().fill('M-NO-MATCH-UPGRADE');
  for (const l of locales) {
    await switchLanguage(page, l);
    await expect(
      page.getByRole('heading', { name: copy(l).archive }),
    ).toBeVisible();
    await expect(page.getByText(copy(l).noRecords)).toBeVisible();
    await noOverflow(page);
  }
  await page.goto('/not-a-real-memory-page');
  for (const l of locales) {
    await switchLanguage(page, l);
    await expect(
      page.getByRole('heading', { name: copy(l).notFound }),
    ).toBeVisible();
  }
});
test('iPad touch layout, particle interaction, reduced motion and WebGL fallback', async ({
  browser,
}) => {
  test.setTimeout(90000);
  const context = await browser.newContext({
    viewport: { width: 1180, height: 820 },
    hasTouch: true,
    isMobile: true,
    locale: 'ko-KR',
  });
  const page = await context.newPage();
  await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  const e = await seededResult(page);
  await page.goto(`/experience/${e.id}`);
  await expect(page.locator('canvas[data-renderer="webgl"]')).toBeVisible();
  for (const l of locales) {
    await switchLanguage(page, l);
    await noOverflow(page);
  }
  const art = page.locator('canvas[data-renderer="webgl"]');
  expect(await art.evaluate((c) => getComputedStyle(c).touchAction)).toBe(
    'pan-y',
  );
  const b = (await art.boundingBox())!;
  await page.touchscreen.tap(b.x + b.width * 0.6, b.y + b.height * 0.5);
  await page.mouse.wheel(0, 480);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await page.screenshot({
    path: 'test-results/ipad-upgrade.png',
    fullPage: true,
  });
  await context.close();
  const fallback = await browser.newContext({
    viewport: { width: 1180, height: 820 },
    reducedMotion: 'reduce',
    locale: 'ja-JP',
  });
  await fallback.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith('webgl')) return null;
      return Reflect.apply(get, this, [type, ...args]);
    } as typeof get;
  });
  const p = await fallback.newPage();
  await p.goto(
    `${process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'}/experience/${e.id}`,
  );
  await expect(p.locator('canvas[data-renderer="canvas2d"]')).toBeVisible();
  await expect(p.getByText(copy('ja').fallback)).toBeVisible();
  await noOverflow(p);
  await p.screenshot({ path: 'test-results/fallback-reduced.png' });
  await fallback.close();
});
