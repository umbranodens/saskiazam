import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = mkdtempSync(join(tmpdir(), 'invitation-hero-width-'));
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);

  if (!file.startsWith(root + sep) && file !== join(root, 'index.html')) {
    response.writeHead(403).end();
    return;
  }

  try {
    response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});

await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const { port } = server.address();

async function probe(width, height) {
  const output = await new Promise((resolveRun, rejectRun) => {
    const child = spawn(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      `--window-size=${width},${height}`,
      `--user-data-dir=${profile}`,
      '--virtual-time-budget=1800',
      '--dump-dom',
      `http://127.0.0.1:${port}/tests/hero-width.probe.html`,
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', rejectRun);
    child.on('close', code => code === 0 ? resolveRun(stdout) : rejectRun(new Error(stderr)));
  });

  const encoded = output.match(/<pre id="result">([^<]+)<\/pre>/)?.[1];
  assert.ok(encoded && encoded !== 'waiting', `hero probe should return metrics at ${width}x${height}`);
  return JSON.parse(encoded.replaceAll('&quot;', '"').replaceAll('&amp;', '&'));
}

try {
  const desktop = await probe(1440, 768);
  const mobile = await probe(390, 844);

  for (const [viewport, metrics] of Object.entries({ desktop, mobile })) {
    assert.ok(
      Math.abs(metrics.art.left - metrics.hero.left) < 1
        && Math.abs(metrics.art.right - metrics.hero.right) < 1,
      `hero artwork should reach both canvas edges on ${viewport} (hero=${metrics.hero.width}, art=${metrics.art.width})`,
    );
    assert.equal(metrics.artFit, 'cover', `hero artwork should preserve cover cropping on ${viewport}`);
  }
} finally {
  await new Promise(resolveClose => server.close(resolveClose));
  rmSync(profile, { recursive: true, force: true });
}

console.log('Responsive hero width render test passed.');
