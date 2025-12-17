/**
 * Pattern Matching Tests - BlueHawk API Key Finder
 * Tests the regex patterns used for API key detection
 */

describe('API Key Pattern Detection', () => {

  describe('AWS Keys', () => {
    const awsPattern = /AKIA[0-9A-Z]{16}/;
    const awsSecretPattern = /(?:aws)?_?secret_?(?:access)?_?key.{0,20}['"`]([A-Za-z0-9/+=]{40})['"`]/i;

    test('detects valid AWS access key', () => {
      expect(awsPattern.test('AKIAIOSFODNN7EXAMPLE')).toBe(true);
    });

    test('detects ASIA temporary keys', () => {
      expect(/ASIA[0-9A-Z]{16}/.test('ASIAIOSFODNN7EXAMPLE')).toBe(true);
    });

    test('rejects invalid AWS keys', () => {
      expect(awsPattern.test('AKIASHORT')).toBe(false);
      expect(awsPattern.test('NOTANAWSKEY12345678')).toBe(false);
    });
  });

  describe('GitHub Tokens', () => {
    const githubPattern = /gh[pousr]_[A-Za-z0-9]{36,}/;

    test('detects valid GitHub personal access token', () => {
      expect(githubPattern.test('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true);
    });

    test('detects valid GitHub OAuth token', () => {
      expect(githubPattern.test('gho_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true);
    });

    test('detects valid GitHub user-to-server token', () => {
      expect(githubPattern.test('ghu_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true);
    });

    test('detects valid GitHub server-to-server token', () => {
      expect(githubPattern.test('ghs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true);
    });

    test('detects valid GitHub refresh token', () => {
      expect(githubPattern.test('ghr_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true);
    });

    test('rejects invalid GitHub tokens', () => {
      expect(githubPattern.test('ghx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(false);
      expect(githubPattern.test('ghp_short')).toBe(false);
    });
  });

  describe('Stripe Keys', () => {
    const stripePattern = /[sr]k_(live|test)_[A-Za-z0-9]{24,}/;

    test('detects stripe key format', () => {
      // Pattern matches the format without using real-looking keys
      expect(stripePattern.test('sk_test_' + 'A'.repeat(24))).toBe(true);
    });

    test('detects alternate stripe key format', () => {
      expect(stripePattern.test('sk_live_' + 'B'.repeat(24))).toBe(true);
    });

    test('detects restricted key format', () => {
      expect(stripePattern.test('rk_test_' + 'C'.repeat(24))).toBe(true);
    });
  });

  describe('Firebase/Google API Keys', () => {
    const firebasePattern = /AIza[A-Za-z0-9_-]{35}/;

    test('detects Firebase API key', () => {
      expect(firebasePattern.test('AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true);
    });
  });

  describe('Slack Tokens', () => {
    const slackBotPattern = /xoxb-[0-9]+-[0-9]+-[A-Za-z0-9]+/;
    const slackUserPattern = /xoxp-[0-9]+-[0-9]+-[0-9]+-[A-Za-z0-9]+/;

    test('detects bot token format', () => {
      // Pattern test without triggering secret scanning
      const testToken = 'xoxb-1-2-abc';
      expect(slackBotPattern.test(testToken)).toBe(true);
    });

    test('detects user token format', () => {
      const testToken = 'xoxp-1-2-3-abc';
      expect(slackUserPattern.test(testToken)).toBe(true);
    });
  });

  describe('SendGrid Keys', () => {
    const sendgridPattern = /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/;

    test('detects SendGrid API key', () => {
      expect(sendgridPattern.test('SG.xxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true);
    });
  });

  describe('Twilio Credentials', () => {
    const twilioPattern = /AC[a-z0-9]{32}/i;

    test('detects Twilio Account SID', () => {
      expect(twilioPattern.test('ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe(true);
    });
  });

  describe('MongoDB Connection Strings', () => {
    const mongoPattern = /mongodb(\+srv)?:\/\/[^\s'"]+/;

    test('detects MongoDB Atlas URI', () => {
      expect(mongoPattern.test('mongodb+srv://user:password@cluster.mongodb.net/db')).toBe(true);
    });

    test('detects standard MongoDB URI', () => {
      expect(mongoPattern.test('mongodb://user:password@localhost:27017/db')).toBe(true);
    });
  });

  describe('PostgreSQL Connection Strings', () => {
    const postgresPattern = /postgres(ql)?:\/\/[^\s'"]+/;

    test('detects PostgreSQL URI', () => {
      expect(postgresPattern.test('postgresql://user:password@localhost:5432/db')).toBe(true);
    });

    test('detects postgres:// scheme', () => {
      expect(postgresPattern.test('postgres://user:password@host:5432/db')).toBe(true);
    });
  });

  describe('JWT Tokens', () => {
    const jwtPattern = /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/;

    test('detects valid JWT', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      expect(jwtPattern.test(jwt)).toBe(true);
    });
  });

  describe('Private Keys', () => {
    const privateKeyPattern = /-----BEGIN\s+(?:RSA\s+)?(?:EC\s+)?(?:DSA\s+)?(?:OPENSSH\s+)?PRIVATE\s+KEY-----/;

    test('detects RSA private key header', () => {
      expect(privateKeyPattern.test('-----BEGIN RSA PRIVATE KEY-----')).toBe(true);
    });

    test('detects EC private key header', () => {
      expect(privateKeyPattern.test('-----BEGIN EC PRIVATE KEY-----')).toBe(true);
    });

    test('detects OpenSSH private key header', () => {
      expect(privateKeyPattern.test('-----BEGIN OPENSSH PRIVATE KEY-----')).toBe(true);
    });

    test('detects generic private key header', () => {
      expect(privateKeyPattern.test('-----BEGIN PRIVATE KEY-----')).toBe(true);
    });
  });
});
