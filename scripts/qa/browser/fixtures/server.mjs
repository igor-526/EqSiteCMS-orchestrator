import http from 'node:http';
import { readFile } from 'node:fs/promises';
// Synthetic-only server; no arbitrary files, processes, product services or credentials.
export async function startFixtureServer({ variant = 'good', lifetimeMs = 120000 } = {}) {
  if (!Number.isInteger(lifetimeMs) || lifetimeMs <= 0 || lifetimeMs > 900000) throw new Error('invalid_fixture_lifetime');
  const html = await readFile(new URL('./surface.html', import.meta.url), 'utf8');
  const allowed = new Set(['good', 'bad', 'pending', 'bad-pending', 'geometry-bad', 'clipping-bad', 'contrast-bad', 'sizing-bad', 'image-bad', 'compositing-bad']);
  let current = variant;
  const server = http.createServer((request, response) => {
    const requested = new URL(request.url, 'http://localhost').pathname.slice(1);
    const mode = allowed.has(requested) ? requested : current;
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(html.replace('__FIXTURE_VARIANT__', mode));
  });
  server.requestTimeout = 5000; server.headersTimeout = 5000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const close = async () => { clearTimeout(timer); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); };
  const timer = setTimeout(() => { server.closeAllConnections(); server.close(); }, lifetimeMs);
  timer.unref();
  return { baseUrl: `http://127.0.0.1:${server.address().port}`, setVariant(value) {
    if (!allowed.has(value)) throw new Error('invalid_fixture_variant'); current = value;
  }, close };
}
