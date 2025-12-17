/**
 * BlueHawk API Key Finder - Shared Constants
 *
 * Centralized configuration and constants used across the extension.
 */

// ========================================
// TOKEN SEVERITY CLASSIFICATION
// ========================================

/**
 * Severity levels for detected tokens
 * Used for prioritization and alerting
 */
export const SEVERITY_LEVELS = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
};

/**
 * Token types grouped by severity
 */
export const TOKEN_SEVERITY = {
  CRITICAL: [
    'AWS', 'GITHUB', 'STRIPE', 'PRIVATE_KEY', 'PASSWORD',
    'MONGODB', 'POSTGRES', 'MYSQL', 'ALIBABA', 'PAYPAL',
    'SQUARE', 'NPM', 'PYPI', 'DOCKER', 'SHOPIFY'
  ],
  HIGH: [
    'SUPABASE', 'FIREBASE', 'VERCEL', 'SENDGRID', 'TWILIO',
    'SLACK', 'SECRET', 'GITLAB', 'DISCORD', 'TELEGRAM',
    'MAILGUN', 'MAILCHIMP', 'SENDINBLUE', 'HUBSPOT',
    'POSTMAN', 'ATLASSIAN', 'NEWRELIC', 'DATADOG', 'DIGITALOCEAN'
  ],
  MEDIUM: [
    'JWT', 'API_KEY', 'TOKEN', 'BEARER', 'TWITTER', 'FACEBOOK',
    'GOOGLE', 'INSTAGRAM', 'HEROKU', 'AZURE', 'CLOUDFLARE'
  ],
  LOW: ['REDIS']
};

/**
 * Get severity level for a token type
 *
 * @param {string} tokenType - The token type
 * @returns {string} - Severity level
 */
export function getTokenSeverity(tokenType) {
  for (const [severity, types] of Object.entries(TOKEN_SEVERITY)) {
    if (types.includes(tokenType)) {
      return severity;
    }
  }
  return 'MEDIUM'; // Default
}

// ========================================
// DOMAIN FILTERS
// ========================================

/**
 * Social media and popular domains to skip during auto-scan
 * These sites generate too much noise and are rarely targets
 */
export const SOCIAL_MEDIA_DOMAINS = [
  // Major Social Networks
  'facebook.com', 'fb.com', 'fbcdn.net', 'facebook.net',
  'instagram.com', 'cdninstagram.com',
  'twitter.com', 'x.com', 't.co', 'twimg.com',
  'youtube.com', 'youtu.be', 'ytimg.com', 'googlevideo.com',
  'linkedin.com', 'licdn.com',
  'tiktok.com', 'tiktokcdn.com', 'tiktokv.com',
  'snapchat.com', 'snap.com',
  'reddit.com', 'redd.it', 'redditmedia.com',
  'pinterest.com', 'pinimg.com',
  'whatsapp.com', 'whatsapp.net',
  'telegram.org', 't.me',
  'discord.com', 'discord.gg', 'discordapp.com', 'discordapp.net',

  // Google Services (Analytics, Ads, etc) - Excluding googleapis.com for GCP scan
  'google-analytics.com', 'googletagmanager.com',
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
  'gstatic.com',

  // Microsoft Services
  'microsoft.com', 'live.com', 'outlook.com', 'office.com',
  'msn.com', 'bing.com', 'microsoftonline.com',

  // Tracking & Analytics
  'hotjar.com', 'hotjar.io',
  'clarity.ms', 'c.clarity.ms',
  'segment.com', 'segment.io',
  'mixpanel.com',
  'amplitude.com',
  'heap.io', 'heapanalytics.com',
  'fullstory.com',
  'intercom.io', 'intercom.com',
  'zendesk.com',

  // CDNs and Infrastructure Services
  'cloudflare.com', 'cloudflareinsights.com', 'cf-assets.com',
  'akamai.net', 'akamaihd.net',
  'fastly.net',
  'jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',

  // Ad Networks
  'adnxs.com',
  'adsafeprotected.com',
  'advertising.com',
  'criteo.com',
  'rubiconproject.com',

  // Other Common Platforms
  'medium.com',
  'wordpress.com', 'wp.com',
  'tumblr.com',
  'vimeo.com',
  'soundcloud.com',
  'spotify.com', 'scdn.co',
  'apple.com', 'icloud.com',

  // E-commerce and Shopping
  'amazon.com', 'amazon.com.br', 'amazon.co.uk', 'amazon.de', 'amazon.fr',
  'amazon.es', 'amazon.it', 'amazon.ca', 'amazon.co.jp', 'amazon.in',
  'ssl-images-amazon.com', 'media-amazon.com', 'amazonwebservices.com',
  'ebay.com', 'aliexpress.com', 'alibaba.com',
  'shopify.com', 'myshopify.com',
  'walmart.com', 'target.com'
];

