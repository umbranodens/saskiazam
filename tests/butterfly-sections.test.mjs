import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = mkdtempSync(join(tmpdir(), 'invitation-butterflies-'));
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!file.startsWith(root + sep) && file !== join(root, 'index.html')) return response.writeHead(403).end();

  try {
    response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});

await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
const { port } = server.address();

try {
  const output = await new Promise((resolveRun, rejectRun) => {
    const child = spawn(chrome, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
      '--window-size=390,844', `--user-data-dir=${profile}`,
      '--virtual-time-budget=2200', '--dump-dom',
      `http://127.0.0.1:${port}/tests/butterfly-sections.probe.html`,
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', rejectRun);
    child.on('close', code => code === 0 ? resolveRun(stdout) : rejectRun(new Error(stderr)));
  });

  const encoded = output.match(/<pre id="result">([^<]+)<\/pre>/)?.[1];
  assert.ok(encoded && encoded !== 'waiting', 'butterfly probe should return rendered section metrics');
  const state = JSON.parse(encoded.replaceAll('&quot;', '"').replaceAll('&amp;', '&'));

  for (const id of ['hero', 'mempelai', 'rsvp', 'penutup']) {
    const section = state.sections[id];
    assert.ok(section.count >= 3, `${id} should contain several animated butterflies`);
    assert.ok(section.sources.every(src => src === 'assets/img/butterfly.png'), `${id} should use butterfly.png for every butterfly`);
    assert.ok(section.loaded.every(Boolean), `${id} butterfly artwork should load successfully`);
    assert.ok(section.animations.every(name => name && name !== 'none'), `${id} butterflies should have motion`);
    assert.ok(section.pointerEvents.every(value => value === 'none'), `${id} butterfly field must not block controls or links`);
  }

  assert.equal(state.legacyHeroButterflies, 0, 'the hero should no longer render the legacy SVG butterfly');
} finally {
  await new Promise(resolveClose => server.close(resolveClose));
  rmSync(profile, { recursive: true, force: true });
}

console.log('Animated butterfly sections render test passed.');
