import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
test('complete memory experience, persistence and report', async ({ page }) => {
  const errors: string[] = [];
  await page.route('**/api/experiences', async (route) => {
    const body = route.request().postDataJSON();
    await route.continue({ postData: JSON.stringify({ ...body, demo: true }) });
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: '404 NOT FOUND' }),
  ).toBeVisible();
  await expect(page.getByText('视觉—嗅觉记忆重构系统')).toBeVisible();
  await expect(
    page.getByText(
      '在网络里，404代表页面无法访问；在这件交互装置中，404代表感官的裂隙。你亲手绘出图像，看见画面，试图寻找与之匹配的气味。视觉与嗅觉永远无法完全等同，这无法被填补的感知空白，就是404。',
    ),
  ).toBeVisible();
  await page.screenshot({
    path: 'test-results/home-desktop.png',
    fullPage: true,
  });
  const guideStarted = Date.now();
  await page.getByRole('link', { name: '开始我的记忆' }).click();
  await expect(page.locator('[data-memory-guide]')).toBeVisible();
  const sound = page.getByRole('button', { name: '声音：关闭' });
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await sound.click();
  await expect(
    page.getByRole('button', { name: '声音：开启' }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(
    await page.evaluate(() => localStorage.getItem('memory-guide-sound')),
  ).toBe('on');
  await page.getByRole('button', { name: '声音：开启' }).click();
  await page.waitForTimeout(2600);
  await page.screenshot({ path: 'test-results/memory-guide.png' });
  const canvas = page.getByLabel('记忆绘画画布');
  await expect(canvas).toBeVisible({ timeout: 7000 });
  expect(Date.now() - guideStarted).toBeGreaterThanOrEqual(4500);
  await page.waitForFunction(
    () => !document.body.textContent?.includes('正在准备画布'),
  );
  await page.getByRole('button', { name: '生成我的记忆香氛' }).click();
  await expect(page.getByText('请先为这段记忆取一个名字。')).toBeVisible();
  await page.getByLabel('为这段记忆命名').fill('浏览器验证的记忆');
  await page.getByRole('button', { name: '生成我的记忆香氛' }).click();
  await expect(
    page.getByText('先留下一点颜色，再让记忆开始流动。'),
  ).toBeVisible();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, {
    steps: 30,
  });
  await page.mouse.up();
  await expect(
    page.getByRole('button', { name: '撤销', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(page.getByText('从一笔颜色开始。')).toBeVisible();
  await page.getByRole('button', { name: '重做', exact: true }).click();
  await page.getByLabel('为这段记忆命名').blur();
  await expect(page.getByText('草稿已保存到本机')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('记忆绘画画布')).toBeVisible({ timeout: 7000 });
  await expect(page.getByLabel('为这段记忆命名')).toHaveValue(
    '浏览器验证的记忆',
  );
  await expect(
    page.getByRole('button', { name: '撤销', exact: true }),
  ).toBeEnabled();
  await page.screenshot({ path: 'test-results/drawing.png' });
  await page.getByRole('button', { name: '生成我的记忆香氛' }).click();
  await expect(page).toHaveURL(/analyzing/);
  await expect(
    page.getByRole('heading', { name: '正在读取你的记忆……' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '下载记忆报告' })).toBeVisible({
    timeout: 20000,
  });
  const resultUrl = page.url();
  await expect(
    page.getByRole('heading', { name: '浏览器验证的记忆', level: 1 }),
  ).toBeVisible();
  await expect(page.locator('.fragrance-card h2')).toHaveText(
    '浏览器验证的记忆',
  );
  await page.getByRole('button', { name: '重新生成香味' }).click();
  await expect(page.getByLabel('香氛版本')).toHaveValue('1');
  await page.reload();
  await expect(page.getByLabel('香氛版本')).toHaveValue('1');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载记忆报告' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.png$/);
  await file.saveAs('test-results/memory-report.png');
  await page.screenshot({ path: 'test-results/result.png', fullPage: true });
  await page.getByRole('link', { name: '修改当前绘画' }).click();
  await expect(page.getByLabel('为这段记忆命名')).toHaveValue(
    '浏览器验证的记忆',
  );
  await page.goto(resultUrl);
  await expect(
    page.getByRole('heading', { name: '浏览器验证的记忆', level: 1 }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('iPad touch input and responsive layout', async ({ browser }) => {
  const context = await browser.newContext({
    locale: 'zh-CN',
    viewport: { width: 1180, height: 820 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto('/draw');
  await expect(page.getByText('从一笔颜色开始。')).toBeVisible();
  const canvas = page.getByLabel('记忆绘画画布');
  const box = (await canvas.boundingBox())!;
  await canvas.dispatchEvent('pointerdown', {
    pointerId: 7,
    pointerType: 'pen',
    isPrimary: true,
    pressure: 0.2,
    button: 0,
    clientX: box.x + box.width * 0.35,
    clientY: box.y + box.height * 0.45,
  });
  await canvas.dispatchEvent('pointermove', {
    pointerId: 7,
    pointerType: 'pen',
    isPrimary: true,
    pressure: 1,
    button: 0,
    clientX: box.x + box.width * 0.5,
    clientY: box.y + box.height * 0.55,
  });
  await canvas.dispatchEvent('pointerup', {
    pointerId: 7,
    pointerType: 'pen',
    isPrimary: true,
    pressure: 0,
    button: 0,
    clientX: box.x + box.width * 0.5,
    clientY: box.y + box.height * 0.55,
  });
  await expect(canvas).toHaveAttribute('data-pointer-type', 'pen');
  await expect(canvas).toHaveAttribute('data-brush-pressure', '1.15');
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect(
    page.getByRole('button', { name: '撤销', exact: true }),
  ).toBeEnabled();
  expect(await canvas.evaluate((el) => getComputedStyle(el).touchAction)).toBe(
    'none',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/ipad.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  await context.close();
});
test('research is protected', async ({ request }) => {
  const response = await request.get('/api/research');
  expect(response.status()).toBe(401);
});
test('save retry, example result, research login and CSV', async ({ page }) => {
  await page.goto('/draw?demo=1');
  await expect(page.getByLabel('为这段记忆命名')).toHaveValue('雨后的花园');
  let failed = true;
  await page.route('**/api/experiences', async (route) => {
    if (failed) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'saveError' }),
      });
    } else await route.continue();
  });
  await page.getByRole('button', { name: '生成我的记忆香氛' }).click();
  await expect(page.getByText('保存失败，请重试。')).toBeVisible();
  failed = false;
  await page.getByRole('button', { name: '重新保存' }).click();
  await expect(page.getByRole('button', { name: '下载记忆报告' })).toBeVisible({
    timeout: 20000,
  });
  await page.screenshot({
    path: 'test-results/example-result.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: '切换明暗主题' }).click();
  await page.screenshot({
    path: 'test-results/result-dark.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: '切换明暗主题' }).click();
  await page.goto('/research/login');
  const password = readFileSync('.env.local', 'utf8')
    .match(/^RESEARCH_PASSWORD=(.+)$/m)?.[1]
    ?.trim();
  expect(password).toBeTruthy();
  await page.getByLabel('研究访问密码').fill(password!);
  await page.getByRole('button', { name: '进入工作台' }).click();
  await expect(
    page.getByRole('heading', { name: '记忆研究档案' }),
  ).toBeVisible();
  await page.getByLabel('包含示例').check();
  await expect(page.locator('.record').first()).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: '导出 CSV' }).click();
  const file = await download;
  await file.saveAs('test-results/research.csv');
  expect(readFileSync('test-results/research.csv', 'utf8')).toContain(
    'analysis_version',
  );
  await page.screenshot({ path: 'test-results/research.png', fullPage: true });
  await page.getByRole('button', { name: '退出登录' }).click();
  await expect(page).toHaveURL(/research\/login/);
});
