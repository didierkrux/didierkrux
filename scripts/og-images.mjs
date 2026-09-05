import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { startPreview } from './lib/preview-server.mjs';

const PORT = 4323;
const PAGES = ['home', 'world'];

mkdirSync('public/og', { recursive: true });
const server = await startPreview(PORT);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const ch of PAGES) {
    await page.goto(`http://127.0.0.1:${PORT}/og/${ch}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('body[data-og-ready="true"]', { timeout: 15_000 });
    await page.screenshot({ path: `public/og/${ch}.png`, type: 'png' });
    console.log(`public/og/${ch}.png`);
  }
} finally {
  await browser.close();
  server.stop();
}
