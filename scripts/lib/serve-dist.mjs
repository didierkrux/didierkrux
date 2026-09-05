import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
  '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.vrm': 'application/octet-stream',
};

function resolveFile(root, urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const candidates = clean.endsWith('/')
    ? [join(root, clean, 'index.html')]
    : [join(root, clean), join(root, clean, 'index.html'), join(root, `${clean}.html`)];
  for (const c of candidates) if (existsSync(c) && statSync(c).isFile()) return { file: c, status: 200 };
  return { file: join(root, '404.html'), status: 404 };
}

/** Serves a built Astro dist/ folder the way a static host would. Returns the http.Server. */
export function serveDist(port, root = 'dist', host = '127.0.0.1') {
  const server = createServer((req, res) => {
    const { file, status } = resolveFile(root, req.url ?? '/');
    if (!existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(status, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  server.listen(port, host);
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? 4321);
  serveDist(port);
  console.log(`serving dist/ at http://127.0.0.1:${port}`);
}
