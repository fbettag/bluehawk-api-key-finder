/**
 * BlueHawk API Key Finder - N-Gram Analyzer Module
 *
 * Detects gibberish/random strings vs human-readable text using
 * trigram (3-character) probability analysis based on English corpus.
 */

/**
 * Pre-computed trigram frequencies from English corpus
 * Normalized log probabilities for common trigrams
 * Higher values = more common in English text
 */
const TRIGRAM_SCORES = {
  // Most common English trigrams (top 100+)
  'the': 1.0, 'and': 0.95, 'ing': 0.94, 'ion': 0.92, 'tio': 0.91,
  'ent': 0.90, 'ati': 0.89, 'for': 0.88, 'her': 0.87, 'ter': 0.86,
  'hat': 0.85, 'tha': 0.84, 'ere': 0.83, 'ate': 0.82, 'his': 0.81,
  'con': 0.80, 'res': 0.79, 'ver': 0.78, 'all': 0.77, 'ons': 0.76,
  'nce': 0.75, 'men': 0.74, 'ith': 0.73, 'ted': 0.72, 'ers': 0.71,
  'pro': 0.70, 'thi': 0.69, 'wit': 0.68, 'are': 0.67, 'ess': 0.66,
  'not': 0.65, 'ive': 0.64, 'was': 0.63, 'ect': 0.62, 'rea': 0.61,
  'com': 0.60, 'eve': 0.59, 'per': 0.58, 'int': 0.57, 'est': 0.56,
  'sta': 0.55, 'cti': 0.54, 'ica': 0.53, 'ist': 0.52, 'ear': 0.51,
  'ain': 0.50, 'one': 0.49, 'our': 0.48, 'iti': 0.47, 'rat': 0.46,
  'oun': 0.45, 'tin': 0.44, 'ine': 0.43, 'tur': 0.42, 'man': 0.41,
  'igh': 0.40, 'ort': 0.39, 'whi': 0.38, 'ove': 0.37, 'out': 0.36,
  'rom': 0.35, 'ble': 0.34, 'rin': 0.33, 'hou': 0.32, 'str': 0.31,
  'use': 0.30, 'nes': 0.29, 'tra': 0.28, 'any': 0.27, 'ill': 0.26,
  'ght': 0.25, 'pre': 0.24, 'han': 0.23, 'oul': 0.22, 'rea': 0.21,
  'lea': 0.20, 'oun': 0.19, 'ssi': 0.18, 'nal': 0.17, 'ree': 0.16,
  'orm': 0.15, 'enc': 0.14, 'ste': 0.13, 'nat': 0.12, 'dis': 0.11,
  'oth': 0.10, 'ard': 0.09, 'ave': 0.08, 'aci': 0.07, 'ght': 0.06,

  // Common programming/tech trigrams
  'api': 0.30, 'key': 0.30, 'url': 0.25, 'get': 0.35, 'set': 0.35,
  'var': 0.25, 'val': 0.30, 'str': 0.31, 'num': 0.20, 'arr': 0.20,
  'obj': 0.15, 'fun': 0.25, 'ret': 0.30, 'err': 0.25, 'log': 0.20,
  'msg': 0.15, 'req': 0.25, 'res': 0.79, 'dat': 0.25, 'typ': 0.20,
  'end': 0.35, 'new': 0.30, 'def': 0.25, 'len': 0.25, 'idx': 0.10,
  'max': 0.20, 'min': 0.20, 'sum': 0.15, 'avg': 0.10, 'cnt': 0.10,
  'tmp': 0.10, 'ptr': 0.05, 'buf': 0.10, 'src': 0.15, 'dst': 0.10,
  'cfg': 0.10, 'env': 0.15, 'app': 0.25, 'usr': 0.10, 'pwd': 0.10,

  // Common word parts
  'tion': 0.90, 'able': 0.70, 'ment': 0.65, 'ness': 0.60,
  'less': 0.55, 'ful': 0.50, 'ous': 0.45, 'ive': 0.64
};

/**
 * Default score for unknown trigrams
 * Low value indicates uncommon/gibberish
 */
const UNKNOWN_TRIGRAM_SCORE = 0.01;

/**
 * Extract all trigrams from a string
 * @param {string} str - Input string
 * @returns {string[]} Array of trigrams
 */
export function extractTrigrams(str) {
  if (!str || str.length < 3) return [];

  const trigrams = [];
  const normalized = str.toLowerCase().replace(/[^a-z]/g, '');

  for (let i = 0; i <= normalized.length - 3; i++) {
    trigrams.push(normalized.substring(i, i + 3));
  }

  return trigrams;
}

/**
 * Calculate trigram probability score for a string
 * @param {string} str - Input string
 * @returns {object} Score and analysis details
 */
export function calculateTrigramScore(str) {
  const trigrams = extractTrigrams(str);

  if (trigrams.length === 0) {
    return {
      score: 0,
      trigramCount: 0,
      knownCount: 0,
      averageScore: 0
    };
  }

  let totalScore = 0;
  let knownCount = 0;

  for (const trigram of trigrams) {
    const score = TRIGRAM_SCORES[trigram] || UNKNOWN_TRIGRAM_SCORE;
    totalScore += score;
    if (TRIGRAM_SCORES[trigram]) {
      knownCount++;
    }
  }

  const averageScore = totalScore / trigrams.length;
  const knownRatio = knownCount / trigrams.length;

  return {
    score: averageScore,
    trigramCount: trigrams.length,
    knownCount,
    knownRatio,
    averageScore
  };
}

