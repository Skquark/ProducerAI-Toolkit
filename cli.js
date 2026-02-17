#!/usr/bin/env node

/**
 * Producer.AI Scraper CLI
 * Main command-line interface for the scraper
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs-extra';
import { FullLibraryScraper } from './src/scrapers/fullLibraryScraper.js';
import { CSVExporter } from './src/exporters/csvExporter.js';
import { logger } from './src/utils/logger.js';
import scraperConfig from './config/scraper.config.js';

const program = new Command();
const SUPPORTED_AUDIO_FORMATS = new Set(['mp3', 'wav', 'm4a', 'stems']);
const SPEED_MULTIPLIERS = {
  slow: 1.5,
  normal: 1,
  fast: 0.65,
  turbo: 0.45
};
const BASE_DELAYS = { ...scraperConfig.behavior.delays };

function normalizeFormat(format) {
  const normalized = String(format || '').toLowerCase();
  if (!SUPPORTED_AUDIO_FORMATS.has(normalized)) {
    throw new Error(
      `Unsupported format "${format}". Use one of: ${Array.from(SUPPORTED_AUDIO_FORMATS).join(', ')}`
    );
  }
  return normalized;
}

function normalizeSpeed(speed) {
  const normalized = String(speed || 'normal').toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(SPEED_MULTIPLIERS, normalized)) {
    throw new Error(
      `Unsupported speed "${speed}". Use one of: ${Object.keys(SPEED_MULTIPLIERS).join(', ')}`
    );
  }
  return normalized;
}

function parsePositiveInteger(value, optionName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${optionName} "${value}". It must be a positive integer.`);
  }
  return parsed;
}

function applySpeedSettings(speed, betweenSongsMs) {
  const normalizedSpeed = normalizeSpeed(speed);
  const multiplier = SPEED_MULTIPLIERS[normalizedSpeed];

  for (const [key, baseDelay] of Object.entries(BASE_DELAYS)) {
    scraperConfig.behavior.delays[key] = Math.max(250, Math.round(baseDelay * multiplier));
  }

  let customBetweenSongs = null;
  if (betweenSongsMs !== undefined && betweenSongsMs !== null) {
    customBetweenSongs = parsePositiveInteger(betweenSongsMs, '--between-songs-ms');
    scraperConfig.behavior.delays.betweenSongs = customBetweenSongs;
  }

  return {
    speed: normalizedSpeed,
    betweenSongsMs: scraperConfig.behavior.delays.betweenSongs,
    customBetweenSongs
  };
}

async function countMetadataJsonFiles(dir) {
  if (!await fs.pathExists(dir)) {
    return 0;
  }

  const entries = await fs.readdir(dir, { withFileTypes: true });
  let total = 0;

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await countMetadataJsonFiles(fullPath);
      continue;
    }

    if (
      entry.name.endsWith('.json')
      && !entry.name.includes('checkpoint')
      && !entry.name.includes('report')
      && entry.name !== '_ai-review-pending.json'
    ) {
      total++;
    }
  }

  return total;
}

program
  .name('producer-ai-scraper')
  .description('Download your Producer.AI music library with metadata')
  .version('1.0.0');

// Login command
program
  .command('login')
  .description('Open browser to log in to Producer.AI')
  .option('-p, --profile <path>', 'Browser profile path', './.browser-profile')
  .action(async (options) => {
    console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
    console.log(chalk.cyan.bold('        Producer.ai Login Helper                  '));
    console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

    const profilePath = path.resolve(options.profile);

    const context = await chromium.launchPersistentContext(profilePath, {
      headless: false,
      viewport: { width: 1920, height: 1080 }
    });

    const page = context.pages()[0] || await context.newPage();

    console.log(chalk.yellow('Navigating to Producer.ai...\n'));
    await page.goto(scraperConfig.urls.base);

    console.log(chalk.green('✓ Browser opened!\n'));
    console.log(chalk.white('Please log in and then close the browser window.\n'));

    await context.waitForEvent('close');
    console.log(chalk.green('\n✓ Login session saved!\n'));
  });

// Download command
program
  .command('download')
  .description('Download songs from your library')
  .option('-a, --all', 'Download all songs')
  .option('-n, --num <number>', 'Number of songs to download', '10')
  .option('-f, --format <format>', 'Download format (mp3, wav, m4a, stems)', 'mp3')
  .option('--include-stems', 'Also download stems ZIP when available', false)
  .option('--speed <mode>', 'Speed preset: slow, normal, fast, turbo', 'normal')
  .option('--between-songs-ms <ms>', 'Custom delay between songs (overrides speed preset)')
  .option('-o, --output <path>', 'Output directory', './output')
  .option('-p, --profile <path>', 'Browser profile path', './.browser-profile')
  .option('--headless', 'Run browser in headless mode', false)
  .option('--reset', 'Reset checkpoint and start fresh', false)
  .option('--start-id <id>', 'Start downloading from this song ID')
  .option('--end-id <id>', 'Stop downloading at this song ID (inclusive)')
  .action(async (options) => {
    console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
    console.log(chalk.cyan.bold('     Producer.AI Library Downloader              '));
    console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

    const profilePath = path.resolve(options.profile);
    const outputPath = path.resolve(options.output);
    let format;
    let maxSongs;
    let speedSettings;
    try {
      format = normalizeFormat(options.format);
      maxSongs = options.all ? null : parsePositiveInteger(options.num, '--num');
      speedSettings = applySpeedSettings(options.speed, options.betweenSongsMs);
    } catch (error) {
      console.error(chalk.red('\n✗ Error:'), error.message);
      process.exit(1);
    }

    console.log(chalk.gray(`Profile: ${profilePath}`));
    console.log(chalk.gray(`Output: ${outputPath}`));
    console.log(chalk.gray(`Format: ${format === 'stems' ? 'STEMS (ZIP)' : format.toUpperCase()}`));
    console.log(chalk.gray(`Include stems: ${options.includeStems ? 'Yes' : 'No'}`));
    console.log(chalk.gray(`Speed: ${speedSettings.speed}`));
    console.log(chalk.gray(`Between songs delay: ${speedSettings.betweenSongsMs}ms`));
    console.log(chalk.gray(`Headless: ${options.headless ? 'Yes' : 'No'}`));
    if (options.startId || options.endId) {
      console.log(chalk.gray(`Range: ${options.startId || 'start'} → ${options.endId || 'end'}`));
    }
    console.log();

    const context = await chromium.launchPersistentContext(profilePath, {
      headless: options.headless,
      viewport: { width: 1920, height: 1080 },
      acceptDownloads: true
    });

    const page = context.pages()[0] || await context.newPage();

    try {
      const scraper = new FullLibraryScraper(page, outputPath);

      if (options.reset) {
        await scraper.resetCheckpoint();
        console.log(chalk.yellow('Checkpoint reset\n'));
      }

      const results = await scraper.downloadAllSongs({
        format,
        includeStems: options.includeStems,
        maxSongs,
        startId: options.startId,
        endId: options.endId
      });

      console.log(chalk.green('\n✓ Download complete!\n'));
      console.log(chalk.white('Results:'));
      console.log(chalk.green(`  ✓ Successful: ${results.successful}`));
      console.log(chalk.yellow(`  ⊘ Skipped: ${results.skipped}`));
      console.log(chalk.red(`  ✗ Failed: ${results.failed}`));
      console.log(chalk.gray(`  Total: ${results.total}\n`));

      await scraper.generateReport();

    } catch (error) {
      console.error(chalk.red('\n✗ Error:'), error.message);
      process.exit(1);
    } finally {
      await context.close();
    }
  });

// Playlist download command
program
  .command('playlist')
  .description('Download songs from a specific playlist URL')
  .argument('<url>', 'Playlist URL (https://www.producer.ai/playlist/UUID)')
  .option('-f, --format <format>', 'Download format (mp3, wav, m4a, stems)', 'mp3')
  .option('--include-stems', 'Also download stems ZIP when available', false)
  .option('--speed <mode>', 'Speed preset: slow, normal, fast, turbo', 'normal')
  .option('--between-songs-ms <ms>', 'Custom delay between songs (overrides speed preset)')
  .option('-o, --output <path>', 'Output directory', './output')
  .option('-p, --profile <path>', 'Browser profile path', './.browser-profile')
  .option('--headless', 'Run browser in headless mode', false)
  .option('--reset', 'Reset checkpoint for this playlist', false)
  .action(async (url, options) => {
    console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
    console.log(chalk.cyan.bold('     Producer.AI Playlist Downloader             '));
    console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

    const profilePath = path.resolve(options.profile);
    const outputPath = path.resolve(options.output);
    let format;
    let speedSettings;
    try {
      format = normalizeFormat(options.format);
      speedSettings = applySpeedSettings(options.speed, options.betweenSongsMs);
      if (!/\/playlist\/[a-f0-9-]{36}/i.test(url)) {
        throw new Error('Invalid playlist URL. Expected: https://www.producer.ai/playlist/<UUID>');
      }
    } catch (error) {
      console.error(chalk.red('\n✗ Error:'), error.message);
      process.exit(1);
    }

    console.log(chalk.gray(`Playlist: ${url}`));
    console.log(chalk.gray(`Profile:  ${profilePath}`));
    console.log(chalk.gray(`Output:   ${outputPath}`));
    console.log(chalk.gray(`Format:   ${format === 'stems' ? 'STEMS (ZIP)' : format.toUpperCase()}`));
    console.log(chalk.gray(`Include stems: ${options.includeStems ? 'Yes' : 'No'}`));
    console.log(chalk.gray(`Speed:    ${speedSettings.speed}`));
    console.log(chalk.gray(`Delay:    ${speedSettings.betweenSongsMs}ms\n`));

    const context = await chromium.launchPersistentContext(profilePath, {
      headless: options.headless,
      viewport: { width: 1920, height: 1080 },
      acceptDownloads: true
    });

    const page = context.pages()[0] || await context.newPage();

    try {
      const scraper = new FullLibraryScraper(page, outputPath);

      const results = await scraper.downloadPlaylist(url, {
        format,
        includeStems: options.includeStems,
        reset: options.reset
      });

      console.log(chalk.green(`\n✓ Playlist "${results.playlistName}" complete!\n`));
      console.log(chalk.white('Results:'));
      console.log(chalk.green(`  ✓ Successful: ${results.successful}`));
      console.log(chalk.yellow(`  ⊘ Skipped:    ${results.skipped}`));
      console.log(chalk.red(`  ✗ Failed:     ${results.failed}`));
      console.log(chalk.gray(`  Total:        ${results.total}\n`));

    } catch (error) {
      console.error(chalk.red('\n✗ Error:'), error.message);
      process.exit(1);
    } finally {
      await context.close();
    }
  });

// Project download command
program
  .command('project')
  .description('Download songs from a specific project URL')
  .argument('<url>', 'Project URL (https://www.producer.ai/project/UUID)')
  .option('-f, --format <format>', 'Download format (mp3, wav, m4a, stems)', 'mp3')
  .option('--include-stems', 'Also download stems ZIP when available', false)
  .option('--speed <mode>', 'Speed preset: slow, normal, fast, turbo', 'normal')
  .option('--between-songs-ms <ms>', 'Custom delay between songs (overrides speed preset)')
  .option('-o, --output <path>', 'Output directory', './output')
  .option('-p, --profile <path>', 'Browser profile path', './.browser-profile')
  .option('--headless', 'Run browser in headless mode', false)
  .option('--reset', 'Reset checkpoint for this project', false)
  .action(async (url, options) => {
    console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
    console.log(chalk.cyan.bold('     Producer.AI Project Downloader              '));
    console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

    const profilePath = path.resolve(options.profile);
    const outputPath = path.resolve(options.output);
    let format;
    let speedSettings;
    try {
      format = normalizeFormat(options.format);
      speedSettings = applySpeedSettings(options.speed, options.betweenSongsMs);
      if (!/\/project\/[a-f0-9-]{36}/i.test(url)) {
        throw new Error('Invalid project URL. Expected: https://www.producer.ai/project/<UUID>');
      }
    } catch (error) {
      console.error(chalk.red('\n✗ Error:'), error.message);
      process.exit(1);
    }

    console.log(chalk.gray(`Project:  ${url}`));
    console.log(chalk.gray(`Profile:  ${profilePath}`));
    console.log(chalk.gray(`Output:   ${outputPath}`));
    console.log(chalk.gray(`Format:   ${format === 'stems' ? 'STEMS (ZIP)' : format.toUpperCase()}`));
    console.log(chalk.gray(`Include stems: ${options.includeStems ? 'Yes' : 'No'}`));
    console.log(chalk.gray(`Speed:    ${speedSettings.speed}`));
    console.log(chalk.gray(`Delay:    ${speedSettings.betweenSongsMs}ms\n`));

    const context = await chromium.launchPersistentContext(profilePath, {
      headless: options.headless,
      viewport: { width: 1920, height: 1080 },
      acceptDownloads: true
    });

    const page = context.pages()[0] || await context.newPage();

    try {
      const scraper = new FullLibraryScraper(page, outputPath);

      const results = await scraper.downloadProject(url, {
        format,
        includeStems: options.includeStems,
        reset: options.reset
      });

      console.log(chalk.green(`\n✓ Project "${results.projectName || results.collectionName}" complete!\n`));
      console.log(chalk.white('Results:'));
      console.log(chalk.green(`  ✓ Successful: ${results.successful}`));
      console.log(chalk.yellow(`  ⊘ Skipped:    ${results.skipped}`));
      console.log(chalk.red(`  ✗ Failed:     ${results.failed}`));
      console.log(chalk.gray(`  Total:        ${results.total}\n`));

    } catch (error) {
      console.error(chalk.red('\n✗ Error:'), error.message);
      process.exit(1);
    } finally {
      await context.close();
    }
  });

// Playlist batch download command
program
  .command('playlist-batch')
  .description('Download multiple playlists from a JSON file')
  .argument('<json-file>', 'JSON file containing playlist URLs (array of strings or [{url}] objects)')
  .option('-f, --format <format>', 'Download format (mp3, wav, m4a, stems)', 'mp3')
  .option('--include-stems', 'Also download stems ZIP when available', false)
  .option('--speed <mode>', 'Speed preset: slow, normal, fast, turbo', 'normal')
  .option('--between-songs-ms <ms>', 'Custom delay between songs (overrides speed preset)')
  .option('-o, --output <path>', 'Output directory', './output')
  .option('-p, --profile <path>', 'Browser profile path', './.browser-profile')
  .option('--headless', 'Run browser in headless mode', false)
  .option('--reset', 'Reset checkpoints for all playlists', false)
  .action(async (jsonFile, options) => {
    console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
    console.log(chalk.cyan.bold('     Producer.AI Playlist Batch Downloader       '));
    console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

    const jsonPath = path.resolve(jsonFile);
    if (!await fs.pathExists(jsonPath)) {
      console.error(chalk.red(`✗ JSON file not found: ${jsonPath}`));
      process.exit(1);
    }

    const raw = await fs.readJson(jsonPath);
    if (!Array.isArray(raw)) {
      console.error(chalk.red('✗ Invalid JSON format. Expected an array.'));
      process.exit(1);
    }

    let format;
    let speedSettings;
    try {
      format = normalizeFormat(options.format);
      speedSettings = applySpeedSettings(options.speed, options.betweenSongsMs);
    } catch (error) {
      console.error(chalk.red('\n✗ Error:'), error.message);
      process.exit(1);
    }
    const playlists = raw.map(entry =>
      typeof entry === 'string' ? { url: entry } : entry
    ).filter(p => p.url && /\/playlist\/[a-f0-9-]{36}/i.test(p.url));
    const invalidEntries = raw.length - playlists.length;

    if (playlists.length === 0) {
      console.error(chalk.red('✗ No valid playlist URLs found in JSON file'));
      process.exit(1);
    }
    if (invalidEntries > 0) {
      console.log(chalk.yellow(`⚠ Skipping ${invalidEntries} invalid playlist entr${invalidEntries === 1 ? 'y' : 'ies'} from JSON file`));
    }

    const profilePath = path.resolve(options.profile);
    const outputPath = path.resolve(options.output);

    console.log(chalk.gray(`Playlists: ${playlists.length}`));
    console.log(chalk.gray(`Profile:   ${profilePath}`));
    console.log(chalk.gray(`Output:    ${outputPath}`));
    console.log(chalk.gray(`Format:    ${format === 'stems' ? 'STEMS (ZIP)' : format.toUpperCase()}`));
    console.log(chalk.gray(`Include stems: ${options.includeStems ? 'Yes' : 'No'}`));
    console.log(chalk.gray(`Speed:     ${speedSettings.speed}`));
    console.log(chalk.gray(`Delay:     ${speedSettings.betweenSongsMs}ms\n`));

    const context = await chromium.launchPersistentContext(profilePath, {
      headless: options.headless,
      viewport: { width: 1920, height: 1080 },
      acceptDownloads: true
    });

    const page = context.pages()[0] || await context.newPage();

    const grandTotal = { successful: 0, failed: 0, skipped: 0, total: 0 };

    try {
      const scraper = new FullLibraryScraper(page, outputPath);

      for (let i = 0; i < playlists.length; i++) {
        const { url } = playlists[i];
        console.log(chalk.cyan(`\n[${i + 1}/${playlists.length}] Starting playlist: ${url}\n`));

        try {
          const results = await scraper.downloadPlaylist(url, {
            format,
            includeStems: options.includeStems,
            reset: options.reset
          });

          console.log(chalk.green(`  ✓ "${results.playlistName}": ${results.successful} downloaded, ${results.skipped} skipped, ${results.failed} failed`));

          grandTotal.successful += results.successful;
          grandTotal.failed += results.failed;
          grandTotal.skipped += results.skipped;
          grandTotal.total += results.total;

        } catch (err) {
          console.error(chalk.red(`  ✗ Failed: ${err.message}`));
          grandTotal.failed++;
        }
      }

      console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
      console.log(chalk.cyan.bold('                 BATCH COMPLETE                  '));
      console.log(chalk.cyan('═══════════════════════════════════════════════════'));
      console.log(chalk.green(`  ✓ Successful: ${grandTotal.successful}`));
      console.log(chalk.yellow(`  ⊘ Skipped:    ${grandTotal.skipped}`));
      console.log(chalk.red(`  ✗ Failed:     ${grandTotal.failed}`));
      console.log(chalk.gray(`  Total:        ${grandTotal.total}\n`));

    } catch (error) {
      console.error(chalk.red('\n✗ Error:'), error.message);
      process.exit(1);
    } finally {
      await context.close();
    }
  });

// Export command
program
  .command('export')
  .description('Export downloaded songs to CSV for WordPress')
  .option('-o, --output <path>', 'Output directory', './output')
  .option('-c, --csv-path <path>', 'Custom CSV output path')
  .action(async (options) => {
    console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
    console.log(chalk.cyan.bold('     CSV Export for WordPress                    '));
    console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

    try {
      const outputPath = path.resolve(options.output);
      const exporter = new CSVExporter(outputPath);

      const result = await exporter.exportToCSV(options.csvPath);

      if (result) {
        console.log(chalk.green('\n✓ CSV exported successfully!\n'));
        console.log(chalk.white('Details:'));
        console.log(chalk.gray(`  File: ${result.path}`));
        console.log(chalk.gray(`  Songs: ${result.songCount}`));
        console.log(chalk.gray(`  Size: ${(result.size / 1024).toFixed(2)} KB\n`));
      } else {
        console.log(chalk.yellow('No songs found to export\n'));
      }

    } catch (error) {
      console.error(chalk.red('\n✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show download progress status')
  .option('-o, --output <path>', 'Output directory', './output')
  .action(async (options) => {
    console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
    console.log(chalk.cyan.bold('     Download Status                             '));
    console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

    try {
      const outputPath = path.resolve(options.output);
      const exportedSongs = await countMetadataJsonFiles(outputPath);
      const checkpointPath = path.join(scraperConfig.progress.checkpointDir, 'library-scrape.json');

      console.log(chalk.white('Local files:'));
      console.log(chalk.gray(`  Output path: ${outputPath}`));
      console.log(chalk.gray(`  Metadata files found: ${exportedSongs}\n`));

      if (await fs.pathExists(checkpointPath)) {
        const checkpoint = await fs.readJson(checkpointPath);

        console.log(chalk.white('Progress:'));
        console.log(chalk.gray(`  Total songs found: ${checkpoint.totalSongs || 0}`));
        console.log(chalk.green(`  Downloaded: ${checkpoint.downloadedSongs?.length || 0}`));
        console.log(chalk.red(`  Failed: ${checkpoint.failedSongs?.length || 0}`));
        console.log(chalk.gray(`  Last updated: ${checkpoint.lastUpdated || 'N/A'}\n`));

        if (checkpoint.failedSongs && checkpoint.failedSongs.length > 0) {
          console.log(chalk.yellow('Failed songs:'));
          checkpoint.failedSongs.forEach(({ song, error }) => {
            const compactError = String(error || '').replace(/\s+/g, ' ').trim();
            const shortError = compactError.length > 200 ? `${compactError.slice(0, 197)}...` : compactError;
            console.log(chalk.gray(`  - ${song.title}: ${shortError}`));
          });
          console.log();
        }

      } else {
        console.log(chalk.yellow('No checkpoint found. Run download first.\n'));
      }

    } catch (error) {
      console.error(chalk.red('\n✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
