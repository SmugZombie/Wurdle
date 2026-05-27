#!/usr/bin/env node
/**
 * Rebuild dictionary.js from the current list plus /usr/share/dict/words.
 * Each length bucket is expanded to 10× its current size (capped by available words).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DICT_PATH = path.join(ROOT, 'dictionary.js');
const SYSTEM_DICT = '/usr/share/dict/words';
const MULTIPLIER = 10;
const LENGTHS = [5, 6, 7, 8, 9, 10];

function loadCurrent() {
  const text = fs.readFileSync(DICT_PATH, 'utf8');
  const match = text.match(/window\.WORDS_BY_LENGTH\s*=\s*(\{[\s\S]*\});/);
  if (!match) throw new Error('Could not parse dictionary.js');
  return eval(`(${match[1]})`);
}

function loadSystemWords() {
  const lines = fs.readFileSync(SYSTEM_DICT, 'utf8').split(/\r?\n/);
  const byLength = Object.fromEntries(LENGTHS.map((n) => [n, new Set()]));
  for (const line of lines) {
    const word = line.trim().toLowerCase();
    if (!/^[a-z]+$/.test(word)) continue;
    if (word.length >= 5 && word.length <= 10) byLength[word.length].add(word);
  }
  return byLength;
}

function expandBucket(existing, pool, target) {
  const out = [];
  const seen = new Set();
  for (const word of existing) {
    const w = word.toLowerCase();
    if (!/^[a-z]+$/.test(w) || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  const extras = [...pool].filter((w) => !seen.has(w)).sort();
  for (const word of extras) {
    if (out.length >= target) break;
    out.push(word);
  }
  return out;
}

function formatDictionary(byLength) {
  const lines = ['window.WORDS_BY_LENGTH = {'];
  for (let i = 0; i < LENGTHS.length; i++) {
    const len = LENGTHS[i];
    const comma = i < LENGTHS.length - 1 ? ',' : '';
    lines.push(`  ${len}: ${JSON.stringify(byLength[len])}${comma}`);
  }
  lines.push('};', '');
  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(SYSTEM_DICT)) {
    console.error(`Missing system dictionary at ${SYSTEM_DICT}`);
    process.exit(1);
  }

  const current = loadCurrent();
  const system = loadSystemWords();
  const expanded = {};
  const stats = [];

  for (const len of LENGTHS) {
    const before = current[len].length;
    const target = before * MULTIPLIER;
    expanded[len] = expandBucket(current[len], system[len], target);
    stats.push({ len, before, target, after: expanded[len].length });
  }

  const output = formatDictionary(expanded);
  fs.writeFileSync(DICT_PATH, output, 'utf8');

  const totalBefore = stats.reduce((s, x) => s + x.before, 0);
  const totalAfter = stats.reduce((s, x) => s + x.after, 0);
  console.log(`Wrote ${DICT_PATH}`);
  for (const { len, before, target, after } of stats) {
    console.log(`  ${len} letters: ${before} → ${after} (target ${target})`);
  }
  console.log(`  total: ${totalBefore} → ${totalAfter}`);
}

main();
