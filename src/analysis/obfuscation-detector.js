/**
 * BlueHawk API Key Finder - Obfuscation Detector Module
 *
 * Detects various JavaScript obfuscation patterns commonly used
 * to hide secrets and sensitive code.
 */

/**
 * Obfuscation signatures and patterns
 */
export const OBFUSCATION_SIGNATURES = {
  // javascript-obfuscator patterns
  STRING_ARRAY: {
    pattern: /var\s+_0x[a-f0-9]+\s*=\s*\[/i,
    name: 'String Array Pattern',
    tool: 'javascript-obfuscator'
  },
  STRING_ARRAY_CALLS: {
    pattern: /_0x[a-f0-9]+\s*\(\s*['"]0x[a-f0-9]+['"]\s*\)/g,
    name: 'String Array Access',
    tool: 'javascript-obfuscator'
  },
  HEX_VARS: {
    pattern: /_0x[a-f0-9]{4,8}/g,
    name: 'Hex Variable Names',
    tool: 'javascript-obfuscator'
  },
  ROTATE_FUNCTION: {
    pattern: /while\s*\(.*[+-]=\s*parseInt.*\)\s*{\s*[\w\d]+\.push\s*\(\s*[\w\d]+\.shift\s*\(\s*\)\s*\)/,
    name: 'Array Rotation Function',
    tool: 'javascript-obfuscator'
  },

  // JScrambler patterns
  JSCRAMBLER_SELF_DEFENDING: {
    pattern: /['"]removeCookie['"]|['"]getCookie['"]|['"]setCookie['"]/,
    name: 'JScrambler Self-Defending',
    tool: 'JScrambler'
  },

  // UglifyJS / Terser patterns (minification, not heavy obfuscation)
  MANGLED_VARS: {
    pattern: /\b[a-z]\d*\s*=/g,
    name: 'Mangled Variables',
    tool: 'minifier',
    isMinification: true
  },

  // Base64/Hex encoding patterns
  EVAL_ATOB: {
    pattern: /eval\s*\(\s*atob\s*\(/,
    name: 'Eval with Base64 Decode',
    tool: 'custom'
  },
  EVAL_UNESCAPE: {
    pattern: /eval\s*\(\s*unescape\s*\(/,
    name: 'Eval with Unescape',
    tool: 'custom'
  },
  FUNCTION_ATOB: {
    pattern: /Function\s*\(\s*atob\s*\(/,
    name: 'Function Constructor with Base64',
    tool: 'custom'
  },

  // Encoded string patterns
  UNICODE_ESCAPE: {
    pattern: /\\u[0-9a-fA-F]{4}/g,
    name: 'Unicode Escape Sequences',
    tool: 'encoding'
  },
  HEX_ESCAPE: {
    pattern: /\\x[0-9a-fA-F]{2}/g,
    name: 'Hex Escape Sequences',
    tool: 'encoding'
  },
  OCTAL_ESCAPE: {
    pattern: /\\[0-7]{3}/g,
    name: 'Octal Escape Sequences',
    tool: 'encoding'
  },

  // Control flow flattening
  SWITCH_CONTROL_FLOW: {
    pattern: /while\s*\(\s*!!\s*\[\s*\]\s*\)/,
    name: 'Control Flow Flattening',
    tool: 'javascript-obfuscator'
  },
  CASE_ARRAY_ACCESS: {
    pattern: /case\s+['"][^'"]+['"]\s*:/g,
    name: 'String Case Labels',
    tool: 'javascript-obfuscator'
  },

  // Dead code injection
  DEAD_CODE: {
    pattern: /if\s*\(\s*['"]\w+['"]\s*===?\s*['"]\w+['"]\s*\)/g,
    name: 'Dead Code Pattern',
    tool: 'javascript-obfuscator'
  },

  // Domain lock patterns
  DOMAIN_LOCK: {
    pattern: /window\s*\[\s*['"]location['"]\s*\]\s*\[\s*['"]hostname['"]\s*\]/,
    name: 'Domain Lock Pattern',
    tool: 'protection'
  },

  // Debug protection
  DEBUG_PROTECTION: {
    pattern: /setInterval\s*\(\s*function\s*\(\s*\)\s*{\s*debugger/,
    name: 'Debug Protection',
    tool: 'protection'
  },

  // Console disable
  CONSOLE_DISABLE: {
    pattern: /console\s*\[\s*['"](log|warn|error|info|debug)['"]\s*\]\s*=\s*function/,
    name: 'Console Disabling',
    tool: 'protection'
  }
};

/**
 * Detect obfuscation in code
 * @param {string} code - JavaScript code to analyze
 * @returns {object} Detection results
 */
export function detectObfuscation(code) {
  const results = {
    isObfuscated: false,
    confidence: 0,
    detections: [],
    summary: {
      tool: null,
      encoding: false,
      protection: false,
      minificationOnly: true
    }
  };

  if (!code || code.length < 50) {
    return results;
  }

  let obfuscationScore = 0;
  const tools = new Set();

  // Check each signature
  for (const [key, signature] of Object.entries(OBFUSCATION_SIGNATURES)) {
    const { pattern, name, tool, isMinification } = signature;

    // Reset pattern if it has global flag
    if (pattern.global) {
      pattern.lastIndex = 0;
    }

    // Count matches
    let matches = [];
    if (pattern.global) {
      matches = code.match(pattern) || [];
    } else {
      const match = code.match(pattern);
      if (match) matches = [match[0]];
    }

    if (matches.length > 0) {
      const detection = {
        signature: key,
        name,
        tool,
        matchCount: matches.length,
        isMinification: isMinification || false
      };

      results.detections.push(detection);
      tools.add(tool);

      // Score based on significance
      if (!isMinification) {
        obfuscationScore += 20;
        results.summary.minificationOnly = false;
      } else {
        obfuscationScore += 5;
      }

      // Extra weight for known obfuscator patterns
      if (tool === 'javascript-obfuscator') {
        obfuscationScore += 15;
      }

      if (tool === 'encoding') {
        results.summary.encoding = true;
      }

      if (tool === 'protection') {
        results.summary.protection = true;
      }
    }
  }

  // Additional heuristics
  const additionalMetrics = analyzeCodeMetrics(code);

  // High hex variable density suggests obfuscation
  if (additionalMetrics.hexVarRatio > 0.3) {
    obfuscationScore += 30;
  } else if (additionalMetrics.hexVarRatio > 0.1) {
    obfuscationScore += 15;
  }

  // Very short variable names with high density
  if (additionalMetrics.shortVarRatio > 0.5) {
    obfuscationScore += 10;
  }

  // Long strings with low readability
  if (additionalMetrics.avgStringLength > 50 && additionalMetrics.stringDensity > 0.3) {
    obfuscationScore += 20;
  }

  // Determine primary tool
  if (tools.has('javascript-obfuscator')) {
    results.summary.tool = 'javascript-obfuscator';
  } else if (tools.has('JScrambler')) {
    results.summary.tool = 'JScrambler';
  } else if (tools.has('custom')) {
    results.summary.tool = 'Custom Obfuscation';
  } else if (tools.has('minifier') && tools.size === 1) {
    results.summary.tool = 'Minifier Only';
  }

  // Set final results
  results.confidence = Math.min(100, obfuscationScore);
  results.isObfuscated = results.confidence >= 40;
  results.metrics = additionalMetrics;

  return results;
}

/**
 * Analyze code metrics for obfuscation detection
 * @param {string} code - JavaScript code
 * @returns {object} Code metrics
 */
function analyzeCodeMetrics(code) {
  // Count hex-style variable names
  const hexVars = code.match(/_0x[a-f0-9]+/gi) || [];
  const allVars = code.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || [];

  // Count short variable names (single letter or single letter + digits)
  const shortVars = code.match(/\b[a-zA-Z]\d*\b(?=\s*[=\(\[\.])/g) || [];

  // Count strings
  const strings = code.match(/(["'])(?:(?!\1)[^\\]|\\.)*\1/g) || [];
  const totalStringLength = strings.reduce((sum, s) => sum + s.length, 0);

  // Line length metrics
  const lines = code.split('\n');
  const avgLineLength = lines.reduce((sum, l) => sum + l.length, 0) / lines.length;

  return {
    hexVarCount: hexVars.length,
    hexVarRatio: allVars.length > 0 ? hexVars.length / allVars.length : 0,
    shortVarRatio: allVars.length > 0 ? shortVars.length / allVars.length : 0,
    stringCount: strings.length,
    avgStringLength: strings.length > 0 ? totalStringLength / strings.length : 0,
    stringDensity: totalStringLength / code.length,
    avgLineLength,
    lineCount: lines.length
  };
}

/**
 * Get obfuscation level description
 * @param {number} confidence - Confidence score (0-100)
 * @returns {string} Description
 */
export function getObfuscationLevel(confidence) {
  if (confidence >= 80) return 'Heavily Obfuscated';
  if (confidence >= 60) return 'Moderately Obfuscated';
  if (confidence >= 40) return 'Lightly Obfuscated';
  if (confidence >= 20) return 'Minified';
  return 'Not Obfuscated';
}

/**
 * Quick check if code appears obfuscated
 * @param {string} code - JavaScript code
 * @returns {boolean} True if likely obfuscated
 */
export function isObfuscated(code) {
  const result = detectObfuscation(code);
  return result.isObfuscated;
}

/**
 * Detect string array pattern and extract array content
 * @param {string} code - JavaScript code
 * @returns {object|null} String array info or null
 */
export function detectStringArray(code) {
  // Look for javascript-obfuscator string array pattern
  const arrayPattern = /var\s+(_0x[a-f0-9]+)\s*=\s*\[([\s\S]*?)\];/i;
  const match = code.match(arrayPattern);

  if (!match) return null;

  const arrayName = match[1];
  const arrayContent = match[2];

  // Extract string literals from array
  const strings = [];
  const stringPattern = /['"]([^'"]*)['"]/g;
  let stringMatch;

  while ((stringMatch = stringPattern.exec(arrayContent)) !== null) {
    strings.push(stringMatch[1]);
  }

  // Look for accessor function
  const accessorPattern = new RegExp(
    `function\\s+${arrayName.replace('0x', '0x')}\\s*\\(`,
    'i'
  );
  const hasAccessor = accessorPattern.test(code);

  return {
    arrayName,
    strings,
    stringCount: strings.length,
    hasAccessor
  };
}

/**
 * Analyze obfuscation and suggest deobfuscation approach
 * @param {string} code - JavaScript code
 * @returns {object} Analysis with suggestions
 */
export function analyzeForDeobfuscation(code) {
  const detection = detectObfuscation(code);

  const suggestions = [];

  if (detection.summary.encoding) {
    suggestions.push({
      action: 'decode_strings',
      description: 'Decode hex and unicode escape sequences',
      priority: 'high'
    });
  }

  const stringArray = detectStringArray(code);
  if (stringArray) {
    suggestions.push({
      action: 'resolve_string_array',
      description: `Resolve ${stringArray.stringCount} strings from array ${stringArray.arrayName}`,
      priority: 'high',
      data: stringArray
    });
  }

  if (detection.detections.some(d => d.signature === 'EVAL_ATOB')) {
    suggestions.push({
      action: 'decode_eval_atob',
      description: 'Decode eval(atob(...)) patterns',
      priority: 'high'
    });
  }

  if (detection.summary.protection) {
    suggestions.push({
      action: 'remove_protection',
      description: 'Remove debug and console protection',
      priority: 'low'
    });
  }

  return {
    ...detection,
    stringArray,
    suggestions
  };
}

export default {
  OBFUSCATION_SIGNATURES,
  detectObfuscation,
  getObfuscationLevel,
  isObfuscated,
  detectStringArray,
  analyzeForDeobfuscation
};
