import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = mkdtempSync(join(tmpdir(), 'invitation-layout-'));

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
      '--window-size=1440,900',
      `--user-data-dir=${profile}`,
      '--virtual-time-budget=2500',
      '--dump-dom',
      `http://127.0.0.1:${port}/tests/mobile-canvas.probe.html`
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', rejectRun);
    child.on('close', code => code === 0 ? resolveRun(stdout) : rejectRun(new Error(stderr)));
  });

  const encoded = output.match(/<pre id="result">([^<]+)<\/pre>/)?.[1];
  assert.ok(encoded && encoded !== 'waiting', 'render probe should return layout metrics');
  const metrics = JSON.parse(encoded.replaceAll('&quot;', '"').replaceAll('&amp;', '&'));

  assert.ok(metrics.viewportWidth >= 1200, 'probe should exercise a desktop viewport');
  for (const [name, box] of Object.entries({ main: metrics.main, cover: metrics.cover })) {
    assert.ok(box.width <= 480, `${name} should stay at mobile width on desktop`);
    assert.ok(Math.abs(box.left - (metrics.viewportWidth - box.width) / 2) < 1, `${name} should be horizontally centered`);
  }
  assert.ok(metrics.music.right <= metrics.main.right - 15, 'music control should stay inside the mobile canvas');
  assert.ok(metrics.music.left >= metrics.main.left, 'music control should not escape the mobile canvas');
  assert.equal(metrics.countdownIsActive, false, 'paused countdown should not render in the page flow');
  assert.ok(metrics.border, 'the floral border should render between the prayer and couple sections');
  assert.ok(metrics.border.top < metrics.ayat.bottom, 'the floral border should overlap the end of the prayer section');
  assert.ok(metrics.border.bottom > metrics.mempelai.top, 'the floral border should overlap the start of the couple section');
  assert.ok(
    Math.abs(metrics.border.height / metrics.border.width - 1.7779) < 0.01,
    'the complete floral border should retain the source image aspect ratio without cropping',
  );
  assert.ok(
    (metrics.border.top + metrics.border.bottom) / 2 - metrics.mempelai.top >= 24,
    'the floral border should sit slightly below the prayer-to-couple boundary',
  );
  assert.ok(metrics.coupleCanvas, 'the couple illustration should have a dedicated canvas');
  assert.ok(metrics.coupleArtwork, 'the couple illustration should render as the section canvas');
  assert.ok(metrics.coupleArtworkNaturalRatio, 'the couple illustration should report its intrinsic ratio');
  assert.ok(
    Math.abs(metrics.coupleCanvas.height / metrics.coupleCanvas.width - metrics.coupleArtworkNaturalRatio) < 0.01,
    'the couple canvas should follow the artwork ratio so the image reaches both side edges without letterboxing',
  );
  assert.ok(
    Math.abs(metrics.coupleArtwork.left - metrics.coupleCanvas.left) < 1
      && Math.abs(metrics.coupleArtwork.right - metrics.coupleCanvas.right) < 1,
    'the couple artwork element should span the complete canvas width',
  );
  assert.ok(
    Math.abs(metrics.coupleCanvas.left - metrics.main.left) < 1
      && Math.abs(metrics.coupleCanvas.right - metrics.main.right) < 1,
    'the couple canvas should reach both edges of the mobile invitation without side padding',
  );
  assert.ok(metrics.loveStory, 'the love story should render after the couple section');
  assert.ok(
    Math.abs(metrics.coupleCanvas.bottom - metrics.loveStory.top) < 1,
    'the couple artwork should connect directly to the love story without a layout gap',
  );
  assert.ok(metrics.acara, 'the green event section should render after the love story');
  assert.ok(
    Math.abs(metrics.loveStory.bottom - metrics.acara.top) < 1,
    'the love story should connect directly to the green event section without a layout gap',
  );
  assert.equal(metrics.separateLocationSection, false, 'location should be consolidated into the event section');
  assert.deepEqual(
    metrics.eventRows,
    [
      'Tanggal Kamis, 12 November 2026',
      'Waktu 16.00–21.00 WIB',
    ],
    'date and time should remain the only icon-led event details',
  );
  assert.ok(metrics.eventRowWeights.every(weight => Number(weight) >= 600), 'date and time should retain a clearly bold weight after config binding');
  assert.deepEqual(
    metrics.eventCardSurface,
    { backgroundColor: 'rgba(0, 0, 0, 0)', borderTopWidth: '0px', boxShadow: 'none', beforeDisplay: 'none' },
    'the old tinted event panel and decorative border should be removed',
  );
  assert.equal(metrics.eventFrameSrc, 'assets/img/frame.png', 'the event content should use the supplied floral frame');
  assert.ok(metrics.eventFrame, 'the floral event frame should render');
  assert.ok(
    Math.abs(metrics.eventFrame.left - metrics.eventCard.left) < 1
      && Math.abs(metrics.eventFrame.right - metrics.eventCard.right) < 1
      && Math.abs(metrics.eventFrame.top - metrics.eventCard.top) < 1
      && Math.abs(metrics.eventFrame.bottom - metrics.eventCard.bottom) < 1,
    'the floral frame should cover the complete event card',
  );
  assert.ok(
    metrics.eventRowsBox.left - metrics.eventCard.left >= 56
      && metrics.eventCard.right - metrics.eventRowsBox.right >= 56,
    'event details should stay inside the floral frame safe area',
  );
  assert.ok(metrics.eventRowValueHeights.every(height => height <= 30), 'date and time should stay on one line inside the frame');
  assert.equal(metrics.venueKickerText, 'LOKASI', 'location should have its own event-style kicker');
  assert.deepEqual(metrics.venueKickerStyle, metrics.eventKickerStyle, 'location should match the Rangkaian Acara typography');
  assert.equal(metrics.venueNameText, 'Leviticus', 'the venue should have its own display heading');
  assert.deepEqual(metrics.venueNameStyle, metrics.eventNameStyle, 'Leviticus should match the Akad Nikah display typography');
  assert.equal(metrics.venuePhotoSrc, 'assets/img/leviticus.png', 'the venue photo should use the supplied Leviticus image');
  assert.equal(metrics.venuePhotoAlt, 'Leviticus', 'the venue photo should have a useful accessible label');
  assert.equal(metrics.mapsButtonText, 'MAPS');
  assert.ok(metrics.mapsButton.height <= 55, 'the Google Maps label should stay on one line');
  assert.equal(metrics.venueAddressText, 'Jl. Penyelesaian Tomang II No.1 Meruya Utara, Kec. Kembangan Jakarta Barat');
  assert.ok(metrics.eventCard && metrics.eventRowsBox && metrics.venueKicker && metrics.venueName && metrics.venuePhoto && metrics.venueAddress && metrics.mapsButton, 'all venue details should render inside the event card');
  assert.ok(metrics.eventRowsBox.bottom < metrics.venueKicker.top, 'the location heading should follow date and time');
  assert.ok(metrics.venueKicker.bottom <= metrics.venueName.top, 'the Leviticus heading should follow the location kicker');
  assert.ok(metrics.venueName.bottom < metrics.venuePhoto.top, 'the venue photo should follow the Leviticus heading');
  assert.ok(metrics.venuePhoto.bottom <= metrics.venueAddress.top, 'the address should remain below the venue photo');
  assert.ok(metrics.venueAddress.bottom <= metrics.mapsButton.top, 'the Google Maps button should follow the address');
  assert.ok(metrics.venuePhoto.left - metrics.eventCard.left >= 20 && metrics.eventCard.right - metrics.venuePhoto.right >= 20, 'the venue photo should have visible space on both sides');
  assert.ok(metrics.venuePhotoRadius >= 4 && metrics.venuePhotoRadius <= 12, 'the venue photo should have subtle rounded corners');
  for (const [name, box] of Object.entries({ address: metrics.venueAddress, maps: metrics.mapsButton })) {
    assert.ok(box.left >= metrics.eventCard.left && box.right <= metrics.eventCard.right, `${name} should stay inside the event card`);
  }
  assert.equal(metrics.eventDividerSrc, 'assets/img/divider.png', 'the Acara-to-RSVP transition should use the supplied divider');
  assert.ok(metrics.eventDivider && metrics.rsvp, 'the divider and RSVP section should render');
  const dividerCenter = (metrics.eventDivider.top + metrics.eventDivider.bottom) / 2;
  assert.ok(Math.abs(dividerCenter - metrics.acara.bottom) < 1, 'half of the divider should overlay the end of Acara');
  assert.ok(Math.abs(dividerCenter - metrics.rsvp.top) < 1, 'half of the divider should overlay the start of RSVP');
  assert.ok(Math.abs(metrics.eventDivider.left - metrics.main.left) < 1 && Math.abs(metrics.eventDivider.right - metrics.main.right) < 1, 'the divider should span the mobile invitation width');
  assert.ok(metrics.invitationIntro, 'the invitation introduction should expose its own spacing region');
  const invitationTopGap = metrics.invitationIntro.top - metrics.mempelai.top;
  const invitationBottomGap = metrics.coupleArtwork.top - metrics.invitationIntro.bottom;
  assert.ok(
    Math.abs(invitationTopGap - invitationBottomGap) <= 8,
    `the invitation introduction should have balanced space above and below it (top=${invitationTopGap}, bottom=${invitationBottomGap})`,
  );
  assert.ok(metrics.groomCopy && metrics.brideCopy, 'both partners should have copy over the illustration');
  for (const [name, copy] of Object.entries({ groom: metrics.groomCopy, bride: metrics.brideCopy })) {
    assert.ok(copy.left >= metrics.coupleArtwork.left && copy.right <= metrics.coupleArtwork.right, `${name} copy should stay inside the illustration`);
    assert.ok(copy.top >= metrics.coupleArtwork.top && copy.bottom <= metrics.coupleArtwork.bottom, `${name} copy should stay inside the illustration`);
  }
  assert.ok(
    (metrics.groomCopy.top - metrics.coupleArtwork.top) / metrics.coupleArtwork.height >= 0.40,
    'the groom name and description should sit clearly below the portrait',
  );
  assert.ok(
    (metrics.brideCopy.top - metrics.coupleArtwork.top) / metrics.coupleArtwork.height >= 0.824,
    'the bride name and description should sit clearly below the portrait',
  );
  assert.ok(metrics.groomCopy.bottom < metrics.brideCopy.top, 'groom and bride copy should remain vertically separated');
  assert.equal(metrics.ampVisible, false, 'the couple canvas should not show a standalone ampersand between portraits');
  assert.equal(metrics.separateInviteSection, false, 'invitation copy should be consolidated into the couple section');
  assert.equal(metrics.invitationHeading, 'Undangan Pernikahan');
  assert.equal(metrics.introductionLabel, 'MEMPERKENALKAN');
  assert.equal(metrics.introductionTitle, 'Mempelai');
  assert.equal(metrics.groomName, 'Muhammad Azamy', 'the couple artwork should use the groom full name');
  assert.equal(metrics.brideName, 'Saskiah Putri', 'the couple artwork should use the bride full name');
  assert.equal(metrics.groomParents, 'Anak kedua dari Bapak Fahrur Roezi dan Ibu Mirza Syahnaz');
  assert.equal(metrics.brideParents, 'Anak pertama dari Alm. Bapak Sukardi dan Ibu Zakiah');
} finally {
  await new Promise(resolveClose => server.close(resolveClose));
  rmSync(profile, { recursive: true, force: true });
}

console.log('Mobile canvas render test passed.');