/**
 * Detect if a string is likely gibberish based on trigram analysis
 * @param {string} str - String to analyze
 * @param {number} threshold - Score threshold (default 0.15)
 * @returns {boolean} True if likely gibberish
 */
export function isGibberish(str, threshold = 0.15) {
  // Skip very short strings
  if (!str || str.length < 6) return false;

  // Skip strings that are mostly non-alphabetic
  const alphaOnly = str.replace(/[^a-zA-Z]/g, '');
  if (alphaOnly.length < 6) return false;

  const { score } = calculateTrigramScore(str);
  return score < threshold;
}

/**
 * Calculate English-likeness score (inverse of gibberish)
 * @param {string} str - String to analyze
 * @returns {number} Score 0-1 where 1 is very English-like
 */
export function getEnglishScore(str) {
  const { score, knownRatio } = calculateTrigramScore(str);

  // Combine trigram score with known ratio
  return (score * 0.7) + (knownRatio * 0.3);
}

/**
 * Analyze a string for gibberish characteristics
 * @param {string} str - String to analyze
 * @param {object} options - Analysis options
 * @returns {object} Detailed analysis
 */
export function analyzeGibberish(str, options = {}) {
  const {
    gibberishThreshold = 0.15,
    minLength = 6
  } = options;

  if (!str || str.length < minLength) {
    return {
      isGibberish: false,
      confidence: 0,
      details: null,
      classification: 'TOO_SHORT'
    };
  }

  const trigramResult = calculateTrigramScore(str);
  const englishScore = getEnglishScore(str);

  // Check character patterns that suggest randomness
  const hasRepeatingPattern = /(.)\1{3,}/.test(str); // 4+ same char
  const hasAlternating = /^(.)(.)(\1\2)+$/.test(str); // Alternating pattern
  const consonantClusters = (str.match(/[bcdfghjklmnpqrstvwxz]{4,}/gi) || []).length;
  const vowelClusters = (str.match(/[aeiou]{4,}/gi) || []).length;

  // Calculate gibberish confidence
  let confidence = 0;

  if (trigramResult.score < gibberishThreshold) {
    confidence += 40;
  } else if (trigramResult.score < gibberishThreshold * 2) {
    confidence += 20;
  }

  if (trigramResult.knownRatio < 0.3) {
    confidence += 30;
  } else if (trigramResult.knownRatio < 0.5) {
    confidence += 15;
  }

  if (consonantClusters > 2 || vowelClusters > 2) {
    confidence += 20;
  }

  if (hasRepeatingPattern || hasAlternating) {
    confidence -= 20; // Pattern suggests non-random
  }

  confidence = Math.max(0, Math.min(100, confidence));

  let classification;
  if (confidence >= 70) {
    classification = 'LIKELY_GIBBERISH';
  } else if (confidence >= 40) {
    classification = 'POSSIBLY_GIBBERISH';
  } else {
    classification = 'LIKELY_READABLE';
  }

  return {
    isGibberish: confidence >= 50,
    confidence,
    classification,
    details: {
      trigramScore: trigramResult.score,
      trigramCount: trigramResult.trigramCount,
      knownRatio: trigramResult.knownRatio,
      englishScore,
      consonantClusters,
      vowelClusters,
      hasRepeatingPattern
    }
  };
}

/**
 * Get gibberish score for secret detection (0-100)
 * Higher score = more likely gibberish/random = more likely secret
 * @param {string} str - String to analyze
 * @returns {number} Score 0-100
 */
export function getGibberishScore(str) {
  const analysis = analyzeGibberish(str);
  return analysis.confidence;
}

/**
 * Batch analyze strings for gibberish
 * @param {string[]} strings - Strings to analyze
 * @param {object} options - Analysis options
 * @returns {Array} Analysis results
 */
export function batchAnalyzeGibberish(strings, options = {}) {
  return strings.map(str => ({
    value: str,
    analysis: analyzeGibberish(str, options)
  }));
}

/**
 * Combined readability analysis using multiple metrics
 * @param {string} str - String to analyze
 * @returns {object} Combined analysis
 */
export function analyzeReadability(str) {
  if (!str || str.length < 4) {
    return {
      isReadable: true,
      confidence: 0,
      metrics: null
    };
  }

  // Calculate various readability metrics
  const trigramResult = calculateTrigramScore(str);
  const englishScore = getEnglishScore(str);

  // Check for common English patterns
  const hasVowels = /[aeiou]/i.test(str);
  const vowelRatio = (str.match(/[aeiou]/gi) || []).length / str.length;
  const hasSpaces = /\s/.test(str);
  const wordLikeSegments = str.split(/[^a-zA-Z]+/).filter(s => s.length >= 2);

  // Score readability
  let readabilityScore = 0;

  if (trigramResult.score > 0.3) readabilityScore += 30;
  if (trigramResult.knownRatio > 0.4) readabilityScore += 20;
  if (vowelRatio > 0.2 && vowelRatio < 0.6) readabilityScore += 20;
  if (hasSpaces) readabilityScore += 15;
  if (wordLikeSegments.length > 1) readabilityScore += 15;

  return {
    isReadable: readabilityScore >= 50,
    confidence: readabilityScore,
    metrics: {
      trigramScore: trigramResult.score,
      englishScore,
      vowelRatio,
      hasSpaces,
      wordSegments: wordLikeSegments.length
    }
  };
}

export default {
  extractTrigrams,
  calculateTrigramScore,
  isGibberish,
  getEnglishScore,
  analyzeGibberish,
  getGibberishScore,
  batchAnalyzeGibberish,
  analyzeReadability,
  TRIGRAM_SCORES
};
