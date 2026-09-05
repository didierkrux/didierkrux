import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const RESUME_SOURCES = [
  'src/content/profile',
  'src/content/roles',
  'src/content/education',
  'src/content/projects',
  'src/content/skills.yaml',
  'src/pages/resume.astro',
  'src/layouts/ResumeLayout.astro',
  'src/styles/resume.css',
  'src/lib/resume-pack.ts',
  'src/lib/resume-controller.ts',
  'src/lib/content.ts',
];

function filesUnder(path) {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path).sort().flatMap((f) => filesUnder(join(path, f)));
}

export function hashSources(paths) {
  const h = createHash('sha256');
  for (const p of paths) for (const f of filesUnder(p)) { h.update(f); h.update(readFileSync(f)); }
  return h.digest('hex');
}
