/**
 * Playlist Manager
 * Handles adding songs to playlists via the UI
 */

import { logger } from './logger.js';
import scraperConfig from '../../config/scraper.config.js';

export class PlaylistManager {
  constructor(page) {
    this.page = page;
  }

  /**
   * Add a song to a playlist from the songs list page
   * @param {string} songId - The song ID
   * @param {string} playlistName - Name of the playlist to add to
   * @param {number} songIndex - Index of song in the list (0-based)
   */
  async addSongToPlaylist(songId, playlistName, songIndex = 0) {
    try {
      logger.debug(`Adding song ${songId} to playlist "${playlistName}"`);

      // Get the song card at the specified index
      const songCards = this.page.locator(scraperConfig.selectors.songCard);
      const songCard = songCards.nth(songIndex);

      // Hover over the song card to reveal buttons
      await songCard.hover();
      await this.page.waitForTimeout(300);

      // Find and click the RiffOptionsMenu button (... menu)
      const menuButton = songCard.locator('button[data-sentry-element="MenuTrigger"][data-sentry-source-file="RiffOptionsMenu.tsx"]').first();

      const buttonExists = await menuButton.count();
      if (buttonExists === 0) {
        throw new Error('Menu button not found on song card');
      }

      await menuButton.click();
      await this.page.waitForTimeout(800);

      logger.debug('Opened menu');

      // Use keyboard navigation to avoid mouse path issues
      // Navigate to "Add to" (position 5, so press Down 5 times)
      logger.debug('Navigating to "Add to" with keyboard...');
      for (let i = 0; i < 5; i++) {
        await this.page.keyboard.press('ArrowDown');
        await this.page.waitForTimeout(100);
      }

      // Press Right to open "Add to" submenu
      logger.debug('Opening "Add to" submenu...');
      await this.page.keyboard.press('ArrowRight');
      await this.page.waitForTimeout(1000);

      // "Playlist" is the first item in the submenu, already selected
      // Press Right immediately to open Playlist submenu
      logger.debug('Opening Playlist submenu (first item)...');
      await this.page.keyboard.press('ArrowRight');
      await this.page.waitForTimeout(1500);

      logger.debug('Playlist list should be open, finding playlist...');

      // Find the playlist and check if it's already selected
      const playlistOption = this.page.locator(`[role="menuitem"][data-sentry-component="PlaylistItem"]:has-text("${playlistName}")`).first();

      const playlistExists = await playlistOption.count();
      if (playlistExists === 0) {
        throw new Error(`Playlist "${playlistName}" not found`);
      }

      // Check if song is already in the playlist
      const isAlreadyInPlaylist = await playlistOption.locator('svg[data-icon="circle-check"]').count() > 0;

      if (isAlreadyInPlaylist) {
        logger.info(`⊙ Song already in playlist "${playlistName}" - skipping`);

        // Close the menu by clicking outside of it
        logger.debug('Closing menu by clicking outside...');
        await this.page.mouse.click(50, 50);
        await this.page.waitForTimeout(300);

        return {
          success: true,
          songId,
          playlistName,
          alreadyInPlaylist: true
        };
      }

      // Song not in playlist yet, add it
      await playlistOption.click();
      await this.page.waitForTimeout(500);

      // Close the menu by clicking outside of it (in the margin area)
      logger.debug('Closing menu by clicking outside...');
      await this.page.mouse.click(50, 50); // Click in top-left margin area
      await this.page.waitForTimeout(300);

      logger.info(`✓ Added song to playlist "${playlistName}"`);

      return {
        success: true,
        songId,
        playlistName,
        alreadyInPlaylist: false
      };

    } catch (error) {
      logger.error(`Failed to add song ${songId} to playlist:`, error);
      return {
        success: false,
        songId,
        playlistName,
        error: error.message
      };
    }
  }

