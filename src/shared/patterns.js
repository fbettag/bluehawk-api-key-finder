/**
 * BlueHawk API Key Finder - Token Detection Patterns
 *
 * Comprehensive token detection patterns organized by provider.
 * Based on security research and real-world credential formats.
 *
 * Pattern Categories:
 * - Cloud Infrastructure (AWS, GCP, Azure, etc.)
 * - DevOps & Source Control (GitHub, GitLab, npm, etc.)
 * - Payment Gateways (Stripe, Square, PayPal)
 * - Communication (Slack, Twilio, Discord, etc.)
 * - Email Services (SendGrid, Mailgun, etc.)
 * - SaaS & Marketing (Shopify, HubSpot, etc.)
 * - Databases (MongoDB, PostgreSQL, MySQL, Redis)
 * - Generic Patterns (JWT, Bearer, API_KEY, etc.)
 * - Cryptographic Material (Private Keys)
 */

// ========================================
// CLOUD INFRASTRUCTURE (Critical Severity)
// ========================================

const AWS_PATTERNS = [
  // Access Key ID (AKIA = long-term, ASIA = temporary STS)
  /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
  // Secret Access Key (40-char base64)
  /['"](aws[_-]?secret[_-]?access[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9\/+=]{40})['"]/gi,
  // Session Token
  /['"](aws[_-]?session[_-]?token)['"]\s*[:=]\s*['"]([a-zA-Z0-9\/+=]{100,})['"]/gi,
  // MWS Key
  /amzn\.mws\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
];

const GOOGLE_PATTERNS = [
  // API Key (AIza prefix is highly specific)
  /AIza[0-9A-Za-z\-_]{35}/g,
  // OAuth Access Token
  /ya29\.[0-9A-Za-z\-_]+/g,
  // Service Account JSON marker
  /"type":\s*"service_account"/g,
  // Generic Google API key pattern
  /['"](google[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{39})['"]/gi,
];

const FIREBASE_PATTERNS = [
  /AIzaSy[a-zA-Z0-9_\-]{33}/g,
  /['"](firebase[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{39})['"]/gi,
];

const ALIBABA_PATTERNS = [
  /LTAI[a-zA-Z0-9]{20}/g,
  /['"](alibaba[_-]?(?:access[_-]?key|secret))['"]\s*[:=]\s*['"]([a-zA-Z0-9]{30})['"]/gi,
];

const AZURE_PATTERNS = [
  // Storage Account Key (88-char base64 ending in ==)
  /[a-zA-Z0-9+\/]{86}==/g,
  /['"](azure[_-]?(?:storage[_-]?key|connection[_-]?string))['"]\s*[:=]\s*['"]([a-zA-Z0-9+\/=]{88,})['"]/gi,
];

const DIGITALOCEAN_PATTERNS = [
  /dop_v1_[a-f0-9]{64}/g,
  /doo_v1_[a-f0-9]{64}/g,
  /['"](digitalocean[_-]?(?:token|access[_-]?token))['"]\s*[:=]\s*['"]([a-zA-Z0-9]{64})['"]/gi,
];

// ========================================
// DEVOPS & SOURCE CONTROL (Critical)
// ========================================

const GITHUB_PATTERNS = [
  // Classic PAT (ghp_)
  /ghp_[a-zA-Z0-9]{36}/g,
  // Fine-Grained PAT
  /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g,
  // OAuth Token
  /gho_[a-zA-Z0-9]{36}/g,
  // Refresh Token
  /ghr_[a-zA-Z0-9]{36}/g,
  // Server-to-Server Token
  /ghs_[a-zA-Z0-9]{36}/g,
  // User-to-Server Token
  /ghu_[a-zA-Z0-9]{36}/g,
];

const GITLAB_PATTERNS = [
  /glpat-[0-9a-zA-Z\-_]{20}/g,
  /['"](gitlab[_-]?token)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{20,})['"]/gi,
];

const NPM_PATTERNS = [
  /npm_[a-z0-9]{36}/g,
  /['"](npm[_-]?token)['"]\s*[:=]\s*['"]([a-zA-Z0-9\-]{36,})['"]/gi,
];

const PYPI_PATTERNS = [
  /pypi-AgEIcHlwaS5vcmc[A-Za-z0-9\-_]{50,}/g,
];

const DOCKER_PATTERNS = [
  /dckr_pat_[a-zA-Z0-9_\-]{27}/g,
  /['"](docker[_-]?(?:token|password))['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{20,})['"]/gi,
];

const HEROKU_PATTERNS = [
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
  /['"](heroku[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9\-]{36})['"]/gi,
];

const VERCEL_PATTERNS = [
  /vercel_[a-zA-Z0-9]{24,}/g,
  /['"](vercel[_-]?token)['"]\s*[:=]\s*['"]([a-zA-Z0-9_]{24,})['"]/gi,
];

// ========================================
// PAYMENT GATEWAYS (Critical)
// ========================================

const STRIPE_PATTERNS = [
  // Live Secret Key (most critical)
  /sk_live_[0-9a-zA-Z]{24,}/g,
  // Restricted Key
  /rk_live_[0-9a-zA-Z]{24,99}/g,
  // Test Secret Key
  /sk_test_[0-9a-zA-Z]{24,}/g,
  // Publishable Key (less critical but useful for mapping)
  /pk_live_[0-9a-zA-Z]{24}/g,
  /pk_test_[0-9a-zA-Z]{24}/g,
];

const SQUARE_PATTERNS = [
  /sq0atp-[0-9A-Za-z\-_]{22}/g,
  /sq0csp-[0-9A-Za-z\-_]{43}/g,
];

const PAYPAL_PATTERNS = [
  /access_token\$production\$[0-9a-z]{16}\$[0-9a-f]{32}/g,
  /['"](paypal[_-]?(?:client[_-]?secret|access[_-]?token))['"]\s*[:=]\s*['"]([a-zA-Z0-9\-_]{20,})['"]/gi,
];

// ========================================
// COMMUNICATION PLATFORMS (High)
// ========================================

const SLACK_PATTERNS = [
  // Bot Token
  /xoxb-[0-9]{10,12}-[0-9]{10,12}-[a-zA-Z0-9]{24}/g,
  // User Token
  /xoxp-[0-9]{10,12}-[0-9]{10,12}-[0-9]{10,12}-[a-f0-9]{32}/g,
  // App Token
  /xapp-[0-9]{1}-[A-Z0-9]{10,12}-[0-9]{13}-[a-zA-Z0-9]{64}/g,
  // Configuration Token
  /xoxe-[0-9]{1}-[a-zA-Z0-9]{146}/g,
  // Webhook URL
  /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]{8,10}\/B[a-zA-Z0-9_]{8,12}\/[a-zA-Z0-9_]{24}/g,
];

const TWILIO_PATTERNS = [
  // API Key SID
  /SK[0-9a-fA-F]{32}/g,
  // Account SID
  /AC[a-f0-9]{32}/g,
  /['"](twilio[_-]?(?:auth[_-]?token|account[_-]?sid))['"]\s*[:=]\s*['"]([a-z0-9]{32})['"]/gi,
];

const TELEGRAM_PATTERNS = [
  /[0-9]{8,10}:[a-zA-Z0-9_-]{35}/g,
];

const DISCORD_PATTERNS = [
  // Bot Token (starts with M, N, or O based on epoch encoding)
  /[MNO][a-zA-Z\d_-]{23,25}\.[a-zA-Z\d_-]{6}\.[a-zA-Z\d_-]{27}/g,
  // Webhook URL
  /https:\/\/discord(?:app)?\.com\/api\/webhooks\/[0-9]{17,19}\/[a-zA-Z0-9_-]{60,68}/g,
];

// ========================================
// EMAIL SERVICES (High)
// ========================================

const SENDGRID_PATTERNS = [
  /SG\.[a-zA-Z0-9_\-]{22}\.[a-zA-Z0-9_\-]{43}/g,
  /['"](sendgrid[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{60,})['"]/gi,
];

const MAILGUN_PATTERNS = [
  /key-[0-9a-zA-Z]{32}/g,
  /['"](mailgun[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9]{32,})['"]/gi,
];

const MAILCHIMP_PATTERNS = [
  /[0-9a-f]{32}-us[0-9]{1,2}/g,
];

const SENDINBLUE_PATTERNS = [
  /xkeysib-[a-f0-9]{64}-[a-z0-9]{16}/g,
];

// ========================================
// SAAS & MARKETING (High)
// ========================================

const SHOPIFY_PATTERNS = [
  /shppa_[a-fA-F0-9]{32}/g,
  /shpat_[a-fA-F0-9]{32}/g,
  /shpca_[a-fA-F0-9]{32}/g,
  /shpss_[a-fA-F0-9]{32}/g,
];

const HUBSPOT_PATTERNS = [
  /pat-na1-[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/g,
  /hapikey=[a-z0-9-]{36}/g,
];

const POSTMAN_PATTERNS = [
  /PMAK-[a-f0-9]{24}-[a-f0-9]{34}/g,
];

const ATLASSIAN_PATTERNS = [
  /ATATT3xFfGF0[a-zA-Z0-9\-+=]{20,}/g,
];

// ========================================
// OBSERVABILITY & MONITORING (High)
// ========================================

const NEWRELIC_PATTERNS = [
  /NRAK-[A-Za-z0-9]{27}/g,
  /NRII-[A-Za-z0-9]{27}/g,
];

const DATADOG_PATTERNS = [
  /dd_api_key\s*[:=]\s*['"]?[a-f0-9]{32}['"]?/gi,
  /['"](datadog[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([a-f0-9]{32})['"]/gi,
];

const SUPABASE_PATTERNS = [
  /['"](supabase[_-]?(?:key|anon[_-]?key|service[_-]?role[_-]?key))['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{100,})['"]/gi,
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, // Supabase uses JWTs
];

// ========================================
// SOCIAL MEDIA (Medium)
// ========================================

const FACEBOOK_PATTERNS = [
  /EAACEdEose0cBA[0-9A-Za-z]+/g,
  /['"](facebook[_-]?(?:app[_-]?secret|access[_-]?token))['"]\s*[:=]\s*['"]([a-z0-9]{32,})['"]/gi,
];

const TWITTER_PATTERNS = [
  /[1-9][0-9]+-[0-9a-zA-Z]{40}/g,
  /['"](twitter[_-]?(?:api[_-]?key|consumer[_-]?key|bearer))['"]\s*[:=]\s*['"]([a-zA-Z0-9%\-_]{25,})['"]/gi,
];

const INSTAGRAM_PATTERNS = [
  /[0-9a-fA-F]{7}\.[0-9a-fA-F]{32}/g,
];

// ========================================
// DATABASES (Critical)
// ========================================

const MONGODB_PATTERNS = [
  /mongodb(\+srv)?:\/\/[a-zA-Z0-9_\-]+:[a-zA-Z0-9_\-!@#$%^&*()]+@[a-zA-Z0-9\-\.\/:?=&]+/gi,
  /['"](mongo(?:db)?[_-]?(?:uri|url|connection[_-]?string))['"]\s*[:=]\s*['"](mongodb[^'"]+)['"]/gi,
];

const POSTGRES_PATTERNS = [
  /postgres(?:ql)?:\/\/[a-zA-Z0-9_\-]+:[a-zA-Z0-9_\-!@#$%^&*()]+@[a-zA-Z0-9\-\.\/:?=&]+/gi,
  /['"](postgres(?:ql)?[_-]?(?:uri|url|connection[_-]?string))['"]\s*[:=]\s*['"](postgres[^'"]+)['"]/gi,
];

const MYSQL_PATTERNS = [
  /mysql:\/\/[a-zA-Z0-9_\-]+:[a-zA-Z0-9_\-!@#$%^&*()]+@[a-zA-Z0-9\-\.\/:?=&]+/gi,
  /['"](mysql[_-]?(?:uri|url|connection[_-]?string))['"]\s*[:=]\s*['"](mysql[^'"]+)['"]/gi,
];

const REDIS_PATTERNS = [
  /redis:\/\/[a-zA-Z0-9_\-]*:?[a-zA-Z0-9_\-!@#$%^&*()]*@[a-zA-Z0-9\-\.\/:?=&]+/gi,
  /['"](redis[_-]?(?:uri|url|password))['"]\s*[:=]\s*['"](redis[^'"]+)['"]/gi,
];

// ========================================
// GENERIC PATTERNS (Medium)
// ========================================

const JWT_PATTERNS = [
  /ey[A-Za-z0-9-_=]+\.ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+\/=]*/g,
];

const BEARER_PATTERNS = [
  /Bearer\s+[a-zA-Z0-9\-._~+\/]+/g,
];

const API_KEY_PATTERNS = [
  /['"](api[_-]?key|apikey)['"]\s*[:=]\s*['"]([A-Za-z0-9_\-]{24,})['"]/gi,
  /['"](x[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([A-Za-z0-9_\-]{24,})['"]/gi,
];

const SECRET_PATTERNS = [
  /['"](secret[_-]?key|client[_-]?secret|app[_-]?secret)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{20,})['"]/gi,
];

const TOKEN_PATTERNS_GENERIC = [
  /['"](auth[_-]?token|access[_-]?token|api[_-]?token)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{20,})['"]/gi,
];

const PASSWORD_PATTERNS = [
  /['"](password|passwd|pwd|db[_-]?password)['"]\s*[:=]\s*['"]([^'"]{8,})['"]/gi,
];

const CLOUDFLARE_PATTERNS = [
  /['"](cloudflare[_-]?api[_-]?(?:key|token))['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{37,})['"]/gi,
];

// ========================================
// CRYPTOGRAPHIC MATERIAL (Critical)
// ========================================

const PRIVATE_KEY_PATTERNS = [
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
  /-----BEGIN\s+EC\s+PRIVATE\s+KEY-----/g,
  /-----BEGIN\s+DSA\s+PRIVATE\s+KEY-----/g,
  /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----/g,
  /-----BEGIN\s+PGP\s+PRIVATE\s+KEY\s+BLOCK-----/g,
];

// ========================================
// COMBINED TOKEN PATTERNS OBJECT
// ========================================

export const TOKEN_PATTERNS = {
  // Cloud Infrastructure
  AWS: AWS_PATTERNS,
  GOOGLE: GOOGLE_PATTERNS,
  FIREBASE: FIREBASE_PATTERNS,
  ALIBABA: ALIBABA_PATTERNS,
  AZURE: AZURE_PATTERNS,
  DIGITALOCEAN: DIGITALOCEAN_PATTERNS,

  // DevOps & Source Control
  GITHUB: GITHUB_PATTERNS,
  GITLAB: GITLAB_PATTERNS,
  NPM: NPM_PATTERNS,
  PYPI: PYPI_PATTERNS,
  DOCKER: DOCKER_PATTERNS,
  HEROKU: HEROKU_PATTERNS,
  VERCEL: VERCEL_PATTERNS,

  // Payment Gateways
  STRIPE: STRIPE_PATTERNS,
  SQUARE: SQUARE_PATTERNS,
  PAYPAL: PAYPAL_PATTERNS,

  // Communication
  SLACK: SLACK_PATTERNS,
  TWILIO: TWILIO_PATTERNS,
  TELEGRAM: TELEGRAM_PATTERNS,
  DISCORD: DISCORD_PATTERNS,

  // Email Services
  SENDGRID: SENDGRID_PATTERNS,
  MAILGUN: MAILGUN_PATTERNS,
  MAILCHIMP: MAILCHIMP_PATTERNS,
  SENDINBLUE: SENDINBLUE_PATTERNS,

  // SaaS & Marketing
  SHOPIFY: SHOPIFY_PATTERNS,
  HUBSPOT: HUBSPOT_PATTERNS,
  POSTMAN: POSTMAN_PATTERNS,
  ATLASSIAN: ATLASSIAN_PATTERNS,

  // Observability
  NEWRELIC: NEWRELIC_PATTERNS,
  DATADOG: DATADOG_PATTERNS,
  SUPABASE: SUPABASE_PATTERNS,

  // Social Media
  FACEBOOK: FACEBOOK_PATTERNS,
  TWITTER: TWITTER_PATTERNS,
  INSTAGRAM: INSTAGRAM_PATTERNS,

  // Databases
  MONGODB: MONGODB_PATTERNS,
  POSTGRES: POSTGRES_PATTERNS,
  MYSQL: MYSQL_PATTERNS,
  REDIS: REDIS_PATTERNS,

  // Generic
  JWT: JWT_PATTERNS,
  BEARER: BEARER_PATTERNS,
  API_KEY: API_KEY_PATTERNS,
  SECRET: SECRET_PATTERNS,
  TOKEN: TOKEN_PATTERNS_GENERIC,
  PASSWORD: PASSWORD_PATTERNS,
  CLOUDFLARE: CLOUDFLARE_PATTERNS,

  // Cryptographic
  PRIVATE_KEY: PRIVATE_KEY_PATTERNS,
};

// ========================================
// API ENDPOINT PATTERNS
// ========================================

export const API_ENDPOINT_PATTERNS = [
  // REST API endpoints
  /['"]https?:\/\/[a-z0-9.-]+\/api\/[a-z0-9/_-]+['"]/gi,
  /['"]\/api\/v?\d*\/[a-z0-9/_-]+['"]/gi,

  // GraphQL endpoints
  /['"]https?:\/\/[a-z0-9.-]+\/graphql['"]/gi,
  /['"]\/graphql['"]/gi,

  // Webhooks
  /['"]https?:\/\/[a-z0-9.-]+\/webhooks?\/[a-z0-9/_-]+['"]/gi,

  // Admin/Internal endpoints
  /['"]https?:\/\/[a-z0-9.-]+\/(?:admin|internal|private)\/[a-z0-9/_-]+['"]/gi,

  // Database connections
  /['"]https?:\/\/[a-z0-9.-]+:[0-9]{4,5}\/['"]/gi,
];

// ========================================
// PATTERN METADATA
// ========================================

/**
 * Metadata for each pattern type including expected characteristics
 * Used for validation and entropy threshold adjustment
 */
export const PATTERN_METADATA = {
  AWS: {
    category: 'cloud',
    expectedCharset: 'alphanumeric',
    minLength: 16,
    maxLength: 128,
    entropyThreshold: 3.5,
  },
  GITHUB: {
    category: 'devops',
    expectedCharset: 'alphanumeric',
    minLength: 36,
    maxLength: 100,
    entropyThreshold: 4.0,
  },
  STRIPE: {
    category: 'payment',
    expectedCharset: 'alphanumeric',
    minLength: 24,
    maxLength: 128,
    entropyThreshold: 4.0,
  },
  JWT: {
    category: 'generic',
    expectedCharset: 'base64url',
    minLength: 50,
    maxLength: 2000,
    entropyThreshold: 4.5,
  },
  PRIVATE_KEY: {
    category: 'crypto',
    expectedCharset: 'base64',
    minLength: 100,
    maxLength: 10000,
    entropyThreshold: 5.0,
  },
  // Add more as needed...
};

/**
 * Get all pattern types as an array
 */
export function getPatternTypes() {
  return Object.keys(TOKEN_PATTERNS);
}

/**
 * Get patterns for a specific type
 */
export function getPatternsForType(type) {
  return TOKEN_PATTERNS[type] || [];
}

/**
 * Get total number of patterns
 */
export function getTotalPatternCount() {
  return Object.values(TOKEN_PATTERNS).reduce((sum, patterns) => sum + patterns.length, 0);
}

// Default export for convenience
export default TOKEN_PATTERNS;
