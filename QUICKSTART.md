# Quick Start

Use this if you just need a backup quickly.

## 1. Install

```bash
npm install
npx playwright install chromium
```

Note:
- No separate Browser MCP server is required.
- This toolkit drives the browser directly via Playwright.

## 2. Login once

```bash
npm run login
```

Sign in to Producer.ai in the opened browser window, then close it.

## 3. Test with a few songs

```bash
node cli.js download -n 3
```

## 4. Back up everything

```bash
node cli.js download --all
```

Optional variants:

```bash
node cli.js download --all --format stems
node cli.js download --all --format mp3 --include-stems --speed fast
```

## 5. Export CSV

```bash
node cli.js export
```

## Useful commands

```bash
node cli.js --help
node cli.js status
node cli.js download --all --reset
node cli.js playlist "https://www.producer.ai/playlist/<uuid>"
node cli.js project "https://www.producer.ai/project/<uuid>"
node cli.js playlist-batch playlists.json
```

## If a run stops

Run the same command again. Checkpoints in `checkpoints/` are used to resume and skip already downloaded songs.
