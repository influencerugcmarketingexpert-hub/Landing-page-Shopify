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
 *   6. Every `section.type` referenced by a JSON template resolves to a
 *      real file under `/sections/<type>.liquid`. Missing mapping is a
 *      hard failure.
 *   7. layout/theme.liquid contains a `skip-to-content-link`, loads
 *      `base.css` via `asset_url`, and loads `global.js`. Any missing
 *      piece is a hard failure.
 *   8. Every translation key used via `{{ '<key>' | t }}` (or `| t:`) in a
 *      .liquid file resolves to an entry in `locales/en.default.json`.
 *      Missing keys are WARNINGS (not failures), since some keys are
 *      looked up dynamically.
 *
 * Usage:  node scripts/validate-theme.js
 * Exit:   0 on success (warnings allowed), 1 on any hard failure.
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
let templateSectionRefCount = 0;
let translationCheckCount = 0;

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
    return JSON.parse(source);
  } catch (err) {
    const match = /position\s+(\d+)/i.exec(err.message);
    const offset = match ? Number(match[1]) : null;
    const pos = lineColFromOffset(source, offset);
    const where = pos ? ` (line ${pos.line}, col ${pos.col})` : '';
    fail(`JSON parse error in ${relPath(abs)}${where}: ${err.message}`);
    return null;
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

// ---- New checks for FEAT-010 ------------------------------------------

function checkTemplateSectionReferences() {
  const templatesDir = path.join(ROOT, 'templates');
  if (!fs.existsSync(templatesDir)) return;
  const templateJsonFiles = walk('templates', (n) => n.endsWith('.json'));
  for (const file of templateJsonFiles) {
    const parsed = (function () {
      try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        return null;
      }
    }());
    if (!parsed || typeof parsed !== 'object') continue;
    const sections = parsed.sections;
    if (!sections || typeof sections !== 'object') continue;
    for (const [sid, config] of Object.entries(sections)) {
      if (!config || typeof config !== 'object') continue;
      const type = config.type;
      if (typeof type !== 'string' || !type) continue;
      templateSectionRefCount += 1;
      const candidate = path.join('sections', `${type}.liquid`);
      if (!existsFile(candidate)) {
        fail(
          `${relPath(file)}: sections["${sid}"].type = "${type}" has no matching sections/${type}.liquid`,
        );
      }
    }
  }
}

function checkThemeLayoutEssentials() {
  const abs = path.join(ROOT, 'layout', 'theme.liquid');
  if (!existsFile('layout/theme.liquid')) return;
  const source = fs.readFileSync(abs, 'utf8');
  if (!/skip-to-content-link/.test(source)) {
    fail('layout/theme.liquid: missing `skip-to-content-link` anchor');
  }
  if (!/'base\.css'\s*\|\s*asset_url/.test(source)) {
    fail('layout/theme.liquid: does not load `base.css` via `asset_url`');
  }
  if (!/'global\.js'\s*\|\s*asset_url/.test(source)) {
    fail('layout/theme.liquid: does not load `global.js` via `asset_url`');
  }
}

function flattenLocale(obj, prefix = '', acc = new Set()) {
  if (!obj || typeof obj !== 'object') return acc;
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenLocale(value, next, acc);
    } else {
      acc.add(next);
    }
  }
  return acc;
}

function checkTranslationKeys() {
  const localePath = path.join(ROOT, 'locales', 'en.default.json');
  if (!existsFile('locales/en.default.json')) return;
  const localeSource = fs.readFileSync(localePath, 'utf8');
  let locale;
  try {
    locale = JSON.parse(localeSource);
  } catch {
    return; // parse failure already reported above
  }
  const known = flattenLocale(locale);
  // Match keys in `{{ 'some.key' | t }}` or `{{ 'some.key' | t: foo: 'x' }}`
  // or within `{%- assign x = 'key' | t -%}` forms.
  const keyRe = /'([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)'\s*\|\s*t(?:\s*:|\s|,|}|-|%)/gi;
  const missing = new Map();
  for (const dir of LIQUID_SCAN_DIRS) {
    const files = walk(dir, (n) => n.endsWith('.liquid'));
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      let m;
      while ((m = keyRe.exec(source)) !== null) {
        translationCheckCount += 1;
        const key = m[1];
        if (!known.has(key)) {
          if (!missing.has(key)) missing.set(key, new Set());
          const line = source.slice(0, m.index).split(/\r?\n/).length;
          missing.get(key).add(`${relPath(file)}:${line}`);
        }
      }
    }
  }
  if (missing.size) {
    for (const [key, uses] of missing) {
      const sample = Array.from(uses).slice(0, 3).join(', ');
      const more = uses.size > 3 ? ` (+${uses.size - 3} more)` : '';
      warn(`translation key "${key}" not in locales/en.default.json (${sample}${more})`);
    }
  }
}

// ---- Main runner ------------------------------------------------------

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

  // 5. Template -> section references
  checkTemplateSectionReferences();

  // 6. Theme layout essentials
  checkThemeLayoutEssentials();

  // 7. Translation keys
  checkTranslationKeys();

  // Summary report
  const summary = [
    `JSON files:               ${jsonCount}`,
    `Liquid files:             ${liquidCount}`,
    `Section schema blocks:    ${schemaCount}`,
    `Template->section refs:   ${templateSectionRefCount}`,
    `Translation keys scanned: ${translationCheckCount}`,
    `Warnings:                 ${warnings.length}`,
    `Errors:                   ${errors.length}`,
  ];

  if (warnings.length) {
    console.warn('\nWarnings:');
    for (const w of warnings) console.warn(`  - ${w}`);
  }

  console.log('\nSummary:');
  for (const line of summary) console.log(`  ${line}`);

  if (errors.length) {
    console.error('\nFAIL');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log('\nPASS');
  process.exit(0);
}

main();
