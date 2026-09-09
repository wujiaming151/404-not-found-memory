import { chromium } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_BROWSER_PATH ||
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto('http://localhost:3001');
  await page.waitForFunction(
    () => document.querySelector('[data-particles]')?.width > 300,
  );
  await page.screenshot({
    path: 'test-results/home-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: 'test-results/mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  const db = new DatabaseSync('data/memory.sqlite', { readOnly: true });
  const row = db
    .prepare(
      'SELECT id FROM experiences WHERE title=? ORDER BY created_at DESC LIMIT 1',
    )
    .get('雨后的花园');
  db.close();
  if (row) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`http://localhost:3001/experience/${row.id}`);
    await page.waitForFunction(
      () => document.querySelector('[data-particles]')?.width > 300,
    );
    await page.screenshot({
      path: 'test-results/example-result.png',
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: '切换明暗主题' }).click();
    await page.screenshot({
      path: 'test-results/result-dark.png',
      fullPage: true,
      animations: 'disabled',
    });
  }
  console.log('Stable previews captured.');
} finally {
  await browser.close();
}
