/**
 * BlueHawk API Key Finder - WebAssembly Analyzer Module
 *
 * Parses WebAssembly binaries to extract embedded strings
 * from the Data Section for secret detection.
 */

// Lazy-loaded WASM parser
let wasmParser = null;

/**
 * Lazy load the WASM parser
 */
async function loadWasmParser() {
  if (!wasmParser) {
    wasmParser = await import('@webassemblyjs/wasm-parser');
  }
  return wasmParser;
}

/**
 * Check if WASM parser is available
 */
export async function isWasmParserAvailable() {
  try {
    await loadWasmParser();
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract printable ASCII strings from a buffer
 * @param {Uint8Array} buffer - Binary data
 * @param {number} minLength - Minimum string length
 * @returns {Array} Array of {value, offset} objects
 */
export function extractStringsFromBuffer(buffer, minLength = 8) {
  const strings = [];
  let currentString = '';
  let startOffset = 0;

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];

    // Check if printable ASCII (32-126)
    if (byte >= 32 && byte <= 126) {
      if (currentString.length === 0) {
        startOffset = i;
      }
      currentString += String.fromCharCode(byte);
    } else {
      // End of string
      if (currentString.length >= minLength) {
        strings.push({
          value: currentString,
          offset: startOffset,
          length: currentString.length
        });
      }
      currentString = '';
    }
  }

  // Check last string
  if (currentString.length >= minLength) {
    strings.push({
      value: currentString,
      offset: startOffset,
      length: currentString.length
    });
  }

  return strings;
}

/**
 * Extract strings from WASM data section
 * @param {ArrayBuffer} wasmBuffer - WebAssembly binary
 * @returns {Promise<Array>} Array of extracted strings
 */
export async function extractWasmStrings(wasmBuffer) {
  const parser = await loadWasmParser();
  const strings = [];

  try {
    // Decode WASM binary into AST
    const ast = parser.decode(wasmBuffer);

    // Find the module body
    const moduleBody = ast.body?.[0];
    if (!moduleBody || moduleBody.type !== 'Module') {
      return strings;
    }

    // Process each section
    for (const field of moduleBody.fields || []) {
      // Data section (section ID 11) contains initialized data
      if (field.type === 'Data') {
        const data = field.init;

        if (data && data.length > 0) {
          // Data can be an array of bytes
          const bytes = new Uint8Array(data.length);
          for (let i = 0; i < data.length; i++) {
            bytes[i] = data[i];
          }

          // Extract strings from this data segment
          const segmentStrings = extractStringsFromBuffer(bytes);
          for (const str of segmentStrings) {
            strings.push({
              ...str,
              section: 'data',
              segmentIndex: field.index || 0
            });
          }
        }
      }

      // Memory section can also contain initialized data
      if (field.type === 'Memory' && field.init) {
        const bytes = new Uint8Array(field.init);
        const segmentStrings = extractStringsFromBuffer(bytes);
        for (const str of segmentStrings) {
          strings.push({
            ...str,
            section: 'memory'
          });
        }
      }
    }
  } catch (error) {
    console.warn('[BlueHawk WASM] Parse error:', error.message);
  }

  return strings;
}

/**
 * Analyze a WASM binary for potential secrets
 * @param {ArrayBuffer|Uint8Array} wasmData - WASM binary data
 * @param {object} options - Analysis options
 * @returns {Promise<object>} Analysis results
 */
export async function analyzeWasm(wasmData, options = {}) {
  const {
    minStringLength = 8,
    onProgress
  } = options;

  // Convert to ArrayBuffer if needed
  let buffer;
  if (wasmData instanceof ArrayBuffer) {
    buffer = wasmData;
  } else if (wasmData instanceof Uint8Array) {
    buffer = wasmData.buffer.slice(
      wasmData.byteOffset,
      wasmData.byteOffset + wasmData.byteLength
    );
  } else {
    throw new Error('Invalid WASM data type');
  }

  const results = {
    strings: [],
    potentialSecrets: [],
    metadata: {
      size: buffer.byteLength,
      parsedAt: Date.now()
    }
  };

  // Check if this is actually a WASM file
  const view = new Uint8Array(buffer);
  const wasmMagic = [0x00, 0x61, 0x73, 0x6D]; // \0asm
  const isWasm = wasmMagic.every((byte, i) => view[i] === byte);

  if (!isWasm) {
    results.error = 'Not a valid WebAssembly file';
    return results;
  }

  // Try structured parsing first
  try {
    const structuredStrings = await extractWasmStrings(buffer);
    results.strings.push(...structuredStrings);
  } catch {
    // Fall back to raw string extraction
    const rawStrings = extractStringsFromBuffer(view, minStringLength);
    results.strings.push(...rawStrings);
  }

  if (onProgress) onProgress(50, 100);

  // Filter for potential secrets
  results.potentialSecrets = filterPotentialSecrets(results.strings);

  if (onProgress) onProgress(100, 100);

  return results;
}

/**
 * Filter extracted strings for potential secrets
 * @param {Array} strings - Extracted strings
 * @returns {Array} Filtered potential secrets
 */
