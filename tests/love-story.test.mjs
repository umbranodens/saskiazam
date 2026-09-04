import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = mkdtempSync(join(tmpdir(), 'invitation-love-story-'));
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
      `http://127.0.0.1:${port}/tests/love-story.probe.html`,
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', rejectRun);
    child.on('close', code => code === 0 ? resolveRun(stdout) : rejectRun(new Error(stderr)));
  });

  const encoded = output.match(/<pre id="result">([^<]+)<\/pre>/)?.[1];
  assert.ok(encoded && encoded !== 'waiting', 'love story probe should return rendered section details');
  const state = JSON.parse(encoded.replaceAll('&quot;', '"').replaceAll('&amp;', '&'));

  assert.equal(state.exists, true, 'love story section should render');
  assert.equal(state.betweenMempelaiAndAcara, true, 'love story should appear between Mempelai and Acara');
  assert.equal(state.eyebrow, 'A story written by Allah');
  assert.equal(state.heading, 'Our Love Story');
  assert.deepEqual(state.dates, ['May 2024', 'June 2026', 'August 2026', 'November 2026']);
  assert.deepEqual(state.titles, ['The First Encounter', 'The Intention', 'The Commitment', 'In Syaa Allah']);
  assert.equal(state.quote, 'What is meant for you will always find its way to you.');
  assert.equal(state.butterflies.length, 3, 'love story should include three butterfly ornaments');
  assert.ok(state.butterflies.every(item => item.src === 'assets/img/butterfly.png' && item.loaded), 'all story butterflies should use the supplied artwork');
  assert.ok(state.butterflies.every(item => item.animation && item.animation !== 'none'), 'all story butterflies should drift');
  assert.ok(Number.parseFloat(state.timelineWidth) <= 342, 'timeline should fit a 390px mobile viewport');
} finally {
  await new Promise(resolveClose => server.close(resolveClose));
  rmSync(profile, { recursive: true, force: true });
}

console.log('Love story section render test passed.');
