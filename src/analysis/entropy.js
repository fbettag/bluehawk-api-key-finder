/**
 * BlueHawk API Key Finder - Entropy Analysis Module
 *
 * Implements charset-aware normalized Shannon entropy for detecting
 * random/secret strings vs human-readable text.
 */

/**
 * Character set definitions with their maximum possible entropy
 * Max entropy = log2(charset_size)
 */
export const CHARSETS = {
  HEX_LOWER: {
    pattern: /^[0-9a-f]+$/,
    maxEntropy: 4.0, // log2(16)
    name: 'Hexadecimal (lowercase)'
  },
  HEX_UPPER: {
    pattern: /^[0-9A-F]+$/,
    maxEntropy: 4.0,
    name: 'Hexadecimal (uppercase)'
  },
  HEX_MIXED: {
    pattern: /^[0-9a-fA-F]+$/,
    maxEntropy: 4.0, // Still 16 unique chars conceptually
    name: 'Hexadecimal (mixed case)'
  },
  BASE64: {
    pattern: /^[A-Za-z0-9+/=]+$/,
    maxEntropy: 6.0, // log2(64)
    name: 'Base64'
  },
  BASE64_URL: {
    pattern: /^[A-Za-z0-9_-]+$/,
    maxEntropy: 6.0,
    name: 'Base64 URL-safe'
  },
  ALPHANUMERIC_LOWER: {
    pattern: /^[a-z0-9]+$/,
    maxEntropy: 5.17, // log2(36)
    name: 'Alphanumeric (lowercase)'
  },
  ALPHANUMERIC_UPPER: {
    pattern: /^[A-Z0-9]+$/,
    maxEntropy: 5.17,
    name: 'Alphanumeric (uppercase)'
  },
  ALPHANUMERIC_MIXED: {
    pattern: /^[A-Za-z0-9]+$/,
    maxEntropy: 5.95, // log2(62)
    name: 'Alphanumeric (mixed case)'
  },
  ASCII_PRINTABLE: {
    pattern: /^[\x20-\x7E]+$/,
    maxEntropy: 6.57, // log2(95)
    name: 'ASCII Printable'
  },
  NUMERIC: {
    pattern: /^[0-9]+$/,
    maxEntropy: 3.32, // log2(10)
    name: 'Numeric'
  }
};

/**
 * Detect the most specific charset that matches the input string
 * @param {string} str - Input string to analyze
 * @returns {object} Charset definition
 */
export function detectCharset(str) {
  // Order matters - check most specific first
  if (CHARSETS.NUMERIC.pattern.test(str)) return CHARSETS.NUMERIC;
  if (CHARSETS.HEX_LOWER.pattern.test(str)) return CHARSETS.HEX_LOWER;
  if (CHARSETS.HEX_UPPER.pattern.test(str)) return CHARSETS.HEX_UPPER;
  if (CHARSETS.HEX_MIXED.pattern.test(str)) return CHARSETS.HEX_MIXED;
  if (CHARSETS.ALPHANUMERIC_LOWER.pattern.test(str)) return CHARSETS.ALPHANUMERIC_LOWER;
  if (CHARSETS.ALPHANUMERIC_UPPER.pattern.test(str)) return CHARSETS.ALPHANUMERIC_UPPER;
  if (CHARSETS.ALPHANUMERIC_MIXED.pattern.test(str)) return CHARSETS.ALPHANUMERIC_MIXED;
  if (CHARSETS.BASE64_URL.pattern.test(str)) return CHARSETS.BASE64_URL;
  if (CHARSETS.BASE64.pattern.test(str)) return CHARSETS.BASE64;
  if (CHARSETS.ASCII_PRINTABLE.pattern.test(str)) return CHARSETS.ASCII_PRINTABLE;

  // Fallback: calculate based on actual unique characters
  const uniqueChars = new Set(str).size;
  return {
    pattern: null,
    maxEntropy: Math.log2(uniqueChars),
    name: 'Unknown'
  };
}

/**
 * Calculate raw Shannon entropy of a string
 * H = -sum(p_i * log2(p_i)) for each unique character
 * @param {string} str - Input string
 * @returns {number} Raw entropy in bits
 */
