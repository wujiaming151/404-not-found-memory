import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

test('design source is preserved and four-language layouts follow the dark reference', async ({
  page,
}) => {
  test.setTimeout(60000);
  expect(
    createHash('sha256').update(readFileSync('DESIGN.md')).digest('hex'),
  ).toBe('da144c9ccdc495d47af62978f3c5f226cf6f3431bba0f56753887fe7a3e8d8f8');
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
  ).toBe('rgb(0, 0, 0)');
  const title = page.locator('.hero-title');
  const titleBox = (await title.boundingBox())!;
  await page.waitForTimeout(950);
  await page.mouse.move(titleBox.x + titleBox.width * 0.8, titleBox.y + 10);
  await expect
    .poll(() =>
      title.evaluate((node) => node.style.getPropertyValue('--shift-x')),
    )
    .not.toBe('0px');
  await page.mouse.down();
  await expect(title).toHaveAttribute('data-ripple', 'true');
  await page.mouse.up();
  await page.mouse.move(0, 0);
  for (const locale of ['en', 'zh-CN', 'ko', 'ja']) {
    await page.locator('.language-trigger').click();
    await page.locator(`.language-menu button[lang="${locale}"]`).click();
    for (const [width, height] of [
      [1440, 1000],
      [1180, 820],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => scrollTo(0, 0));
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await expect(page.locator('.hero-actions .primary')).toBeInViewport();
      await page.screenshot({
        path: `test-results/design-${locale}-${width}.png`,
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.journey-choices').scrollIntoViewIfNeeded();
  await page.locator('.journey-choice').first().click();
  await expect(page.locator('.journey-choice').first()).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page.locator('.journey-visual canvas[data-renderer=webgl]'),
  ).toBeVisible();
  await page.screenshot({ path: 'test-results/design-journey.png' });
});
test('flow slider, ripple and immersive view preserve the same GPU scene', async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/draw?demo=1');
  await expect(page.locator('.drawing-canvas')).toBeVisible();
  await page.getByRole('button', { name: '生成我的记忆香氛' }).click();
  await expect(page.locator('.result')).toBeVisible({ timeout: 25000 });
  const canvas = page.locator('.result-hero canvas[data-renderer=webgl]');
  await expect(canvas).toBeVisible();
  await canvas.evaluate((c) => {
    (c as HTMLCanvasElement).dataset.identity = 'immersive-retained';
  });
  const slider = page.locator('.visual-settings input');
  await slider.focus();
  await slider.press('End');
  await expect(slider).toHaveValue('180');
  await expect(canvas).toHaveAttribute('data-energy', '1.8');
  await page.getByRole('button', { name: '沉浸观看', exact: true }).click();
  await expect(page.locator('.is-immersive')).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(
    'hidden',
  );
  await expect(canvas).toHaveAttribute('data-identity', 'immersive-retained');
  await page.getByRole('button', { name: '波浪', exact: true }).click();
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.55);
  await expect(canvas).toHaveAttribute('data-pulses', '1');
  await page.screenshot({ path: 'test-results/design-immersive.png' });
  await page.keyboard.press('Escape');
  await expect(page.locator('.is-immersive')).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    'hidden',
  );
  await expect(
    page.getByRole('button', { name: '沉浸观看', exact: true }),
  ).toBeFocused();
  await page.locator('.language-trigger').click();
  await page.locator('.language-menu button[lang=ko]').click();
  await expect(canvas).toHaveAttribute('data-energy', '1.8');
  await expect(canvas).toHaveAttribute('data-identity', 'immersive-retained');
  expect(errors).toEqual([]);
});