  /**
   * Add multiple songs to a playlist by ID range
   * @param {Array} songs - Array of song objects with { id, title }
   * @param {string} playlistName - Name of the playlist
   * @param {string} startId - Start song ID (inclusive)
   * @param {string} endId - End song ID (inclusive)
   */
  async addSongRangeToPlaylist(songs, playlistName, startId = null, endId = null) {
    const results = {
      successful: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };

    // Filter songs by ID range
    let songsToAdd = songs;
    let startIdx = 0; // Track the starting index in the original array

    if (startId || endId) {
      startIdx = startId ? songs.findIndex(s => s.id === startId) : 0;
      const endIdx = endId ? songs.findIndex(s => s.id === endId) : songs.length - 1;

      if (startId && startIdx === -1) {
        throw new Error(`Start song ID not found: ${startId}`);
      }
      if (endId && endIdx === -1) {
        throw new Error(`End song ID not found: ${endId}`);
      }

      songsToAdd = songs.slice(startIdx, endIdx + 1);
      logger.info(`Adding ${songsToAdd.length} songs (positions ${startIdx + 1}-${endIdx + 1}) to "${playlistName}"`);
    } else {
      logger.info(`Adding ${songsToAdd.length} songs to "${playlistName}"`);
    }

    results.total = songsToAdd.length;

    // Add each song
    for (let i = 0; i < songsToAdd.length; i++) {
      const song = songsToAdd[i];
      const progress = `[${i + 1}/${songsToAdd.length}]`;

      logger.info(`${progress} Adding: ${song.title}`);

      try {
        // Use startIdx + i to get the correct index in the original songs array
        const result = await this.addSongToPlaylist(song.id, playlistName, startIdx + i);

        if (result.success) {
          if (result.alreadyInPlaylist) {
            results.skipped++;
          } else {
            results.successful++;
          }
        } else {
          results.failed++;
          logger.error(`${progress} Failed: ${song.title}`);
        }

        // Small delay between songs to avoid rate limiting
        await this.page.waitForTimeout(500);

      } catch (error) {
        results.failed++;
        logger.error(`${progress} Exception: ${song.title}`, error);
      }
    }

    return results;
  }

  /**
   * Get list of available playlists
   */
  async getAvailablePlaylists() {
    try {
      logger.debug('Getting available playlists...');

      // Open menu on first song
      const songCard = this.page.locator(scraperConfig.selectors.songCard).first();
      await songCard.hover();
      await this.page.waitForTimeout(500);

      logger.debug('Hovered over song card');

      // Use the correct RiffOptionsMenu button selector
      const menuButton = songCard.locator('button[data-sentry-element="MenuTrigger"][data-sentry-source-file="RiffOptionsMenu.tsx"]').first();

      const buttonExists = await menuButton.count();
      if (buttonExists === 0) {
        logger.error('RiffOptionsMenu button not found');
        return [];
      }

      await menuButton.click();
      await this.page.waitForTimeout(2000);

      logger.debug('Opened menu');

      // Use keyboard navigation to avoid mouse path issues
      // Navigate to "Add to" (position 5, so press Down 5 times)
      logger.debug('Navigating to "Add to" with keyboard...');
      for (let i = 0; i < 5; i++) {
        await this.page.keyboard.press('ArrowDown');
        await this.page.waitForTimeout(200);
      }

      // Press Right to open "Add to" submenu
      logger.debug('Opening "Add to" submenu...');
      await this.page.keyboard.press('ArrowRight');
      await this.page.waitForTimeout(2000);

      // "Playlist" is the first item in the submenu, already selected
      // Press Right immediately to open Playlist submenu
      logger.debug('Opening Playlist submenu (first item)...');
      await this.page.keyboard.press('ArrowRight');
      await this.page.waitForTimeout(3000);

      logger.debug('Extracting playlist names...');

      // Get all playlist items
      const playlists = await this.page.evaluate(() => {
        const items = [];
        document.querySelectorAll('[role="menuitem"][data-sentry-component="PlaylistItem"]').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const textDiv = el.querySelector('.line-clamp-2');
            const name = textDiv?.textContent?.trim();
            if (name && name !== '+ Create Playlist') {
              items.push(name);
            }
          }
        });
        return items;
      });

      logger.debug(`Found ${playlists.length} playlists`);

      // Close menu
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);

      return playlists;

    } catch (error) {
      logger.error('Failed to get playlists:', error);

      // Try to close menu if still open
      try {
        await this.page.keyboard.press('Escape');
      } catch (e) {
        // Ignore
      }

      return [];
    }
  }
}

export default PlaylistManager;
