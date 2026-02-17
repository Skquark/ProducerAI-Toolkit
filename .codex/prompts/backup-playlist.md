---
description: Back up one playlist URL
argument-hint: <playlist-url>
---
Use the `producer-backup-operator` skill.
Goal: back up a single playlist.

Input:
- Playlist URL: $ARGUMENTS

Steps:
1. If URL is missing, ask for it and stop.
2. Validate URL matches `https://www.producer.ai/playlist/<uuid>`.
3. Run `node cli.js playlist "$ARGUMENTS" --format mp3`.
4. Run `node cli.js status`.

Rules:
- If URL is invalid, stop and ask for a corrected URL.
- Summarize playlist result counts.
