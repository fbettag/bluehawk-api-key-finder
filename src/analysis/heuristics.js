/**
 * BlueHawk API Key Finder - Heuristics Module
 *
 * Combines entropy analysis, n-gram scoring, pattern matching,
 * length analysis, and context hints into unified confidence scoring.
 */

import { analyzeStringEntropy, getEntropyScore, isHighEntropy } from './entropy.js';
import { analyzeGibberish, getGibberishScore, isGibberish } from './ngram-analyzer.js';
import { PATTERN_METADATA } from '../shared/patterns.js';

/**
 * Classification levels for detected secrets
 */
export const CLASSIFICATION = {
  DEFINITE_SECRET: 'DEFINITE_SECRET',     // 90-100% confidence
  LIKELY_SECRET: 'LIKELY_SECRET',          // 70-89% confidence
  POSSIBLE_SECRET: 'POSSIBLE_SECRET',      // 50-69% confidence
  UNCERTAIN: 'UNCERTAIN',                  // 30-49% confidence
  LIKELY_FALSE_POSITIVE: 'LIKELY_FALSE_POSITIVE', // 0-29% confidence
};

/**
 * Context keywords that increase secret likelihood
 */
const SECRET_CONTEXT_KEYWORDS = [
  'api', 'key', 'secret', 'token', 'auth', 'password', 'pwd', 'pass',
  'credential', 'private', 'access', 'bearer', 'jwt', 'oauth',
  'apikey', 'api_key', 'apiKey', 'secretKey', 'secret_key',
  'accessToken', 'access_token', 'authToken', 'auth_token',
  'privateKey', 'private_key', 'client_secret', 'clientSecret'
];

/**
 * Context keywords that decrease secret likelihood (false positive hints)
 */
const FALSE_POSITIVE_CONTEXT = [
  'example', 'sample', 'test', 'demo', 'fake', 'dummy', 'placeholder',
  'your_', 'your-', '<your', 'xxx', 'aaa', '123', 'abc',
  'template', 'replace', 'insert', 'enter', 'config'
];

/**
 * Variable/property name patterns that suggest secrets
 */
const SECRET_NAME_PATTERNS = [
  /api[_-]?key/i,
  /secret[_-]?key/i,
  /access[_-]?key/i,
  /private[_-]?key/i,
  /auth[_-]?token/i,
  /bearer[_-]?token/i,
  /client[_-]?secret/i,
  /password/i,
  /credential/i,
  /signing[_-]?key/i,
  /encryption[_-]?key/i,
  /^(sk|pk|rk|ak)_/i, // Common key prefixes
];

/**
 * Calculate context score based on surrounding text/variable names
 * @param {string} value - The potential secret value
 * @param {object} context - Context information
 * @returns {number} Context score adjustment (-30 to +30)
 */
export function calculateContextScore(value, context = {}) {
  const { variableName = '', surroundingText = '', propertyName = '' } = context;
  const contextText = `${variableName} ${propertyName} ${surroundingText}`.toLowerCase();
  const valueLower = value.toLowerCase();

  let score = 0;

  // Check for secret-suggesting context
  for (const keyword of SECRET_CONTEXT_KEYWORDS) {
    if (contextText.includes(keyword)) {
      score += 10;
      break; // Only count once
    }
  }

  // Check variable/property name patterns
  for (const pattern of SECRET_NAME_PATTERNS) {
    if (pattern.test(variableName) || pattern.test(propertyName)) {
      score += 15;
      break;
    }
  }

  // Check for false positive hints
  for (const hint of FALSE_POSITIVE_CONTEXT) {
    if (contextText.includes(hint) || valueLower.includes(hint)) {
      score -= 20;
      break;
    }
  }

  // Check for obvious placeholder patterns in value
  if (/^[x]{4,}$/i.test(value) || /^[0]{8,}$/.test(value)) {
    score -= 30;
  }

  // Check for repetitive patterns
  if (/^(.)\1{7,}$/.test(value) || /^(..)\1{3,}$/.test(value)) {
    score -= 25;
  }

  return Math.max(-30, Math.min(30, score));
}

/**
 * Calculate length-based score
 * Different token types have expected length ranges
 * @param {string} value - The potential secret
 * @param {string} tokenType - Type of token if known
 * @returns {number} Length score (0-20)
 */
