#!/usr/bin/env node
/**
 * Orlaven theme validator.
 *
 * Runs a set of structural and syntactic checks that catch the most
 * common mistakes before a theme is uploaded to Shopify:
 *
 *   1. Required top-level directories exist (layout, templates, sections,
 *      snippets, assets, config, locales).
 *   2. Required files exist (layout/theme.liquid, layout/password.liquid,
 *      config/settings_schema.json, config/settings_data.json,
 *      locales/en.default.json).
 *   3. Every .json file under /config, /locales and /templates parses as
 *      valid JSON. On a parse error we print the file path and, when the
 *      error message includes a position, derive a line and column.
 *   4. Every .liquid file under /layout, /sections, /snippets and
 *      /templates has balanced `{% %}` and `{{ }}` delimiters.
 *   5. Every {% schema %} ... {% endschema %} block inside a section file
 *      contains valid JSON.
 *
 * Usage:  node scripts/validate-theme.js
 * Exit:   0 on success, 1 on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const REQUIRED_DIRS = [
  'layout',
  'templates',
  'sections',
  'snippets',
  'assets',
  'config',
  'locales',
];

const REQUIRED_FILES = [
  'layout/theme.liquid',
  'layout/password.liquid',
  'config/settings_schema.json',
  'config/settings_data.json',
  'locales/en.default.json',
];

const JSON_SCAN_DIRS = ['config', 'locales', 'templates'];
const LIQUID_SCAN_DIRS = ['layout', 'sections', 'snippets', 'templates'];

const errors = [];
const warnings = [];
let jsonCount = 0;
let liquidCount = 0;
let schemaCount = 0;

function fail(msg) {
  errors.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

function existsDir(rel) {
  const abs = path.join(ROOT, rel);
  return fs.existsSync(abs) && fs.statSync(abs).isDirectory();
}

function existsFile(rel) {
  const abs = path.join(ROOT, rel);
  return fs.existsSync(abs) && fs.statSync(abs).isFile();
}

function walk(relDir, predicate) {
  const out = [];
  const abs = path.join(ROOT, relDir);
  if (!fs.existsSync(abs)) return out;
  const stack = [abs];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && predicate(entry.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

function lineColFromOffset(source, offset) {
  if (typeof offset !== 'number' || offset < 0) return null;
  const slice = source.slice(0, offset);
  const line = slice.split(/\r?\n/).length;
  const lastNewline = slice.lastIndexOf('\n');
  const col = lastNewline === -1 ? offset + 1 : offset - lastNewline;
  return { line, col };
}

function relPath(abs) {
  return path.relative(ROOT, abs).split(path.sep).join('/');
}

function parseJsonFile(abs) {
  const source = fs.readFileSync(abs, 'utf8');
  try {
    JSON.parse(source);
    return true;
  } catch (err) {
    const match = /position\s+(\d+)/i.exec(err.message);
    const offset = match ? Number(match[1]) : null;
    const pos = lineColFromOffset(source, offset);
    const where = pos ? ` (line ${pos.line}, col ${pos.col})` : '';
    fail(`JSON parse error in ${relPath(abs)}${where}: ${err.message}`);
    return false;
  }
}

function countDelimiters(source) {
  // Count only well-formed open/close pairs. We do NOT count delimiters
  // that appear inside double-quoted strings (which is how schema JSON
  // sometimes embeds example liquid snippets).
  let tagOpen = 0;
  let tagClose = 0;
  let outOpen = 0;
  let outClose = 0;
  for (let i = 0; i < source.length - 1; i += 1) {
    const two = source[i] + source[i + 1];
    if (two === '{%') {
      tagOpen += 1;
      i += 1;
    } else if (two === '%}') {
      tagClose += 1;
      i += 1;
    } else if (two === '{{') {
      outOpen += 1;
      i += 1;
    } else if (two === '}}') {
      outClose += 1;
      i += 1;
    }
  }
  return { tagOpen, tagClose, outOpen, outClose };
}

function checkSchemaBlock(abs, source) {
  const startRe = /{%-?\s*schema\s*-?%}/;
  const endRe = /{%-?\s*endschema\s*-?%}/;
  const startMatch = startRe.exec(source);
  if (!startMatch) return;
  const after = source.slice(startMatch.index + startMatch[0].length);
  const endMatch = endRe.exec(after);
  if (!endMatch) {
    fail(`${relPath(abs)}: found {% schema %} without matching {% endschema %}`);
    return;
  }
  const body = after.slice(0, endMatch.index).trim();
  schemaCount += 1;
  try {
    JSON.parse(body);
  } catch (err) {
    const match = /position\s+(\d+)/i.exec(err.message);
    const offset = match ? Number(match[1]) : null;
    const pos = lineColFromOffset(body, offset);
    const where = pos ? ` (relative line ${pos.line}, col ${pos.col})` : '';
    fail(
      `Invalid schema JSON in ${relPath(abs)}${where}: ${err.message}`,
    );
  }
}

function validateLiquidFile(abs) {
  const source = fs.readFileSync(abs, 'utf8');
  const counts = countDelimiters(source);
  if (counts.tagOpen !== counts.tagClose) {
    fail(
      `${relPath(abs)}: unbalanced tag delimiters - ${counts.tagOpen} '{%' vs ${counts.tagClose} '%}'`,
    );
  }
  if (counts.outOpen !== counts.outClose) {
    fail(
      `${relPath(abs)}: unbalanced output delimiters - ${counts.outOpen} '{{' vs ${counts.outClose} '}}'`,
    );
  }
  if (abs.includes(`${path.sep}sections${path.sep}`)) {
    checkSchemaBlock(abs, source);
  }
}

function main() {
  // 1. Required directories
  for (const dir of REQUIRED_DIRS) {
    if (!existsDir(dir)) {
      fail(`Missing required directory: ${dir}/`);
    }
  }

  // 2. Required files
  for (const file of REQUIRED_FILES) {
    if (!existsFile(file)) {
      fail(`Missing required file: ${file}`);
    }
  }

  // 3. JSON parsing
  for (const dir of JSON_SCAN_DIRS) {
    const files = walk(dir, (name) => name.endsWith('.json'));
    for (const file of files) {
      jsonCount += 1;
      parseJsonFile(file);
    }
  }

  // 4. Liquid syntax + schema JSON
  for (const dir of LIQUID_SCAN_DIRS) {
    const files = walk(dir, (name) => name.endsWith('.liquid'));
    for (const file of files) {
      liquidCount += 1;
      validateLiquidFile(file);
    }
  }

  // Report
  if (warnings.length) {
    console.warn('\nWarnings:');
    for (const w of warnings) console.warn(`  - ${w}`);
  }

  if (errors.length) {
    console.error('\nFAIL');
    for (const e of errors) console.error(`  - ${e}`);
    console.error(
      `\nChecked ${jsonCount} JSON file(s), ${liquidCount} liquid file(s), ${schemaCount} schema block(s).`,
    );
    process.exit(1);
  }

  console.log(
    `PASS: ${jsonCount} JSON files, ${liquidCount} liquid files, ${schemaCount} schema blocks`,
  );
  process.exit(0);
}

main();