function filterPotentialSecrets(strings) {
  const secrets = [];

  // Patterns that suggest secrets
  const secretPatterns = [
    // API key prefixes
    { pattern: /^(sk|pk|rk|ak)[-_]/, name: 'API Key Prefix' },
    { pattern: /^AKIA[A-Z0-9]{16}$/, name: 'AWS Access Key' },
    { pattern: /^ghp_[a-zA-Z0-9]{36}$/, name: 'GitHub Token' },
    { pattern: /^AIza[A-Za-z0-9_-]{35}$/, name: 'Google API Key' },
    { pattern: /^xox[baprs]-/, name: 'Slack Token' },
    { pattern: /^sk-[a-zA-Z0-9]{20,}$/, name: 'OpenAI Key' },

    // Generic patterns
    { pattern: /^[A-Fa-f0-9]{32,64}$/, name: 'Hex String' },
    { pattern: /^[A-Za-z0-9+/]{40,}={0,2}$/, name: 'Base64 String' },

    // JWT pattern
    { pattern: /^eyJ[A-Za-z0-9_-]+\.eyJ/, name: 'JWT Token' },

    // Connection strings
    { pattern: /^(mongodb|redis|postgres|mysql):\/\//, name: 'Database URI' },
    { pattern: /^https?:\/\/[^:]+:[^@]+@/, name: 'URL with Credentials' },
  ];

  // Keywords in the string that suggest it might be secret
  const secretKeywords = [
    'password', 'secret', 'apikey', 'api_key', 'token',
    'private', 'credential', 'auth'
  ];

  for (const str of strings) {
    const { value } = str;
    let matched = false;
    let matchInfo = null;

    // Check against patterns
    for (const { pattern, name } of secretPatterns) {
      if (pattern.test(value)) {
        matched = true;
        matchInfo = { type: 'pattern', name };
        break;
      }
    }

    // Check for keyword proximity (if string looks random and near keyword)
    if (!matched && value.length >= 16 && value.length <= 100) {
      const hasRandomness = /[A-Za-z]/.test(value) &&
                            /\d/.test(value) &&
                            new Set(value).size > value.length * 0.5;

      if (hasRandomness) {
        matched = true;
        matchInfo = { type: 'heuristic', name: 'High Entropy String' };
      }
    }

    if (matched) {
      secrets.push({
        ...str,
        matchInfo,
        confidence: matchInfo.type === 'pattern' ? 'high' : 'medium'
      });
    }
  }

  return secrets;
}

/**
 * Fetch and analyze a WASM file from URL
 * @param {string} url - URL of WASM file
 * @param {object} options - Analysis options
 * @returns {Promise<object>} Analysis results
 */
export async function analyzeWasmFromUrl(url, options = {}) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const results = await analyzeWasm(buffer, options);

    return {
      ...results,
      url,
      fetchedAt: Date.now()
    };
  } catch (error) {
    return {
      url,
      error: error.message,
      strings: [],
      potentialSecrets: []
    };
  }
}

/**
 * Detect WASM files in the current page
 * @returns {Array} Array of WASM file URLs
 */
export function detectWasmFiles() {
  const wasmUrls = [];

  // Check script tags with type="application/wasm"
  const wasmScripts = document.querySelectorAll('script[type="application/wasm"]');
  for (const script of wasmScripts) {
    if (script.src) {
      wasmUrls.push(script.src);
    }
  }

  // Look for .wasm files in other script sources
  const allScripts = document.querySelectorAll('script[src]');
  for (const script of allScripts) {
    const src = script.src;
    if (src.endsWith('.wasm') || src.includes('.wasm?')) {
      wasmUrls.push(src);
    }
  }

  // Check link tags
  const links = document.querySelectorAll('link[href]');
  for (const link of links) {
    const href = link.href;
    if (href.endsWith('.wasm') || href.includes('.wasm?')) {
      wasmUrls.push(href);
    }
  }

  return [...new Set(wasmUrls)]; // Deduplicate
}

/**
 * Batch analyze multiple WASM files
 * @param {string[]} urls - Array of WASM URLs
 * @param {object} options - Analysis options
 * @returns {Promise<Array>} Array of analysis results
 */
export async function batchAnalyzeWasm(urls, options = {}) {
  const { maxConcurrency = 3, onProgress } = options;

  const results = [];
  const queue = [...urls];
  let completed = 0;

  async function processNext() {
    const url = queue.shift();
    if (!url) return;

    const result = await analyzeWasmFromUrl(url, options);
    results.push(result);

    completed++;
    if (onProgress) {
      onProgress(completed, urls.length);
    }

    if (queue.length > 0) {
      await processNext();
    }
  }

  // Process with concurrency limit
  const workers = [];
  for (let i = 0; i < Math.min(maxConcurrency, urls.length); i++) {
    workers.push(processNext());
  }

  await Promise.all(workers);

  return results;
}

export default {
  isWasmParserAvailable,
  extractStringsFromBuffer,
  extractWasmStrings,
  analyzeWasm,
  analyzeWasmFromUrl,
  detectWasmFiles,
  batchAnalyzeWasm
};
