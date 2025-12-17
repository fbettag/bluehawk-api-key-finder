/**
 * BlueHawk API Key Finder - Scanner Pipeline
 *
 * Central orchestration for the multi-stage token detection pipeline.
 * Each stage adds additional analysis capabilities.
 *
 * Pipeline Stages:
 * 1. Ingestion - Script collection from page
 * 2. Expansion - Source map decompilation, WASM extraction, deobfuscation
 * 3. Static Analysis - Regex pattern matching
 * 4. AST Analysis - Semantic context extraction
 * 5. Statistical Analysis - Entropy and N-gram scoring
 * 6. ML Scoring - Optional TensorFlow.js classification
 * 7. Validation - API token verification
 */

import { TOKEN_PATTERNS, API_ENDPOINT_PATTERNS } from '@shared/patterns';
import { isFalsePositive, isObviousFalsePositive } from '@shared/false-positive-filters';
import {
  getTokenSeverity,
  SCAN_CONFIG,
  CONFIDENCE_LEVELS,
  TOKEN_SOURCES,
  ANALYSIS_MODES,
} from '@shared/constants';

// ========================================
// PIPELINE CONFIGURATION
// ========================================

/**
 * Analysis depth levels
 * Each level includes all previous stages plus additional analysis
 */
export const ANALYSIS_DEPTH = {
  QUICK: {
    name: 'Quick',
    stages: ['ingestion', 'static'],
    description: 'Fast regex-only scan',
  },
  STANDARD: {
    name: 'Standard',
    stages: ['ingestion', 'static', 'statistical'],
    description: 'Pattern matching + entropy analysis',
  },
  DEEP: {
    name: 'Deep',
    stages: ['ingestion', 'expansion', 'static', 'ast', 'statistical'],
    description: 'Full analysis with AST context',
  },
  FULL: {
    name: 'Full',
    stages: ['ingestion', 'expansion', 'static', 'ast', 'statistical', 'ml', 'validation'],
    description: 'Complete analysis with ML and validation',
  },
};

// ========================================
// PIPELINE STATE
// ========================================

/**
 * Pipeline execution state
 */
class PipelineState {
  constructor() {
    this.scripts = [];
    this.tokens = [];
    this.endpoints = [];
    this.stats = {
      scriptsAnalyzed: 0,
      scriptsSkipped: 0,
      tokensFound: 0,
      falsePositivesFiltered: 0,
      stageTimings: {},
    };
    this.errors = [];
    this.startTime = null;
    this.endTime = null;
  }

  addToken(token) {
    this.tokens.push(token);
    this.stats.tokensFound++;
  }

  addEndpoint(endpoint) {
    this.endpoints.push(endpoint);
  }

  recordStageTime(stage, duration) {
    this.stats.stageTimings[stage] = duration;
  }

  addError(stage, error) {
    this.errors.push({ stage, error: error.message, timestamp: Date.now() });
  }

  getResults() {
    return {
      tokens: this.tokens,
      endpoints: this.endpoints,
      stats: this.stats,
      errors: this.errors,
      duration: this.endTime - this.startTime,
    };
  }
}

// ========================================
// PIPELINE STAGES
// ========================================

/**
 * Stage 1: Ingestion
 * Collects scripts from the page (inline and external)
 */
export async function stageIngestion(state, options = {}) {
  const startTime = performance.now();

  // This will be called from content script context
  // Implementation depends on whether we're in content script or worker

  state.recordStageTime('ingestion', performance.now() - startTime);
  return state;
}

/**
 * Stage 2: Expansion
 * Processes source maps, WASM binaries, and handles deobfuscation
 */
export async function stageExpansion(state, options = {}) {
  const startTime = performance.now();

  // TODO: Implement source map fetching and parsing
  // TODO: Implement WASM binary parsing
  // TODO: Implement string deobfuscation

  state.recordStageTime('expansion', performance.now() - startTime);
  return state;
}

/**
 * Stage 3: Static Analysis
 * Applies regex patterns to detect tokens
 */
export async function stageStaticAnalysis(state, options = {}) {
  const startTime = performance.now();

  for (const script of state.scripts) {
    if (!script.content) continue;

    const tokens = analyzeScriptStatic(script.content, script.url);
    for (const token of tokens) {
      // Quick false positive check
      if (!isObviousFalsePositive(token.value)) {
        state.addToken({
          ...token,
          source: TOKEN_SOURCES.STATIC,
          stages: ['static'],
        });
      } else {
        state.stats.falsePositivesFiltered++;
      }
    }

    state.stats.scriptsAnalyzed++;
  }

  state.recordStageTime('static', performance.now() - startTime);
  return state;
}

