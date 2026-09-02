import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const moduleUrl = new URL('../form-data.js', import.meta.url);

assert.equal(
  existsSync(moduleUrl),
  true,
  'form payload builders should live in a reusable browser/Node module'
);

const {
  buildRsvpPayload,
  buildWishPayload,
  getSubmissionCooldownRemaining
} = await import(moduleUrl);

assert.deepEqual(
  buildRsvpPayload({
    nama: '  Saskia  ',
    kehadiran: 'Hadir',
    jumlah: '12',
    ucapan: 'this must remain private from RSVP'
  }),
  { action: 'rsvp', nama: 'Saskia', kehadiran: 'Hadir', jumlah: 10 },
  'RSVP payload should contain attendance data only and clamp the guest count'
);

assert.deepEqual(
  buildWishPayload({
    nama: '  Azamy  ',
    ucapan: '  Semoga menjadi keluarga sakinah.  ',
    kehadiran: 'Hadir',
    jumlah: 4
  }),
  { action: 'wish', nama: 'Azamy', ucapan: 'Semoga menjadi keluarga sakinah.' },
  'wish payload should contain public message data only'
);

assert.equal(
  getSubmissionCooldownRemaining(1_000, 30_999),
  1,
  'a second submission should remain blocked until the full 30-second cooldown elapses'
);

assert.equal(
  getSubmissionCooldownRemaining(1_000, 31_000),
  0,
  'a second submission should be allowed exactly 30 seconds after the previous success'
);
