/**
 * BlueHawk API Key Finder - False Positive Filters
 *
 * Comprehensive false positive detection to reduce noise in scan results.
 * Includes patterns for social media URLs, placeholders, and common non-secrets.
 */

// ========================================
// FALSE POSITIVE PATTERNS
// ========================================

export const FALSE_POSITIVE_PATTERNS = {
  // URLs de redes sociais
  SOCIAL_URLS: [
    /https?:\/\/(www\.)?instagram\.com/gi,
    /https?:\/\/(www\.)?facebook\.com/gi,
    /https?:\/\/(www\.)?twitter\.com/gi,
    /https?:\/\/(www\.)?linkedin\.com/gi,
    /https?:\/\/(www\.)?youtube\.com/gi,
    /instagram\.com\/[a-zA-Z0-9_\.]+/gi,
    /facebook\.com\/[a-zA-Z0-9_\.]+/gi,
  ],

  // Common service URLs do Google (Gmail, Drive, Maps, etc)
  GOOGLE_COMMON_URLS: [
    /https?:\/\/(www\.)?mail\.google\.com/gi,
    /https?:\/\/(www\.)?gmail\.com/gi,
    /https?:\/\/(www\.)?drive\.google\.com/gi,
    /https?:\/\/(www\.)?docs\.google\.com/gi,
    /https?:\/\/(www\.)?sheets\.google\.com/gi,
    /https?:\/\/(www\.)?slides\.google\.com/gi,
    /https?:\/\/(www\.)?forms\.google\.com/gi,
    /https?:\/\/(www\.)?calendar\.google\.com/gi,
    /https?:\/\/(www\.)?meet\.google\.com/gi,
    /https?:\/\/(www\.)?chat\.google\.com/gi,
    /https?:\/\/(www\.)?maps\.google\.com/gi,
    /https?:\/\/(www\.)?accounts\.google\.com/gi,
    /https?:\/\/(www\.)?myaccount\.google\.com/gi,
    /https?:\/\/(www\.)?photos\.google\.com/gi,
    /https?:\/\/(www\.)?contacts\.google\.com/gi,
    /https?:\/\/(www\.)?keep\.google\.com/gi,
    /https?:\/\/(www\.)?translate\.google\.com/gi,
    /https?:\/\/(www\.)?news\.google\.com/gi,
    /https?:\/\/(www\.)?play\.google\.com/gi,
    /mail\.google\.com\/mail\/u\/\d+/gi,
    /fonts\.googleapis\.com/gi,
    /fonts\.gstatic\.com/gi,
    /maps\.googleapis\.com\/maps/gi,
  ],

  // Post/profile IDs do Instagram/Facebook (are not secrets)
  SOCIAL_IDS: [
    /instagram.*['"]([0-9]{10,20})['"]/gi,
    /facebook.*['"]([0-9]{10,20})['"]/gi,
    /fb.*['"]([0-9]{10,20})['"]/gi,
    /ig.*['"]([0-9]{10,20})['"]/gi,
  ],

  // Placeholders e exemplos
  PLACEHOLDERS: [
    /['"]?YOUR[_-]?(API|KEY|TOKEN|SECRET)['"]/gi,
    /['"]?(EXAMPLE|SAMPLE|TEST|DEMO)[_-]?(KEY|TOKEN)['"]/gi,
    /['"]?xxx+['"]/gi,
    /['"]?000+['"]/gi,
    /['"]?123456+['"]/gi,
  ],

  // Valores vazios ou muito curtos
  EMPTY_VALUES: [
    /['"]\s*['"]/g,
    /['"]{1,10}['"]/g,
  ],

  // Common navigation URLs (not credentials)
  NAVIGATION_URLS: [
    /\/(inbox|sent|drafts|trash|spam|folders)/gi,
    /\/(home|dashboard|settings|profile)/gi,
    /\/(login|logout|signin|signout)/gi,
    /\/(about|help|support|faq|contact)/gi,
    /\?q=/gi,
    /\/search\?/gi,
  ]
};

// ========================================
// FEATURE FLAG WORDS
// ========================================

/**
 * Common words found in feature flags and configuration names
 * Values containing these words are likely false positives
 */
export const FEATURE_FLAG_WORDS = [
  'default', 'feature', 'config', 'setting', 'option', 'enable', 'disable',
  'flag', 'toggle', 'badge', 'card', 'sidebar', 'upsell', 'trial', 'support',
  'verified', 'verification', 'impressions', 'home', 'threads', 'drafts',
  'progress', 'ended', 'quick', 'free', 'premium', 'subscription',
  'view', 'column', 'permissions', 'tracking', 'planner', 'workload',
  'filters', 'workspace', 'account', 'milestone', 'timeline', 'profile',
  'custom', 'fields', 'board', 'item', 'advanced', 'capabilities'
];

// ========================================
// COMMON EXAMPLE STRINGS
// ========================================

/**
 * Common example/placeholder strings found in documentation
 */
export const COMMON_EXAMPLES = [
  'sk_test_', 'pk_test_', 'example', 'sample', 'demo', 'test',
  'your_api_key', 'your_token', 'insert_key_here', 'placeholder',
  'xxx', 'abc123', 'changeme', 'secret123', 'password123'
];

// ========================================
// COMMON WORDS FOR SNAKE_CASE CHECK
// ========================================

/**
 * Common English words that appear in snake_case variable names
 * If all parts of a snake_case string are common words, it's likely a variable name
 */
export const COMMON_WORDS = [
  'view', 'column', 'permissions', 'tracking', 'planner', 'workload',
  'filters', 'workspace', 'account', 'milestone', 'timeline', 'profile',
  'custom', 'fields', 'board', 'item', 'advanced', 'capabilities',
  'resource', 'projects', 'time', 'viewing', 'full', 'user', 'progress',
  'in', 'on', 'at', 'from', 'to', 'with', 'and', 'or', 'for', 'the',
  'data', 'list', 'info', 'name', 'type', 'value', 'key', 'id', 'url',
  'path', 'file', 'mode', 'state', 'status', 'count', 'total', 'max',
  'min', 'size', 'length', 'width', 'height', 'color', 'text', 'title'
];

// ========================================
// MAIN FALSE POSITIVE CHECK FUNCTION
// ========================================

/**
 * Check if a detected value is likely a false positive
 *
 * @param {string} value - The detected token value
 * @param {string} context - Surrounding context (100 chars before and after)
 * @param {Object} options - Additional options for filtering
 * @returns {boolean} - True if likely a false positive
 */
export function isFalsePositive(value, context, options = {}) {
  const {
    minLength = 12,
    checkFeatureFlags = true,
    checkCommonExamples = true,
    checkCharacterComposition = true,
    checkSnakeCaseWords = true,
  } = options;

  // Check if contains social media URLs
  for (const regex of FALSE_POSITIVE_PATTERNS.SOCIAL_URLS) {
    if (regex.test(context) || regex.test(value)) {
      return true;
    }
  }

  // Check if contains common Google service URLs
  for (const regex of FALSE_POSITIVE_PATTERNS.GOOGLE_COMMON_URLS) {
    if (regex.test(context) || regex.test(value)) {
      return true;
    }
  }

  // Check common navigation URLs
  for (const regex of FALSE_POSITIVE_PATTERNS.NAVIGATION_URLS) {
    if (regex.test(context) || regex.test(value)) {
      return true;
    }
  }

  // Verificar IDs de redes sociais
  for (const regex of FALSE_POSITIVE_PATTERNS.SOCIAL_IDS) {
    if (regex.test(context)) {
      return true;
    }
  }

  // Verificar placeholders
  for (const regex of FALSE_POSITIVE_PATTERNS.PLACEHOLDERS) {
    if (regex.test(value) || regex.test(context)) {
      return true;
    }
  }

  // Check if is too short or empty
  if (value.length < minLength || /^[0]{8,}$/.test(value) || /^[x]{8,}$/i.test(value)) {
    return true;
  }

  // Check if contains only lowercase letters and underscores (feature flags, configs)
  if (/^[a-z_]+$/.test(value)) {
    return true;
  }

  // Check if looks like feature name/config (common pattern: word_word_number)
  if (/^[a-z]+(_[a-z0-9]+){1,5}$/.test(value)) {
    return true;
  }

  // Check patterns very common feature flag e configs
  if (/^[a-z]+(_[a-z]+){2,}$/.test(value)) {
    return true;
  }

  // Check if contains common feature words/configs
  if (checkFeatureFlags) {
    const lowerValue = value.toLowerCase();
    let featureWordCount = 0;
    for (const word of FEATURE_FLAG_WORDS) {
      if (lowerValue.includes(word)) {
        featureWordCount++;
      }
    }

    // If contains 1 or more feature words, probably is false positive
    if (featureWordCount >= 1) {
      return true;
    }
  }

  // Check if is a common example
  if (checkCommonExamples) {
    const lowerValue = value.toLowerCase();
    for (const example of COMMON_EXAMPLES) {
      if (lowerValue.includes(example)) {
        return true;
      }
    }
  }

  // Check character composition
  if (checkCharacterComposition) {
    // Check if doesn't contain special chars ou números (tokens reais geralmente têm)
    if (!/[A-Z0-9\-_\.\/+=]/.test(value) && value.length < 40) {
      return true;
    }

    // Verificar padrão de camelCase ou snake_case sem números (geralmente são nomes de variáveis)
    if (/^[a-z][a-zA-Z]*$/.test(value) || /^[a-z]+(_[a-z]+)+$/.test(value)) {
      return true;
    }

    // Real tokens usually contain mixed characters (maiúsculas + minúsculas + números)
    const hasUpperCase = /[A-Z]/.test(value);
    const hasNumbers = /[0-9]/.test(value);
    const hasSpecialChars = /[\.\-\/\+=]/.test(value);

    // If no uppercase AND no numbers AND no special chars, is false positive
    if (!hasUpperCase && !hasNumbers && !hasSpecialChars) {
      return true;
    }
  }

  // Check snake_case words
  if (checkSnakeCaseWords) {
    const parts = value.toLowerCase().split('_');
    const allPartsAreCommonWords = parts.every(part =>
      part.length <= 3 || COMMON_WORDS.includes(part)
    );

    if (allPartsAreCommonWords && parts.length >= 2) {
      return true;
    }
  }

  return false;
}

/**
 * Quick check for obvious false positives (faster than full check)
 * Use this for initial filtering before detailed analysis
 *
 * @param {string} value - The detected token value
 * @returns {boolean} - True if obviously a false positive
 */
export function isObviousFalsePositive(value) {
  // Too short
  if (value.length < 10) return true;

  // All zeros or X's
  if (/^[0]{6,}$/.test(value) || /^[x]{6,}$/i.test(value)) return true;

  // Only lowercase and underscores
  if (/^[a-z_]+$/.test(value)) return true;

  // Common placeholder patterns
  if (/^(your|my|the|a)_/i.test(value)) return true;
  if (/_here$/i.test(value)) return true;
  if (/^(test|demo|example|sample)/i.test(value)) return true;

  return false;
}

/**
 * Check if a value matches known hash patterns (SHA, MD5, etc.)
 * These are often false positives but may need special handling
 *
 * @param {string} value - The value to check
 * @returns {object|null} - Hash type info or null if not a hash
 */
export function detectHashPattern(value) {
  // MD5 - 32 hex chars
  if (/^[a-f0-9]{32}$/i.test(value)) {
    return { type: 'MD5', length: 32, confidence: 'medium' };
  }

  // SHA1 - 40 hex chars
  if (/^[a-f0-9]{40}$/i.test(value)) {
    return { type: 'SHA1', length: 40, confidence: 'medium' };
  }

  // SHA256 - 64 hex chars
  if (/^[a-f0-9]{64}$/i.test(value)) {
    return { type: 'SHA256', length: 64, confidence: 'high' };
  }

  // SHA512 - 128 hex chars
  if (/^[a-f0-9]{128}$/i.test(value)) {
    return { type: 'SHA512', length: 128, confidence: 'high' };
  }

  // UUID pattern (often found but not a secret)
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) {
    return { type: 'UUID', length: 36, confidence: 'high' };
  }

  return null;
}

/**
 * Check if context suggests this is likely a secret variable
 *
 * @param {string} context - Surrounding code context
 * @returns {boolean} - True if context suggests this is a secret
 */
export function hasSecretContext(context) {
  const secretKeywords = [
    'api_key', 'apikey', 'api-key',
    'secret', 'password', 'passwd', 'pwd',
    'token', 'auth', 'credential',
    'private', 'access_key', 'secret_key',
    'client_secret', 'app_secret'
  ];

  const lowerContext = context.toLowerCase();
  return secretKeywords.some(keyword => lowerContext.includes(keyword));
}

// Default export
export default {
  FALSE_POSITIVE_PATTERNS,
  FEATURE_FLAG_WORDS,
  COMMON_EXAMPLES,
  COMMON_WORDS,
  isFalsePositive,
  isObviousFalsePositive,
  detectHashPattern,
  hasSecretContext,
};
