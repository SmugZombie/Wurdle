const express = require('express');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

// Parse word list from dictionary.js (same format as the frontend bundle)
const dictCode = fs.readFileSync(path.join(__dirname, 'dictionary.js'), 'utf8');
const match = dictCode.match(/window\.WORDS_BY_LENGTH\s*=\s*(\{[\s\S]*?\});/);
if (!match) throw new Error('Could not parse dictionary.js');
// eslint-disable-next-line no-eval
const WORDS_BY_LENGTH = eval(`(${match[1]})`);

// Build per-length Sets for O(1) validation lookups
const WORD_SETS = {};
for (const [len, words] of Object.entries(WORDS_BY_LENGTH)) {
  WORD_SETS[len] = new Set(words);
}

// --- Persistence helpers (plain JSON files) ---
fs.mkdirSync(DATA_DIR, { recursive: true });

const BANNED_FILE = path.join(DATA_DIR, 'banned.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function getBanned() {
  return new Set(readJSON(BANNED_FILE, []));
}

function banWord(word) {
  const banned = getBanned();
  if (!banned.has(word)) {
    banned.add(word);
    fs.writeFileSync(BANNED_FILE, JSON.stringify([...banned]));
  }
}

function recordFeedback(word, rating) {
  const log = readJSON(FEEDBACK_FILE, []);
  log.push({ word, rating, at: new Date().toISOString() });
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(log));
}

// --- Express app ---
const app = express();
app.use(express.json());

// GET /word?length=5
app.get('/word', (req, res) => {
  const length = parseInt(req.query.length, 10);
  if (!length || length < 5 || length > 10) {
    return res.status(400).json({ error: 'length must be between 5 and 10' });
  }

  const pool = WORDS_BY_LENGTH[length] || [];
  if (!pool.length) return res.status(404).json({ error: 'No words for this length' });

  const banned = getBanned();
  const available = pool.filter((w) => !banned.has(w));
  if (!available.length) return res.status(404).json({ error: 'No available words (all banned)' });

  const word = available[Math.floor(Math.random() * available.length)];
  res.json({ word });
});

// POST /validate  { word: string }
app.post('/validate', (req, res) => {
  const word = String(req.body?.word || '').trim().toLowerCase();
  if (!/^[a-z]{5,10}$/.test(word)) {
    return res.status(400).json({ error: 'Invalid word format' });
  }
  const valid = (WORD_SETS[word.length] || new Set()).has(word);
  res.json({ valid });
});

// POST /feedback  { word: string, rating: 'up' | 'down' | 'skip' }
app.post('/feedback', (req, res) => {
  const word = String(req.body?.word || '').trim().toLowerCase();
  const rating = String(req.body?.rating || '').trim();

  if (!word || !['up', 'down', 'skip'].includes(rating)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  recordFeedback(word, rating);
  if (rating === 'down') banWord(word);

  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`word-runner API listening on :${PORT}`));
