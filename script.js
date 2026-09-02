/* =====================================================================
   UNDANGAN PERNIKAHAN — Muhammad Azamy & Saskiah Putri
   Vanilla JS, tanpa library.

   Modul di berkas ini:
     01 WEDDING_CONFIG   ← SEMUA DATA ADA DI SINI
     02 Util             03 Bind config     04 Nama tamu (?to=)
     05 Marquee          06 Cover & gerbang 07 Audio
     08 Reveal           09 Parallax        10 Countdown
     11 Kalender (.ics)  12 Hadiah & salin  13 RSVP & ucapan
   ===================================================================== */
'use strict';

/* ---------------------------------------------------------------
   01 · WEDDING_CONFIG
   ============ GANTI SEMUA DATA UNDANGAN DI BLOK INI ============
   Nilai di sini adalah sumber kebenaran. Teks yang tertulis di
   index.html (pada elemen data-wc) hanya cadangan bila JS gagal.
   --------------------------------------------------------------- */
const WEDDING_CONFIG = {

  /* --- Mempelai --- */
  groom:        'Azam',
  bride:        'Saski',
  groomFull:    'Muhammad Azamy',
  brideFull:    'Saskiah Putri',
  groomFather:  'Fahrur Roezi',
  groomMother:  'Mirza Syahnaz',
  brideFather:  'Sukardi',
  brideMother:  'Zakiah',

  /* --- Tanggal (teks tampilan) --- */
  dateLong:      'Kamis, 12 November 2026',
  dateLongUpper: 'KAMIS, 12 NOVEMBER 2026',
  dateShort:     '12.11.2026',

  /* --- Acara --- */
  eventTime: '16.00–21.00 WIB',

  /* Waktu mesin — dipakai countdown & file kalender.
     Format ISO 8601 dengan zona waktu. WIB = +07:00 */
  akadISO:    '2026-11-12T16:00:00+07:00',
  akadEndISO: '2026-11-12T19:00:00+07:00',

  /* --- Lokasi --- */
  venueName:    'Leviticus',
  venueAddress: 'Jl. Penyelesaian Tomang II No.1, Meruya Utara, Kec. Kembangan, Jakarta Barat',
  venueAddressLines: [
    'Jl. Penyelesaian Tomang II No.1',
    'Meruya Utara, Kec. Kembangan',
    'Jakarta Barat',
  ],
  mapsUrl:      'https://maps.app.goo.gl/dH4TYNpHsMKQjqUh9',

  /* --- Musik latar ---
     Taruh berkas MP3 di assets/audio/backsound.mp3
     Atau ganti dengan URL penuh ke berkas audio Anda. */
  musicUrl: 'assets/audio/backsound.mp3',
  musicVolume: 0.45,

  /* --- Sapaan default bila ?to= tidak ada --- */
  defaultGuest: 'Bapak / Ibu',

  /* --- Teks pita berjalan --- */
  marqueeTop: ["Walimatul 'Ursy", '12 . 11 . 2026', 'Jakarta Barat'],
  marqueeBot: ['Terima Kasih', '12 . 11 . 2026', 'Azamy & Saskiah'],

  /* --- Rekening hadiah (DUMMY — ganti dengan milik Anda) --- */
  gifts: [
    { bank: 'BCA',     number: '1234567', holder: 'SASKIAH PUTRI' },
    { bank: 'MANDIRI', number: '7654321', holder: 'MUHAMMAD AZAMY' }
  ],

  /* --- Nomor WhatsApp cadangan bila RSVP gagal terkirim ---
     Format internasional tanpa tanda + dan tanpa spasi. */
  whatsapp: '6281234567890',

  /* --- Google Apps Script Web App ---
     Biarkan string kosong '' → halaman jalan dalam MODE DEMO:
     form tetap berfungsi, ucapan tampil lokal, tapi tidak tersimpan.
     Isi dengan URL /exec dari Apps Script Anda untuk mengaktifkan.
     Petunjuk lengkap ada di README.md */
  appsScriptUrl: ''
};


/* ---------------------------------------------------------------
   02 · UTIL
   --------------------------------------------------------------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Ubah teks apa pun menjadi aman untuk disisipkan ke DOM,
 *  termasuk sebagai nilai atribut (kutip ikut di-escape). */
function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Batasi nilai di antara min dan max. */
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

