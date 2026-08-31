/**
 * =====================================================================
 * BACKEND RSVP — UNDANGAN PERNIKAHAN
 * Google Apps Script Web App untuk menerima RSVP dan menyajikan ucapan.
 *
 * Cara pakai lengkap ada di README.md bagian "Menyambungkan Google Sheets".
 * Ringkasnya:
 *   1. Buat Google Spreadsheet baru
 *   2. Extensions → Apps Script, tempel seluruh isi berkas ini
 *   3. Jalankan fungsi setup() sekali untuk membuat header
 *   4. Deploy → New deployment → Web app
 *        Execute as       : Me
 *        Who has access   : Anyone
 *   5. Salin URL yang berakhiran /exec ke WEDDING_CONFIG.appsScriptUrl
 * =====================================================================
 */

/** Nama tab di dalam Spreadsheet. */
var SHEET_NAME = 'RSVP';

/** Urutan kolom. Jangan diubah tanpa menyesuaikan kode di bawah. */
var HEADERS = ['timestamp', 'nama', 'kehadiran', 'jumlah', 'ucapan', 'disetujui'];


/**
 * Jalankan SEKALI dari editor Apps Script (pilih setup → Run).
 * Membuat tab RSVP beserta barisan header-nya.
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }

  sh.setColumnWidth(1, 160); // timestamp
  sh.setColumnWidth(2, 200); // nama
  sh.setColumnWidth(3, 140); // kehadiran
  sh.setColumnWidth(4, 80);  // jumlah
  sh.setColumnWidth(5, 420); // ucapan
  sh.setColumnWidth(6, 100); // disetujui

  return 'Siap. Tab "' + SHEET_NAME + '" sudah dibuat.';
}


/**
 * POST — menerima satu konfirmasi kehadiran dari halaman undangan.
 *
 * Badan permintaan dikirim sebagai text/plain berisi JSON. Itu disengaja:
 * text/plain membuatnya menjadi "simple request" sehingga browser tidak
 * mengirim preflight OPTIONS, yang tidak dilayani oleh Apps Script.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'Tidak ada data' });
    }

    var data = JSON.parse(e.postData.contents);

    // Tolak kiriman tanpa nama.
    var nama = String(data.nama || '').trim().slice(0, 80);
    if (!nama) return json({ ok: false, error: 'Nama wajib diisi' });

    var kehadiran = data.kehadiran === 'Berhalangan Hadir' ? 'Berhalangan Hadir' : 'Hadir';
    var jumlah    = Math.min(Math.max(parseInt(data.jumlah, 10) || 1, 1), 10);
    var ucapan    = String(data.ucapan || '').trim().slice(0, 500);

    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sh) return json({ ok: false, error: 'Tab RSVP belum dibuat, jalankan setup()' });

    // Kolom "disetujui" sengaja dikosongkan.
    // Ucapan baru tampil di halaman setelah Anda mengisinya dengan TRUE.
    sh.appendRow([new Date(), nama, kehadiran, jumlah, ucapan, '']);

    return json({ ok: true });

  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}


/**
 * GET — menyajikan daftar ucapan yang sudah Anda setujui.
 * Hanya baris dengan kolom "disetujui" bernilai TRUE / ya / 1 yang tampil.
 */
function doGet(e) {
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sh || sh.getLastRow() < 2) return json([]);

    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS.length).getValues();
    var out  = [];

    for (var i = rows.length - 1; i >= 0; i--) {   // terbaru di atas
      var r = rows[i];
      if (!isApproved(r[5])) continue;

      var nama   = String(r[1] || '').trim();
      var ucapan = String(r[4] || '').trim();
      if (!nama && !ucapan) continue;

      out.push({
        nama:      nama,
        kehadiran: String(r[2] || '').trim(),
        ucapan:    ucapan
      });

      if (out.length >= 100) break;   // batasi ukuran respons
    }

    return json(out);

  } catch (err) {
    return json([]);
  }
}


/** Nilai kolom "disetujui" dianggap ya bila TRUE / ya / y / 1. */
function isApproved(v) {
  if (v === true) return true;
  var s = String(v || '').trim().toLowerCase();
  return s === 'true' || s === 'ya' || s === 'y' || s === '1';
}


/** Bungkus objek apa pun menjadi respons JSON. */
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