export function calculateRawEntropy(str) {
  if (!str || str.length === 0) return 0;

  // Count character frequencies
  const frequencies = new Map();
  for (const char of str) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  const len = str.length;
  let entropy = 0;

  for (const count of frequencies.values()) {
    const probability = count / len;
    entropy -= probability * Math.log2(probability);
  }

  return entropy;
}

/**
 * Calculate normalized Shannon entropy (0-1 scale)
 * Normalized by the maximum possible entropy for the detected charset
 * @param {string} str - Input string
 * @returns {object} Entropy analysis result
 */
export function calculateNormalizedEntropy(str) {
  if (!str || str.length === 0) {
    return {
      raw: 0,
      normalized: 0,
      charset: null,
      isHighEntropy: false
    };
  }

  const charset = detectCharset(str);
  const rawEntropy = calculateRawEntropy(str);
  const normalizedEntropy = rawEntropy / charset.maxEntropy;

  return {
    raw: rawEntropy,
    normalized: Math.min(1, normalizedEntropy), // Cap at 1.0
    charset: charset.name,
    maxEntropy: charset.maxEntropy,
    isHighEntropy: normalizedEntropy > 0.85
  };
}

/**
 * Analyze a potential secret string for entropy characteristics
 * @param {string} str - String to analyze
 * @param {object} options - Analysis options
 * @returns {object} Detailed entropy analysis
 */
export function analyzeStringEntropy(str, options = {}) {
  const {
    minLength = 8,
    highEntropyThreshold = 0.85,
    mediumEntropyThreshold = 0.70
  } = options;

  // Skip very short strings
  if (!str || str.length < minLength) {
    return {
      score: 0,
      classification: 'TOO_SHORT',
      details: null
    };
  }

  const entropyResult = calculateNormalizedEntropy(str);
  const { normalized, charset, raw } = entropyResult;

  // Calculate additional metrics
  const uniqueRatio = new Set(str).size / str.length;
  const lengthScore = Math.min(1, str.length / 40); // Longer strings more likely secrets

  // Combine entropy with uniqueness for final score
  const combinedScore = (normalized * 0.7) + (uniqueRatio * 0.2) + (lengthScore * 0.1);

  let classification;
  if (normalized >= highEntropyThreshold) {
    classification = 'HIGH_ENTROPY';
  } else if (normalized >= mediumEntropyThreshold) {
    classification = 'MEDIUM_ENTROPY';
  } else {
    classification = 'LOW_ENTROPY';
  }

  return {
    score: combinedScore,
    classification,
    details: {
      rawEntropy: raw,
      normalizedEntropy: normalized,
      charset,
      uniqueChars: new Set(str).size,
      uniqueRatio,
      length: str.length,
      lengthScore
    }
  };
}

/**
 * Quick entropy check - returns true if string has high enough entropy
 * to warrant further analysis
 * @param {string} str - String to check
 * @param {number} threshold - Normalized entropy threshold (default 0.70)
 * @returns {boolean} True if high entropy
 */
export function isHighEntropy(str, threshold = 0.70) {
  if (!str || str.length < 8) return false;
  const { normalized } = calculateNormalizedEntropy(str);
  return normalized >= threshold;
}

/**
 * Batch analyze multiple strings for entropy
 * @param {string[]} strings - Array of strings to analyze
 * @param {object} options - Analysis options
 * @returns {Array} Array of analysis results
 */
export function batchAnalyzeEntropy(strings, options = {}) {
  return strings.map(str => ({
    value: str,
    analysis: analyzeStringEntropy(str, options)
  }));
}

/**
 * Calculate entropy score for secret detection confidence
 * Returns 0-100 score based on entropy analysis
 * @param {string} str - String to score
 * @returns {number} Score 0-100
 */
export function getEntropyScore(str) {
  const analysis = analyzeStringEntropy(str);
  return Math.round(analysis.score * 100);
}

export default {
  CHARSETS,
  detectCharset,
  calculateRawEntropy,
  calculateNormalizedEntropy,
  analyzeStringEntropy,
  isHighEntropy,
  batchAnalyzeEntropy,
  getEntropyScore
};