function store(key, val) {
  try {
    if (val === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, val);
  } catch (e) { /* mode privat / storage diblokir — abaikan */ }
  return null;
}


/* ---------------------------------------------------------------
   03 · BIND CONFIG → elemen ber-atribut data-wc
   --------------------------------------------------------------- */
function bindConfig() {
  $$('[data-wc]').forEach(el => {
    const key = el.dataset.wc;
    if (key in WEDDING_CONFIG && typeof WEDDING_CONFIG[key] === 'string') {
      el.textContent = WEDDING_CONFIG[key];
    }
  });

  $$('[data-wc-lines]').forEach(el => {
    const lines = WEDDING_CONFIG[el.dataset.wcLines];
    if (!Array.isArray(lines)) return;

    const nodes = lines.map(line => {
      const span = document.createElement('span');
      span.textContent = line;
      return span;
    });
    el.replaceChildren(...nodes);
  });

  const maps = $('#mapsBtn');
  if (maps) maps.href = WEDDING_CONFIG.mapsUrl;

  document.title = `${WEDDING_CONFIG.groom} & ${WEDDING_CONFIG.bride} — Undangan Pernikahan`;
}


/* ---------------------------------------------------------------
   04 · NAMA TAMU dari ?to=
   --------------------------------------------------------------- */
function initGuest() {
  const el = $('#guestName');
  if (!el) return;

  let name = '';
  try {
    name = new URLSearchParams(location.search).get('to') || '';
  } catch (e) { name = ''; }

  // rapikan: buang karakter kendali, ratakan spasi, batasi panjang
  name = name.replace(/[\u0000-\u001F\u007F<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);

  el.textContent = name || WEDDING_CONFIG.defaultGuest;

  // isi otomatis nama di form RSVP
  const input = $('#rsvpName');
  if (input && name) input.value = name;
  const wishInput = $('#wishName');
  if (wishInput && name) wishInput.value = name;
}


/* ---------------------------------------------------------------
   05 · MARQUEE — isi digandakan agar loop -50% mulus
   --------------------------------------------------------------- */
function buildMarquee(el, items) {
  if (!el || !items || !items.length) return;
  const half = items.map(t => `<span>${escapeHtml(t)}</span><span>&middot;</span>`).join('');
  el.innerHTML = half.repeat(6); // 3 set per separuh × 2 separuh
}

function initMarquee() {
  buildMarquee($('#marqueeTop'), WEDDING_CONFIG.marqueeTop);
  buildMarquee($('#marqueeBot'), WEDDING_CONFIG.marqueeBot);
}


/* ---------------------------------------------------------------
   06 · COVER & GERBANG
   --------------------------------------------------------------- */
function initCover() {
  const cover = $('#cover');
  const btn   = $('#openBtn');
  const main  = $('#main');
  const hero  = $('#hero');
  if (!cover || !btn || !main) return;

  let opened = false;

  function open() {
    if (opened) return;
    opened = true;

    // Musik HARUS diputar di dalam handler klik ini juga —
    // di luar sini browser akan memblokirnya sebagai autoplay.
    Audio_.start();

    btn.disabled = true;
    main.classList.add('is-opening');

    // Cover sudah ter-paint sebelum interaksi pengguna, jadi transisi dapat
    // dimulai langsung tanpa menunggu frame tambahan yang membuat respons lambat.
    cover.classList.add('is-open');

    const settle = REDUCED ? 420 : 2800;

    setTimeout(() => {
      document.body.classList.remove('is-locked');
      main.removeAttribute('inert');
      main.classList.replace('is-opening', 'is-opened');
      window.scrollTo(0, 0);
      if (hero) hero.focus({ preventScroll: true });
      // buang cover dari DOM agar tidak membebani scroll
      cover.remove();
    }, settle);
  }

  btn.addEventListener('click', open);
}


/* ---------------------------------------------------------------
   07 · AUDIO
   --------------------------------------------------------------- */
const Audio_ = (() => {
  const audio = $('#bgAudio');
  const btn   = $('#musicBtn');
  let muted  = store('wc_muted') === '1';
  let failed = false;   // berkas audio tidak bisa dimuat sama sekali

  function paint() {
    if (!btn) return;
    // Dua jalur kegagalan yang berbeda:
    //  · berkas rusak/hilang  → tombol disembunyikan (kontrol mati tak berguna)
    //  · autoplay diblokir    → tombol tetap tampil supaya tamu bisa menyalakan
    btn.hidden = failed;
    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    btn.setAttribute('aria-label', muted ? 'Nyalakan musik' : 'Matikan musik');
  }

  function start() {
    if (!audio) return;
    if (!WEDDING_CONFIG.musicUrl) { paint(); return; }

    audio.src = WEDDING_CONFIG.musicUrl;
    audio.volume = WEDDING_CONFIG.musicVolume;
    audio.muted = muted;

    // .play() mengembalikan Promise yang bisa ditolak — tangani,
    // jangan biarkan halaman tampak rusak kalau audio gagal.
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        muted = true;
        audio.muted = true;
        paint();
      });
    }
    paint();
  }

  function toggle() {
    if (!audio) return;
    muted = !muted;
    audio.muted = muted;
    if (!muted && audio.paused) { const p = audio.play(); if (p) p.catch(() => {}); }
    store('wc_muted', muted ? '1' : '0');
    paint();
  }

  if (btn) btn.addEventListener('click', toggle);

  // Berkas musik tidak ada atau gagal dimuat → sembunyikan tombolnya.
  // Lebih baik tidak ada kontrol sama sekali daripada kontrol yang mati.
  if (audio) {
    audio.addEventListener('error', () => {
      failed = true;
      paint();
      console.info('[undangan] musik tidak dapat dimuat:', WEDDING_CONFIG.musicUrl);
    });
  }

  // hentikan musik saat tab disembunyikan, lanjutkan saat kembali
  document.addEventListener('visibilitychange', () => {
    if (!audio || !audio.src) return;
    if (document.hidden) { audio.pause(); }
    else if (!muted) { const p = audio.play(); if (p) p.catch(() => {}); }
  });

  return { start, toggle };
})();


