#!/usr/bin/env node

/**
 * Add Songs to Playlist
 * Batch add songs to a playlist with optional ID range filtering
 */

import chalk from 'chalk';
import { chromium } from 'playwright';
import path from 'path';
import { PlaylistManager } from '../src/utils/playlistManager.js';
import scraperConfig from '../config/scraper.config.js';

async function addToPlaylist() {
  let context = null;

  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let playlistName = null;
    let startId = null;
    let endId = null;
    let listPlaylists = false;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--playlist' || args[i] === '-p') {
        playlistName = args[++i];
      } else if (args[i] === '--start-id' || args[i] === '-s') {
        startId = args[++i];
      } else if (args[i] === '--end-id' || args[i] === '-e') {
        endId = args[++i];
      } else if (args[i] === '--list' || args[i] === '-l') {
        listPlaylists = true;
      }
    }

    // Show usage if no arguments
    if (!listPlaylists && !playlistName) {
      console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
      console.log(chalk.cyan.bold('     Add Songs to Playlist                       '));
      console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));
      console.log(chalk.white('Usage:'));
      console.log(chalk.gray('  node scripts/add-to-playlist.js --list'));
      console.log(chalk.gray('  node scripts/add-to-playlist.js --playlist "God Is Water"'));
      console.log(chalk.gray('  node scripts/add-to-playlist.js -p "God Is Water" -s <start-id> -e <end-id>\n'));
      console.log(chalk.white('Options:'));
      console.log(chalk.gray('  -l, --list              List available playlists'));
      console.log(chalk.gray('  -p, --playlist <name>   Playlist name (required)'));
      console.log(chalk.gray('  -s, --start-id <id>     Start song ID (optional)'));
      console.log(chalk.gray('  -e, --end-id <id>       End song ID (optional)\n'));
      console.log(chalk.white('Examples:'));
      console.log(chalk.gray('  # List all playlists'));
      console.log(chalk.gray('  node scripts/add-to-playlist.js --list\n'));
      console.log(chalk.gray('  # Add all songs to playlist'));
      console.log(chalk.gray('  node scripts/add-to-playlist.js --playlist "God Is Water"\n'));
      console.log(chalk.gray('  # Add songs within ID range'));
      console.log(chalk.gray('  node scripts/add-to-playlist.js -p "God Is Water" -s abc123 -e def456\n'));
      process.exit(0);
    }

    const profilePath = path.resolve('./.browser-profile');

    console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
    console.log(chalk.cyan.bold('     Add Songs to Playlist                       '));
    console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

    context = await chromium.launchPersistentContext(profilePath, {
      headless: false,
      viewport: { width: 1920, height: 1080 }
    });

    const page = context.pages()[0] || await context.newPage();
    const playlistManager = new PlaylistManager(page);

    // Navigate to songs page
    console.log(chalk.yellow('[1] Loading songs list...\n'));
    await page.goto(scraperConfig.urls.songs, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);

    // If listing playlists, show them and exit
    if (listPlaylists) {
      console.log(chalk.yellow('[2] Getting available playlists...\n'));
      const playlists = await playlistManager.getAvailablePlaylists();

      if (playlists.length === 0) {
        console.log(chalk.red('No playlists found!\n'));
      } else {
        console.log(chalk.green(`Found ${playlists.length} playlists:\n`));
        playlists.forEach((name, idx) => {
          console.log(chalk.white(`  [${idx}] ${name}`));
        });
        console.log();
      }

      await context.close();
      process.exit(0);
    }

    // Get all songs from the page
    console.log(chalk.yellow('[2] Extracting song list...\n'));
    const songs = await page.evaluate((selectors) => {
      const songCards = document.querySelectorAll(selectors.songCard);
      const songs = [];

      songCards.forEach(card => {
        const link = card.querySelector('a[href*="/song/"]');
        const url = link?.href || '';
        const id = url.split('/song/')[1]?.split('?')[0] || '';
        const imageElement = card.querySelector('img[alt]') || card.querySelector('img');
        const title = imageElement?.alt?.trim() || 'Unknown';

        if (id && title) {
          songs.push({ id, title, url });
        }
      });

      return songs;
    }, scraperConfig.selectors);

    console.log(chalk.white(`Found ${songs.length} songs on page\n`));

    if (songs.length === 0) {
      console.log(chalk.red('No songs found on page!\n'));
      await context.close();
      process.exit(1);
    }

    // Add songs to playlist
    console.log(chalk.yellow(`[3] Adding songs to playlist "${playlistName}"...\n`));

    const results = await playlistManager.addSongRangeToPlaylist(
      songs,
      playlistName,
      startId,
      endId
    );

    // Display results
    console.log(chalk.white('\n═══════════════════════════════════════════════════'));
    console.log(chalk.white('Results:\n'));
    console.log(chalk.green(`✓ Successful: ${results.successful}`));
    console.log(chalk.red(`✗ Failed: ${results.failed}`));
    console.log(chalk.gray(`- Skipped: ${results.skipped}`));
    console.log(chalk.white(`  Total: ${results.total}`));
    console.log(chalk.white('═══════════════════════════════════════════════════\n'));

    await context.close();

  } catch (error) {
    console.error(chalk.red('\n✗ Error:'), error.message);
    console.error(error.stack);
    if (context) {
      await context.close();
    }
    process.exit(1);
  }
}

addToPlaylist();
