import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { startPreview } from './lib/preview-server.mjs';
import { hashSources, RESUME_SOURCES } from './lib/hash-sources.mjs';

const PORT = 4322;
const OUT = 'public/Resume_Didier_Krux.pdf';
const META = 'public/resume.meta.json';

const server = await startPreview(PORT);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/resume`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#resume[data-packed="true"]', { timeout: 20_000 });
  const packedPages = Number(await page.getAttribute('#resume', 'data-pages'));
  const ok = (await page.getAttribute('#resume', 'data-ok')) === 'true';

  await page.emulateMedia({ media: 'print' });
  const raw = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });

  const doc = await PDFDocument.load(raw);
  const count = doc.getPageCount();
  if (count !== packedPages) throw new Error(`packer laid out ${packedPages} pages but the PDF has ${count}; check --rs-page-h in resume.css`);
  if (count > 4) throw new Error(`resume is ${count} pages, the hard limit is 4`);
  if (count > 3) console.warn(`WARN resume is ${count} pages; target is 2 or 3`);
  if (!ok) console.warn('WARN no layout hit the 2-3 page target; the fallback layout was used');

  doc.setTitle('Didier Krux · Resume');
  doc.setAuthor('Didier Krux');
  doc.setSubject('Fullstack Web3 Developer');
  doc.setKeywords(['Didier Krux', 'web3', 'Ethereum', 'fullstack developer', 'resume']);
  doc.setProducer('didierkrux.com resume:pdf');
  doc.setCreationDate(new Date());
  writeFileSync(OUT, await doc.save());
  writeFileSync(META, JSON.stringify({ generatedAt: new Date().toISOString(), pages: count, sourcesHash: hashSources(RESUME_SOURCES) }, null, 2) + '\n');
  console.log(`${OUT}: ${count} pages`);
} finally {
  await browser.close();
  server.stop();
}
