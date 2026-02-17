# Producer.AI Toolkit

Emergency backup toolkit for your own Producer.ai / Riffusion songs.

If you want to keep your music, this is meant to help you export it fast with either:

- direct CLI commands, or
- your AI agent of choice (Codex, Claude Code, Gemini CLI, OpenCode)

## Why This Exists Right Now

Producer/Riffusion users have reported a full reset scheduled for **February 19, 2026**.

If that date is accurate, songs left in-platform may be lost after the reset. This toolkit exists to help you back up your own work locally before that deadline.

## What This Toolkit Does

- Logs in through your own browser session
- Downloads your songs as `mp3`, `wav`, `m4a`, or stems ZIP
- Saves cover art and metadata JSON per song
- Handles duplicates with safe file naming
- Supports full library, one playlist, one project, or playlist batch workflows
- Resumes interrupted runs using checkpoints
- Exports metadata to CSV

## What It Does Not Do

- It does not bypass authentication or DRM
- It does not upload/host your files
- It does not guarantee future compatibility if Producer.ai UI changes

## 5-Minute AI Agent Quick Start (Recommended)

If using Codex with this repo-local pack, start Codex as:

```bash
CODEX_HOME=$PWD/.codex codex
```

### 1. Install dependencies

```bash
npm install
npx playwright install chromium
```

### 2. Login once

```bash
npm run login
```

### 3. Run a quick smoke test backup

- Codex: `/prompts:backup-quick`
- Claude/Gemini/OpenCode: `/backup-quick`

### 4. Run the full backup

- Codex: `/prompts:backup-full`
- Claude/Gemini/OpenCode: `/backup-full`

### 5. Export and verify

- Codex: `/prompts:backup-export` then `/prompts:backup-verify`
- Claude/Gemini/OpenCode: `/backup-export` then `/backup-verify`

Command mapping details by platform: `PLATFORM-COMMANDS.md`.

## Manual CLI Quick Start (No Agent)

1. Login:

```bash
npm run login
```

2. Smoke test:

```bash
node cli.js download -n 3
```

3. Full backup:

```bash
node cli.js download --all
```

4. Export CSV:

```bash
node cli.js export
```

5. Check status:

```bash
node cli.js status
```

## Requirements

- Node.js 18+
- Chromium/Chrome/Edge available for Playwright
- A Producer.ai account with content you are authorized to back up

Agent-specific notes:

- You do **not** need a separate Browser MCP server to run this toolkit.
- Browser automation is handled directly by Playwright in this project.
- If using an AI agent, you only need that agent CLI plus this repo's command/skill files.

## Platform-Ready Agent Assets (Included in Repo)

This repository already includes pre-generated skills and commands so users can run agents directly in the cloned folder.

Skills:

- `.agents/skills/*`
- `.codex/skills/*`
- `.claude/skills/*`
- `.gemini/skills/*`
- `.opencode/skills/*`

Commands:

- `.codex/prompts/*`
- `.claude/commands/*`
- `.gemini/commands/*`
- `.opencode/commands/*`

References:

- Platform command usage: `PLATFORM-COMMANDS.md`
- Skills pack details: `SKILLS.md`
- Portable slash prompt source: `SLASH-COMMANDS.md`

## Codex Note

Codex custom prompt commands are loaded from `$CODEX_HOME/prompts`.

To use the repo-local Codex command pack directly:

```bash
CODEX_HOME=$PWD/.codex codex
```

## Optional User-Level Sync Scripts

If you want to install command/skill packs into your user directories:

```bash
bash ./scripts/sync-all-agent-assets.sh --dry-run
bash ./scripts/sync-all-agent-assets.sh
```

Granular scripts are also available:

- `./scripts/sync-skills.sh`
- `./scripts/sync-commands.sh`

## CLI Reference

Show help:

```bash
node cli.js --help
```

### login

```bash
node cli.js login [--profile ./.browser-profile]
```

### download

```bash
node cli.js download [options]

Options:
  -a, --all              Download all songs
  -n, --num <number>     Number of songs to download (default: "10")
  -f, --format <format>  Download format (mp3, wav, m4a, stems) (default: "mp3")
  --include-stems        Also download stems ZIP when available
  --speed <mode>         Speed preset: slow, normal, fast, turbo (default: "normal")
  --between-songs-ms <ms> Custom delay between songs (overrides speed preset)
  -o, --output <path>    Output directory (default: "./output")
  -p, --profile <path>   Browser profile path (default: "./.browser-profile")
  --headless             Run browser in headless mode (default: false)
  --reset                Reset checkpoint and start fresh (default: false)
  --start-id <id>        Start downloading from this song ID
  --end-id <id>          Stop downloading at this song ID (inclusive)
```

Examples:

```bash
node cli.js download --all
node cli.js download -n 20 --format wav
node cli.js download --all --format stems
node cli.js download --all --include-stems --speed fast
node cli.js download --start-id <song-id> --end-id <song-id>
```

### playlist

```bash
node cli.js playlist <playlist-url> [options]
```

Example:

```bash
node cli.js playlist "https://www.producer.ai/playlist/<uuid>" --format mp3
node cli.js playlist "https://www.producer.ai/playlist/<uuid>" --format stems
node cli.js playlist "https://www.producer.ai/playlist/<uuid>" --include-stems --speed fast
```

### project

```bash
node cli.js project <project-url> [options]
```

URL format:
- `https://www.producer.ai/project/<uuid>`

Example:

```bash
node cli.js project "https://www.producer.ai/project/<uuid>" --format mp3
node cli.js project "https://www.producer.ai/project/<uuid>" --format stems
node cli.js project "https://www.producer.ai/project/<uuid>" --include-stems --speed fast
```

### playlist-batch

```bash
node cli.js playlist-batch <json-file> [options]
```

Batch file format can be:

```json
[
  "https://www.producer.ai/playlist/<uuid>",
  { "url": "https://www.producer.ai/playlist/<uuid>" }
]
```

A template is included at `playlists.example.json`.

Example:

```bash
node cli.js playlist-batch playlists.json --format stems --speed fast
```

### status

```bash
node cli.js status [--output ./output]
```

### export

```bash
node cli.js export [--output ./output] [--csv-path ./output/library.csv]
```

## Output Layout

Library downloads are saved flat:

```text
output/
  Song Title.mp3
  Song Title.jpg
  Song Title.json
```

Playlist and project downloads are saved in collection subfolders:

```text
output/
  My Playlist/
    Song A.mp3
    Song A.jpg
    Song A.json
  My Project/
    Song B.mp3
    Song B.jpg
    Song B.json
```

## Checkpoints and Logs

- Checkpoints: `checkpoints/`
- Logs: `logs/`

Restart from scratch:

```bash
node cli.js download --all --reset
```

## Optional AI Title Workflow

```bash
node scripts/ai-title-review.js
node scripts/apply-ai-titles.js
```

## Legal and Responsibility

Use only for content you own or are authorized to back up. Respect Producer.ai / Riffusion terms and applicable law.

## Development

```bash
npm test
node cli.js --help
```

## License

MIT. See `LICENSE`.
