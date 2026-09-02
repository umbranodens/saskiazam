import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = mkdtempSync(join(tmpdir(), 'invitation-closing-background-'));
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
      `http://127.0.0.1:${port}/tests/closing-background.probe.html`,
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', rejectRun);
    child.on('close', code => code === 0 ? resolveRun(stdout) : rejectRun(new Error(stderr)));
  });

  const encoded = output.match(/<pre id="result">([^<]+)<\/pre>/)?.[1];
  assert.ok(encoded && encoded !== 'waiting', 'closing background probe should return layout metrics');
  const metrics = JSON.parse(encoded.replaceAll('&quot;', '"').replaceAll('&amp;', '&'));

  assert.ok(metrics.viewportWidth <= 375, 'probe should exercise the effective width of a narrow phone viewport');
  assert.equal(metrics.artSrc, 'assets/img/ending.png', 'closing should render the supplied ending artwork');
  assert.equal(metrics.artLoaded, true, 'ending artwork should load successfully');
  assert.equal(metrics.artFit, 'cover', 'ending artwork should cover the closing section');
  assert.ok(Math.abs(metrics.art.top - metrics.section.top) < 1 && Math.abs(metrics.art.bottom - metrics.section.bottom) < 1, 'ending artwork should cover the full section height');
  assert.ok(Math.abs(metrics.art.left - metrics.section.left) < 1 && Math.abs(metrics.art.right - metrics.section.right) < 1, 'ending artwork should cover the full section width');
  assert.ok(metrics.contentZIndex > metrics.artZIndex, 'closing copy should render above ending artwork');
  assert.equal(metrics.footerVisible, true, 'credit footer should remain visibly rendered on a narrow phone viewport');
  assert.equal(metrics.footerInsideClosing, true, 'credit footer should stay inside the closing scene instead of falling below the mobile ending');
  assert.ok(Math.abs(metrics.footer.bottom - metrics.section.bottom) < 1, 'credit footer should anchor to the bottom edge of the closing scene');
  assert.ok(metrics.footerZIndex > metrics.artZIndex, 'credit footer should remain above the ending artwork');
  assert.match(metrics.stylesheetHref || '', /^style\.css\?v=.+/, 'mobile clients should receive a versioned stylesheet URL instead of reusing stale footer CSS');
  assert.equal(metrics.localScriptSrcs.length, 2, 'the page should load both local scripts');
  for (const src of metrics.localScriptSrcs) {
    assert.match(src, /\.js\?v=.+/, `mobile clients should receive a versioned script URL: ${src}`);
  }
  assert.equal(metrics.dividerSrc, 'assets/img/divider.png', 'wishes should render the supplied divider before closing');
  const sectionBoundary = metrics.wishes.bottom;
  const dividerCenter = (metrics.divider.top + metrics.divider.bottom) / 2;
  assert.ok(Math.abs(sectionBoundary - metrics.section.top) < 1, 'wishes and closing should meet without a layout gap');
  assert.ok(Math.abs(dividerCenter - sectionBoundary) < 1, 'divider should overlap the wishes-closing boundary equally');
  assert.ok(Math.abs(metrics.divider.left - metrics.wishes.left) < 1 && Math.abs(metrics.divider.right - metrics.wishes.right) < 1, 'divider should span the full invitation canvas');
  assert.ok(metrics.dividerZIndex > metrics.artZIndex, 'divider should remain visible above ending artwork');
  assert.equal(metrics.oldOrnamentCount, 0, 'legacy closing ornaments should be removed');
  assert.equal(metrics.hasClosingSalam, false, 'closing salutation should be removed');
  assert.ok(metrics.content.bottom < metrics.section.top + metrics.section.height * 0.58, 'closing copy should stay in the open sky above the illustrated couple');
} finally {
  await new Promise(resolveClose => server.close(resolveClose));
  rmSync(profile, { recursive: true, force: true });
}

console.log('Closing background mobile render test passed.');
