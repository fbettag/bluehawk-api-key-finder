/**
 * BlueHawk API Key Finder - Scanner Worker
 *
 * Web Worker for CPU-intensive token scanning.
 * Prevents main thread blocking during analysis.
 */

import { TOKEN_PATTERNS } from '@shared/patterns';
import { isFalsePositive } from '@shared/false-positive-filters';
import { getTokenSeverity } from '@shared/constants';

// Worker message handler
self.onmessage = function(event) {
  const { type, data } = event.data;

  switch (type) {
    case 'scanScripts':
      handleScanScripts(data);
      break;
    default:
      self.postMessage({ type: 'error', error: `Unknown message type: ${type}` });
  }
};

/**
 * Handle script scanning request
 */
function handleScanScripts(data) {
  const { scripts, chunkSize = 5 } = data;
  const foundTokens = [];
  let analyzed = 0;

  try {
    for (const script of scripts) {
      if (!script.content) {
        analyzed++;
        continue;
      }

      // Handle cached results
      if (script.cached && script.cachedTokens) {
        foundTokens.push(...script.cachedTokens);
        analyzed++;
        continue;
      }

      // Analyze script
      const tokens = analyzeScript(script.content, script.url);
      foundTokens.push(...tokens);
      analyzed++;

      // Report progress
      if (analyzed % chunkSize === 0 || analyzed === scripts.length) {
        self.postMessage({
          type: 'progress',
          data: {
            analyzed,
            total: scripts.length,
            tokensFound: foundTokens.length,
          },
        });
      }
    }

    // Send completion
    self.postMessage({
      type: 'complete',
      data: {
        tokens: foundTokens,
        scriptsAnalyzed: analyzed,
      },
    });

  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message,
    });
  }
}

/**
 * Analyze a single script for tokens
 */
function analyzeScript(content, scriptUrl) {
  const tokens = [];

  for (const [type, regexList] of Object.entries(TOKEN_PATTERNS)) {
    for (const regex of regexList) {
      // Reset regex lastIndex
      regex.lastIndex = 0;

      let match;
      let iterations = 0;
      const maxIterations = 1000;

      while ((match = regex.exec(content)) !== null && iterations < maxIterations) {
        iterations++;

        const value = match[2] || match[1] || match[0];

        // Get context
        const matchIndex = match.index;
        const contextStart = Math.max(0, matchIndex - 100);
        const contextEnd = Math.min(content.length, matchIndex + match[0].length + 100);
        const context = content.substring(contextStart, contextEnd).replace(/\s+/g, ' ');

        // Check for false positives
        if (isFalsePositive(value, context)) {
          continue;
        }

        // Skip duplicates within same script
        const isDuplicate = tokens.some(t =>
          t.value === value && t.scriptUrl === scriptUrl
        );

        if (!isDuplicate && value.length > 10) {
          tokens.push({
            type,
            value,
            scriptUrl,
            severity: getTokenSeverity(type),
            location: getLineAndColumn(content, matchIndex),
            context: context.length < 200 ? context : context.substring(0, 200) + '...',
            timestamp: new Date().toISOString(),
          });
        }
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

// Export for testing
export { analyzeScript, getLineAndColumn };