/* ---------------------------------------------------------------
   08 · REVEAL saat masuk viewport
   --------------------------------------------------------------- */
function initReveal() {
  const items = $$('.reveal');
  if (!items.length) return;

  /** Tampilkan satu elemen, hormati urutan berundak bila ada. */
  function show(el) {
    const step = Number(el.dataset.stagger || 0);
    el.style.transitionDelay = step ? `${step * 150}ms` : '';
    el.classList.add('is-in');
  }

  if (!('IntersectionObserver' in window)) {
    items.forEach(show);
    return;
  }

  // Ambang 0: satu piksel masuk sudah cukup. Ambang yang lebih tinggi
  // membuat elemen tinggi (mis. panel mempelai) gagal terpicu ketika
  // seksinya dilompati, karena bagian yang terlihat tak pernah cukup besar.
  const MARGIN_RATIO = 0.92;   // sepadan dengan rootMargin -8%
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      show(entry.target);
      obs.unobserve(entry.target);   // sekali tampil, selesai
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

  items.forEach(el => io.observe(el));

  // Jaring pengaman.
  // Lompatan scroll — tautan jangkar, pemulihan posisi oleh browser,
  // flick cepat, scrollIntoView — berpindah tanpa frame antara, sehingga
  // IntersectionObserver bisa melewatkan elemen sama sekali. Tanpa ini,
  // sebuah panel bisa tertinggal opacity:0 selamanya.
  let pending = false;
  function sweep() {
    pending = false;
    const left = $$('.reveal:not(.is-in)');

    if (!left.length) {                       // semua sudah tampil — lepas listener
      window.removeEventListener('scroll', onScroll);
      return;
    }
    const limit = window.innerHeight * MARGIN_RATIO;
    left.forEach(el => {
      if (el.getBoundingClientRect().top < limit) {
        show(el);
        io.unobserve(el);
      }
    });
  }
  function onScroll() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(sweep);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
}


/* ---------------------------------------------------------------
   09 · PARALLAX — sangat halus, maksimum 40px
   Semua elemen digerakkan dalam SATU requestAnimationFrame.
   --------------------------------------------------------------- */
