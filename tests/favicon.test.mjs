import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

function pngSize(path) {
  const url = new URL(path, import.meta.url);
  assert.equal(existsSync(url), true, `${path} should exist`);
  const bytes = readFileSync(url);
  assert.equal(bytes.toString('ascii', 1, 4), 'PNG', `${path} should be a PNG image`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(
  html,
  /<link[^>]+rel="icon"[^>]+href="assets\/img\/favicon\.png"[^>]*>/,
  'the document should expose the optimized butterfly favicon to browsers',
);
assert.match(
  html,
  /<link[^>]+rel="apple-touch-icon"[^>]+href="assets\/img\/apple-touch-icon\.png"[^>]*>/,
  'the document should expose a touch icon for mobile home screens',
);
assert.deepEqual(pngSize('../assets/img/favicon.png'), { width: 64, height: 64 });
assert.deepEqual(pngSize('../assets/img/apple-touch-icon.png'), { width: 180, height: 180 });

console.log('Butterfly favicon test passed.');
