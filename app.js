const API = '/api';
const MAX_GUESSES = 6;
const STORAGE = {
  theme: 'word-runner-theme',
  length: 'word-runner-length',
  stats: 'word-runner-stats-v1'
};

const state = {
  length: Number(localStorage.getItem(STORAGE.length)) || 5,
  answer: '',
  row: 0,
  col: 0,
  guesses: [],
  results: [],
  complete: false,
  keyStates: {},
  checking: false
};

const board = document.getElementById('board');
const keyboard = document.getElementById('keyboard');
const message = document.getElementById('message');
const wordLength = document.getElementById('wordLength');
const newGameBtn = document.getElementById('newGameBtn');
const themeToggle = document.getElementById('themeToggle');
const feedbackEl = document.getElementById('feedback');

async function init() {
  setupTheme();
  setupLengthSelector();
  setupFeedbackButtons();
  await newGame();
  if (window.innerWidth <= 520) {
    document.getElementById('puzzleControls').removeAttribute('open');
  }
  newGameBtn.addEventListener('click', async () => {
    await newGame();
    if (window.innerWidth <= 520) {
      document.getElementById('puzzleControls').removeAttribute('open');
    }
  });
  wordLength.addEventListener('change', async () => {
    if (isGameInProgress()) {
      wordLength.value = state.length;
      return setMessage('Finish this puzzle or start a new one before changing word length.', true);
    }
    state.length = Number(wordLength.value);
    localStorage.setItem(STORAGE.length, state.length);
    await newGame();
  });
  document.addEventListener('keydown', handlePhysicalKey);
}

function setupTheme() {
  const saved = localStorage.getItem(STORAGE.theme) || 'dark';
  document.documentElement.dataset.theme = saved;
  themeToggle.textContent = saved === 'dark' ? '🌙' : '☀️';
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem(STORAGE.theme, next);
    themeToggle.textContent = next === 'dark' ? '🌙' : '☀️';
  });
}

function setupLengthSelector() {
  for (let i = 5; i <= 10; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `${i} letters`;
    wordLength.appendChild(option);
  }
  wordLength.value = state.length;
}

function setupFeedbackButtons() {
  document.getElementById('thumbsUpBtn').addEventListener('click', () => submitFeedback('up'));
  document.getElementById('thumbsDownBtn').addEventListener('click', () => submitFeedback('down'));
  document.getElementById('skipFeedbackBtn').addEventListener('click', () => submitFeedback('skip'));
}

async function newGame() {
  state.row = 0;
  state.col = 0;
  state.guesses = Array.from({ length: MAX_GUESSES }, () => Array(state.length).fill(''));
  state.results = Array.from({ length: MAX_GUESSES }, () => Array(state.length).fill(''));
  state.complete = false;
  state.keyStates = {};
  state.checking = true;
  state.answer = '';
  hideFeedback();
  setMessage('Loading...');
  renderBoard();
  renderKeyboard();

  try {
    const res = await fetch(`${API}/word?length=${state.length}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.answer = data.word;
  } catch {
    setMessage('Could not load puzzle — please try again.', true);
    state.checking = false;
    renderKeyboard();
    return;
  }

  state.checking = false;
  setMessage('');
  renderKeyboard();
  renderStats();
  updateLengthSelectorState();
}

function isGameInProgress() {
  return !state.complete && (state.row > 0 || state.col > 0);
}

function updateLengthSelectorState() {
  wordLength.disabled = isGameInProgress();
}

function renderBoard() {
  board.innerHTML = '';
  board.style.gridTemplateRows = `repeat(${MAX_GUESSES}, auto)`;
  for (let r = 0; r < MAX_GUESSES; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    row.style.gridTemplateColumns = `repeat(${state.length}, auto)`;
    for (let c = 0; c < state.length; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.textContent = state.guesses[r][c] || '';
      if (tile.textContent) tile.classList.add('filled');
      const savedResult = state.results?.[r]?.[c];
      if (savedResult) tile.classList.add(savedResult);
      row.appendChild(tile);
    }
    board.appendChild(row);
  }
}

function renderKeyboard() {
  keyboard.innerHTML = '';
  const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  rows.forEach((letters, idx) => {
    const row = document.createElement('div');
    row.className = 'key-row';
    if (idx === 2) row.appendChild(makeKey('Enter', 'wide'));
    [...letters].forEach(letter => row.appendChild(makeKey(letter)));
    if (idx === 2) row.appendChild(makeKey('⌫', 'wide', 'Backspace'));
    keyboard.appendChild(row);
  });
}

function makeKey(label, extraClass = '', value = label) {
  const key = document.createElement('button');
  key.className = `key ${extraClass} ${state.keyStates[String(value).toLowerCase()] || ''}`.trim();
  key.type = 'button';
  key.disabled = state.checking;
  key.textContent = label;
  key.addEventListener('click', () => handleKey(value));
  return key;
}

function handlePhysicalKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^[a-zA-Z]$/.test(e.key) || e.key === 'Enter' || e.key === 'Backspace') {
    e.preventDefault();
    handleKey(e.key);
  }
}

function handleKey(key) {
  if (state.complete || state.checking) return;
  if (/^[a-zA-Z]$/.test(key)) addLetter(key.toLowerCase());
  else if (key === 'Backspace') removeLetter();
  else if (key === 'Enter') submitGuess();
}

function addLetter(letter) {
  if (state.col >= state.length) return;
  state.guesses[state.row][state.col] = letter;
  state.col++;
  setMessage('');
  renderBoard();
  updateLengthSelectorState();
}

function removeLetter() {
  if (state.col <= 0) return;
  state.col--;
  state.guesses[state.row][state.col] = '';
  renderBoard();
  updateLengthSelectorState();
}

async function submitGuess() {
  const guess = state.guesses[state.row].join('').toLowerCase();
  if (guess.length !== state.length) return setMessage('Not enough letters.', true);
  if (!/^[a-z]+$/.test(guess)) return setMessage('Use letters only.', true);

  state.checking = true;
  setMessage('Checking...');
  renderKeyboard();

  const valid = await isValidWord(guess);

  state.checking = false;
  renderKeyboard();

  if (!valid) return setMessage('Not in dictionary.', true);
  setMessage('');
  scoreGuess(guess);
  if (guess === state.answer) return finish(true);
  state.row++;
  state.col = 0;
  if (state.row >= MAX_GUESSES) return finish(false);
}

async function isValidWord(word) {
  const clean = String(word || '').trim().toLowerCase();
  if (!/^[a-z]{5,10}$/.test(clean)) return false;
  try {
    const res = await fetch(`${API}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: clean })
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.valid === true;
  } catch {
    return false;
  }
}