function initParallax() {
  if (REDUCED) return;

  const layers = $$('[data-parallax]').map(el => ({
    el,
    factor: parseFloat(el.dataset.parallax) || 0.15,
    host: el.closest('.sec') || el.parentElement
  }));
  if (!layers.length) return;

  const MAX = 40;
  let ticking = false;

  function paint() {
    ticking = false;
    const vh = window.innerHeight;

    layers.forEach(({ el, factor, host }) => {
      const r = host.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return; // di luar layar — lewati

      const centerOffset = (r.top + r.height / 2) - vh / 2;
      const shift = clamp(-centerOffset * factor, -MAX, MAX);
      el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(paint);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  paint();
}


/* ---------------------------------------------------------------
   10 · COUNTDOWN
   --------------------------------------------------------------- */
function initCountdown() {
  const box  = $('#countdownBox');
  const done = $('#countdownDone');
  const elD = $('#cdDays'), elH = $('#cdHours'), elM = $('#cdMins'), elS = $('#cdSecs');
  if (!box || !elD) return;

  const target = new Date(WEDDING_CONFIG.akadISO).getTime();

  if (Number.isNaN(target)) {
    console.warn('[undangan] akadISO tidak valid:', WEDDING_CONFIG.akadISO);
    return;
  }

  let timer = null;

  function tick() {
    const diff = target - Date.now();

    if (diff <= 0) {
      box.hidden = true;
      if (done) done.hidden = false;
      if (timer) clearInterval(timer);
      return;
    }

    const s = Math.floor(diff / 1000);
    elD.textContent = String(Math.floor(s / 86400)).padStart(3, '0');
    elH.textContent = String(Math.floor(s / 3600) % 24).padStart(2, '0');
    elM.textContent = String(Math.floor(s / 60) % 60).padStart(2, '0');
    elS.textContent = String(s % 60).padStart(2, '0');
  }

  tick();
  timer = setInterval(tick, 1000);
}


/* ---------------------------------------------------------------
   11 · SIMPAN KE KALENDER (.ics)
   --------------------------------------------------------------- */
function initCalendar() {
  const btn = $('#calendarBtn');
  if (!btn) return;

  const toUTC = iso => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const start = toUTC(WEDDING_CONFIG.akadISO);
  const end   = toUTC(WEDDING_CONFIG.akadEndISO);
  if (!start || !end) { btn.hidden = true; return; }

  const esc = t => String(t).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Undangan Pernikahan//ID',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@undangan.local`,
    `DTSTAMP:${toUTC(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${esc('Pernikahan ' + WEDDING_CONFIG.groom + ' & ' + WEDDING_CONFIG.bride)}`,
    `LOCATION:${esc(WEDDING_CONFIG.venueName + ', ' + WEDDING_CONFIG.venueAddress)}`,
    `DESCRIPTION:${esc('Akad Nikah & Resepsi pukul ' + WEDDING_CONFIG.eventTime)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  btn.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
}


/* ---------------------------------------------------------------
   12 · HADIAH & TOMBOL SALIN
   --------------------------------------------------------------- */
function initGifts() {
  const list = $('#giftList');
  if (!list) return;

  const gifts = WEDDING_CONFIG.gifts || [];
  if (!gifts.length) { list.hidden = true; return; }

  list.innerHTML = gifts.map((g, i) => `
    <article class="gift reveal" data-stagger="${i}">
      <p class="gift__bank">${escapeHtml(g.bank)}</p>
      <p class="gift__no">${escapeHtml(g.number)}</p>
      <p class="gift__holder">a.n. ${escapeHtml(g.holder)}</p>
      <button type="button" class="btn btn--ghost gift__btn" data-copy="${escapeHtml(g.number)}">
        <svg aria-hidden="true"><use href="#i-copy"/></svg>
        <span>Salin Nomor</span>
      </button>
    </article>`).join('');

  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;

    const value = btn.dataset.copy;
    let ok = false;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        ok = true;
      } else {
        // cadangan untuk http:// atau browser lama
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:absolute;left:-9999px';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch (err) { ok = false; }

    const label = $('span', btn);
    const icon  = $('use', btn);
    if (ok) {
      btn.classList.add('is-copied');
      if (label) label.textContent = 'Nomor rekening tersalin';
      if (icon) icon.setAttribute('href', '#i-check');
      setTimeout(() => {
        btn.classList.remove('is-copied');
        if (label) label.textContent = 'Salin Nomor';
        if (icon) icon.setAttribute('href', '#i-copy');
      }, 2400);
    } else if (label) {
      label.textContent = 'Salin manual: ' + value;
    }
  });
}


/* ---------------------------------------------------------------
   13 · RSVP & UCAPAN
   --------------------------------------------------------------- */
const RSVP = (() => {
  const form   = $('#rsvpForm');
  const status = $('#rsvpStatus');
  const submit = $('#rsvpSubmit');
  const wishForm = $('#wishForm');
  const wishStatus = $('#wishStatus');
  const wishSubmit = $('#wishSubmit');
  const list   = $('#wishesList');
  const state  = $('#wishesState');

  const URL_ = 'https://script.google.com/macros/s/AKfycbyjXCwqj2fQN7E7JV-S-ZwvxmNSJnYnXGuMbYQNEBmSswUoJTNeCVWVCCE4U4PAZSIZ/exec';
  const DEMO = !URL_;
  const Forms = window.InvitationForms;

  /* ---- daftar ucapan ---- */
  function wishHtml(w, isNew) {
    const body = w.ucapan
      ? `<p class="wish__body">${escapeHtml(w.ucapan)}</p>` : '';
    return `<article class="wish${isNew ? ' wish--new' : ''}">
        <p class="wish__head">${escapeHtml(w.nama || 'Tamu')}</p>
        ${body}
      </article>`;
  }

  function renderWishes(items) {
    if (!list) return;
    list.setAttribute('aria-busy', 'false');

    const withText = (items || []).filter(w => w && (w.ucapan || w.nama));
    if (!withText.length) {
      if (state) state.textContent = 'Belum ada ucapan. Jadilah yang pertama memberi doa.';
      return;
    }
    list.innerHTML = withText.map(w => wishHtml(w, false)).join('');
  }

  function prependWish(w) {
    if (!list) return;
    if (state && state.parentNode === list) state.remove();
    list.insertAdjacentHTML('afterbegin', wishHtml(w, true));
  }

  async function loadWishes() {
    if (!list) return;

    if (DEMO) {
      list.setAttribute('aria-busy', 'false');
      if (state) state.textContent = 'Belum ada ucapan. Jadilah yang pertama memberi doa.';
      return;
    }

    try {
      const res = await fetch(URL_ + '?action=list', { method: 'GET' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      renderWishes(Array.isArray(data) ? data : (data.items || []));
    } catch (err) {
      list.setAttribute('aria-busy', 'false');
      if (state) state.textContent = 'Ucapan belum bisa dimuat saat ini.';
      console.warn('[undangan] gagal memuat ucapan:', err);
    }
  }

  /* ---- pengiriman ---- */
  function setStatus(target, msg, kind) {
    if (!target) return;
    target.className = 'form__status' + (kind ? ' form__status--' + kind : '');
    target.innerHTML = msg;
  }

  function validateField(input, error) {
    const valid = Boolean(input && input.value.trim());
    const field = input && input.closest('.field');
    if (field) field.classList.toggle('field--invalid', !valid);
    if (error) error.hidden = valid;
    if (!valid && input) input.focus();
    return valid;
  }

  async function onSubmit(e) {
    e.preventDefault();

    // honeypot: hanya bot yang mengisi ini
    if ($('#rsvpWebsite').value) return;

    const last = Number(store('wc_last_rsvp') || 0);
    if (Forms.getSubmissionCooldownRemaining(last, Date.now()) > 0) {
      setStatus(status, 'Mohon tunggu sebentar sebelum mengirim lagi.', 'err');
      return;
    }

    const data = Forms.buildRsvpPayload({
      nama: $('#rsvpName').value,
      kehadiran:  ($('input[name="kehadiran"]:checked') || {}).value || 'Hadir',
      jumlah: $('#rsvpCount').value
    });

    if (!validateField($('#rsvpName'), $('#errName'))) return;

    submit.disabled = true;
    setStatus(status, 'Mengirim&hellip;', '');

    if (DEMO) {
      // MODE DEMO — belum tersambung ke Google Sheets
      console.info('[undangan] MODE DEMO, data tidak tersimpan:', data);
      await new Promise(r => setTimeout(r, 500));
      finishRsvp(true);
      return;
    }

    try {
      // Content-Type text/plain agar menjadi "simple request" —
      // tanpa preflight OPTIONS yang tidak dilayani Apps Script.
      const res = await fetch(URL_, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      finishRsvp(false);
    } catch (err) {
      console.warn('[undangan] RSVP gagal terkirim:', err);
      submit.disabled = false;
      const wa = WEDDING_CONFIG.whatsapp;
      setStatus(status,
        'Maaf, konfirmasi belum bisa terkirim.' +
        (wa ? ` Anda dapat mengabari kami langsung lewat <a href="https://wa.me/${escapeHtml(wa)}" target="_blank" rel="noopener">WhatsApp</a>.` : ''),
        'err'
      );
    }
  }

  function finishRsvp(demo) {
    store('wc_last_rsvp', String(Date.now()));
    setStatus(status,
      'Terima kasih, konfirmasi Anda telah kami terima.' +
      (demo ? '<br><small>(mode demo — belum tersimpan ke Google Sheets)</small>' : ''),
      'ok'
    );
    form.reset();
    $('#rsvpCount').value = 1;
    syncGuestCount();
    submit.disabled = false;
  }

  async function onWishSubmit(e) {
    e.preventDefault();
    if ($('#wishWebsite').value) return;

    const last = Number(store('wc_last_wish') || 0);
    if (Forms.getSubmissionCooldownRemaining(last, Date.now()) > 0) {
      setStatus(wishStatus, 'Mohon tunggu sebentar sebelum mengirim ucapan lagi.', 'err');
      return;
    }

    const nameOk = validateField($('#wishName'), $('#wishErrName'));
    const messageOk = validateField($('#wishMessage'), $('#wishErrMessage'));
    if (!nameOk || !messageOk) return;

    const data = Forms.buildWishPayload({
      nama: $('#wishName').value,
      ucapan: $('#wishMessage').value
    });

    wishSubmit.disabled = true;
    setStatus(wishStatus, 'Mengirim&hellip;', '');

    try {
      if (DEMO) {
        console.info('[undangan] MODE DEMO, ucapan tidak tersimpan:', data);
        await new Promise(r => setTimeout(r, 500));
      } else {
        const res = await fetch(URL_, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
      }

      store('wc_last_wish', String(Date.now()));
      prependWish(data);
      setStatus(wishStatus,
        'Terima kasih, ucapan Anda telah ditampilkan.' +
        (DEMO ? '<br><small>(mode demo — belum tersimpan ke Google Sheets)</small>' : ''),
        'ok'
      );
      wishForm.reset();
      updateWishCount();
    } catch (err) {
      console.warn('[undangan] ucapan gagal terkirim:', err);
      setStatus(wishStatus, 'Ucapan belum bisa terkirim. Silakan coba kembali.', 'err');
    } finally {
      wishSubmit.disabled = false;
    }
  }

  function updateWishCount() {
    const count = $('#wishCount');
    if (count) count.textContent = String($('#wishMessage').value.length);
  }

  /* ---- stepper jumlah tamu ---- */
  function step(delta) {
    const input = $('#rsvpCount');
    input.value = clamp((parseInt(input.value, 10) || 1) + delta, 1, 10);
  }

  /* ---- sembunyikan jumlah tamu bila berhalangan ---- */
  function syncGuestCount() {
    const field = $('#guestCountField');
    const hadir = ($('input[name="kehadiran"]:checked') || {}).value === 'Hadir';
    if (field) field.hidden = !hadir;
  }

  function init() {
    if (!Forms) {
      console.error('[undangan] modul data form tidak termuat.');
      return;
    }
    if (form) {
      form.addEventListener('submit', onSubmit);
      $('#cntMinus').addEventListener('click', () => step(-1));
      $('#cntPlus').addEventListener('click', () => step(1));
      $$('input[name="kehadiran"]').forEach(r => r.addEventListener('change', syncGuestCount));
      syncGuestCount();
    }
    if (wishForm) {
      wishForm.addEventListener('submit', onWishSubmit);
      $('#wishMessage').addEventListener('input', updateWishCount);
      updateWishCount();
    }
    loadWishes();
  }

  return { init };
})();


/* ---------------------------------------------------------------
   BOOT
   --------------------------------------------------------------- */
function boot() {
  // Kunci halaman DARI SINI, bukan dari HTML — supaya bila JavaScript
  // gagal dimuat, undangan tetap bisa dibaca seluruhnya.
  document.body.classList.add('is-locked');
  const main = $('#main');
  if (main) main.setAttribute('inert', '');

  bindConfig();
  initGuest();
  initMarquee();
  initCover();

  initCountdown();
  initCalendar();
  initGifts();   // membuat kartu .reveal — harus sebelum initReveal()
  RSVP.init();

  initReveal();  // satu kali, setelah semua .reveal ada di DOM
  initParallax();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
