#!/usr/bin/env node

/**
 * Test Connection to Producer.ai
 * Quick test to verify browser profile and page access
 */

import chalk from 'chalk';
import { chromium } from 'playwright';
import path from 'path';
import scraperConfig from '../config/scraper.config.js';

console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
console.log(chalk.cyan.bold('     Producer.ai Connection Test                  '));
console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

async function testConnection() {
  let context = null;

  try {
    const profilePath = path.resolve('./.browser-profile');
    console.log(chalk.yellow(`Loading profile: ${profilePath}\n`));

    // Launch browser with profile
    context = await chromium.launchPersistentContext(profilePath, {
      headless: false,
      viewport: { width: 1920, height: 1080 }
    });

    const page = context.pages()[0] || await context.newPage();

    // Navigate to songs page
    console.log(chalk.yellow('Navigating to Producer.ai...'));
    await page.goto(scraperConfig.urls.songs, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait for page to load a bit
    await page.waitForTimeout(5000);

    console.log(chalk.green('✓ Page loaded\n'));

    // Check for CAPTCHA
    console.log(chalk.yellow('Checking for CAPTCHA...'));
    const captchaExists = await page.locator(scraperConfig.selectors.captcha).count() > 0;

    if (captchaExists) {
      console.log(chalk.red('⚠ CAPTCHA detected - please solve it in the browser'));
      console.log(chalk.gray('Waiting 30 seconds...\n'));
      await page.waitForTimeout(30000);
    } else {
      console.log(chalk.green('✓ No CAPTCHA\n'));
    }

    // Check for login status
    console.log(chalk.yellow('Checking login status...'));
    const userAvatar = await page.locator(scraperConfig.selectors.userAvatar).count();

    if (userAvatar > 0) {
      console.log(chalk.green('✓ Logged in!\n'));
    } else {
      console.log(chalk.yellow('⚠ Not logged in or avatar not found\n'));
    }

    // Try to find song cards
    console.log(chalk.yellow('Looking for songs on page...'));
    await page.waitForTimeout(3000);

    const songCards = await page.locator(scraperConfig.selectors.songCard).count();
    console.log(chalk.green(`✓ Found ${songCards} song card elements\n`));

    if (songCards === 0) {
      console.log(chalk.yellow('No song cards found. Let me try different selectors...'));

      // Try alternative selectors
      const alternatives = [
        'div[class*="song"]',
        'div[class*="track"]',
        'article',
        '[role="article"]',
        '.card'
      ];

      for (const selector of alternatives) {
        const count = await page.locator(selector).count();
        console.log(chalk.gray(`  ${selector}: ${count} elements`));
      }

      // Take screenshot for inspection
      await page.screenshot({
        path: 'logs/page-inspection.png',
        fullPage: true
      });

      console.log(chalk.cyan('\n📷 Screenshot saved to logs/page-inspection.png'));
      console.log(chalk.yellow('Please check the screenshot to identify song card elements.\n'));
    }

    // Get page title
    const title = await page.title();
    console.log(chalk.gray(`Page title: ${title}\n`));

    // Get URL
    const url = page.url();
    console.log(chalk.gray(`Current URL: ${url}\n`));

    console.log(chalk.cyan('═══════════════════════════════════════════════════'));
    console.log(chalk.green('✓ Connection test complete!'));
    console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

    console.log(chalk.white('The browser will stay open for 10 seconds for you to inspect.'));
    console.log(chalk.gray('Press Ctrl+C to exit early.\n'));

    await page.waitForTimeout(10000);

  } catch (error) {
    console.error(chalk.red('\n✗ Error:'), error.message);
    process.exit(1);
  } finally {
    if (context) {
      await context.close();
    }
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log(chalk.cyan('\n\nExiting...\n'));
  process.exit(0);
});

testConnection();