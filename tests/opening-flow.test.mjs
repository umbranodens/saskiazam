import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = mkdtempSync(join(tmpdir(), 'invitation-opening-'));
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
      '--virtual-time-budget=5500', '--dump-dom',
      `http://127.0.0.1:${port}/tests/opening-flow.probe.html`
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', rejectRun);
    child.on('close', code => code === 0 ? resolveRun(stdout) : rejectRun(new Error(stderr)));
  });

  const encoded = output.match(/<pre id="result">([^<]+)<\/pre>/)?.[1];
  assert.ok(encoded && encoded !== 'waiting', 'opening probe should return interaction metrics');
  const state = JSON.parse(encoded.replaceAll('&quot;', '"').replaceAll('&amp;', '&'));

  assert.equal(state.initial.label.toUpperCase(), 'KEPADA YTH.');
  assert.equal(state.initial.guest, 'Armia Riyan & Istri', 'the cover should render the query recipient directly');
  assert.equal(state.initial.defaultGuest, 'Bapak / Ibu', 'the local preview should use the configured fallback recipient');
  assert.equal(state.initial.dateCount, 0, 'the cover should not show a wedding date');
  assert.equal(state.initial.honorificCount, 0, 'the query recipient should appear directly below the label');
  assert.deepEqual(state.initial.gateImages, [
    { src: '/assets/img/gate.png', loaded: true },
    { src: '/assets/img/gate.png', loaded: true }
  ], 'both opening panels should render the supplied gate image');
  assert.equal(state.opening.coverOpen, true, 'the button should enter the opening state');
  assert.equal(state.opening.coverBackground, 'rgba(0, 0, 0, 0)', 'the opening gap should reveal the destination arc');
  assert.ok(state.opening.gateAnimations.every(count => count > 0), 'both gate panels should animate apart');
  assert.ok(state.opening.arcAnimations > 0, 'the destination arc should animate into view');
  assert.ok(Number.parseFloat(state.opening.gateDuration) >= 1.75, 'the gate should open roughly 1.5 times slower');
  assert.equal(state.opening.heroOpacity, '0', 'hero copy should remain hidden while the arc enters');
  assert.ok(
    Number.parseFloat(state.opening.heroDelay) >= Number.parseFloat(state.opening.arcDelay) + Number.parseFloat(state.opening.arcDuration),
    'hero copy should start only after the arc entrance completes'
  );
  assert.equal(state.settled.coverRemoved, true);
  assert.equal(state.settled.bodyUnlocked, true);
  assert.equal(state.settled.heroOpacity, '1');
  assert.ok(Number.parseInt(state.settled.dateWeight, 10) >= 600, 'the hero date should be visibly bold');
} finally {
  await new Promise(resolveClose => server.close(resolveClose));
  rmSync(profile, { recursive: true, force: true });
}

console.log('Opening flow render test passed.');
