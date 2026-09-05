import { spawnSync } from 'node:child_process';
import { serveDist } from './serve-dist.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error(`static server did not answer at ${url}`);
}

/** Builds the site, then serves dist/ on the given port with our own static server. Call stop() when done. */
export async function startPreview(port) {
  const build = spawnSync('pnpm', ['exec', 'astro', 'build'], { stdio: 'inherit' });
  if (build.status !== 0) throw new Error('astro build failed');
  const server = serveDist(port);
  await waitFor(`http://127.0.0.1:${port}/`);
  return { stop: () => server.close() };
}