/**
 * Stage 4: AST Analysis
 * Parses JavaScript and extracts semantic context
 */
export async function stageAstAnalysis(state, options = {}) {
  const startTime = performance.now();

  // TODO: Implement Babel parser integration
  // TODO: Implement AST visitor pattern
  // TODO: Extract variable names, object keys, function calls

  // For now, enhance existing tokens with context hints
  for (const token of state.tokens) {
    token.astContext = extractContextHints(token.context || '');
    token.stages.push('ast');
  }

  state.recordStageTime('ast', performance.now() - startTime);
  return state;
}

/**
 * Stage 5: Statistical Analysis
 * Calculates entropy and N-gram scores
 */
export async function stageStatisticalAnalysis(state, options = {}) {
  const startTime = performance.now();

  for (const token of state.tokens) {
    // Calculate entropy score
    token.entropyScore = calculateEntropy(token.value);

    // TODO: Add N-gram analysis
    // token.ngramScore = calculateNgramScore(token.value);

    // Calculate overall confidence
    token.confidence = calculateConfidence(token);
    token.stages.push('statistical');
  }

  state.recordStageTime('statistical', performance.now() - startTime);
  return state;
}

/**
 * Stage 6: ML Scoring
 * Uses TensorFlow.js for final classification (optional, lazy-loaded)
 */
export async function stageMlScoring(state, options = {}) {
  const startTime = performance.now();

  // TODO: Implement TensorFlow.js integration
  // Only process uncertain tokens to minimize overhead

  const uncertainTokens = state.tokens.filter(
    t => t.confidence === CONFIDENCE_LEVELS.UNCERTAIN
  );

  // For now, skip ML scoring
  for (const token of uncertainTokens) {
    token.mlScore = null;
    token.stages.push('ml');
  }

  state.recordStageTime('ml', performance.now() - startTime);
  return state;
}

/**
 * Stage 7: Validation
 * Verifies tokens against provider APIs
 */