function scoreGuess(guess) {
  const answer = state.answer;
  const rowEl = board.children[state.row];
  const result = Array(state.length).fill('absent');
  const counts = {};
  [...answer].forEach(ch => counts[ch] = (counts[ch] || 0) + 1);

  for (let i = 0; i < state.length; i++) {
    if (guess[i] === answer[i]) {
      result[i] = 'correct';
      counts[guess[i]]--;
    }
  }
  for (let i = 0; i < state.length; i++) {
    if (result[i] !== 'correct' && counts[guess[i]] > 0) {
      result[i] = 'present';
      counts[guess[i]]--;
    }
  }
  for (let i = 0; i < state.length; i++) {
    state.results[state.row][i] = result[i];
    rowEl.children[i].classList.add(result[i]);
    updateKeyState(guess[i], result[i]);
  }
  renderKeyboard();
  updateLengthSelectorState();
}

function updateKeyState(letter, result) {
  const priority = { absent: 1, present: 2, correct: 3 };
  const current = state.keyStates[letter];
  if (!current || priority[result] > priority[current]) state.keyStates[letter] = result;
}

function finish(won) {
  state.complete = true;
  updateStats(won);
  renderStats();
  setMessage(won ? `Nice! Answer: ${state.answer.toUpperCase()}` : `Answer: ${state.answer.toUpperCase()}`);
  updateLengthSelectorState();
  showFeedback();
}

function showFeedback() {
  feedbackEl.hidden = false;
}

function hideFeedback() {
  feedbackEl.hidden = true;
}

async function submitFeedback(rating) {
  hideFeedback();
  if (rating !== 'skip') {
    showThanksModal();
    fetch(`${API}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: state.answer, rating })
    }).catch(() => {});
  }
}

function showThanksModal() {
  const modal = document.getElementById('thanksModal');
  modal.classList.remove('dissolving');
  modal.hidden = false;
  setTimeout(() => modal.classList.add('dissolving'), 2400);
  setTimeout(() => { modal.hidden = true; }, 3000);
}

function getStats() {
  return JSON.parse(localStorage.getItem(STORAGE.stats) || '{}');
}

function saveStats(stats) {
  localStorage.setItem(STORAGE.stats, JSON.stringify(stats));
}

function currentStats() {
  const all = getStats();
  return all[state.length] || { played: 0, wins: 0, streak: 0, best: 0 };
}

function updateStats(won) {
  const all = getStats();
  const stats = currentStats();
  stats.played++;
  if (won) {
    stats.wins++;
    stats.streak++;
    stats.best = Math.max(stats.best, stats.streak);
  } else {
    stats.streak = 0;
  }
  all[state.length] = stats;
  saveStats(all);
}

function renderStats() {
  const stats = currentStats();
  document.getElementById('playedStat').textContent = stats.played;
  document.getElementById('winsStat').textContent = stats.wins;
  document.getElementById('streakStat').textContent = stats.streak;
  document.getElementById('bestStat').textContent = stats.best;
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
}

init();
