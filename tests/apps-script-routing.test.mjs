import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function makeSheet(rows = []) {
  return {
    rows,
    getLastRow() { return this.rows.length; },
    appendRow(row) { this.rows.push(row); },
    getRange(row, column, rowCount, columnCount) {
      return {
        getValues: () => this.rows.slice(row - 1, row - 1 + rowCount)
          .map(values => values.slice(column - 1, column - 1 + columnCount))
      };
    }
  };
}

const sheets = {
  RSVP: makeSheet([['timestamp', 'nama', 'kehadiran', 'jumlah']]),
  Ucapan: makeSheet([['timestamp', 'nama', 'ucapan']])
};

const context = {
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ({ getSheetByName: name => sheets[name] || null })
  },
  ContentService: {
    MimeType: { JSON: 'json' },
    createTextOutput: text => ({
      text,
      setMimeType() { return this; }
    })
  },
  Date,
  JSON,
  String,
  Math,
  parseInt
};

vm.createContext(context);
vm.runInContext(readFileSync(new URL('../apps-script.gs', import.meta.url), 'utf8'), context);

const post = payload => JSON.parse(context.doPost({
  postData: { contents: JSON.stringify(payload) }
}).text);

assert.deepEqual(
  post({ action: 'rsvp', nama: 'Tamu RSVP', kehadiran: 'Hadir', jumlah: 2, ucapan: 'jangan masuk RSVP' }),
  { ok: true }
);
assert.equal(sheets.RSVP.rows.length, 2, 'RSVP submission should append to the RSVP tab');
assert.deepEqual(
  JSON.parse(JSON.stringify(sheets.RSVP.rows[1].slice(1))),
  ['Tamu RSVP', 'Hadir', 2],
  'RSVP row should not store a public wish'
);

assert.deepEqual(
  post({ action: 'wish', nama: 'Tamu Ucapan', ucapan: 'Selamat menempuh hidup baru.' }),
  { ok: true }
);
assert.equal(sheets.Ucapan.rows.length, 2, 'wish submission should append to the Ucapan tab');
assert.deepEqual(
  JSON.parse(JSON.stringify(sheets.Ucapan.rows[1].slice(1))),
  ['Tamu Ucapan', 'Selamat menempuh hidup baru.'],
  'public wish row should only contain its author and message'
);

const listed = JSON.parse(context.doGet({ parameter: { action: 'list' } }).text);
assert.deepEqual(
  JSON.parse(JSON.stringify(listed)),
  [{ nama: 'Tamu Ucapan', ucapan: 'Selamat menempuh hidup baru.' }],
  'public list should be sourced from the Ucapan tab without RSVP metadata'
);
