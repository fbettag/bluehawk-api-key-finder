/**
 * Mock Test Server - BlueHawk API Key Finder
 * Serves test pages with various API key patterns
 */

const express = require('express');
const path = require('path');

function createTestServer() {
  const app = express();

  // Serve static fixtures
  app.use('/static', express.static(path.join(__dirname, '../fixtures')));

  // Page with valid API keys
  app.get('/valid-keys', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Valid Keys Test</title></head>
      <body>
        <script>
          // AWS Keys
          const awsAccessKey = 'AKIAIOSFODNN7EXAMPLE';
          const awsSecretKey = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

          // GitHub Token
          const githubToken = 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

          // Stripe Keys (example format)
          const stripeSecretKey = 'sk_test_' + 'A'.repeat(28);
          const stripePublishableKey = 'pk_test_' + 'B'.repeat(28);

          // Firebase
          const firebaseApiKey = 'AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

          // Slack (pattern demo)
          const slackToken = 'xoxb-1-2-testtoken';

          // SendGrid
          const sendgridKey = 'SG.xxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

          // Twilio
          const twilioSid = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
          const twilioAuth = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

          // MongoDB
          const mongoUri = 'mongodb+srv://user:password@cluster.mongodb.net/db';

          // PostgreSQL
          const postgresUri = 'postgresql://user:password@localhost:5432/db';

          // JWT Token
          const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
        </script>
      </body>
      </html>
    `);
  });

  // Page with high-entropy secrets (no patterns)
  app.get('/entropy-secrets', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Entropy Test</title></head>
      <body>
        <script>
          // High entropy random strings
          const secret1 = 'Kj8mN2xP5qR7wY9zA3bC6dE';
          const secret2 = 'f4G8hJ2kL6mN0pQ3sT7vX1zY';
          const apiSecret = 'aB3cD5eF7gH9iJ1kL3mN5oP7';
        </script>
      </body>
      </html>
    `);
  });

  // Page with false positives
  app.get('/false-positives', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>False Positives Test</title></head>
      <body>
        <script>
          // Common false positives
          const userId = '1234567890';
          const placeholder = 'YOUR_API_KEY_HERE';
          const example = 'EXAMPLE_KEY_12345';
          const featureFlag = 'enable_dark_mode';
          const instagramUrl = 'https://instagram.com/p/ABC123xyz';
          const googleUrl = 'https://docs.google.com/document/d/abc123';
          const hash = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
          const uuid = '550e8400-e29b-41d4-a716-446655440000';
        </script>
      </body>
      </html>
    `);
  });

  // Clean page with no secrets
  app.get('/clean', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Clean Page</title></head>
      <body>
        <script>
          const name = 'John Doe';
          const count = 42;
          const enabled = true;
          const items = ['apple', 'banana', 'cherry'];
        </script>
      </body>
      </html>
    `);
  });

  return app;
}

function startServer(port = 3333) {
  return new Promise((resolve) => {
    const app = createTestServer();
    const server = app.listen(port, () => {
      resolve(server);
    });
  });
}

module.exports = { createTestServer, startServer };
