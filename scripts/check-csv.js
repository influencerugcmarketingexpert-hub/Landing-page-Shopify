#!/usr/bin/env node
/* One-off CSV sanity checker. Not part of the theme bundle. */
'use strict';
const fs = require('fs');
const path = require('path');

function parseCsv(text) {
  const rows = [[]];
  let field = '';
  let inQ = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') {
        inQ = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQ = true;
    } else if (c === ',') {
      rows[rows.length - 1].push(field);
      field = '';
    } else if (c === '\n') {
      rows[rows.length - 1].push(field);
      field = '';
      rows.push([]);
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length || rows[rows.length - 1].length) {
    rows[rows.length - 1].push(field);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].length));
}

const file = path.resolve(__dirname, '..', process.argv[2] || 'sample-data/products.csv');
const rows = parseCsv(fs.readFileSync(file, 'utf8'));
const header = rows[0];
const dataRows = rows.slice(1);

console.log('file:', file);
console.log('total rows (with header):', rows.length);
console.log('header columns:', header.length);
const mismatch = dataRows.filter((r) => r.length !== header.length);
console.log('rows with column mismatch:', mismatch.length);
if (mismatch.length) {
  for (const r of mismatch.slice(0, 5)) {
    console.log('  mismatched row first 3 fields:', r.slice(0, 3), 'len=', r.length);
  }
}

const handleCol = header.indexOf('Handle');
const vendorCol = header.indexOf('Vendor');
const publishedCol = header.indexOf('Published');
const statusCol = header.indexOf('Status');

const handles = new Set(dataRows.map((r) => r[handleCol]).filter(Boolean));
console.log('unique handles:', handles.size);

const vendorRows = dataRows.filter((r) => r[vendorCol] === 'Orlaven').length;
console.log('rows with Vendor=Orlaven:', vendorRows);

const publishedRows = dataRows.filter((r) => r[publishedCol] === 'TRUE').length;
console.log('rows with Published=TRUE (master rows):', publishedRows);

const activeRows = dataRows.filter((r) => r[statusCol] === 'active').length;
console.log('rows with Status=active (variant rows):', activeRows);

process.exit(mismatch.length ? 1 : 0);
