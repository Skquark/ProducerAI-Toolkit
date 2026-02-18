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

## How Song Discovery Works

Producer.ai stores your songs in two places:

- **"My Songs" library view** — shows only ~20 manually saved songs
- **Sessions** — the bulk of your songs, organized into generation sessions

The `download --all` command scrapes both. For large accounts this discovers 700+ songs across 30+ session pages.

Playlists and projects are scraped separately using the `playlist` and `project` commands.

## Performance

Estimated download times with `--speed normal` (~5 songs/min):

| Library size | Estimated time |
|---|---|
| ~50 songs | ~10 min |
| ~200 songs | ~40 min |
| ~700 songs | ~2.5 hrs |

Speed presets:

| Preset | Rate | Notes |
|---|---|---|
| `--speed slow` | ~3 songs/min | Conservative; use on slow connections |
| `--speed normal` | ~5 songs/min | Default |
| `--speed fast` | ~8 songs/min | Tighter delays |
| `--speed turbo` | ~12 songs/min | Minimal delays; risk of transient errors |

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
  --from-json <file>     Download a specific list of songs from a JSON file
```

Examples:

```bash
node cli.js download --all
node cli.js download -n 20 --format wav
node cli.js download --all --format stems
node cli.js download --all --include-stems --speed fast
node cli.js download --start-id <song-id> --end-id <song-id>
node cli.js download --from-json retry.json
node cli.js download --from-json retry.json --format wav
```

The `--from-json` flag skips the full library scrape and downloads only the songs listed in the file. Useful for retrying specific failures or recovering songs that need a different format. File format:

```json
[
  { "id": "<uuid>", "url": "https://www.producer.ai/song/<uuid>", "title": "Song Title" },
  "https://www.producer.ai/song/<uuid>"
]
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

## Troubleshooting

### Browser Profile Locked (SingletonLock)

If the browser fails to start with a lock error, a Browser MCP server is sharing the same profile directory. Copy it to a temp location:

```bash
cp -r ./.browser-profile /tmp/producer-profile-cli
rm -f /tmp/producer-profile-cli/SingletonLock
node cli.js download --all -p /tmp/producer-profile-cli
```

Resume subsequent runs with the same `-p /tmp/producer-profile-cli` flag.

### Google OAuth Login Blocked

If Google shows "This browser or app may not be secure", the toolkit's anti-detection flags should prevent this. If it still appears:

1. Run `node cli.js login` again — it often succeeds on a retry
2. Ensure you're using the toolkit's built-in login, not an external browser

### Session Expired Mid-Run

If a run fails with "Login or sign up" showing on the page:

1. Re-authenticate: `node cli.js login`
2. Resume the interrupted run without `--reset`:

```bash
node cli.js download --all -p /tmp/producer-profile-cli
```

### Downloads Stalling

If progress stops for several minutes:

- Check `logs/` for error details
- Kill the process and re-run the same command without `--reset` to resume from checkpoint
- Songs that consistently fail are likely unavailable; the toolkit skips them after retries

### Only ~20 Songs Found

The library view only shows manually saved songs. Run with `--all` to also scrape session pages:

```bash
node cli.js download --all
```

## Optional AI Title Workflow

```bash
node scripts/ai-title-review.js
node scripts/apply-ai-titles.js
```

## Recovering a Single Song

If a specific song fails to navigate (`ERR_ABORTED`) or the download event never fires, use the recovery script to diagnose it:

```bash
node scripts/recover-song.js "https://www.producer.ai/song/<uuid>" [output-dir] [profile-path]
```

If the song page loads but the MP3 download is unavailable, try WAV or M4A:

```bash
node cli.js download --from-json retry.json --format wav
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
