/**
 * BlueHawk API Key Finder - Source Map Analyzer Module
 *
 * Parses source maps to extract original, unminified source code
 * for more accurate secret detection.
 */

// Lazy-loaded source-map library
let SourceMapConsumer = null;

/**
 * Lazy load the source-map library
 */
async function loadSourceMapLibrary() {
  if (!SourceMapConsumer) {
    const sourceMap = await import('source-map');
    SourceMapConsumer = sourceMap.SourceMapConsumer;

    // Initialize the WASM-based source-map library
    if (typeof SourceMapConsumer.initialize === 'function') {
      SourceMapConsumer.initialize({
        'lib/mappings.wasm': 'https://unpkg.com/source-map@0.7.4/lib/mappings.wasm'
      });
    }
  }
  return SourceMapConsumer;
}

/**
 * Check if source-map library is available
 */
export async function isSourceMapAvailable() {
  try {
    await loadSourceMapLibrary();
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract source map URL from script content
 * @param {string} scriptContent - JavaScript source code
 * @returns {string|null} Source map URL or null
 */
export function extractSourceMapUrl(scriptContent) {
  // Check for sourceMappingURL comment
  const patterns = [
    // Standard inline or URL reference
    /\/\/[#@]\s*sourceMappingURL=(.+?)(?:\s|$)/,
    // Block comment version
    /\/\*[#@]\s*sourceMappingURL=(.+?)\s*\*\//,
  ];

  for (const pattern of patterns) {
    const match = scriptContent.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Resolve source map URL relative to script URL
 * @param {string} scriptUrl - URL of the JavaScript file
 * @param {string} sourceMapUrl - Source map URL (may be relative)
 * @returns {string} Absolute source map URL
 */
export function resolveSourceMapUrl(scriptUrl, sourceMapUrl) {
  // If already absolute, return as-is
  if (sourceMapUrl.startsWith('http://') || sourceMapUrl.startsWith('https://')) {
    return sourceMapUrl;
  }

  // Handle data URLs
  if (sourceMapUrl.startsWith('data:')) {
    return sourceMapUrl;
  }

  // Resolve relative URL
  try {
    return new URL(sourceMapUrl, scriptUrl).href;
  } catch {
    // If URL construction fails, try manual resolution
    const basePath = scriptUrl.substring(0, scriptUrl.lastIndexOf('/') + 1);
    return basePath + sourceMapUrl;
  }
}

/**
 * Fetch source map from URL
 * @param {string} url - Source map URL
 * @returns {Promise<object|null>} Parsed source map or null
 */
export async function fetchSourceMap(url) {
  // Handle data URLs
  if (url.startsWith('data:')) {
    try {
      // Extract base64 data
      const match = url.match(/^data:application\/json;(?:charset=utf-8;)?base64,(.+)$/i);
      if (match) {
        const decoded = atob(match[1]);
        return JSON.parse(decoded);
      }

      // Try URL-encoded format
      const urlMatch = url.match(/^data:application\/json,(.+)$/i);
      if (urlMatch) {
        return JSON.parse(decodeURIComponent(urlMatch[1]));
      }

      return null;
    } catch (error) {
      console.warn('[BlueHawk SourceMap] Failed to parse data URL:', error.message);
      return null;
    }
  }

  // Fetch from URL
  try {
    const response = await fetch(url, {
      credentials: 'omit', // Don't send cookies to source map URLs
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('[BlueHawk SourceMap] Failed to fetch:', url, error.message);
    return null;
  }
}

/**
 * Try to find source map for a script
 * @param {string} scriptUrl - URL of the script
 * @param {string} scriptContent - Content of the script (optional)
 * @returns {Promise<object|null>} Source map data or null
 */
export async function findSourceMap(scriptUrl, scriptContent = null) {
  // 1. Check for sourceMappingURL in content
  if (scriptContent) {
    const inlineUrl = extractSourceMapUrl(scriptContent);
    if (inlineUrl) {
      const resolvedUrl = resolveSourceMapUrl(scriptUrl, inlineUrl);
      const sourceMap = await fetchSourceMap(resolvedUrl);
      if (sourceMap) {
        return { sourceMap, url: resolvedUrl, method: 'inline' };
      }
    }
  }

  // 2. Try conventional .map extension
  const mapUrl = scriptUrl + '.map';
  const mapFromExt = await fetchSourceMap(mapUrl);
  if (mapFromExt) {
    return { sourceMap: mapFromExt, url: mapUrl, method: 'extension' };
  }

  // 3. Try replacing .js with .js.map
  if (scriptUrl.endsWith('.js')) {
    const altMapUrl = scriptUrl.replace(/\.js$/, '.js.map');
    if (altMapUrl !== mapUrl) {
      const altMap = await fetchSourceMap(altMapUrl);
      if (altMap) {
        return { sourceMap: altMap, url: altMapUrl, method: 'extension_alt' };
      }
    }
  }

  // 4. Try X-SourceMap header (would need to be passed in from fetch)

  return null;
}

/**
 * Parse source map and extract original sources
 * @param {object} rawSourceMap - Raw source map JSON
 * @returns {Promise<object>} Parsed source map with sources
 */
export async function parseSourceMap(rawSourceMap) {
  const Consumer = await loadSourceMapLibrary();

  const result = {
    sources: [],
    sourcesContent: [],
    mappings: null,
    file: rawSourceMap.file || null,
    sourceRoot: rawSourceMap.sourceRoot || ''
  };

  try {
    const consumer = await new Consumer(rawSourceMap);

    // Extract source file names
    result.sources = consumer.sources || [];

    // Extract source content
    result.sourcesContent = [];
    for (let i = 0; i < result.sources.length; i++) {
      const source = result.sources[i];
      const content = consumer.sourceContentFor(source, true);
      result.sourcesContent.push({
        path: source,
        content: content || null
      });
    }

    // Store the consumer for position mapping
    result.consumer = consumer;

    return result;
  } catch (error) {
    console.warn('[BlueHawk SourceMap] Parse error:', error.message);
    result.error = error.message;
    return result;
  }
}

/**
 * Analyze source map for secrets in original sources
 * @param {object} rawSourceMap - Raw source map data
 * @param {object} options - Analysis options
 * @returns {Promise<object>} Analysis results
 */
export async function analyzeSourceMap(rawSourceMap, options = {}) {
  const {
    scanPatterns = true,
    minLength = 8,
    onProgress
  } = options;

  const parsed = await parseSourceMap(rawSourceMap);

  const results = {
    parsed,
    sources: [],
    findings: [],
    error: parsed.error || null
  };

  if (parsed.error) {
    return results;
  }

  // Analyze each source file
  const totalSources = parsed.sourcesContent.length;

  for (let i = 0; i < totalSources; i++) {
    const { path, content } = parsed.sourcesContent[i];

    if (!content) {
      results.sources.push({
        path,
        analyzed: false,
        reason: 'No content available'
      });
      continue;
    }

    const sourceResult = {
      path,
      analyzed: true,
      size: content.length,
      findings: []
    };

    // Look for secrets in original source
    if (scanPatterns) {
      sourceResult.findings = scanSourceForSecrets(content, path);
    }

    results.sources.push(sourceResult);

    // Add to global findings
    results.findings.push(...sourceResult.findings);

    if (onProgress) {
      onProgress(i + 1, totalSources);
    }
  }

  // Clean up consumer
  if (parsed.consumer && parsed.consumer.destroy) {
    parsed.consumer.destroy();
  }

  return results;
}

/**
 * Scan source content for secrets
 * @param {string} content - Source code content
 * @param {string} sourcePath - Path of the source file
 * @returns {Array} Array of findings
 */
function scanSourceForSecrets(content, sourcePath) {
  const findings = [];

  // Patterns for common secrets
  const patterns = [
    { name: 'AWS Access Key', pattern: /(AKIA|ASIA)[A-Z0-9]{16}/g },
    { name: 'AWS Secret Key', pattern: /[A-Za-z0-9/+=]{40}/g, context: /aws|secret/i },
    { name: 'GitHub Token', pattern: /ghp_[a-zA-Z0-9]{36}/g },
    { name: 'GitHub OAuth', pattern: /gho_[a-zA-Z0-9]{36}/g },
    { name: 'Google API Key', pattern: /AIza[A-Za-z0-9_-]{35}/g },
    { name: 'Stripe Key', pattern: /sk_live_[0-9a-zA-Z]{24,}/g },
    { name: 'Stripe Test Key', pattern: /sk_test_[0-9a-zA-Z]{24,}/g },
    { name: 'Slack Token', pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g },
    { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g },
    { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g },
    { name: 'Generic API Key', pattern: /['"](api[_-]?key|apikey)['"]:\s*['"]([a-zA-Z0-9_-]{20,})['"]/gi },
    { name: 'Generic Secret', pattern: /['"](?:secret|token|password)['"]:\s*['"]([a-zA-Z0-9_-]{16,})['"]/gi },
  ];

  // Get line numbers for matches
  const lines = content.split('\n');
  const lineOffsets = [];
  let offset = 0;
  for (const line of lines) {
    lineOffsets.push(offset);
    offset += line.length + 1; // +1 for newline
  }

  function getLineNumber(charOffset) {
    for (let i = lineOffsets.length - 1; i >= 0; i--) {
      if (lineOffsets[i] <= charOffset) {
        return i + 1; // 1-based line numbers
      }
    }
    return 1;
  }

  for (const { name, pattern, context } of patterns) {
    // Reset regex
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      // If context pattern specified, check surrounding text
      if (context) {
        const start = Math.max(0, match.index - 100);
        const end = Math.min(content.length, match.index + match[0].length + 100);
        const surrounding = content.substring(start, end);
        if (!context.test(surrounding)) {
          continue;
        }
      }

      const lineNumber = getLineNumber(match.index);

      findings.push({
        type: name,
        value: match[0],
        source: sourcePath,
        line: lineNumber,
        column: match.index - (lineOffsets[lineNumber - 1] || 0),
        analysisType: 'sourcemap'
      });
    }
  }

  return findings;
}

/**
 * Full workflow: find, fetch, and analyze source map for a script
 * @param {string} scriptUrl - URL of the script
 * @param {string} scriptContent - Content of the script (optional)
 * @param {object} options - Analysis options
 * @returns {Promise<object>} Complete analysis results
 */
export async function analyzeScriptSourceMap(scriptUrl, scriptContent = null, options = {}) {
  const result = {
    scriptUrl,
    sourceMapFound: false,
    sourceMapUrl: null,
    analysis: null,
    error: null
  };

  try {
    // Find source map
    const sourceMapInfo = await findSourceMap(scriptUrl, scriptContent);

    if (!sourceMapInfo) {
      result.error = 'No source map found';
      return result;
    }

    result.sourceMapFound = true;
    result.sourceMapUrl = sourceMapInfo.url;
    result.sourceMapMethod = sourceMapInfo.method;

    // Analyze the source map
    result.analysis = await analyzeSourceMap(sourceMapInfo.sourceMap, options);

    return result;
  } catch (error) {
    result.error = error.message;
    return result;
  }
}

/**
 * Batch analyze multiple scripts for source maps
 * @param {Array} scripts - Array of {url, content} objects
 * @param {object} options - Analysis options
 * @returns {Promise<Array>} Array of analysis results
 */
export async function batchAnalyzeSourceMaps(scripts, options = {}) {
  const { maxConcurrency = 3, onProgress } = options;

  const results = [];
  const queue = [...scripts];
  let completed = 0;

  async function processNext() {
    const script = queue.shift();
    if (!script) return;

    const result = await analyzeScriptSourceMap(script.url, script.content, options);
    results.push(result);

    completed++;
    if (onProgress) {
      onProgress(completed, scripts.length);
    }

    if (queue.length > 0) {
      await processNext();
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(maxConcurrency, scripts.length); i++) {
    workers.push(processNext());
  }

  await Promise.all(workers);

  return results;
}

export default {
  isSourceMapAvailable,
  extractSourceMapUrl,
  resolveSourceMapUrl,
  fetchSourceMap,
  findSourceMap,
  parseSourceMap,
  analyzeSourceMap,
  analyzeScriptSourceMap,
  batchAnalyzeSourceMaps
};
