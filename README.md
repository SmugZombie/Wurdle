# Word Runner

An open-source Wordle-style puzzle app that lets you play puzzle after puzzle without waiting.

## Features

- Static HTML/CSS/JavaScript front end, small Express API behind it
- Defaults to dark mode; light/dark toggle saved to localStorage
- Word length selector from 5 to 10 letters
- Answers drawn from a common-word list; guesses checked against a full dictionary
- Physical keyboard and clickable on-screen keyboard support
- Mobile-friendly and full-screen browser friendly
- Stats saved per word length in localStorage
- Thumbs-down feedback bans a word from future puzzles

## Word lists

There are two lists, and the difference matters:

| File | Role | Size |
| --- | --- | --- |
| `dictionary.js` | Answer pool — the words a puzzle can be | 1500 per length |
| `api/valid-words.txt` | Guess list — the words a player may type | ~239k |

Answers must be words people actually know, so they come from a usage-frequency
ranking. Guesses should accept anything a dictionary would, so that list is
deliberately permissive. Using one list for both jobs is what previously made
ordinary words get rejected as "not in dictionary".

Both files are generated. Regenerate them with:

```bash
node scripts/build-dictionary.js
```

Sources are downloaded once and cached in `scripts/.cache/`. Add
`--offline` to build from the cache only, `--refresh` to re-download, or
`--answers N` to change how many answers each length bucket holds.

Words that should never be an answer live in `scripts/blocklist.txt`; they
remain valid as guesses.

## Run locally

The front end needs the API, so `index.html` cannot be opened straight from
disk. Start the API and serve the static files behind a proxy — Docker Compose
does both:

```bash
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080).

To run just the API while developing:

```bash
cd api && npm install && npm start
```

It reads `dictionary.js` from the repo root and listens on `PORT` (default
3000). Feedback and ban data go to `DATA_DIR` (default `api/data`).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/word?length=5` | Return a random unbanned answer of that length |
| `POST` | `/validate` | `{ word }` → `{ valid: boolean }` |
| `POST` | `/feedback` | `{ word, rating: up\|down\|skip }`; `down` bans the word |
| `GET` | `/health` | Liveness plus current ban count |

## Deploy

`docker compose up --build` serves the static app with nginx (gzip enabled for
JS and CSS) and proxies `/api/` to the API container. Ban and feedback data
persist in the `wurdle-data` volume.
