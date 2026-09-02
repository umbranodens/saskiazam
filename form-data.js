(function exposeInvitationForms(root) {
  'use strict';

  const SUBMISSION_COOLDOWN_MS = 30000;

  function clean(value, max) {
    return String(value == null ? '' : value).trim().replace(/\s+/g, ' ').slice(0, max);
  }

  function buildRsvpPayload(values) {
    const attendance = values.kehadiran === 'Berhalangan Hadir' ? 'Berhalangan Hadir' : 'Hadir';
    const parsedCount = parseInt(values.jumlah, 10) || 1;

    return {
      action: 'rsvp',
      nama: clean(values.nama, 80),
      kehadiran: attendance,
      jumlah: Math.min(Math.max(parsedCount, 1), 10)
    };
  }

  function buildWishPayload(values) {
    return {
      action: 'wish',
      nama: clean(values.nama, 80),
      ucapan: clean(values.ucapan, 500)
    };
  }

  function getSubmissionCooldownRemaining(lastSubmissionAt, now) {
    const elapsed = Number(now) - Number(lastSubmissionAt || 0);
    return Math.max(SUBMISSION_COOLDOWN_MS - elapsed, 0);
  }

  const api = { buildRsvpPayload, buildWishPayload, getSubmissionCooldownRemaining };
  root.InvitationForms = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports.buildRsvpPayload = buildRsvpPayload;
    module.exports.buildWishPayload = buildWishPayload;
    module.exports.getSubmissionCooldownRemaining = getSubmissionCooldownRemaining;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
