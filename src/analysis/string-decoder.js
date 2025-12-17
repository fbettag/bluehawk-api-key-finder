/**
 * BlueHawk API Key Finder - String Decoder Module
 *
 * Decodes obfuscated strings from various encoding methods
 * commonly used to hide secrets in JavaScript.
 */

/**
 * Decode hex escape sequences (\x41 -> A)
 * @param {string} str - String with hex escapes
 * @returns {string} Decoded string
 */
export function decodeHexEscapes(str) {
  return str.replace(/\\x([0-9a-fA-F]{2})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

/**
 * Decode unicode escape sequences (\u0041 -> A)
 * @param {string} str - String with unicode escapes
 * @returns {string} Decoded string
 */
export function decodeUnicodeEscapes(str) {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

/**
 * Decode octal escape sequences (\101 -> A)
 * @param {string} str - String with octal escapes
 * @returns {string} Decoded string
 */
export function decodeOctalEscapes(str) {
  return str.replace(/\\([0-7]{1,3})/g, (match, octal) => {
    const code = parseInt(octal, 8);
    return code <= 255 ? String.fromCharCode(code) : match;
  });
}

/**
 * Decode all escape sequences
 * @param {string} str - String with various escapes
 * @returns {string} Decoded string
 */
export function decodeAllEscapes(str) {
  let decoded = str;
  decoded = decodeHexEscapes(decoded);
  decoded = decodeUnicodeEscapes(decoded);
  decoded = decodeOctalEscapes(decoded);
  return decoded;
}

/**
 * Decode base64 string
 * @param {string} str - Base64 encoded string
 * @returns {string|null} Decoded string or null if invalid
 */
export function decodeBase64(str) {
  try {
    // Handle URL-safe base64
    let normalized = str.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    while (normalized.length % 4) {
      normalized += '=';
    }

    return atob(normalized);
  } catch {
    return null;
  }
}

/**
 * Decode a string that might be doubly or triply encoded
 * @param {string} str - Encoded string
 * @param {number} maxIterations - Maximum decode iterations
 * @returns {object} Decoded result with iterations
 */
export function decodeIteratively(str, maxIterations = 3) {
  let current = str;
  let iterations = 0;
  const history = [str];

  for (let i = 0; i < maxIterations; i++) {
    // Try base64 first
    const base64Decoded = decodeBase64(current);
    if (base64Decoded && base64Decoded !== current && isPrintable(base64Decoded)) {
      current = base64Decoded;
      iterations++;
      history.push(current);
      continue;
    }

    // Try escape sequences
    const escapeDecoded = decodeAllEscapes(current);
    if (escapeDecoded !== current) {
      current = escapeDecoded;
      iterations++;
      history.push(current);
      continue;
    }

    // No more decoding possible
    break;
  }

  return {
    original: str,
    decoded: current,
    iterations,
    history
  };
}

/**
 * Check if string is printable
 * @param {string} str - String to check
 * @returns {boolean} True if mostly printable
 */
function isPrintable(str) {
  if (!str) return false;
  const printable = str.replace(/[^\x20-\x7E\n\r\t]/g, '');
  return printable.length / str.length > 0.8;
}

/**
 * Extract and decode strings from JavaScript string array pattern
 * @param {string} code - JavaScript code
 * @param {object} stringArrayInfo - Info from obfuscation detector
 * @returns {Array} Decoded strings
 */
export function decodeStringArray(code, stringArrayInfo) {
  const { strings, arrayName } = stringArrayInfo;
  const decoded = [];

  for (let i = 0; i < strings.length; i++) {
    const original = strings[i];
    const result = decodeIteratively(original);

    decoded.push({
      index: i,
      original,
      decoded: result.decoded,
      iterations: result.iterations
    });
  }

  return decoded;
}

/**
 * Decode char code arrays like String.fromCharCode(72,101,108,108,111)
 * @param {string} code - JavaScript code
 * @returns {Array} Found and decoded strings
 */
export function decodeCharCodeCalls(code) {
  const findings = [];

  // Pattern for String.fromCharCode(...)
  const pattern = /String\.fromCharCode\s*\(\s*([\d,\s]+)\s*\)/g;
  let match;

  while ((match = pattern.exec(code)) !== null) {
    try {
      const charCodes = match[1]
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n));

      if (charCodes.length > 0) {
        const decoded = String.fromCharCode(...charCodes);
        findings.push({
          original: match[0],
          decoded,
          position: match.index
        });
      }
    } catch {
      // Skip invalid patterns
    }
  }

  return findings;
}

/**
 * Decode parseInt chains like parseInt("abc123", 36)
 * @param {string} code - JavaScript code
 * @returns {Array} Found and decoded values
 */
export function decodeParseIntBase36(code) {
  const findings = [];

  // Pattern for parseInt with base 36
  const pattern = /parseInt\s*\(\s*["']([a-z0-9]+)["']\s*,\s*36\s*\)/gi;
  let match;

  while ((match = pattern.exec(code)) !== null) {
    try {
      const decoded = parseInt(match[1], 36);
      findings.push({
        original: match[0],
        decoded: decoded.toString(),
        position: match.index
      });
    } catch {
      // Skip invalid patterns
    }
  }

  return findings;
}

/**
 * Find and decode eval(atob(...)) patterns
 * @param {string} code - JavaScript code
 * @returns {Array} Found and decoded strings
 */
export function decodeEvalAtob(code) {
  const findings = [];

  // Pattern for eval(atob("..."))
  const pattern = /eval\s*\(\s*atob\s*\(\s*["']([A-Za-z0-9+/=]+)["']\s*\)\s*\)/g;
  let match;

  while ((match = pattern.exec(code)) !== null) {
    const decoded = decodeBase64(match[1]);
    if (decoded) {
      findings.push({
        original: match[0],
        decoded,
        position: match.index,
        type: 'eval_atob'
      });
    }
  }

  return findings;
}

/**
 * Find and decode Function(atob(...))() patterns
 * @param {string} code - JavaScript code
 * @returns {Array} Found and decoded strings
 */
export function decodeFunctionAtob(code) {
  const findings = [];

  // Pattern for Function(atob("..."))()
  const pattern = /Function\s*\(\s*atob\s*\(\s*["']([A-Za-z0-9+/=]+)["']\s*\)\s*\)\s*\(\s*\)/g;
  let match;

  while ((match = pattern.exec(code)) !== null) {
    const decoded = decodeBase64(match[1]);
    if (decoded) {
      findings.push({
        original: match[0],
        decoded,
        position: match.index,
        type: 'function_atob'
      });
    }
  }

  return findings;
}

/**
 * Find all encoded strings in code and attempt to decode
 * @param {string} code - JavaScript code
 * @returns {object} All decoded findings
 */
export function findAndDecodeStrings(code) {
  const results = {
    escapedStrings: [],
    base64Strings: [],
    charCodeCalls: [],
    evalAtob: [],
    functionAtob: [],
    parseIntBase36: []
  };

  // Find strings with escape sequences
  const stringPattern = /(["'])(?:[^\\]|\\.)*?\1/g;
  let match;

  while ((match = stringPattern.exec(code)) !== null) {
    const str = match[0];
    const inner = str.slice(1, -1); // Remove quotes

    // Check for escape sequences
    if (/\\[xuX]/.test(inner) || /\\[0-7]/.test(inner)) {
      const decoded = decodeAllEscapes(inner);
      if (decoded !== inner) {
        results.escapedStrings.push({
          original: str,
          decoded,
          position: match.index
        });
      }
    }

    // Check for base64-like strings
    if (inner.length >= 20 && /^[A-Za-z0-9+/=]+$/.test(inner)) {
      const decoded = decodeBase64(inner);
      if (decoded && isPrintable(decoded)) {
        results.base64Strings.push({
          original: str,
          decoded,
          position: match.index
        });
      }
    }
  }

  // Find specific patterns
  results.charCodeCalls = decodeCharCodeCalls(code);
  results.evalAtob = decodeEvalAtob(code);
  results.functionAtob = decodeFunctionAtob(code);
  results.parseIntBase36 = decodeParseIntBase36(code);

  return results;
}

/**
 * Apply string decoding to code (for analysis, not execution)
 * @param {string} code - JavaScript code
 * @returns {object} Decoded code and metadata
 */
export function decodeStringsInCode(code) {
  let decoded = code;
  let replacements = 0;

  // Decode hex escapes in string literals
  decoded = decoded.replace(/(["'])([^"']*\\x[^"']*)\1/g, (match, quote, content) => {
    const decodedContent = decodeHexEscapes(content);
    if (decodedContent !== content) {
      replacements++;
      return quote + decodedContent + quote;
    }
    return match;
  });

  // Decode unicode escapes in string literals
  decoded = decoded.replace(/(["'])([^"']*\\u[^"']*)\1/g, (match, quote, content) => {
    const decodedContent = decodeUnicodeEscapes(content);
    if (decodedContent !== content) {
      replacements++;
      return quote + decodedContent + quote;
    }
    return match;
  });

  return {
    original: code,
    decoded,
    replacements,
    wasModified: replacements > 0
  };
}

/**
 * Scan decoded strings for potential secrets
 * @param {object} decodedResults - Results from findAndDecodeStrings
 * @returns {Array} Potential secrets found in decoded strings
 */
export function scanDecodedForSecrets(decodedResults) {
  const secrets = [];

  const secretPatterns = [
    { name: 'AWS Key', pattern: /AKIA[A-Z0-9]{16}/ },
    { name: 'GitHub Token', pattern: /ghp_[a-zA-Z0-9]{36}/ },
    { name: 'Google API Key', pattern: /AIza[A-Za-z0-9_-]{35}/ },
    { name: 'Stripe Key', pattern: /sk_live_[0-9a-zA-Z]{24,}/ },
    { name: 'JWT', pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\./ },
    { name: 'Private Key', pattern: /-----BEGIN.*PRIVATE KEY-----/ },
    { name: 'API Key Assignment', pattern: /api[_-]?key['":\s]+['"]?([a-zA-Z0-9_-]{20,})['"]?/i },
    { name: 'Password Assignment', pattern: /password['":\s]+['"]([^'"]{8,})['"]?/i },
  ];

  // Check all decoded strings
  const allDecoded = [
    ...decodedResults.escapedStrings,
    ...decodedResults.base64Strings,
    ...decodedResults.charCodeCalls,
    ...decodedResults.evalAtob,
    ...decodedResults.functionAtob
  ];

  for (const item of allDecoded) {
    const text = item.decoded;

    for (const { name, pattern } of secretPatterns) {
      const match = text.match(pattern);
      if (match) {
        secrets.push({
          type: name,
          value: match[0],
          decodedFrom: item.original.substring(0, 50) + (item.original.length > 50 ? '...' : ''),
          position: item.position
        });
      }
    }
  }

  return secrets;
}

export default {
  decodeHexEscapes,
  decodeUnicodeEscapes,
  decodeOctalEscapes,
  decodeAllEscapes,
  decodeBase64,
  decodeIteratively,
  decodeStringArray,
  decodeCharCodeCalls,
  decodeParseIntBase36,
  decodeEvalAtob,
  decodeFunctionAtob,
  findAndDecodeStrings,
  decodeStringsInCode,
  scanDecodedForSecrets
};
