import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /<img[^>]+src="assets\/img\/arc\.png"[^>]*>/, 'hero should render the supplied garden arch image');
assert.equal((html.match(/<article class="ev\b/g) || []).length, 1, 'continuous ceremony should use one event card');
assert.doesNotMatch(html, /id="rsvpMsg"/, 'RSVP form should not contain the public wish textarea');
assert.match(html, /<form[^>]+id="wishForm"[\s\S]*?id="wishMessage"/, 'wishes should have their own form');
assert.match(html, /WEDDING GIFT PAUSED[\s\S]*?<section id="hadiah"[\s\S]*?<\/section>[\s\S]*?END WEDDING GIFT PAUSED/, 'gift markup should remain available inside an HTML comment');
assert.match(html, /<img[^>]+class="couple__artwork"[^>]+src="assets\/img\/couple\.png"[^>]*>/, 'couple section should use the supplied full illustration');
