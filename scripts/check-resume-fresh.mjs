import { existsSync, readFileSync } from 'node:fs';
import { hashSources, RESUME_SOURCES } from './lib/hash-sources.mjs';

const META = 'public/resume.meta.json';
if (!existsSync(META)) {
  console.warn('WARN public/resume.meta.json missing; run `pnpm resume:pdf`');
} else {
  const meta = JSON.parse(readFileSync(META, 'utf8'));
  if (meta.sourcesHash !== hashSources(RESUME_SOURCES)) {
    console.warn('WARN the resume PDF is older than its sources; run `pnpm resume:pdf` and commit the result');
  } else {
    console.log(`resume PDF is fresh (${meta.pages} pages, generated ${meta.generatedAt})`);
  }
}