export async function stageValidation(state, options = {}) {
  const startTime = performance.now();

  // TODO: Integrate with validator module
  // Only validate high-confidence tokens

  const highConfidenceTokens = state.tokens.filter(
    t => t.confidence === CONFIDENCE_LEVELS.DEFINITE_SECRET ||
         t.confidence === CONFIDENCE_LEVELS.LIKELY_SECRET
  );

  for (const token of highConfidenceTokens) {
    token.validation = { status: 'pending' };
    token.stages.push('validation');
  }

  state.recordStageTime('validation', performance.now() - startTime);
  return state;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Analyze script content using static regex patterns
 */
function analyzeScriptStatic(content, scriptUrl) {
  const tokens = [];

  for (const [type, regexList] of Object.entries(TOKEN_PATTERNS)) {
    for (const regex of regexList) {
      // Reset regex state
      regex.lastIndex = 0;

      let match;
      let iterations = 0;
      const maxIterations = 1000;

      while ((match = regex.exec(content)) !== null && iterations < maxIterations) {
        iterations++;

        const value = match[2] || match[1] || match[0];

        // Extract context
        const matchIndex = match.index;
        const contextStart = Math.max(0, matchIndex - 100);
        const contextEnd = Math.min(content.length, matchIndex + match[0].length + 100);
        const context = content.substring(contextStart, contextEnd).replace(/\s+/g, ' ');

        // Full false positive check
        if (isFalsePositive(value, context)) {
          continue;
        }

        // Calculate location
        const location = getLineAndColumn(content, matchIndex);

        tokens.push({
          type,
          value,
          scriptUrl,
          severity: getTokenSeverity(type),
          location,
          context: context.length < 200 ? context : context.substring(0, 200) + '...',
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return tokens;
}

/**
 * Calculate line and column from index
 */
function getLineAndColumn(content, index) {
  const lines = content.substring(0, index).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
    index,
  };
}

/**
 * Extract context hints from surrounding code
 */
function extractContextHints(context) {
  const hints = {
    variableName: null,
    objectKey: null,
    functionCall: null,
    sdkPattern: null,
  };

  // Look for variable assignment patterns
  const varMatch = context.match(/(?:const|let|var)\s+(\w+)\s*=/);
  if (varMatch) {
    hints.variableName = varMatch[1];
  }

  // Look for object key patterns
  const keyMatch = context.match(/['"]?(\w+)['"]?\s*:/);
  if (keyMatch) {
    hints.objectKey = keyMatch[1];
  }

  // Look for function call patterns
  const funcMatch = context.match(/(\w+)\s*\(/);
  if (funcMatch) {
    hints.functionCall = funcMatch[1];
  }

  // Look for SDK patterns
  const sdkPatterns = [
    { pattern: /firebase/i, sdk: 'Firebase' },
    { pattern: /aws/i, sdk: 'AWS' },
    { pattern: /stripe/i, sdk: 'Stripe' },
    { pattern: /supabase/i, sdk: 'Supabase' },
  ];

  for (const { pattern, sdk } of sdkPatterns) {
    if (pattern.test(context)) {
      hints.sdkPattern = sdk;
      break;
    }
  }

  return hints;
}

/**
 * Calculate Shannon entropy for a string
 */
function calculateEntropy(str) {
  if (!str || str.length === 0) return 0;

  const freq = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  const len = str.length;

  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Calculate overall confidence score
 */
function calculateConfidence(token) {
  let score = 0;

  // Entropy contribution (0-40 points)
  if (token.entropyScore > 4.5) score += 40;
  else if (token.entropyScore > 4.0) score += 30;
  else if (token.entropyScore > 3.5) score += 20;
  else score += 10;

  // Severity contribution (0-30 points)
  if (token.severity === 'CRITICAL') score += 30;
  else if (token.severity === 'HIGH') score += 25;
  else if (token.severity === 'MEDIUM') score += 15;
  else score += 5;

  // Context hints contribution (0-30 points)
  if (token.astContext) {
    if (token.astContext.sdkPattern) score += 15;
    if (token.astContext.variableName) score += 10;
    if (token.astContext.objectKey) score += 5;
  }

  // Map score to confidence level
  if (score >= 80) return CONFIDENCE_LEVELS.DEFINITE_SECRET;
  if (score >= 60) return CONFIDENCE_LEVELS.LIKELY_SECRET;
  if (score >= 40) return CONFIDENCE_LEVELS.UNCERTAIN;
  return CONFIDENCE_LEVELS.LIKELY_FALSE_POSITIVE;
}

// ========================================
// MAIN PIPELINE RUNNER
// ========================================

/**
 * Run the scanner pipeline with specified depth
 *
 * @param {Array} scripts - Scripts to analyze
 * @param {Object} options - Pipeline options
 * @returns {Object} - Analysis results
 */
export async function runPipeline(scripts, options = {}) {
  const {
    depth = 'STANDARD',
    mode = ANALYSIS_MODES.SURGICAL,
    onProgress = null,
  } = options;

  const config = ANALYSIS_DEPTH[depth] || ANALYSIS_DEPTH.STANDARD;
  const state = new PipelineState();

  state.startTime = Date.now();
  state.scripts = scripts;

  // Stage mapping
  const stageHandlers = {
    ingestion: stageIngestion,
    expansion: stageExpansion,
    static: stageStaticAnalysis,
    ast: stageAstAnalysis,
    statistical: stageStatisticalAnalysis,
    ml: stageMlScoring,
    validation: stageValidation,
  };

  // Run configured stages
  for (const stageName of config.stages) {
    const handler = stageHandlers[stageName];
    if (!handler) continue;

    try {
      if (onProgress) {
        onProgress({ stage: stageName, status: 'running' });
      }

      await handler(state, options);

      if (onProgress) {
        onProgress({
          stage: stageName,
          status: 'complete',
          tokensFound: state.stats.tokensFound,
        });
      }
    } catch (error) {
      state.addError(stageName, error);
      console.error(`Pipeline error in stage ${stageName}:`, error);
    }
  }

  state.endTime = Date.now();

  return state.getResults();
}

// ========================================
// EXPORTS
// ========================================

export default {
  runPipeline,
  ANALYSIS_DEPTH,
  PipelineState,
  stageIngestion,
  stageExpansion,
  stageStaticAnalysis,
  stageAstAnalysis,
  stageStatisticalAnalysis,
  stageMlScoring,
  stageValidation,
  calculateEntropy,
  calculateConfidence,
};
