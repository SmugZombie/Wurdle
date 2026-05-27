# Word Runner

An open-source, static Wordle-style puzzle app that lets you play puzzle after puzzle without waiting.

## Features

- Static HTML/CSS/JavaScript SPA
- Defaults to dark mode
- Light/dark toggle saved to localStorage
- Word length selector from 5 to 10 letters
- Local dictionary answer selection and validation
- FreeDictionaryAPI fallback for words missing from the local list
- Physical keyboard and clickable on-screen keyboard support
- Mobile-friendly and full-screen browser friendly
- Stats saved per word length in localStorage

## Run locally

Open `index.html` directly in a browser, or serve the folder with any static web server.

Example:

```bash
python3 -m http.server 8080
```

Then visit:

```text
http://localhost:8080
```

## Deploy

Upload these files to any static hosting provider such as GitHub Pages, Cloudflare Pages, Netlify, S3 static hosting, or Nginx.

## Docker

Build and run with Docker Compose:

```bash
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080).

Or use Docker directly:

```bash
docker build -t word-runner .
docker run --rm -p 8080:80 word-runner
```

The image serves the static app with nginx (gzip enabled for JS/CSS and the dictionary).
