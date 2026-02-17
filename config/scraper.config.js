/**
 * Scraper Configuration
 * Settings for Producer.ai scraping behavior
 */

export const scraperConfig = {
  // Producer.ai URLs
  urls: {
    base: 'https://www.producer.ai',
    login: 'https://www.producer.ai/login',
    songs: 'https://www.producer.ai/library/my-songs',
    playlists: 'https://www.producer.ai/playlists'
  },

  // Selectors for Producer.ai elements (updated based on actual DOM structure)
  selectors: {
    // Authentication
    loginButton: 'button:has-text("Sign in")',
    userAvatar: '[data-testid="user-avatar"], .user-avatar, img[alt*="Profile"]',
    captcha: 'iframe[src*="recaptcha"], iframe[src*="captcha"], [class*="captcha"], #captcha',

    // Song list (ACTUAL SELECTORS FROM DOM INSPECTION)
    songCard: '.group.mb-1.flex.cursor-pointer',  // Main song container
    songImage: 'img.aspect-square.object-cover',   // Image contains title in alt attribute
    songTitle: 'img[alt]',                         // Title is in image alt text
    songLink: 'a[href*="/song/"]',                 // Link to song detail page
    duration: 'span.text-fg-2.w-8.text-xs.whitespace-nowrap', // Duration element
    playButton: 'button[aria-label*="Play"]',      // Play button
    loadMoreButton: 'button:has-text("Load More"), button:has-text("Show more")',

    // Song detail page - ACTUAL STRUCTURE
    // Step 1: Click three-dots menu (div with aria-haspopup="menu", contains ellipsis SVG)
    menuButton: 'div[aria-haspopup="menu"][data-sentry-element="MenuTrigger"], div[aria-haspopup="menu"]',

    // Step 2: Menu appears with: Remix, Details, Download, Share..., Add to..., Report
    // Click "Download" menu item
    downloadMenuItem: '[class*="flex w-full cursor-pointer items-center rounded-md"]:has-text("Download"), button:has-text("Download")',

    // Step 3: Click format in submenu (appears after clicking Download)
    downloadVideo: 'button:has-text("Download video"), [role="menuitem"]:has-text("Download video")',
    downloadStems: 'button:has-text("Get stems"), [role="menuitem"]:has-text("Get stems")',
    downloadMP3: 'button:has-text("MP3"), [role="menuitem"]:has-text("MP3")',
    downloadM4A: 'button:has-text("M4A"), [role="menuitem"]:has-text("M4A")',
    downloadWAV: 'button:has-text("WAV"), [role="menuitem"]:has-text("WAV")',

    // Note: Cover art needs to be extracted from page image source
    downloadCover: 'img.aspect-square.object-cover, img[alt*="song"], img[alt*="cover"]',
    lyricsSection: '[data-testid="lyrics"], .lyrics-container, div[class*="lyrics"]',
    metadataSection: '.song-metadata, .track-info, div[class*="metadata"]',

    // Metadata fields
    bpm: '[data-testid="bpm"], span:has-text("BPM")',
    key: '[data-testid="key"], span:has-text("Key")',
    genre: '[data-testid="genre"], span:has-text("Genre")',
    durationMeta: '[data-testid="duration"], span:has-text("Duration")',
    createdDate: '[data-testid="created"], span:has-text("Created")'
  },

  // Scraping behavior
  behavior: {
    // Delays (in milliseconds)
    delays: {
      betweenSongs: 2000,      // 2 seconds between processing songs
      afterScroll: 3000,       // 3 seconds after each scroll (allow lazy-load batch to render)
      afterClick: 1000,        // 1 second after clicking
      afterDownload: 3000,     // 3 seconds after initiating download
      navigationWait: 5000     // 5 seconds for page navigation
    },

    // Retry settings
    retries: {
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelay: 1000
    },

    // Infinite scroll
    infiniteScroll: {
      maxScrollAttempts: 50,
      scrollDistance: 1000,
      checkInterval: 2000,
      noNewContentThreshold: 10 // Stop after 10 checks with no new content (be patient with lazy load)
    },

    // Download settings
    downloads: {
      concurrent: 2,           // Number of concurrent downloads
      timeout: 120000,         // 2 minutes timeout per download
      verifyCompletion: true,  // Check if download completed
      formats: ['mp3', 'wav', 'm4a', 'stems'], // Supported primary download formats
      assets: ['cover', 'lyrics', 'metadata']
    }
  },

  // File organization
  fileOrganization: {
    outputDir: './output',
    structure: 'BY_SONG', // Options: BY_SONG, BY_PLAYLIST, BY_DATE

    // File naming patterns
    naming: {
      folder: '{songName}', // Can include {songId}, {playlist}, {date}
      audio: 'audio.{ext}',
      cover: 'cover.{ext}',
      lyrics: 'lyrics.txt',
      metadata: 'metadata.json'
    },

    // Sanitization rules
    sanitization: {
      maxLength: 255,
      replaceChars: {
        '/': '-',
        '\\': '-',
        ':': '-',
        '*': '',
        '?': '',
        '"': '',
        '<': '',
        '>': '',
        '|': '-'
      }
    }
  },

  // Metadata defaults
  metadata: {
    defaultArtist: 'Unknown Artist',  // Fallback artist if the page has no author
    defaultAlbum: 'Producer.AI Library', // Default album name (can be overridden per download)
    defaultYear: null,                // null = use current year
    includeOriginalUrl: true,         // Include Producer.AI URL in metadata
    includeLyrics: true,              // Include lyrics in MP3 tags
    includeCoverArt: true             // Embed cover art in MP3
  },

  // Progress tracking
  progress: {
    checkpointInterval: 10, // Save progress every 10 songs
    checkpointDir: './checkpoints',
    enableLogging: true,
    logLevel: 'info', // Options: error, warn, info, debug
    screenshotOnError: true
  },

  // Rate limiting
  rateLimiting: {
    enabled: true,
    requestsPerMinute: 30,
    burstSize: 5
  }
};

export default scraperConfig;
