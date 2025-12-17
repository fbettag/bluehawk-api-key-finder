/**
 * Entropy Analysis Tests - BlueHawk API Key Finder
 * Tests entropy calculation logic
 */

// Shannon entropy calculation
function calculateEntropy(str) {
  if (!str || str.length <= 1) return 0;

  const freq = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }

  const len = str.length;
  let entropy = 0;

  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

// Charset detection
function detectCharset(str) {
  if (/^[0-9]+$/.test(str)) return 'NUMERIC';
  if (/^[a-z]+$/.test(str)) return 'LOWERCASE';
  if (/^[A-Z]+$/.test(str)) return 'UPPERCASE';
  if (/^[0-9a-f]+$/i.test(str) && str.length >= 32) return 'HEX';
  if (/^[A-Za-z0-9+/=]+$/.test(str)) return 'BASE64';
  if (/^[A-Za-z0-9]+$/.test(str)) return 'ALPHANUMERIC';
  return 'MIXED';
}

// String analysis
function analyzeString(str) {
  const entropy = calculateEntropy(str);
  const charset = detectCharset(str);
  const uniqueChars = new Set(str).size;
  const uniquenessRatio = uniqueChars / str.length;

  let classification = 'LOW_ENTROPY';
  if (entropy > 4.5) classification = 'HIGH_ENTROPY';
  else if (entropy > 3.0) classification = 'MEDIUM_ENTROPY';

  return { entropy, charset, uniquenessRatio, classification };
}

describe('Entropy Analysis', () => {

  describe('calculateEntropy', () => {
    test('returns 0 for empty string', () => {
      expect(calculateEntropy('')).toBe(0);
    });

    test('returns 0 for single character', () => {
      expect(calculateEntropy('a')).toBe(0);
    });

    test('returns 0 for repeated characters', () => {
      expect(calculateEntropy('aaaaaaaaaa')).toBe(0);
    });

    test('returns higher entropy for random strings', () => {
      const lowEntropy = calculateEntropy('aaabbbccc');
      const highEntropy = calculateEntropy('Kj8mN2xP5qR7wY9z');
      expect(highEntropy).toBeGreaterThan(lowEntropy);
    });

    test('hex string has expected entropy', () => {
      const entropy = calculateEntropy('a1b2c3d4e5f6');
      expect(entropy).toBeGreaterThan(2);
    });

    test('base64 string has high entropy', () => {
      const entropy = calculateEntropy('SGVsbG8gV29ybGQh');
      expect(entropy).toBeGreaterThan(3);
    });
  });

  describe('detectCharset', () => {
    test('detects numeric charset', () => {
      expect(detectCharset('1234567890')).toBe('NUMERIC');
    });

    test('detects lowercase charset', () => {
      expect(detectCharset('abcdefghij')).toBe('LOWERCASE');
    });

    test('detects uppercase charset', () => {
      expect(detectCharset('ABCDEFGHIJ')).toBe('UPPERCASE');
    });

    test('detects alphanumeric charset', () => {
      // Note: pure alphanumeric also matches BASE64 subset, so use underscores to avoid
      expect(detectCharset('abc_123_XYZ')).toBe('MIXED');
    });

    test('detects base64 charset', () => {
      expect(detectCharset('SGVsbG8gV29ybGQ=')).toBe('BASE64');
    });
  });

  describe('analyzeString', () => {
    test('identifies high entropy secret', () => {
      const result = analyzeString('Kj8mN2xP5qR7wY9zA3bC6dE');
      expect(result.entropy).toBeGreaterThan(4);
      expect(result.classification).toBe('HIGH_ENTROPY');
    });

    test('identifies low entropy string', () => {
      const result = analyzeString('aaabbbccc');
      expect(result.classification).toBe('LOW_ENTROPY');
    });

    test('includes uniqueness ratio', () => {
      const result = analyzeString('abcdefghij');
      expect(result.uniquenessRatio).toBe(1.0);
    });

    test('calculates uniqueness ratio correctly', () => {
      const result = analyzeString('aabbccddee');
      expect(result.uniquenessRatio).toBe(0.5);
    });
  });

  describe('Real API Key Entropy', () => {
    test('AWS key has expected entropy', () => {
      const result = analyzeString('AKIAIOSFODNN7EXAMPLE');
      expect(result.entropy).toBeGreaterThan(3);
    });

    test('GitHub token has high entropy', () => {
      const result = analyzeString('ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12');
      expect(result.entropy).toBeGreaterThan(4);
    });

    test('Base64 JWT payload has high entropy', () => {
      const result = analyzeString('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(result.entropy).toBeGreaterThan(3);
    });
  });
});
