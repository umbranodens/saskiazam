/**
 * BACKEND RSVP & UCAPAN — UNDANGAN PERNIKAHAN
 *
 * Jalankan setup() sekali, deploy sebagai Web App, lalu tempel URL /exec
 * ke WEDDING_CONFIG.appsScriptUrl. RSVP bersifat privat di tab RSVP,
 * sedangkan pesan yang dikirim lewat form ucapan dibaca dari tab Ucapan.
 */

var RSVP_SHEET_NAME = 'RSVP';
var WISH_SHEET_NAME = 'Ucapan';
var RSVP_HEADERS = ['timestamp', 'nama', 'kehadiran', 'jumlah'];
var WISH_HEADERS = ['timestamp', 'nama', 'ucapan'];

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rsvp = ensureSheet(ss, RSVP_SHEET_NAME, RSVP_HEADERS);
  var wishes = ensureSheet(ss, WISH_SHEET_NAME, WISH_HEADERS);

  rsvp.setColumnWidth(1, 160);
  rsvp.setColumnWidth(2, 200);
  rsvp.setColumnWidth(3, 160);
  rsvp.setColumnWidth(4, 80);

  wishes.setColumnWidth(1, 160);
  wishes.setColumnWidth(2, 200);
  wishes.setColumnWidth(3, 480);

  return 'Siap. Tab RSVP dan Ucapan sudah dibuat.';
}

function ensureSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'Tidak ada data' });
    }

    var data = JSON.parse(e.postData.contents);
    var action = String(data.action || 'rsvp').toLowerCase();
    var nama = clean(data.nama, 80);
    if (!nama) return json({ ok: false, error: 'Nama wajib diisi' });

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'wish') {
      var ucapan = clean(data.ucapan, 500);
      if (!ucapan) return json({ ok: false, error: 'Ucapan wajib diisi' });

      var wishSheet = ss.getSheetByName(WISH_SHEET_NAME);
      if (!wishSheet) return json({ ok: false, error: 'Tab Ucapan belum dibuat, jalankan setup()' });
      wishSheet.appendRow([new Date(), nama, ucapan]);
      return json({ ok: true });
    }

    var attendance = data.kehadiran === 'Berhalangan Hadir' ? 'Berhalangan Hadir' : 'Hadir';
    var count = Math.min(Math.max(parseInt(data.jumlah, 10) || 1, 1), 10);
    var rsvpSheet = ss.getSheetByName(RSVP_SHEET_NAME);
    if (!rsvpSheet) return json({ ok: false, error: 'Tab RSVP belum dibuat, jalankan setup()' });
    rsvpSheet.appendRow([new Date(), nama, attendance, count]);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(WISH_SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 2) return json([]);

    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, WISH_HEADERS.length).getValues();
    var out = [];

    for (var i = rows.length - 1; i >= 0; i--) {
      var nama = clean(rows[i][1], 80);
      var ucapan = clean(rows[i][2], 500);
      if (!nama || !ucapan) continue;
      out.push({ nama: nama, ucapan: ucapan });
      if (out.length >= 100) break;
    }

    return json(out);
  } catch (err) {
    return json([]);
  }
}

function clean(value, max) {
  return String(value == null ? '' : value).trim().replace(/\s+/g, ' ').slice(0, max);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
