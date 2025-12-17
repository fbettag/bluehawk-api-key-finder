/**
 * Integration Tests - BlueHawk API Key Finder
 */

const { startServer } = require('../server');

describe('API Key Detection Integration', () => {
  let server;
  const PORT = 3333;
  const BASE_URL = `http://localhost:${PORT}`;

  beforeAll(async () => {
    server = await startServer(PORT);
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('Mock Server', () => {
    test('serves valid-keys page', async () => {
      const response = await fetch(`${BASE_URL}/valid-keys`);
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain('AKIAIOSFODNN7EXAMPLE');
      expect(html).toContain('ghp_');
      expect(html).toContain('sk_test_');
    });

    test('serves false-positives page', async () => {
      const response = await fetch(`${BASE_URL}/false-positives`);
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain('YOUR_API_KEY_HERE');
      expect(html).toContain('enable_dark_mode');
    });

    test('serves clean page', async () => {
      const response = await fetch(`${BASE_URL}/clean`);
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).not.toContain('AKIA');
      expect(html).not.toContain('sk_test');
    });
  });

  describe('Pattern Extraction', () => {
    test('extracts AWS keys from page', async () => {
      const response = await fetch(`${BASE_URL}/valid-keys`);
      const html = await response.text();

      const awsPattern = /AKIA[0-9A-Z]{16}/g;
      const matches = html.match(awsPattern);

      expect(matches).not.toBeNull();
      expect(matches.length).toBeGreaterThan(0);
    });

    test('extracts GitHub tokens from page', async () => {
      const response = await fetch(`${BASE_URL}/valid-keys`);
      const html = await response.text();

      const githubPattern = /ghp_[A-Za-z0-9]{36}/g;
      const matches = html.match(githubPattern);

      expect(matches).not.toBeNull();
    });

    test('extracts Stripe keys from page', async () => {
      const response = await fetch(`${BASE_URL}/valid-keys`);
      const html = await response.text();

      // Stripe key pattern present (via concatenation in JS)
      expect(html).toContain('sk_test_');
    });

    test('extracts MongoDB URIs from page', async () => {
      const response = await fetch(`${BASE_URL}/valid-keys`);
      const html = await response.text();

      const mongoPattern = /mongodb(\+srv)?:\/\/[^\s'"]+/g;
      const matches = html.match(mongoPattern);

      expect(matches).not.toBeNull();
    });
  });

  describe('False Positive Handling', () => {
    test('page contains placeholder patterns', async () => {
      const response = await fetch(`${BASE_URL}/false-positives`);
      const html = await response.text();

      expect(html).toContain('YOUR_API_KEY_HERE');
      expect(html).toContain('EXAMPLE_KEY');
    });

    test('page contains hash patterns', async () => {
      const response = await fetch(`${BASE_URL}/false-positives`);
      const html = await response.text();

      // MD5 hash pattern
      expect(html).toMatch(/[a-f0-9]{32}/);
      // UUID pattern
      expect(html).toMatch(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/);
    });
  });
});
