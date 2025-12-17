/**
 * False Positive Filter Tests - BlueHawk API Key Finder
 * Tests the logic for filtering out common false positives
 */

// Placeholder detection
function isPlaceholder(value) {
  const placeholderPatterns = [
    /^YOUR_/i,
    /^EXAMPLE_/i,
    /^REPLACE_/i,
    /^INSERT_/i,
    /^XXX+$/i,
    /^0{10,}$/,
    /^1234567890+$/,
    /_HERE$/i,
    /^PLACEHOLDER/i,
    /^DUMMY/i,
    /^TEST_/i
  ];
  return placeholderPatterns.some(p => p.test(value));
}

// Social media URL detection
function isSocialMediaUrl(url) {
  const socialDomains = [
    'instagram.com', 'facebook.com', 'fb.com', 'twitter.com', 'x.com',
    'youtube.com', 'youtu.be', 'linkedin.com', 'tiktok.com', 'pinterest.com'
  ];
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return socialDomains.some(d => hostname.includes(d));
  } catch {
    return false;
  }
}

// Common hash detection
function isCommonHash(value) {
  // MD5: 32 hex chars
  if (/^[a-f0-9]{32}$/i.test(value)) return true;
  // SHA1: 40 hex chars
  if (/^[a-f0-9]{40}$/i.test(value)) return true;
  // SHA256: 64 hex chars
  if (/^[a-f0-9]{64}$/i.test(value)) return true;
  // UUID
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) return true;
  return false;
}

// Feature flag detection
function isFeatureFlag(value) {
  const flagWords = [
    'enable', 'disable', 'feature', 'flag', 'config', 'setting',
    'default', 'show', 'hide', 'allow', 'deny', 'mode', 'option'
  ];
  const lower = value.toLowerCase();
  return flagWords.some(word => lower.includes(word)) && /^[a-z_]+$/.test(lower);
}

// Combined false positive check
function isFalsePositive(value) {
  if (isPlaceholder(value)) return true;
  if (isSocialMediaUrl(value)) return true;
  if (isCommonHash(value)) return true;
  if (isFeatureFlag(value)) return true;
  return false;
}

describe('False Positive Filters', () => {

  describe('isPlaceholder', () => {
    test('detects YOUR_ placeholders', () => {
      expect(isPlaceholder('YOUR_API_KEY_HERE')).toBe(true);
      expect(isPlaceholder('YOUR_SECRET_KEY')).toBe(true);
    });

    test('detects EXAMPLE_ placeholders', () => {
      expect(isPlaceholder('EXAMPLE_API_KEY')).toBe(true);
      expect(isPlaceholder('EXAMPLE_TOKEN_12345')).toBe(true);
    });

    test('detects xxx placeholders', () => {
      expect(isPlaceholder('xxxxxxxxxxxxxxxxxx')).toBe(true);
      expect(isPlaceholder('XXXXXXXXXXXXXXXXXXXX')).toBe(true);
    });

    test('detects repeated zeros', () => {
      expect(isPlaceholder('0000000000000000')).toBe(true);
    });

    test('detects repeated 1234567890', () => {
      expect(isPlaceholder('1234567890000000')).toBe(true);
    });

    test('does not flag valid keys', () => {
      expect(isPlaceholder('AKIAIOSFODNN7EXAMPLE')).toBe(false);
      expect(isPlaceholder('ghp_ABCDEFxyz123456789')).toBe(false);
    });
  });

  describe('isSocialMediaUrl', () => {
    test('detects Instagram URLs', () => {
      expect(isSocialMediaUrl('https://instagram.com/p/ABC123xyz')).toBe(true);
      expect(isSocialMediaUrl('https://www.instagram.com/username')).toBe(true);
    });

    test('detects Facebook URLs', () => {
      expect(isSocialMediaUrl('https://facebook.com/profile/12345')).toBe(true);
      expect(isSocialMediaUrl('https://fb.com/page/12345')).toBe(true);
    });

    test('detects Twitter URLs', () => {
      expect(isSocialMediaUrl('https://twitter.com/user/status/123')).toBe(true);
      expect(isSocialMediaUrl('https://x.com/user')).toBe(true);
    });

    test('detects YouTube URLs', () => {
      expect(isSocialMediaUrl('https://youtube.com/watch?v=ABC123')).toBe(true);
      expect(isSocialMediaUrl('https://youtu.be/ABC123')).toBe(true);
    });

    test('detects LinkedIn URLs', () => {
      expect(isSocialMediaUrl('https://linkedin.com/in/username')).toBe(true);
    });

    test('does not flag non-social URLs', () => {
      expect(isSocialMediaUrl('https://api.stripe.com/v1/charges')).toBe(false);
      expect(isSocialMediaUrl('https://myapp.com/api/key')).toBe(false);
    });
  });

  describe('isCommonHash', () => {
    test('detects MD5 hash', () => {
      expect(isCommonHash('d41d8cd98f00b204e9800998ecf8427e')).toBe(true);
    });

    test('detects SHA1 hash', () => {
      expect(isCommonHash('da39a3ee5e6b4b0d3255bfef95601890afd80709')).toBe(true);
    });

    test('detects SHA256 hash', () => {
      expect(isCommonHash('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')).toBe(true);
    });

    test('detects UUID', () => {
      expect(isCommonHash('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    test('does not flag API keys', () => {
      expect(isCommonHash('AKIAIOSFODNN7EXAMPLE')).toBe(false);
      expect(isCommonHash('sk_live_abcdef123456')).toBe(false);
    });
  });

  describe('isFeatureFlag', () => {
    test('detects common feature flags', () => {
      expect(isFeatureFlag('enable_dark_mode')).toBe(true);
      expect(isFeatureFlag('feature_new_dashboard')).toBe(true);
      expect(isFeatureFlag('config_max_retries')).toBe(true);
    });

    test('detects setting patterns', () => {
      expect(isFeatureFlag('default_timeout')).toBe(true);
      expect(isFeatureFlag('show_beta_features')).toBe(true);
    });

    test('does not flag API keys', () => {
      expect(isFeatureFlag('AKIAIOSFODNN7EXAMPLE')).toBe(false);
      expect(isFeatureFlag('ghp_abcdefghijklmnop')).toBe(false);
    });
  });

  describe('isFalsePositive (combined)', () => {
    test('filters placeholder values', () => {
      expect(isFalsePositive('YOUR_API_KEY_HERE')).toBe(true);
    });

    test('filters social media URLs', () => {
      expect(isFalsePositive('https://instagram.com/p/ABC123')).toBe(true);
    });

    test('filters common hashes', () => {
      expect(isFalsePositive('d41d8cd98f00b204e9800998ecf8427e')).toBe(true);
    });

    test('filters feature flags', () => {
      expect(isFalsePositive('enable_dark_mode')).toBe(true);
    });

    test('does not filter valid AWS key', () => {
      expect(isFalsePositive('AKIAIOSFODNN7REALKEY')).toBe(false);
    });

    test('does not filter valid GitHub token', () => {
      expect(isFalsePositive('ghp_ABCDEFxyz123456789012345678901234')).toBe(false);
    });

    test('does not filter valid Stripe key', () => {
      expect(isFalsePositive('sk_live_ABCDEFxyz123456789')).toBe(false);
    });
  });
});