/**
 * Known CDN domains - scripts from these are usually safe to skip
 */
export const KNOWN_CDNS = [
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
  'code.jquery.com',
  'ajax.googleapis.com',
  'cdn.ampproject.org',
  'stackpath.bootstrapcdn.com',
  'maxcdn.bootstrapcdn.com',
  'use.fontawesome.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'polyfill.io',
  'cdn.polyfill.io',
  'bundle.run',
  'esm.sh',
  'cdn.skypack.dev',
  'ga.jspm.io'
];

/**
 * Check if a URL belongs to a CDN
 *
 * @param {string} url - URL to check
 * @returns {boolean} - True if CDN
 */
export function isCDNUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return KNOWN_CDNS.some(cdn => hostname.includes(cdn));
  } catch {
    return false;
  }
}

/**
 * Check if a domain should be skipped for scanning
 *
 * @param {string} url - URL to check
 * @returns {boolean} - True if should skip
 */
export function shouldSkipDomain(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    for (const domain of SOCIAL_MEDIA_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Check if script URL is from same domain
 *
 * @param {string} scriptUrl - Script URL
 * @param {string} currentHostname - Current page hostname
 * @returns {boolean} - True if same domain
 */
export function isSameDomain(scriptUrl, currentHostname) {
  try {
    const url = new URL(scriptUrl);
    return url.hostname === currentHostname || url.hostname.endsWith('.' + currentHostname);
  } catch {
    return false;
  }
}

// ========================================
// CACHE CONFIGURATION
// ========================================

export const CACHE_CONFIG = {
  MAX_SIZE: 500,
  TTL: 3600000, // 1 hour in milliseconds
};

// ========================================
// SCAN CONFIGURATION
// ========================================

export const SCAN_CONFIG = {
  // Maximum external scripts to process
  MAX_EXTERNAL_SCRIPTS: 50,

  // Maximum script size in bytes (500KB)
  MAX_SCRIPT_SIZE: 524288,

  // Concurrent fetch limit
  CONCURRENT_FETCHES: 2,

  // Fetch timeout in milliseconds
  FETCH_TIMEOUT: 2000,

  // Delay between fetch batches
  BATCH_DELAY: 200,

  // Default auto-scan delay
  DEFAULT_SCAN_DELAY: 3000,

  // Minimum token length
  MIN_TOKEN_LENGTH: 10,
};

// ========================================
// VALIDATION CONFIGURATION
// ========================================

export const VALIDATION_CONFIG = {
  // Batch size for validation
  BATCH_SIZE: 3,

  // Delay between batches
  DELAY_BETWEEN_BATCHES: 2000,

  // Delay between individual validations
  DELAY_BETWEEN_VALIDATIONS: 1000,

  // Timeout for validation requests
  VALIDATION_TIMEOUT: 5000,
};

// ========================================
// WORKER CONFIGURATION
// ========================================

export const WORKER_CONFIG = {
  // Worker timeout in milliseconds
  TIMEOUT: 10000,

  // Chunk size for processing
  CHUNK_SIZE: 5,

  // Progress reporting interval
  PROGRESS_INTERVAL: 1000,
};

// ========================================
// ANALYSIS MODES
// ========================================

export const ANALYSIS_MODES = {
  SURGICAL: 'SURGICAL', // Same domain only
  FULL: 'FULL',         // All scripts
  DEEP: 'DEEP',         // Multi-page crawl
};

// ========================================
// CONFIDENCE LEVELS
// ========================================

export const CONFIDENCE_LEVELS = {
  DEFINITE_SECRET: 'DEFINITE_SECRET',
  LIKELY_SECRET: 'LIKELY_SECRET',
  UNCERTAIN: 'UNCERTAIN',
  LIKELY_FALSE_POSITIVE: 'LIKELY_FALSE_POSITIVE',
};

// ========================================
// TOKEN SOURCES
// ========================================

export const TOKEN_SOURCES = {
  STATIC: 'static',           // Found in static script analysis
  DYNAMIC: 'dynamic',         // Found via runtime interception
  NETWORK: 'network',         // Found in network request/response
  FRAMEWORK: 'framework',     // Found in React/Redux state
  WASM: 'wasm',              // Found in WebAssembly binary
  SOURCEMAP: 'sourcemap',    // Found in source map content
};

// ========================================
// VALIDATION STATUS
// ========================================

export const VALIDATION_STATUS = {
  VALID: 'valid',
  INVALID: 'invalid',
  UNKNOWN: 'unknown',
  ERROR: 'error',
  PENDING: 'pending',
};

// ========================================
// DEFAULT SETTINGS
// ========================================

export const DEFAULT_SETTINGS = {
  // Scanning
  autoScanEnabled: false,
  scanDelay: 3000,
  analysisDepth: 'deep',
  minTokenLength: 15,

  // Analysis Features
  featurePatterns: true,   // Always on
  featureEntropy: true,    // Default on
  featureAST: true,        // Default on
  featureML: false,        // Off by default

  // Filters
  skipSocialMediaScan: true,

  // Validation
  validateTokens: true,
  bucketTakeover: true,

  // Proxy
  proxyEnabled: false,
  proxyHost: '127.0.0.1',
  proxyPort: 8080,

  // Notifications
  notificationsEnabled: true,
  discordWebhookEnabled: false,
  discordWebhookUrl: '',

  // History
  saveHistory: true,
  maxHistory: 1000,

  // Export
  defaultExport: 'json'
};

// ========================================
// MESSAGE TYPES
// ========================================

export const MESSAGE_TYPES = {
  // Settings
  GET_SETTINGS: 'HAWK_GET_SETTINGS',
  SAVE_SETTINGS: 'HAWK_SAVE_SETTINGS',

  // Scanning
  START_SCAN: 'HAWK_START_SCAN',
  STOP_SCAN: 'HAWK_STOP_SCAN',
  SCAN_COMPLETE: 'HAWK_SCAN_COMPLETE',
  SCAN_PROGRESS: 'HAWK_SCAN_PROGRESS',

  // History
  GET_HISTORY: 'HAWK_GET_HISTORY',
  CLEAR_HISTORY: 'HAWK_CLEAR_HISTORY',

  // Notifications
  TEST_DISCORD_WEBHOOK: 'HAWK_TEST_DISCORD_WEBHOOK',

  // Results
  TOKEN_FOUND: 'HAWK_TOKEN_FOUND',
  RESULTS_UPDATE: 'HAWK_RESULTS_UPDATE'
};

// Default export for convenience
export default {
  SEVERITY_LEVELS,
  TOKEN_SEVERITY,
  getTokenSeverity,
  SOCIAL_MEDIA_DOMAINS,
  KNOWN_CDNS,
  isCDNUrl,
  shouldSkipDomain,
  isSameDomain,
  CACHE_CONFIG,
  SCAN_CONFIG,
  VALIDATION_CONFIG,
  WORKER_CONFIG,
  ANALYSIS_MODES,
  CONFIDENCE_LEVELS,
  TOKEN_SOURCES,
  VALIDATION_STATUS,
  DEFAULT_SETTINGS,
  MESSAGE_TYPES,
};