export function calculateLengthScore(value, tokenType = null) {
  const len = value.length;

  // Get expected length from pattern metadata if available
  if (tokenType && PATTERN_METADATA[tokenType]) {
    const { minLength, maxLength } = PATTERN_METADATA[tokenType];
    if (len >= minLength && len <= maxLength) {
      return 20; // Perfect length match
    } else if (len >= minLength * 0.8 && len <= maxLength * 1.2) {
      return 10; // Close to expected
    }
    return 0;
  }

  // General length scoring
  if (len >= 20 && len <= 100) return 15; // Typical secret length
  if (len >= 10 && len < 20) return 10;
  if (len > 100 && len <= 200) return 10; // Could be JWT or long key
  if (len > 200) return 5; // Very long, possibly encoded
  return 5; // Short but still possible
}

/**
 * Calculate pattern match confidence
 * @param {string} value - The potential secret
 * @param {string} tokenType - Type of token matched
 * @param {object} matchInfo - Additional match information
 * @returns {number} Pattern confidence (0-30)
 */
export function calculatePatternConfidence(value, tokenType, matchInfo = {}) {
  let confidence = 15; // Base confidence for any pattern match

  // Boost for specific provider patterns
  if (tokenType && PATTERN_METADATA[tokenType]) {
    const meta = PATTERN_METADATA[tokenType];
    confidence += meta.baseConfidence || 10;

    // Check for known prefixes
    if (meta.prefixes && meta.prefixes.some(p => value.startsWith(p))) {
      confidence += 10;
    }
  }

  // Check for common API key formats
  if (/^[A-Za-z0-9_-]{20,}$/.test(value)) {
    confidence += 5;
  }

  // JWT format bonus
  if (/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) {
    confidence += 15;
  }

  return Math.min(30, confidence);
}

/**
 * Main heuristic analysis function
 * Combines all scoring methods into unified confidence
 * @param {string} value - The potential secret string
 * @param {object} options - Analysis options
 * @returns {object} Complete heuristic analysis
 */
export function analyzeSecret(value, options = {}) {
  const {
    tokenType = null,
    context = {},
    patternMatch = null,
    strictMode = false
  } = options;

  if (!value || value.length < 8) {
    return {
      confidence: 0,
      classification: CLASSIFICATION.LIKELY_FALSE_POSITIVE,
      scores: null,
      details: 'Value too short'
    };
  }

  // Calculate individual scores
  const entropyAnalysis = analyzeStringEntropy(value);
  const gibberishAnalysis = analyzeGibberish(value);
  const contextScore = calculateContextScore(value, context);
  const lengthScore = calculateLengthScore(value, tokenType);
  const patternScore = patternMatch ? calculatePatternConfidence(value, tokenType) : 0;

  // Weight factors for combining scores
  const weights = {
    entropy: 0.30,      // 30% - How random is it?
    gibberish: 0.25,    // 25% - Is it unreadable?
    pattern: 0.25,      // 25% - Does it match known patterns?
    length: 0.10,       // 10% - Is it the right length?
    context: 0.10       // 10% - Does context suggest secret?
  };

  // Normalize scores to 0-100 range
  const scores = {
    entropy: entropyAnalysis.score * 100,
    gibberish: gibberishAnalysis.confidence,
    pattern: patternScore * (100 / 30), // Scale to 100
    length: lengthScore * 5, // Scale to 100
    context: 50 + contextScore // Center at 50, adjust by context
  };

  // Calculate weighted confidence
  let confidence =
    (scores.entropy * weights.entropy) +
    (scores.gibberish * weights.gibberish) +
    (scores.pattern * weights.pattern) +
    (scores.length * weights.length) +
    (scores.context * weights.context);

  // Apply strict mode penalty for uncertain results
  if (strictMode && confidence < 60) {
    confidence *= 0.7;
  }

  // Apply bonuses for high-confidence indicators
  if (entropyAnalysis.classification === 'HIGH_ENTROPY' && gibberishAnalysis.isGibberish) {
    confidence = Math.min(100, confidence + 10);
  }

  // Determine classification
  let classification;
  if (confidence >= 90) {
    classification = CLASSIFICATION.DEFINITE_SECRET;
  } else if (confidence >= 70) {
    classification = CLASSIFICATION.LIKELY_SECRET;
  } else if (confidence >= 50) {
    classification = CLASSIFICATION.POSSIBLE_SECRET;
  } else if (confidence >= 30) {
    classification = CLASSIFICATION.UNCERTAIN;
  } else {
    classification = CLASSIFICATION.LIKELY_FALSE_POSITIVE;
  }

  return {
    confidence: Math.round(confidence),
    classification,
    scores: {
      entropy: Math.round(scores.entropy),
      gibberish: Math.round(scores.gibberish),
      pattern: Math.round(scores.pattern),
      length: Math.round(scores.length),
      context: Math.round(scores.context)
    },
    details: {
      entropyAnalysis: entropyAnalysis.details,
      gibberishAnalysis: gibberishAnalysis.details,
      tokenType,
      valueLength: value.length
    }
  };
}

