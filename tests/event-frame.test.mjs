import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = mkdtempSync(join(tmpdir(), 'invitation-event-frame-'));
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

try {
  const output = await new Promise((resolveRun, rejectRun) => {
    const child = spawn(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--window-size=390,844',
      `--user-data-dir=${profile}`,
      '--virtual-time-budget=1800',
      '--dump-dom',
      `http://127.0.0.1:${port}/tests/event-frame.probe.html`,
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', rejectRun);
    child.on('close', code => code === 0 ? resolveRun(stdout) : rejectRun(new Error(stderr)));
  });

  const encoded = output.match(/<pre id="result">([^<]+)<\/pre>/)?.[1];
  assert.ok(encoded && encoded !== 'waiting', 'event frame probe should return layout metrics');
  const metrics = JSON.parse(encoded.replaceAll('&quot;', '"').replaceAll('&amp;', '&'));

  assert.ok(metrics.viewportWidth <= 375, 'probe should exercise the effective width of a narrow phone viewport');
  assert.equal(metrics.cardTransform, 'none', 'revealed event frame should return to its layout position');
  const frameTopGap = metrics.card.top - metrics.acara.top;
  const frameBottomGap = metrics.acara.bottom - metrics.card.bottom;
  assert.ok(
    Math.abs(frameTopGap - frameBottomGap) < 1,
    `event frame should have balanced space above and below it (top=${frameTopGap}, bottom=${frameBottomGap})`,
  );
  for (const transform of [metrics.eventKickerTransform, metrics.eventNameTransform]) {
    const translateY = Number(transform.match(/^matrix\([^,]+, [^,]+, [^,]+, [^,]+, [^,]+, ([^)]+)\)$/)?.[1]);
    assert.ok(translateY >= 6 && translateY <= 10, 'event headings should move down by about two percent of the frame width');
  }
  assert.ok(metrics.rows.left - metrics.card.left >= 56 && metrics.card.right - metrics.rows.right >= 56, 'event details should stay inside the frame safe area');
  assert.ok(metrics.rowsGap >= 6 && metrics.rowsGap <= 8, 'date and time should use a compact vertical gap');
  const cardCenter = (metrics.card.left + metrics.card.right) / 2;
  assert.ok(metrics.rowValueCenters.every(center => Math.abs(center - cardCenter) < 1), 'date and time text should be centered within the event frame');
  assert.ok(metrics.rowValueHeights.every(height => height <= 30), 'date and time should remain on one line at phone width');
  assert.equal(metrics.venue.borderTopWidth, '0px', 'location should not have a divider line above it');
  assert.equal(metrics.venue.paddingTop, '0px', 'location should not reserve divider padding above it');
  assert.ok(metrics.venueKicker.top - metrics.rows.bottom <= 30, 'location heading should rise closer to date and time');
  assert.ok(metrics.venuePhoto.width / metrics.rows.width <= 0.88, 'Leviticus photo should stay within the floral frame safe area');
  const photoLeftInset = metrics.venuePhoto.left - metrics.card.left;
  const photoRightInset = metrics.card.right - metrics.venuePhoto.right;
  assert.ok(Math.abs(photoLeftInset - photoRightInset) < 0.5, 'Leviticus photo should have exactly balanced left and right spacing');
  assert.ok(metrics.venueAddress.left - metrics.card.left >= 62 && metrics.card.right - metrics.venueAddress.right >= 62, 'venue address should remain inside the frame safe area');
  assert.deepEqual(metrics.venueAddressLines, [
    'Jl. Penyelesaian Tomang II No.1',
    'Meruya Utara, Kec. Kembangan',
    'Jakarta Barat',
  ], 'venue address should retain the requested three-line structure after config binding');
  assert.equal(metrics.venueAddressAlign, 'center', 'venue address should be centered');
  assert.ok(metrics.venueAddressLineCenters.every(center => Math.abs(center - cardCenter) < 1), 'every venue address line should share the frame center');
  assert.ok(metrics.venueAddress.height <= 66, 'venue address should finish above the frame bottom ornament');
  assert.equal(metrics.mapsButtonText, 'MAPS', 'map CTA should use the compact Maps label');
  assert.ok(metrics.mapsButton.width <= 110 && metrics.mapsButton.height <= 44, 'map CTA should remain compact');
} finally {
  await new Promise(resolveClose => server.close(resolveClose));
  rmSync(profile, { recursive: true, force: true });
}

console.log('Event frame mobile render test passed.');
