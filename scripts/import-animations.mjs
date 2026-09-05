// Fetch the clips listed in src/lib/animations.json from meeb.cam into public/anims. Run by hand; the files are committed.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = process.env.ANIMS_BASE ?? 'https://meeb.cam/animations-glb';
const { animations } = JSON.parse(readFileSync(resolve(process.cwd(), 'src/lib/animations.json'), 'utf8'));
const dir = resolve(process.cwd(), 'public/anims');
mkdirSync(dir, { recursive: true });

let fetched = 0;
for (const a of animations) {
  const out = resolve(dir, a.file);
  if (existsSync(out) && !process.env.FORCE) continue;
  const res = await fetch(`${BASE}/${a.file}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!res.ok || buf.subarray(0, 4).toString() !== 'glTF') { console.warn(`skip ${a.id}: ${res.status}`); continue; }
  writeFileSync(out, buf);
  fetched++;
}
console.log(`${fetched} clips fetched, ${animations.length} listed, in ${dir}`);