/**
 * Quick confidence check - returns confidence level without full analysis
 * @param {string} value - The potential secret
 * @returns {number} Quick confidence 0-100
 */
export function quickConfidenceCheck(value) {
  if (!value || value.length < 8) return 0;

  const entropyScore = getEntropyScore(value);
  const gibberishScore = getGibberishScore(value);

  // Quick combined score
  return Math.round((entropyScore * 0.5) + (gibberishScore * 0.5));
}

/**
 * Batch analyze multiple candidates
 * @param {Array} candidates - Array of {value, context, tokenType}
 * @param {object} options - Analysis options
 * @returns {Array} Analysis results
 */
export function batchAnalyze(candidates, options = {}) {
  return candidates.map(candidate => ({
    value: candidate.value,
    tokenType: candidate.tokenType,
    analysis: analyzeSecret(candidate.value, {
      ...options,
      tokenType: candidate.tokenType,
      context: candidate.context
    })
  }));
}

/**
 * Filter candidates by minimum confidence
 * @param {Array} candidates - Array of analyzed candidates
 * @param {number} minConfidence - Minimum confidence threshold
 * @returns {Array} Filtered candidates
 */
export function filterByConfidence(candidates, minConfidence = 50) {
  return candidates.filter(c => c.analysis.confidence >= minConfidence);
}

/**
 * Rank candidates by confidence
 * @param {Array} candidates - Array of analyzed candidates
 * @returns {Array} Sorted candidates (highest confidence first)
 */
export function rankByConfidence(candidates) {
  return [...candidates].sort((a, b) => b.analysis.confidence - a.analysis.confidence);
}

/**
 * Get classification color for UI display
 * @param {string} classification - Classification level
 * @returns {string} Color code
 */
export function getClassificationColor(classification) {
  const colors = {
    [CLASSIFICATION.DEFINITE_SECRET]: '#ff4444',      // Red
    [CLASSIFICATION.LIKELY_SECRET]: '#ff8800',        // Orange
    [CLASSIFICATION.POSSIBLE_SECRET]: '#ffcc00',      // Yellow
    [CLASSIFICATION.UNCERTAIN]: '#88ccff',            // Light blue
    [CLASSIFICATION.LIKELY_FALSE_POSITIVE]: '#888888' // Gray
  };
  return colors[classification] || '#888888';
}

/**
 * Get human-readable classification label
 * @param {string} classification - Classification level
 * @returns {string} Label
 */
export function getClassificationLabel(classification) {
  const labels = {
    [CLASSIFICATION.DEFINITE_SECRET]: 'Definite Secret',
    [CLASSIFICATION.LIKELY_SECRET]: 'Likely Secret',
    [CLASSIFICATION.POSSIBLE_SECRET]: 'Possible Secret',
    [CLASSIFICATION.UNCERTAIN]: 'Uncertain',
    [CLASSIFICATION.LIKELY_FALSE_POSITIVE]: 'Likely False Positive'
  };
  return labels[classification] || 'Unknown';
}

export default {
  CLASSIFICATION,
  analyzeSecret,
  quickConfidenceCheck,
  batchAnalyze,
  filterByConfidence,
  rankByConfidence,
  calculateContextScore,
  calculateLengthScore,
  calculatePatternConfidence,
  getClassificationColor,
  getClassificationLabel
};
