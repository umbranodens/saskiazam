import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

assert.match(
  css,
  /\/\* Premium restraint: the continuous marquee is removed from the reading flow\. \*\/\s*\.marquee\s*\{\s*display:\s*none;/,
  'the continuous marquee should be removed from the invitation flow'
);

assert.match(
  css,
  /\/\* Premium paper panels: quiet borders and no floating-card shadow\. \*\/\s*\.ev,\s*\.mapcard,\s*\.gift\s*\{[\s\S]*?box-shadow:\s*none;/,
  'information panels should use quiet paper treatment instead of floating shadows'
);
