import lighthouse from 'lighthouse';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const profile = resolve('data/lighthouse-profile');
mkdirSync(profile, { recursive: true });
const browser = spawn(
  process.env.CHROME_PATH ||
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9223',
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { windowsHide: true, stdio: 'ignore' },
);
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      const response = await fetch('http://localhost:9223/json/version');
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) throw Error('Audit browser did not start');
  const result = await lighthouse(process.argv[2] || 'http://localhost:3001', {
    port: 9223,
    output: 'json',
    logLevel: 'error',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  });
  writeFileSync('lighthouse-report.json', result.report);
  console.log(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(result.lhr.categories).map(([key, value]) => [
          key,
          value.score,
        ]),
      ),
    ),
  );
} finally {
  browser.kill();
}
